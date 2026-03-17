<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/LogService.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $q = $_GET['q'] ?? '';
    echo json_encode(['data' => LogService::list($q)]);
    exit;
}

if ($method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = isset($input['id']) ? intval($input['id']) : 0;

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid_id']);
        exit;
    }

    try {
        LogService::delete($id);
        echo json_encode(['message' => 'Log entry deleted']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'delete_failed', 'message' => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method_not_allowed']);
exit;
