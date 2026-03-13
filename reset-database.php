<?php
/**
 * Database Reset Script
 * Run this to completely remove and recreate the database from scratch
 * Access via: http://localhost/Blood%20Bank%20Management%20System/reset-database.php
 */

header('Content-Type: text/html; charset=utf-8');
require_once __DIR__ . '/backend/config.php';

echo "<!DOCTYPE html>
<html>
<head>
    <title>Reset Database</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f7fafc; }
        .card { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px; }
        h1 { color: #e53e3e; }
        .warning { color: #c05621; background: #fffaf0; padding: 15px; border-radius: 8px; border-left: 4px solid #c05621; margin: 10px 0; }
        .success { color: #38a169; background: #f0fff4; padding: 15px; border-radius: 8px; border-left: 4px solid #38a169; margin: 10px 0; }
        .error { color: #e53e3e; background: #fff5f5; padding: 15px; border-radius: 8px; border-left: 4px solid #e53e3e; margin: 10px 0; }
        .btn { display: inline-block; padding: 12px 24px; background: #e53e3e; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; border: none; cursor: pointer; font-size: 16px; }
        .btn:hover { background: #c53030; }
        .btn-success { background: #48bb78; }
        .btn-success:hover { background: #38a169; }
        .btn-secondary { background: #4a5568; }
        .btn-secondary:hover { background: #2d3748; }
    </style>
</head>
<body>
";

// Check if confirm parameter is set
if (isset($_GET['confirm']) && $_GET['confirm'] === 'yes') {
    echo "<div class='card'>";
    echo "<h1>🗑️ Database Reset in Progress...</h1>";
    
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS);
    if ($conn->connect_error) {
        echo "<div class='error'>✗ Connection failed: " . $conn->connect_error . "</div>";
        echo "</div></body></html>";
        exit;
    }
    
    $db_name = DB_NAME;
    
    // Drop database
    echo "<p>Dropping database '$db_name'...</p>";
    if ($conn->query("DROP DATABASE IF EXISTS `$db_name`")) {
        echo "<div class='success'>✓ Database dropped successfully</div>";
        
        // Recreate database
        echo "<p>Creating fresh database...</p>";
        if ($conn->query("CREATE DATABASE `$db_name` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci")) {
            echo "<div class='success'>✓ Fresh database created</div>";
            
            echo "<div class='warning'>
                <strong>⚠️ Next Step:</strong><br>
                Run the installation script to setup tables and create admin user.<br><br>
                <a href='install.php' class='btn btn-success'>🚀 Run Installation Now</a>
            </div>";
            
        } else {
            echo "<div class='error'>✗ Failed to create database: " . $conn->error . "</div>";
        }
    } else {
        echo "<div class='error'>✗ Failed to drop database: " . $conn->error . "</div>";
    }
    
    $conn->close();
    echo "</div>";
    
} else {
    // Show confirmation page
    echo "<div class='card'>";
    echo "<h1>⚠️ Warning: Database Reset</h1>";
    
    echo "<div class='warning'>
        <strong>⛔ This will DELETE ALL DATA!</strong><br><br>
        This action will:<br>
        • Drop the entire database '$db_name'<br>
        • Delete all users, donors, patients, and records<br>
        • Remove all data permanently<br><br>
        <strong>This cannot be undone!</strong>
    </div>";
    
    echo "<p style='margin: 20px 0; font-size: 16px;'>
        Are you absolutely sure you want to proceed? Only do this if you want to start completely fresh.
    </p>";
    
    echo "<div style='text-align: center; margin-top: 30px;'>
        <a href='reset-database.php?confirm=yes' class='btn'>Yes, Reset Everything</a>
        <a href='index.html' class='btn btn-secondary'>Cancel - Go Back</a>
    </div>";
    
    echo "<div style='margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;'>
        <h3>When to Use This:</h3>
        <ul style='line-height: 2;'>
            <li>✅ Testing environment needs a fresh start</li>
            <li>✅ Development database is corrupted</li>
            <li>✅ Want to reinstall from scratch</li>
            <li>❌ DO NOT use on production with real data</li>
        </ul>
        
        <h3 style='margin-top: 20px;'>What Happens After Reset:</h3>
        <ol style='line-height: 2;'>
            <li>Database is completely removed</li>
            <li>Fresh empty database is created</li>
            <li>You must run install.php to setup tables</li>
            <li>Admin user will be recreated</li>
        </ol>
    </div>";
    
    echo "</div>";
}

echo "</body></html>";
?>
