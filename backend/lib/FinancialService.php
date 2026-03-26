<?php
require_once __DIR__ . '/Permissions.php';

class FinancialService
{
    public static function latestPriceForUnit(string $component, string $bloodGroup): ?array
    {
        $stmt = db()->prepare('SELECT bp.* FROM blood_pricing bp WHERE bp.component=? AND bp.blood_group=? ORDER BY bp.effective_from DESC, bp.id DESC LIMIT 1');
        $stmt->bind_param('ss', $component, $bloodGroup);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    public static function recordIssuanceIncome(array $input, int $userId): ?array
    {
        $issuanceId = (int)($input['issuance_id'] ?? 0);
        $amount = isset($input['amount']) ? (float)$input['amount'] : null;
        $paymentStatus = $input['payment_status'] ?? 'Pending';
        if ($issuanceId <= 0 || $amount === null) {
            throw new InvalidArgumentException('missing_fields');
        }
        if (strcasecmp($paymentStatus, 'Paid') !== 0 || $amount <= 0) {
            return null;
        }

        $stmt = db()->prepare('INSERT INTO income_transactions (source_type, source_id, patient_id, description, amount, transaction_date, recorded_by) VALUES ("issuance", ?, ?, ?, ?, NOW(), ?)');
        $patientId = (int)($input['patient_id'] ?? 0);
        $description = $input['description'] ?? 'Blood issuance income';
        $stmt->bind_param('iisdi', $issuanceId, $patientId, $description, $amount, $userId);
        $stmt->execute();
        $id = $stmt->insert_id;
        $stmt->close();
        return self::getIncomeTransaction($id);
    }

    public static function getIncomeTransaction(int $id): ?array
    {
        $stmt = db()->prepare('SELECT it.*, p.full_name AS patient_name, p.patient_code FROM income_transactions it LEFT JOIN patients p ON p.id = it.patient_id WHERE it.id = ? LIMIT 1');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    /* Pricing */
    public static function upsertPrice(array $input, int $userId): array
    {
        Permissions::allow('finance');
        $component = $input['component'] ?? '';
        $blood = $input['blood_group'] ?? '';
        $cost = isset($input['unit_cost']) ? (float)$input['unit_cost'] : null;
        $eff = $input['effective_from'] ?? date('Y-m-d');
        if (!$component || !$blood || $cost === null) {
            throw new InvalidArgumentException('missing_fields');
        }
        $stmt = db()->prepare('INSERT INTO blood_pricing (component, blood_group, unit_cost, effective_from, created_by) VALUES (?,?,?,?,?)');
        $stmt->bind_param('ssdsi', $component, $blood, $cost, $eff, $userId);
        if (!$stmt->execute()) {
            if ($stmt->errno === 1062) {
                // replace existing effective_from row
                $stmt->close();
                $stmt2 = db()->prepare('UPDATE blood_pricing SET unit_cost=?, created_by=? WHERE component=? AND blood_group=? AND effective_from=?');
                $stmt2->bind_param('disss', $cost, $userId, $component, $blood, $eff);
                $stmt2->execute();
                $stmt2->close();
            } else {
                $err = $stmt->error;
                $stmt->close();
                throw new RuntimeException($err);
            }
        } else {
            $stmt->close();
        }
        return self::latestPrices();
    }

    public static function latestPrices(): array
    {
        Permissions::allow('finance');
        $sql = 'SELECT bp1.* FROM blood_pricing bp1
                JOIN (
                  SELECT component, blood_group, MAX(effective_from) AS eff
                  FROM blood_pricing GROUP BY component, blood_group
                ) bp2
                ON bp1.component = bp2.component AND bp1.blood_group = bp2.blood_group AND bp1.effective_from = bp2.eff
                ORDER BY bp1.component, bp1.blood_group';
        return db()->query($sql)->fetch_all(MYSQLI_ASSOC);
    }

    /* Expenses */
    public static function addExpense(array $input, int $userId): array
    {
        Permissions::allow('finance');
        $category = $input['category'] ?? '';
        $amount = isset($input['amount']) ? (float)$input['amount'] : null;
        $incurred = $input['incurred_on'] ?? date('Y-m-d');
        $desc = $input['description'] ?? null;
        if ($category === '' || $amount === null) {
            throw new InvalidArgumentException('missing_fields');
        }
        $stmt = db()->prepare('INSERT INTO expenses (category, description, amount, incurred_on, recorded_by) VALUES (?,?,?,?,?)');
        $stmt->bind_param('ssdsi', $category, $desc, $amount, $incurred, $userId);
        $stmt->execute();
        $stmt->close();
        return self::listExpenses();
    }

    public static function listExpenses(int $limit = 200): array
    {
        Permissions::allow('finance');
        $stmt = db()->prepare('SELECT e.*, u.name AS recorded_by_name FROM expenses e LEFT JOIN users u ON u.id = e.recorded_by ORDER BY incurred_on DESC, e.id DESC LIMIT ?');
        $stmt->bind_param('i', $limit);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public static function deleteExpense(int $id): bool
    {
        Permissions::allow('finance');
        $stmt = db()->prepare('DELETE FROM expenses WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $ok = $stmt->affected_rows > 0;
        $stmt->close();
        return $ok;
    }

    /* Billing */
    private static function nextInvoice(): string
    {
        $prefix = 'INV-' . date('Ymd') . '-';
        $stmt = db()->prepare('SELECT COUNT(*) FROM billing_records WHERE issued_on >= CURDATE()');
        $stmt->execute();
        $count = $stmt->get_result()->fetch_row()[0] ?? 0;
        $stmt->close();
        return $prefix . str_pad((string)($count + 1), 4, '0', STR_PAD_LEFT);
    }

    public static function createBill(array $input): array
    {
        Permissions::allow('finance');
        $issuanceId = (int)($input['issuance_id'] ?? 0);
        $amount = isset($input['amount']) ? (float)$input['amount'] : null;
        $discount = isset($input['discount']) ? (float)$input['discount'] : 0;
        if ($issuanceId <= 0 || $amount === null) {
            throw new InvalidArgumentException('missing_fields');
        }
        // fetch issuance + patient
        $stmt = db()->prepare('SELECT bi.id, bi.patient_id FROM blood_issuance bi WHERE bi.id=? LIMIT 1');
        $stmt->bind_param('i', $issuanceId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$row) {
            throw new InvalidArgumentException('issuance_not_found');
        }
        $invoice = self::nextInvoice();
        $stmt2 = db()->prepare('INSERT INTO billing_records (invoice_no, patient_id, issuance_id, amount, discount, status) VALUES (?,?,?,?,?, "unpaid")');
        $stmt2->bind_param('siidd', $invoice, $row['patient_id'], $issuanceId, $amount, $discount);
        $stmt2->execute();
        $id = $stmt2->insert_id;
        $stmt2->close();
        return self::getBill($id);
    }

    public static function markPaid(int $id): ?array
    {
        Permissions::allow('finance');
        $stmt = db()->prepare('UPDATE billing_records SET status="paid", paid_on=NOW() WHERE id=?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        return self::getBill($id);
    }

    public static function getBill(int $id): ?array
    {
        Permissions::allow('finance');
        $sql = 'SELECT b.*, p.full_name AS patient_name, p.patient_code, bi.issue_date
                FROM billing_records b
                JOIN patients p ON p.id = b.patient_id
                JOIN blood_issuance bi ON bi.id = b.issuance_id
                WHERE b.id = ? LIMIT 1';
        $stmt = db()->prepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    public static function deleteBill(int $id): bool
    {
        Permissions::allow('finance');
        $stmt = db()->prepare('DELETE FROM billing_records WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $ok = $stmt->affected_rows > 0;
        $stmt->close();
        return $ok;
    }

    public static function listBills(string $status = '', string $search = ''): array
    {
        Permissions::allow('finance');
        $like = '%' . $search . '%';
        if ($status) {
            $stmt = db()->prepare('SELECT b.*, p.full_name AS patient_name, p.patient_code FROM billing_records b JOIN patients p ON p.id = b.patient_id WHERE b.status=? AND (p.full_name LIKE ? OR p.patient_code LIKE ? OR b.invoice_no LIKE ?) ORDER BY b.issued_on DESC LIMIT 200');
            $stmt->bind_param('ssss', $status, $like, $like, $like);
        } else {
            $stmt = db()->prepare('SELECT b.*, p.full_name AS patient_name, p.patient_code FROM billing_records b JOIN patients p ON p.id = b.patient_id WHERE (p.full_name LIKE ? OR p.patient_code LIKE ? OR b.invoice_no LIKE ?) ORDER BY b.issued_on DESC LIMIT 200');
            $stmt->bind_param('sss', $like, $like, $like);
        }
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public static function deletePrice(int $id): bool
    {
        Permissions::allow('finance');
        $stmt = db()->prepare('DELETE FROM blood_pricing WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $ok = $stmt->affected_rows > 0;
        $stmt->close();
        return $ok;
    }
}
