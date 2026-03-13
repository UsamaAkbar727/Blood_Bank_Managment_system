<?php
require_once __DIR__ . '/config.php';

function db(): mysqli
{
    static $conn = null;
    if ($conn instanceof mysqli) {
        return $conn;
    }

    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_errno) {
        http_response_code(500);
        die(json_encode([
            'error' => 'database_connection_failed',
            'message' => $conn->connect_error,
        ]));
    }
    $conn->set_charset('utf8mb4');
    return $conn;
}
