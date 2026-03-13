<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/InventoryService.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

$action = $_GET['action'] ?? 'list';

switch ($action) {
    case 'summary':
        echo json_encode(['data' => InventoryService::summary()]);
        break;
    case 'expiring':
        $days = isset($_GET['days']) ? (int)$_GET['days'] : 7;
        echo json_encode(['data' => InventoryService::expiringSoon($days)]);
        break;
    case 'low':
        echo json_encode(['data' => InventoryService::lowStock()]);
        break;
    case 'list':
    default:
        $search = $_GET['q'] ?? '';
        $status = $_GET['status'] ?? '';
        echo json_encode(['data' => InventoryService::list($search, $status)]);
        break;
}
