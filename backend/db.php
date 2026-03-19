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
    ensureSampleAdmin($conn);
    ensureAppSchema($conn);
    return $conn;
}

function ensureSampleAdmin(mysqli $conn): void
{
    static $checked = false;
    if ($checked || !defined('SAMPLE_ADMIN_ENABLED') || SAMPLE_ADMIN_ENABLED !== true) {
        return;
    }
    $checked = true;

    $tableResult = $conn->query("SHOW TABLES LIKE 'users'");
    if (!$tableResult || $tableResult->num_rows === 0) {
        return;
    }

    $sql = 'INSERT INTO users (name, username, phone, role, password_hash, status)
            SELECT ?, ?, ?, \'admin\', ?, \'active\'
            WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = ? LIMIT 1)';
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return;
    }

    $name = SAMPLE_ADMIN_NAME;
    $username = SAMPLE_ADMIN_USERNAME;
    $phone = SAMPLE_ADMIN_PHONE;
    $passwordHash = SAMPLE_ADMIN_PASSWORD_HASH;
    $stmt->bind_param('sssss', $name, $username, $phone, $passwordHash, $username);
    $stmt->execute();
    $stmt->close();
}

function ensureAppSchema(mysqli $conn): void
{
    static $checked = false;
    if ($checked) {
        return;
    }
    $checked = true;

    $hasCollections = $conn->query("SHOW TABLES LIKE 'collections'");
    if ($hasCollections && $hasCollections->num_rows > 0) {
        $hasExpiryOverride = $conn->query("SHOW COLUMNS FROM collections LIKE 'expiry_date_override'");
        if ($hasExpiryOverride && $hasExpiryOverride->num_rows === 0) {
            $conn->query('ALTER TABLE collections ADD COLUMN expiry_date_override DATE NULL AFTER collection_site');
        }
    }

    $conn->query(
        "CREATE TABLE IF NOT EXISTS settings_expiry_rules (
            component ENUM('Whole Blood','PRBC','Platelets','FFP','Plasma','Cryo') NOT NULL PRIMARY KEY,
            shelf_life_days SMALLINT UNSIGNED NOT NULL,
            allow_manual_override BOOLEAN NOT NULL DEFAULT 1,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $conn->query(
        "CREATE TABLE IF NOT EXISTS google_drive_tokens (
            id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
            refresh_token VARCHAR(512) NULL,
            access_token TEXT NULL,
            expires_at DATETIME NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $conn->query(
        "INSERT INTO settings_expiry_rules (component, shelf_life_days, allow_manual_override) VALUES
            ('Whole Blood', 35, 1),
            ('PRBC', 42, 1),
            ('Platelets', 5, 1),
            ('FFP', 365, 1),
            ('Plasma', 365, 1),
            ('Cryo', 365, 1)
        ON DUPLICATE KEY UPDATE
            shelf_life_days = VALUES(shelf_life_days),
            allow_manual_override = VALUES(allow_manual_override)"
    );
}
