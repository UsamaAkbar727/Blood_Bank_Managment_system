<?php

/**
 * Simple Database Connection Test
 * Access via: http://localhost/Blood%20Bank%20Management%20System/test-db.php
 */

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html>
<html>
<head>
    <title>Database Connection Test</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f7fafc; }
        .card { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px; }
        h1 { color: #2d3748; margin-bottom: 10px; }
        .success { color: #38a169; background: #f0fff4; padding: 15px; border-radius: 8px; border-left: 4px solid #38a169; margin: 10px 0; }
        .error { color: #e53e3e; background: #fff5f5; padding: 15px; border-radius: 8px; border-left: 4px solid #e53e3e; margin: 10px 0; }
        .info { color: #3182ce; background: #ebf8ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3182ce; margin: 10px 0; }
        pre { background: #edf2f7; padding: 15px; border-radius: 8px; overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f7fafc; font-weight: 600; }
        tr:hover { background: #f7fafc; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .badge-success { background: #c6f6d5; color: #22543d; }
        .badge-error { background: #fed7d7; color: #742a2a; }
    </style>
</head>
<body>
";

echo "<div class='card'>";
echo "<h1>🔍 Database Connection Test</h1>";
echo "<p style='color: #718096; margin-bottom: 20px;'>Testing MySQL connection and database setup...</p>";

// Test 1: Load configuration
echo "<h2>Step 1: Loading Configuration</h2>";
try {
    require_once __DIR__ . '/backend/config.php';
    echo "<div class='success'>✓ Configuration loaded successfully</div>";
    echo "<pre>";
    echo "DB_HOST: " . DB_HOST . "\n";
    echo "DB_USER: " . DB_USER . "\n";
    echo "DB_NAME: " . DB_NAME . "\n";
    echo "</pre>";
} catch (Exception $e) {
    echo "<div class='error'>✗ Failed to load configuration: " . $e->getMessage() . "</div>";
    echo "</div></body></html>";
    exit;
}

// Test 2: Connect to MySQL
echo "<h2>Step 2: MySQL Connection</h2>";
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS);
if ($conn->connect_error) {
    echo "<div class='error'>✗ Connection failed: " . $conn->connect_error . "</div>";
    echo "</div></body></html>";
    exit;
}
echo "<div class='success'>✓ Connected to MySQL server successfully</div>";
echo "<pre>Server version: " . $conn->server_info . "</pre>";

// Test 3: Check if database exists
echo "<h2>Step 3: Database Existence</h2>";
$db_name = DB_NAME;
$result = $conn->query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '$db_name'");
if ($result->num_rows > 0) {
    echo "<div class='success'>✓ Database '$db_name' exists</div>";

    // Select database
    $conn->select_db($db_name);
} else {
    echo "<div class='error'>✗ Database '$db_name' does not exist</div>";
    echo "<div class='info'>ℹ Please run <a href='install.php' style='color: #3182ce; font-weight: bold;'>install.php</a> to create the database</div>";
    echo "</div></body></html>";
    $conn->close();
    exit;
}

// Test 4: Check tables
echo "<h2>Step 4: Database Tables</h2>";
$tables_result = $conn->query("SHOW TABLES");
$table_count = $tables_result->num_rows;
echo "<div class='success'>✓ Found $table_count tables</div>";

$expected_tables = [
    'users',
    'donors',
    'collections',
    'screening_tests',
    'inventory',
    'patients',
    'blood_issuance',
    'logs',
    'expenses',
    'blood_pricing',
    'billing_records',
    'notifications',
    'backup_logs'
];

echo "<table>";
echo "<thead><tr><th>Table Name</th><th>Status</th><th>Row Count</th></tr></thead>";
echo "<tbody>";
foreach ($expected_tables as $table) {
    $check = $conn->query("SHOW TABLES LIKE '$table'");
    if ($check->num_rows > 0) {
        $count_result = $conn->query("SELECT COUNT(*) as count FROM $table");
        $count = $count_result->fetch_assoc()['count'];
        echo "<tr>";
        echo "<td>$table</td>";
        echo "<td><span class='badge badge-success'>✓ Exists</span></td>";
        echo "<td>$count rows</td>";
        echo "</tr>";
    } else {
        echo "<tr>";
        echo "<td>$table</td>";
        echo "<td><span class='badge badge-error'>✗ Missing</span></td>";
        echo "<td>-</td>";
        echo "</tr>";
    }
}
echo "</tbody>";
echo "</table>";

// Test 5: Check admin user
echo "<h2>Step 5: Admin User Check</h2>";
$admin_result = $conn->query("SELECT id, username, role, status, created_at FROM users WHERE username = 'admin'");
if ($admin_result->num_rows > 0) {
    $admin = $admin_result->fetch_assoc();
    echo "<div class='success'>✓ Admin user exists</div>";
    echo "<pre>";
    echo "Username: {$admin['username']}\n";
    echo "Role: {$admin['role']}\n";
    echo "Status: {$admin['status']}\n";
    echo "Created: {$admin['created_at']}\n";
    echo "</pre>";
} else {
    echo "<div class='error'>✗ Admin user not found</div>";
    echo "<div class='info'>ℹ Run <a href='install.php' style='color: #3182ce; font-weight: bold;'>install.php</a> to create default admin user</div>";
}

// Test 6: Connection info
echo "<h2>Step 6: Connection Information</h2>";
echo "<div class='info'>";
echo "<strong>MySQL Server Info:</strong><br>";
echo "Host: " . DB_HOST . "<br>";
echo "User: " . DB_USER . "<br>";
echo "Database: " . DB_NAME . "<br>";
echo "Charset: utf8mb4<br>";
echo "Total Tables: $table_count<br>";
echo "</div>";

$conn->close();

echo "<div style='margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;'>";
echo "<h3>✅ All Tests Completed!</h3>";
echo "<p>Your database connection is working correctly.</p>";
echo "<p style='margin-top: 15px;'>";
echo "<a href='index.html' style='display: inline-block; padding: 10px 20px; background: #4299e1; color: white; text-decoration: none; border-radius: 6px; margin-right: 10px;'>Go to Home</a>";
echo "<a href='frontend/dist/index.html' style='display: inline-block; padding: 10px 20px; background: #48bb78; color: white; text-decoration: none; border-radius: 6px;'>Launch Application</a>";
echo "</p>";
echo "</div>";

echo "</div>";
echo "</body>";
echo "</html>";
