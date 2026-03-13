<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/NotificationService.php';
require_once __DIR__ . '/../../backend/lib/Auth.php';

$user = Auth::currentUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $unread = isset($_GET['unread']) && $_GET['unread'] === '1';
            echo json_encode(['data' => NotificationService::listForUser($user['id'], $unread)]);
            break;
        case 'POST':
            // Admin/staff broadcast or targeted notification
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $targetId = isset($payload['user_id']) ? (int)$payload['user_id'] : null;
            $id = NotificationService::create($targetId, $payload['type'] ?? 'info', $payload['title'] ?? 'Notice', $payload['message'] ?? '');
            echo json_encode(['data' => ['id' => $id]]);
            break;
        case 'PATCH':
        case 'PUT':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            echo json_encode(['data' => ['read' => NotificationService::markRead($id, $user['id'])]]);
            break;
        case 'DELETE':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            echo json_encode(['deleted' => NotificationService::delete($id, $user['id'])]);
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'method_not_allowed']);
    }
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
