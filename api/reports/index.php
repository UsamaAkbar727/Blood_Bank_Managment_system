<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/lib/ReportService.php';

$days = isset($_GET['days']) ? max(1, (int)$_GET['days']) : 30;

$response = [
    'donor_blood_groups' => ReportService::donorBloodGroups(),
    'daily_collections' => ReportService::dailyCollections($days),
    'screening_results' => ReportService::screeningResults($days),
    'inventory_snapshot' => ReportService::inventorySnapshot(),
    'issuance_daily' => ReportService::issuanceDaily($days),
    'generated_at' => date('c'),
];

echo json_encode($response);
