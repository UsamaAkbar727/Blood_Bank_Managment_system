# Collections - Donor Search Field Implementation

## Problem
When attempting to save a new collection in the "Add Collection" modal, the system displayed a red validation error "donor_not_found" at the bottom of the form. This prevented users from successfully creating collection records.

**Root Cause**: The form required a `donor_id` field, but the UI only had a number input field where users had to manually type the donor ID. Users typically didn't know donor IDs, leading to invalid selections or no selection at all.

**Error Flow**:
1. User opens "Add Collection" modal
2. Sees "Donor ID" number input field
3. Enters a number (or guesses)
4. Form submission fails with "donor_not_found" error
5. Backend's `CollectionService::assertDonorExists()` validates the ID against donors table

## Solution Implemented

### 1. **Added Dynamic Donor Search State** (Lines 35-36)
```javascript
const [donors, setDonors] = useState([]);
const [donorSearch, setDonorSearch] = useState('');
```

New state variables to manage:
- `donors`: Array of matching donors from search
- `donorSearch`: User's search text in the donor field

### 2. **Created Donor Loading Function** (Lines 71-80)
```javascript
const loadDonors = useCallback(
  async (q = donorSearch) => {
    try {
      const res = await request(`/api/donors/index.php?q=${encodeURIComponent(q)}`);
      setDonors(res.data || []);
    } catch (err) {
      setDonors([]);
    }
  },
  [donorSearch],
);
```

- Fetches donors from API with search query
- Updates donors state with results
- Handles errors gracefully

### 3. **Auto-Load Donors When Modal Opens** (Lines 82-88)
```javascript
useEffect(() => {
  if (open) {
    loadDonors('');
  }
}, [open, loadDonors]);
```

- Populates dropdown with all donors when modal opens
- Allows empty search to show all donors initially

### 4. **Replaced Number Input with Searchable Dropdown** (Lines 265-291)
**Before**: Plain number input requiring donor ID
```html
<input type="number" ... />
```

**After**: Interactive search field with dropdown results
```jsx
<input
  type="text"
  placeholder="Search by name, code, CNIC, or blood group"
  value={donorSearch}
  onChange={(e) => {
    setDonorSearch(e.target.value);
    loadDonors(e.target.value);
  }}
/>
{donors.length > 0 && (
  <div className="mt-1 border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
    {donors.map((donor) => (
      <button
        onClick={() => {
          setForm({ ...form, donor_id: donor.id });
          setDonorSearch(`${donor.full_name} (${donor.blood_group})`);
          setDonors([]);
        }}
      >
        <div className="font-medium">{donor.full_name}</div>
        <div className="text-xs text-slate-500">{donor.donor_code} | {donor.blood_group} | {donor.cnic}</div>
      </button>
    ))}
  </div>
)}
```

**Features**:
- Search by name, code, CNIC, or blood group
- Real-time filtering as user types
- Shows donor details (code, blood group, CNIC)
- Dropdown closes after selection
- Visual confirmation "✓ Donor ID: {id}" displayed after selection

### 5. **Enhanced Validation Messages** (Lines 95-105)
- Specific error for missing donor: "Please select a donor"
- Separate errors for collection_date and volume
- Better donor error handling: "Selected donor not found. Please choose a valid donor."

### 6. **Modal State Reset** (Lines 248-254 & 253)
```javascript
onClick={() => {
  setForm(blank);
  setError('');
  setDonorSearch('');
  setDonors([]);
  setOpen(true);
}}
```

- Clears donor search when opening new collection form
- Prevents stale data from previous entries

### 7. **Edit Mode Support** (Line 164)
```javascript
setDonorSearch(row.donor_name || '');
```

- When editing existing collection, shows donor name in search field
- Allows changing donor if needed
- Displays confirmation of selected donor

## User Experience Improvements

