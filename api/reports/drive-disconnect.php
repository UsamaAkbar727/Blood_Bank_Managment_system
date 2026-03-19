<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/Auth.php';
require_once __DIR__ . '/../../backend/lib/GoogleDriveService.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
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

    GoogleDriveService::disconnect();
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Google Drive disconnected']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
