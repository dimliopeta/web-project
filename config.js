const mysql = require('mysql2');
const fs = require('fs');


const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Tyropita4576',
    database: 'project_db'
});

// Φόρτωση δεδομένων από το αρχείο JSON
const data = JSON.parse(fs.readFileSync('./public/json/data.json', 'utf8'));

// Εισαγωγή δεδομένων στη βάση
function insertData() {
    // Εισαγωγή καθηγητών
    const professors = data.professors.map(prof => [
        prof.name,
        prof.surname,
        prof.email,
        prof.topic,
        prof.landline,
        prof.mobile,
        prof.department,
        prof.university,
        'defaultpassword' // Προσωρινός κωδικός
    ]);

    db.query(
        `INSERT INTO professors (name, surname, email, topic, landline, mobile, department, university, password) 
        VALUES ?`,
        [professors],
        (err) => {
            if (err) console.error('Error inserting professors:', err);
            else console.log('Professors inserted successfully');
        }
    );

    // Εισαγωγή φοιτητών
    const students = data.students.map(student => [
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
        'defaultpassword' // Προσωρινός κωδικός
    ]);

    db.query(
        `INSERT INTO students (name, surname, student_number, street, number, city, postcode, father_name, landline_telephone, mobile_telephone, email, password) 
        VALUES ?`,
        [students],
        (err) => {
            if (err) console.error('Error inserting students:', err);
            else console.log('Students inserted successfully');
        }
    );
}

// Κλήση της συνάρτησης για εισαγωγή δεδομένων
insertData();


module.exports = db;