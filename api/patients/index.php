<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/PatientService.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                echo json_encode(['data' => PatientService::get((int)$_GET['id'])]);
            } else {
                $q = $_GET['q'] ?? '';
                echo json_encode(['data' => PatientService::list($q)]);
            }
            break;
        case 'POST':
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $row = PatientService::create($payload);
            echo json_encode(['data' => $row]);
            break;
        case 'PUT':
        case 'PATCH':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $row = PatientService::update($id, $payload);
            echo json_encode(['data' => $row]);
            break;
        case 'DELETE':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            $ok = PatientService::delete($id);
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
