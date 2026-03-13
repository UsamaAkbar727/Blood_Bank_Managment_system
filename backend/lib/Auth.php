<?php
require_once __DIR__ . '/../db.php';

class Auth
{
    public static function startSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        session_name(SESSION_NAME);
        session_set_cookie_params([
            'lifetime' => SESSION_LIFETIME,
            'path' => '/',
            'domain' => '',
            'secure' => SESSION_SECURE,
            'httponly' => SESSION_HTTPONLY,
            'samesite' => SESSION_SAMESITE,
        ]);
        session_start();
    }

    public static function login(string $email, string $password): array
    {
        self::startSession();
        $sql = 'SELECT id, name, username, role, password_hash, status FROM users WHERE username = ? LIMIT 1';
        $stmt = db()->prepare($sql);
        $stmt->bind_param('s', $email); // variable name kept; holds username
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        $stmt->close();

        if (!$user || $user['status'] !== 'active') {
            return ['success' => false, 'error' => 'invalid_credentials'];
        }

        if (!password_verify($password, $user['password_hash'])) {
            return ['success' => false, 'error' => 'invalid_credentials'];
        }

        // Regenerate to prevent fixation
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int)$user['id'];
        $_SESSION['user_username'] = $user['username'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

        // Audit log
        if (!class_exists('LogService')) {
            require_once __DIR__ . '/LogService.php';
        }
        LogService::write((int)$user['id'], 'login', 'user', (int)$user['id']);

        return [
            'success' => true,
            'user' => [
                'id' => (int)$user['id'],
                'name' => $user['name'],
                'username' => $user['username'],
                'role' => $user['role'],
            ],
            'csrf_token' => $_SESSION['csrf_token'],
        ];
    }

    public static function logout(): void
    {
        self::startSession();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
    }

    public static function currentUser(): ?array
    {
        self::startSession();
        if (isset($_SESSION['user_id'])) {
            return [
                'id' => $_SESSION['user_id'],
                'username' => $_SESSION['user_username'],
                'role' => $_SESSION['user_role'],
            ];
        }
        return null;
    }

    public static function requireAuth(): void
    {
        if (!self::currentUser()) {
            http_response_code(401);
            echo json_encode(['error' => 'unauthorized']);
            exit;
        }
    }

    public static function requireRole(array|string $roles): void
    {
        self::requireAuth();
        $currentRole = $_SESSION['user_role'] ?? '';

        // Admin always allowed
        if ($currentRole === 'admin') {
            return;
        }

        $roles = is_array($roles) ? $roles : [$roles];
        if (!in_array($currentRole, $roles, true)) {
            http_response_code(403);
            echo json_encode(['error' => 'forbidden', 'required_roles' => $roles]);
            exit;
        }
    }

    public static function hasRole(array|string $roles): bool
    {
        self::startSession();
        $currentRole = $_SESSION['user_role'] ?? null;
        if ($currentRole === null) {
            return false;
        }
        if ($currentRole === 'admin') {
            return true;
        }
        $roles = is_array($roles) ? $roles : [$roles];
        return in_array($currentRole, $roles, true);
    }
}
