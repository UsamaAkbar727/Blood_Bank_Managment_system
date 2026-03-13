# Patient Blood Issuance

Endpoints:
- `api/patients/index.php` – CRUD/list patients (staff/admin).
- `api/issuance/index.php` – Issue compatible units to patients (staff/admin).

Compatibility:
- Deterministic map in `backend/lib/IssuanceService.php::$compatibility`.
- `issue()` rejects if inventory unit not `available` or blood group incompatible.

Issuance flow:
1. Register patient (POST `/api/patients`).
2. Lab marks a collection as `safe` → inventory status `available`.
3. Staff selects an `available` inventory id and patient id:
   ```json
   { "inventory_id": 15, "patient_id": 3, "units_issued": 1, "crossmatch_result": "compatible", "remarks": "Transfusion ward" }
   ```
4. POST `/api/issuance/index.php`:
   - Inserts row into `blood_issuance`.
   - Updates inventory status to `issued` and decrements `units_available`.

Queries:
- Issuance list: `GET /api/issuance/index.php?q=` (filters by patient/name/code/blood).
- Patient list: `GET /api/patients/index.php?q=`.

RBAC:
- Uses Permissions: `patients` and `issuance` mapped to `staff` (admin always allowed).
