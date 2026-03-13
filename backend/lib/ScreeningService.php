<?php
require_once __DIR__ . '/Permissions.php';
require_once __DIR__ . '/LogService.php';

class ScreeningService
{
    private static function sanitize(array $input): array
    {
        $collectionId = (int)($input['collection_id'] ?? 0);
        if ($collectionId <= 0) {
            throw new InvalidArgumentException('missing_collection_id');
        }

        $testDate = $input['test_date'] ?? date('Y-m-d H:i:s');
        $bloodGroup = $input['blood_group_confirmed'] ?? '';
        if (!$bloodGroup) {
            throw new InvalidArgumentException('missing_blood_group');
        }

        $resultStatus = $input['result_status'] ?? 'pending';
        if (!in_array($resultStatus, ['pending', 'safe', 'rejected'], true)) {
            throw new InvalidArgumentException('invalid_result_status');
        }

        return [
            'collection_id' => $collectionId,
            'tested_by' => isset($input['tested_by']) ? (int)$input['tested_by'] : null,
            'test_date' => $testDate,
            'hbsag' => (int)($input['hbsag'] ?? 0),
            'hcv' => (int)($input['hcv'] ?? 0),
            'hiv' => (int)($input['hiv'] ?? 0),
            'malaria' => (int)($input['malaria'] ?? 0),
            'syphilis' => (int)($input['syphilis'] ?? 0),
            'blood_group_confirmed' => $bloodGroup,
            'hemoglobin_level' => $input['hemoglobin_level'] ?? null,
            'result_status' => $resultStatus,
            'remarks' => $input['remarks'] ?? null,
        ];
    }

    private static function collectionData(int $collectionId): ?array
    {
        $stmt = db()->prepare('SELECT * FROM collections WHERE id=? LIMIT 1');
        $stmt->bind_param('i', $collectionId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    private static function upsertInventory(array $collection, array $screen): void
    {
        // default expiry: 35 days from collection for whole blood
        $expiry = date('Y-m-d', strtotime($collection['collection_date'] . ' +35 days'));
        $component = 'Whole Blood';
        $stmt = db()->prepare('INSERT INTO inventory (collection_id, component, blood_group, volume_ml, units_available, storage_location, expiry_date, status) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE blood_group=VALUES(blood_group), volume_ml=VALUES(volume_ml), expiry_date=VALUES(expiry_date), status=VALUES(status)');
        $status = 'available';
        $location = $collection['collection_site'] ?: 'Main Cold Room';
        $stmt->bind_param(
            'isssisss',
            $collection['id'],
            $component,
            $screen['blood_group_confirmed'],
            $collection['volume_ml'],
            $units = 1,
            $location,
            $expiry,
            $status
        );
        $stmt->execute();
        $stmt->close();
    }

    private static function discardInventory(int $collectionId): void
    {
        $stmt = db()->prepare('UPDATE inventory SET status="discarded" WHERE collection_id = ?');
        $stmt->bind_param('i', $collectionId);
        $stmt->execute();
        $stmt->close();
    }

    public static function save(array $input): array
    {
        Permissions::allow('screening');
        $data = self::sanitize($input);

        $collection = self::collectionData($data['collection_id']);
        if (!$collection) {
            throw new InvalidArgumentException('collection_not_found');
        }

        $anyReactive = $data['hbsag'] || $data['hcv'] || $data['hiv'] || $data['malaria'] || $data['syphilis'];
        if ($anyReactive) {
            $data['result_status'] = 'rejected';
        } elseif ($data['result_status'] === 'pending') {
            $data['result_status'] = 'safe'; // default to safe if explicitly negative
        }

        $stmt = db()->prepare('INSERT INTO screening_tests (collection_id, tested_by, test_date, hbsag, hcv, hiv, malaria, syphilis, blood_group_confirmed, hemoglobin_level, result_status, remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE tested_by=VALUES(tested_by), test_date=VALUES(test_date), hbsag=VALUES(hbsag), hcv=VALUES(hcv), hiv=VALUES(hiv), malaria=VALUES(malaria), syphilis=VALUES(syphilis), blood_group_confirmed=VALUES(blood_group_confirmed), hemoglobin_level=VALUES(hemoglobin_level), result_status=VALUES(result_status), remarks=VALUES(remarks)');
        $stmt->bind_param(
            'iisssssssdss',
            $data['collection_id'],
            $data['tested_by'],
            $data['test_date'],
            $data['hbsag'],
            $data['hcv'],
            $data['hiv'],
            $data['malaria'],
            $data['syphilis'],
            $data['blood_group_confirmed'],
            $data['hemoglobin_level'],
            $data['result_status'],
            $data['remarks']
        );
        $stmt->execute();
        $stmt->close();

        // Update collection status and inventory
        if ($data['result_status'] === 'safe') {
            $stmt2 = db()->prepare('UPDATE collections SET status="safe" WHERE id=?');
            $stmt2->bind_param('i', $data['collection_id']);
            $stmt2->execute();
            $stmt2->close();
            self::upsertInventory($collection, $data);
        } elseif ($data['result_status'] === 'rejected') {
            $stmt3 = db()->prepare('UPDATE collections SET status="rejected" WHERE id=?');
            $stmt3->bind_param('i', $data['collection_id']);
            $stmt3->execute();
            $stmt3->close();
            self::discardInventory($data['collection_id']);
        }
        LogService::write($data['tested_by'] ?? null, 'screen', 'collection', $data['collection_id']);

        return self::getByCollection($data['collection_id']);
    }

    public static function getByCollection(int $collectionId): ?array
    {
        Permissions::allow('screening');
        $stmt = db()->prepare('SELECT st.*, c.collection_code, c.collection_date, d.full_name AS donor_name, d.blood_group AS donor_blood FROM screening_tests st JOIN collections c ON c.id = st.collection_id JOIN donors d ON d.id = c.donor_id WHERE st.collection_id=? LIMIT 1');
        $stmt->bind_param('i', $collectionId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    public static function list(string $search = ''): array
    {
        Permissions::allow('screening');
        $like = '%' . $search . '%';
        $stmt = db()->prepare('SELECT st.*, c.collection_code, c.collection_date, d.full_name AS donor_name, d.blood_group AS donor_blood FROM screening_tests st JOIN collections c ON c.id = st.collection_id JOIN donors d ON d.id = c.donor_id WHERE c.collection_code LIKE ? OR d.full_name LIKE ? ORDER BY st.test_date DESC LIMIT 200');
        $stmt->bind_param('ss', $like, $like);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }
}
