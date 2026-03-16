<?php

// Google Drive OAuth endpoint for Blood Bank Management System
// 1. Opens Google consent screen if no code is provided.
// 2. Exchanges authorization code for access token and saves to .google_drive_token.json.

require_once __DIR__ . '/../../backend/config.php';

$autoloadFile = __DIR__ . '/../../vendor/autoload.php';
if (!is_file($autoloadFile)) {
    http_response_code(500);
    echo "Required autoload file not found: $autoloadFile\n";
    echo "Run composer install in project root or disable antivirus lock on vendor files.\n";
    exit;
}
require_once $autoloadFile;

$clientId = envValue('GOOGLE_CLIENT_ID');
$clientSecret = envValue('GOOGLE_CLIENT_SECRET');
$driveFolderId = envValue('GOOGLE_DRIVE_FOLDER_ID');

if (!$clientId || !$clientSecret) {
    http_response_code(500);
    echo "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in backend/.env\n";
    exit;
}

$client = new \Google_Client();
$client->setClientId($clientId);
$client->setClientSecret($clientSecret);
$client->setRedirectUri('http://localhost:8080/api/reports/drive-auth.php');
$client->addScope(\Google_Service_Drive::DRIVE_FILE);
$client->setAccessType('offline');
$client->setPrompt('select_account consent');
$client->setApplicationName('Blood Bank Management System');

$tokenPath = __DIR__ . '/.google_drive_token.json';

if (!empty($_GET['code'])) {
    $code = $_GET['code'];

    $token = $client->fetchAccessTokenWithAuthCode($code);
    if (isset($token['error'])) {
        http_response_code(500);
        echo "Google OAuth failed: " . htmlspecialchars($token['error_description'] ?? $token['error']) . "\n";
        exit;
    }

    if (!is_dir(dirname($tokenPath)) && !mkdir(dirname($tokenPath), 0755, true) && !is_dir(dirname($tokenPath))) {
        http_response_code(500);
        echo "Unable to create token directory: " . dirname($tokenPath) . "\n";
        exit;
    }

    $saved = file_put_contents($tokenPath, json_encode($token));
    if ($saved === false) {
        http_response_code(500);
        echo "Failed to save token to $tokenPath\n";
        exit;
    }

    echo "Google Drive token saved to: $tokenPath\n";
    echo "Drive folder ID: " . ($driveFolderId ?: 'not configured') . "\n";
    echo "Token expires at: " . date('c', $token['created'] + ($token['expires_in'] ?? 0)) . "\n";
    echo "\nYou can now run Drive export endpoints.\n";
    exit;
}

// Not authenticated: redirect to Google OAuth consent screen
$authUrl = $client->createAuthUrl();
header('Location: ' . $authUrl);
exit;
