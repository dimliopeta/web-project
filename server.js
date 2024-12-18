const express = require('express');
const db = require('./config');

const app = express();
const PORT = 3000;

// Έλεγχος σύνδεσης με τη βάση δεδομένων
db.query('SELECT 1', (err, results) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1); // Τερματισμός του server αν η σύνδεση αποτύχει
    } else {
        console.log('Database connected successfully!');
    }
});

app.use(express.static('public'));
app.use(express.json());

app.use(express.urlencoded({ extended: true }));


// Login endpoint
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = `
        SELECT * FROM (
            SELECT email, password, 'student' AS role FROM students
            UNION ALL
            SELECT email, password, 'professor' AS role FROM professors
        ) AS users
        WHERE email = ? AND password = ?;
    `;

    db.query(query, [email, password], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }

        if (results.length > 0) {
            const user = results[0];
            res.send(`Welcome ${user.role}!`);
        } else {
            res.status(401).send('Invalid credentials');
        }
    });
});

//new thesis endpoint
app.post('/newthesis', (req, res) => {
    console.log('Request received:', req.headers);
    console.log('Body raw:', req.body);

    const { title, summary } = req.body;

    const query = `INSERT INTO THESIS (title, summary) VALUES (?, ?);`;

    db.query(query, [title, summary], (err, result) => {
        if (err) {
            console.error('Σφάλμα κατά την αποθήκευση της διπλωματικής:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server' });
        }

        console.log('Thesis created successfully!');
        return res.status(200).json({ success: true, message: 'Η διπλωματική δημιουργήθηκε επιτυχώς!' });
    });
});

app.get('/theses', (req, res) => {
    const query = `SELECT * FROM THESIS;`;

    db.query(query, (err, results) => { // Αφαιρούμε τις παραμέτρους
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση των διπλωματικών:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server' });
        }

        res.status(200).json({ success: true, theses: results }); // Χρήση του σωστού results
    });
});



app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
