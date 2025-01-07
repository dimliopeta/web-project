DROP DATABASE IF EXISTS project_db;
CREATE DATABASE project_db;
USE project_db;

CREATE TABLE `Students` (
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NULL,
    `surname` VARCHAR(50) NULL,
    `student_number` VARCHAR(20) NULL UNIQUE, 
    `street` VARCHAR(100) NULL,
    `number` VARCHAR(10) NULL,
    `city` VARCHAR(50) NULL,
    `postcode` VARCHAR(10) NULL,
    `father_name` VARCHAR(50) NULL,
    `landline_telephone` VARCHAR(20) NULL,
    `mobile_telephone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL UNIQUE,
    `contact_email` VARCHAR(100) NULL,
    `password` VARCHAR(20) NULL,
    `thesis_id` VARCHAR(10) NULL
);

CREATE TABLE `Professors`(
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NULL,
    `surname` VARCHAR(50) NULL,
    `email` VARCHAR(100) NULL UNIQUE,
    `topic` VARCHAR(200) NULL,
    `landline` VARCHAR(20) NULL,
    `mobile` VARCHAR(20) NULL,
    `department` VARCHAR(100) NULL,
    `university` VARCHAR(100) NULL,
    `password` VARCHAR(20) NULL
);

CREATE TABLE `Theses`(
    `theme_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `professor_id` INT NULL,
	`student_id` INT NULL,
    `title` VARCHAR(200) NULL,
    `summary` TEXT NULL,
    `status` ENUM('unassigned','active','to-be-reviewed','completed') DEFAULT 'unassigned', 
	`pdf_path` VARCHAR(200) NULL
);

ALTER TABLE
    `Theses` ADD CONSTRAINT `thesis_professor_id_foreign` FOREIGN KEY(`professor_id`) REFERENCES `Professors`(`id`);
ALTER TABLE
    `Theses` ADD CONSTRAINT `thesis_student_id_foreign` FOREIGN KEY(`student_id`) REFERENCES `Students`(`id`);
