<?php

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

    private static function getClient()
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

        $credentialsPath = getenv('GOOGLE_DRIVE_CREDENTIALS_PATH');
        if ($credentialsPath && is_file($credentialsPath)) {
            $client->setAuthConfig($credentialsPath);
        }

        $tokenPath = self::getTokenPath();
        if (is_file($tokenPath)) {
            $accessToken = json_decode(file_get_contents($tokenPath), true);
            if (is_array($accessToken)) {
                $client->setAccessToken($accessToken);
            }
        }

        if ($client->isAccessTokenExpired()) {
            if ($client->getRefreshToken()) {
                $newToken = $client->fetchAccessTokenWithRefreshToken($client->getRefreshToken());
                if (isset($newToken['error'])) {
                    throw new RuntimeException('Failed to refresh Google Drive access token: ' . ($newToken['error_description'] ?? $newToken['error']));
                }
                $client->setAccessToken($newToken);
            } else {
                throw new RuntimeException('Google Drive authentication required. Please complete OAuth setup.');
            }

            $accessToken = $client->getAccessToken();
            if (!empty($accessToken)) {
                file_put_contents($tokenPath, json_encode($accessToken));
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
        if (function_exists('finfo_open')) {
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
        $client = self::getClient();
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
    public static function handleAuthCallback(string $code): bool
    {
        $client = self::getClient();
        $accessToken = $client->fetchAccessTokenWithAuthCode($code);
        
        if (isset($accessToken['error'])) {
            throw new RuntimeException('Failed to authenticate with Google Drive: ' . $accessToken['error']);
        }

        $tokenPath = self::getTokenPath();
        file_put_contents($tokenPath, json_encode($accessToken));
        
        return true;
    }

    /**
     * Test if Google Drive is configured and authenticated
     * 
     * @return array Status information
     */
    public static function getStatus(): array
    {
        $credentialsPath = getenv('GOOGLE_DRIVE_CREDENTIALS_PATH');
        $tokenPath = self::getTokenPath();
        $folderId = getenv('GOOGLE_DRIVE_FOLDER_ID');

        $tokenValid = false;
        $tokenError = null;

        try {
            self::getClient();
            $tokenValid = true;
        } catch (\Exception $e) {
            $tokenError = $e->getMessage();
        }

        return [
            'credentials_configured' => $credentialsPath && is_file($credentialsPath),
            'authenticated' => is_file($tokenPath),
            'token_valid' => $tokenValid,
            'token_error' => $tokenError,
            'folder_id_configured' => (bool)$folderId,
            'folder_id' => $folderId ?: null,
            'token_path' => $tokenPath,
        ];
    }
}
