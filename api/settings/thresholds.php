<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/ThresholdService.php';
require_once __DIR__ . '/../../backend/lib/Auth.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            Auth::requireAuth();
            echo json_encode([
                'thresholds' => ThresholdService::getThresholds(),
                'alerts' => ThresholdService::getLowStockAlerts()
            ]);
            break;
        case 'PUT':
        case 'PATCH':
            Auth::requireAuth();
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $user = Auth::currentUser();
            $thresholds = ThresholdService::updateThresholds($payload, $user['id'] ?? null);
            echo json_encode([
                'thresholds' => $thresholds,
                'alerts' => ThresholdService::getLowStockAlerts()
            ]);
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
