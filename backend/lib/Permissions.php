<?php
require_once __DIR__ . '/Auth.php';

/**
 * Module-level authorization helper.
 * Map modules to allowed roles; admin is auto-allowed in Auth::requireRole().
 */
class Permissions
{
    private const MODULE_ROLES = [
        'donors' => ['staff'],
        'collections' => ['staff'],
        'inventory' => ['staff'],
        'screening' => ['lab_tech'],
        'users' => ['admin'],
        'expenses' => ['admin'],
        'logs' => ['admin'],
        'donors' => ['staff'],
        'patients' => ['staff'],
        'issuance' => ['staff'],
        'reports' => ['admin'],
        'finance' => ['admin'],
        'backups' => ['admin'],
        'logs' => ['admin'],
        'notifications' => ['staff'],
    ];

    public static function allow(string $module): void
    {
        $roles = self::MODULE_ROLES[$module] ?? [];
        Auth::requireRole($roles);
    }
}
