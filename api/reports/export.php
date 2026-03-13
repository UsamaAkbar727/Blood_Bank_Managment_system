<?php
require_once __DIR__ . '/../../backend/lib/ReportService.php';

$days = isset($_GET['days']) ? max(1, (int)$_GET['days']) : 30;
$format = isset($_GET['format']) ? strtolower((string)$_GET['format']) : 'excel';

$data = [
    'donor_blood_groups' => ReportService::donorBloodGroups(),
    'daily_collections' => ReportService::dailyCollections($days),
    'screening_results' => ReportService::screeningResults($days),
    'inventory_snapshot' => ReportService::inventorySnapshot(),
    'issuance_daily' => ReportService::issuanceDaily($days),
    'generated_at' => date('c'),
];

if ($format === 'pdf') {
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="bbms-report.pdf"');

    $lines = [];
    $lines[] = 'Blood Bank Management System - Report';
    $lines[] = 'Generated at: ' . $data['generated_at'];
    $lines[] = 'Range: Last ' . $days . ' days';
    $lines[] = '';
    $lines[] = 'Donors by Blood Group';
    foreach ($data['donor_blood_groups'] as $row) {
        $lines[] = $row['blood_group'] . ' : ' . $row['total'];
    }
    $lines[] = '';
    $lines[] = 'Daily Collections';
    foreach ($data['daily_collections'] as $row) {
        $lines[] = $row['day'] . ' : ' . $row['total'];
    }
    $lines[] = '';
    $lines[] = 'Daily Issuance';
    foreach ($data['issuance_daily'] as $row) {
        $lines[] = $row['day'] . ' : ' . $row['total'];
    }
    $lines[] = '';
    $lines[] = 'Screening Results';
    foreach ($data['screening_results'] as $row) {
        $lines[] = $row['result_status'] . ' : ' . $row['total'];
    }
    $lines[] = '';
    $lines[] = 'Inventory Snapshot';
    foreach ($data['inventory_snapshot'] as $row) {
        $lines[] = $row['blood_group'] . ' - ' . $row['status'] . ' : ' . $row['total'];
    }

    $content = "BT\n/F1 12 Tf\n1 0 0 1 50 800 Tm\n14 TL\n";
    foreach ($lines as $line) {
        $safe = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $line);
        $content .= '(' . $safe . ") Tj\n0 -14 Td\n";
    }
    $content .= "ET\n";

    $objects = [];
    $objects[] = "<< /Type /Catalog /Pages 2 0 R >>";
    $objects[] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
    $objects[] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>";
    $objects[] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    $objects[] = "<< /Length " . strlen($content) . " >>\nstream\n" . $content . "endstream";

    $pdf = "%PDF-1.4\n";
    $offsets = [0];
    foreach ($objects as $i => $obj) {
        $offsets[] = strlen($pdf);
        $pdf .= ($i + 1) . " 0 obj\n" . $obj . "\nendobj\n";
    }
    $xrefPos = strlen($pdf);
    $pdf .= "xref\n0 " . (count($objects) + 1) . "\n";
    $pdf .= "0000000000 65535 f \n";
    for ($i = 1; $i <= count($objects); $i++) {
        $pdf .= str_pad((string)$offsets[$i], 10, '0', STR_PAD_LEFT) . " 00000 n \n";
    }
    $pdf .= "trailer\n<< /Size " . (count($objects) + 1) . " /Root 1 0 R >>\nstartxref\n" . $xrefPos . "\n%%EOF";
    echo $pdf;
    exit;
}

header('Content-Type: application/vnd.ms-excel');
header('Content-Disposition: attachment; filename="bbms-report.xls"');

echo "<table border=\"1\">";
echo "<tr><th colspan=\"2\">Blood Bank Management System - Report</th></tr>";
echo "<tr><td>Generated at</td><td>" . htmlspecialchars($data['generated_at']) . "</td></tr>";
echo "<tr><td>Range</td><td>Last " . (int)$days . " days</td></tr>";
echo "</table><br/>";

echo "<table border=\"1\">";
echo "<tr><th colspan=\"2\">Donors by Blood Group</th></tr>";
foreach ($data['donor_blood_groups'] as $row) {
    echo "<tr><td>" . htmlspecialchars($row['blood_group']) . "</td><td>" . (int)$row['total'] . "</td></tr>";
}
echo "</table><br/>";

echo "<table border=\"1\">";
echo "<tr><th colspan=\"2\">Daily Collections</th></tr>";
foreach ($data['daily_collections'] as $row) {
    echo "<tr><td>" . htmlspecialchars($row['day']) . "</td><td>" . (int)$row['total'] . "</td></tr>";
}
echo "</table><br/>";

echo "<table border=\"1\">";
echo "<tr><th colspan=\"2\">Daily Issuance</th></tr>";
foreach ($data['issuance_daily'] as $row) {
    echo "<tr><td>" . htmlspecialchars($row['day']) . "</td><td>" . (int)$row['total'] . "</td></tr>";
}
echo "</table><br/>";

echo "<table border=\"1\">";
echo "<tr><th colspan=\"2\">Screening Results</th></tr>";
foreach ($data['screening_results'] as $row) {
    echo "<tr><td>" . htmlspecialchars($row['result_status']) . "</td><td>" . (int)$row['total'] . "</td></tr>";
}
echo "</table><br/>";

echo "<table border=\"1\">";
echo "<tr><th colspan=\"3\">Inventory Snapshot</th></tr>";
echo "<tr><th>Blood Group</th><th>Status</th><th>Total</th></tr>";
foreach ($data['inventory_snapshot'] as $row) {
    echo "<tr><td>" . htmlspecialchars($row['blood_group']) . "</td><td>" . htmlspecialchars($row['status']) . "</td><td>" . (int)$row['total'] . "</td></tr>";
}
echo "</table>";
