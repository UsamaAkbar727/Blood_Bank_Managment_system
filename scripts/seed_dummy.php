<?php
require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/db.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function rand_item(array $items) {
    return $items[array_rand($items)];
}

function insertRow(mysqli $db, string $table, array $data): int {
    $cols = array_keys($data);
    $placeholders = implode(',', array_fill(0, count($cols), '?'));
    $sql = 'INSERT INTO ' . $table . ' (' . implode(',', $cols) . ') VALUES (' . $placeholders . ')';
    $stmt = $db->prepare($sql);

    $types = '';
    $values = [];
    foreach ($data as $val) {
        if (is_int($val)) {
            $types .= 'i';
        } elseif (is_float($val)) {
            $types .= 'd';
        } elseif (is_null($val)) {
            $types .= 's';
            $val = null;
        } else {
            $types .= 's';
        }
        $values[] = $val;
    }

    $stmt->bind_param($types, ...$values);
    $stmt->execute();
    return $db->insert_id;
}

function getCount(mysqli $db, string $table): int {
    $res = $db->query('SELECT COUNT(*) AS c FROM ' . $table);
    $row = $res->fetch_assoc();
    return (int)$row['c'];
}

function getMaxId(mysqli $db, string $table): int {
    $res = $db->query('SELECT COALESCE(MAX(id), 0) AS m FROM ' . $table);
    $row = $res->fetch_assoc();
    return (int)$row['m'];
}

function getUserIdByUsername(mysqli $db, string $username): ?int {
    $stmt = $db->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();
    return $row ? (int)$row['id'] : null;
}

function ensureUser(mysqli $db, string $name, string $username, string $role, string $phone, string $password): int {
    $existing = getUserIdByUsername($db, $username);
    if ($existing) return $existing;
    $hash = password_hash($password, PASSWORD_BCRYPT);
    return insertRow($db, 'users', [
        'name' => $name,
        'username' => $username,
        'phone' => $phone,
        'role' => $role,
        'password_hash' => $hash,
        'status' => 'active',
        'last_login_at' => null,
    ]);
}

$db = db();
$db->begin_transaction();

$target = 12;

// Users
$usersSeed = [
    ['Ayesha Khan', 'admin.demo', 'admin', '+92-300-1000001'],
    ['Bilal Ahmed', 'staff.demo', 'staff', '+92-300-1000002'],
    ['Dr. Sara Malik', 'doctor.demo', 'doctor', '+92-300-1000003'],
    ['Hassan Raza', 'lab.demo', 'lab_tech', '+92-300-1000004'],
    ['Imran Ali', 'inventory.demo', 'inventory', '+92-300-1000005'],
    ['Kiran Fatima', 'cashier.demo', 'cashier', '+92-300-1000006'],
    ['Noman Tariq', 'clerk.demo', 'clerk', '+92-300-1000007'],
];

$userIds = [];
foreach ($usersSeed as $u) {
    $userIds[] = ensureUser($db, $u[0], $u[1], $u[2], $u[3], 'test1234');
}
$adminId = $userIds[0];
$staffId = $userIds[1];
$doctorId = $userIds[2];
$labId = $userIds[3];

// Donors
$donorCount = getCount($db, 'donors');
$donorNeed = max(0, $target - $donorCount);
$donorMax = getMaxId($db, 'donors');

$firstNames = ['Ali', 'Fatima', 'Usman', 'Zara', 'Hamza', 'Iqra', 'Saad', 'Noor', 'Omar', 'Aiman', 'Hiba', 'Farhan', 'Sana', 'Adnan', 'Hira'];
$lastNames = ['Khan', 'Ahmed', 'Malik', 'Raza', 'Sheikh', 'Butt', 'Chaudhry', 'Siddiqui', 'Qureshi', 'Javed'];
$cities = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar'];
$bloodGroups = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
$genders = ['male','female','other'];

