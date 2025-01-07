DROP DATABASE IF EXISTS `web_data`;
CREATE DATABASE `web_data`;
USE `web_data`;

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

CREATE TABLE `Secretariat`(
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(8) NULL,
    PRIMARY KEY(`username`)
);

CREATE TABLE `Theses`(
    `theme_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(200) NULL,
    `summary` TEXT NULL,
    `pdf_path` VARCHAR(200) NULL,
    `teacher_id` INT NULL,
    `status` ENUM('unassigned','active','to-be-reviewed','completed') DEFAULT 'unassigned', 
    `student_id` INT NULL UNIQUE,
    `exam_report_link` VARCHAR(200) NULL
);

CREATE TABLE `Committee`(
    `committee_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `theme_id` INT NULL,
    `teacher_id` INT NULL
);

CREATE TABLE `Committee_Invitations`(
    `invite_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `thesis_id` INT NULL,
    `teacher_id` INT NULL,
    `status` ENUM('') NULL
);

CREATE TABLE `Actions_Log`(
    `action_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `theme_id` INT NULL,
    `action_type` VARCHAR(100) NULL,
    `old_state` ENUM('') NULL,
    `new_state` ENUM('') NULL,
    `time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP(), `comments` TEXT NULL, `user_id` INT NULL
    );

CREATE TABLE `Grading`(
    `grade_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `thesis_id` INT NULL,
    `teacher_id` INT NULL,
    `grade` DECIMAL(4, 2) NULL,
    `max_grade` DECIMAL(4, 2) NULL DEFAULT '10',
    `criteria` TEXT NULL
);

CREATE TABLE `Announcements`(
    `announcement_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `thesis_id` INT NULL,
    `date` DATE NULL,
    `location` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `presentation_id` INT NULL
);

CREATE TABLE `Drafts`(
    `draft_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `thesis_id` INT NULL,
    `file_path` VARCHAR(200) NULL,
    `uploaded_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP(), `version` INT NULL DEFAULT '1', `modified_by` INT NULL
);

CREATE TABLE `External_Materials`(
    `material_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `thesis_id` INT NULL,
    `type` ENUM('') NULL,
    `link` VARCHAR(200) NULL,
    `description` TEXT NULL
);

CREATE TABLE `Presentations`(
    `presentation_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `thesis_id` INT NULL,
    `date` DATE NULL,
    `time` TIME NULL,
    `type` ENUM('') NULL,
    `location` VARCHAR(100) NULL
);

CREATE TABLE `Library_Links`(
    `url_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `thesis_id` INT NULL,
    `library_link` VARCHAR(200) NULL
);

CREATE TABLE `Professor_Notes`(
    `note_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `thesis_id` INT NULL,
    `teacher_id` INT NULL,
    `content` VARCHAR(300) NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP()
);

ALTER TABLE
    `Library_Links` ADD CONSTRAINT `library_links_thesis_id_foreign` FOREIGN KEY(`thesis_id`) REFERENCES `Thesis`(`theme_id`);
ALTER TABLE
    `Professor_Notes` ADD CONSTRAINT `professor_notes_thesis_id_foreign` FOREIGN KEY(`thesis_id`) REFERENCES `Thesis`(`theme_id`);
ALTER TABLE
    `Thesis` ADD CONSTRAINT `thesis_student_id_foreign` FOREIGN KEY(`student_id`) REFERENCES `Students`(`id`);
ALTER TABLE
    `Drafts` ADD CONSTRAINT `drafts_modified_by_foreign` FOREIGN KEY(`modified_by`) REFERENCES `Students`(`id`);
ALTER TABLE
    `Committee_Invitations` ADD CONSTRAINT `committee_invitations_teacher_id_foreign` FOREIGN KEY(`teacher_id`) REFERENCES `Professors`(`id`);
ALTER TABLE
    `Professor_Notes` ADD CONSTRAINT `professor_notes_teacher_id_foreign` FOREIGN KEY(`teacher_id`) REFERENCES `Professors`(`id`);
ALTER TABLE
    `Grading` ADD CONSTRAINT `grading_thesis_id_foreign` FOREIGN KEY(`thesis_id`) REFERENCES `Thesis`(`theme_id`);
ALTER TABLE
    `Actions_Log` ADD CONSTRAINT `actions_log_theme_id_foreign` FOREIGN KEY(`theme_id`) REFERENCES `Thesis`(`theme_id`);
ALTER TABLE
    `Actions_Log` ADD CONSTRAINT `actions_log_user_id_foreign` FOREIGN KEY(`user_id`) REFERENCES `Professors`(`id`);
ALTER TABLE
    `External_Materials` ADD CONSTRAINT `external_materials_thesis_id_foreign` FOREIGN KEY(`thesis_id`) REFERENCES `Thesis`(`theme_id`);
ALTER TABLE
    `Committee_Invitations` ADD CONSTRAINT `committee_invitations_thesis_id_foreign` FOREIGN KEY(`thesis_id`) REFERENCES `Thesis`(`theme_id`);
ALTER TABLE
    `Announcements` ADD CONSTRAINT `announcements_presentation_id_foreign` FOREIGN KEY(`presentation_id`) REFERENCES `Presentations`(`presentation_id`);
ALTER TABLE
    `Committee` ADD CONSTRAINT `committee_theme_id_foreign` FOREIGN KEY(`theme_id`) REFERENCES `Thesis`(`theme_id`);
ALTER TABLE
    `Thesis` ADD CONSTRAINT `thesis_teacher_id_foreign` FOREIGN KEY(`teacher_id`) REFERENCES `Professors`(`id`);
ALTER TABLE
    `Grading` ADD CONSTRAINT `grading_teacher_id_foreign` FOREIGN KEY(`teacher_id`) REFERENCES `Professors`(`id`);
ALTER TABLE
    `Drafts` ADD CONSTRAINT `drafts_thesis_id_foreign` FOREIGN KEY(`thesis_id`) REFERENCES `Thesis`(`theme_id`);
ALTER TABLE
    `Announcements` ADD CONSTRAINT `announcements_thesis_id_foreign` FOREIGN KEY(`thesis_id`) REFERENCES `Thesis`(`theme_id`);
ALTER TABLE
    `Committee` ADD CONSTRAINT `committee_teacher_id_foreign` FOREIGN KEY(`teacher_id`) REFERENCES `Professors`(`id`);
ALTER TABLE
    `Presentations` ADD CONSTRAINT `presentations_thesis_id_foreign` FOREIGN KEY(`thesis_id`) REFERENCES `Thesis`(`theme_id`);