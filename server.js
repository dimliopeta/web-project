const express = require('express');
const db = require('./config');
const path = require('path');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');


const app = express();
app.use('/theses_pdf', express.static(path.join(__dirname, 'theses_pdf')));
const PORT = 3000;
const SECRET_KEY = 'your-secret-key';



//----------------------------- STARTUP SETTINGS -----------------------------

//-------------- Check if the server is connected to the database --------------
db.query('SELECT 1', (err, results) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1); // Τερματισμός του server αν η σύνδεση αποτύχει
    } else {
        console.log('Database connected successfully!');
    }
});

//-------------- Set Index file and the public folder --------------
app.use(express.static('public', {
    index: 'index.html' // Ορισμός του index για το static
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



//----------------------------- TOKEN-COOKIES CONTROL AND LOGIN ROLE ROUTING -----------------------------

//-------------- JWT token control --------------
app.use(cookieParser());
const authenticateJWT = (req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1]; // Extract token from header or cookie - in this case, from the cookie 

    if (!token) {
        console.log('No token found.');
        return res.status(401).send('Access denied');
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            console.log('Token not verified.');
            return res.status(403).send('Invalid token');
        }

        req.user = user;
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

// Route for /login and /login.html
app.get('/login', (req, res) => {
    const token = req.cookies?.token;

    if (token) {
        jwt.verify(token, SECRET_KEY, (err, user) => {
            if (!err && user) {
                // If valid user
                return res.redirect(user.role === 'professor' ? '/professor' : '/student');
            }
            // If not
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Pragma', 'no-cache');
            return res.sendFile(path.join(__dirname, 'views', 'login.html'));
        });
    } else {
        // If token missing, return to login
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
                { expiresIn: '1h' } // Token TTL = 1hr
            );

            // Save the token in a cookie for ease of use
            res.cookie('token', token, { httpOnly: true });

            // Redirect based on role
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

// Route user to protected view page pased on role
app.get('/professor', authenticateJWT, authorizeRole('professor'), (req, res) => {
    res.sendFile(path.join(__dirname, 'protected_views', 'professor.html'));
});

app.get('/student', authenticateJWT, authorizeRole('student'), (req, res) => {
    res.sendFile(path.join(__dirname, 'protected_views', 'student.html'));
});

// Logout endpoint
app.post('/logout', authenticateJWT, (req, res) => {
    // Clear existing cookie
    res.clearCookie('token', { httpOnly: true });
    // Return to index
    res.redirect('/');
});


//----------------------------- APIs FOR PAGE FUNCTIONS -----------------------------

//----------------- Multer middleware declaration/setup for PDF upload -----------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'theses_pdf'); // Correct path if both the server and the folder are in the same directory
    },
    filename: (req, file, cb) => {
        // Ensure user is authenticated and has a name
        const professorId = req.user?.userId || 'Unknown-User'; // Use 'Unknown-User' if not found
        const originalName = file.originalname.replace(/\s+/g, '_'); // Replace spaces with underscores for a clean filename
        const fileName = `${professorId}-${originalName}`; // Format the filename
        cb(null, fileName); // Save the file with the formatted name
    }
});
// Filter to ensure only PDFs are uploaded
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


//----------------- API to fetch Unassigned Theses Data -----------------
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


//----------------- API to fetch Theses Data for both students and professors -----------------
app.get('/api/theses', authenticateJWT, (req, res) => {
    const userId = req.user.userId; // Get user Id and Role from the JWT
    const role = req.user.role;

    let query;

    if (role === 'professor') {
        query = `SELECT * FROM Theses WHERE professor_id = ${userId};`;

    } else if (role === 'student') {
        query = `SELECT
                    Theses.*,
                    Professors.name AS professor_name, 
                    Professors.surname AS professor_surname, 
                    Committee1.name AS committee_member1_name,
                    Committee1.surname AS committee_member1_surname,
                    Committee2.name AS committee_member2_name,
                    Committee2.surname AS committee_member2_surname
                FROM Theses
                LEFT JOIN Professors ON Theses.professor_id = Professors.id
                LEFT JOIN Committees ON Theses.thesis_id = Committees.thesis_id
                LEFT JOIN Professors AS Committee1 ON Committees.member1_id = Committee1.id
                LEFT JOIN Professors AS Committee2 ON Committees.member2_id = Committee2.id
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


//----------------- API to fetch Student Data by Id -----------------
app.get('/api/student', authenticateJWT, (req, res) => {
    const userId = req.user.userId; // Get user ID from the JWT

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


//----------------- API for Student Search Bar for thesis assignment -----------------
app.get('/api/student-search', authenticateJWT, (req, res) => {
    const { input } = req.query;

    if (!input) {
        return res.status(400).json({ success: false, message: 'Το πεδίο αναζήτησης είναι κενό.' });
    }

    const query = `
        SELECT s.student_number, s.name, s.surname
        FROM students s
        WHERE (s.student_number LIKE ? OR s.name LIKE ? OR s.surname LIKE ?)
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


//----------------- API to Create New Thesis -----------------
app.post('/api/theses/new', authenticateJWT, upload.single('pdf'), (req, res) => {
    const { title, summary } = req.body;
    const professorId = req.user.userId;
    const file = req.file;

    if (!title || !summary) {
        return res.status(400).json({ success: false, message: 'Title and summary are required' });
    }
    const filePath = file ? file.path : null; // Save the file path if uploaded, else null

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


//----------------- API to Edit existing Thesis -----------------
app.put('/api/theses/:id', authenticateJWT, upload.single('pdf'), (req, res) => {
    const thesisId = req.params.id;   /// TO FIX !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    const { title, summary } = req.body;
    const file = req.file;
    const professorId = req.user.userId;

    if (!thesisId) {
        return res.status(400).json({ success: false, message: 'Missing thesis ID.' });
    }

    if (!title && !summary && !file) {
        return res.status(400).json({ success: false, message: 'No changes provided.' });
    }

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

        // Check for any changes
        if (
            updatedData.title === oldData.title &&
            updatedData.summary === oldData.summary &&
            updatedData.pdf_path === oldData.pdf_path
        ) {
            return res.status(400).json({ success: false, message: 'No changes detected.' });
        }

        // Delete old PDF if a new one was uploaded
        if (file && oldData.pdf_path) {
            const fs = require('fs');
            fs.unlink(oldData.pdf_path, (err) => {
                if (err) console.error('Σφάλμα κατά τη διαγραφή του παλιού αρχείου:', err);
            });
        }

        // Update Database
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


//----------------- API for Invitation Loading -----------------
app.get('/api/invitations', authenticateJWT, (req, res) => {
    const professorId = req.user.userId; // Get professor ID from the JWT
    console.log('Professor ID:', professorId);

    if (!professorId) {
        return res.status(400).json({ success: false, message: 'Professor ID is missing.' });
    }

    const query = `
       SELECT 
        i.id AS invitation_id,
        i.thesis_id,
        i.professor_id,
        i.status AS invitation_status,
        i.invitation_date,
        i.response_date,
        t.title AS thesis_title,
        t.summary AS thesis_summary
        FROM 
            Invitations i
        JOIN 
            Theses t ON i.thesis_id = t.thesis_id
        WHERE 
            i.professor_id = ? and i.status = 'pending';

    `;

    db.query(query, [professorId], (err, results) => {
        if (err) {
            console.error('Error fetching invitations:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }

        console.log('Invitations from DB:', results);
        res.json({ success: true, invitations: results });
    });
});



//----------------- API for Invitation Acceptance/Rejection -----------------
app.post('/api/invitations/:id/action', authenticateJWT, (req, res) => {
    const invitationId = req.params.id;
    const { action } = req.body; // Αποδοχή της δράσης από το σώμα του αιτήματος

    if (!['accepted', 'rejected'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Invalid action provided.' });
    }

    const query = `
        UPDATE Invitations 
        SET status = ?, response_date = NOW() 
        WHERE id = ?;
    `;

    db.query(query, [action, invitationId], (err, results) => {
        if (err) {
            console.error('Error updating invitation:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Invitation not found.' });
        }

        res.json({ success: true, message: `Η πρόσκληση ${action === 'accepted' ? 'αποδέχθηκε' : 'απορρίφθηκε'} επιτυχώς!` });
    });
});



//----------------- API to Assign Thesis to Students -----------------
app.post('/api/theses/assign', authenticateJWT, (req, res) => {
    const studentId = parseInt(req.body.studentId, 10);
    const thesisId = parseInt(req.body.thesisId, 10);

    if (isNaN(studentId) || isNaN(thesisId)) {
        return res.status(400).json({ success: false, message: 'Μη έγκυρα δεδομένα. Παρακαλώ δοκιμάστε ξανά.' });
    }

    const assignQuery = `
        UPDATE THESES
        SET student_id = ?, status = 'active'
        WHERE thesis_id = ? AND status = 'unassigned';
    `;

    const insertQuery = `
        INSERT INTO Committees (thesis_id, member1_id, member2_id)
        VALUES (?, NULL, NULL);
    `;

    // Ξεκινάμε μια συναλλαγή για να διασφαλίσουμε συνοχή δεδομένων
    db.beginTransaction((err) => {
        if (err) {
            console.error('Σφάλμα κατά την εκκίνηση της συναλλαγής:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }

        db.query(assignQuery, [studentId, thesisId], (assignErr, assignResult) => {
            if (assignErr) {
                console.error('Σφάλμα κατά την ανάθεση διπλωματικής:', assignErr);
                return db.rollback(() => {
                    res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
                });
            }

            if (assignResult.affectedRows === 0) {
                return db.rollback(() => {
                    res.status(400).json({ success: false, message: 'Η διπλωματική δεν είναι διαθέσιμη για ανάθεση.' });
                });
            }

            db.query(insertQuery, [thesisId], (insertErr) => {
                if (insertErr) {
                    console.error('Σφάλμα κατά τη δημιουργία της τριμελούς:', insertErr);
                    return db.rollback(() => {
                        res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
                    });
                }

                // Επιτυχία και για τα δύο queries, κάνουμε commit
                db.commit((commitErr) => {
                    if (commitErr) {
                        console.error('Σφάλμα κατά την επικύρωση της συναλλαγής:', commitErr);
                        return db.rollback(() => {
                            res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
                        });
                    }

                    res.status(200).json({ success: true, message: 'Η διπλωματική ανατέθηκε και η καταχώρηση τριμελούς δημιουργήθηκε επιτυχώς!' });
                });
            });
        });
    });
});


//-------------- API to Edit Student contact data via Button --------------
app.post('/api/updateProfile', authenticateJWT, (req, res) => {
    const userId = req.user.userId;
    const updates = req.body;

    if (updates.contact_email && !/\S+@\S+\.\S+/.test(updates.contact_email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }
    if (updates.mobile_telephone && !/^\d{10}$/.test(updates.mobile_telephone)) {
        return res.status(400).json({ success: false, message: 'Invalid mobile phone number.' });
    }

    // SQL query for dynamic update
    const fields = Object.keys(updates).map((field) => `${field} = ?`).join(', ');
    const values = Object.values(updates);

    // Add the User Id to the parameters
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



//----------------------------- SERVER START -----------------------------
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));