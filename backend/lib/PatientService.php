<?php
require_once __DIR__ . '/Permissions.php';

class PatientService
{
    private static function sanitize(array $input): array
    {
        $code = trim($input['patient_code'] ?? '');
        $fullName = trim($input['full_name'] ?? '');
        $gender = $input['gender'] ?? '';
        $dob = $input['date_of_birth'] ?? null;
        $blood = $input['blood_group'] ?? '';
        $diagnosis = $input['diagnosis'] ?? null;
        $hospital = $input['hospital_name'] ?? null;
        $status = $input['status'] ?? 'active';

        if ($fullName === '' || $blood === '' || $gender === '') {
            throw new InvalidArgumentException('missing_fields');
        }

        if ($code === '') {
            $code = 'PAT-' . strtoupper(bin2hex(random_bytes(3)));
        }

        return [
            'patient_code' => $code,
            'full_name' => $fullName,
            'gender' => $gender,
            'date_of_birth' => $dob,
            'blood_group' => $blood,
            'diagnosis' => $diagnosis,
            'attending_doctor_id' => isset($input['attending_doctor_id']) ? (int)$input['attending_doctor_id'] : null,
            'hospital_name' => $hospital,
            'status' => $status,
        ];
    }

    public static function create(array $input): array
    {
        Permissions::allow('patients');
        $data = self::sanitize($input);
        $stmt = db()->prepare('INSERT INTO patients (patient_code, full_name, gender, date_of_birth, blood_group, diagnosis, attending_doctor_id, hospital_name, status) VALUES (?,?,?,?,?,?,?,?,?)');
        $stmt->bind_param(
            'ssssssiss',
            $data['patient_code'],
            $data['full_name'],
            $data['gender'],
            $data['date_of_birth'],
            $data['blood_group'],
            $data['diagnosis'],
            $data['attending_doctor_id'],
            $data['hospital_name'],
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
        $stmt = db()->prepare('UPDATE patients SET patient_code=?, full_name=?, gender=?, date_of_birth=?, blood_group=?, diagnosis=?, attending_doctor_id=?, hospital_name=?, status=? WHERE id=?');
        $stmt->bind_param(
            'ssssssissi',
            $data['patient_code'],
            $data['full_name'],
            $data['gender'],
            $data['date_of_birth'],
            $data['blood_group'],
            $data['diagnosis'],
            $data['attending_doctor_id'],
            $data['hospital_name'],
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
        $stmt = db()->prepare('SELECT * FROM patients WHERE full_name LIKE ? OR patient_code LIKE ? OR blood_group LIKE ? ORDER BY created_at DESC LIMIT 200');
        $stmt->bind_param('sss', $like, $like, $like);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }
}