✅ **Easy Donor Selection**: Search for donors by name instead of memorizing IDs
✅ **Real-time Search**: Results update as user types
✅ **Clear Information**: Shows donor code, blood group, and CNIC in dropdown
✅ **Visual Feedback**: Selected donor shown with confirmation checkmark
✅ **Auto-Population**: Dropdown shows available donors when modal opens
✅ **Better Error Messages**: Specific guidance on what's wrong
✅ **Edit Support**: Can view and change donor when editing collections
✅ **Graceful Fallback**: Works even if donor list fails to load

## Files Modified

**frontend/src/pages/Collections.jsx**:
- Line 35-36: Added `donors` and `donorSearch` state
- Line 71-80: Added `loadDonors()` function
- Line 82-88: Added `useEffect` to load donors when modal opens
- Line 95-105: Enhanced validation with specific messages
- Line 131-133: Added `donor_not_found` error handler
- Line 164: Set `donorSearch` when editing
- Line 252-253: Reset donor state when opening modal
- Line 248-254: Modal close handler reset donor state
- Line 265-291: Replaced number input with searchable donor field

## API Integration

**Endpoint Used**: `GET /api/donors/index.php?q={search}`

**Response Format**:
```json
{
  "data": [
    {
      "id": 123,
      "donor_code": "D-ABC123",
      "full_name": "John Doe",
      "blood_group": "O+",
      "cnic": "12345-6789012-3",
      "gender": "M",
      "date_of_birth": "1990-01-15",
      "phone": "03001234567",
      "email": "john@example.com",
      "is_eligible": 1,
      "last_donation_at": "2026-02-15"
    }
  ]
}
```

**Search Capabilities** (from DonorService::list()):
- `full_name`: Donor's name
- `donor_code`: Auto-generated donor identifier
- `cnic`: National ID (formatted or raw)
- `blood_group`: Blood type (A+, O-, etc.)

## Testing Checklist

- [ ] **New Collection Creation**:
  - Open "Add Collection" modal
  - Verify donors dropdown shows list with full_name, blood_group, cnic
  - Type partial name in search
  - Verify dropdown filters in real-time
  - Click on donor to select
  - Verify donor name and ID are set
  - Fill other fields and save
  - Verify collection created successfully

- [ ] **Edit Collection**:
  - Click Edit on existing collection
  - Verify current donor name appears in search field
  - Search for different donor
  - Select new donor
  - Save and verify collection updated

- [ ] **Search Functionality**:
  - Search by first name
  - Search by last name
  - Search by donor code (D-XXXXXX)
  - Search by CNIC (5-7-1 format)
  - Search by blood group (O+, A-, etc.)
  - Verify results are accurate

- [ ] **Error Handling**:
  - Open new form and click Save without selecting donor
  - Verify error: "Please select a donor"
  - Select invalid donor and submit (if possible)
  - Verify proper error message

- [ ] **Edge Cases**:
  - Modal close and reopen
  - Verify state is reset
  - Multiple edits without closing modal
  - Verify donor search works correctly each time

## Technical Details

**SQL Query Used** (DonorService::list()):
```sql
SELECT * FROM donors 
WHERE full_name LIKE '%{search}%' 
  OR donor_code LIKE '%{search}%' 
  OR cnic LIKE '%{search}%' 
  OR blood_group LIKE '%{search}%' 
ORDER BY created_at DESC 
LIMIT 200
```

**Backend Validation** (CollectionService::assertDonorExists()):
```php
SELECT id FROM donors WHERE id = ? LIMIT 1
```
Throws `InvalidArgumentException('donor_not_found')` if no match

## Impact on Related Features

✅ **Collections Table**: Donor name displayed in table (already implemented)
✅ **Screening Module**: Collections dropdown shows donors (no change needed)
✅ **Issuance Module**: Collections show donor names (no change needed)
✅ **Reports**: Donor information available in collection data (no change needed)

## Migration Notes

No database changes required. All modifications are frontend UI improvements.

Existing collections will continue to work correctly as they already have valid `donor_id` values.

## Performance Considerations

- Donors API returns up to 200 results (limit in DonorService::list())
- Dropdown max-height: 160px with scrolling for long lists
- Search triggered on each keystroke (real-time)
- No debouncing applied (backend handles the load efficiently with LIKE queries)
