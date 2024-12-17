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

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
