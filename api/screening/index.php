<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/ScreeningService.php';
require_once __DIR__ . '/../../backend/lib/Auth.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $row = ScreeningService::get((int)$_GET['id']);
                echo json_encode(['data' => $row]);
            } elseif (isset($_GET['collection_id'])) {
                $row = ScreeningService::getByCollection((int)$_GET['collection_id']);
                echo json_encode(['data' => $row]);
            } elseif (isset($_GET['collections'])) {
                $search = $_GET['q'] ?? '';
                echo json_encode(['data' => ScreeningService::listCollections($search)]);
            } else {
                $search = $_GET['q'] ?? '';
                echo json_encode(['data' => ScreeningService::list($search)]);
            }
            break;
        case 'PUT':
        case 'PATCH':
            parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
            $id = isset($params['id']) ? (int)$params['id'] : null;
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $user = Auth::currentUser();
            if ($user) {
                $payload['tested_by'] = $user['id'];
            }
            $row = ScreeningService::save($payload, $id);
            echo json_encode(['data' => $row]);
            break;
        case 'POST':
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $user = Auth::currentUser();
            if ($user) {
                $payload['tested_by'] = $user['id'];
            }
            $row = ScreeningService::save($payload, null);
            echo json_encode(['data' => $row]);
            break;
        case 'DELETE':
            parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
            $id = isset($params['id']) ? (int)$params['id'] : 0;
            $ok = ScreeningService::delete($id);
            echo json_encode(['deleted' => $ok]);
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'method_not_allowed']);
    }
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (RuntimeException $e) {
    $message = $e->getMessage();
    if ($message === 'screening_already_exists') {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Screening record already exists']);
        exit;
    }
    if (stripos($message, 'duplicate entry') !== false || stripos($message, 'uq_screening_collection') !== false) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Screening record already exists']);
        exit;
    }
    http_response_code(409);
    echo json_encode(['success' => false, 'error' => $message]);
} catch (Throwable $e) {
    $code = (int) $e->getCode();
    $message = $e->getMessage();
    if ($code === 1062 || stripos($message, 'duplicate entry') !== false || stripos($message, 'uq_screening_collection') !== false) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Screening record already exists']);
        exit;
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'internal_server_error', 'message' => $message]);
}
