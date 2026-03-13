<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/BackupService.php';
require_once __DIR__ . '/../../backend/lib/Auth.php';

$user = Auth::currentUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
try {
    if ($method === 'GET') {
        echo json_encode(['data' => BackupService::list(BACKUP_RETENTION_DAYS)]);
    } elseif ($method === 'POST') {
        $format = $_GET['format'] ?? 'excel';
        echo json_encode(['data' => BackupService::run(true, $format)]);
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'method_not_allowed']);
    }
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'backup_error']);
}
