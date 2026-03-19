<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/Auth.php';
require_once __DIR__ . '/../../backend/lib/GoogleDriveService.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

try {
    $user = Auth::currentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'unauthorized']);
        exit;
    }

    $status = GoogleDriveService::getStatus();
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $redirectPath = '/api/reports/drive-auth.php';
    $redirectUri = $scheme . '://' . $host . $redirectPath;
    $authUrl = GoogleDriveService::getAuthUrlForRedirect($redirectUri);
    
    $checks = [
        'credentials_file' => [
            'pass' => $status['credentials_configured'],
            'message' => $status['credentials_configured'] 
                ? 'Credentials file found' 
                : 'Credentials file not found or not readable'
        ],
        'authentication' => [
            'pass' => $status['authenticated'] && $status['token_valid'],
            'message' => $status['authenticated'] && $status['token_valid']
                ? 'Successfully authenticated with Google Drive and token is valid'
                : 'Not authenticated or token expired: ' . ($status['token_error'] ?? 'Token file missing or invalid')
        ],
        'folder_configured' => [
            'pass' => $status['folder_id_configured'],
            'message' => $status['folder_id_configured']
                ? "Folder ID configured: {$status['folder_id']}"
                : 'Folder ID not configured'
        ],
    ];

    $allPass = $status['credentials_configured'] && $status['authenticated'] && $status['folder_id_configured'];

    http_response_code(200);
    echo json_encode([
        'ready' => $allPass,
        'checks' => $checks,
        'status' => $status,
        'auth_url' => $authUrl,
        'message' => $allPass 
            ? 'Google Drive integration is ready for use'
            : 'Google Drive integration requires setup. See documentation.',
        'setup_guide' => 'See GOOGLE_DRIVE_SETUP_GUIDE.md for configuration instructions'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'ready' => false,
        'error' => $e->getMessage(),
        'message' => 'Error checking Google Drive status'
    ]);
}
