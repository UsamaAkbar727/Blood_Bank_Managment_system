<?php
declare(strict_types=1);

$rootDir = __DIR__;
$apiDir = $rootDir . DIRECTORY_SEPARATOR . 'api';
$frontendDir = $rootDir . DIRECTORY_SEPARATOR . 'frontend' . DIRECTORY_SEPARATOR . 'dist';

function detectMimeType(string $path): string
{
    $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

    return match ($extension) {
        'css' => 'text/css; charset=UTF-8',
        'js', 'mjs' => 'application/javascript; charset=UTF-8',
        'json' => 'application/json; charset=UTF-8',
        'html', 'htm' => 'text/html; charset=UTF-8',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg', 'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'map' => 'application/json; charset=UTF-8',
        default => mime_content_type($path) ?: 'application/octet-stream',
    };
}

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$basePath = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');

if ($basePath !== '' && $basePath !== '/' && str_starts_with($requestPath, $basePath)) {
    $requestPath = substr($requestPath, strlen($basePath));
}

$requestPath = '/' . ltrim($requestPath, '/');
$baseHref = ($basePath === '' || $basePath === '/') ? '/' : $basePath . '/';

if (str_starts_with($requestPath, '/api/')) {
    $relativeApiPath = ltrim(substr($requestPath, 5), '/');
    $target = realpath($apiDir . DIRECTORY_SEPARATOR . $relativeApiPath);

    if ($target === false || !str_starts_with(str_replace('\\', '/', $target), str_replace('\\', '/', realpath($apiDir) ?: $apiDir))) {
        http_response_code(404);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['error' => 'not_found']);
        exit;
    }

    if (is_dir($target)) {
        $target .= DIRECTORY_SEPARATOR . 'index.php';
    }

    if (!is_file($target)) {
        http_response_code(404);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['error' => 'not_found']);
        exit;
    }

    require $target;
    exit;
}

$relativeFrontendPath = ltrim($requestPath, '/');
$frontendPath = $relativeFrontendPath === ''
    ? $frontendDir
    : $frontendDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativeFrontendPath);
$resolvedFrontendPath = realpath($frontendPath);
$resolvedFrontendDir = realpath($frontendDir) ?: $frontendDir;
$normalizedFrontendDir = str_replace('\\', '/', $resolvedFrontendDir);

if (
    $resolvedFrontendPath !== false &&
    str_starts_with(str_replace('\\', '/', $resolvedFrontendPath), $normalizedFrontendDir) &&
    is_file($resolvedFrontendPath)
) {
    header('Content-Type: ' . detectMimeType($resolvedFrontendPath));
    header('Content-Length: ' . (string) filesize($resolvedFrontendPath));
    readfile($resolvedFrontendPath);
    exit;
}

$spaPhpEntry = $frontendDir . DIRECTORY_SEPARATOR . 'index.php';
$spaHtmlEntry = $frontendDir . DIRECTORY_SEPARATOR . 'index.html';

if (is_file($spaPhpEntry)) {
    require $spaPhpEntry;
    exit;
}

if (is_file($spaHtmlEntry)) {
    header('Content-Type: text/html; charset=UTF-8');
    $html = file_get_contents($spaHtmlEntry);

    if ($html === false) {
        http_response_code(500);
        echo 'Frontend build entry could not be read.';
        exit;
    }

    if (stripos($html, '<base ') === false) {
        $html = preg_replace(
            '/<head(\s[^>]*)?>/i',
            '<head$1>' . PHP_EOL . '    <base href="' . htmlspecialchars($baseHref, ENT_QUOTES, 'UTF-8') . '">',
            $html,
            1
        ) ?? $html;
    }

    echo $html;
    exit;
}

http_response_code(500);
header('Content-Type: text/plain; charset=UTF-8');
echo 'Frontend build entry not found.';
