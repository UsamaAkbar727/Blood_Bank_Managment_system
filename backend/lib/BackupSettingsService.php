<?php
require_once __DIR__ . '/Permissions.php';
require_once __DIR__ . '/LogService.php';

class BackupSettingsService
{
    public static function get(): array
    {
        $row = db()->query('SELECT * FROM settings_backups WHERE id = 1 LIMIT 1')->fetch_assoc();
        if (!$row) {
            return self::defaults();
        }

        return self::normalize($row);
    }

    public static function update(array $payload, ?int $userId = null): array
    {
        Permissions::allow('users');
        $current = self::get();
        $merged = array_merge($current, $payload);
        $normalized = self::normalize($merged);

        $stmt = db()->prepare(
            'INSERT INTO settings_backups (id, frequency, scheduled_time, scheduled_day_of_week, retention_days, auto_delete_local, drive_enabled, drive_folder_id, drive_credentials_path, drive_auth_url, last_run_at)
             VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                frequency=VALUES(frequency),
                scheduled_time=VALUES(scheduled_time),
                scheduled_day_of_week=VALUES(scheduled_day_of_week),
                retention_days=VALUES(retention_days),
                auto_delete_local=VALUES(auto_delete_local),
                drive_enabled=VALUES(drive_enabled),
                drive_folder_id=VALUES(drive_folder_id),
                drive_credentials_path=VALUES(drive_credentials_path),
                drive_auth_url=VALUES(drive_auth_url)'
        );

        $frequency = $normalized['frequency'];
        $scheduledTime = $normalized['scheduled_time'];
        $dayOfWeek = $normalized['scheduled_day_of_week'];
        $retention = $normalized['retention_days'];
        $autoDelete = $normalized['auto_delete_local'] ? 1 : 0;
        $driveEnabled = $normalized['drive_enabled'] ? 1 : 0;
        $driveFolderId = $normalized['drive_folder_id'];
        $driveCredentialsPath = $normalized['drive_credentials_path'];
        $driveAuthUrl = $normalized['drive_auth_url'];
        $lastRunAt = $normalized['last_run_at'];

        $stmt->bind_param('sssiiissss', $frequency, $scheduledTime, $dayOfWeek, $retention, $autoDelete, $driveEnabled, $driveFolderId, $driveCredentialsPath, $driveAuthUrl, $lastRunAt);
        $stmt->execute();
        $stmt->close();

        LogService::write($userId, 'update', 'settings_backups', 1);
        return self::get();
    }

    public static function isDue(?array $settings = null, ?DateTimeInterface $now = null): bool
    {
        $settings = $settings ?? self::get();
        $now = $now ?? new DateTimeImmutable('now');
        $todayTime = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $now->format('Y-m-d') . ' ' . $settings['scheduled_time']);
        if (!$todayTime) {
            return false;
        }

        $lastRunAt = !empty($settings['last_run_at']) ? new DateTimeImmutable($settings['last_run_at']) : null;

        if ($settings['frequency'] === 'daily') {
            return $now >= $todayTime && (!$lastRunAt || $lastRunAt->format('Y-m-d') !== $now->format('Y-m-d'));
        }

        if ($settings['frequency'] === 'weekly') {
            return ((int)$now->format('N')) === (int)$settings['scheduled_day_of_week']
                && $now >= $todayTime
                && (!$lastRunAt || $lastRunAt->format('o-W') !== $now->format('o-W'));
        }

        if ($settings['frequency'] === 'monthly') {
            return (int)$now->format('j') === (int)$settings['scheduled_day_of_week']
                && $now >= $todayTime
                && (!$lastRunAt || $lastRunAt->format('Y-m') !== $now->format('Y-m'));
        }

        return false;
    }

    private static function normalize(array $row): array
    {
        return [
            'frequency' => in_array(($row['frequency'] ?? 'daily'), ['daily', 'weekly', 'monthly'], true) ? $row['frequency'] : 'daily',
            'scheduled_time' => substr((string)($row['scheduled_time'] ?? '00:00:00'), 0, 8),
            'scheduled_day_of_week' => max(1, min(31, (int)($row['scheduled_day_of_week'] ?? 1))),
            'retention_days' => max(1, (int)($row['retention_days'] ?? 7)),
            'auto_delete_local' => !empty($row['auto_delete_local']),
            'drive_enabled' => !empty($row['drive_enabled']),
            'drive_folder_id' => $row['drive_folder_id'] ?? null,
            'drive_credentials_path' => $row['drive_credentials_path'] ?? null,
            'drive_auth_url' => $row['drive_auth_url'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
            'last_run_at' => $row['last_run_at'] ?? null,
        ];
    }

    private static function defaults(): array
    {
        return self::normalize([
            'frequency' => 'daily',
            'scheduled_time' => '00:00:00',
            'scheduled_day_of_week' => 1,
            'retention_days' => 7,
            'auto_delete_local' => 1,
            'drive_enabled' => 0,
            'drive_folder_id' => null,
            'drive_credentials_path' => null,
            'drive_auth_url' => null,
            'updated_at' => null,
            'last_run_at' => null,
        ]);
    }
}
