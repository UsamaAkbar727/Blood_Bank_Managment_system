<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/Permissions.php';
require_once __DIR__ . '/LogService.php';

class MedicalCriteriaService
{
    private const DEFAULTS = [
        'min_age_years' => 18,
        'max_age_years' => 60,
        'min_interval_days' => 90,
        'min_hb_male' => 13.0,
        'min_hb_female' => 12.5,
        'low_hb_deferral_days' => 90,
        'reactive_deferral_days' => 365,
    ];

    private static bool $initialized = false;

    private static function ensureTable(): void
    {
        if (self::$initialized) {
            return;
        }
        self::$initialized = true;

        db()->query(
            "CREATE TABLE IF NOT EXISTS settings_medical_criteria (
                id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
                min_age_years SMALLINT UNSIGNED NOT NULL,
                max_age_years SMALLINT UNSIGNED NOT NULL,
                min_interval_days SMALLINT UNSIGNED NOT NULL,
                min_hb_male DECIMAL(4,1) NOT NULL,
                min_hb_female DECIMAL(4,1) NOT NULL,
                low_hb_deferral_days SMALLINT UNSIGNED NOT NULL,
                reactive_deferral_days SMALLINT UNSIGNED NOT NULL,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );

        $row = db()->query('SELECT id FROM settings_medical_criteria WHERE id = 1')->fetch_assoc();
        if (!$row) {
            $stmt = db()->prepare('INSERT INTO settings_medical_criteria (id, min_age_years, max_age_years, min_interval_days, min_hb_male, min_hb_female, low_hb_deferral_days, reactive_deferral_days) VALUES (1, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->bind_param(
                'iiiddii',
                self::DEFAULTS['min_age_years'],
                self::DEFAULTS['max_age_years'],
                self::DEFAULTS['min_interval_days'],
                self::DEFAULTS['min_hb_male'],
                self::DEFAULTS['min_hb_female'],
                self::DEFAULTS['low_hb_deferral_days'],
                self::DEFAULTS['reactive_deferral_days']
            );
            $stmt->execute();
            $stmt->close();
        }
    }

