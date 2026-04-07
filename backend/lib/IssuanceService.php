<?php
require_once __DIR__ . '/Permissions.php';
require_once __DIR__ . '/LogService.php';
require_once __DIR__ . '/FinancialService.php';

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

    private static function normalizeBloodGroup(?string $raw): string
    {
        if ($raw === null) {
            return '';
        }
        $base = strtoupper(trim($raw));
        $compact = preg_replace('/\s+/', '', $base);
        $compact = str_replace(["–", "−"], "-", $compact);
        $valid = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        if (in_array($compact, $valid, true)) {
            return $compact;
        }
        $text = str_replace('0', 'O', $compact);
        if (strpos($text, 'AB') !== false) {
            if (strpos($text, 'NEG') !== false) return 'AB-';
            if (strpos($text, 'POS') !== false) return 'AB+';
        }
        if (strpos($text, 'A') !== false && strpos($text, 'AB') === false) {
            if (strpos($text, 'NEG') !== false) return 'A-';
            if (strpos($text, 'POS') !== false) return 'A+';
        }
        if (strpos($text, 'B') !== false && strpos($text, 'AB') === false) {
            if (strpos($text, 'NEG') !== false) return 'B-';
            if (strpos($text, 'POS') !== false) return 'B+';
        }
        if (strpos($text, 'O') !== false) {
            if (strpos($text, 'NEG') !== false) return 'O-';
            if (strpos($text, 'POS') !== false) return 'O+';
        }
        return $base;
    }

    public static function compatibleUnits(string $patientBlood): array
    {
        $normalized = self::normalizeBloodGroup($patientBlood);
        return self::$compatibility[$normalized] ?? [];
    }

    private static function assertAvailableInventory(int $inventoryId, string $patientBlood): array
    {
        Permissions::allow('inventory');
        $stmt = db()->prepare('SELECT * FROM inventory WHERE id=? AND status="available" AND units_available > 0 LIMIT 1');
        $stmt->bind_param('i', $inventoryId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$row) {
            throw new InvalidArgumentException('unit_not_available');
        }
        $inventoryBlood = self::normalizeBloodGroup($row['blood_group'] ?? '');
        if (!in_array($inventoryBlood, self::compatibleUnits($patientBlood), true)) {
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
        $price = isset($input['price']) ? (float)$input['price'] : null;
        $paymentStatus = $input['payment_status'] ?? 'Pending';
        $isExchange = !empty($input['is_exchange']) ? 1 : 0;
        $exchangeReference = trim((string)($input['exchange_reference'] ?? ''));

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

        // Validate inventory compatibility and quantity
        $inventory = self::assertAvailableInventory($inventoryId, $patient['blood_group']);
        if ($units > (int)($inventory['units_available'] ?? 0)) {
            throw new InvalidArgumentException('insufficient_units');
        }

        $defaultPrice = FinancialService::latestPriceForUnit((string)($inventory['component'] ?? ''), (string)($inventory['blood_group'] ?? ''));
        if ($price === null) {
            $price = isset($defaultPrice['unit_cost']) ? (float)$defaultPrice['unit_cost'] : 0.0;
        }
        if (strcasecmp($paymentStatus, 'Free/Charity') === 0) {
            $price = 0.0;
        }
        if ($isExchange && $exchangeReference === '') {
            throw new InvalidArgumentException('exchange_reference_required');
        }

        $db = db();
        $db->begin_transaction();
        try {
            $stmt = $db->prepare('INSERT INTO blood_issuance (inventory_id, patient_id, issued_by, issue_date, units_issued, crossmatch_result, reactions_reported, status, remarks, price, payment_status, is_exchange, exchange_reference) VALUES (?,?,?,NOW(),?,?,0,"issued",?,?,?,?,?)');
            $stmt->bind_param('iiiissdsis', $inventoryId, $patientId, $issuedBy, $units, $crossmatch, $remarks, $price, $paymentStatus, $isExchange, $exchangeReference);
            $stmt->execute();
            $issuanceId = $stmt->insert_id;
            $stmt->close();

            $stmt2 = $db->prepare('UPDATE inventory SET units_available = GREATEST(CAST(units_available AS SIGNED) - ?, 0), status = CASE WHEN CAST(units_available AS SIGNED) - ? <= 0 THEN "issued" ELSE status END WHERE id=?');
            $stmt2->bind_param('iii', $units, $units, $inventoryId);
            $stmt2->execute();
            $stmt2->close();

            FinancialService::recordIssuanceAccounting([
                'issuance_id' => $issuanceId,
                'amount' => $price,
            ]);

            if (strcasecmp($paymentStatus, 'Paid') === 0 && $price > 0) {
                FinancialService::recordIssuanceIncome([
                    'issuance_id' => $issuanceId,
                    'patient_id' => $patientId,
                    'amount' => $price,
                    'payment_status' => $paymentStatus,
                    'description' => 'Blood issuance income',
                ], $issuedBy);
            }

            $db->commit();
        } catch (Throwable $e) {
            $db->rollback();
            throw $e;
        }

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
