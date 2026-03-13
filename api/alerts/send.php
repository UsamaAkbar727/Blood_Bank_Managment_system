<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/SmsService.php';
require_once __DIR__ . '/../../backend/lib/Auth.php';

$user = Auth::currentUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'unauthorized']);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true) ?? [];
$to = $payload['to'] ?? '';
$message = $payload['message'] ?? '';
if (!$to || !$message) {
    http_response_code(400);
    echo json_encode(['error' => 'missing_fields']);
    exit;
}

try {
    $res = SmsService::send($to, $message);
    echo json_encode(['data' => $res]);
} catch (RuntimeException $e) {
    http_response_code(502);
    echo json_encode(['error' => $e->getMessage()]);
}
