CREATE DATABASE IF NOT EXISTS blood_donation_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE blood_donation_db;

CREATE TABLE IF NOT EXISTS blood_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(5) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS donors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    gender ENUM('Male', 'Female', 'Other') NULL,
    date_of_birth DATE NULL,
    phone VARCHAR(25) NOT NULL,
    email VARCHAR(120) NULL,
    address VARCHAR(255) NULL,
    blood_group_id INT NOT NULL,
    last_donation_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_donors_blood_group
      FOREIGN KEY (blood_group_id) REFERENCES blood_groups(id)
);

CREATE TABLE IF NOT EXISTS blood_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blood_group_id INT NOT NULL UNIQUE,
    units_available INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventory_blood_group
      FOREIGN KEY (blood_group_id) REFERENCES blood_groups(id),
    CONSTRAINT chk_inventory_units CHECK (units_available >= 0)
);

CREATE TABLE IF NOT EXISTS blood_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_name VARCHAR(100) NOT NULL,
    hospital_name VARCHAR(150) NOT NULL,
    contact_phone VARCHAR(25) NOT NULL,
    blood_group_id INT NOT NULL,
    units_requested INT NOT NULL,
    urgency ENUM('Low', 'Medium', 'High', 'Emergency') NOT NULL DEFAULT 'Medium',
    status ENUM('Pending', 'Approved', 'Rejected', 'Fulfilled') NOT NULL DEFAULT 'Pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_requests_blood_group
      FOREIGN KEY (blood_group_id) REFERENCES blood_groups(id),
    CONSTRAINT chk_requested_units CHECK (units_requested > 0)
);

INSERT IGNORE INTO blood_groups (group_name) VALUES
('A+'), ('A-'), ('B+'), ('B-'), ('AB+'), ('AB-'), ('O+'), ('O-');

INSERT IGNORE INTO blood_inventory (blood_group_id, units_available)
SELECT id, 0 FROM blood_groups;
