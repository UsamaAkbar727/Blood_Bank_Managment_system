<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/IssuanceService.php';

try {
    echo json_encode(['data' => IssuanceService::list('', null)]);
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
} catch (RuntimeException $e) {
    http_response_code(409);
    echo json_encode(['error' => $e->getMessage()]);
}
