<?php
require_once __DIR__ . '/Permissions.php';

class InventoryService
{
    public static int $lowStockThreshold = 5; // per blood group/component

    private static function baseSelect(): string
    {
        return 'SELECT i.*, c.collection_code, d.full_name AS donor_name 
                FROM inventory i 
                JOIN collections c ON c.id = i.collection_id 
                JOIN donors d ON d.id = c.donor_id';
    }

    public static function list(string $search = '', string $status = ''): array
    {
        Permissions::allow('inventory');
        $like = '%' . $search . '%';
        $sql = self::baseSelect() . ' WHERE (i.blood_group LIKE ? OR i.component LIKE ? OR c.collection_code LIKE ? OR d.full_name LIKE ?)';
        $types = 'ssss';
        $params = [$like, $like, $like, $like];
        if ($status !== '') {
            $sql .= ' AND i.status = ?';
            $types .= 's';
            $params[] = $status;
        }
        $sql .= ' ORDER BY i.status, i.expiry_date ASC LIMIT 300';
        $stmt = db()->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public static function summary(): array
    {
        Permissions::allow('inventory');
        $sql = 'SELECT blood_group, component, status, COUNT(*) AS units 
                FROM inventory 
                GROUP BY blood_group, component, status';
        $rows = db()->query($sql)->fetch_all(MYSQLI_ASSOC);

        $summary = [];
        foreach ($rows as $r) {
            $key = $r['blood_group'] . '|' . $r['component'];
            if (!isset($summary[$key])) {
                $summary[$key] = ['blood_group' => $r['blood_group'], 'component' => $r['component'], 'available' => 0, 'reserved' => 0, 'issued' => 0, 'expired' => 0, 'discarded' => 0];
            }
            $summary[$key][$r['status']] = (int)$r['units'];
        }
        return array_values($summary);
    }

    public static function expiringSoon(int $days = 7): array
    {
        Permissions::allow('inventory');
        $stmt = db()->prepare(self::baseSelect() . ' WHERE i.status = "available" AND i.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) ORDER BY i.expiry_date ASC LIMIT 100');
        $stmt->bind_param('i', $days);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public static function lowStock(): array
    {
        Permissions::allow('inventory');
        $stmt = db()->prepare('SELECT blood_group, component, COUNT(*) AS units FROM inventory WHERE status="available" GROUP BY blood_group, component HAVING units < ? ORDER BY units ASC');
        $stmt->bind_param('i', self::$lowStockThreshold);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }
}
