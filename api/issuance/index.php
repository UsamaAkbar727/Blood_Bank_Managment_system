<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/IssuanceService.php';
require_once __DIR__ . '/../../backend/lib/Auth.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                echo json_encode(['data' => IssuanceService::get((int)$_GET['id'])]);
            } else {
                $q = $_GET['q'] ?? '';
                $patientId = isset($_GET['patient_id']) ? (int)$_GET['patient_id'] : null;
                echo json_encode(['data' => IssuanceService::list($q, $patientId)]);
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
            // Validate required fields
            if (empty($payload['inventory_id']) || empty($payload['patient_id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'missing_fields', 'message' => 'Both inventory_id and patient_id are required']);
                exit;
            }
            $row = IssuanceService::issue($payload, $user['id']);
            http_response_code(201);
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
