<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/CollectionService.php';
require_once __DIR__ . '/../../backend/lib/Auth.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['action']) && $_GET['action'] === 'generate-code') {
                echo json_encode(['data' => ['code' => CollectionService::generateUniqueCode()]]);
            } elseif (isset($_GET['id'])) {
                $row = CollectionService::get((int)$_GET['id']);
                echo json_encode(['data' => $row]);
            } else {
                $search = $_GET['q'] ?? '';
                $donorId = isset($_GET['donor_id']) ? (int)$_GET['donor_id'] : null;
                $status = isset($_GET['status']) ? trim($_GET['status']) : null;
                echo json_encode(['data' => CollectionService::list($search, $donorId, $status)]);
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
            if ($user) {
                $payload['collected_by'] = $user['id'];
            }
            try {
                $row = CollectionService::create($payload);
                http_response_code(201);
                echo json_encode(['data' => $row]);
            } catch (RuntimeException $e) {
                if (strpos($e->getMessage(), 'duplicate') !== false) {
                    http_response_code(409);
                    echo json_encode(['error' => 'duplicate_collection_code', 'message' => 'This collection code already exists. Please use a unique code.']);
                } else {
                    throw $e;
                }
            }
            break;
        case 'PUT':
        case 'PATCH':
            parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
            $id = isset($params['id']) ? (int)$params['id'] : 0;
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $user = Auth::currentUser();
            if (!$user) {
                http_response_code(401);
                echo json_encode(['error' => 'unauthorized']);
                exit;
            }
            try {
                $row = CollectionService::update($id, $payload);
                echo json_encode(['data' => $row]);
            } catch (RuntimeException $e) {
                if (strpos($e->getMessage(), 'duplicate') !== false) {
                    http_response_code(409);
                    echo json_encode(['error' => 'duplicate_collection_code', 'message' => 'This collection code already exists. Please use a unique code.']);
                } else {
                    throw $e;
                }
            }
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

