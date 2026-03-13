# Inventory Dashboard API

Endpoint: `api/inventory/index.php` (GET only, RBAC: staff/admin via Permissions inventory module)

Actions:
- `?action=list&q=&status=` – list units (FIFO: expiry ASC) with donor/collection info.
- `?action=summary` – grouped counts per blood_group/component/status.
- `?action=expiring&days=7` – units expiring within N days (default 7).
- `?action=low` – low-stock pairs (blood_group+component) below threshold.

Config:
- `InventoryService::$lowStockThreshold` (default 5 units).

Fields returned:
- inventory.*, plus `collection_code`, `donor_name`.

Usage example (JS):
```js
fetch('/api/inventory/index.php?action=summary').then(r => r.json());
```