    public static function criteria(): array
    {
        self::ensureTable();
        $row = db()->query('SELECT * FROM settings_medical_criteria WHERE id = 1')->fetch_assoc();
        if (!$row) {
            return self::DEFAULTS;
        }
        return [
            'min_age_years' => (int)$row['min_age_years'],
            'max_age_years' => (int)$row['max_age_years'],
            'min_interval_days' => (int)$row['min_interval_days'],
            'min_hb_male' => (float)$row['min_hb_male'],
            'min_hb_female' => (float)$row['min_hb_female'],
            'low_hb_deferral_days' => (int)$row['low_hb_deferral_days'],
            'reactive_deferral_days' => (int)$row['reactive_deferral_days'],
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }

    public static function updateCriteria(array $input, ?int $userId = null): array
    {
        Permissions::allow('users');
        self::ensureTable();

        $criteria = [
            'min_age_years' => (int)($input['min_age_years'] ?? self::DEFAULTS['min_age_years']),
            'max_age_years' => (int)($input['max_age_years'] ?? self::DEFAULTS['max_age_years']),
            'min_interval_days' => (int)($input['min_interval_days'] ?? self::DEFAULTS['min_interval_days']),
            'min_hb_male' => (float)($input['min_hb_male'] ?? self::DEFAULTS['min_hb_male']),
            'min_hb_female' => (float)($input['min_hb_female'] ?? self::DEFAULTS['min_hb_female']),
            'low_hb_deferral_days' => (int)($input['low_hb_deferral_days'] ?? self::DEFAULTS['low_hb_deferral_days']),
            'reactive_deferral_days' => (int)($input['reactive_deferral_days'] ?? self::DEFAULTS['reactive_deferral_days']),
        ];

        if ($criteria['min_age_years'] <= 0 || $criteria['max_age_years'] <= 0 || $criteria['min_age_years'] > $criteria['max_age_years']) {
            throw new InvalidArgumentException('invalid_age_criteria');
        }
        if ($criteria['min_interval_days'] < 30) {
            throw new InvalidArgumentException('invalid_interval_days');
        }
        if ($criteria['min_hb_male'] <= 0 || $criteria['min_hb_female'] <= 0) {
            throw new InvalidArgumentException('invalid_hemoglobin');
        }
        if ($criteria['low_hb_deferral_days'] < 0 || $criteria['reactive_deferral_days'] < 0) {
            throw new InvalidArgumentException('invalid_deferral_days');
        }

        $stmt = db()->prepare('UPDATE settings_medical_criteria SET min_age_years=?, max_age_years=?, min_interval_days=?, min_hb_male=?, min_hb_female=?, low_hb_deferral_days=?, reactive_deferral_days=? WHERE id = 1');
        $stmt->bind_param(
            'iiiddii',
            $criteria['min_age_years'],
            $criteria['max_age_years'],
            $criteria['min_interval_days'],
            $criteria['min_hb_male'],
            $criteria['min_hb_female'],
            $criteria['low_hb_deferral_days'],
            $criteria['reactive_deferral_days']
        );
        $stmt->execute();
        $stmt->close();

        LogService::write($userId, 'update', 'settings_medical_criteria', 1);

        return self::criteria();
    }

    private static function loadDonor(int $donorId): ?array
    {
        $stmt = db()->prepare('SELECT * FROM donors WHERE id = ? LIMIT 1');
        $stmt->bind_param('i', $donorId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    private static function latestScreening(int $donorId): ?array
    {
        $stmt = db()->prepare('SELECT st.* FROM screening_tests st JOIN collections c ON c.id = st.collection_id WHERE c.donor_id = ? ORDER BY st.test_date DESC LIMIT 1');
        $stmt->bind_param('i', $donorId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    private static function computeAgeYears(string $dob): int
    {
        $birth = new DateTime($dob);
        $today = new DateTime('today');
        return (int)$birth->diff($today)->y;
    }

    private static function buildReasons(array $donor, array $criteria): array
    {
        $reasons = [];
        $today = new DateTime('today');

        if (!empty($donor['manual_hold'])) {
            $reasons[] = [
                'reason' => 'Manual hold (staff override)',
                'until' => null,
                'permanent' => true,
            ];
        }

        if (!empty($donor['date_of_birth'])) {
            $age = self::computeAgeYears($donor['date_of_birth']);
            if ($age < $criteria['min_age_years']) {
                $eligibleDate = (new DateTime($donor['date_of_birth']))->modify('+' . $criteria['min_age_years'] . ' years');
                if ($eligibleDate > $today) {
                    $reasons[] = [
                        'reason' => 'Under minimum age requirement',
                        'until' => $eligibleDate,
                        'permanent' => false,
                    ];
                }
            }
            if ($age > $criteria['max_age_years']) {
                $reasons[] = [
                    'reason' => 'Above maximum age limit',
                    'until' => null,
                    'permanent' => true,
                ];
            }
        }

        if (!empty($donor['last_donation_at'])) {
            $lastDonation = new DateTime($donor['last_donation_at']);
            $nextEligible = (clone $lastDonation)->modify('+' . $criteria['min_interval_days'] . ' days');
            if ($today < $nextEligible) {
                $reasons[] = [
                    'reason' => 'Recent donation (minimum interval not met)',
                    'until' => $nextEligible,
                    'permanent' => false,
                ];
            }
        }

        $screen = self::latestScreening((int)$donor['id']);
        if ($screen) {
            if (($screen['result_status'] ?? '') === 'rejected') {
                if ($criteria['reactive_deferral_days'] === 0) {
                    $reasons[] = [
                        'reason' => 'Reactive screening result (permanent deferral)',
                        'until' => null,
                        'permanent' => true,
                    ];
                } else {
                    $until = new DateTime($screen['test_date']);
                    $until->modify('+' . $criteria['reactive_deferral_days'] . ' days');
                    if ($until > $today) {
                        $reasons[] = [
                            'reason' => 'Reactive screening result',
                            'until' => $until,
                            'permanent' => false,
                        ];
                    }
                }
            }

            if ($screen['hemoglobin_level'] !== null && $screen['hemoglobin_level'] !== '') {
                $minHb = ($donor['gender'] ?? '') === 'female' ? $criteria['min_hb_female'] : $criteria['min_hb_male'];
                if ((float)$screen['hemoglobin_level'] < $minHb) {
                    $until = new DateTime($screen['test_date']);
                    $until->modify('+' . $criteria['low_hb_deferral_days'] . ' days');
                    if ($until > $today) {
                        $reasons[] = [
                            'reason' => 'Hemoglobin below minimum threshold',
                            'until' => $until,
                            'permanent' => false,
                        ];
                    }
                }
            }
        }

        return $reasons;
    }

    private static function resolveDeferral(array $reasons): array
    {
        if (!$reasons) {
            return [
                'eligible' => true,
                'reason' => null,
                'deferred_until' => null,
            ];
        }

        $permanentReasons = array_filter($reasons, static fn($r) => !empty($r['permanent']));
        if ($permanentReasons) {
            $labels = array_map(static fn($r) => $r['reason'], $permanentReasons);
            return [
                'eligible' => false,
                'reason' => implode('; ', $labels),
                'deferred_until' => null,
            ];
        }

        $latest = null;
        foreach ($reasons as $reason) {
            if (!$reason['until'] instanceof DateTime) {
                continue;
            }
            if ($latest === null || $reason['until'] > $latest['until']) {
                $latest = $reason;
            }
        }
        $labels = array_map(static fn($r) => $r['reason'], $reasons);
        $untilDate = $latest ? $latest['until']->format('Y-m-d') : null;

        return [
            'eligible' => false,
            'reason' => implode('; ', $labels),
            'deferred_until' => $untilDate,
        ];
    }

    public static function evaluate(int $donorId): ?array
    {
        $donor = self::loadDonor($donorId);
        if (!$donor) {
            return null;
        }

        $criteria = self::criteria();
        $reasons = self::buildReasons($donor, $criteria);
        $decision = self::resolveDeferral($reasons);

        return [
            'donor_id' => (int)$donor['id'],
            'eligible' => $decision['eligible'],
            'reason' => $decision['reason'],
            'deferred_until' => $decision['deferred_until'],
        ];
    }

    public static function applyToDonor(int $donorId, ?int $userId = null, bool $log = true): ?array
    {
        $evaluation = self::evaluate($donorId);
        if (!$evaluation) {
            return null;
        }

        $reason = $evaluation['reason'];
        if ($reason !== null && strlen($reason) > 255) {
            $reason = substr($reason, 0, 252) . '...';
        }

        $stmt = db()->prepare('UPDATE donors SET is_eligible = ?, deferral_reason = ?, deferred_until = ?, eligibility_checked_at = NOW() WHERE id = ?');
        $eligible = $evaluation['eligible'] ? 1 : 0;
        $stmt->bind_param('issi', $eligible, $reason, $evaluation['deferred_until'], $donorId);
        $stmt->execute();
        $stmt->close();

        if ($log) {
            LogService::write($userId, 'eligibility_update', 'donor', $donorId);
        }

        return self::loadDonor($donorId);
    }

    public static function refreshIfDue(array $donor): array
    {
        $today = date('Y-m-d');
        $needsRefresh = empty($donor['eligibility_checked_at']);
        if (!empty($donor['deferred_until']) && $donor['deferred_until'] <= $today) {
            $needsRefresh = true;
        }
        if ($needsRefresh) {
            $updated = self::applyToDonor((int)$donor['id'], null, false);
            return $updated ?: $donor;
        }
        return $donor;
    }
}
