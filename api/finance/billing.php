<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/FinancialService.php';
require_once __DIR__ . '/../../backend/lib/Auth.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $status = $_GET['status'] ?? '';
            $q = $_GET['q'] ?? '';
            echo json_encode(['data' => FinancialService::listBills($status, $q)]);
            break;
        case 'POST':
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $user = Auth::currentUser();
            if (!$user) { http_response_code(401); echo json_encode(['error'=>'unauthorized']); exit; }
            echo json_encode(['data' => FinancialService::createBill($payload)]);
            break;
        case 'PATCH':
        case 'PUT':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            echo json_encode(['data' => FinancialService::markPaid($id)]);
            break;
        case 'DELETE':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            echo json_encode(['deleted' => FinancialService::deleteBill($id)]);
            break;
        default:
            http_response_code(405); echo json_encode(['error'=>'method_not_allowed']);
    }
} catch (InvalidArgumentException $e) {
    http_response_code(400); echo json_encode(['error'=>$e->getMessage()]);
} catch (RuntimeException $e) {
    http_response_code(409); echo json_encode(['error'=>$e->getMessage()]);
}
