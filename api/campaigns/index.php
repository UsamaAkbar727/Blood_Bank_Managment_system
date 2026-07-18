<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/CampaignService.php';
require_once __DIR__ . '/../../backend/lib/Auth.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            Auth::requireAuth();
            $logsOnly = isset($_GET['logs']) && $_GET['logs'] == '1';
            $campaignId = isset($_GET['campaign_id']) ? (int)$_GET['campaign_id'] : null;

            if ($logsOnly) {
                echo json_encode(['data' => CampaignService::listLogs($campaignId)]);
            } else {
                echo json_encode(['data' => CampaignService::listCampaigns()]);
            }
            break;
            
        case 'POST':
            Auth::requireAuth();
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $user = Auth::currentUser();
            $result = CampaignService::sendCampaign($payload, $user['id'] ?? null);
            echo json_encode(['data' => $result]);
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
