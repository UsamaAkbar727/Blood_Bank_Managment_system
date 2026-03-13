<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/Auth.php';

Auth::logout();
echo json_encode(['success' => true]);
