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

    $hasNotifications = $conn->query("SHOW TABLES LIKE 'notifications'");
    if ($hasNotifications && $hasNotifications->num_rows > 0) {
        $notificationColumns = [
            'event_key' => 'ALTER TABLE notifications ADD COLUMN event_key VARCHAR(191) NULL AFTER title',
            'snoozed_until' => 'ALTER TABLE notifications ADD COLUMN snoozed_until DATETIME NULL AFTER is_read',
        ];
        foreach ($notificationColumns as $column => $sql) {
            $hasColumn = $conn->query("SHOW COLUMNS FROM notifications LIKE '" . $conn->real_escape_string($column) . "'");
            if ($hasColumn && $hasColumn->num_rows === 0) {
                $conn->query($sql);
            }
        }

        $hasEventIndex = $conn->query("SHOW INDEX FROM notifications WHERE Key_name = 'idx_notifications_event'");
        if ($hasEventIndex && $hasEventIndex->num_rows === 0) {
            $conn->query('CREATE INDEX idx_notifications_event ON notifications (event_key, snoozed_until, is_read)');
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
        "CREATE TABLE IF NOT EXISTS settings_backups (
            id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
            frequency ENUM('daily','weekly','monthly') NOT NULL DEFAULT 'daily',
            scheduled_time TIME NOT NULL DEFAULT '00:00:00',
            scheduled_day_of_week TINYINT UNSIGNED NOT NULL DEFAULT 1,
            retention_days SMALLINT UNSIGNED NOT NULL DEFAULT 7,
            auto_delete_local BOOLEAN NOT NULL DEFAULT 1,
            drive_enabled BOOLEAN NOT NULL DEFAULT 0,
            drive_folder_id VARCHAR(191) NULL,
            drive_credentials_path VARCHAR(255) NULL,
            drive_auth_url VARCHAR(512) NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            last_run_at DATETIME NULL
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

    $conn->query(
        "INSERT INTO settings_backups (id, frequency, scheduled_time, scheduled_day_of_week, retention_days, auto_delete_local, drive_enabled, drive_folder_id, drive_credentials_path)
         VALUES (1, 'daily', '00:00:00', 1, 7, 1, 0, NULL, NULL)
         ON DUPLICATE KEY UPDATE
            frequency = VALUES(frequency),
            scheduled_time = VALUES(scheduled_time),
            scheduled_day_of_week = VALUES(scheduled_day_of_week),
            retention_days = VALUES(retention_days),
            auto_delete_local = VALUES(auto_delete_local),
            drive_enabled = VALUES(drive_enabled),
            drive_folder_id = VALUES(drive_folder_id),
            drive_credentials_path = VALUES(drive_credentials_path)"
    );

    $hasPatients = $conn->query("SHOW TABLES LIKE 'patients'");
    if ($hasPatients && $hasPatients->num_rows > 0) {
        $patientColumns = [
            'age' => 'ALTER TABLE patients ADD COLUMN age SMALLINT UNSIGNED NULL AFTER date_of_birth',
            'contact' => 'ALTER TABLE patients ADD COLUMN contact VARCHAR(30) NULL AFTER blood_group',
            'hospital_id' => 'ALTER TABLE patients ADD COLUMN hospital_id INT UNSIGNED NULL AFTER contact',
            'hospital_name' => 'ALTER TABLE patients ADD COLUMN hospital_name VARCHAR(150) NULL AFTER hospital_id',
            'medical_history' => 'ALTER TABLE patients ADD COLUMN medical_history VARCHAR(255) NULL AFTER hospital_name',
        ];
        foreach ($patientColumns as $column => $sql) {
            $hasColumn = $conn->query("SHOW COLUMNS FROM patients LIKE '" . $conn->real_escape_string($column) . "'");
            if ($hasColumn && $hasColumn->num_rows === 0) {
                $conn->query($sql);
            }
        }
        $hasPatientNameIndex = $conn->query("SHOW INDEX FROM patients WHERE Key_name = 'idx_patients_name'");
        if ($hasPatientNameIndex && $hasPatientNameIndex->num_rows === 0) {
            $conn->query('CREATE INDEX idx_patients_name ON patients (full_name)');
        }
    }
}
