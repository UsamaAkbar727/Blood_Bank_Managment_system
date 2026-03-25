<?php
require_once __DIR__ . '/Permissions.php';
require_once __DIR__ . '/LogService.php';
require_once __DIR__ . '/SettingsService.php';
require_once __DIR__ . '/MedicalCriteriaService.php';

class ScreeningService
{
    private const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    private const REACTIVE_FIELDS = ['hbsag', 'hcv', 'hiv', 'malaria', 'syphilis'];

    private static function normalizeReactiveFlag($value): int
    {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        if (is_int($value)) {
            return $value === 0 ? 0 : 1;
        }
        if (is_float($value)) {
            return $value == 0.0 ? 0 : 1;
        }
        if (is_string($value)) {
            $normalized = strtolower(trim($value));
            if ($normalized === '' || $normalized === '0' || $normalized === 'false' || $normalized === 'no' || $normalized === 'off' || $normalized === 'non-reactive' || $normalized === 'negative') {
                return 0;
            }
            if ($normalized === '1' || $normalized === 'true' || $normalized === 'yes' || $normalized === 'on' || $normalized === 'reactive' || $normalized === 'positive') {
                return 1;
            }
        }
        return $value ? 1 : 0;
    }

    private static function sanitize(array $input): array
    {
        $collectionId = (int)($input['collection_id'] ?? 0);
        if ($collectionId <= 0) {
            throw new InvalidArgumentException('missing_collection_id');
        }

        $testDate = $input['test_date'] ?? date('Y-m-d H:i:s');

        $resultStatus = $input['result_status'] ?? 'pending';
        if (!in_array($resultStatus, ['pending', 'safe', 'rejected'], true)) {
            throw new InvalidArgumentException('invalid_result_status');
        }

        return [
            'id' => isset($input['id']) ? (int)$input['id'] : 0,
            'collection_id' => $collectionId,
            'tested_by' => isset($input['tested_by']) ? (int)$input['tested_by'] : null,
            'test_date' => $testDate,
            'hbsag' => self::normalizeReactiveFlag($input['hbsag'] ?? 0),
            'hcv' => self::normalizeReactiveFlag($input['hcv'] ?? 0),
            'hiv' => self::normalizeReactiveFlag($input['hiv'] ?? 0),
            'malaria' => self::normalizeReactiveFlag($input['malaria'] ?? 0),
            'syphilis' => self::normalizeReactiveFlag($input['syphilis'] ?? 0),
            'blood_group_confirmed' => null,
            'hemoglobin_level' => $input['hemoglobin_level'] ?? null,
            'result_status' => $resultStatus,
            'remarks' => $input['remarks'] ?? null,
        ];
    }

    private static function computeResultStatus(array $data): string
    {
        foreach (self::REACTIVE_FIELDS as $field) {
            if (self::normalizeReactiveFlag($data[$field] ?? 0) === 1) {
                return 'rejected';
            }
        }
        return 'safe';
    }

