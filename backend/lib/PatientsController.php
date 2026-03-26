<?php
require_once __DIR__ . '/PatientService.php';

class PatientsController
{
    public static function index(array $query): array
    {
        if (isset($query['id'])) {
            return ['data' => PatientService::get((int)$query['id'])];
        }

        $q = $query['q'] ?? '';
        return ['data' => PatientService::list($q)];
    }

    public static function store(array $payload): array
    {
        return ['data' => PatientService::create($payload)];
    }

    public static function update(int $id, array $payload): array
    {
        return ['data' => PatientService::update($id, $payload)];
    }

    public static function destroy(int $id): array
    {
        return ['deleted' => PatientService::delete($id)];
    }

    public static function history(int $id): array
    {
        return ['data' => PatientService::history($id)];
    }
}
