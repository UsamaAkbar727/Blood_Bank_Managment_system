<?php
require_once __DIR__ . '/../db.php';

class SmsService
{
    public static function send(string $to, string $message): array
    {
        $payload = [
            'to' => $to,
            'message' => $message,
            'sender_id' => SMS_SENDER_ID,
            'api_key' => SMS_API_KEY,
        ];

        $ch = curl_init(SMS_API_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 10,
        ]);
        $response = curl_exec($ch);
        $err = curl_error($ch);
        $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($err) {
            throw new RuntimeException('sms_failed:' . $err);
        }
        if ($status >= 300) {
            throw new RuntimeException('sms_failed:http_' . $status);
        }
        return ['status' => 'sent', 'gateway_status' => $status, 'response' => $response];
    }

    public static function notifyStaff(string $message): array
    {
        $results = [];
        foreach (ALERT_STAFF_NUMBERS as $num) {
            $results[] = self::send($num, $message);
        }
        return $results;
    }
}