    private static function collectionData(int $collectionId): ?array
    {
        $stmt = db()->prepare('SELECT * FROM collections WHERE id=? LIMIT 1');
        $stmt->bind_param('i', $collectionId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    private static function collectionBloodGroup(int $collectionId): ?string
    {
        $stmt = db()->prepare('SELECT d.blood_group FROM collections c JOIN donors d ON d.id = c.donor_id WHERE c.id=? LIMIT 1');
        $stmt->bind_param('i', $collectionId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ? $row['blood_group'] : null;
    }

    private static function upsertInventory(array $collection, array $screen): void
    {
        $component = 'Whole Blood';
        $rule = SettingsService::ruleForComponent($component);
        $expiry = $collection['expiry_date_override']
            ?: date('Y-m-d', strtotime($collection['collection_date'] . ' +' . $rule['shelf_life_days'] . ' days'));
        $status = 'available';
        $location = $collection['collection_site'] ?: 'Main Cold Room';
        
        // Check if inventory already exists for this collection and component
        $checkStmt = db()->prepare('SELECT id FROM inventory WHERE collection_id = ? AND component = ? LIMIT 1');
        $checkStmt->bind_param('is', $collection['id'], $component);
        $checkStmt->execute();
        $existingInventory = $checkStmt->get_result()->fetch_assoc();
        $checkStmt->close();
        
        if ($existingInventory) {
            // UPDATE existing inventory record
            $stmt = db()->prepare('UPDATE inventory SET blood_group=?, volume_ml=?, expiry_date=?, status=? WHERE id=?');
            $stmt->bind_param(
                'sissi',
                $screen['blood_group_confirmed'],
                $collection['volume_ml'],
                $expiry,
                $status,
                $existingInventory['id']
            );
            if (!$stmt->execute()) {
                throw new RuntimeException('Failed to update inventory: ' . $stmt->error);
            }
            $stmt->close();
        } else {
            // INSERT new inventory record
            $stmt = db()->prepare('INSERT INTO inventory (collection_id, component, blood_group, volume_ml, units_available, storage_location, expiry_date, status) VALUES (?,?,?,?,?,?,?,?)');
            $units = 1;
            $stmt->bind_param(
                'isssisss',
                $collection['id'],
                $component,
                $screen['blood_group_confirmed'],
                $collection['volume_ml'],
                $units,
                $location,
                $expiry,
                $status
            );
            if (!$stmt->execute()) {
                throw new RuntimeException('Failed to create inventory: ' . $stmt->error);
            }
            $stmt->close();
        }
    }

    private static function discardInventory(int $collectionId): void
    {
        $stmt = db()->prepare('UPDATE inventory SET status="discarded" WHERE collection_id = ?');
        $stmt->bind_param('i', $collectionId);
        $stmt->execute();
        $stmt->close();
    }

    private static function screeningDataById(int $id): ?array
    {
        $stmt = db()->prepare('SELECT * FROM screening_tests WHERE id=? LIMIT 1');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    private static function applyCollectionState(int $collectionId, string $resultStatus, array $screen, array $collection): void
    {
        if ($resultStatus === 'safe') {
            $stmt = db()->prepare('UPDATE collections SET status="safe" WHERE id=?');
            $stmt->bind_param('i', $collectionId);
            $stmt->execute();
            $stmt->close();
            self::upsertInventory($collection, $screen);
            return;
        }

        if ($resultStatus === 'rejected') {
            $stmt = db()->prepare('UPDATE collections SET status="rejected" WHERE id=?');
            $stmt->bind_param('i', $collectionId);
            $stmt->execute();
            $stmt->close();
            self::discardInventory($collectionId);
            return;
        }

        $stmt = db()->prepare('UPDATE collections SET status="screening" WHERE id=?');
        $stmt->bind_param('i', $collectionId);
        $stmt->execute();
        $stmt->close();
        self::discardInventory($collectionId);
    }

    public static function save(array $input, ?int $id = null): array
    {
        Permissions::allow('screening');
        $data = self::sanitize($input);
        $targetId = (int)($id ?? $data['id']);

        $collection = self::collectionData($data['collection_id']);
        if (!$collection) {
            throw new InvalidArgumentException('collection_not_found');
        }

        $bloodGroup = self::collectionBloodGroup($data['collection_id']);
        if (!$bloodGroup || !in_array($bloodGroup, self::BLOOD_GROUPS, true)) {
            throw new InvalidArgumentException('invalid_blood_group');
        }
        $data['blood_group_confirmed'] = $bloodGroup;

        if ($targetId > 0) {
            $existing = self::screeningDataById($targetId);
            if (!$existing) {
                throw new InvalidArgumentException('screening_not_found');
            }
            if ((int)$existing['collection_id'] !== $data['collection_id']) {
                throw new RuntimeException('collection_change_not_allowed');
            }
        }

        $data['result_status'] = self::computeResultStatus($data);

        // Extract parameters to local variables to ensure they are passed by reference
        $colId = (int)$data['collection_id'];
        $testedBy = $data['tested_by'];
        $testDate = $data['test_date'];
        $hbsag = (int)$data['hbsag'];
        $hcv = (int)$data['hcv'];
        $hiv = (int)$data['hiv'];
        $malaria = (int)$data['malaria'];
        $syphilis = (int)$data['syphilis'];
        $bgConfirmed = $data['blood_group_confirmed'];
        $hbLevel = $data['hemoglobin_level'];
        $resStatus = $data['result_status'];
        $remarks = $data['remarks'];

        if ($targetId > 0) {
            $stmt = db()->prepare('UPDATE screening_tests SET tested_by=?, test_date=?, hbsag=?, hcv=?, hiv=?, malaria=?, syphilis=?, blood_group_confirmed=?, hemoglobin_level=?, result_status=?, remarks=? WHERE id=?');
            if (!$stmt) {
                throw new RuntimeException('screening_update_prepare_failed');
            }
            $stmt->bind_param(
                'isiiiiisdssi',
                $testedBy,
                $testDate,
                $hbsag,
                $hcv,
                $hiv,
                $malaria,
                $syphilis,
                $bgConfirmed,
                $hbLevel,
                $resStatus,
                $remarks,
                $targetId
            );
        } else {
            $stmt = db()->prepare('INSERT INTO screening_tests (collection_id, tested_by, test_date, hbsag, hcv, hiv, malaria, syphilis, blood_group_confirmed, hemoglobin_level, result_status, remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
            if (!$stmt) {
                throw new RuntimeException('screening_insert_prepare_failed');
            }
            $stmt->bind_param(
                'iisiiiiisdss',
                $colId,
                $testedBy,
                $testDate,
                $hbsag,
                $hcv,
                $hiv,
                $malaria,
                $syphilis,
                $bgConfirmed,
                $hbLevel,
                $resStatus,
                $remarks
            );
        }
        if (!$stmt) {
            throw new RuntimeException('screening_stmt_invalid_before_execute');
        }
        try {
            if (!$stmt->execute()) {
                $errorCode = (int)$stmt->errno;
                if ($errorCode === 1062) {
                    throw new RuntimeException('screening_already_exists');
                }
                throw new RuntimeException('screening_save_failed: ' . $stmt->error);
            }
            $savedId = $targetId > 0 ? $targetId : $stmt->insert_id;
        } catch (Throwable $e) {
            if (isset($stmt) && $stmt instanceof mysqli_stmt) {
                @$stmt->close();
            }
            throw $e;
        }

        $stmt->close();

        self::applyCollectionState($data['collection_id'], $data['result_status'], $data, $collection);
        LogService::write($data['tested_by'] ?? null, $targetId > 0 ? 'update' : 'create', 'screening', $savedId);
        MedicalCriteriaService::applyToDonor((int)$collection['donor_id'], $data['tested_by'] ?? null);

        return self::get($savedId);
    }

    public static function delete(int $id): bool
    {
        Permissions::allow('screening');
        $existing = self::screeningDataById($id);
        if (!$existing) {
            return false;
        }

        $stmt = db()->prepare('DELETE FROM screening_tests WHERE id=?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $deleted = $stmt->affected_rows > 0;
        $stmt->close();

        if ($deleted) {
            $collectionId = (int)$existing['collection_id'];
            $stmt = db()->prepare('UPDATE collections SET status="pending_screen" WHERE id=?');
            $stmt->bind_param('i', $collectionId);
            $stmt->execute();
            $stmt->close();
            self::discardInventory($collectionId);
            LogService::write($existing['tested_by'] ? (int)$existing['tested_by'] : null, 'delete', 'screening', $id);
            $collection = self::collectionData($collectionId);
            if ($collection) {
                MedicalCriteriaService::applyToDonor((int)$collection['donor_id'], $existing['tested_by'] ? (int)$existing['tested_by'] : null);
            }
        }

        return $deleted;
    }

    public static function get(int $id): ?array
    {
        Permissions::allow('screening');
        $stmt = db()->prepare('SELECT st.*, c.collection_code, c.collection_date, c.status AS collection_status, d.full_name AS donor_name, d.blood_group AS donor_blood FROM screening_tests st JOIN collections c ON c.id = st.collection_id JOIN donors d ON d.id = c.donor_id WHERE st.id=? LIMIT 1');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    public static function getByCollection(int $collectionId): ?array
    {
        Permissions::allow('screening');
        $stmt = db()->prepare('SELECT st.*, c.collection_code, c.collection_date, c.status AS collection_status, d.full_name AS donor_name, d.blood_group AS donor_blood FROM screening_tests st JOIN collections c ON c.id = st.collection_id JOIN donors d ON d.id = c.donor_id WHERE st.collection_id=? LIMIT 1');
        $stmt->bind_param('i', $collectionId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    public static function list(string $search = ''): array
    {
        Permissions::allow('screening');
        $like = '%' . $search . '%';
        $stmt = db()->prepare('SELECT st.*, c.collection_code, c.collection_date, c.status AS collection_status, d.full_name AS donor_name, d.blood_group AS donor_blood FROM screening_tests st JOIN collections c ON c.id = st.collection_id JOIN donors d ON d.id = c.donor_id WHERE c.collection_code LIKE ? OR d.full_name LIKE ? OR st.result_status LIKE ? ORDER BY st.test_date DESC LIMIT 200');
        $stmt->bind_param('sss', $like, $like, $like);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public static function listCollections(string $search = ''): array
    {
        Permissions::allow('screening');
        $like = '%' . $search . '%';
        $stmt = db()->prepare('SELECT c.id, c.collection_code, c.collection_date, c.status, c.volume_ml, d.full_name AS donor_name, d.blood_group FROM collections c JOIN donors d ON d.id = c.donor_id WHERE c.collection_code LIKE ? OR d.full_name LIKE ? OR d.blood_group LIKE ? ORDER BY c.collection_date DESC LIMIT 200');
        $stmt->bind_param('sss', $like, $like, $like);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }
}