$newDonorIds = [];
for ($i = 1; $i <= $donorNeed; $i++) {
    $idx = $donorMax + $i;
    $full = rand_item($firstNames) . ' ' . rand_item($lastNames);
    $gender = rand_item($genders);
    $dob = date('Y-m-d', strtotime('-' . rand(19, 55) . ' years'));
    $bg = rand_item($bloodGroups);
    $city = rand_item($cities);
    $donorCode = 'D-TEST-' . str_pad((string)$idx, 3, '0', STR_PAD_LEFT);
    $cnic = '35202-' . str_pad((string)(1000000 + $idx), 7, '0', STR_PAD_LEFT) . '-' . rand(1,9);
    $phone = '+92-3' . rand(10, 49) . rand(1000000, 9999999);
    $email = strtolower(str_replace(' ', '.', $full)) . $idx . '@example.com';
    $lastDonation = rand(0,1) ? date('Y-m-d', strtotime('-' . rand(10, 120) . ' days')) : null;

    $newDonorIds[] = insertRow($db, 'donors', [
        'donor_code' => $donorCode,
        'cnic' => $cnic,
        'full_name' => $full,
        'gender' => $gender,
        'date_of_birth' => $dob,
        'blood_group' => $bg,
        'phone' => $phone,
        'email' => $email,
        'address' => rand(1,999) . ' ' . rand_item(['Street', 'Avenue', 'Road']) . ', ' . $city,
        'city' => $city,
        'last_donation_at' => $lastDonation,
        'is_eligible' => rand(0,10) > 1 ? 1 : 0,
        'created_by' => $adminId,
    ]);
}

// Collections
$collectionCount = getCount($db, 'collections');
$collectionNeed = max(0, $target - $collectionCount);
$collectionMax = getMaxId($db, 'collections');

$donorIds = [];
$res = $db->query('SELECT id FROM donors ORDER BY id ASC');
while ($row = $res->fetch_assoc()) {
    $donorIds[] = (int)$row['id'];
}

$newCollectionIds = [];
for ($i = 1; $i <= $collectionNeed && count($donorIds) > 0; $i++) {
    $idx = $collectionMax + $i;
    $donorId = $donorIds[($idx - 1) % count($donorIds)];
    $collectionDate = date('Y-m-d H:i:s', strtotime('-' . rand(1, 90) . ' days'));
    $status = rand_item(['pending_screen','screening','safe','stored']);
    $bagType = rand_item(['350ml','450ml']);
    $volume = $bagType === '350ml' ? 350 : 450;
    $newCollectionIds[] = insertRow($db, 'collections', [
        'collection_code' => 'C-TEST-' . str_pad((string)$idx, 3, '0', STR_PAD_LEFT),
        'donor_id' => $donorId,
        'collected_by' => $staffId,
        'collection_date' => $collectionDate,
        'bag_type' => $bagType,
        'volume_ml' => $volume,
        'collection_site' => rand_item(['Main Center', 'Mobile Camp', 'City Hospital']),
        'remarks' => rand_item(['Routine donation', 'Walk-in donor', 'Camp drive']),
        'status' => $status,
    ]);
}

// Screening tests
$screeningCount = getCount($db, 'screening_tests');
$screeningNeed = max(0, $target - $screeningCount);

if ($screeningNeed > 0) {
    $res = $db->query('SELECT c.id AS collection_id, d.blood_group FROM collections c JOIN donors d ON d.id = c.donor_id LEFT JOIN screening_tests s ON s.collection_id = c.id WHERE s.id IS NULL ORDER BY c.id ASC');
    $rows = [];
    while ($row = $res->fetch_assoc()) {
        $rows[] = $row;
    }

    for ($i = 0; $i < min($screeningNeed, count($rows)); $i++) {
        $row = $rows[$i];
        $result = rand_item(['safe','safe','pending','rejected']);
        insertRow($db, 'screening_tests', [
            'collection_id' => (int)$row['collection_id'],
            'tested_by' => $labId,
            'test_date' => date('Y-m-d H:i:s', strtotime('-' . rand(1, 60) . ' days')),
            'hbsag' => $result === 'rejected' ? 1 : 0,
            'hcv' => $result === 'rejected' ? 1 : 0,
            'hiv' => 0,
            'malaria' => 0,
            'syphilis' => 0,
            'blood_group_confirmed' => $row['blood_group'],
            'hemoglobin_level' => rand(120, 160) / 10,
            'result_status' => $result,
            'remarks' => $result === 'rejected' ? 'Reactive marker detected' : 'All clear',
        ]);
    }
}

// Inventory
$inventoryCount = getCount($db, 'inventory');
$inventoryNeed = max(0, $target - $inventoryCount);

