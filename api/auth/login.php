<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/db.php';
require_once __DIR__ . '/../../backend/lib/Auth.php';

// Expect JSON: { "username": "...", "password": "..." }
$payload = json_decode(file_get_contents('php://input'), true);
$email = $payload['username'] ?? '';
$password = $payload['password'] ?? '';

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'missing_credentials']);
    exit;
}

$result = Auth::login($email, $password);
if (!$result['success']) {
    http_response_code(401);
    echo json_encode(['error' => $result['error']]);
    exit;
}

// Optionally log last login time
$stmt = db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?');
$stmt->bind_param('i', $result['user']['id']);
$stmt->execute();
$stmt->close();

echo json_encode([
    'user' => $result['user'],
    'csrf_token' => $result['csrf_token'],
    'session_id' => session_id(),
]);
