<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/BackupSettingsService.php';
require_once __DIR__ . '/../../backend/lib/Auth.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            Auth::requireAuth();
            echo json_encode(['data' => BackupSettingsService::get()]);
            break;
        case 'PUT':
        case 'PATCH':
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $user = Auth::currentUser();
            echo json_encode(['data' => BackupSettingsService::update($payload, $user['id'] ?? null)]);
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'method_not_allowed']);
    }
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
} catch (RuntimeException $e) {
    http_response_code(409);
    echo json_encode(['error' => $e->getMessage()]);
}
