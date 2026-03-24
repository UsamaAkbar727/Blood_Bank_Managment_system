<?php
require_once __DIR__ . '/../db.php';

class GoogleDriveService
{
    private static $client = null;
    private static $service = null;

    private static function getTokenPath(): string
    {
        $tokenPath = getenv('GOOGLE_DRIVE_TOKEN_PATH');
        if ($tokenPath && trim($tokenPath) !== '') {
            return $tokenPath;
        }

        return __DIR__ . '/../../api/reports/.google_drive_token.json';
    }

    private static function getDbToken(): ?array
    {
        try {
            $stmt = db()->prepare('SELECT refresh_token, access_token, expires_at FROM google_drive_tokens WHERE id=1 LIMIT 1');
            if (!$stmt) {
                return null;
            }
            $stmt->execute();
            $row = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            if (!$row) {
                return null;
            }
            $token = null;
            if (!empty($row['access_token'])) {
                $decoded = json_decode($row['access_token'], true);
                if (is_array($decoded)) {
                    $token = $decoded;
                }
            }
            if (!is_array($token)) {
                $token = [];
            }
            if (!empty($row['refresh_token'])) {
                $token['refresh_token'] = $row['refresh_token'];
            }
            return $token;
        } catch (Throwable $e) {
            return null;
        }
    }

    private static function saveDbToken(array $token): void
    {
        $refreshToken = $token['refresh_token'] ?? null;
        $existing = self::getDbToken();
        if (!$refreshToken && $existing && !empty($existing['refresh_token'])) {
            $refreshToken = $existing['refresh_token'];
            $token['refresh_token'] = $refreshToken;
        }

        $expiresAt = null;
        if (!empty($token['expires_in'])) {
            $created = !empty($token['created']) ? (int)$token['created'] : time();
            $expiresAt = date('Y-m-d H:i:s', $created + (int)$token['expires_in']);
        }

        $stmt = db()->prepare('INSERT INTO google_drive_tokens (id, refresh_token, access_token, expires_at) VALUES (1, ?, ?, ?) ON DUPLICATE KEY UPDATE refresh_token=VALUES(refresh_token), access_token=VALUES(access_token), expires_at=VALUES(expires_at)');
        if (!$stmt) {
            return;
        }
        $refreshValue = $refreshToken;
        $accessValue = json_encode($token);
        $stmt->bind_param('sss', $refreshValue, $accessValue, $expiresAt);
        $stmt->execute();
        $stmt->close();

        // Also save to file if path is configured
        $tokenPath = self::getTokenPath();
        if ($tokenPath) {
            file_put_contents($tokenPath, json_encode($token, JSON_PRETTY_PRINT));
        }
    }

    private static function getStoredToken(): ?array
    {
        $dbToken = self::getDbToken();
        if (is_array($dbToken) && !empty($dbToken)) {
            return $dbToken;
        }

        $tokenPath = self::getTokenPath();
        if (is_file($tokenPath)) {
            $accessToken = json_decode(file_get_contents($tokenPath), true);
            if (is_array($accessToken)) {
                self::saveDbToken($accessToken);
                return $accessToken;
            }
        }

        return null;
    }

