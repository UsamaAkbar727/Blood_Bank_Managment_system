<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/Permissions.php';
require_once __DIR__ . '/LogService.php';

class BackupService
{
    public static function list(int $days = 3): array
    {
        Permissions::allow('backups');
        $stmt = db()->prepare('SELECT * FROM backup_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) ORDER BY created_at DESC');
        $stmt->bind_param('i', $days);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public static function run(bool $manual = false, string $format = 'excel'): array
    {
        Permissions::allow('backups');
        $timestamp = date('Ymd_His');
        $format = strtolower($format);
        $ext = $format === 'pdf' ? 'pdf' : 'xls';
        $fileName = 'bbms_' . $timestamp . '.' . $ext;
        $filePath = realpath(__DIR__ . '/../..') . '/backups/' . $fileName;

        $status = 'success';
        $message = 'ok';

        try {
            $data = self::exportData();
            if ($format === 'pdf') {
                self::writePdf($filePath, $data);
            } else {
                self::writeExcel($filePath, $data);
            }
        } catch (Throwable $e) {
            $status = 'failed';
            $message = 'export_error';
        }

        $size = file_exists($filePath) ? filesize($filePath) : 0;
        $uploaded = false;

        if ($status === 'success' && BACKUP_DRIVE_ENABLED) {
            try {
                $uploaded = self::uploadToDrive($filePath, $fileName);
            } catch (Throwable $e) {
                $uploaded = false;
                $message = 'drive_upload_failed';
            }
        }

        self::log($fileName, $filePath, $size, $status, $message, $uploaded);
        self::pruneOld();

        if (class_exists('LogService')) {
            LogService::write(null, 'backup', 'system', null, $status);
        }

        return [
            'file_name' => $fileName,
            'file_path' => $filePath,
            'file_size_bytes' => $size,
            'status' => $status,
            'message' => $message,
            'uploaded_to_drive' => $uploaded,
        ];
    }

    private static function log(string $name, string $path, int $size, string $status, string $message, bool $uploaded): void
    {
        $stmt = db()->prepare('INSERT INTO backup_logs (file_name, file_path, file_size_bytes, status, message, uploaded_to_drive) VALUES (?,?,?,?,?,?)');
        $stmt->bind_param('ssissi', $name, $path, $size, $status, $message, $uploaded);
        $stmt->execute();
        $stmt->close();
    }

    private static function pruneOld(): void
    {
        $keepDate = date('Y-m-d H:i:s', strtotime('-' . BACKUP_RETENTION_DAYS . ' days'));
        $stmt = db()->prepare('SELECT file_path FROM backup_logs WHERE created_at < ?');
        $stmt->bind_param('s', $keepDate);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($row = $res->fetch_assoc()) {
            if (file_exists($row['file_path'])) {
                @unlink($row['file_path']);
            }
        }
        $stmt->close();
        $stmt2 = db()->prepare('DELETE FROM backup_logs WHERE created_at < ?');
        $stmt2->bind_param('s', $keepDate);
        $stmt2->execute();
        $stmt2->close();
    }

    private static function exportData(): array
    {
        $tables = [];
        $res = db()->query('SHOW TABLES');
        while ($row = $res->fetch_array()) {
            $tables[] = $row[0];
        }
        $export = [];
        foreach ($tables as $table) {
            $rows = db()->query('SELECT * FROM ' . $table)->fetch_all(MYSQLI_ASSOC);
            $export[$table] = $rows;
        }
        return $export;
    }

    private static function writeExcel(string $filePath, array $data): void
    {
        $html = "<html><head><meta charset=\"UTF-8\"></head><body>";
        $html .= "<table border=\"1\"><tr><th colspan=\"2\">BBMS Backup Export</th></tr>";
        $html .= "<tr><td>Generated at</td><td>" . htmlspecialchars(date('c')) . "</td></tr></table><br/>";
        foreach ($data as $table => $rows) {
            $html .= "<table border=\"1\">";
            $html .= "<tr><th colspan=\"1\">" . htmlspecialchars($table) . "</th></tr>";
            if (count($rows) > 0) {
                $html .= "<tr>";
                foreach (array_keys($rows[0]) as $col) {
                    $html .= "<th>" . htmlspecialchars((string)$col) . "</th>";
                }
                $html .= "</tr>";
                foreach ($rows as $row) {
                    $html .= "<tr>";
                    foreach ($row as $val) {
                        $html .= "<td>" . htmlspecialchars((string)$val) . "</td>";
                    }
                    $html .= "</tr>";
                }
            } else {
                $html .= "<tr><td>No data</td></tr>";
            }
            $html .= "</table><br/>";
        }
        $html .= "</body></html>";
        file_put_contents($filePath, $html);
    }

    private static function writePdf(string $filePath, array $data): void
    {
        $lines = [];
        $lines[] = 'BBMS Backup Export';
        $lines[] = 'Generated at: ' . date('c');
        $lines[] = '';
        foreach ($data as $table => $rows) {
            $lines[] = 'Table: ' . $table;
            if (count($rows) === 0) {
                $lines[] = '  (no data)';
                $lines[] = '';
                continue;
            }
            $cols = array_keys($rows[0]);
            $lines[] = '  ' . implode(' | ', $cols);
            foreach ($rows as $row) {
                $vals = [];
                foreach ($cols as $c) {
                    $vals[] = (string)($row[$c] ?? '');
                }
                $lines[] = '  ' . implode(' | ', $vals);
            }
            $lines[] = '';
        }

        $content = "BT\n/F1 10 Tf\n1 0 0 1 40 800 Tm\n12 TL\n";
        foreach ($lines as $line) {
            $safe = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $line);
            $content .= '(' . $safe . ") Tj\n0 -12 Td\n";
        }
        $content .= "ET\n";

        $objects = [];
        $objects[] = "<< /Type /Catalog /Pages 2 0 R >>";
        $objects[] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
        $objects[] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>";
        $objects[] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
        $objects[] = "<< /Length " . strlen($content) . " >>\nstream\n" . $content . "endstream";

        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $i => $obj) {
            $offsets[] = strlen($pdf);
            $pdf .= ($i + 1) . " 0 obj\n" . $obj . "\nendobj\n";
        }
        $xrefPos = strlen($pdf);
        $pdf .= "xref\n0 " . (count($objects) + 1) . "\n";
        $pdf .= "0000000000 65535 f \n";
        for ($i = 1; $i <= count($objects); $i++) {
            $pdf .= str_pad((string)$offsets[$i], 10, '0', STR_PAD_LEFT) . " 00000 n \n";
        }
        $pdf .= "trailer\n<< /Size " . (count($objects) + 1) . " /Root 1 0 R >>\nstartxref\n" . $xrefPos . "\n%%EOF";
        file_put_contents($filePath, $pdf);
    }

    // Google Drive upload using service account (requires BACKUP_DRIVE_ENABLED + service account JSON).
    private static function uploadToDrive(string $filePath, string $fileName): bool
    {
        if (!BACKUP_DRIVE_ENABLED || !file_exists(BACKUP_SERVICE_ACCOUNT_JSON)) {
            return false;
        }
        $creds = json_decode(file_get_contents(BACKUP_SERVICE_ACCOUNT_JSON), true);
        if (!$creds || empty($creds['client_email']) || empty($creds['private_key'])) {
            return false;
        }
        $now = time();
        $header = rtrim(strtr(base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])), '+/', '-_'), '=');
        $claim = [
            'iss' => $creds['client_email'],
            'scope' => 'https://www.googleapis.com/auth/drive.file',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ];
        $payload = rtrim(strtr(base64_encode(json_encode($claim)), '+/', '-_'), '=');
        $toSign = $header . '.' . $payload;
        $signature = '';
        $key = openssl_pkey_get_private($creds['private_key']);
        if (!$key) {
            return false;
        }
        openssl_sign($toSign, $signature, $key, OPENSSL_ALGO_SHA256);
        openssl_free_key($key);
        $jwt = $toSign . '.' . rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');

        $token = self::curlPost('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]);
        $tokenData = json_decode($token, true);
        if (empty($tokenData['access_token'])) {
            return false;
        }
        $accessToken = $tokenData['access_token'];

        $meta = ['name' => $fileName];
        if (BACKUP_DRIVE_FOLDER_ID && BACKUP_DRIVE_FOLDER_ID !== 'REPLACE_FOLDER_ID') {
            $meta['parents'] = [BACKUP_DRIVE_FOLDER_ID];
        }

        $boundary = '-------' . md5((string)microtime(true));
        $body = "--{$boundary}\r\n";
        $body .= "Content-Type: application/json; charset=UTF-8\r\n\r\n";
        $body .= json_encode($meta) . "\r\n";
        $body .= "--{$boundary}\r\n";
        $body .= "Content-Type: application/octet-stream\r\n\r\n";
        $body .= file_get_contents($filePath) . "\r\n";
        $body .= "--{$boundary}--";

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: multipart/related; boundary=' . $boundary,
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $resp = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($http < 200 || $http >= 300) {
            return false;
        }
        $uploaded = json_decode($resp, true);
        return !empty($uploaded['id']);
    }

    private static function curlPost(string $url, array $fields): string
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($fields));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $resp = curl_exec($ch);
        curl_close($ch);
        return $resp ?: '';
    }
}
