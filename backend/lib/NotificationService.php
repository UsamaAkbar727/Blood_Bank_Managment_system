<?php
require_once __DIR__ . '/Permissions.php';

class NotificationService
{
    public static function listForUser(int $userId, bool $unreadOnly = false): array
    {
        Permissions::allow('notifications');
        $sql = 'SELECT * FROM notifications WHERE (user_id = ? OR user_id IS NULL)';
        if ($unreadOnly) {
            $sql .= ' AND is_read = 0';
        }
        $sql .= ' ORDER BY created_at DESC LIMIT 200';
        $stmt = db()->prepare($sql);
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public static function create(?int $userId, string $type, string $title, string $message): int
    {
        Permissions::allow('notifications');
        $stmt = db()->prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?,?,?,?)');
        $stmt->bind_param('isss', $userId, $type, $title, $message);
        $stmt->execute();
        $id = $stmt->insert_id;
        $stmt->close();
        return $id;
    }

    public static function markRead(int $id, int $userId): bool
    {
        Permissions::allow('notifications');
        $stmt = db()->prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id IS NULL)');
        $stmt->bind_param('ii', $id, $userId);
        $stmt->execute();
        $ok = $stmt->affected_rows > 0;
        $stmt->close();
        return $ok;
    }

    public static function delete(int $id, int $userId): bool
    {
        Permissions::allow('notifications');
        $stmt = db()->prepare('DELETE FROM notifications WHERE id = ? AND (user_id = ? OR user_id IS NULL)');
        $stmt->bind_param('ii', $id, $userId);
        $stmt->execute();
        $ok = $stmt->affected_rows > 0;
        $stmt->close();
        return $ok;
    }

    public static function createSystem(string $type, string $title, string $message, int $cooldownHours = 6): bool
    {
        Permissions::allow('notifications');
        $stmt = db()->prepare('SELECT id FROM notifications WHERE title = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR) LIMIT 1');
        $stmt->bind_param('si', $title, $cooldownHours);
        $stmt->execute();
        $exists = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($exists) {
            return false;
        }
        $stmt = db()->prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (NULL, ?, ?, ?)');
        $stmt->bind_param('sss', $type, $title, $message);
        $stmt->execute();
        $stmt->close();
        return true;
    }
}
