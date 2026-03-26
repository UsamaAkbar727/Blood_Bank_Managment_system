-- Blood Bank Management System database schema
-- Run this script in MySQL 8+ (utf8mb4, InnoDB).

CREATE DATABASE IF NOT EXISTS `bloodbank`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `bloodbank`;

-- Users (staff/admin accounts)
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  username VARCHAR(190) NOT NULL,
  phone VARCHAR(30),
  role ENUM('admin','staff','lab_tech','doctor','inventory','cashier','clerk') NOT NULL DEFAULT 'staff',
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_role (role),
  KEY idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users (name, username, phone, role, password_hash, status)
SELECT 'System Administrator', 'admin', '+923001234567', 'admin', '$2y$12$OVbuDK6i1p3jMJs6iDj3aemaGPAZ8KrRbwh8y67Xd.hSiYPg5I5Ay', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE username = 'admin'
);

-- Donors
CREATE TABLE IF NOT EXISTS donors (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  donor_code VARCHAR(40) NOT NULL,
  cnic VARCHAR(20) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  gender ENUM('male','female','other') NOT NULL,
  date_of_birth DATE NOT NULL,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(190),
  address TEXT,
  city VARCHAR(100),
  last_donation_at DATE NULL,
  is_eligible BOOLEAN NOT NULL DEFAULT 1,
  manual_hold BOOLEAN NOT NULL DEFAULT 0,
  deferral_reason VARCHAR(255) NULL,
  deferred_until DATE NULL,
  eligibility_checked_at DATETIME NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_donors_code (donor_code),
  UNIQUE KEY uq_donors_cnic (cnic),
  KEY idx_donors_blood_group (blood_group),
  KEY idx_donors_city (city),
  CONSTRAINT fk_donors_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Collections (blood bags taken from donors)
CREATE TABLE IF NOT EXISTS collections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  collection_code VARCHAR(40) NOT NULL,
  donor_id INT UNSIGNED NOT NULL,
  collected_by INT UNSIGNED NULL,
  collection_date DATETIME NOT NULL,
  bag_type ENUM('350ml','450ml') NOT NULL DEFAULT '450ml',
  volume_ml SMALLINT UNSIGNED NOT NULL,
  collection_site VARCHAR(150),
  remarks VARCHAR(255),
  status ENUM('pending_screen','screening','safe','rejected','stored') NOT NULL DEFAULT 'pending_screen',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_collections_code (collection_code),
  KEY idx_collections_donor (donor_id),
  KEY idx_collections_status (status),
  KEY idx_collections_date (collection_date),
  CONSTRAINT fk_collections_donor FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_collections_collected_by FOREIGN KEY (collected_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Screening tests performed on a collected unit
CREATE TABLE IF NOT EXISTS screening_tests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  collection_id INT UNSIGNED NOT NULL,
  tested_by INT UNSIGNED NULL,
  test_date DATETIME NOT NULL,
  hbsag BOOLEAN NOT NULL DEFAULT 0,
  hcv BOOLEAN NOT NULL DEFAULT 0,
  hiv BOOLEAN NOT NULL DEFAULT 0,
  malaria BOOLEAN NOT NULL DEFAULT 0,
  syphilis BOOLEAN NOT NULL DEFAULT 0,
  blood_group_confirmed ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  hemoglobin_level DECIMAL(4,1) NULL,
  result_status ENUM('pending','safe','rejected') NOT NULL DEFAULT 'pending',
  remarks VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_screening_collection (collection_id),
  KEY idx_screening_status (result_status),
  KEY idx_screening_date (test_date),
  CONSTRAINT fk_screening_collection FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_screening_tested_by FOREIGN KEY (tested_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inventory of blood components derived from a collection
CREATE TABLE IF NOT EXISTS inventory (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  collection_id INT UNSIGNED NOT NULL,
  component ENUM('Whole Blood','PRBC','Platelets','FFP','Plasma','Cryo') NOT NULL DEFAULT 'Whole Blood',
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  volume_ml SMALLINT UNSIGNED NULL,
  units_available SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  storage_location VARCHAR(120),
  expiry_date DATE NOT NULL,
  status ENUM('available','reserved','issued','expired','discarded') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_inventory_collection_component (collection_id, component),
  KEY idx_inventory_status_expiry (status, expiry_date),
  KEY idx_inventory_blood_group (blood_group),
  CONSTRAINT fk_inventory_collection FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS expiry_date_override DATE NULL AFTER collection_site;

-- Configurable expiry rules by blood component
CREATE TABLE IF NOT EXISTS settings_expiry_rules (
  component ENUM('Whole Blood','PRBC','Platelets','FFP','Plasma','Cryo') NOT NULL PRIMARY KEY,
  shelf_life_days SMALLINT UNSIGNED NOT NULL,
  allow_manual_override BOOLEAN NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE donors
  ADD COLUMN IF NOT EXISTS manual_hold BOOLEAN NOT NULL DEFAULT 0 AFTER is_eligible,
  ADD COLUMN IF NOT EXISTS deferral_reason VARCHAR(255) NULL AFTER manual_hold,
  ADD COLUMN IF NOT EXISTS deferred_until DATE NULL AFTER deferral_reason,
  ADD COLUMN IF NOT EXISTS eligibility_checked_at DATETIME NULL AFTER deferred_until;

-- Google Drive OAuth token storage (single row id=1)
CREATE TABLE IF NOT EXISTS google_drive_tokens (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  refresh_token VARCHAR(512) NULL,
  access_token TEXT NULL,
  expires_at DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings_expiry_rules (component, shelf_life_days, allow_manual_override)
VALUES
  ('Whole Blood', 35, 1),
  ('PRBC', 42, 1),
  ('Platelets', 5, 1),
  ('FFP', 365, 1),
  ('Plasma', 365, 1),
  ('Cryo', 365, 1)
ON DUPLICATE KEY UPDATE
  shelf_life_days = VALUES(shelf_life_days),
  allow_manual_override = VALUES(allow_manual_override);

-- Medical eligibility criteria for donor deferral
CREATE TABLE IF NOT EXISTS settings_medical_criteria (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  min_age_years SMALLINT UNSIGNED NOT NULL,
  max_age_years SMALLINT UNSIGNED NOT NULL,
  min_interval_days SMALLINT UNSIGNED NOT NULL,
  min_hb_male DECIMAL(4,1) NOT NULL,
  min_hb_female DECIMAL(4,1) NOT NULL,
  low_hb_deferral_days SMALLINT UNSIGNED NOT NULL,
  reactive_deferral_days SMALLINT UNSIGNED NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings_medical_criteria (id, min_age_years, max_age_years, min_interval_days, min_hb_male, min_hb_female, low_hb_deferral_days, reactive_deferral_days)
VALUES (1, 18, 60, 90, 13.0, 12.5, 90, 365)
ON DUPLICATE KEY UPDATE
  min_age_years = VALUES(min_age_years),
  max_age_years = VALUES(max_age_years),
  min_interval_days = VALUES(min_interval_days),
  min_hb_male = VALUES(min_hb_male),
  min_hb_female = VALUES(min_hb_female),
  low_hb_deferral_days = VALUES(low_hb_deferral_days),
  reactive_deferral_days = VALUES(reactive_deferral_days);

-- Patients who may receive transfusions
CREATE TABLE IF NOT EXISTS patients (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_code VARCHAR(40) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  gender ENUM('male','female','other') NOT NULL,
  date_of_birth DATE,
  age SMALLINT UNSIGNED NULL,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  contact VARCHAR(30),
  diagnosis VARCHAR(255),
  hospital_id INT UNSIGNED NULL,
  hospital_name VARCHAR(150),
  medical_history VARCHAR(255),
  status ENUM('active','discharged','deceased') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_patients_code (patient_code),
  KEY idx_patients_blood_group (blood_group),
  KEY idx_patients_status (status),
  CONSTRAINT fk_patients_hospital FOREIGN KEY (hospital_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blood issuance to patients
CREATE TABLE IF NOT EXISTS blood_issuance (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  inventory_id INT UNSIGNED NOT NULL,
  patient_id INT UNSIGNED NOT NULL,
  issued_by INT UNSIGNED NULL,
  issue_date DATETIME NOT NULL,
  units_issued SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  crossmatch_result ENUM('compatible','incompatible','not_applicable') NOT NULL DEFAULT 'compatible',
  reactions_reported BOOLEAN NOT NULL DEFAULT 0,
  status ENUM('issued','returned','voided') NOT NULL DEFAULT 'issued',
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status ENUM('Paid','Pending','Free/Charity') NOT NULL DEFAULT 'Pending',
  is_exchange BOOLEAN NOT NULL DEFAULT 0,
  exchange_reference VARCHAR(120) NULL,
  remarks VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_blood_issuance_patient (patient_id),
  KEY idx_blood_issuance_inventory (inventory_id),
  KEY idx_blood_issuance_date (issue_date),
  CONSTRAINT fk_blood_issuance_inventory FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_blood_issuance_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_blood_issuance_issued_by FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE blood_issuance
  ADD COLUMN IF NOT EXISTS price DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN IF NOT EXISTS payment_status ENUM('Paid','Pending','Free/Charity') NOT NULL DEFAULT 'Pending' AFTER price,
  ADD COLUMN IF NOT EXISTS is_exchange BOOLEAN NOT NULL DEFAULT 0 AFTER payment_status,
  ADD COLUMN IF NOT EXISTS exchange_reference VARCHAR(120) NULL AFTER is_exchange;

-- System/event logs
CREATE TABLE IF NOT EXISTS logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id INT UNSIGNED NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_logs_entity (entity_type, entity_id),
  KEY idx_logs_user (user_id),
  CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expenses tracking
CREATE TABLE IF NOT EXISTS expenses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(80) NOT NULL,
  description VARCHAR(255),
  amount DECIMAL(12,2) NOT NULL,
  incurred_on DATE NOT NULL,
  recorded_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_expenses_category_date (category, incurred_on),
  CONSTRAINT fk_expenses_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pricing per blood component/blood group (latest row per component+group used)
CREATE TABLE IF NOT EXISTS blood_pricing (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  component ENUM('Whole Blood','PRBC','Platelets','FFP','Plasma','Cryo') NOT NULL,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL,
  effective_from DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pricing_component_group_date (component, blood_group, effective_from),
  CONSTRAINT fk_pricing_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Billing / invoicing for issued units
CREATE TABLE IF NOT EXISTS billing_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_no VARCHAR(40) NOT NULL,
  patient_id INT UNSIGNED NOT NULL,
  issuance_id INT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('unpaid','paid','void') NOT NULL DEFAULT 'unpaid',
  issued_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_on DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_billing_invoice (invoice_no),
  KEY idx_billing_patient (patient_id),
  KEY idx_billing_status (status),
  CONSTRAINT fk_billing_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_billing_issuance FOREIGN KEY (issuance_id) REFERENCES blood_issuance(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(120) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT 0,
  event_key VARCHAR(191) NULL,
  snoozed_until DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notifications_user (user_id, is_read),
  KEY idx_notifications_event (event_key, snoozed_until, is_read),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Income ledger for paid issuance transactions
CREATE TABLE IF NOT EXISTS income_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source_type VARCHAR(40) NOT NULL,
  source_id INT UNSIGNED NOT NULL,
  patient_id INT UNSIGNED NULL,
  description VARCHAR(255),
  amount DECIMAL(12,2) NOT NULL,
  transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recorded_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_income_source (source_type, source_id),
  KEY idx_income_date (transaction_date),
  CONSTRAINT fk_income_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_income_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backup logs
CREATE TABLE IF NOT EXISTS backup_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_size_bytes BIGINT UNSIGNED DEFAULT 0,
  status ENUM('success','failed') NOT NULL,
  message VARCHAR(255),
  uploaded_to_drive BOOLEAN NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_backup_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Helpful indexes for frequent lookups
CREATE INDEX idx_inventory_expiring_soon ON inventory (expiry_date, status);
CREATE INDEX idx_collections_donor_date ON collections (donor_id, collection_date);
CREATE INDEX idx_patients_name ON patients (full_name);
