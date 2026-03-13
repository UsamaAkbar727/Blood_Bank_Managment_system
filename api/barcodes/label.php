<?php
header('Content-Type: application/pdf');
require_once __DIR__ . '/../../backend/lib/Auth.php';

$user = Auth::currentUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'unauthorized']);
    exit;
}

$code = trim($_GET['code'] ?? 'BAG-000');
$component = trim($_GET['component'] ?? 'Whole Blood');
$blood = trim($_GET['blood'] ?? '');
$expiry = trim($_GET['expiry'] ?? '');
$volume = trim($_GET['volume'] ?? '');

$title = 'Blood Bag Label';
$meta = $component . ($blood ? ' - ' . $blood : '') . ($expiry ? ' - Exp ' . $expiry : '');
$extra = $volume ? 'Volume: ' . $volume . ' ml' : '';

// Minimal PDF with text (barcode rendered client-side in print for now)
$lines = [
    $title,
    $meta,
    $code,
    $extra,
];

header('Content-Disposition: attachment; filename="barcode-label.pdf"');

$content = "BT\n/F1 14 Tf\n1 0 0 1 50 760 Tm\n16 TL\n";
foreach ($lines as $line) {
    $safe = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $line);
    $content .= '(' . $safe . ") Tj\n0 -16 Td\n";
}
$content .= "ET\n";

$objects = [];
$objects[] = "<< /Type /Catalog /Pages 2 0 R >>";
$objects[] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
$objects[] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>";
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
