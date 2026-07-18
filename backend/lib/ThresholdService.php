<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/Permissions.php';
require_once __DIR__ . '/LogService.php';

class ThresholdService
{
    private static bool $initialized = false;

    private static function ensureTable(): void
    {
        if (self::$initialized) {
            return;
        }
        self::$initialized = true;

        $db = db();
        
        $db->query(
            "CREATE TABLE IF NOT EXISTS settings_stock_thresholds (
                blood_group VARCHAR(10) PRIMARY KEY,
                min_units INT UNSIGNED NOT NULL DEFAULT 5,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );

        // Check if populated. If not, insert default thresholds
        $res = $db->query('SELECT COUNT(*) FROM settings_stock_thresholds');
        if ($res && $res->fetch_row()[0] == 0) {
            $defaults = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
            foreach ($defaults as $bg) {
                $db->query("INSERT INTO settings_stock_thresholds (blood_group, min_units) VALUES ('$bg', 5)");
            }
        }
    }

    public static function getThresholds(): array
    {
        self::ensureTable();
        $res = db()->query('SELECT blood_group, min_units FROM settings_stock_thresholds');
        $rows = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
        
        $map = [];
        foreach ($rows as $row) {
            $map[$row['blood_group']] = (int)$row['min_units'];
        }
        return $map;
    }

    public static function updateThresholds(array $input, ?int $userId = null): array
    {
        Permissions::allow('finance');
        self::ensureTable();

        $db = db();
        foreach ($input as $bg => $min) {
            $minVal = max(0, (int)$min);
            $stmt = $db->prepare('INSERT INTO settings_stock_thresholds (blood_group, min_units) VALUES (?, ?) ON DUPLICATE KEY UPDATE min_units = VALUES(min_units)');
            $stmt->bind_param('si', $bg, $minVal);
            $stmt->execute();
            $stmt->close();
        }

        if ($userId) {
            LogService::write($userId, 'update', 'settings_stock_thresholds', 1);
        }

        return self::getThresholds();
    }

    public static function getLowStockAlerts(): array
    {
        self::ensureTable();
        $thresholds = self::getThresholds();
        
        // Count available blood bags group-wise
        $sql = "SELECT blood_group, SUM(units_available) AS current_units FROM inventory WHERE status = 'available' GROUP BY blood_group";
        $res = db()->query($sql);
        $stock = [];
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $stock[$row['blood_group']] = (int)$row['current_units'];
            }
        }

        $alerts = [];
        foreach ($thresholds as $bg => $min) {
            $current = $stock[$bg] ?? 0;
            if ($current < $min) {
                $alerts[] = [
                    'blood_group' => $bg,
                    'current_units' => $current,
                    'min_units' => $min,
                    'status' => $current == 0 ? 'out_of_stock' : 'low_stock',
                ];
            }
        }

        return $alerts;
    }
}
