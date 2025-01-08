const express = require('express');
const db = require('./config');
const path = require('path');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');


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
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1]; // Παίρνει το token από το header ή απο το cookie. Στη περιπτωση μας, απο το cookie. 

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



app.get('/api/check-auth', (req, res) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.json({ isAuthenticated: false });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.json({ isAuthenticated: false });
        }
        res.json({ isAuthenticated: true, role: user.role });
    });
});



// Route για το /login και /login.html

app.get('/login', (req, res) => {
    const token = req.cookies?.token;

    if (token) {
        jwt.verify(token, SECRET_KEY, (err, user) => {
            if (!err && user) {
                // Αν ο χρήστης είναι έγκυρος, ανακατεύθυνση
                return res.redirect(user.role === 'professor' ? '/professor' : '/student');
            }
            // Αν το token είναι μη έγκυρο, συνεχίζουμε
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Pragma', 'no-cache');
            return res.sendFile(path.join(__dirname, 'views', 'login.html'));
        });
    } else {
        // Αν δεν υπάρχει token, εμφανίζουμε το login.html
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        return res.sendFile(path.join(__dirname, 'views', 'login.html'));
    }
});





// Login endpoint
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Email and password are required');
    }

    const query = `
        SELECT * FROM (
            SELECT id, email, password, 'student' AS role FROM students
            UNION ALL
            SELECT id, email, password, 'professor' AS role FROM professors
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
                { userId: user.id, role: user.role },
                SECRET_KEY,
                { expiresIn: '1h' } // Το token λήγει σε 1 ώρα
            );

            // Αποθήκευση του token σε cookie για εύκολη χρήση
            res.cookie('token', token, { httpOnly: true });

            // Ανακατεύθυνση με βάση τον ρόλο
            if (user.role === 'professor') {
                return res.redirect('/professor');
            } else if (user.role === 'student') {
                return res.redirect('/student');
            }
        } else {
            res.status(401).send('Invalid credentials');
        }
    });
});





// Προστατευμένα routes για καθηγητές και φοιτητές
// Σελίδα για καθηγητές
app.get('/professor', authenticateJWT, authorizeRole('professor'), (req, res) => {
    res.sendFile(path.join(__dirname, 'protected_views', 'professor.html'));
});

// Σελίδα για φοιτητές
app.get('/student', authenticateJWT, authorizeRole('student'), (req, res) => {
    res.sendFile(path.join(__dirname, 'protected_views', 'student.html'));
});

// Logout endpoint
app.post('/logout', authenticateJWT, (req, res) => {
    // Καθαρισμός του cookie που περιέχει το JWT
    res.clearCookie('token', { httpOnly: true });
    // Ανακατεύθυνση στο index
    res.redirect('/');
});




// Endpoint για την ανάρτηση PDF αρχείων με χρήση multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'theses_pdf'); // Correct path
    },
    filename: (req, file, cb) => {
        // Ensure user is authenticated and has a name
        const professorId = req.user?.userId || 'Unknown-User'; // Use 'Unknown-User' if not found
        const originalName = file.originalname.replace(/\s+/g, '_'); // Replace spaces with underscores for a clean filename
        const fileName = `${professorId} - ${originalName}.pdf`; // Format the filename
        cb(null, fileName); // Save the file with the formatted name
    }
});

// Φίλτρο για την ανάρτηση μόνο PDF αρχείων και όχι άλλων τύπων και αρχικοποίηση multer
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    },
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

//Endpoint ανάρτησης
app.post('/theses_pdf', authenticateJWT, upload.single('pdf'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded or invalid file type');
    }

    res.status(200).json({
        message: 'File uploaded successfully!',
        file: {
            filename: req.file.filename,
            path: req.file.path
        }
    });
});

app.get('/api/theses/unassigned', authenticateJWT, (req, res) => {
    const professorId = req.user.userId;

    const query = `
        SELECT thesis_id, title, summary
        FROM THESES
        WHERE professor_id = ? AND status = 'unassigned';
    `;

    db.query(query, [professorId], (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση των διπλωματικών:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }

        res.status(200).json({ success: true, theses: results });
    });
});


//Εύρεση φοιτητή από καθηγητή
app.get('/api/student-search', authenticateJWT, (req, res) => {
    const { input } = req.query;

    if (!input) {
        return res.status(400).json({ success: false, message: 'Το πεδίο αναζήτησης είναι κενό.' });
    }

    const query = `
        SELECT s.id, s.name, s.surname
        FROM students s
        WHERE (s.id LIKE ? OR s.name LIKE ? OR s.surname LIKE ?)
          AND s.id NOT IN (
              SELECT DISTINCT student_id
              FROM theses
              WHERE student_id IS NOT NULL
          );
    `;
    const searchInput = `%${input}%`;

    db.query(query, [searchInput, searchInput, searchInput], (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την αναζήτηση φοιτητών:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }

        res.status(200).json({ success: true, students: results });
    });
});




//-----------API to fetch theses data data for both students and professors-----------
app.get('/api/theses', authenticateJWT, (req, res) => {
    const userId = req.user.userId; // Get user ID from the JWT
    const role = req.user.role;    // Assume JWT includes the role ('professor' or 'student')

    let query;

    if (role === 'professor') {
        // Retrieve theses assigned to the professor
        query = `SELECT * FROM Theses WHERE professor_id = ${userId};`;
    } else if (role === 'student') {
        // Retrieve the thesis assigned to the student
        query = `SELECT Theses.*, Professors.name, Professors.surname, Committees.member1_id, Committees.member2_id
        FROM Theses
        LEFT JOIN Professors ON Theses.professor_id = Professors.id
        LEFT JOIN Committees ON Theses.Thesis_id = Committees.Thesis_id
        WHERE Theses.student_id = ${userId};`;
    } else {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }

    db.query(query, (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση των διπλωματικών:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server' });
        }

        res.status(200).json({ success: true, theses: results });
    });
});

//Δημιουργία νέου θέματος 
app.post('/api/theses/new', authenticateJWT, upload.single('pdf'), (req, res) => {
    const { title, summary } = req.body;
    const professorId = req.user.userId;
    const file = req.file;

    if (!title || !summary) {
        return res.status(400).json({ success: false, message: 'Title and summary are required' });
    }
    const filePath = req.file ? req.file.path : null; // Save the file path if uploaded

    const query = `INSERT INTO THESES (professor_id, student_id, title, summary, pdf_path) VALUES (?, ?, ?, ?, ?);`;
    db.query(query, [professorId, null, title, summary, filePath], (err, result) => {
        if (err) {
            console.error('Σφάλμα κατά την αποθήκευση της διπλωματικής:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server' });
        }

        console.log('Thesis created successfully!');
        if (file) {
            console.log("PDF uploaded:", file);  // Log when a PDF file is uploaded
        } else {
            console.log("Theses created without pdf"); // Log if no PDF is uploaded
        }

        return res.status(201).json({ success: true, message: 'Η διπλωματική δημιουργήθηκε επιτυχώς!' });
    });
});


//Ανάθεση σε φοιτητή 
app.post('/api/theses/assign', authenticateJWT, (req, res) => {
    // Μετατροπή των τιμών σε αριθμούς
    const studentId = parseInt(req.body.studentId, 10);
    const thesisId = parseInt(req.body.thesisId, 10);

    // Έλεγχος αν οι τιμές είναι έγκυρες
    if (isNaN(studentId) || isNaN(thesisId)) {
        return res.status(400).json({ success: false, message: 'Μη έγκυρα δεδομένα. Παρακαλώ δοκιμάστε ξανά.' });
    }

    const query = `
        UPDATE THESES
        SET student_id = ?, status = 'active'
        WHERE thesis_id = ? AND status = 'unassigned';
    `;

    db.query(query, [studentId, thesisId], (err, result) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάθεση διπλωματικής:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }

        if (result.affectedRows === 0) {
            return res.status(400).json({ success: false, message: 'Η διπλωματική δεν είναι διαθέσιμη για ανάθεση.' });
        }

        res.status(200).json({ success: true, message: 'Η διπλωματική ανατέθηκε επιτυχώς!' });
    });
});


//Επεξεργασία Διπλωματικής
app.put('/api/theses/:id', authenticateJWT, upload.single('pdf'), (req, res) => {
    const thesisId = req.params.id;
    const { title, summary } = req.body;
    const file = req.file;
    const professorId = req.user.userId;

    if (!thesisId) {
        return res.status(400).json({ success: false, message: 'Missing thesis ID.' });
    }

    if (!title && !summary && !file) {
        return res.status(400).json({ success: false, message: 'No changes provided.' });
    }

    // Εύρεση των υπαρχόντων δεδομένων
    const getThesisQuery = `
        SELECT title, summary, pdf_path
        FROM THESES
        WHERE thesis_id = ? AND professor_id = ?;
    `;
    db.query(getThesisQuery, [thesisId, professorId], (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση της διπλωματικής:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Η διπλωματική δεν βρέθηκε.' });
        }

        const oldData = results[0];
        const updatedData = {
            title: title || oldData.title,
            summary: summary || oldData.summary,
            pdf_path: file ? file.path : oldData.pdf_path,
        };

        // Έλεγχος αν υπάρχει κάποια αλλαγή
        if (
            updatedData.title === oldData.title &&
            updatedData.summary === oldData.summary &&
            updatedData.pdf_path === oldData.pdf_path
        ) {
            return res.status(400).json({ success: false, message: 'No changes detected.' });
        }

        // Διαγραφή του παλιού αρχείου PDF αν έχει ανέβει νέο
        if (file && oldData.pdf_path) {
            const fs = require('fs');
            fs.unlink(oldData.pdf_path, (err) => {
                if (err) console.error('Σφάλμα κατά τη διαγραφή του παλιού αρχείου:', err);
            });
        }

        // Ενημέρωση των δεδομένων στη βάση
        const updateQuery = `
            UPDATE THESES
            SET title = ?, summary = ?, pdf_path = ?
            WHERE thesis_id = ? AND professor_id = ?;
        `;
        db.query(updateQuery, [updatedData.title, updatedData.summary, updatedData.pdf_path, thesisId, professorId], (err) => {
            if (err) {
                console.error('Σφάλμα κατά την ενημέρωση της διπλωματικής:', err);
                return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
            }

            res.status(200).json({ success: true, message: 'Η διπλωματική ενημερώθηκε επιτυχώς!' });
        });
    });
});

// API to fetch student data by ID
app.get('/api/student', authenticateJWT, (req, res) => {
    const userId = req.user.userId; // Extract user ID from the JWT

    const query = `SELECT * FROM students WHERE id = ?`;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching student data:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Send the student data as a response
        res.json(results[0]);
    });
});


//-----------API to update student contact data after button press-----------
app.post('/api/updateProfile', authenticateJWT, (req, res) => {
    const userId = req.user.userId; // ID του χρήστη από το JWT
    const updates = req.body; // Τα δεδομένα που στέλνει ο client

    if (updates.contact_email && !/\S+@\S+\.\S+/.test(updates.contact_email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }
    if (updates.mobile_telephone && !/^\d{10}$/.test(updates.mobile_telephone)) {
        return res.status(400).json({ success: false, message: 'Invalid mobile phone number.' });
    }

    // Δημιουργία SQL query για δυναμική ενημέρωση
    const fields = Object.keys(updates).map((field) => `${field} = ?`).join(', ');
    const values = Object.values(updates);

    // Προσθήκη του ID του χρήστη στις παραμέτρους
    values.push(userId);

    const query = `UPDATE students SET ${fields} WHERE id = ?`;

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Σφάλμα κατά την ενημέρωση του προφίλ:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Ο χρήστης δεν βρέθηκε.' });
        }

        res.status(200).json({ success: true, message: 'Το προφίλ ενημερώθηκε επιτυχώς!' });
    });
});


// Εκκίνηση του server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));