<?php
require_once __DIR__ . '/Permissions.php';
require_once __DIR__ . '/InventoryService.php';

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
        InventoryService::reconcile();
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

    public static function saveDriveExportLink(int $userId, string $fileName, string $driveFileId, string $driveUrl, string $mimeType, int $days): bool
    {
        Permissions::allow('reports');

        db()->query(
            "CREATE TABLE IF NOT EXISTS report_exports (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNSIGNED NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                drive_file_id VARCHAR(128) NOT NULL,
                drive_url VARCHAR(512) NOT NULL,
                mime_type VARCHAR(128) NOT NULL,
                report_days INT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );

        $stmt = db()->prepare('INSERT INTO report_exports (user_id, file_name, drive_file_id, drive_url, mime_type, report_days) VALUES (?, ?, ?, ?, ?, ?)');
        if (!$stmt) {
            return false;
        }

        $stmt->bind_param('issssi', $userId, $fileName, $driveFileId, $driveUrl, $mimeType, $days);
        $result = $stmt->execute();
        $stmt->close();

        return (bool)$result;
    }
}
