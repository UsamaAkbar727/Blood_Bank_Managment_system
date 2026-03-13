<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/InventoryService.php';
require_once __DIR__ . '/../../backend/lib/LogService.php';
require_once __DIR__ . '/../../backend/lib/Auth.php';

$user = Auth::currentUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'unauthorized']);
    exit;
}

$code = trim($_GET['code'] ?? $_GET['q'] ?? '');
if ($code === '') {
    http_response_code(400);
    echo json_encode(['error' => 'missing_code']);
    exit;
}

$rows = InventoryService::list($code, '');
if (!$rows) {
    http_response_code(404);
    echo json_encode(['error' => 'not_found']);
    exit;
}

$item = $rows[0];
LogService::write((int)$user['id'], 'scan', 'barcode', (int)$item['id']);

echo json_encode(['data' => $item]);
