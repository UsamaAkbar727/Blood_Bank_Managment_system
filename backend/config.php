<?php
// Basic environment configuration for the backend.
// Values can be overridden via backend/.env.

// Prevent HTML error output from breaking JSON responses.
if (PHP_SAPI !== 'cli') {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    ini_set('html_errors', '0');
}
error_reporting(E_ALL);

function loadEnvFile(string $path): void
{
    if (!is_file($path) || !is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) {
            continue;
        }

        $name = trim($parts[0]);
        $value = trim($parts[1]);
        if ($name === '') {
            continue;
        }

        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
        putenv($name . '=' . $value);
    }
}

function envValue(string $key, mixed $default = null): mixed
{
    $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
    if ($value === false || $value === null || $value === '') {
        return $default;
    }
    return $value;
}

function envBool(string $key, bool $default): bool
{
    $value = envValue($key);
    if ($value === null) {
        return $default;
    }

    $normalized = strtolower((string) $value);
    return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
}

function envInt(string $key, int $default): int
{
    $value = envValue($key);
    return is_numeric($value) ? (int) $value : $default;
}

function envList(string $key, array $default): array
{
    $value = envValue($key);
    if ($value === null) {
        return $default;
    }

    $items = array_values(array_filter(array_map('trim', explode(',', (string) $value)), static fn ($item) => $item !== ''));
    return $items === [] ? $default : $items;
}

loadEnvFile(__DIR__ . '/.env');

define('DB_HOST', envValue('DB_HOST', '127.0.0.1'));
define('DB_USER', envValue('DB_USER', 'root'));
define('DB_PASS', envValue('DB_PASS', 'Hello@789'));
// Database name includes spaces; MySQL allows this but using an underscore is recommended in production.
// Note: Match this exactly to your actual database name (case-sensitive on some systems)
define('DB_NAME', envValue('DB_NAME', 'bloodbank'));

// Sample bootstrap admin account for fresh installs.
define('SAMPLE_ADMIN_ENABLED', envBool('SAMPLE_ADMIN_ENABLED', true));
define('SAMPLE_ADMIN_NAME', envValue('SAMPLE_ADMIN_NAME', 'System Administrator'));
define('SAMPLE_ADMIN_USERNAME', envValue('SAMPLE_ADMIN_USERNAME', 'admin'));
define('SAMPLE_ADMIN_PHONE', envValue('SAMPLE_ADMIN_PHONE', '+923001234567'));
define('SAMPLE_ADMIN_PASSWORD', envValue('SAMPLE_ADMIN_PASSWORD', 'admin123'));
define('SAMPLE_ADMIN_PASSWORD_HASH', envValue('SAMPLE_ADMIN_PASSWORD_HASH', '$2y$12$OVbuDK6i1p3jMJs6iDj3aemaGPAZ8KrRbwh8y67Xd.hSiYPg5I5Ay'));

// Session cookie settings
define('SESSION_NAME', envValue('SESSION_NAME', 'bbms_session'));
define('SESSION_LIFETIME', envInt('SESSION_LIFETIME', 3600)); // seconds
define('SESSION_SECURE', envBool('SESSION_SECURE', false)); // set true if serving over https
define('SESSION_HTTPONLY', envBool('SESSION_HTTPONLY', true));
define('SESSION_SAMESITE', envValue('SESSION_SAMESITE', 'Lax'));

// SMS gateway (example placeholders)
define('SMS_API_URL', envValue('SMS_API_URL', 'https://api.yoursmsgateway.com/send'));
define('SMS_API_KEY', envValue('SMS_API_KEY', 'REPLACE_WITH_API_KEY'));
define('SMS_SENDER_ID', envValue('SMS_SENDER_ID', 'BBMS'));
// Comma-separated staff phone numbers for alerts (E.164 recommended)
define('ALERT_STAFF_NUMBERS', envList('ALERT_STAFF_NUMBERS', ['+11234567890']));

// Backup settings
define('BACKUP_MYSQLDUMP_PATH', envValue('BACKUP_MYSQLDUMP_PATH', 'mysqldump')); // ensure in PATH or set full path
define('BACKUP_RETENTION_DAYS', envInt('BACKUP_RETENTION_DAYS', 3));
define('BACKUP_DRIVE_ENABLED', envBool('BACKUP_DRIVE_ENABLED', false)); // set true when Drive creds configured
define('BACKUP_DRIVE_FOLDER_ID', envValue('BACKUP_DRIVE_FOLDER_ID', 'REPLACE_FOLDER_ID'));
define('BACKUP_SERVICE_ACCOUNT_JSON', envValue('BACKUP_SERVICE_ACCOUNT_JSON', __DIR__ . '/service-account.json')); // place file accordingly
