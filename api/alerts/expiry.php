<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/AlertService.php';
require_once __DIR__ . '/../../backend/lib/Auth.php';

$user = Auth::currentUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'unauthorized']);
    exit;
}

$days = isset($_GET['days']) ? (int)$_GET['days'] : 3;

try {
    $res = AlertService::sendExpiryAlerts($days);
    echo json_encode(['data' => $res]);
} catch (RuntimeException $e) {
    http_response_code(502);
    echo json_encode(['error' => $e->getMessage()]);
}