    private static function getClient(?string $redirectUri = null, bool $requireAuth = true)
    {
        if (self::$client !== null) {
            return self::$client;
        }

        $autoload = __DIR__ . '/../../vendor/autoload.php';
        if (!is_file($autoload)) {
            throw new RuntimeException('Required file not found: ' . $autoload . '. Run composer install.');
        }
        require_once $autoload;

        if (!class_exists('\Google_Client')) {
            throw new RuntimeException('Google_Client class not found. Ensure google/apiclient installed via composer.');
        }

        $client = new \Google_Client();
        $client->setApplicationName('Blood Bank Management System');
        $client->addScope(\Google_Service_Drive::DRIVE_FILE);
        $client->setAccessType('offline');
        $client->setPrompt('select_account consent');

        $clientId = getenv('GOOGLE_CLIENT_ID');
        $clientSecret = getenv('GOOGLE_CLIENT_SECRET');

        if ($clientId && $clientSecret) {
            $client->setClientId($clientId);
            $client->setClientSecret($clientSecret);
        }

        $redirectFromEnv = getenv('GOOGLE_DRIVE_REDIRECT_URI');
        $redirectToUse = $redirectFromEnv ?: $redirectUri;
        if ($redirectToUse) {
            $client->setRedirectUri($redirectToUse);
        }

        $credentialsPath = getenv('GOOGLE_DRIVE_CREDENTIALS_PATH');
        if ($credentialsPath && is_file($credentialsPath)) {
            $client->setAuthConfig($credentialsPath);
        }

        $storedToken = self::getStoredToken();
        if (is_array($storedToken) && !empty($storedToken)) {
            $client->setAccessToken($storedToken);
        }

        if ($requireAuth && $client->isAccessTokenExpired()) {
            if ($client->getRefreshToken()) {
                $refreshToken = $client->getRefreshToken();
                $newToken = $client->fetchAccessTokenWithRefreshToken($refreshToken);
                if (isset($newToken['error'])) {
                    throw new RuntimeException('Failed to refresh Google Drive access token: ' . ($newToken['error_description'] ?? $newToken['error']));
                }
                if ($refreshToken) {
                    $newToken['refresh_token'] = $refreshToken;
                }
                $client->setAccessToken($newToken);
            } else {
                throw new RuntimeException('Google Drive authentication required. Please complete OAuth setup.');
            }

            $accessToken = $client->getAccessToken();
            if (!empty($accessToken)) {
                self::saveDbToken($accessToken);
            }
        }

        self::$client = $client;
        return self::$client;
    }

    private static function getService()
    {
        if (self::$service !== null) {
            return self::$service;
        }

        $autoload = __DIR__ . '/../../vendor/autoload.php';
        if (!is_file($autoload)) {
            throw new RuntimeException('Required file not found: ' . $autoload . '. Run composer install.');
        }
        require_once $autoload;

        if (!class_exists('\Google_Service_Drive')) {
            throw new RuntimeException('Google_Service_Drive class not found. Ensure google/apiclient installed via composer.');
        }

        self::$service = new \Google_Service_Drive(self::getClient());
        return self::$service;
    }

    /**
     * Upload a file to Google Drive
     * 
     * @param string $filename The name of the file to create in Drive
     * @param string $content The file content
     * @param string $mimeType The MIME type of the file
     * @param string|null $folderId Optional folder ID to upload to
     * @return array The file metadata including webViewLink (the shareable URL)
     */
    public static function uploadFile(string $filename, string $content, string $mimeType, ?string $folderId = null): array
    {
        $service = self::getService();

        $parentFolderId = $folderId ?: getenv('GOOGLE_DRIVE_FOLDER_ID');
        if (!$parentFolderId) {
            throw new RuntimeException('GOOGLE_DRIVE_FOLDER_ID not configured in .env');
        }

        $file = new \Google_Service_Drive_DriveFile();
        $file->setName($filename);
        $file->setMimeType($mimeType);
        $file->setParents([$parentFolderId]);

        try {
            $uploadedFile = $service->files->create($file, [
                'data' => $content,
                'uploadType' => 'media',
                'fields' => 'id, name, webViewLink, createdTime, owners'
            ]);
        } catch (\Google_Service_Exception $e) {
            $apiError = json_decode($e->getMessage(), true);
            $message = $apiError['error']['message'] ?? $e->getMessage();
            error_log('[GoogleDriveService] Drive upload failed: ' . $message);
            throw new RuntimeException('Google Drive API error: ' . $message);
        } catch (\Exception $e) {
            error_log('[GoogleDriveService] Drive upload failed: ' . $e->getMessage());
            throw new RuntimeException('Google Drive upload failed: ' . $e->getMessage());
        }

        return [
            'id' => $uploadedFile->getId(),
            'name' => $uploadedFile->getName(),
            'url' => $uploadedFile->getWebViewLink(),
            'createdTime' => $uploadedFile->getCreatedTime(),
            'owners' => $uploadedFile->getOwners(),
        ];
    }

