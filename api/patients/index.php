<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/PatientsController.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            echo json_encode(PatientsController::index($_GET));
            break;
        case 'POST':
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            echo json_encode(PatientsController::store($payload));
            break;
        case 'PUT':
        case 'PATCH':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            echo json_encode(PatientsController::update($id, $payload));
            break;
        case 'DELETE':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            echo json_encode(PatientsController::destroy($id));
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
