<?php
require_once __DIR__ . '/Permissions.php';
require_once __DIR__ . '/LogService.php';
require_once __DIR__ . '/SettingsService.php';

class CollectionService
{
    private static function sanitize(array $input): array
    {
        $donorId = (int)($input['donor_id'] ?? 0);
        $collectionDate = $input['collection_date'] ?? '';
        $bagType = $input['bag_type'] ?? '450ml';
        $volume = (int)($input['volume_ml'] ?? 0);
        $site = trim($input['collection_site'] ?? '');
        $expiryDateOverride = trim((string)($input['expiry_date_override'] ?? ''));
        $remarks = trim($input['remarks'] ?? '');
        $collectedBy = isset($input['collected_by']) ? (int)$input['collected_by'] : null;
        $status = $input['status'] ?? 'pending_screen';

        if ($donorId <= 0 || $collectionDate === '' || $volume <= 0) {
            throw new InvalidArgumentException('missing_fields');
        }
        $code = $input['collection_code'] ?? ('COL-' . strtoupper(bin2hex(random_bytes(3))));
        $expiryRule = SettingsService::ruleForComponent('Whole Blood');
        $allowManualOverride = $expiryRule['allow_manual_override'];
        if ($expiryDateOverride !== '' && !$allowManualOverride) {
            throw new InvalidArgumentException('manual_expiry_override_disabled');
        }
        if ($expiryDateOverride !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $expiryDateOverride)) {
            throw new InvalidArgumentException('invalid_expiry_date_override');
        }