    /**
     * Upload a report from disk (path) to Google Drive and return the file info.
     *
     * @param string $filePath Absolute or relative local file path.
     * @param string $fileName File name to use in Google Drive.
     * @return array
     * @throws RuntimeException
     */
    public static function uploadReport(string $filePath, string $fileName): array
    {
        if (!is_file($filePath) || !is_readable($filePath)) {
            throw new RuntimeException('Report file not found or not readable: ' . $filePath);
        }

        $content = file_get_contents($filePath);
        if ($content === false) {
            throw new RuntimeException('Failed to read report file: ' . $filePath);
        }

        $mimeType = 'application/octet-stream';
        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        if ($extension === 'sql') {
            $mimeType = 'application/sql';
        }
        if ($extension !== 'sql' && function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo) {
                $detected = finfo_file($finfo, $filePath);
                if ($detected !== false) {
                    $mimeType = $detected;
                }
                finfo_close($finfo);
            }
        }

        return self::uploadFile($fileName, $content, $mimeType);
    }

    /**
     * Create an OAuth authorization URL for initial setup
     * 
     * @return string The authorization URL
     */
    public static function getAuthUrl(): string
    {
        $client = self::getClient(null, false);
        $scopes = [
            \Google_Service_Drive::DRIVE_FILE
        ];
        $client->setScopes($scopes);
        return $client->createAuthUrl();
    }

    public static function getAuthUrlForRedirect(string $redirectUri): string
    {
        $client = self::getClient($redirectUri, false);
        $scopes = [
            \Google_Service_Drive::DRIVE_FILE
        ];
        $client->setScopes($scopes);
        return $client->createAuthUrl();
    }

    /**
     * Handle OAuth callback and save access token
     * 
     * @param string $code The authorization code from Google
     * @return bool True if successful
     */
    public static function handleAuthCallback(string $code, ?string $redirectUri = null): bool
    {
        $client = self::getClient($redirectUri, false);
        $accessToken = $client->fetchAccessTokenWithAuthCode($code);
        
        if (isset($accessToken['error'])) {
            throw new RuntimeException('Failed to authenticate with Google Drive: ' . $accessToken['error']);
        }

        self::saveDbToken($accessToken);
        
        return true;
    }

    public static function disconnect(): void
    {
        $stmt = db()->prepare('DELETE FROM google_drive_tokens WHERE id=1');
        if ($stmt) {
            $stmt->execute();
            $stmt->close();
        }
    }

    /**
     * Test if Google Drive is configured and authenticated
     * 
     * @return array Status information
     */
    public static function getStatus(): array
    {
        $credentialsPath = getenv('GOOGLE_DRIVE_CREDENTIALS_PATH');
        $dbToken = self::getDbToken();
        $folderId = getenv('GOOGLE_DRIVE_FOLDER_ID');

        $tokenValid = false;
        $tokenError = null;
        $hasToken = is_array($dbToken) && (!empty($dbToken['refresh_token']) || !empty($dbToken['access_token']));

        try {
            self::getClient();
            $tokenValid = true;
        } catch (\Exception $e) {
            $tokenError = $e->getMessage();
        }

        return [
            'credentials_configured' => $credentialsPath && is_file($credentialsPath),
            'authenticated' => $hasToken,
            'token_valid' => $tokenValid,
            'token_error' => $tokenError,
            'folder_id_configured' => (bool)$folderId,
            'folder_id' => $folderId ?: null,
            'token_path' => null,
        ];
    }
}
