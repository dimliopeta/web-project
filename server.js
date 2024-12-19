const express = require('express');
const db = require('./config');
const path = require('path');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');


const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-secret-key';


// Έλεγχος σύνδεσης με τη βάση δεδομένων
db.query('SELECT 1', (err, results) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1); // Τερματισμός του server αν η σύνδεση αποτύχει
    } else {
        console.log('Database connected successfully!');
    }
});


// Ορισμός του index file και των public αρχειων
app.use(express.static('public', {
index: 'index.html' // Ορισμός του index για το static
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Middleware για έλεγχο JWT
app.use(cookieParser());
const authenticateJWT = (req, res, next) => {
    const token = req.cookies?.token ||  req.headers.authorization?.split(' ')[1]; // Παίρνει το token από το header ή απο το cookie. Στη περιπτωση μας, απο το cookie. 

    if (!token) {
        console.log('No token found.');
        return res.status(401).send('Access denied');
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            console.log('Token not verified.');
            return res.status(403).send('Invalid token');
        }

        req.user = user; // Αποθηκεύουμε τα δεδομένα του χρήστη στο request
        next();
    });
};

const authorizeRole = (requiredRole) => {
    return (req, res, next) => {
        if (req.user.role !== requiredRole) {
            return res.status(403).send('Access denied');
        }
        next();
    };
};


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
            const token = jwt.sign(
                { userId: user.email, role: user.role },
                SECRET_KEY,
                { expiresIn: '1h' } // Το token λήγει σε 1 ώρα
            );

            // Αποθήκευση του token σε cookie για εύκολη χρήση
            res.cookie('token', token, { httpOnly: true });

            // Ανακατεύθυνση με βάση τον ρόλο
            if (user.role === 'professor') {
                return res.redirect('/teacher');
            } else if (user.role === 'student') {
                return res.redirect('/student');
            }
        } else {
            res.status(401).send('Invalid credentials');
        }
    });
});


// Προστατευμένα endpoints για διπλωματικές
app.get('/api/theses', authenticateJWT, (req, res) => {
    console.log(`User ID: ${req.user.userId}, Role: ${req.user.role}`);
    const query = `SELECT * FROM THESIS;`;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση των διπλωματικών:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server' });
        }

        res.status(200).json({ success: true, theses: results });
    });
});

app.post('/api/theses/new', authenticateJWT, (req, res) => {
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
        return res.status(201).json({ success: true, message: 'Η διπλωματική δημιουργήθηκε επιτυχώς!' });
    });
});


// Προστατευμένα routes για καθηγητές και φοιτητές
    // Teacher Page
app.get('/teacher', authenticateJWT, authorizeRole('professor'), (req, res) => {
    res.sendFile(path.join(__dirname, 'protected_views', 'teacher.html'));
});

    // Student Page
app.get('/student', authenticateJWT, authorizeRole('student'), (req, res) => {
    res.sendFile(path.join(__dirname, 'protected_views', 'student.html'));
});



// Εκκίνηση του server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
