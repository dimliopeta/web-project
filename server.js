const express = require('express');
const db = require('./config');
const path = require('path');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');


const app = express();
app.use('/theses_pdf', express.static(path.join(__dirname, 'files/theses_pdf')));
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

//----------------- Multer declaration/setup for Theses' PDFs -----------------
const StoragePDFOnly = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'files/theses_pdf'); // Correct path if both the server and the folder are in the same directory
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
const uploadPDFOnly = multer({
    storage: StoragePDFOnly,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    },
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

//----------------- Multer declaration/setup for Theses' Attachments -----------------
const StorageAttachments = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'files/uploaded_files');
    },
    filename: (req, file, cb) => {
        const originalName = file.originalname.replace(/\s+/g, '_');
        const fileName = `${originalName}`;
        cb(null, fileName);
    }
});

const UploadAttachments = multer({
    storage: StorageAttachments,
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




//----------------------------- APIs FOR PAGE FUNCTIONS -----------------------------
//------------------API for loading Assigned Theses--------------
app.get('/api/theses/assigned', authenticateJWT, (req, res) => {
    const professor_id = req.user.userId;
    const query = `
        SELECT 
            t.title AS thesis_title,
            t.thesis_id,
            CONCAT(s.name, ' ', s.surname) AS student_name,
            s.student_number
        FROM 
            Theses t
        JOIN 
            Students s ON t.student_id = s.id
        WHERE 
            t.status = 'assigned' and t.professor_id = ?;
    `;
    db.query(query, [professor_id], (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση των ανατεθημένων διπλωματικών:', err);
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
    let queryParams = [];

    if (role === 'professor') {
        query = `


SELECT 
    t.thesis_id,
    t.title,
    t.summary,
    t.status,
    CONCAT(s.name, ' ', s.surname) AS student_name,
    s.student_number,
    s.contact_email AS student_email,
    CONCAT(p.name, ' ', p.surname) AS professor_name,
    p.email AS professor_email,
    c.member1_id AS committee_member1_id,
    CONCAT(c1.name, ' ', c1.surname) AS committee_member1_name,
    c.member2_id AS committee_member2_id,
    CONCAT(c2.name, ' ', c2.surname) AS committee_member2_name,
    t.start_date,
    t.exam_date,
    g.grade AS supervisor_grade,
    g.comments AS supervisor_comments,
    GROUP_CONCAT(DISTINCT i.status ORDER BY i.invitation_date DESC SEPARATOR ', ') AS invitations_status,
    CASE
        WHEN t.professor_id = ? THEN 'Επιβλέπων'
        WHEN c.member1_id = ? OR c.member2_id = ? THEN 'Μέλος Τριμελούς'
        ELSE 'Άγνωστος'
    END AS role
FROM Theses t
LEFT JOIN Students s ON t.student_id = s.id
LEFT JOIN Professors p ON t.professor_id = p.id
LEFT JOIN Committees c ON t.thesis_id = c.thesis_id
LEFT JOIN Professors c1 ON c.member1_id = c1.id
LEFT JOIN Professors c2 ON c.member2_id = c2.id
LEFT JOIN Grades g ON g.thesis_id = t.thesis_id AND g.professor_id = t.professor_id
LEFT JOIN Invitations i ON i.thesis_id = t.thesis_id
WHERE (p.id = ? OR c.member1_id = ? OR c.member2_id = ?) AND t.status != 'unassigned'
GROUP BY 
    t.thesis_id, t.title, t.summary, t.status, t.start_date, t.exam_date,
    s.name, s.surname, s.student_number, s.contact_email,
    p.name, p.surname, p.email,
    c.member1_id, c.member2_id, c1.name, c1.surname, c2.name, c2.surname, 
    g.grade, g.comments;

        `;
        queryParams = [userId, userId, userId, userId, userId, userId];
    } else if (role === 'student') {
        query = `
            SELECT
                Theses.*,
                DATE_FORMAT(Theses.start_date, '%Y-%m-%d') AS start_date,
                DATE_FORMAT(Theses.exam_date, '%Y-%m-%d') AS exam_date,
                Professors.name AS professor_name, 
                Professors.surname AS professor_surname, 
                Committee1.name AS committee_member1_name,
                Committee1.surname AS committee_member1_surname,
                Committee2.name AS committee_member2_name,
                Committee2.surname AS committee_member2_surname,
                SupervisorGrade.grade AS supervisor_grade,
                SupervisorGrade.comments AS supervisor_comments,
                Committee1Grade.grade AS committee_member1_grade,
                Committee1Grade.comments AS committee_member1_comments,
                Committee2Grade.grade AS committee_member2_grade,
                Committee2Grade.comments AS committee_member2_comments
            FROM Theses
            LEFT JOIN Professors ON Theses.professor_id = Professors.id
            LEFT JOIN Committees ON Theses.thesis_id = Committees.thesis_id
            LEFT JOIN Professors AS Committee1 ON Committees.member1_id = Committee1.id
            LEFT JOIN Professors AS Committee2 ON Committees.member2_id = Committee2.id
            LEFT JOIN Grades AS SupervisorGrade ON Theses.thesis_id = SupervisorGrade.thesis_id 
                AND Theses.professor_id = SupervisorGrade.professor_id
            LEFT JOIN Grades AS Committee1Grade ON Theses.thesis_id = Committee1Grade.thesis_id 
                AND Committees.member1_id = Committee1Grade.professor_id
            LEFT JOIN Grades AS Committee2Grade ON Theses.thesis_id = Committee2Grade.thesis_id 
                AND Committees.member2_id = Committee2Grade.professor_id
            WHERE Theses.student_id = ?;
        `;
        queryParams = [userId];
    } else {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση των διπλωματικών:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server' });
        }

        res.status(200).json({ success: true, theses: results });
    });
});


//----------------- API to handle Attachment Upload (File or Link) in Configuration page Management Section -----------------
app.post('/api/upload_attachment', authenticateJWT, UploadAttachments.single('attachment'), (req, res) => {
    const userId = req.user.userId;
    const thesisId = req.body.thesis_id;
    const attachmentType = req.body.type; // 'file' or 'link'

    console.log("Received upload request:");
    console.log("Thesis ID:", thesisId);
    console.log("Attachment Type:", attachmentType);
    console.log("File:", req.file);  // Log the uploaded file info

    if (!thesisId || !attachmentType) {
        return res.status(400).json({ success: false, message: 'Thesis ID and attachment type are required' });
    }

    // Handle FILE attachment
    if (attachmentType === 'file') {
        const filePath = req.file ? `./files/uploaded_files/${req.file.filename}` : null;

        // Check if the thesis already has a file (only one file can be uploaded)
        const checkQuery = `
            SELECT * FROM Attachments WHERE thesis_id = ? AND type = 'file';
        `;
        db.query(checkQuery, [thesisId], (err, results) => {
            if (err) {
                console.error('Error checking existing attachments:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }

            if (results.length > 0) {
                // If there's already a file, delete the old attachment
                const deleteQuery = `
                    DELETE FROM Attachments WHERE thesis_id = ? AND type = 'file';
                `;
                db.query(deleteQuery, [thesisId], (err) => {
                    if (err) {
                        console.error('Error deleting old attachment:', err);
                        return res.status(500).json({ success: false, message: 'Server error' });
                    }

                    const insertQuery = `
                        INSERT INTO Attachments (thesis_id, type, file_path) 
                        VALUES (?, 'file', ?);
                    `;
                    db.query(insertQuery, [thesisId, filePath], (err, result) => {
                        if (err) {
                            console.error('Error inserting new file attachment:', err);
                            return res.status(500).json({ success: false, message: 'Server error' });
                        }
                        res.status(200).json({ success: true, message: 'File uploaded successfully' });
                    });
                });
            } else {
                // If no file exists, insert the new one
                const insertQuery = `
                    INSERT INTO Attachments (thesis_id, type, file_path) 
                    VALUES (?, 'file', ?);
                `;
                db.query(insertQuery, [thesisId, filePath], (err, result) => {
                    if (err) {
                        console.error('Error inserting file attachment:', err);
                        return res.status(500).json({ success: false, message: 'Server error' });
                    }
                    res.status(200).json({ success: true, message: 'File uploaded successfully' });
                });
            }
        });
        // Handle LINK attachment
    } else if (attachmentType === 'link') {
        const linkPath = req.body.link;

        if (!linkPath) {
            return res.status(400).json({ success: false, message: 'Link is required for link type' });
        }

        const insertQuery = `
            INSERT INTO Attachments (thesis_id, type, link_path) 
            VALUES (?, 'link', ?);
        `;
        db.query(insertQuery, [thesisId, linkPath], (err, result) => {
            if (err) {
                console.error('Error inserting link attachment:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
            res.status(200).json({ success: true, message: 'Link uploaded successfully' });
        });
    } else {
        return res.status(400).json({ success: false, message: 'Invalid attachment type' });
    }
});

//----------------- API to fetch Attachments by Thesis Id -----------------
app.get('/api/fetch_attachments', authenticateJWT, (req, res) => {
    const userId = req.user.userId;
    const thesisId = req.query.thesis_id;

    const query = `
        SELECT * 
        FROM Attachments 
        WHERE thesis_id = ? 
        AND EXISTS (
            SELECT 1 
            FROM Theses 
            WHERE Theses.thesis_id = Attachments.thesis_id
            AND (Theses.student_id = ? OR Theses.professor_id = ?)
        );
    `;

    db.query(query, [thesisId, userId, userId], (err, results) => {
        if (err) {
            console.error('Error fetching attachments:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }

        res.status(200).json({ success: true, attachments: results });
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
        SELECT s.id, s.student_number, s.name, s.surname
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

//----------------- API for Professor Search Bar for thesis assignment -----------------
app.get('/api/professor-search', authenticateJWT, (req, res) => {
    const userId = req.user.userId;
    const { input } = req.query;


    if (!input) {
        return res.status(400).json({ success: false, message: 'Το πεδίο αναζήτησης είναι κενό.' });
    }

    const query = `
                    SELECT P.id, P.name, P.surname
                    FROM Professors P
                    WHERE (P.id LIKE ? OR P.name LIKE ? OR P.surname LIKE ?)
                    AND P.id NOT IN (
                        SELECT T.professor_id
                        FROM Theses T
                        WHERE T.student_id = ?
                                    )
                    AND P.id NOT IN (
                        SELECT C.member1_id
                        FROM Committees C
                        WHERE C.member1_id IS NOT NULL
                        AND C.thesis_id IN (SELECT thesis_id FROM Theses WHERE student_id = ?)
                                    )
                    AND P.id NOT IN (
                        SELECT C.member2_id
                        FROM Committees C
                        WHERE C.member2_id IS NOT NULL
                        AND C.thesis_id IN (SELECT thesis_id FROM Theses WHERE student_id = ?)
                                    );

                `;

    const searchInput = `%${input}%`;

    db.query(query, [searchInput, searchInput, searchInput, userId, userId, userId, userId], (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την αναζήτηση καθηγητών:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }

        res.status(200).json({ success: true, professors: results });
    });
});




//----------------- API to Create New Thesis -----------------
app.post('/api/theses/new', authenticateJWT, uploadPDFOnly.single('pdf'), (req, res) => {
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
app.put('/api/theses/:id', authenticateJWT, uploadPDFOnly.single('pdf'), (req, res) => {
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
    const { action } = req.body;

    if (!['accepted', 'rejected'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Invalid action provided.' });
    }

    const getInvitationQuery = `
        SELECT i.thesis_id, i.professor_id, c.member1_id, c.member2_id
        FROM Invitations i
        LEFT JOIN Committees c ON i.thesis_id = c.thesis_id
        WHERE i.id = ?;
    `;

    db.query(getInvitationQuery, [invitationId], (err, results) => {
        if (err) {
            console.error('Error fetching invitation:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Invitation not found.' });
        }

        const { thesis_id, professor_id, member1_id, member2_id } = results[0];

        db.beginTransaction((transactionErr) => {
            if (transactionErr) {
                console.error('Transaction error:', transactionErr);
                return res.status(500).json({ success: false, message: 'Database transaction error.' });
            }

            if (action === 'accepted') {
                let updateCommitteeQuery;
                if (!member1_id) {
                    updateCommitteeQuery = `
                        UPDATE Committees 
                        SET member1_id = ? 
                        WHERE thesis_id = ?;
                    `;
                } else if (!member2_id) {
                    updateCommitteeQuery = `
                        UPDATE Committees 
                        SET member2_id = ? 
                        WHERE thesis_id = ?;
                    `;
                } else {
                    return db.rollback(() => {
                        res.status(400).json({ success: false, message: 'Committee already full.' });
                    });
                }

                db.query(updateCommitteeQuery, [professor_id, thesis_id], (err) => {
                    if (err) {
                        console.error('Error updating committee:', err);
                        return db.rollback(() => {
                            res.status(500).json({ success: false, message: 'Database error updating committee.' });
                        });
                    }

                    const updateInvitationQuery = `
                        UPDATE Invitations 
                        SET status = 'accepted', response_date = NOW() 
                        WHERE id = ?;
                    `;

                    db.query(updateInvitationQuery, [invitationId], (err) => {
                        if (err) {
                            console.error('Error updating invitation:', err);
                            return db.rollback(() => {
                                res.status(500).json({ success: false, message: 'Database error updating invitation.' });
                            });
                        }

                        // Ελέγχουμε αν έχουν γεμίσει οι θέσεις
                        const checkCommitteeQuery = `
                            SELECT member1_id, member2_id 
                            FROM Committees 
                            WHERE thesis_id = ?;
                        `;

                        db.query(checkCommitteeQuery, [thesis_id], (err, committeeResults) => {
                            if (err) {
                                console.error('Error checking committee:', err);
                                return db.rollback(() => {
                                    res.status(500).json({ success: false, message: 'Database error checking committee.' });
                                });
                            }

                            const { member1_id, member2_id } = committeeResults[0];

                            if (member1_id && member2_id) {
                                const cancelPendingInvitationsQuery = `
                                    UPDATE Invitations
                                    SET status = 'cancelled'
                                    WHERE thesis_id = ? AND status = 'pending';
                                `;

                                db.query(cancelPendingInvitationsQuery, [thesis_id], (err) => {
                                    if (err) {
                                        console.error('Error cancelling invitations:', err);
                                        return db.rollback(() => {
                                            res.status(500).json({ success: false, message: 'Database error cancelling pending invitations.' });
                                        });
                                    }

                                    db.commit((commitErr) => {
                                        if (commitErr) {
                                            console.error('Transaction commit error:', commitErr);
                                            return db.rollback(() => {
                                                res.status(500).json({ success: false, message: 'Transaction commit error.' });
                                            });
                                        }

                                        res.json({ success: true, message: 'Invitation accepted, committee full, and other invitations cancelled.' });
                                    });
                                });
                            } else {
                                db.commit((commitErr) => {
                                    if (commitErr) {
                                        console.error('Transaction commit error:', commitErr);
                                        return db.rollback(() => {
                                            res.status(500).json({ success: false, message: 'Transaction commit error.' });
                                        });
                                    }

                                    res.json({ success: true, message: 'Invitation accepted and professor added to committee.' });
                                });
                            }
                        });
                    });
                });
            } else if (action === 'rejected') {
                const rejectInvitationQuery = `
                    UPDATE Invitations 
                    SET status = 'rejected', response_date = NOW() 
                    WHERE id = ?;
                `;

                db.query(rejectInvitationQuery, [invitationId], (err) => {
                    if (err) {
                        console.error('Error rejecting invitation:', err);
                        return db.rollback(() => {
                            res.status(500).json({ success: false, message: 'Database error rejecting invitation.' });
                        });
                    }

                    db.commit((commitErr) => {
                        if (commitErr) {
                            console.error('Transaction commit error:', commitErr);
                            return db.rollback(() => {
                                res.status(500).json({ success: false, message: 'Transaction commit error.' });
                            });
                        }

                        res.json({ success: true, message: 'Invitation rejected successfully.' });
                    });
                });
            }
        });
    });
});



app.get('/api/invitation-history', authenticateJWT, (req, res) => {
    console.log('Endpoint /api/invitation-history hit');
    const professorId = req.user.userId;
    console.log('Professor ID from JWT:', req.user.userId);

    const query = ` 
    SELECT 
        i.id AS invitation_id,
        t.title AS thesis_title,
        CONCAT(p.name, ' ', p.surname) AS professor_name,
        CONCAT(s.name, ' ', s.surname) AS student_name,
        s.student_number AS student_number,
        i.status AS response,
        DATE(i.invitation_date) AS invitation_date,
        DATE(i.response_date) AS response_date
    FROM 
        Invitations i
    LEFT JOIN 
        Theses t ON i.thesis_id = t.thesis_id
    LEFT JOIN 
        Professors p ON t.professor_id = p.id
    LEFT JOIN 
        Students s ON t.student_id = s.id
    WHERE 
        i.status != 'pending' AND i.professor_id = ?;
    `;
    db.query(query, [professorId], (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση του ιστορικού προσκλήσεων:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }
        console.log('Executed Query:', query);
        console.log('Professor ID:', professorId);
        console.log('Past Invitations from DB:', results);
        res.json({ success: true, invitations: results });
    });
});




//----------------- API to Assign Thesis to Students -----------------
app.post('/api/theses/assign', authenticateJWT, (req, res) => {
    const studentId = parseInt(req.body.studentId, 10);
    const thesisId = parseInt(req.body.thesisId, 10);

    console.log('Request Body:', req.body);
    console.log('Student ID:', req.body.studentId);
    console.log('Thesis ID:', req.body.thesisId);


    if (isNaN(studentId) || isNaN(thesisId)) {
        return res.status(400).json({ success: false, message: 'Μη έγκυρα δεδομένα. Παρακαλώ δοκιμάστε ξανά.' });
    }

    const assignQuery = `
        UPDATE THESES
        SET student_id = ?, status = 'assigned'
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



//----------------API for Unassigning a Thesis Theme -----------------
app.post('/api/theses/unassign', authenticateJWT, (req, res) => {
    const thesisId = parseInt(req.body.thesisId, 10);

    if (isNaN(thesisId)) {
        return res.status(400).json({ success: false, message: 'Μη έγκυρο thesis ID.' });
    }

    // Query για αναίρεση ανάθεσης της διπλωματικής
    const unasQuery = `
        UPDATE THESES
        SET student_id = NULL, status = 'unassigned'
        WHERE thesis_id = ? AND status = 'assigned';
    `;

    // Query για διαγραφή της τριμελούς επιτροπής
    const deleteCommitteeQuery = `
        DELETE FROM Committees
        WHERE thesis_id = ?;
    `;

    const deleteInvitationsQuery = `
        DELETE FROM INVITATIONS
        WHERE thesis_id = ?;
    `;

    // Ξεκινάμε συναλλαγή για να διασφαλίσουμε συνοχή δεδομένων
    db.beginTransaction((err) => {
        if (err) {
            console.error('Σφάλμα κατά την εκκίνηση της συναλλαγής:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }

        // Εκτέλεση query για αναίρεση ανάθεσης
        db.query(unasQuery, [thesisId], (unasErr, unasResult) => {
            if (unasErr) {
                console.error('Σφάλμα κατά την αναίρεση ανάθεσης:', unasErr);
                return db.rollback(() => {
                    res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
                });
            }

            if (unasResult.affectedRows === 0) {
                return db.rollback(() => {
                    res.status(400).json({ success: false, message: 'Η διπλωματική δεν είναι διαθέσιμη για ανάθεση.' });
                });
            }

            // Εκτέλεση query για διαγραφή της τριμελούς επιτροπής
            db.query(deleteInvitationsQuery, [thesisId], (deleteIErr) => {
                if (deleteIErr) {
                    console.error('Σφάλμα κατά τη διαγραφή των προσκλήσεων:', deleteIErr);
                    return db.rollback(() => {
                        res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
                    });
                }

                db.query(deleteCommitteeQuery, [thesisId], (deleteErr) => {
                    if (deleteErr) {
                        console.error('Σφάλμα κατά τη διαγραφή της τριμελούς:', deleteErr);
                        return db.rollback(() => {
                            res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
                        });
                    }
                    // Επικύρωση της συναλλαγής
                    db.commit((commitErr) => {
                        if (commitErr) {
                            console.error('Σφάλμα κατά την επικύρωση της συναλλαγής:', commitErr);
                            return db.rollback(() => {
                                res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
                            });
                        }
                        res.status(200).json({ success: true, message: 'Η ανάθεση αφαιρέθηκε επιτυχώς, οι προσκλήσεις και η επιτροπή διαγράφηκαν!' });
                    });
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