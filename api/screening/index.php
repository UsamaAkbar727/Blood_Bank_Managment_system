<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/ScreeningService.php';
require_once __DIR__ . '/../../backend/lib/Auth.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['collection_id'])) {
                $row = ScreeningService::getByCollection((int)$_GET['collection_id']);
                echo json_encode(['data' => $row]);
            } else {
                $search = $_GET['q'] ?? '';
                echo json_encode(['data' => ScreeningService::list($search)]);
            }
            break;
        case 'POST':
        case 'PUT':
        case 'PATCH':
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $user = Auth::currentUser();
            if ($user) {
                $payload['tested_by'] = $user['id'];
            }
            $row = ScreeningService::save($payload);
            echo json_encode(['data' => $row]);
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
