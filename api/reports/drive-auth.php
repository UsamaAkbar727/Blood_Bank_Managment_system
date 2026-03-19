<?php

// Google Drive OAuth endpoint for Blood Bank Management System
// 1. Opens Google consent screen if no code is provided.
// 2. Exchanges authorization code for access token and saves to .google_drive_token.json.

require_once __DIR__ . '/../../backend/config.php';
require_once __DIR__ . '/../../backend/lib/GoogleDriveService.php';

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

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$path = strtok($_SERVER['REQUEST_URI'] ?? '/api/reports/drive-auth.php', '?');
$redirectUri = $scheme . '://' . $host . $path;

if (!empty($_GET['code'])) {
    $code = $_GET['code'];
    try {
        GoogleDriveService::handleAuthCallback($code, $redirectUri);
    } catch (Throwable $e) {
        http_response_code(500);
        echo "Google OAuth failed: " . htmlspecialchars($e->getMessage()) . "\n";
        exit;
    }

    echo "Google Drive connected successfully.\n";
    echo "Drive folder ID: " . ($driveFolderId ?: 'not configured') . "\n";
    echo "\nYou can now close this tab and return to Settings.\n";
    exit;
}

// Not authenticated: redirect to Google OAuth consent screen
$authUrl = GoogleDriveService::getAuthUrlForRedirect($redirectUri);
header('Location: ' . $authUrl);
exit;
