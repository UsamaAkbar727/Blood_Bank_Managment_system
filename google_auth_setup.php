<?php
/**
 * Google OAuth CLI Setup for Blood Bank Management System
 * This script generates the auth URL and saves the access token as token.json.
 */

// Load Google API Client Library
$autoload = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoload)) {
    die("Error: vendor/autoload.php not found. Please run 'composer install' first.\n");
}
require_once $autoload;

// Load .env variables (if possible) or use the ones we have.
// In this project, config.php handles .env loading usually.
$configPath = __DIR__ . '/backend/config.php';
if (file_exists($configPath)) {
    require_once $configPath;
}

$clientId = getenv('GOOGLE_CLIENT_ID');
$clientSecret = getenv('GOOGLE_CLIENT_SECRET');
$credentialsPath = __DIR__ . '/credentials.json';

if (!$clientId || !$clientSecret) {
    die("Error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not found in .env\n");
}

if (!file_exists($credentialsPath)) {
    die("Error: credentials.json not found at $credentialsPath\n");
}

$client = new Google_Client();
$client->setApplicationName('Blood Bank Management System');
// We need DRIVE_FILE scope for backup exports
$client->setScopes([Google_Service_Drive::DRIVE_FILE]);
$client->setAuthConfig($credentialsPath);
$client->setAccessType('offline');
$client->setPrompt('select_account consent');
$redirectUri = getenv('GOOGLE_DRIVE_REDIRECT_URI') ?: 'http://localhost';
$client->setRedirectUri($redirectUri);


// 1. Generate Auth URL
$authUrl = $client->createAuthUrl();

echo "\n--- Google OAuth Setup ---\n\n";
echo "1. Visit the following URL in your browser to authorize this app:\n\n";
echo "$authUrl\n\n";
echo "2. After authorizing, you will be redirected to localhost (which might fail to load - that's fine).\n";
echo "3. Copy the 'code' parameter from the URL (e.g., http://localhost/?code=4/P7q...#)\n";
echo "\nEnter the Code: ";

// 2. Read Auth Code from Terminal
$handle = fopen("php://stdin", "r");
$authCode = trim(fgets($handle));

if (empty($authCode)) {
    die("Error: Authorization code cannot be empty.\n");
}

// 3. Exchange Auth Code for Access Token
try {
    $accessToken = $client->fetchAccessTokenWithAuthCode($authCode);
    
    if (isset($accessToken['error'])) {
        throw new Exception(join(', ', $accessToken));
    }

    // 4. Save Token as token.json
    $tokenFile = __DIR__ . '/token.json';
    file_put_contents($tokenFile, json_encode($accessToken, JSON_PRETTY_PRINT));
    
    echo "\nSuccess! Token saved to $tokenFile\n";
    echo "The 'Backup in Drive' feature is now ready to use.\n";

} catch (Exception $e) {
    echo "\nError fetching access token: " . $e->getMessage() . "\n";
}
