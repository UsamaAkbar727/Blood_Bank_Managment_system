<?php
/**
 * Installation Script for Blood Bank Management System
 * Run this file once to setup the database and create default admin user
 * Access via: http://localhost/Blood%20Bank%20Management%20System/install.php
 */

header('Content-Type: text/html; charset=utf-8');

// Configuration
require_once __DIR__ . '/backend/config.php';

echo "<!DOCTYPE html>
<html>
<head>
    <title>Blood Bank Management System - Installation</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 50px auto; padding: 20px; }
        h1 { color: #2563eb; }
        .success { color: #16a34a; background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .error { color: #dc2626; background: #fef2f2; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .info { color: #2563eb; background: #eff6ff; padding: 15px; border-radius: 8px; margin: 10px 0; }
        pre { background: #f3f4f6; padding: 15px; border-radius: 8px; overflow-x: auto; }
        .step { margin: 20px 0; padding: 15px; border-left: 4px solid #2563eb; background: #f9fafb; }
    </style>
</head>
<body>
<h1>🏥 Blood Bank Management System - Installation</h1>
";

$steps = [];
$errors = [];

// Step 1: Check PHP version
$steps[] = "Checking PHP version...";
if (version_compare(PHP_VERSION, '8.0.0', '>=')) {
    echo "<div class='success'>✓ PHP Version: " . PHP_VERSION . "</div>";
} else {
    $errors[] = "PHP version 8.0 or higher is required. Current version: " . PHP_VERSION;
    echo "<div class='error'>✗ PHP Version: " . PHP_VERSION . " (Need 8.0+)</div>";
}

// Step 2: Check MySQL extension
$steps[] = "Checking MySQL extension...";
if (extension_loaded('mysqli')) {
    echo "<div class='success'>✓ MySQLi extension is installed</div>";
} else {
    $errors[] = "MySQLi extension is not installed";
    echo "<div class='error'>✗ MySQLi extension is not installed</div>";
}

// Step 3: Connect to MySQL
$steps[] = "Connecting to MySQL server...";
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS);
if ($conn->connect_error) {
    $errors[] = "Cannot connect to MySQL: " . $conn->connect_error;
    echo "<div class='error'>✗ MySQL Connection Failed: " . $conn->connect_error . "</div>";
} else {
    echo "<div class='success'>✓ Connected to MySQL server at " . DB_HOST . "</div>";

    // Step 4: Create database
    $steps[] = "Creating database...";
    $db_name = DB_NAME;
    
    // Use proper backtick escaping for database names with spaces
    if ($conn->query("CREATE DATABASE IF NOT EXISTS `$db_name` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci")) {
        echo "<div class='success'>✓ Database '$db_name' created/verified</div>";
        
        // Select database
        $conn->select_db($db_name);
        
        // Step 5: Run schema
        $steps[] = "Importing database schema...";
        $schema_file = __DIR__ . '/database/schema.sql';
        if (file_exists($schema_file)) {
            $sql = file_get_contents($schema_file);
            
            // Execute multiple queries, ignoring duplicate errors
            $queries = array_filter(array_map('trim', explode(';', $sql)));
            $success_count = 0;
            $skip_errors = ['Duplicate key name', 'Table already exists', 'Duplicate entry'];
            
            foreach ($queries as $query) {
                if (!empty($query) && !preg_match('/^--/', $query)) {
                    if ($conn->query($query)) {
                        $success_count++;
                    } else {
                        $error_msg = $conn->error;
                        $is_duplicate = false;
                        
                        // Check if it's a duplicate/already exists error (which we can ignore)
                        foreach ($skip_errors as $skip_error) {
                            if (strpos($error_msg, $skip_error) !== false) {
                                $is_duplicate = true;
                                $success_count++; // Count as success since it already exists
                                break;
                            }
                        }
                        
                        if (!$is_duplicate) {
                            echo "<div class='error'>Warning: Query failed - " . $error_msg . "</div>";
                        }
                    }
                }
            }
            echo "<div class='success'>✓ Database schema imported ($success_count tables/indexes created)</div>";
        } else {
            $errors[] = "Schema file not found";
            echo "<div class='error'>✗ Schema file not found at: $schema_file</div>";
        }

        // Step 6: Create default admin user
        $steps[] = "Creating default admin user...";
        $admin_check = $conn->query("SELECT id FROM users WHERE username = 'admin'");
        if ($admin_check->num_rows === 0) {
            $password_hash = password_hash('admin123', PASSWORD_DEFAULT);
            $admin_user = 'admin';
            $name = "Administrator";
            $phone = "+1234567890";
            $role = "admin";
            $status = "active";
            
            $stmt = $conn->prepare("INSERT INTO users (name, username, phone, role, password_hash, status) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("ssssss", $name, $admin_user, $phone, $role, $password_hash, $status);
            
            if ($stmt->execute()) {
                echo "<div class='success'>✓ Default admin user created</div>";
                echo "<div class='info'>
                    <strong>Default Login Credentials:</strong><br>
                    Username: <code>admin</code><br>
                    Password: <code>admin123</code><br>
                    <em>Please change these credentials immediately after first login!</em>
                </div>";
            } else {
                $errors[] = "Failed to create admin user: " . $stmt->error;
                echo "<div class='error'>✗ Failed to create admin user: " . $stmt->error . "</div>";
            }
            $stmt->close();
        } else {
            echo "<div class='info'>ℹ Admin user already exists</div>";
        }

        // Step 7: Insert sample pricing data
        $steps[] = "Inserting sample pricing data...";
        $pricing_check = $conn->query("SELECT COUNT(*) as count FROM blood_pricing");
        if ($pricing_check->fetch_assoc()['count'] == 0) {
            $blood_groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
            $components = ['Whole Blood', 'PRBC', 'Platelets', 'FFP', 'Plasma', 'Cryo'];
            $prices = [
                'Whole Blood' => 5000,
                'PRBC' => 6000,
                'Platelets' => 8000,
                'FFP' => 4000,
                'Plasma' => 3500,
                'Cryo' => 4500
            ];
            
            $stmt = $conn->prepare("INSERT INTO blood_pricing (component, blood_group, unit_cost, effective_from) VALUES (?, ?, ?, CURDATE())");
            foreach ($components as $component) {
                foreach ($blood_groups as $bg) {
                    $price = $prices[$component];
                    $stmt->bind_param("ssd", $component, $bg, $price);
                    $stmt->execute();
                }
            }
            $stmt->close();
            echo "<div class='success'>✓ Sample pricing data inserted</div>";
        } else {
            echo "<div class='info'>ℹ Pricing data already exists</div>";
        }

    } else {
        $errors[] = "Cannot create database: " . $conn->error;
        echo "<div class='error'>✗ Failed to create database: " . $conn->error . "</div>";
    }
    
    $conn->close();
}

// Final summary
echo "<div class='step'>
<h2>Installation Summary</h2>";

if (empty($errors)) {
    echo "<div class='success'>
        <strong>✓ Installation Completed Successfully!</strong><br><br>
        Next steps:<br>
        1. Delete or rename this install.php file for security<br>
        2. Navigate to the application: <a href='frontend/dist/index.html' style='color: #2563eb;'>Launch Application</a><br>
        3. Login with default credentials: admin / admin123<br>
        4. Change the default password immediately!
    </div>";
} else {
    echo "<div class='error'>
        <strong>✗ Installation completed with errors:</strong><br><br>
        <ul>";
    foreach ($errors as $error) {
        echo "<li>$error</li>";
    }
    echo "</ul>
    </div>";
}

echo "</div>

<div class='info'>
    <strong>System Requirements:</strong><br>
    ✓ PHP 8.0 or higher<br>
    ✓ MySQL 8.0 or higher<br>
    ✓ Apache/Nginx web server<br>
    ✓ Node.js 16+ (for frontend development)
</div>

</body>
</html>
";

?>
