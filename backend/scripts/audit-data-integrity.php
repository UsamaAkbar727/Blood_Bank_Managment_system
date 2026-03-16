<?php
/**
 * Data Integrity Audit Script
 * 
 * This script checks for:
 * 1. Duplicate collection codes
 * 2. Orphaned inventory records
 * 3. Orphaned issuance records
 * 4. Inconsistent inventory states
 * 5. Multiple storage issues
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

class AuditReport {
    private $issues = [];
    private $warnings = [];
    private $stats = [];
    
    public function addIssue($category, $message, $data = []) {
        $this->issues[] = [
            'category' => $category,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    public function addWarning($category, $message, $data = []) {
        $this->warnings[] = [
            'category' => $category,
            'message' => $message,
            'data' => $data
        ];
    }
    
    public function addStat($name, $value) {
        $this->stats[$name] = $value;
    }
    
    public function print() {
        echo "\n========== BLOOD BANK DATA INTEGRITY AUDIT ==========\n";
        echo "Audit Date: " . date('Y-m-d H:i:s') . "\n\n";
        
        echo "--- STATISTICS ---\n";
        foreach ($this->stats as $name => $value) {
            echo "$name: $value\n";
        }
        
        if (count($this->issues) > 0) {
            echo "\n--- CRITICAL ISSUES FOUND (" . count($this->issues) . ") ---\n";
            foreach ($this->issues as $issue) {
                echo "[{$issue['category']}] {$issue['message']}\n";
                if (!empty($issue['data'])) {
                    echo "  Data: " . json_encode($issue['data']) . "\n";
                }
            }
        } else {
            echo "\n--- NO CRITICAL ISSUES FOUND ---\n";
        }
        
        if (count($this->warnings) > 0) {
            echo "\n--- WARNINGS (" . count($this->warnings) . ") ---\n";
            foreach ($this->warnings as $warning) {
                echo "[{$warning['category']}] {$warning['message']}\n";
            }
        }
        
        echo "\n====================================================\n\n";
    }
}

$audit = new AuditReport();

// 1. Check for duplicate collection codes
$stmt = db()->prepare('
    SELECT collection_code, COUNT(*) as cnt 
    FROM collections 
    GROUP BY collection_code 
    HAVING cnt > 1
');
$stmt->execute();
$duplicates = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

if (count($duplicates) > 0) {
    foreach ($duplicates as $dup) {
        $audit->addIssue('duplicate_collection_code', 
            "Duplicate collection code found: {$dup['collection_code']}", 
            $dup
        );
    }
}

// 2. Check for orphaned inventory records
$stmt = db()->prepare('
    SELECT i.id, i.collection_id, i.component, i.blood_group
    FROM inventory i
    LEFT JOIN collections c ON c.id = i.collection_id
    WHERE c.id IS NULL
');
$stmt->execute();
$orphaned_inv = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

if (count($orphaned_inv) > 0) {
    foreach ($orphaned_inv as $inv) {
        $audit->addIssue('orphaned_inventory', 
            "Orphaned inventory record: ID {$inv['id']}", 
            $inv
        );
    }
}

// 3. Check for orphaned issuance records
$stmt = db()->prepare('
    SELECT bi.id, bi.inventory_id, bi.patient_id
    FROM blood_issuance bi
    LEFT JOIN inventory i ON i.id = bi.inventory_id
    WHERE i.id IS NULL
');
$stmt->execute();
$orphaned_iss = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

if (count($orphaned_iss) > 0) {
    foreach ($orphaned_iss as $iss) {
        $audit->addIssue('orphaned_issuance', 
            "Orphaned issuance record: ID {$iss['id']}", 
            $iss
        );
    }
}

// 4. Check for inventory status inconsistencies
$stmt = db()->prepare('
    SELECT i.id, i.collection_id, i.status, COUNT(bi.id) as issuance_count
    FROM inventory i
    LEFT JOIN blood_issuance bi ON bi.inventory_id = i.id
    WHERE i.status != "issued" AND bi.id IS NOT NULL
    GROUP BY i.id
');
$stmt->execute();
$status_issues = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

if (count($status_issues) > 0) {
    foreach ($status_issues as $issue) {
        $audit->addWarning('inventory_status_mismatch',
            "Inventory ID {$issue['id']} has status '{$issue['status']}' but has {$issue['issuance_count']} issuance record(s)",
            $issue
        );
    }
}

// 5. Check for multiple screening records per collection
$stmt = db()->prepare('
    SELECT collection_id, COUNT(*) as cnt
    FROM screening_tests
    GROUP BY collection_id
    HAVING cnt > 1
');
$stmt->execute();
$multi_screening = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

if (count($multi_screening) > 0) {
    foreach ($multi_screening as $ms) {
        $audit->addWarning('multiple_screening_records',
            "Collection ID {$ms['collection_id']} has {$ms['cnt']} screening records",
            $ms
        );
    }
}

// Statistics
$stmt = db()->query('SELECT COUNT(*) as cnt FROM collections');
$collections_count = $stmt->fetch_assoc()['cnt'];
$audit->addStat('Total Collections', $collections_count);

$stmt = db()->query('SELECT COUNT(*) as cnt FROM inventory');
$inventory_count = $stmt->fetch_assoc()['cnt'];
$audit->addStat('Total Inventory Records', $inventory_count);

$stmt = db()->query('SELECT COUNT(*) as cnt FROM blood_issuance');
$issuance_count = $stmt->fetch_assoc()['cnt'];
$audit->addStat('Total Issuance Records', $issuance_count);

$stmt = db()->query('SELECT COUNT(*) as cnt FROM screening_tests');
$screening_count = $stmt->fetch_assoc()['cnt'];
$audit->addStat('Total Screening Records', $screening_count);

$audit->print();

echo "Note: Run this script periodically to monitor data integrity.\n";
echo "If critical issues are found, please review the backups and contact support.\n";
?>
