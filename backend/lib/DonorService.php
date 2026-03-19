<?php
require_once __DIR__ . '/Permissions.php';
require_once __DIR__ . '/LogService.php';
require_once __DIR__ . '/MedicalCriteriaService.php';

class DonorService
{
    private static function validateCnic(string $cnic): bool
    {
        // Accept formats: 12345-1234567-1 or numeric 13 digits
        return (bool)preg_match('/^\\d{5}-\\d{7}-\\d$/', $cnic) || (bool)preg_match('/^\\d{13}$/', $cnic);
    }

    private static function sanitize(array $input): array
    {
        $cnic = trim($input['cnic'] ?? '');
        $cnic = preg_replace('/[^0-9-]/', '', $cnic);

        if (!self::validateCnic($cnic)) {
            throw new InvalidArgumentException('invalid_cnic');
        }

        $fullName = trim($input['full_name'] ?? '');
        $gender = $input['gender'] ?? '';
        $dob = $input['date_of_birth'] ?? '';
        $blood = $input['blood_group'] ?? '';

        if ($fullName === '' || $dob === '' || $gender === '' || $blood === '') {
            throw new InvalidArgumentException('missing_fields');
        }

        $manualHold = (int)($input['manual_hold'] ?? 0);
        if (array_key_exists('is_eligible', $input)) {
            $manualHold = (int)(empty($input['is_eligible']) ? 1 : 0);
        }

        return [
            'donor_code' => $input['donor_code'] ?? ('D-' . strtoupper(bin2hex(random_bytes(3)))),
            'cnic' => $cnic,
            'full_name' => $fullName,
            'gender' => $gender,
            'date_of_birth' => $dob,
            'blood_group' => $blood,
            'phone' => $input['phone'] ?? null,
            'email' => $input['email'] ?? null,
            'address' => $input['address'] ?? null,
            'city' => $input['city'] ?? null,
            'is_eligible' => 1,
            'manual_hold' => $manualHold,
        ];
    }

    public static function create(array $input, int $userId): array
    {
        Permissions::allow('donors');
        $data = self::sanitize($input);

        $stmt = db()->prepare('INSERT INTO donors (donor_code, cnic, full_name, gender, date_of_birth, blood_group, phone, email, address, city, is_eligible, manual_hold, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $stmt->bind_param(
            'ssssssssssiii',
            $data['donor_code'],
            $data['cnic'],
            $data['full_name'],
            $data['gender'],
            $data['date_of_birth'],
            $data['blood_group'],
            $data['phone'],
            $data['email'],
            $data['address'],
            $data['city'],
            $data['is_eligible'],
            $data['manual_hold'],
            $userId
        );
        if (!$stmt->execute()) {
            $error = $stmt->errno === 1062 ? 'duplicate_cnic_or_code' : 'db_error';
            $stmt->close();
            throw new RuntimeException($error);
        }
        $id = $stmt->insert_id;
        $stmt->close();
        LogService::write($userId, 'create', 'donor', $id);
        MedicalCriteriaService::applyToDonor($id, $userId);
        return self::get($id);
    }

    public static function update(int $id, array $input): array
    {
        Permissions::allow('donors');
        $data = self::sanitize($input);
        $stmt = db()->prepare('UPDATE donors SET donor_code=?, cnic=?, full_name=?, gender=?, date_of_birth=?, blood_group=?, phone=?, email=?, address=?, city=?, is_eligible=?, manual_hold=? WHERE id=?');
        $stmt->bind_param(
            'ssssssssssiii',
            $data['donor_code'],
            $data['cnic'],
            $data['full_name'],
            $data['gender'],
            $data['date_of_birth'],
            $data['blood_group'],
            $data['phone'],
            $data['email'],
            $data['address'],
            $data['city'],
            $data['is_eligible'],
            $data['manual_hold'],
            $id
        );
        if (!$stmt->execute()) {
            $error = $stmt->errno === 1062 ? 'duplicate_cnic_or_code' : 'db_error';
            $stmt->close();
            throw new RuntimeException($error);
        }
        $stmt->close();
        LogService::write(null, 'update', 'donor', $id);
        MedicalCriteriaService::applyToDonor($id, null);
        return self::get($id);
    }

    public static function delete(int $id): bool
    {
        Permissions::allow('donors');
        $db = db();
        $donorId = (int)$id;
        $db->begin_transaction();
        try {
            // Remove dependent issuance/billing so inventory can cascade delete.
            $db->query('DELETE br FROM billing_records br JOIN blood_issuance bi ON br.issuance_id = bi.id WHERE bi.inventory_id IN (SELECT i.id FROM inventory i JOIN collections c ON c.id = i.collection_id WHERE c.donor_id = ' . $donorId . ')');
            $db->query('DELETE FROM blood_issuance WHERE inventory_id IN (SELECT i.id FROM inventory i JOIN collections c ON c.id = i.collection_id WHERE c.donor_id = ' . $donorId . ')');

            $db->query('DELETE FROM collections WHERE donor_id = ' . $donorId);

            $stmt = $db->prepare('DELETE FROM donors WHERE id=?');
            $stmt->bind_param('i', $donorId);
            $stmt->execute();
            $affected = $stmt->affected_rows > 0;
            $stmt->close();

            if ($affected) {
                LogService::write(null, 'delete', 'donor', $donorId);
            }
            $db->commit();
            return $affected;
        } catch (Throwable $e) {
            $db->rollback();
            throw $e;
        }
    }

    public static function get(int $id): ?array
    {
        Permissions::allow('donors');
        $stmt = db()->prepare('SELECT * FROM donors WHERE id=? LIMIT 1');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$res) {
            return null;
        }
        return MedicalCriteriaService::refreshIfDue($res);
    }

    public static function list(string $search = '', bool $eligibleOnly = false): array
    {
        Permissions::allow('donors');
        $search = '%' . $search . '%';
        $sql = 'SELECT * FROM donors WHERE (full_name LIKE ? OR donor_code LIKE ? OR cnic LIKE ? OR blood_group LIKE ?)';
        $sql .= ' ORDER BY created_at DESC';
        $stmt = db()->prepare($sql);
        $stmt->bind_param('ssss', $search, $search, $search, $search);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        $rows = array_map(static function (array $row): array {
            return MedicalCriteriaService::refreshIfDue($row);
        }, $rows);
        if ($eligibleOnly) {
            $rows = array_values(array_filter($rows, static fn($row) => (int)($row['is_eligible'] ?? 1) === 1));
        }
        return $rows;
    }

    public static function history(int $donorId): array
    {
        Permissions::allow('donors');
        $stmt = db()->prepare('SELECT collection_code, collection_date, status, bag_type, volume_ml FROM collections WHERE donor_id = ? ORDER BY collection_date DESC');
        $stmt->bind_param('i', $donorId);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }
}
