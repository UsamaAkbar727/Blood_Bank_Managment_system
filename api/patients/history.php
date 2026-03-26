<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/PatientsController.php';

$patientId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($patientId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'missing_id']);
    exit;
}

try {
    echo json_encode(PatientsController::history($patientId));
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
} catch (RuntimeException $e) {
    http_response_code(409);
    echo json_encode(['error' => $e->getMessage()]);
}
