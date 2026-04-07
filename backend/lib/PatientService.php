<?php
require_once __DIR__ . '/Permissions.php';

class PatientService
{
    private static function sanitize(array $input): array
    {
        $name = trim($input['full_name'] ?? $input['name'] ?? '');
        $patientCode = trim($input['patient_code'] ?? '');
        $gender = $input['gender'] ?? '';
        $blood = $input['blood_group'] ?? '';
        $age = isset($input['age']) && $input['age'] !== '' ? (int)$input['age'] : null;
        $contact = trim($input['contact'] ?? $input['phone'] ?? '');
        $hospitalId = isset($input['hospital_id']) && $input['hospital_id'] !== '' ? (int)$input['hospital_id'] : null;
        $hospitalName = trim($input['hospital_name'] ?? '');
        $wardName = trim($input['ward_name'] ?? '');
        $location = $hospitalName !== '' ? $hospitalName : $wardName;
        $status = $input['status'] ?? 'active';
        $medicalHistory = $input['medical_history'] ?? ($input['diagnosis'] ?? null);

        if ($name === '' || $blood === '' || $gender === '') {
            throw new InvalidArgumentException('missing_fields');
        }

        if ($patientCode === '') {
            $patientCode = 'PAT-' . strtoupper(bin2hex(random_bytes(3)));
        }

        $dateOfBirth = $input['date_of_birth'] ?? null;
        if (($dateOfBirth === null || $dateOfBirth === '') && $age !== null && $age > 0) {
            $dateOfBirth = (new DateTimeImmutable('today'))->sub(new DateInterval('P' . $age . 'Y'))->format('Y-m-d');
        }

        return [
            'patient_code' => $patientCode,
            'full_name' => $name,
            'gender' => $gender,
            'date_of_birth' => $dateOfBirth,
            'age' => $age,
            'blood_group' => $blood,
            'contact' => $contact !== '' ? $contact : null,
            'hospital_id' => $hospitalId,
            'hospital_name' => $location !== '' ? $location : null,
            'medical_history' => $medicalHistory,
            'status' => $status,
        ];
    }

    public static function create(array $input): array
    {
        Permissions::allow('patients');
        $data = self::sanitize($input);
        $stmt = db()->prepare('INSERT INTO patients (patient_code, full_name, gender, date_of_birth, age, blood_group, contact, hospital_id, hospital_name, medical_history, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
        $stmt->bind_param(
            'ssssississs',
            $data['patient_code'],
            $data['full_name'],
            $data['gender'],
            $data['date_of_birth'],
            $data['age'],
            $data['blood_group'],
            $data['contact'],
            $data['hospital_id'],
            $data['hospital_name'],
            $data['medical_history'],
            $data['status']
        );
        if (!$stmt->execute()) {
            $error = $stmt->errno === 1062 ? 'duplicate_patient_code' : 'db_error';
            $stmt->close();
            throw new RuntimeException($error);
        }
        $id = $stmt->insert_id;
        $stmt->close();
        return self::get($id);
    }

    public static function update(int $id, array $input): array
    {
        Permissions::allow('patients');
        $data = self::sanitize($input);
        $stmt = db()->prepare('UPDATE patients SET patient_code=?, full_name=?, gender=?, date_of_birth=?, age=?, blood_group=?, contact=?, hospital_id=?, hospital_name=?, medical_history=?, status=? WHERE id=?');
        $stmt->bind_param(
            'ssssississsi',
            $data['patient_code'],
            $data['full_name'],
            $data['gender'],
            $data['date_of_birth'],
            $data['age'],
            $data['blood_group'],
            $data['contact'],
            $data['hospital_id'],
            $data['hospital_name'],
            $data['medical_history'],
            $data['status'],
            $id
        );
        if (!$stmt->execute()) {
            $error = $stmt->errno === 1062 ? 'duplicate_patient_code' : 'db_error';
            $stmt->close();
            throw new RuntimeException($error);
        }
        $stmt->close();
        return self::get($id);
    }

    public static function delete(int $id): bool
    {
        Permissions::allow('patients');

        $dependencies = [
            'blood issuances' => 'SELECT COUNT(*) AS cnt FROM blood_issuance WHERE patient_id = ?',
            'billing records' => 'SELECT COUNT(*) AS cnt FROM billing_records WHERE patient_id = ?',
        ];

        foreach ($dependencies as $label => $sql) {
            $check = db()->prepare($sql);
            $check->bind_param('i', $id);
            $check->execute();
            $row = $check->get_result()->fetch_assoc();
            $check->close();

            if (!empty($row['cnt'])) {
                throw new RuntimeException('patient_has_' . str_replace(' ', '_', $label));
            }
        }

        $stmt = db()->prepare('DELETE FROM patients WHERE id=?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $ok = $stmt->affected_rows > 0;
        $stmt->close();
        return $ok;
    }

    public static function get(int $id): ?array
    {
        Permissions::allow('patients');
        $stmt = db()->prepare('SELECT * FROM patients WHERE id=? LIMIT 1');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    public static function list(string $search = ''): array
    {
        Permissions::allow('patients');
        $like = '%' . $search . '%';
        $sql = 'SELECT p.*, p.full_name AS name, p.contact AS phone, p.hospital_name AS ward_name, 
                       TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) AS computed_age
                FROM patients p
                WHERE p.full_name LIKE ? OR p.patient_code LIKE ? OR p.blood_group LIKE ? OR p.contact LIKE ? OR p.hospital_name LIKE ? OR CAST(p.hospital_id AS CHAR) LIKE ?
                ORDER BY p.created_at DESC LIMIT 200';
        $stmt = db()->prepare($sql);
        $stmt->bind_param('ssssss', $like, $like, $like, $like, $like, $like);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public static function history(int $patientId): array
    {
        Permissions::allow('patients');
        $sql = 'SELECT bi.id, bi.issue_date, bi.units_issued, bi.status, bi.crossmatch_result, bi.remarks,
                       c.collection_code, i.component, i.blood_group, i.expiry_date, i.storage_location
                FROM blood_issuance bi
                JOIN inventory i ON i.id = bi.inventory_id
                LEFT JOIN collections c ON c.id = i.collection_id
                WHERE bi.patient_id = ?
                ORDER BY bi.issue_date DESC
                LIMIT 200';
        $stmt = db()->prepare($sql);
        $stmt->bind_param('i', $patientId);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }
}
