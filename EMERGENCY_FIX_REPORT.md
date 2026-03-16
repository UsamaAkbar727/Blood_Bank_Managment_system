# Blood Bank Barcode Data Loss - Emergency Fix Report

## Date: March 16, 2026

### ISSUE SUMMARY
When users attempted to add a new barcode/label for a blood bag, the system was modifying existing entries instead of creating new records, causing loss of previous patient information.

### ROOT CAUSE IDENTIFIED
The critical issue was in `backend/lib/ScreeningService.php` line 64, which used MySQL's `ON DUPLICATE KEY UPDATE` clause:

```php
INSERT INTO inventory (...) VALUES (...) 
ON DUPLICATE KEY UPDATE blood_group=VALUES(...), volume_ml=VALUES(...), ...
```

**Why This Was Dangerous:**
1. **Silent Updates**: The query would silently UPDATE existing records instead of creating new ones
2. **Masked Errors**: Database constraint violations were hidden instead of failing loudly
3. **Data Overwrites**: If collection_id + component combination already existed, new screening data would overwrite inventory values
4. **No Audit Trail**: No distinction between what was inserted vs. updated

### ROOT CAUSE: Collections have a UNIQUE constraint on collection_code
```sql
UNIQUE KEY uq_inventory_collection_component (collection_id, component)
```

When ScreeningService tried to upsert inventory after a second screening, it would UPDATE the existing inventory instead of failing, potentially losing original attributes.

---

## FIXES IMPLEMENTED

### 1. ✅ Fixed ScreeningService.php (CRITICAL)
**File**: `backend/lib/ScreeningService.php`

**Changes**:
- Replaced `ON DUPLICATE KEY UPDATE` with explicit SELECT-then-INSERT-or-UPDATE logic
- Added proper error handling that throws exceptions on failure
- Each operation now clearly indicates whether it's creating or updating
- Added database error messages for debugging

**Benefits**:
- Eliminates silent updates that mask bugs
- Provides clear audit trail (INSERT vs UPDATE)
- Fails loudly on constraints instead of silently overwriting
- Better error messages

### 2. ✅ Enhanced Collections API (SECURITY)
**File**: `api/collections/index.php`

**Changes**:
- Added authentication check for POST/PUT operations
- Improved error handling for duplicate collection codes
- Returns HTTP 201 (Created) for successful POST requests
- Returns HTTP 409 (Conflict) with clear message for duplicates
- Better error reporting to frontend

### 3. ✅ Improved Collections Component (UX)
**File**: `frontend/src/pages/Collections.jsx`

**Changes**:
- Added explicit form validation before submission
- Better error handling for duplicate collection code errors
- Clearer distinction between "Add New" (POST) and "Edit" (PUT) operations
- User-friendly error messages displayed in the form

### 4. ✅ Enhanced Issuance API (VALIDATION)
**File**: `api/issuance/index.php`

**Changes**:
- Added required field validation
- Returns HTTP 201 (Created) for successful issuance
- Better error messages for missing data
- Prevents malformed requests from reaching the service layer

### 5. ✅ Created Data Integrity Audit Script (RECOVERY)
**File**: `backend/scripts/audit-data-integrity.php`

**Capabilities**:
- Detects duplicate collection codes
- Finds orphaned inventory records
- Identifies orphaned issuance records
- Reports inventory status inconsistencies
- Checks for multiple screening records per collection
- Provides comprehensive statistics
- Can be run periodically to monitor data health

---

## HOW TO VERIFY THE FIXES

### 1. Run the Data Integrity Audit
```bash
php backend/scripts/audit-data-integrity.php
```

This will:
- Check for any duplicate collection codes in your database
- Identify orphaned records that need cleanup
- Report any data inconsistencies
- Show overall statistics

### 2. Test the Collections Workflow
1. Navigate to "Collections" page
2. Click "Add Collection" button
3. Fill in form with:
   - Donor ID: Valid donor ID
   - Bag Number: Leave blank (auto-generate) or enter unique code
   - Collection Date: Today or earlier
   - Volume: 450
   - Click "Save"
4. Verify: New collection appears in the list
5. Click "Add Collection" again
6. Verify: Form is empty (not showing previous data)
7. Save again - should create a SECOND distinct record
8. Verify: Both records show in the list with different codes

### 3. Test Duplicate Prevention
1. Click "Add Collection"
2. Manually enter collection code used by existing collection
3. Try to save
4. Should see error: "This collection code already exists. Please use a different code."

### 4. Test Issuance Workflow
1. Go to "Issuance" page
2. Select a patient with compatible blood group
3. Select an available inventory unit
4. Click "Issue"
5. Verify: Record appears in "Issued History"
6. Try issuing the same unit again
7. Should fail with "unit_not_available" (since status is now 'issued')

---

## DATA RECOVERY OPTIONS

If you have experienced data loss:

### Option A: Recover from Backups
1. Check `/backups/` folder for recent backup files
2. Date-stamped backups are available (format: `bbms_YYYYMMDD_HHMMSS.sql`)
3. Restore using:
   ```bash
   mysql -u root -p bloodbank < backups/bbms_YYYYMMDD_HHMMSS.sql
   ```

### Option B: Manual Recovery (If Backup Not Available)
1. Run the audit script: `php backend/scripts/audit-data-integrity.php`
2. Examine database logs to see what was modified
3. Contact your system administrator with audit results
4. May need to manually reconstruct records from paper documentation or other sources

### Option C: Rollback Database
If your MySQL supports it, use `flashback` (if available in your version):
```sql
-- This requires binlogging and is MySQL version dependent
ROLLBACK;
```

---

## PREVENTIVE MEASURES GOING FORWARD

1. **Enable Transaction Logging**: Monitor the logs table for all create/update/delete operations
2. **Regular Audits**: Run the audit script weekly to catch any issues early
3. **Backups**: System automatically creates timestamped backups (check `/backups/` directory)
4. **Testing**: Before production releases, test:
   - Creating multiple record with similar data
   - Attempting to create duplicates
   - Verifying each operation appears in logs and appropriate tables

---

## FILES MODIFIED

| File | Change | Risk Level |
|------|--------|-----------|
| `backend/lib/ScreeningService.php` | Replaced ON DUPLICATE KEY UPDATE logic | **CRITICAL** |
| `api/collections/index.php` | Enhanced error handling | Medium |
| `frontend/src/pages/Collections.jsx` | Added validation/error messages | Low |
| `api/issuance/index.php` | Added validation | Low |
| `backend/scripts/audit-data-integrity.php` | New audit script | None (read-only) |

---

## TESTING CHECKLIST

- [ ] Run audit script and verify no critical issues reported
- [ ] Test creating 5 new collections
- [ ] Verify each has unique collection code
- [ ] Test duplicate code prevention
- [ ] Test issuing blood units
- [ ] Verify issuance prevents re-issue of same unit
- [ ] Check database logs for proper create/update actions
- [ ] Verify backups are being created

---

## SUPPORT & ESCALATION

If you continue to experience issues:

1. **Collect Evidence**:
   - Run: `php backend/scripts/audit-data-integrity.php` and save output
   - Check: `logs/` directory for application logs
   - Provide: Browser console errors

2. **Contact Support**:
   - Include audit report
   - Include exact steps to reproduce
   - Include error messages from UI and logs
   - Include screenshots if applicable

---

**Risk: Data Loss Bug + Severity: CRITICAL + Status: FIXED + Date: 2026-03-16**
