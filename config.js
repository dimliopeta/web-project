const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'project_db'
});


// Helper function to load data from a file or the frontend
function loadData(filePath) {
    if (fs.existsSync(filePath)) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (err) {
            console.error('Error loading data from file:', err);
            throw err;
        }
    } else {
        console.warn('WARNING: NO DATA ADDED TO THE DATABASE - DATA.JSON MISSING!');
        return null;
    }
}


// Μετατρέπουμε τα JSON objects σε Javascript objects και τα αποθηκεύουμε στο data
//const data = JSON.parse(fs.readFileSync('./provided_data/data.json', 'utf8'));

// Insert data function
function insertData(filePath = './provided_data/data.json') {
    const data = loadData(filePath); // Load data from the specified file
    if (data !== null) {

        // Εισαγωγή καθηγητών
        if (data.professors) {
            data.professors.forEach(professor => {

                const query = `SELECT * FROM PROFESSORS WHERE email=?;`;
                db.query(query, [professor.email], (err, results) => {
                    if (err) {
                        console.error('Error checking for duplicate professors: ', err);
                        return;
                    }
                    if (results.length === 0) {
                        const insertQuery = `
                    INSERT INTO professors (name, surname, email, topic, landline, mobile, department, university, password)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                `;
                        db.query(insertQuery, [
                            professor.name,
                            professor.surname,
                            professor.email,
                            professor.topic,
                            professor.landline,
                            professor.mobile,
                            professor.department,
                            professor.university,
                            'defaultpassword' // Προσωρινός κωδικός
                        ], (insertErr) => {
                            if (insertErr) {
                                console.error('Error inserting professor:', insertErr);
                            } else {
                                console.log(`Professor ${professor.email} added successfully.`);
                            }

                        });
                    }
                });
            });
        } else {
            console.warn('No professors data found in the file.');
        }

        // Εισαγωγή φοιτητών
        if (data.students) {
            data.students.forEach(student => {
                const query = `SELECT * FROM STUDENTS WHERE email=?;`;
                db.query(query, [student.email], (err, results) => {
                    if (err) {
                        console.error('Error checking for duplicate students:', err);
                        return;
                    }
                    if (results.length === 0) {
                        const insertQuery = `
                    INSERT INTO students (name, surname, student_number, street, number, city, postcode, father_name, landline_telephone, mobile_telephone, email, contact_email,  password)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                `;
                        db.query(insertQuery, [
                            student.name,
                            student.surname,
                            student.student_number,
                            student.street,
                            student.number,
                            student.city,
                            student.postcode,
                            student.father_name,
                            student.landline_telephone,
                            student.mobile_telephone,
                            student.email,
                            student.email,
                            'defaultpassword' // Προσωρινός κωδικός
                        ], (insertErr) => {
                            if (insertErr) {
                                console.error('Error inserting student:', insertErr);
                            } else {
                                console.log(`Student ${student.email} added successfully.`);
                            }
                        });
                    }
                });
            });
        } else {
            console.warn('No students data found in the file.');
        }

        // Εισαγωγή Γραμματείας
        if (data.administrators) {
            data.administrators.forEach(administrator => {
                const query = `SELECT * FROM ADMINISTRATORS WHERE email=?;`;
                db.query(query, [administrator.email], (err, results) => {
                    if (err) {
                        console.error('Error checking for duplicate administrators:', err);
                        return;
                    }
                    if (results.length === 0) {
                        const insertQuery = `
                    INSERT INTO administrators (name, surname, email, password)
                    VALUES (?, ?, ?, ?);
                `;
                        db.query(insertQuery, [
                            administrator.name,
                            administrator.surname,
                            administrator.email,
                            'defaultpassword' // Προσωρινός κωδικός
                        ], (insertErr) => {
                            if (insertErr) {
                                console.error('Error inserting administrator:', insertErr);
                            } else {
                                console.log(`Administrator ${administrator.email} added successfully.`);
                            }
                        });
                    }
                });
            });
        } else {
            console.warn('No administrators data found in the file.');
        }

        // Εισαγωγή διπλωματικών
        if (data.theses) {
            data.theses.forEach(thesis => {

                const query = `SELECT * FROM THESES WHERE thesis_id=?;`;
                db.query(query, [thesis.thesis_id], (err, results) => {
                    if (err) {
                        console.error('Error checking for duplicate theses: ', err);
                        return;
                    }
                    if (results.length === 0) {
                        const insertQuery = `
                    INSERT INTO theses (professor_id, student_id, title, summary, status, pdf_path, start_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                `;
                        db.query(insertQuery, [
                            thesis.professor_id,
                            thesis.student_id || null, // Χρησιμοποίησε NULL αν το student_id είναι κενό
                            thesis.title,
                            thesis.summary,
                            thesis.status,
                            thesis.pdf_path || null, // Χρησιμοποίησε NULL αν το pdf_path είναι κενό
                            thesis.start_date
                        ], (insertErr) => {
                            if (insertErr) {
                                console.error('Error inserting thesis:', insertErr);
                            } else {
                                console.log(`Thesis ${thesis.thesis_id} added successfully.`);
                            }
                        });
                    }
                });
            });
        } else {
            console.warn('No theses data found in the file.');
        }

        //Εισαγωγή Τριμελών
        if (data.committees) {
            data.committees.forEach(committee => {
                const query = `SELECT * FROM COMMITTEES WHERE thesis_id=?;`;
                db.query(query, [committee.thesis_id], (err, results) => {
                    if (err) {
                        console.error('Error checking for duplicate committees: ', err);
                        return;
                    }
                    if (results.length === 0) {
                        const insertQuery = `
                    INSERT INTO committees (thesis_id, member1_id, member2_id)
                    VALUES (?, ?, ?);
                `;
                        db.query(insertQuery, [
                            committee.thesis_id,
                            committee.member1_id,  // Καθηγητής 1
                            committee.member2_id   // Καθηγητής 2
                        ], (insertErr) => {
                            if (insertErr) {
                                console.error('Error inserting committee:', insertErr);
                            } else {
                                console.log(`Committee for Thesis ${committee.thesis_id} added successfully.`);
                            }
                        });
                    }
                });
            });
        } else {
            console.warn('No committees data found in the file.');
        }

        //Εισαγωγή Προσκλήσεων
        if (data.invitations) {
            data.invitations.forEach(invitation => {
                const query = `SELECT * FROM INVITATIONS WHERE id=?;`;
                db.query(query, [invitation.id], (err, results) => {
                    if (err) {
                        console.error('Error checking for duplicate invitations: ', err);
                        return;
                    }
                    if (results.length === 0) {
                        const insertQuery = `
                    INSERT INTO invitations (id, thesis_id, professor_id)
                    VALUES (?, ?, ?);
                `;
                        db.query(insertQuery, [invitation.id, invitation.thesis_id, invitation.professor_id], (insertErr) => {
                            if (insertErr) {
                                console.error('Error inserting invitation:', insertErr);
                            } else {
                                console.log(`Invitation ${invitation.id} added successfully.`);
                            }
                        });
                    }
                });
            });
        } else {
            console.warn('No invitations data found in the file.');
        }

        // Εισαγωγή Εξετάσεων
        if (data.examinations) {
            data.examinations.forEach(examination => {
                const query = `SELECT * FROM EXAMINATIONS WHERE thesis_id=?;`;
                db.query(query, [examination.thesis_id], (err, results) => {
                    if (err) {
                        console.error('Error checking for duplicate examinations: ', err);
                        return;
                    }
                    if (results.length === 0) {
                        const insertQuery = `
                    INSERT INTO EXAMINATIONS (thesis_id, date, type_of_exam, location, exam_report)
                    VALUES (?, ?, ?, ?, ?);
                `;
                        db.query(insertQuery, [
                            examination.thesis_id,
                            examination.date,
                            examination.type_of_exam,
                            examination.location,
                            examination.exam_report
                        ], (insertErr) => {
                            if (insertErr) {
                                console.error('Error inserting examination:', insertErr);
                            } else {
                                console.log(`Examination ${examination.thesis_id} added successfully.`);
                            }
                        });
                    }
                });
            });
        } else {
            console.warn('No examinations data found in the file.');
        }

        // Εισαγωγή Logs
        if (data.logs) {
            data.logs.forEach(log => {
                const query = `SELECT * FROM LOGS WHERE logs.id=?;`;
                db.query(query, [log.id], (err, results) => {
                    if (err) {
                        console.error('Error checking for duplicate logs: ', err);
                        return;
                    }
                    if (results.length === 0) {
                        const insertQuery = `
                        INSERT INTO LOGS (id, thesis_id, date_of_change, old_state, new_state)
                        VALUES (?, ?, ?, ?, ?);
                    `;
                        db.query(insertQuery, [
                            log.id,
                            log.thesis_id,
                            log.date_of_change,
                            log.old_state,
                            log.new_state
                        ], (insertErr) => {
                            if (insertErr) {
                                console.error('Error inserting logs:', insertErr);
                            } else {
                                console.log(`Log ${log.id} added successfully.`);
                            }
                        });
                    }
                });
            });
        } else {
            console.warn('No logs data found in the file.');
        }

        console.log(`Database updated!`);

    } else {
        console.log("Skipping data insertion due to missing file.");
    }
}

insertData();

module.exports = { db, insertData };