<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/DonorService.php';
require_once __DIR__ . '/../../backend/lib/Auth.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $donor = DonorService::get((int)$_GET['id']);
                echo json_encode(['data' => $donor]);
            } else {
                $search = $_GET['q'] ?? '';
                echo json_encode(['data' => DonorService::list($search)]);
            }
            break;
        case 'POST':
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $user = Auth::currentUser();
            if (!$user) {
                http_response_code(401);
                echo json_encode(['error' => 'unauthorized']);
                exit;
            }
            $donor = DonorService::create($payload, $user['id']);
            echo json_encode(['data' => $donor]);
            break;
        case 'PUT':
        case 'PATCH':
            parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
            $id = isset($params['id']) ? (int)$params['id'] : 0;
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $donor = DonorService::update($id, $payload);
            echo json_encode(['data' => $donor]);
            break;
        case 'DELETE':
            parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
            $id = isset($params['id']) ? (int)$params['id'] : 0;
            $ok = DonorService::delete($id);
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
