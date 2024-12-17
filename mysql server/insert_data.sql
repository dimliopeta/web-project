USE project_db;

INSERT INTO professors (name, surname, email, topic, landline_phone, mobile_phone, department, university, password)
VALUES
('Andreas', 'Komninos', 'akomninos@ceid.upatras.gr', 'Network-centric systems', '2610996915', '6977998877', 'CEID', 'University of Patras', 'securep1');

INSERT INTO students (name, surname, student_number, street, number, city, postal_code, father_name, landline_phone, mobile_phone, email, password)
VALUES
('Makis', 'Makopoulos', '10433999', 'test street', '45', 'test city', '39955', 'Orestis', '2610333000', '6939096979', '104333999@students.upatras.gr', 'securep2');

