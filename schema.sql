-- ============================================================
-- DLSJBC Grade Management System - Database Schema
-- Import this file in phpMyAdmin (XAMPP) to create the database.
-- ============================================================

CREATE DATABASE IF NOT EXISTS dlsjbc_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE dlsjbc_db;

-- ------------------------------------------------------------
-- students: academic records + grades (1.0 best - 5.0 worst)
-- (created first so users.student_id can reference it)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id          VARCHAR(20)  NOT NULL PRIMARY KEY,   -- e.g. D2025001
    name        VARCHAR(150) NOT NULL,               -- "Last, First"
    email       VARCHAR(150) NULL,
    program     VARCHAR(20)  NOT NULL,               -- BSIT, BSHRM, BSTM, TEED, BEED, BSCS, BSBA, BSA
    year        VARCHAR(20)  NOT NULL,               -- 1st Year ... 4th Year
    section     VARCHAR(20)  NOT NULL,               -- A, B, C
    status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
    math        DECIMAL(2,1) NOT NULL DEFAULT 1.5,
    ethics      DECIMAL(2,1) NOT NULL DEFAULT 1.5,
    pe          DECIMAL(2,1) NOT NULL DEFAULT 1.5,
    oop         DECIMAL(2,1) NOT NULL DEFAULT 1.5,
    platform    DECIMAL(2,1) NOT NULL DEFAULT 1.5,
    reed        DECIMAL(2,1) NOT NULL DEFAULT 1.5,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- users: student / teacher / admin login accounts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                VARCHAR(50)  NOT NULL PRIMARY KEY,
    fullname          VARCHAR(150) NOT NULL,
    username          VARCHAR(100) NOT NULL UNIQUE,
    email             VARCHAR(150) NOT NULL UNIQUE,
    password          VARCHAR(255) NOT NULL,        -- stored hashed (password_hash)
    role              ENUM('student','teacher','admin') NOT NULL,
    approved          TINYINT(1) NOT NULL DEFAULT 1, -- teachers start at 0 (pending)
    student_id        VARCHAR(20)  NULL,             -- role = student
    assigned_program  VARCHAR(20)  NULL,             -- role = teacher
    assigned_year     VARCHAR(20)  NULL,             -- role = teacher
    assigned_section  VARCHAR(20)  NULL,             -- role = teacher (A, B, C, ABC, AB, AC, BC, ALL)
    dept              VARCHAR(100) NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_student
        FOREIGN KEY (student_id) REFERENCES students(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- password_resets: temporary 6-digit codes for "Forgot Password"
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_resets (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(150) NOT NULL,
    code        VARCHAR(6)   NOT NULL,
    expires_at  DATETIME     NOT NULL,
    used        TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- Seed data (same defaults the app used to keep in localStorage)
-- Default admin login: username "admin"  password "123"
-- ============================================================

INSERT INTO students (id, name, email, program, year, section, status, math, ethics, pe, oop, platform, reed) VALUES
('D2024001','Cruz, Juan','juan.cruz@dlsjbc.edu','BSIT','1st Year','A','active',1.8,1.5,2.0,1.6,1.7,1.9),
('D2024002','Reyes, Maria','maria.reyes@dlsjbc.edu','BSIT','1st Year','A','active',1.2,1.3,1.1,1.3,1.4,1.2),
('D2024003','Santos, Jose','jose.santos@dlsjbc.edu','BSIT','1st Year','B','active',2.5,2.0,1.8,2.2,2.4,2.1),
('D2024007','Mendoza, Chris','chris.mendoza@dlsjbc.edu','BSIT','1st Year','C','active',1.4,1.4,1.5,1.3,1.6,1.5),
('D2024006','Lopez, Isabel','isabel.lopez@dlsjbc.edu','BSBA','1st Year','A','active',2.8,2.5,2.2,2.7,2.9,2.6),
('D2024009','Dela Cruz, John','john.delacruz@dlsjbc.edu','BSBA','1st Year','B','active',1.6,1.7,1.5,1.6,1.8,1.7),
('D2024013','Gonzales, Patrick','patrick.gonzales@dlsjbc.edu','BSBA','1st Year','C','active',1.5,1.6,1.4,1.5,1.6,1.5),
('D2024004','Garcia, Anna','anna.garcia@dlsjbc.edu','BSHRM','2nd Year','A','active',1.5,1.6,1.4,1.7,1.5,1.6),
('D2024008','Villanueva, Bea','bea.villanueva@dlsjbc.edu','BSHRM','2nd Year','B','active',2.0,1.9,1.8,2.1,2.0,1.9),
('D2024005','Fernandez, Mark','mark.fernandez@dlsjbc.edu','BSCS','3rd Year','A','active',1.9,2.1,1.7,1.8,1.9,2.0)
ON DUPLICATE KEY UPDATE id = id;

-- Default admin account. Password hash below = bcrypt("123"), verifiable with PHP's password_verify().
INSERT INTO users (id, fullname, username, email, password, role, approved) VALUES
('admin','System Administrator','admin','admin@dlsjbc.edu','$2b$10$SkzDmxuKW3xs/iGJiH3NNuoSHE2HG2sSgtk2bEgGAZmTimqWa27Ue','admin',1)
ON DUPLICATE KEY UPDATE id = id;
