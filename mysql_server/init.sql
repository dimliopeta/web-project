DROP DATABASE IF EXISTS project_db;
CREATE DATABASE project_db;
USE project_db;

CREATE TABLE `Students`(
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
    `password` VARCHAR(20) NULL
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

CREATE TABLE `Administrators`(
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NULL,
    `surname` VARCHAR(50) NULL,
    `email` VARCHAR(100) NULL UNIQUE,
    `password` VARCHAR(20) NULL
);

CREATE TABLE `Theses`(
    `thesis_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `professor_id` INT NOT NULL,
	`student_id` INT NULL,
    `title` VARCHAR(200) NULL,
    `summary` TEXT NULL,
    `status` ENUM('unassigned', 'assigned','active','to-be-reviewed','completed','cancelled') DEFAULT 'unassigned', 
	`pdf_path` VARCHAR(200) NULL,
	`start_date` DATE NULL DEFAULT NULL,
	`nimertis_link` VARCHAR(200) NULL,
    `grading_enabled` BOOLEAN DEFAULT FALSE,
    `final_grade` DECIMAL(5,2) NULL,
    FOREIGN KEY (`professor_id`) REFERENCES `Professors`(`id`),
    FOREIGN KEY (`student_id`) REFERENCES `Students`(`id`)

);

CREATE TABLE `Invitations`(
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `thesis_id` INT,
    `professor_id` INT,
    `status` ENUM('pending','accepted','rejected', 'cancelled') DEFAULT 'pending',
    `invitation_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `response_date` DATE NULL,
    FOREIGN KEY (`thesis_id`) REFERENCES `Theses`(`thesis_id`),
    FOREIGN KEY (`professor_id`) REFERENCES `Professors`(`id`)
);

CREATE TABLE `Committees`(
    `commitee_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `thesis_id` INT NOT NULL,
    `member1_id` INT NULL,
	`member2_id` INT NULL,
    FOREIGN KEY (`thesis_id`) REFERENCES `Theses`(`thesis_id`),
    FOREIGN KEY (`member1_id`) REFERENCES `Professors`(`id`),
	FOREIGN KEY (`member2_id`) REFERENCES `Professors`(`id`)
);

CREATE TABLE `Grades`(
    `grade_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `thesis_id` INT NOT NULL,
    `professor_id` INT NOT NULL,
    `grade` DECIMAL(5,2) NOT NULL,
	`grade2` DECIMAL(5,2) NOT NULL,
    `grade3` DECIMAL(5,2) NOT NULL,
    `grade4` DECIMAL(5,2) NOT NULL,
    `comments` TEXT,
    `finalized` BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (`thesis_id`) REFERENCES `Theses`(`thesis_id`),
    FOREIGN KEY (`professor_id`) REFERENCES `Professors`(`id`),
    UNIQUE (`thesis_id`, `professor_id`)
);

CREATE TABLE `Attachments`(
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `thesis_id` INT NOT NULL,
    `type` ENUM('file','link'),
    `link_path` VARCHAR(200) NULL,
    `file_path` VARCHAR(200) NULL,
    FOREIGN KEY (`thesis_id`) REFERENCES `Theses`(`thesis_id`)
);

CREATE TABLE `Examinations`(
    `thesis_id` INT NOT NULL PRIMARY KEY,
    `date` DATE NULL,
    `type_of_exam` ENUM('online','in-person') DEFAULT 'in-person',
    `location` VARCHAR(200) NULL,
    `exam_report` VARCHAR(200) NULL,
    `announced` BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (`thesis_id`) REFERENCES `Theses`(`thesis_id`)
);

CREATE TABLE `Logs`(
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `thesis_id` INT NOT NULL,
    `date_of_change` date,
    `old_state` ENUM('unassigned','assigned','active','to-be-reviewed','completed','cancelled') NULL,
    `new_state` ENUM('unassigned','assigned','active','to-be-reviewed','completed','cancelled') NULL,
    `gen_assembly_session` INT NULL,
    `ap` INT NULL,
    `cancellation_reason` TEXT NULL,
    FOREIGN KEY (`thesis_id`) REFERENCES `Theses`(`thesis_id`)
);

CREATE TABLE `Notes`(
	`id` INT NOT NULL auto_increment PRIMARY KEY,
    `thesis_id` INT NOT NULL,
    `professor_id` INT NOT NULL,
    `date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `content` TEXT NOT NULL,
    FOREIGN KEY (`thesis_id`) REFERENCES `Theses`(`thesis_id`),
	FOREIGN KEY (`professor_id`) REFERENCES `Professors`(`id`)
);