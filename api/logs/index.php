<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/LogService.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

$q = $_GET['q'] ?? '';
echo json_encode(['data' => LogService::list($q)]);
