const mysql = require('mysql2');
const fs = require('fs');


const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'project_db'
});

// Μετατρέπουμε τα JSON objects σε Javascript objects και τα αποθηκεύουμε στο data
const data = JSON.parse(fs.readFileSync('./provided_data/data.json', 'utf8'));

// Εισαγωγή δεδομένων στη βάση
function insertData() {
    // Εισαγωγή καθηγητών
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

    // Εισαγωγή φοιτητών
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

    // Εισαγωγή διπλωματικών
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

    //Εισαγωγή Τριμελών
    data.committees.forEach(committee => {
        const query = `SELECT * FROM COMMITTEES WHERE thesis_id=?;`;
        db.query(query, [committee.thesis_id], (err, results) => {
            if (err) {
                console.error('Error checking for duplicate committees: ', err);
                return;
            }
            if (results.length === 0) {
                const insertQuery = `
                    INSERT INTO committees (thesis_id)
                    VALUES (?);
                `;
                db.query(insertQuery,[committee.thesis_id], (insertErr) =>{
                    if (insertErr) {
                        console.error('Error inserting thesis:', insertErr);
                    } else {
                        console.log(`Committee ${committee.thesis_id} added successfully.`);
                    }
                });
            }
        });
    });
    //Εισαγωγή Προσκλήσεων
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
                db.query(insertQuery,[invitation.id, invitation.thesis_id,invitation.professor_id], (insertErr) =>{
                    if (insertErr) {
                        console.error('Error inserting invitation:', insertErr);
                    } else {
                        console.log(`Invitation ${invitation.id} added successfully.`);
                    }
                });
            }
        });
    });
    // Εισαγωγή Εξετάσεων
    data.examinations.forEach(examination => {
        const query = `SELECT * FROM EXAMINATIONS WHERE thesis_id=?;`;
        db.query(query, [examination.thesis_id], (err, results) => {
            if (err) {
                console.error('Error checking for duplicate examinations: ', err);
                return;
            }
            if (results.length === 0) {
                const insertQuery = `
                    INSERT INTO EXAMINATIONS (thesis_id, date, type_of_exam, location)
                    VALUES (?, ?, ?, ?);
                `;
                db.query(insertQuery, [
                    examination.thesis_id,
                    examination.date,
                    examination.type_of_exam,
                    examination.location
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

    console.log(`Database up-to-date!`);
}



// Κλήση της συνάρτησης για εισαγωγή δεδομένων
insertData();


module.exports = db;