if ($inventoryNeed > 0) {
    $res = $db->query('SELECT c.id AS collection_id, d.blood_group, c.collection_date FROM collections c JOIN donors d ON d.id = c.donor_id LEFT JOIN inventory i ON i.collection_id = c.id WHERE i.id IS NULL ORDER BY c.id ASC');
    $rows = [];
    while ($row = $res->fetch_assoc()) {
        $rows[] = $row;
    }

    $components = ['Whole Blood','PRBC','Platelets','FFP'];
    for ($i = 0; $i < min($inventoryNeed, count($rows)); $i++) {
        $row = $rows[$i];
        $component = rand_item($components);
        $colDate = $row['collection_date'];
        $expiryDays = $component === 'Platelets' ? 5 : ($component === 'FFP' ? 365 : 42);
        $expiry = date('Y-m-d', strtotime($colDate . ' +' . $expiryDays . ' days'));
        insertRow($db, 'inventory', [
            'collection_id' => (int)$row['collection_id'],
            'component' => $component,
            'blood_group' => $row['blood_group'],
            'volume_ml' => rand(200, 450),
            'units_available' => 1,
            'storage_location' => rand_item(['Freezer A', 'Shelf B', 'Rack C']),
            'expiry_date' => $expiry,
            'status' => rand_item(['available','available','reserved']),
        ]);
    }
}

// Patients
$patientCount = getCount($db, 'patients');
$patientNeed = max(0, $target - $patientCount);
$patientMax = getMaxId($db, 'patients');

$diagnosis = ['Anemia', 'Surgery', 'Trauma', 'Thalassemia', 'Postpartum hemorrhage'];
$hospitals = ['City Hospital', 'Central Medical', 'Mercy Clinic', 'Regional Health Center'];

for ($i = 1; $i <= $patientNeed; $i++) {
    $idx = $patientMax + $i;
    $full = rand_item($firstNames) . ' ' . rand_item($lastNames);
    insertRow($db, 'patients', [
        'patient_code' => 'P-TEST-' . str_pad((string)$idx, 3, '0', STR_PAD_LEFT),
        'full_name' => $full,
        'gender' => rand_item($genders),
        'date_of_birth' => date('Y-m-d', strtotime('-' . rand(5, 70) . ' years')),
        'blood_group' => rand_item($bloodGroups),
        'diagnosis' => rand_item($diagnosis),
        'attending_doctor_id' => $doctorId,
        'hospital_name' => rand_item($hospitals),
        'status' => rand_item(['active','active','discharged']),
    ]);
}

// Blood issuance
$issuanceCount = getCount($db, 'blood_issuance');
$issuanceNeed = max(0, 8 - $issuanceCount);
if ($issuanceNeed > 0) {
    $inv = [];
    $res = $db->query("SELECT id FROM inventory WHERE status IN ('available','reserved') ORDER BY id ASC");
    while ($row = $res->fetch_assoc()) $inv[] = (int)$row['id'];

    $pat = [];
    $res = $db->query('SELECT id FROM patients ORDER BY id ASC');
    while ($row = $res->fetch_assoc()) $pat[] = (int)$row['id'];

    for ($i = 0; $i < min($issuanceNeed, count($inv), count($pat)); $i++) {
        $issueDate = date('Y-m-d H:i:s', strtotime('-' . rand(1, 30) . ' days'));
        insertRow($db, 'blood_issuance', [
            'inventory_id' => $inv[$i],
            'patient_id' => $pat[$i % count($pat)],
            'issued_by' => $staffId,
            'issue_date' => $issueDate,
            'units_issued' => 1,
            'crossmatch_result' => rand_item(['compatible','compatible','not_applicable']),
            'reactions_reported' => 0,
            'status' => 'issued',
            'remarks' => 'Issued for treatment',
        ]);
        $db->query('UPDATE inventory SET status = "issued" WHERE id = ' . (int)$inv[$i]);
    }
}

// Expenses
$expensesCount = getCount($db, 'expenses');
$expensesNeed = max(0, $target - $expensesCount);
$expenseCategories = ['Supplies', 'Maintenance', 'Utilities', 'Transport', 'Lab Reagents'];
for ($i = 0; $i < $expensesNeed; $i++) {
    insertRow($db, 'expenses', [
        'category' => rand_item($expenseCategories),
        'description' => rand_item(['Routine purchase', 'Monthly bill', 'Equipment service', 'Courier charges']),
        'amount' => rand(1500, 25000) + (rand(0,99) / 100),
        'incurred_on' => date('Y-m-d', strtotime('-' . rand(1, 90) . ' days')),
        'recorded_by' => $staffId,
    ]);
}

