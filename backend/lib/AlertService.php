<?php
require_once __DIR__ . '/SmsService.php';
require_once __DIR__ . '/InventoryService.php';
require_once __DIR__ . '/Permissions.php';
require_once __DIR__ . '/NotificationService.php';

class AlertService
{
    // Send shortage alerts to configured staff if any blood_group/component below threshold
    public static function sendLowStockAlerts(): array
    {
        Permissions::allow('inventory');
        $low = InventoryService::lowStock();
        if (!$low) {
            return ['sent' => false, 'reason' => 'no_low_stock'];
        }
        $msg = 'BBMS Low Stock: ' . implode(', ', array_map(fn($r) => $r['blood_group'] . ' ' . $r['component'] . ' (' . $r['units'] . ')', $low));
        return SmsService::notifyStaff($msg);
    }

    // Send expiry alerts for units expiring within N days
    public static function sendExpiryAlerts(int $days = 3): array
    {
        Permissions::allow('inventory');
        $expiring = InventoryService::expiringSoon($days);
        if (!$expiring) {
            return ['sent' => false, 'reason' => 'no_expiring_units'];
        }
        $msg = 'BBMS Expiry: ' . count($expiring) . ' unit(s) expire within ' . $days . ' day(s).';
        return SmsService::notifyStaff($msg);
    }

    // Create in-app notifications for low stock and expiring units (deduped by cooldown).
    public static function queueSystemNotifications(int $days = 3): array
    {
        Permissions::allow('inventory');
        $created = [];

        $low = InventoryService::lowStock();
        if ($low) {
            $msg = 'Low stock: ' . implode(', ', array_map(fn($r) => $r['blood_group'] . ' ' . $r['component'] . ' (' . $r['units'] . ')', $low));
            $created['low_stock'] = NotificationService::createSystem('warning', 'Low Stock Alert', $msg, 6);
        } else {
            $created['low_stock'] = false;
        }

        $expiring = InventoryService::expiringSoon($days);
        if ($expiring) {
            $msg = 'Expiry alert: ' . count($expiring) . ' unit(s) expire within ' . $days . ' day(s).';
            $created['expiry'] = NotificationService::createSystem('warning', 'Expiry Alert', $msg, 6);
        } else {
            $created['expiry'] = false;
        }

        return $created;
    }
}
