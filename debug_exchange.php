<?php
require_once __DIR__ . '/backend/lib/GoogleDriveService.php';
require_once __DIR__ . '/vendor/autoload.php';

$code = "4/0Aci98E8Yo6N7PKc1WTRZnNWWaVYoC660VFLmxM07oYTlIKysCpgdBiQMSWeeIkjGATPFkg.";
$redirectUri = "http://localhost:5173";

echo "Attempting exchange for $code\n";

try {
    $client = new \Google_Client();
    $client->setClientId(getenv('GOOGLE_CLIENT_ID'));
    $client->setClientSecret(getenv('GOOGLE_CLIENT_SECRET'));
    $client->setRedirectUri($redirectUri);
    
    $token = $client->fetchAccessTokenWithAuthCode($code);
    if (isset($token['error'])) {
        echo "Error: " . $token['error'] . " - " . ($token['error_description'] ?? '') . "\n";
    } else {
        echo "Success! Token: " . json_encode($token) . "\n";
        file_put_contents('token.json', json_encode($token));
    }
} catch (Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
}
?>
