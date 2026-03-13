# Role-Based Access Control (RBAC)

Roles in DB (`users.role`):
- `admin` – full system access (always passes checks)
- `staff` – donors, collections, inventory
- `lab_tech` – screening only

Helpers:
- `Auth::requireAuth()` – ensures a logged-in session.
- `Auth::requireRole($roles)` – allow only given roles (array|string); `admin` passes automatically.
- `Permissions::allow($module)` – module-level guard based on the matrix below.

Module matrix used in `Permissions`:
- donors → staff
- collections → staff
- inventory → staff
- screening → lab_tech
- users, expenses, logs → admin

Example endpoint guard:
```php
<?php
require_once __DIR__ . '/../../backend/lib/Permissions.php';
Permissions::allow('screening'); // only lab_tech or admin
// rest of endpoint...
```

Login session already stores `$_SESSION['user_role']`; add this guard at the top of every API file.
