<?php
require_once __DIR__ . '/Permissions.php';

class ReportService
{
    public static function donorBloodGroups(): array
    {
        Permissions::allow('reports');
        $sql = 'SELECT blood_group, COUNT(*) AS total FROM donors GROUP BY blood_group';
        return db()->query($sql)->fetch_all(MYSQLI_ASSOC);
    }

    public static function dailyCollections(int $days = 30): array
    {
        Permissions::allow('reports');
        $stmt = db()->prepare('SELECT DATE(collection_date) AS day, COUNT(*) AS total FROM collections WHERE collection_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY day ORDER BY day');
        $stmt->bind_param('i', $days);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public static function screeningResults(int $days = 30): array
    {
        Permissions::allow('reports');
        $stmt = db()->prepare('SELECT result_status, COUNT(*) AS total FROM screening_tests WHERE test_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY result_status');
        $stmt->bind_param('i', $days);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public static function inventorySnapshot(): array
    {
        Permissions::allow('reports');
        $sql = 'SELECT blood_group, status, COUNT(*) AS total FROM inventory GROUP BY blood_group, status';
        return db()->query($sql)->fetch_all(MYSQLI_ASSOC);
    }

    public static function issuanceDaily(int $days = 30): array
    {
        Permissions::allow('reports');
        $stmt = db()->prepare('SELECT DATE(issue_date) AS day, COUNT(*) AS total FROM blood_issuance WHERE issue_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY day ORDER BY day');
        $stmt->bind_param('i', $days);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }
}
