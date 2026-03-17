<?php
require_once __DIR__ . '/Permissions.php';
require_once __DIR__ . '/LogService.php';

class IssuanceService
{
    private static array $compatibility = [
        'O-' => ['O-'],
        'O+' => ['O-', 'O+'],
        'A-' => ['O-', 'A-'],
        'A+' => ['O-', 'O+', 'A-', 'A+'],
        'B-' => ['O-', 'B-'],
        'B+' => ['O-', 'O+', 'B-', 'B+'],
        'AB-' => ['O-', 'A-', 'B-', 'AB-'],
        'AB+' => ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    ];

    public static function compatibleUnits(string $patientBlood): array
    {
        return self::$compatibility[$patientBlood] ?? [];
    }

    private static function assertAvailableInventory(int $inventoryId, string $patientBlood): array
    {
        Permissions::allow('inventory');
        $stmt = db()->prepare('SELECT * FROM inventory WHERE id=? AND status="available" LIMIT 1');
        $stmt->bind_param('i', $inventoryId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$row) {
            throw new InvalidArgumentException('unit_not_available');
        }
        if (!in_array($row['blood_group'], self::compatibleUnits($patientBlood), true)) {
            throw new InvalidArgumentException('incompatible_blood');
        }
        return $row;
    }

    public static function issue(array $input, int $issuedBy): array
    {
        Permissions::allow('inventory');
        $inventoryId = (int)($input['inventory_id'] ?? 0);
        $patientId = (int)($input['patient_id'] ?? 0);
        $units = (int)($input['units_issued'] ?? 1);
        $crossmatch = $input['crossmatch_result'] ?? 'compatible';
        $remarks = $input['remarks'] ?? null;

        if ($inventoryId <= 0 || $patientId <= 0 || $units <= 0) {
            throw new InvalidArgumentException('missing_fields');
        }

        // Load patient
        $pstmt = db()->prepare('SELECT * FROM patients WHERE id=? LIMIT 1');
        $pstmt->bind_param('i', $patientId);
        $pstmt->execute();
        $patient = $pstmt->get_result()->fetch_assoc();
        $pstmt->close();
        if (!$patient) {
            throw new InvalidArgumentException('patient_not_found');
        }

        // Validate inventory compatibility
        $inventory = self::assertAvailableInventory($inventoryId, $patient['blood_group']);

        // Issue
        $stmt = db()->prepare('INSERT INTO blood_issuance (inventory_id, patient_id, issued_by, issue_date, units_issued, crossmatch_result, reactions_reported, status, remarks) VALUES (?,?,?,NOW(),?,?,0,"issued",?)');
        $stmt->bind_param('iiiiss', $inventoryId, $patientId, $issuedBy, $units, $crossmatch, $remarks);
        $stmt->execute();
        $issuanceId = $stmt->insert_id;
        $stmt->close();

        // Update inventory status (FIFO already assured by caller selection order)
        $stmt2 = db()->prepare('UPDATE inventory SET status="issued", units_available = GREATEST(units_available - ?, 0) WHERE id=?');
        $stmt2->bind_param('ii', $units, $inventoryId);
        $stmt2->execute();
        $stmt2->close();

        LogService::write($issuedBy, 'issue', 'inventory', $inventoryId);

        return self::get($issuanceId);
    }

    public static function get(int $id): ?array
    {
        Permissions::allow('inventory');
        $sql = 'SELECT bi.*, i.blood_group, i.component, i.expiry_date, p.full_name AS patient_name, p.patient_code, p.blood_group AS patient_blood
                FROM blood_issuance bi
                JOIN inventory i ON i.id = bi.inventory_id
                JOIN patients p ON p.id = bi.patient_id
                WHERE bi.id = ? LIMIT 1';
        $stmt = db()->prepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    public static function list(string $search = '', ?int $patientId = null): array
    {
        Permissions::allow('inventory');
        $like = '%' . $search . '%';
        $sql = 'SELECT bi.*, i.blood_group, i.component, i.expiry_date, p.full_name AS patient_name, p.patient_code, p.blood_group AS patient_blood
                FROM blood_issuance bi
                JOIN inventory i ON i.id = bi.inventory_id
                JOIN patients p ON p.id = bi.patient_id
                WHERE (p.full_name LIKE ? OR p.patient_code LIKE ? OR i.blood_group LIKE ?)';

        if ($patientId) {
            $sql .= ' AND bi.patient_id = ?';
        }

        $sql .= ' ORDER BY bi.issue_date DESC LIMIT 200';

        $stmt = db()->prepare($sql);
        if ($patientId) {
            $stmt->bind_param('sssi', $like, $like, $like, $patientId);
        } else {
            $stmt->bind_param('sss', $like, $like, $like);
        }
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }
}
