<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

echo "Adding UNIQUE constraint to collections.collection_code...\n";

try {
    // 1. Check for duplicates first
    $res = db()->query('SELECT collection_code, COUNT(*) as cnt FROM collections GROUP BY collection_code HAVING cnt > 1');
    $duplicates = $res->fetch_all(MYSQLI_ASSOC);
    
    if (!empty($duplicates)) {
        echo "WARNING: Duplicate collection codes found. Constraint cannot be added until duplicates are resolved.\n";
        foreach ($duplicates as $dup) {
            echo "  Code: {$dup['collection_code']} (count: {$dup['cnt']})\n";
        }
        exit(1);
    }

    // 2. Add constraint
    $sql = "ALTER TABLE collections ADD CONSTRAINT unique_collection_code UNIQUE (collection_code)";
    if (db()->query($sql)) {
        echo "SUCCESS: Unique constraint added successfully.\n";
    } else {
        echo "ERROR: " . db()->error . "\n";
    }
} catch (Exception $e) {
    echo "CRITICAL ERROR: " . $e->getMessage() . "\n";
}
