<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/CollectionService.php';
require_once __DIR__ . '/../../backend/lib/Auth.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $row = CollectionService::get((int)$_GET['id']);
                echo json_encode(['data' => $row]);
            } else {
                $search = $_GET['q'] ?? '';
                $donorId = isset($_GET['donor_id']) ? (int)$_GET['donor_id'] : null;
                echo json_encode(['data' => CollectionService::list($search, $donorId)]);
            }
            break;
        case 'POST':
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $user = Auth::currentUser();
            if ($user) {
                $payload['collected_by'] = $user['id'];
            }
            $row = CollectionService::create($payload);
            echo json_encode(['data' => $row]);
            break;
        case 'PUT':
        case 'PATCH':
            parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
            $id = isset($params['id']) ? (int)$params['id'] : 0;
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $row = CollectionService::update($id, $payload);
            echo json_encode(['data' => $row]);
            break;
        case 'DELETE':
            parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
            $id = isset($params['id']) ? (int)$params['id'] : 0;
            $ok = CollectionService::delete($id);
            echo json_encode(['deleted' => $ok]);
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
