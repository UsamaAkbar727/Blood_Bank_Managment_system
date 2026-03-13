# Screening & Testing Workflow

Endpoint: `api/screening/index.php`

Access: `lab_tech` or `admin` (via `Permissions::allow('screening')` in service).

Payload (POST/PUT/PATCH):
```json
{
  "collection_id": 12,
  "test_date": "2026-03-10 12:30:00",   // optional, defaults now
  "blood_group_confirmed": "B+",
  "hbsag": 0,
  "hcv": 0,
  "hiv": 0,
  "malaria": 0,
  "syphilis": 0,
  "hemoglobin_level": 13.5,
  "result_status": "safe",             // pending|safe|rejected; auto-set to rejected if any reactive
  "remarks": "All clear"
}
```

Behavior:
- Saves/updates `screening_tests` (unique per collection).
- If any test is reactive → `result_status` forced to `rejected`, collection status set to `rejected`, inventory marked discarded.
- If non-reactive and status resolves to `safe` → collection status set to `safe`, inventory upserted (Whole Blood, expiry = collection_date + 35 days, status `available`).
- Records `tested_by` from the logged-in user (if session exists).

List/get:
- `GET /api/screening/index.php?q=...` lists recent tests (code/donor filter).
- `GET /api/screening/index.php?collection_id=12` returns the test for one collection.
