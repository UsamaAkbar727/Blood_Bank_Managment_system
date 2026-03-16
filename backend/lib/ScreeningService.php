<?php
require_once __DIR__ . '/Permissions.php';
require_once __DIR__ . '/LogService.php';
require_once __DIR__ . '/SettingsService.php';

class ScreeningService
{
    private const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

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
        if (!in_array($bloodGroup, self::BLOOD_GROUPS, true)) {
            throw new InvalidArgumentException('invalid_blood_group');
        }

        $resultStatus = $input['result_status'] ?? 'pending';
        if (!in_array($resultStatus, ['pending', 'safe', 'rejected'], true)) {
            throw new InvalidArgumentException('invalid_result_status');
        }

        return [
            'id' => isset($input['id']) ? (int)$input['id'] : 0,
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
        $component = 'Whole Blood';
        $rule = SettingsService::ruleForComponent($component);
        $expiry = $collection['expiry_date_override']
            ?: date('Y-m-d', strtotime($collection['collection_date'] . ' +' . $rule['shelf_life_days'] . ' days'));
        $status = 'available';
        $location = $collection['collection_site'] ?: 'Main Cold Room';
        
        // Check if inventory already exists for this collection and component
        $checkStmt = db()->prepare('SELECT id FROM inventory WHERE collection_id = ? AND component = ? LIMIT 1');
        $checkStmt->bind_param('is', $collection['id'], $component);
        $checkStmt->execute();
        $existingInventory = $checkStmt->get_result()->fetch_assoc();
        $checkStmt->close();
        
        if ($existingInventory) {
            // UPDATE existing inventory record
            $stmt = db()->prepare('UPDATE inventory SET blood_group=?, volume_ml=?, expiry_date=?, status=? WHERE id=?');
            $stmt->bind_param(
                'sissi',
                $screen['blood_group_confirmed'],
                $collection['volume_ml'],
                $expiry,
                $status,
                $existingInventory['id']
            );
            if (!$stmt->execute()) {
                throw new RuntimeException('Failed to update inventory: ' . $stmt->error);
            }
            $stmt->close();
        } else {
            // INSERT new inventory record
            $stmt = db()->prepare('INSERT INTO inventory (collection_id, component, blood_group, volume_ml, units_available, storage_location, expiry_date, status) VALUES (?,?,?,?,?,?,?,?)');
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
            if (!$stmt->execute()) {
                throw new RuntimeException('Failed to create inventory: ' . $stmt->error);
            }
            $stmt->close();
        }
    }

    private static function discardInventory(int $collectionId): void
    {
        $stmt = db()->prepare('UPDATE inventory SET status="discarded" WHERE collection_id = ?');
        $stmt->bind_param('i', $collectionId);
        $stmt->execute();
        $stmt->close();
    }

