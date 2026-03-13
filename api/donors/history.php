<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/DonorService.php';

$donorId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($donorId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'missing_id']);
    exit;
}

echo json_encode(['data' => DonorService::history($donorId)]);