        return [
            'collection_code' => $code,
            'donor_id' => $donorId,
            'collected_by' => $collectedBy,
            'collection_date' => $collectionDate,
            'bag_type' => $bagType,
            'volume_ml' => $volume,
            'collection_site' => $site,
            'expiry_date_override' => $expiryDateOverride !== '' ? $expiryDateOverride : null,
            'remarks' => $remarks,
            'status' => $status,
        ];
    }

    private static function assertDonorExists(int $donorId): void
    {
        $stmt = db()->prepare('SELECT id FROM donors WHERE id = ? LIMIT 1');
        $stmt->bind_param('i', $donorId);
        $stmt->execute();
        $exists = $stmt->get_result()->fetch_row();
        $stmt->close();
        if (!$exists) {
            throw new InvalidArgumentException('donor_not_found');
        }
    }

    private static function touchLastDonation(int $donorId, string $date): void
    {
        $stmt = db()->prepare('UPDATE donors SET last_donation_at = ? WHERE id = ?');
        $stmt->bind_param('si', substr($date, 0, 10), $donorId);
        $stmt->execute();
        $stmt->close();
    }

    public static function create(array $input): array
    {
        Permissions::allow('collections');
        $data = self::sanitize($input);
        self::assertDonorExists($data['donor_id']);

        $stmt = db()->prepare('INSERT INTO collections (collection_code, donor_id, collected_by, collection_date, bag_type, volume_ml, collection_site, expiry_date_override, remarks, status) VALUES (?,?,?,?,?,?,?,?,?,?)');
        $stmt->bind_param(
            'siississss',
            $data['collection_code'],
            $data['donor_id'],
            $data['collected_by'],
            $data['collection_date'],
            $data['bag_type'],
            $data['volume_ml'],
            $data['collection_site'],
            $data['expiry_date_override'],
            $data['remarks'],
            $data['status']
        );
        if (!$stmt->execute()) {
            $error = $stmt->errno === 1062 ? 'duplicate_collection_code' : 'db_error';
            $stmt->close();
            throw new RuntimeException($error);
        }
        $id = $stmt->insert_id;
        $stmt->close();
        self::touchLastDonation($data['donor_id'], $data['collection_date']);
        LogService::write($data['collected_by'], 'create', 'collection', $id);
        return self::get($id);
    }

    public static function update(int $id, array $input): array
    {
        Permissions::allow('collections');
        $data = self::sanitize($input);
        self::assertDonorExists($data['donor_id']);

        $stmt = db()->prepare('UPDATE collections SET collection_code=?, donor_id=?, collected_by=?, collection_date=?, bag_type=?, volume_ml=?, collection_site=?, expiry_date_override=?, remarks=?, status=? WHERE id=?');
        $stmt->bind_param(
            'siississssi',
            $data['collection_code'],
            $data['donor_id'],
            $data['collected_by'],
            $data['collection_date'],
            $data['bag_type'],
            $data['volume_ml'],
            $data['collection_site'],
            $data['expiry_date_override'],
            $data['remarks'],
            $data['status'],
            $id
        );
        if (!$stmt->execute()) {
            $error = $stmt->errno === 1062 ? 'duplicate_collection_code' : 'db_error';
            $stmt->close();
            throw new RuntimeException($error);
        }
        $stmt->close();
        self::touchLastDonation($data['donor_id'], $data['collection_date']);
        LogService::write($data['collected_by'], 'update', 'collection', $id);
        return self::get($id);
    }

    public static function delete(int $id): bool
    {
        Permissions::allow('collections');
        $db = db();
        $collectionId = (int)$id;
        $db->begin_transaction();
        try {
            // Remove dependent issuance/billing so inventory can cascade delete.
            $db->query('DELETE br FROM billing_records br JOIN blood_issuance bi ON br.issuance_id = bi.id WHERE bi.inventory_id IN (SELECT i.id FROM inventory i WHERE i.collection_id = ' . $collectionId . ')');
            $db->query('DELETE FROM blood_issuance WHERE inventory_id IN (SELECT i.id FROM inventory i WHERE i.collection_id = ' . $collectionId . ')');

            $stmt = $db->prepare('DELETE FROM collections WHERE id=?');
            $stmt->bind_param('i', $collectionId);
            $stmt->execute();
            $deleted = $stmt->affected_rows > 0;
            $stmt->close();

            if ($deleted) {
                LogService::write(null, 'delete', 'collection', $collectionId);
            }
            $db->commit();
            return $deleted;
        } catch (Throwable $e) {
            $db->rollback();
            throw $e;
        }
    }

    public static function get(int $id): ?array
    {
        Permissions::allow('collections');
        $stmt = db()->prepare('SELECT c.*, d.full_name AS donor_name, d.blood_group FROM collections c JOIN donors d ON d.id = c.donor_id WHERE c.id=? LIMIT 1');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    public static function list(string $search = '', ?int $donorId = null, ?string $status = null): array
    {
        Permissions::allow('collections');
        $searchLike = '%' . $search . '%';

        if ($donorId) {
            if ($status) {
                $stmt = db()->prepare('SELECT c.*, d.full_name AS donor_name, d.blood_group FROM collections c JOIN donors d ON d.id = c.donor_id WHERE c.donor_id = ? AND c.status = ? ORDER BY c.collection_date DESC LIMIT 200');
                $stmt->bind_param('is', $donorId, $status);
            } else {
                $stmt = db()->prepare('SELECT c.*, d.full_name AS donor_name, d.blood_group FROM collections c JOIN donors d ON d.id = c.donor_id WHERE c.donor_id = ? ORDER BY c.collection_date DESC LIMIT 200');
                $stmt->bind_param('i', $donorId);
            }
        } else {
            if ($status) {
                $stmt = db()->prepare('SELECT c.*, d.full_name AS donor_name, d.blood_group FROM collections c JOIN donors d ON d.id = c.donor_id WHERE (c.collection_code LIKE ? OR d.full_name LIKE ? OR d.blood_group LIKE ?) AND c.status = ? ORDER BY c.collection_date DESC LIMIT 200');
                $stmt->bind_param('ssss', $searchLike, $searchLike, $searchLike, $status);
            } else {
                $stmt = db()->prepare('SELECT c.*, d.full_name AS donor_name, d.blood_group FROM collections c JOIN donors d ON d.id = c.donor_id WHERE c.collection_code LIKE ? OR d.full_name LIKE ? OR d.blood_group LIKE ? ORDER BY c.collection_date DESC LIMIT 200');
                $stmt->bind_param('sss', $searchLike, $searchLike, $searchLike);
            }
        }

        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }
}