    private static function screeningDataById(int $id): ?array
    {
        $stmt = db()->prepare('SELECT * FROM screening_tests WHERE id=? LIMIT 1');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    private static function applyCollectionState(int $collectionId, string $resultStatus, array $screen, array $collection): void
    {
        if ($resultStatus === 'safe') {
            $stmt = db()->prepare('UPDATE collections SET status="safe" WHERE id=?');
            $stmt->bind_param('i', $collectionId);
            $stmt->execute();
            $stmt->close();
            self::upsertInventory($collection, $screen);
            return;
        }

        if ($resultStatus === 'rejected') {
            $stmt = db()->prepare('UPDATE collections SET status="rejected" WHERE id=?');
            $stmt->bind_param('i', $collectionId);
            $stmt->execute();
            $stmt->close();
            self::discardInventory($collectionId);
            return;
        }

        $stmt = db()->prepare('UPDATE collections SET status="screening" WHERE id=?');
        $stmt->bind_param('i', $collectionId);
        $stmt->execute();
        $stmt->close();
        self::discardInventory($collectionId);
    }

    public static function save(array $input, ?int $id = null): array
    {
        Permissions::allow('screening');
        $data = self::sanitize($input);
        $targetId = (int)($id ?? $data['id']);

        $collection = self::collectionData($data['collection_id']);
        if (!$collection) {
            throw new InvalidArgumentException('collection_not_found');
        }

        if ($targetId > 0) {
            $existing = self::screeningDataById($targetId);
            if (!$existing) {
                throw new InvalidArgumentException('screening_not_found');
            }
            if ((int)$existing['collection_id'] !== $data['collection_id']) {
                throw new RuntimeException('collection_change_not_allowed');
            }
        }

        $anyReactive = $data['hbsag'] || $data['hcv'] || $data['hiv'] || $data['malaria'] || $data['syphilis'];
        if ($anyReactive) {
            $data['result_status'] = 'rejected';
        } elseif ($data['result_status'] === 'pending') {
            $data['result_status'] = 'safe'; // default to safe if explicitly negative
        }

        if ($targetId > 0) {
            $stmt = db()->prepare('UPDATE screening_tests SET tested_by=?, test_date=?, hbsag=?, hcv=?, hiv=?, malaria=?, syphilis=?, blood_group_confirmed=?, hemoglobin_level=?, result_status=?, remarks=? WHERE id=?');
            $stmt->bind_param(
                'isiiiiisdssi',
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
                $data['remarks'],
                $targetId
            );
        } else {
            $stmt = db()->prepare('INSERT INTO screening_tests (collection_id, tested_by, test_date, hbsag, hcv, hiv, malaria, syphilis, blood_group_confirmed, hemoglobin_level, result_status, remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
            $stmt->bind_param(
                'iisiiiiisdss',
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
        }
        $stmt->execute();
        $savedId = $targetId > 0 ? $targetId : $stmt->insert_id;
        $stmt->close();

        self::applyCollectionState($data['collection_id'], $data['result_status'], $data, $collection);
        LogService::write($data['tested_by'] ?? null, $targetId > 0 ? 'update' : 'create', 'screening', $savedId);

        return self::get($savedId);
    }

    public static function delete(int $id): bool
    {
        Permissions::allow('screening');
        $existing = self::screeningDataById($id);
        if (!$existing) {
            return false;
        }

        $stmt = db()->prepare('DELETE FROM screening_tests WHERE id=?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $deleted = $stmt->affected_rows > 0;
        $stmt->close();

        if ($deleted) {
            $collectionId = (int)$existing['collection_id'];
            $stmt = db()->prepare('UPDATE collections SET status="pending_screen" WHERE id=?');
            $stmt->bind_param('i', $collectionId);
            $stmt->execute();
            $stmt->close();
            self::discardInventory($collectionId);
            LogService::write($existing['tested_by'] ? (int)$existing['tested_by'] : null, 'delete', 'screening', $id);
        }

        return $deleted;
    }

    public static function get(int $id): ?array
    {
        Permissions::allow('screening');
        $stmt = db()->prepare('SELECT st.*, c.collection_code, c.collection_date, c.status AS collection_status, d.full_name AS donor_name, d.blood_group AS donor_blood FROM screening_tests st JOIN collections c ON c.id = st.collection_id JOIN donors d ON d.id = c.donor_id WHERE st.id=? LIMIT 1');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    public static function getByCollection(int $collectionId): ?array
    {
        Permissions::allow('screening');
        $stmt = db()->prepare('SELECT st.*, c.collection_code, c.collection_date, c.status AS collection_status, d.full_name AS donor_name, d.blood_group AS donor_blood FROM screening_tests st JOIN collections c ON c.id = st.collection_id JOIN donors d ON d.id = c.donor_id WHERE st.collection_id=? LIMIT 1');
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
        $stmt = db()->prepare('SELECT st.*, c.collection_code, c.collection_date, c.status AS collection_status, d.full_name AS donor_name, d.blood_group AS donor_blood FROM screening_tests st JOIN collections c ON c.id = st.collection_id JOIN donors d ON d.id = c.donor_id WHERE c.collection_code LIKE ? OR d.full_name LIKE ? OR st.result_status LIKE ? ORDER BY st.test_date DESC LIMIT 200');
        $stmt->bind_param('sss', $like, $like, $like);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public static function listCollections(string $search = ''): array
    {
        Permissions::allow('screening');
        $like = '%' . $search . '%';
        $stmt = db()->prepare('SELECT c.id, c.collection_code, c.collection_date, c.status, c.volume_ml, d.full_name AS donor_name, d.blood_group FROM collections c JOIN donors d ON d.id = c.donor_id WHERE c.collection_code LIKE ? OR d.full_name LIKE ? OR d.blood_group LIKE ? ORDER BY c.collection_date DESC LIMIT 200');
        $stmt->bind_param('sss', $like, $like, $like);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }
}
