<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/Permissions.php';
require_once __DIR__ . '/LogService.php';
require_once __DIR__ . '/SmsService.php';

class CampaignService
{
    private static bool $initialized = false;

    private static function ensureTables(): void
    {
        if (self::$initialized) {
            return;
        }
        self::$initialized = true;

        $db = db();
        
        $db->query(
            "CREATE TABLE IF NOT EXISTS sms_campaigns (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                blood_group VARCHAR(10) NOT NULL,
                message TEXT NOT NULL,
                recipients_count INT UNSIGNED NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );

        $db->query(
            "CREATE TABLE IF NOT EXISTS sms_logs (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                campaign_id INT UNSIGNED NULL,
                recipient_name VARCHAR(150) NOT NULL,
                phone_number VARCHAR(30) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(20) NOT NULL,
                gateway_response TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_sms_logs_campaign FOREIGN KEY (campaign_id) REFERENCES sms_campaigns(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    }

    public static function listCampaigns(): array
    {
        Permissions::allow('reports');
        self::ensureTables();

        $sql = 'SELECT * FROM sms_campaigns ORDER BY created_at DESC';
        $result = db()->query($sql);
        return $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    }

    public static function listLogs(?int $campaignId = null): array
    {
        Permissions::allow('reports');
        self::ensureTables();

        if ($campaignId !== null) {
            $stmt = db()->prepare('SELECT * FROM sms_logs WHERE campaign_id = ? ORDER BY created_at DESC');
            $stmt->bind_param('i', $campaignId);
            $stmt->execute();
            $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
            return $rows;
        }

        $sql = 'SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT 200';
        $result = db()->query($sql);
        return $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    }

    public static function sendCampaign(array $input, ?int $userId = null): array
    {
        Permissions::allow('users');
        self::ensureTables();

        $bloodGroup = $input['blood_group'] ?? 'all';
        $message = trim($input['message'] ?? '');

        if (empty($message)) {
            throw new InvalidArgumentException('message_cannot_be_empty');
        }

        $db = db();

        // 1. Fetch eligible target donors
        if ($bloodGroup === 'all') {
            $sql = 'SELECT id, full_name, phone FROM donors WHERE is_eligible = 1 AND manual_hold = 0';
            $stmt = $db->prepare($sql);
        } else {
            $sql = 'SELECT id, full_name, phone FROM donors WHERE is_eligible = 1 AND manual_hold = 0 AND blood_group = ?';
            $stmt = $db->prepare($sql);
            $stmt->bind_param('s', $bloodGroup);
        }

        $stmt->execute();
        $donors = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        $recipientsCount = count($donors);

        // 2. Insert Campaign header
        $stmt = $db->prepare('INSERT INTO sms_campaigns (blood_group, message, recipients_count) VALUES (?, ?, ?)');
        $stmt->bind_param('ssi', $bloodGroup, $message, $recipientsCount);
        $stmt->execute();
        $campaignId = $stmt->insert_id;
        $stmt->close();

        // 3. Send SMS to each donor & log results
        $successCount = 0;
        foreach ($donors as $donor) {
            $phone = $donor['phone'];
            $name = $donor['full_name'];
            $status = 'sent';
            $gatewayResponse = '';

            try {
                // Call SmsService
                $res = SmsService::send($phone, $message);
                $gatewayResponse = json_encode($res);
                $successCount++;
            } catch (Exception $e) {
                $status = 'failed';
                $gatewayResponse = $e->getMessage();
            }

            // Insert into logs
            $stmtLog = $db->prepare('INSERT INTO sms_logs (campaign_id, recipient_name, phone_number, message, status, gateway_response) VALUES (?, ?, ?, ?, ?, ?)');
            $stmtLog->bind_param('isssss', $campaignId, $name, $phone, $message, $status, $gatewayResponse);
            $stmtLog->execute();
            $stmtLog->close();
        }

        if ($userId) {
            LogService::write($userId, 'send_campaign', 'sms_campaigns', $campaignId);
        }

        return [
            'campaign_id' => $campaignId,
            'recipients_count' => $recipientsCount,
            'success_count' => $successCount,
            'blood_group' => $bloodGroup,
            'message' => $message,
        ];
    }
}
