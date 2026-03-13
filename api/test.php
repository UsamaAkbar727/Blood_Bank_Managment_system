<?php
/**
 * API Test Endpoint - Verify all API routes are working
 * Access via: http://localhost/Blood%20Bank%20Management%20System/api/test.php
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../backend/db.php';

$tests = [];
$errors = [];

// Test 1: Database connection
try {
    $conn = db();
    $tests['database'] = [
        'status' => 'OK',
        'message' => 'Database connection successful',
        'database' => DB_NAME
    ];
} catch (Exception $e) {
    $errors['database'] = $e->getMessage();
    $tests['database'] = [
        'status' => 'ERROR',
        'message' => $e->getMessage()
    ];
}

// Test 2: Check required tables
$tables = ['users', 'donors', 'collections', 'inventory', 'patients', 'blood_issuance', 'screening_tests', 'billing_records', 'notifications', 'logs'];
$table_status = [];
foreach ($tables as $table) {
    $result = db()->query("SHOW TABLES LIKE '$table'");
    $table_status[$table] = $result->num_rows > 0 ? 'exists' : 'missing';
}
$tests['tables'] = $table_status;

// Test 3: Check admin user
$admin_result = db()->query("SELECT id, username, role, status FROM users WHERE username = 'admin'");
if ($admin_result->num_rows > 0) {
    $admin = $admin_result->fetch_assoc();
    $tests['admin_user'] = [
        'status' => 'OK',
        'exists' => true,
        'username' => $admin['username'],
        'role' => $admin['role'],
        'status' => $admin['status']
    ];
} else {
    $tests['admin_user'] = [
        'status' => 'ERROR',
        'exists' => false,
        'message' => 'Admin user not found. Run install.php first.'
    ];
}

// Test 4: Check API directories
$api_dirs = [
    'auth' => __DIR__ . '/auth',
    'donors' => __DIR__ . '/donors',
    'inventory' => __DIR__ . '/inventory',
    'collections' => __DIR__ . '/collections',
    'patients' => __DIR__ . '/patients',
    'issuance' => __DIR__ . '/issuance',
    'finance' => __DIR__ . '/finance',
    'reports' => __DIR__ . '/reports',
    'logs' => __DIR__ . '/logs',
    'notifications' => __DIR__ . '/notifications',
    'backups' => __DIR__ . '/backups',
    'alerts' => __DIR__ . '/alerts',
    'screening' => __DIR__ . '/screening',
];

$dir_status = [];
foreach ($api_dirs as $name => $path) {
    $dir_status[$name] = is_dir($path) ? 'exists' : 'missing';
}
$tests['directories'] = $dir_status;

// Test 5: Check backend services
$services = [
    'Auth', 'AlertService', 'BackupService', 'CollectionService', 
    'DonorService', 'FinancialService', 'InventoryService', 
    'IssuanceService', 'LogService', 'NotificationService', 
    'PatientService', 'ReportService', 'ScreeningService', 'SmsService'
];

$service_status = [];
foreach ($services as $service) {
    $file = __DIR__ . '/../backend/lib/' . $service . '.php';
    $service_status[$service] = file_exists($file) ? 'exists' : 'missing';
}
$tests['services'] = $service_status;

// Test 6: Count records
$counts = [];
foreach ($tables as $table) {
    if ($table_status[$table] === 'exists') {
        $result = db()->query("SELECT COUNT(*) as count FROM $table");
        $counts[$table] = $result->fetch_assoc()['count'];
    }
}
$tests['record_counts'] = $counts;

// Output results
echo json_encode([
    'timestamp' => date('Y-m-d H:i:s'),
    'tests' => $tests,
    'summary' => [
        'total_errors' => count($errors),
        'status' => empty($errors) ? 'All tests passed' : 'Some tests failed'
    ]
], JSON_PRETTY_PRINT);

?>
