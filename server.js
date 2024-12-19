const express = require('express');
const db = require('./config');
const path = require('path');
const session = require('express-session');

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

// Middleware για τη διαχείριση στατικών αρχείων
app.use(express.static('public', {
    index: 'index.html' // Ορισμός του index για το static
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware για session
app.use(session({
    secret: 'my-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Για τοπική ανάπτυξη
}));

// Middleware για έλεγχο αυθεντικοποίησης
const requireAuth = (role) => (req, res, next) => {
    if (req.session.userId && req.session.role) {
        if (role && req.session.role !== role) {
            console.log(`Access denied for user: ${req.session.userId}, required role: ${role}`);
            return res.status(403).send('Access denied');
        }
        next();
    } else {
        console.log('User not authenticated');
        res.redirect('/'); // Αν ο χρήστης δεν είναι αυθεντικοποιημένος
    }
};

// Προστατευμένο route για καθηγητές
app.get('/teacher', requireAuth('professor'), (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'teacher.html'));
});

// Προστατευμένο route για φοιτητές
app.get('/student', requireAuth('student'), (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'student.html'));
});

// Login endpoint
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Email and password are required');
    }

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
            console.error('Database error:', err);
            return res.status(500).send('Server error');
        }

        if (results.length > 0) {
            const user = results[0];
            req.session.userId = user.email; // Αποθηκεύουμε το email στη συνεδρία για έλεγχο
            req.session.role = user.role;   // Αποθηκεύουμε τον ρόλο στη συνεδρία

            console.log(`User logged in: ${req.session.userId}, role: ${req.session.role}`);

            if (user.role === 'professor') {
                res.redirect('/teacher');
            } else if (user.role === 'student') {
                res.redirect('/student');
            }
        } else {
            res.status(401).send('Invalid credentials');
        }
    });
});

// Endpoints για διπλωματικές
app.post('/newthesis', (req, res) => {
    const { title, summary } = req.body;

    if (!title || !summary) {
        return res.status(400).json({ success: false, message: 'Title and summary are required' });
    }

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

    db.query(query, (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση των διπλωματικών:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server' });
        }

        res.status(200).json({ success: true, theses: results });
    });
});

// Εκκίνηση του server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));