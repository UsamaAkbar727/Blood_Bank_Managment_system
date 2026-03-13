<?php
// Basic environment configuration for the backend.
// Copy this file to config.local.php and adjust credentials for your machine.

// Prevent HTML error output from breaking JSON responses.
if (PHP_SAPI !== 'cli') {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    ini_set('html_errors', '0');
}
error_reporting(E_ALL);

const DB_HOST = '127.0.0.1';
const DB_USER = 'root';
const DB_PASS = '';
// Database name includes spaces; MySQL allows this but using an underscore is recommended in production.
// Note: Match this exactly to your actual database name (case-sensitive on some systems)
const DB_NAME = 'blood bank management system';

// Session cookie settings
const SESSION_NAME = 'bbms_session';
const SESSION_LIFETIME = 3600; // seconds
const SESSION_SECURE = false; // set true if serving over https
const SESSION_HTTPONLY = true;
const SESSION_SAMESITE = 'Lax';

// SMS gateway (example placeholders)
const SMS_API_URL = 'https://api.yoursmsgateway.com/send';
const SMS_API_KEY = 'REPLACE_WITH_API_KEY';
const SMS_SENDER_ID = 'BBMS';
// Comma-separated staff phone numbers for alerts (E.164 recommended)
const ALERT_STAFF_NUMBERS = ['+11234567890'];

// Backup settings
const BACKUP_MYSQLDUMP_PATH = 'mysqldump'; // ensure in PATH or set full path
const BACKUP_RETENTION_DAYS = 3;
const BACKUP_DRIVE_ENABLED = false; // set true when Drive creds configured
const BACKUP_DRIVE_FOLDER_ID = 'REPLACE_FOLDER_ID';
const BACKUP_SERVICE_ACCOUNT_JSON = __DIR__ . '/service-account.json'; // place file accordingly
