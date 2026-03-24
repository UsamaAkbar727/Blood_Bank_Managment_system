<?php
/**
 * Simple Google OAuth Callback Receiver
 * Displays the authorization code for copy-pasting into the terminal.
 */

if (isset($_GET['code'])) {
    $code = htmlspecialchars($_GET['code']);
    
    echo "<h1>Google OAuth Code Received!</h1>";
    echo "<p>Please copy the code below and paste it into the terminal where you ran the setup script:</p>";
    echo "<pre style='background: #f4f4f4; padding: 15px; border: 1px solid #ddd; font-size: 1.2em; word-break: break-all;'>$code</pre>";
    echo "<p>After pasting, the system will finalize the token generation.</p>";
} else {
    echo "<h1>No code received</h1>";
    echo "<p>Please ensure you complete the authorization flow first.</p>";
}

if (isset($_GET['error'])) {
    echo "<h2 style='color: red;'>Error: " . htmlspecialchars($_GET['error']) . "</h2>";
}

exit;
