<?php
require_once __DIR__ . '/Permissions.php';

class NotificationService
{
    public static function listForUser(int $userId, bool $unreadOnly = false): array
    {
        Permissions::allow('notifications');
        $sql = 'SELECT * FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND (snoozed_until IS NULL OR snoozed_until <= NOW())';
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

    public static function create(?int $userId, string $type, string $title, string $message, ?string $eventKey = null, ?int $snoozeHours = null): int
    {
        Permissions::allow('notifications');
        $stmt = db()->prepare('INSERT INTO notifications (user_id, type, title, message, event_key, snoozed_until) VALUES (?,?,?,?,?,?)');
        $snoozedUntil = null;
        if ($snoozeHours !== null) {
            $snoozedUntil = date('Y-m-d H:i:s', time() + ($snoozeHours * 3600));
        }
        $stmt->bind_param('isssss', $userId, $type, $title, $message, $eventKey, $snoozedUntil);
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
        $lookup = db()->prepare('SELECT event_key FROM notifications WHERE id = ? AND (user_id = ? OR user_id IS NULL) LIMIT 1');
        $lookup->bind_param('ii', $id, $userId);
        $lookup->execute();
        $row = $lookup->get_result()->fetch_assoc();
        $lookup->close();

        if ($row && !empty($row['event_key'])) {
            $stmt = db()->prepare('UPDATE notifications SET is_read = 1, snoozed_until = DATE_ADD(NOW(), INTERVAL 24 HOUR) WHERE id = ? AND (user_id = ? OR user_id IS NULL)');
            $stmt->bind_param('ii', $id, $userId);
            $stmt->execute();
            $ok = $stmt->affected_rows > 0;
            $stmt->close();
            return $ok;
        }

        $stmt = db()->prepare('DELETE FROM notifications WHERE id = ? AND (user_id = ? OR user_id IS NULL)');
        $stmt->bind_param('ii', $id, $userId);
        $stmt->execute();
        $ok = $stmt->affected_rows > 0;
        $stmt->close();
        return $ok;
    }

    public static function createSystem(string $type, string $title, string $message, string $eventKey, int $cooldownHours = 6): bool
    {
        Permissions::allow('notifications');
        $stmt = db()->prepare('SELECT id FROM notifications WHERE event_key = ? AND (created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR) OR snoozed_until > NOW()) LIMIT 1');
        $stmt->bind_param('si', $eventKey, $cooldownHours);
        $stmt->execute();
        $exists = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($exists) {
            return false;
        }
        $stmt = db()->prepare('INSERT INTO notifications (user_id, type, title, message, event_key) VALUES (NULL, ?, ?, ?, ?)');
        $stmt->bind_param('ssss', $type, $title, $message, $eventKey);
        $stmt->execute();
        $stmt->close();
        return true;
    }
}