// Blood pricing
$pricingCount = getCount($db, 'blood_pricing');
if ($pricingCount < $target) {
    $components = ['Whole Blood','PRBC','Platelets','FFP'];
    $groups = ['A+','B+','O+','AB+'];
    foreach ($components as $comp) {
        foreach ($groups as $bg) {
            if (getCount($db, 'blood_pricing') >= $target) break 2;
            insertRow($db, 'blood_pricing', [
                'component' => $comp,
                'blood_group' => $bg,
                'unit_cost' => rand(3500, 9000),
                'effective_from' => date('Y-m-d', strtotime('-30 days')),
                'created_by' => $adminId,
            ]);
        }
    }
}

// Billing records
$billingCount = getCount($db, 'billing_records');
$billingNeed = max(0, 8 - $billingCount);
if ($billingNeed > 0) {
    $res = $db->query('SELECT b.id AS issuance_id, b.patient_id, b.issue_date FROM blood_issuance b LEFT JOIN billing_records r ON r.issuance_id = b.id WHERE r.id IS NULL ORDER BY b.id ASC');
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    for ($i = 0; $i < min($billingNeed, count($rows)); $i++) {
        $row = $rows[$i];
        $status = rand_item(['paid','unpaid']);
        $amount = rand(5000, 15000);
        insertRow($db, 'billing_records', [
            'invoice_no' => 'INV-' . str_pad((string)($row['issuance_id']), 5, '0', STR_PAD_LEFT),
            'patient_id' => (int)$row['patient_id'],
            'issuance_id' => (int)$row['issuance_id'],
            'amount' => $amount,
            'discount' => rand(0, 500),
            'status' => $status,
            'issued_on' => $row['issue_date'],
            'paid_on' => $status === 'paid' ? date('Y-m-d H:i:s', strtotime($row['issue_date'] . ' +1 day')) : null,
        ]);
    }
}

// Logs
$logsCount = getCount($db, 'logs');
$logsNeed = max(0, $target - $logsCount);
$actions = ['create','update','delete','login','logout'];
$entities = ['donor','collection','inventory','patient','issuance'];
for ($i = 0; $i < $logsNeed; $i++) {
    insertRow($db, 'logs', [
        'user_id' => rand_item($userIds),
        'action' => rand_item($actions),
        'entity_type' => rand_item($entities),
        'entity_id' => rand(1, 20),
        'ip_address' => '127.0.0.1',
        'user_agent' => 'SeedScript/1.0',
    ]);
}

// Notifications
$notifCount = getCount($db, 'notifications');
$notifNeed = max(0, $target - $notifCount);
for ($i = 0; $i < $notifNeed; $i++) {
    insertRow($db, 'notifications', [
        'user_id' => rand_item([null, ...$userIds]),
        'type' => rand_item(['info','warning','success','danger']),
        'title' => rand_item(['Reminder','System Alert','Report Ready','Maintenance']),
        'message' => rand_item([
            'Scheduled maintenance tonight at 10 PM.',
            'Monthly report is ready for review.',
            'Please verify inventory counts.',
            'New donor registrations this week.'
        ]),
        'is_read' => rand(0,1),
    ]);
}

// Backup logs
$backupCount = getCount($db, 'backup_logs');
$backupNeed = max(0, $target - $backupCount);
for ($i = 0; $i < $backupNeed; $i++) {
    $status = rand_item(['success','failed']);
    insertRow($db, 'backup_logs', [
        'file_name' => 'backup_' . date('Ymd_His', strtotime('-' . rand(1, 20) . ' days')) . '.sql',
        'file_path' => '/backups/backup_' . date('Ymd_His', strtotime('-' . rand(1, 20) . ' days')) . '.sql',
        'file_size_bytes' => rand(100000, 4000000),
        'status' => $status,
        'message' => $status === 'success' ? 'Backup completed' : 'Backup failed',
        'uploaded_to_drive' => $status === 'success' ? rand(0,1) : 0,
    ]);
}

$db->commit();

echo "Seed complete.\n";
