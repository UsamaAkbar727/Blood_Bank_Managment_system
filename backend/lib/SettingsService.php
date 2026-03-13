<?php
require_once __DIR__ . '/Permissions.php';
require_once __DIR__ . '/LogService.php';

class SettingsService
{
    private const COMPONENTS = ['Whole Blood', 'PRBC', 'Platelets', 'FFP', 'Plasma', 'Cryo'];

    public static function expiryRules(): array
    {
        $rows = db()->query('SELECT component, shelf_life_days, allow_manual_override, updated_at FROM settings_expiry_rules ORDER BY FIELD(component, "Whole Blood", "PRBC", "Platelets", "FFP", "Plasma", "Cryo")')
            ->fetch_all(MYSQLI_ASSOC);

        return array_map(static function (array $row): array {
            return [
                'component' => $row['component'],
                'shelf_life_days' => (int)$row['shelf_life_days'],
                'allow_manual_override' => (bool)$row['allow_manual_override'],
                'updated_at' => $row['updated_at'],
            ];
        }, $rows);
    }

    public static function updateExpiryRules(array $rules, ?int $userId = null): array
    {
        Permissions::allow('users');
        $db = db();
        $stmt = $db->prepare('INSERT INTO settings_expiry_rules (component, shelf_life_days, allow_manual_override) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE shelf_life_days=VALUES(shelf_life_days), allow_manual_override=VALUES(allow_manual_override)');

        foreach ($rules as $rule) {
            $component = $rule['component'] ?? '';
            $days = (int)($rule['shelf_life_days'] ?? 0);
            $allowManual = !empty($rule['allow_manual_override']) ? 1 : 0;

            if (!in_array($component, self::COMPONENTS, true)) {
                throw new InvalidArgumentException('invalid_component');
            }
            if ($days <= 0) {
                throw new InvalidArgumentException('invalid_shelf_life_days');
            }

            $stmt->bind_param('sii', $component, $days, $allowManual);
            $stmt->execute();
        }
        $stmt->close();

        LogService::write($userId, 'update', 'settings_expiry_rules', null);
        return self::expiryRules();
    }

    public static function ruleForComponent(string $component = 'Whole Blood'): array
    {
        $stmt = db()->prepare('SELECT component, shelf_life_days, allow_manual_override FROM settings_expiry_rules WHERE component = ? LIMIT 1');
        $stmt->bind_param('s', $component);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if ($row) {
            return [
                'component' => $row['component'],
                'shelf_life_days' => (int)$row['shelf_life_days'],
                'allow_manual_override' => (bool)$row['allow_manual_override'],
            ];
        }

        return [
            'component' => $component,
            'shelf_life_days' => 35,
            'allow_manual_override' => true,
        ];
    }
}
