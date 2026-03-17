<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/Permissions.php';

class LogService
{
    public static function write(?int $userId, string $action, string $entityType, ?int $entityId = null, string $message = '', string $ip = null, string $ua = null): void
    {
        $ip = $ip ?? ($_SERVER['REMOTE_ADDR'] ?? null);
        $ua = $ua ?? ($_SERVER['HTTP_USER_AGENT'] ?? null);
        $stmt = db()->prepare('INSERT INTO logs (user_id, action, entity_type, entity_id, ip_address, user_agent) VALUES (?,?,?,?,?,?)');
        $stmt->bind_param('ississ', $userId, $action, $entityType, $entityId, $ip, $ua);
        $stmt->execute();
        $stmt->close();
    }

    public static function list(string $search = '', int $limit = 300): array
    {
        Permissions::allow('logs');
        $like = '%' . $search . '%';
        $stmt = db()->prepare(
            'SELECT l.*, u.username AS user_name
            FROM logs l
            LEFT JOIN users u ON u.id = l.user_id
            WHERE (u.username LIKE ? OR l.action LIKE ? OR l.entity_type LIKE ? OR CAST(l.entity_id AS CHAR) LIKE ?)
            ORDER BY l.id DESC
            LIMIT ?'
        );
        $stmt->bind_param('ssssi', $like, $like, $like, $like, $limit);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public static function delete(int $id): void
    {
        Permissions::allow('logs');

        $stmt = db()->prepare('DELETE FROM logs WHERE id = ?');
        if (!$stmt) {
            throw new Exception('Failed to prepare delete statement');
        }

        $stmt->bind_param('i', $id);
        if (!$stmt->execute()) {
            $stmt->close();
            throw new Exception('Failed to delete log entry');
        }

        if ($stmt->affected_rows === 0) {
            $stmt->close();
            throw new Exception('Log entry not found');
        }

        $stmt->close();
    }
}
