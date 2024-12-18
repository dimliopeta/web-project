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
    `postal_code` VARCHAR(10) NULL,
    `father_name` VARCHAR(50) NULL,
    `landline_phone` VARCHAR(20) NULL,
    `mobile_phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL UNIQUE, 
    `password` VARCHAR(8) NULL
);

CREATE TABLE `Professors`(
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NULL,
    `surname` VARCHAR(50) NULL,
    `email` VARCHAR(100) NULL UNIQUE,
    `topic` VARCHAR(200) NULL,
    `landline_phone` VARCHAR(20) NULL,
    `mobile_phone` VARCHAR(20) NULL,
    `department` VARCHAR(100) NULL,
    `university` VARCHAR(100) NULL,
    `password` VARCHAR(8) NULL
);
