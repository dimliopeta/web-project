//--------------------------------------------- STARTUP SERVER SETTINGS AND MIDDLEWARE ---------------------------------------------
const express = require('express');
const { db, insertData } = require('./config');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');


const session = require('express-session');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');

const app = express();
app.use('/files', express.static(path.join(__dirname, 'files')));
const PORT = 3000;
const SECRET_KEY = 'your-secret-key';
//-------------- Check if the server is connected to the database --------------
db.query('SELECT 1', (err, results) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    } else {
        console.log('Database connected successfully!');
    }
});
//-------------- Set Index file and the public folder --------------
app.use(express.static('public', {
    index: 'index.html',
    maxAge: '1d'
}));
app.use(express.static(path.join(__dirname, 'views'), {
    maxAge: '1d', // Cache ttl 1 day
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
        return res.redirect('/login');
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            console.log('Token not verified.');
            return res.redirect('/login');
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

//-------------- API for login routing --------------
app.get('/login', (req, res) => {
    const token = req.cookies?.token;

    if (token) {
        jwt.verify(token, SECRET_KEY, (err, user) => {
            if (!err && user) {

                return res.redirect(user.role === 'professor'
                    ? '/professor'
                    : user.role === 'administrator'
                        ? '/administrator'
                        : '/student');
            }
            // Don't allow going back to the login page
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
//-------------- API for announcement tab routing --------------
app.get('/announcements', (req, res) => {
    return res.sendFile(path.join(__dirname, 'views', 'announcements.html'));
});

//-------------- API for login --------------
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
                UNION ALL
                SELECT id, email, password, 'administrator' AS role FROM administrators
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
            } else if (user.role === 'administrator') {
                return res.redirect('/administrator');
            }
        } else {
            res.status(401).send('Invalid credentials');
            return res.sendFile(path.join(__dirname, 'views', 'login.html'));

        }
    });
});
// User Routing based on Role
app.get('/professor', authenticateJWT, authorizeRole('professor'), (req, res) => {
    res.sendFile(path.join(__dirname, 'protected_views', 'professor.html'));
});

app.get('/student', authenticateJWT, authorizeRole('student'), (req, res) => {
    res.sendFile(path.join(__dirname, 'protected_views', 'student.html'));
});

app.get('/administrator', authenticateJWT, authorizeRole('administrator'), (req, res) => {
    res.sendFile(path.join(__dirname, 'protected_views', 'administrator.html'));
});
//-------------- API for logout --------------
app.post('/logout', authenticateJWT, (req, res) => {
    // Clear existing cookie
    res.clearCookie('token', { httpOnly: true });
    // Return to index
    res.redirect('/');
});


//----------------------------- MULTER DECLARATIONS -----------------------------
//----------------- Multer declaration/setup for Theses' PDFs -----------------
const StoragePDFOnly = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'files/theses_pdf'); // Correct path if both the server and the folder are in the same directory
    },
    filename: (req, file, cb) => {
        // Ensure user is authenticated and has a name
        const professorId = req.user?.userId || 'Unknown-User';
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

//----------------- Multer declaration/setup for Admin Data JSON upload -----------------
const StorageAdminData = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'files/admin_data_json');
    },
    filename: (req, file, cb) => {
        const timeStamp = new Date().toISOString().replace(/[-T:.]/g, '');
        const originalName = file.originalname.replace(/\s+/g, '_');
        const fileName = `${timeStamp}-${originalName}`;
        cb(null, fileName);
    }
});

// Filter to ensure only JSON files are uploaded
const uploadAdminData = multer({
    storage: StorageAdminData,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/json') {
            cb(null, true);
        } else {
            cb(new Error('Only JSON files are allowed'), false);
        }
    },
    limits: { fileSize: 25 * 1024 * 1024 }
});



//---------------------------------------------------------- APIs FOR PAGE FUNCTIONS ----------------------------------------------------------
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
        const etag = crypto.createHash('sha1').update(JSON.stringify(results)).digest('hex');

        if (req.headers['if-none-match'] === etag) {
            return res.status(304).end();  
        }

        res.setHeader('ETag', etag);
        res.status(200).json({ success: true, theses: results });
    });
});

//------------------ API for loading Assigned Theses --------------
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
        const etag = crypto.createHash('sha1').update(JSON.stringify(results)).digest('hex');

        if (req.headers['if-none-match'] === etag) {
            return res.status(304).end();  
        }

        res.setHeader('ETag', etag);
        res.status(200).json({ success: true, theses: results });
    });
});
//------------------ API for Thesis AP submit as Administrator --------------
app.post('/api/AP_save', (req, res) => {
    const { thesis_id, apNumber } = req.body;

    if (!thesis_id || !apNumber) {
        return res.status(400).json({ success: false, message: 'Thesis ID and AP number are required.' });
    }

    const query = `
        UPDATE Logs 
        SET ap = ? 
        WHERE thesis_id = ? AND new_state = 'assigned'
    `;

    db.query(query, [apNumber, thesis_id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'No matching log found for the given thesis ID with state "assigned".' });
        }

        res.json({ success: true, message: 'AP number saved successfully.' });
    });
});
//------------------ API for Thesis Completion for Admin --------------
app.post('/api/thesis_complete', (req, res) => {
    const { thesis_id } = req.body;

    if (!thesis_id) {
        return res.status(400).json({ success: false, message: 'Thesis ID and AP number are required.' });
    }

    const query = `
        UPDATE Theses 
        SET status = 'completed' 
        WHERE thesis_id = ?
    `;

    db.query(query, [thesis_id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }

        res.json({ success: true, message: 'Thesis set as completed successfully.' });
    });
});
//----------------- API to Upload JSON Data for Administrators -----------------
app.post('/uploadAdminData', uploadAdminData.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: 'No file uploaded.' });
    }
    const filePath = path.join(__dirname, 'files/admin_data_json', req.file.filename);

    try {
        insertData(filePath);
        res.status(200).send({ message: 'Admin data successfully inserted.' });
    } catch (err) {
        console.error('Error inserting admin data:', err);
        res.status(500).send({ message: 'Error inserting admin data into the database.' });
    }
});
//----------------- API to Cancel Thesis for administrators -----------------
app.post('/api/Thesis_cancel_admin', (req, res) => {
    const { thesis_id, date, gstNumber, reason } = req.body;

    if (!thesis_id || !date || !gstNumber || !reason) {
        return res.status(400).json({ error: 'Missing thesis id, gstNumber, date, or reason' });
    }
    db.beginTransaction((transactionError) => {
        if (transactionError) {
            console.error('Error starting transaction:', transactionError);
            return res.status(500).json({ error: 'Internal server error' });
        }
        const logQuery = `
            INSERT INTO logs (thesis_id, date_of_change, old_state, new_state, gen_assembly_session, cancellation_reason)
            VALUES (?, ?, 'active', 'cancelled', ?, ?)
        `;
        db.execute(logQuery, [thesis_id, date, gstNumber, reason], (logError) => {
            if (logError) {
                console.error('Error inserting cancellation log:', logError);
                return db.rollback(() => {
                    res.status(500).json({ error: 'Internal server error' });
                });
            }

            const updateQuery = `
                UPDATE theses
                SET status = 'cancelled'
                WHERE thesis_id = ?
            `;
            db.execute(updateQuery, [thesis_id], (updateError) => {
                if (updateError) {
                    console.error('Error updating thesis status:', updateError);
                    return db.rollback(() => {
                        res.status(500).json({ error: 'Internal server error' });
                    });
                }

                db.commit((commitError) => {
                    if (commitError) {
                        console.error('Error committing transaction:', commitError);
                        return db.rollback(() => {
                            res.status(500).json({ error: 'Internal server error' });
                        });
                    }

                    res.status(200).json({
                        message: 'Thesis cancellation logged and status updated successfully',
                    });
                });
            });
        });
    });
});

//----------------- API to fetch All Theses Data for administrators -----------------
app.get('/api/thesesAdministrator', authenticateJWT, (req, res) => {

    const query = `
            SELECT 
                T.thesis_id,
                T.title,
                T.summary,
                T.status,
                T.pdf_path,
                DATE_FORMAT(T.start_date, '%Y-%m-%d') AS start_date,
                T.nimertis_link,
                S.id AS student_id,
                S.name AS student_name,
                S.surname AS student_surname,
                S.email AS student_email,
                S.student_number,
                P.id AS professor_id,
                P.name AS professor_name,
                P.surname AS professor_surname,
                P.email AS professor_email,
                C.member1_id AS committee_member1_id,
                CM1.name AS committee_member1_name,
                CM1.surname AS committee_member1_surname,
                CM1.email AS committee_member1_email,
                C.member2_id AS committee_member2_id,
                CM2.name AS committee_member2_name,
                CM2.surname AS committee_member2_surname,
                CM2.email AS committee_member2_email,
                G.professor_id AS grade_professor_id,
                G.grade1,
                G.grade2,
                G.grade3,
                G.grade4,
                CASE 
                    WHEN COUNT(G.grade_id) = 3 AND SUM(G.finalized) = 3 THEN TRUE
                    ELSE FALSE
                END AS all_grades_finalized
            FROM 
                Theses T
            LEFT JOIN 
                Students S ON T.student_id = S.id
            LEFT JOIN 
                Professors P ON T.professor_id = P.id
            LEFT JOIN 
                Committees C ON T.thesis_id = C.thesis_id
            LEFT JOIN 
                Professors CM1 ON C.member1_id = CM1.id
            LEFT JOIN 
                Professors CM2 ON C.member2_id = CM2.id
            LEFT JOIN 
                Grades G ON T.thesis_id = G.thesis_id
            WHERE 
                T.status IN ('active', 'to-be-reviewed')
            GROUP BY  
                T.thesis_id, T.title, T.summary, T.status, T.pdf_path, T.start_date, T.nimertis_link, 
                S.id, S.name, S.surname, S.email, S.student_number, 
                P.id, P.name, P.surname, P.email, 
                C.member1_id, CM1.name, CM1.surname, CM1.email, 
                C.member2_id, CM2.name, CM2.surname, CM2.email,
                G.professor_id, G.grade1, G.grade2, G.grade3, G.grade4;
`;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση των διπλωματικών:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server' });
        }

        res.status(200).json({ success: true, thesesAll: results });
    });
});

//----------------- API to fetch Theses Data for both students and professors -----------------
app.get('/api/theses', authenticateJWT, (req, res) => {
    const userId = req.user.userId;
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
                DATE_FORMAT(t.start_date, '%Y-%m-%d') AS start_date,
                t.final_grade,
                t.nimertis_link,
                DATE_FORMAT(e.date, '%Y-%m-%d') AS exam_date,
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
            LEFT JOIN Examinations e ON t.thesis_id = e.thesis_id
            LEFT JOIN Professors c1 ON c.member1_id = c1.id
            LEFT JOIN Professors c2 ON c.member2_id = c2.id
            LEFT JOIN Invitations i ON i.thesis_id = t.thesis_id
            WHERE (p.id = ? OR c.member1_id = ? OR c.member2_id = ?) AND t.status != 'unassigned'
            GROUP BY 
                t.thesis_id, t.title, t.summary, t.status, t.start_date, e.date,
                s.name, s.surname, s.student_number, s.contact_email,
                p.name, p.surname, p.email,
                c.member1_id, c.member2_id, c1.name, c1.surname, c2.name, c2.surname ;
`;
        queryParams = [userId, userId, userId, userId, userId, userId];

    } else if (role === 'student') {
        query = `
                SELECT
                    Theses.*,
                    Theses.final_grade,
                    COALESCE(DATE_FORMAT(Examinations.date, '%y-%m-%d'), 'Δεν έχει οριστεί') AS exam_date, 
                    COALESCE(Examinations.type_of_exam, 'Δεν έχει οριστεί') AS type_of_exam,
                    COALESCE(Examinations.location, 'Δεν έχει οριστεί') AS exam_location,
                    DATE_FORMAT(Theses.start_date, '%Y-%m-%d') AS start_date,
                    Professors.name AS professor_name, 
                    Professors.surname AS professor_surname, 
                    Committee1.name AS committee_member1_name,
                    Committee1.surname AS committee_member1_surname,
                    Committee2.name AS committee_member2_name,
                    Committee2.surname AS committee_member2_surname,
                    SupervisorGrade.grade1 AS supervisor_grade1,
                    SupervisorGrade.grade2 AS supervisor_grade2,
                    SupervisorGrade.grade3 AS supervisor_grade3,
                    SupervisorGrade.grade4 AS supervisor_grade4,
                    SupervisorGrade.finalized AS supervisor_finalized,
                    Committee1Grade.grade1 AS committee_member1_grade1,
                    Committee1Grade.grade2 AS committee_member1_grade2,
                    Committee1Grade.grade3 AS committee_member1_grade3,
                    Committee1Grade.grade4 AS committee_member1_grade4,
                    Committee1Grade.finalized AS committee_member1_finalized,
                    Committee2Grade.grade1 AS committee_member2_grade1,
                    Committee2Grade.grade2 AS committee_member2_grade2,
                    Committee2Grade.grade3 AS committee_member2_grade3,
                    Committee2Grade.grade4 AS committee_member2_grade4,
                    Committee2Grade.finalized AS committee_member2_finalized
                FROM Theses
                LEFT JOIN Professors ON Theses.professor_id = Professors.id
                LEFT JOIN Committees ON Theses.thesis_id = Committees.thesis_id
                LEFT JOIN Professors AS Committee1 ON Committees.member1_id = Committee1.id
                LEFT JOIN Professors AS Committee2 ON Committees.member2_id = Committee2.id
                LEFT JOIN Examinations ON Theses.thesis_id = Examinations.thesis_id
                LEFT JOIN Grades AS SupervisorGrade ON Theses.thesis_id = SupervisorGrade.thesis_id 
                    AND Theses.professor_id = SupervisorGrade.professor_id
                LEFT JOIN Grades AS Committee1Grade ON Theses.thesis_id = Committee1Grade.thesis_id 
                    AND Committees.member1_id = Committee1Grade.professor_id
                LEFT JOIN Grades AS Committee2Grade ON Theses.thesis_id = Committee2Grade.thesis_id 
                    AND Committees.member2_id = Committee2Grade.professor_id
                WHERE Theses.student_id = ? AND Theses.thesis_id IS NOT NULL;
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

//----------------- API to Fetch Logs -----------------
app.get('/api/logs_fetch', authenticateJWT, (req, res) => {
    const userId = req.user.userId;
    const role = req.user.role;

    let queryParams = [];
    const query = `
        SELECT 
            logs.*,
            theses.*,
            DATE_FORMAT(logs.date_of_change, '%Y-%m-%d') AS date_of_change
        FROM 
            logs
        INNER JOIN
            theses ON theses.thesis_id = logs.thesis_id
        WHERE 
            theses.student_id = ?;
        `;
    queryParams = [userId];

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση των δεδομένων των καταγραφών:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server' });
        }
        const etag = crypto.createHash('sha1').update(JSON.stringify(results)).digest('hex');

        if (req.headers['if-none-match'] === etag) {
            return res.status(304).end();
        }

        res.setHeader('ETag', etag);
        res.status(200).json({ success: true, log: results });

    });
});

app.post('/api/thesis/logs', authenticateJWT, (req, res) => {
    const { thesis_id } = req.body;

    let query = ` SELECT * FROM LOGS
    WHERE thesis_id = ?`;

    db.query(query, [thesis_id], (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση των δεδομένων των καταγραφών:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server' });
        }
        res.status(200).json({ success: true, log: results });
    }
    );
}
);

//----------------- API to Fetch all data to complete the Exam Report -----------------
app.get('/api/examReportDetails_fetch', authenticateJWT, (req, res) => {
    const userId = req.user.userId;
    const role = req.user.role;
    let query = '';
    let queryParams = [];

    if (role === 'professor') {
        const thesisId = req.query.thesisId;

        if (!thesisId) {
            return res.status(400).json({ success: false, message: 'Το thesis_id είναι υποχρεωτικό για καθηγητές.' });
        }

        query = `
                SELECT DISTINCT
                    S.name AS student_name, 
                    S.surname AS student_surname, 
                    E.location AS exam_location,
                    E.type_of_exam AS type_of_exam,
                    DATE_FORMAT(E.date, '%Y-%m-%d') AS exam_date,
                    P.name AS professor_name, 
                    P.surname AS professor_surname, 
                    C1.name AS committee_member1_name,
                    C1.surname AS committee_member1_surname,
                    C2.name AS committee_member2_name,
                    C2.surname AS committee_member2_surname,
                    T.title AS thesis_title, 
                    T.summary AS thesis_summary,
                    T.final_grade AS final_grade,
                    GS.grade1 AS supervisor_grade1,
                    GS.grade2 AS supervisor_grade2,
                    GS.grade3 AS supervisor_grade3,
                    GS.grade4 AS supervisor_grade4,
                    GC1.grade1 AS committee_member1_grade1,
                    GC1.grade2 AS committee_member1_grade2,
                    GC1.grade3 AS committee_member1_grade3,
                    GC1.grade4 AS committee_member1_grade4,
                    GC2.grade1 AS committee_member2_grade1,
                    GC2.grade2 AS committee_member2_grade2,
                    GC2.grade3 AS committee_member2_grade3,
                    GC2.grade4 AS committee_member2_grade4,
                    CONCAT(L.gen_assembly_session, '/', DATE_FORMAT(L.date_of_change, '%d-%m-%Y')) AS gen_assembly_session_date                
                FROM 
                    Theses T
                JOIN 
                    Students S ON T.student_id = S.id
                JOIN 
                    Examinations E ON T.thesis_id = E.thesis_id
                JOIN 
                    Professors P ON T.professor_id = P.id
                LEFT JOIN 
                    Committees C ON T.thesis_id = C.thesis_id
                LEFT JOIN 
                    Professors C1 ON C.member1_id = C1.id
                LEFT JOIN 
                    Professors C2 ON C.member2_id = C2.id
                LEFT JOIN 
                    Grades AS GS ON T.thesis_id = GS.thesis_id 
                    AND T.professor_id = GS.professor_id
                LEFT JOIN 
                    Grades AS GC1 ON T.thesis_id = GC1.thesis_id 
                    AND C.member1_id = GC1.professor_id
                LEFT JOIN 
                    Grades AS GC2 ON T.thesis_id = GC2.thesis_id 
                    AND C.member2_id = GC2.professor_id
                LEFT JOIN
                    Logs AS L ON T.thesis_id = L.thesis_id 
                    AND L.old_state = 'assigned' 
                    AND L.new_state = 'active'
                WHERE 
                    T.thesis_id = ?;
        `;
        queryParams = [thesisId];
    }
    else if (role === 'student') {
        query = `
                SELECT 
                    S.name AS student_name, 
                    S.surname AS student_surname, 
                    E.location AS exam_location,
                    E.type_of_exam AS type_of_exam,
                    DATE_FORMAT(E.date, '%Y-%m-%d') AS exam_date,
                    P.name AS professor_name, 
                    P.surname AS professor_surname, 
                    C1.name AS committee_member1_name,
                    C1.surname AS committee_member1_surname,
                    C2.name AS committee_member2_name,
                    C2.surname AS committee_member2_surname,
                    T.title AS thesis_title, 
                    T.summary AS thesis_summary,
                    T.final_grade AS final_grade,
                    GS.grade1 AS supervisor_grade1,
                    GS.grade2 AS supervisor_grade2,
                    GS.grade3 AS supervisor_grade3,
                    GS.grade4 AS supervisor_grade4,
                    GC1.grade1 AS committee_member1_grade1,
                    GC1.grade2 AS committee_member1_grade2,
                    GC1.grade3 AS committee_member1_grade3,
                    GC1.grade4 AS committee_member1_grade4,
                    GC2.grade1 AS committee_member2_grade1,
                    GC2.grade2 AS committee_member2_grade2,
                    GC2.grade3 AS committee_member2_grade3,
                    GC2.grade4 AS committee_member2_grade4,
                    CONCAT(L.gen_assembly_session, '/', DATE_FORMAT(L.date_of_change, '%d-%m-%Y')) AS gen_assembly_session_date                
                FROM 
                    Students S
                JOIN 
                    Theses T ON S.id = T.student_id
                JOIN 
                    Examinations E ON T.thesis_id = E.thesis_id
                JOIN 
                    Professors P ON T.professor_id = P.id
                LEFT JOIN 
                    Committees C ON T.thesis_id = C.thesis_id
                LEFT JOIN 
                    Professors C1 ON C.member1_id = C1.id
                LEFT JOIN 
                    Professors C2 ON C.member2_id = C2.id
                LEFT JOIN 
                    Grades AS GS ON T.thesis_id = GS.thesis_id 
                        AND T.professor_id = GS.professor_id
                LEFT JOIN 
                    Grades AS GC1 ON T.thesis_id = GC1.thesis_id 
                        AND C.member1_id = GC1.professor_id
                LEFT JOIN 
                    Grades AS GC2 ON T.thesis_id = GC2.thesis_id 
                        AND C.member2_id = GC2.professor_id
                LEFT JOIN
                    Logs AS L ON T.thesis_id = L.thesis_id
                    AND L.old_state = 'assigned' 
                    AND L.new_state = 'active' 
                WHERE 
                    T.student_id = ?;
                        `;
        queryParams = [userId];
    }

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση των δεδομένων του πρακτικού εξέτασης:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server' });
        }
        res.status(200).json({ success: true, examReport: results });
    });
});

//----------------- API to Fetch Exam Date-Type-Location-Report -----------------
app.get('/api/fetch_examinations/:thesis_id', (req, res) => {
    const { thesis_id } = req.params;

    if (!thesis_id) {
        return res.status(400).json({
            success: false,
            message: 'Thesis ID is required.'
        });
    }

    const query = `
        SELECT 
        COALESCE(DATE_FORMAT(Examinations.date, '%d-%m-%Y'), 'Δεν έχει οριστεί') AS exam_date,
        Examinations.type_of_exam, 
        Examinations.location
        FROM Examinations 
        WHERE thesis_id = ?;
    `;

    db.query(query, [thesis_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch examination details.'
            });
        }

        if (results.length === 0) {
            return res.json({
                success: true,
                data: null,
                message: 'No examination details found for the given thesis.'
            });
        }
        const etag = crypto.createHash('sha1').update(JSON.stringify(results)).digest('hex');

        if (req.headers['if-none-match'] === etag) {
            return res.status(304).end();  
        }

        res.setHeader('ETag', etag);
        res.json({ success: true, examination: results[0] });
    });
});

//----------------- API for Exam Date-Type-Location upload -----------------
app.post('/api/examinations_upload', (req, res) => {
    const { thesis_id, exam_date, type_of_exam, location } = req.body;

    if (!thesis_id || !exam_date || !type_of_exam || !location) {
        return res.status(400).json({
            success: false,
            message: 'Thesis ID, exam date, type of exam, and location are required.'
        });
    }

    const query = `
         INSERT INTO examinations (thesis_id, date, type_of_exam, location)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              date = VALUES(date),
              type_of_exam = VALUES(type_of_exam),
              location = VALUES(location);
    `;

    db.query(query, [thesis_id, exam_date, type_of_exam, location], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Failed to save examination details.'
            });
        }
        res.json({
            success: true,
            message: 'Examination details saved successfully.'
        });
    });
});

//----------------- API to handle Attachment Upload (File or Link) in Configuration page Management Section -----------------
app.post('/api/upload_attachment', authenticateJWT, UploadAttachments.single('attachment'), (req, res) => {
    const userId = req.user.userId;
    const thesisId = req.body.thesis_id;
    const attachmentType = req.body.type;

    console.log("Received upload request:");
    console.log("Thesis ID:", thesisId);
    console.log("Attachment Type:", attachmentType);
    console.log("File:", req.file);

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

//----------------- API to handle Nimertis Link Upload in Configuration page Management Section -----------------
app.post('/api/update_nimertis_link', authenticateJWT, (req, res) => {
    const { thesis_id, nimertis_link } = req.body;
    const userId = req.user.userId;

    const query = `
        UPDATE Theses
        SET nimertis_link = ?
        WHERE thesis_id = ? AND (student_id = ? OR professor_id = ?)
    `;

    db.query(query, [nimertis_link, thesis_id, userId, userId], (err, result) => {
        if (err) {
            console.error('Error updating Nimertis link:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }

        if (result.affectedRows === 0) {
            return res.status(400).json({ success: false, message: 'Thesis not found or permission denied' });
        }
        res.status(200).json({ success: true });
    });
});

//----------------- API to fetch All Attachments by Thesis Id -----------------
app.get('/api/fetch_all_attachments', authenticateJWT, (req, res) => {
    const userId = req.user.userId;
    const thesisId = req.query.thesis_id;

    const query = `
        SELECT * 
        FROM Attachments 
        WHERE thesis_id = ? 
        
    `;

    db.query(query, [thesisId, userId, userId], (err, results) => {
        if (err) {
            console.error('Error fetching attachments:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        const etag = crypto.createHash('sha1').update(JSON.stringify(results)).digest('hex');

        if (req.headers['if-none-match'] === etag) {
            return res.status(304).end();  
        }

        res.setHeader('ETag', etag);
        res.status(200).json({ success: true, attachments: results });
    });
});

//----------------- API to fetch Student Data by Id -----------------
app.get('/api/student', authenticateJWT, (req, res) => {
    const userId = req.user.userId;

    const query = `SELECT * FROM students WHERE id = ?`;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching student data:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        const student = results[0];
        const etag = crypto.createHash('sha1').update(JSON.stringify(student)).digest('hex');


        if (req.headers['if-none-match'] === etag) {
            return res.status(304).end(); 
        }
        res.setHeader('ETag', etag);
        res.json(student);
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
              AND theses.status != 'cancelled'
          );
    `;
    const searchInput = `%${input}%`;

    db.query(query, [searchInput, searchInput, searchInput], (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την αναζήτηση φοιτητών:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }

        const etag = crypto.createHash('sha1').update(JSON.stringify(results)).digest('hex');

        if (req.headers['if-none-match'] === etag) {
            return res.status(304).end(); 
        }
        res.setHeader('ETag', etag);
        return res.status(200).json({ success: true, students: results });
    });
});
//----------------- API for Professor Search Bar for Administration -----------------
app.get('/api/professor_search_all', authenticateJWT, (req, res) => {
    const input = req.query.search;

    const query = `
        SELECT *
        FROM Professors P
        WHERE P.name LIKE ? OR P.surname LIKE ?
    `;
    const searchInput = `%${input}%`;

    db.query(query, [searchInput, searchInput], (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την αναζήτηση καθηγητών:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }
        const etag = crypto.createHash('sha1').update(JSON.stringify(results)).digest('hex');

        if (req.headers['if-none-match'] === etag) {
            return res.status(304).end(); 
        }
        res.setHeader('ETag', etag);
        res.status(200).json({ success: true, professors: results });
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
                                    )
                    AND P.id NOT IN (
                        SELECT I.professor_id
                        FROM Invitations I
                        WHERE I.status IN ('pending', 'accepted')
                        AND I.thesis_id IN (SELECT thesis_id FROM Theses WHERE student_id = ?)
        );

                `;

    const searchInput = `%${input}%`;

    db.query(query, [searchInput, searchInput, searchInput, userId, userId, userId, userId], (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την αναζήτηση καθηγητών:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }
        const etag = crypto.createHash('sha1').update(JSON.stringify({userId, results})).digest('hex');

        if (req.headers['if-none-match'] === etag) {
            return res.status(304).end(); 
        }
        res.setHeader('ETag', etag);
        res.status(200).json({ success: true, professors: results });
    });
});

//----------------- API to Create Invitation for Thesis Committee -----------------
app.post('/api/invitation_create', authenticateJWT, (req, res) => {
    const { professorId } = req.body;
    const userId = req.user.userId;

    if (!professorId) {
        return res.status(400).json({ success: false, message: 'Professor ID is required.' });
    }

    const query = `
        INSERT INTO Invitations (thesis_id, professor_id, status)
        SELECT t.thesis_id, ?, 'pending'
        FROM Theses t
        WHERE t.student_id = ?;
    `;

    db.query(query, [professorId, userId], (err, results) => {
        if (err) {
            console.error('Error creating invitation:', err);
            return res.status(500).json({ success: false, message: 'Failed to create the invitation.' });
        }

        const thesisQuery = `
            SELECT thesis_id
            FROM Theses t
            WHERE t.student_id = ?;
        `;

        db.query(thesisQuery, [userId], (err, thesisResults) => {
            if (err) {
                console.error('Error fetching thesis_id:', err);
                return res.status(500).json({ success: false, message: 'Failed to retrieve thesis ID.' });
            }
            const thesis_id = thesisResults[0]?.thesis_id;
            console.log('Invitation sent successfully:', results);
            res.json({ success: true, invitation: results, thesis_id: thesis_id });
        });
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
    const filePath = file ? file.path : null;

    const query = `INSERT INTO THESES (professor_id, student_id, title, summary, pdf_path) VALUES (?, ?, ?, ?, ?);`;
    db.query(query, [professorId, null, title, summary, filePath], (err, result) => {
        if (err) {
            console.error('Σφάλμα κατά την αποθήκευση της διπλωματικής:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server' });
        }

        console.log('Thesis created successfully!');
        if (file) {
            console.log("PDF uploaded:", file);
        } else {
            console.log("Theses created without pdf");
        }
        return res.status(201).json({ success: true, message: 'Η διπλωματική δημιουργήθηκε επιτυχώς!' });
    });
});

//----------------- API to Edit existing Thesis -----------------
app.put('/api/theses/update', authenticateJWT, uploadPDFOnly.single('pdf'), (req, res) => {
    const { thesisId, title, summary } = req.body;
    const file = req.file;
    const professorId = req.user.userId;

    if (!thesisId || (!title && !summary && !file)) {
        return res.status(400).json({ success: false, message: 'Invalid input.' });
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

//----------------- API for Invitations associated with a specific professor-----------------
app.get('/api/invitations-for-professor', authenticateJWT, (req, res) => {
    const professorId = req.user.userId;

    if (!professorId) {
        return res.status(400).json({ success: false, message: 'Professor ID is missing.' });
    }

    const query = `
       SELECT 
        i.id AS invitation_id,
        i.thesis_id,
        i.professor_id,
        i.status AS invitation_status,
        DATE_FORMAT(i.invitation_date, '%Y-%m-%d') AS invitation_date,
        DATE_FORMAT(i.response_date, '%Y-%m-%d') AS response_date,
        t.title AS thesis_title,
        t.summary AS thesis_summary,
        CONCAT(s.name, ' ', s.surname) AS student_name,
        CONCAT(p.name,' ',p.surname) AS professor_name,
        s.student_number AS student_number
    FROM 
        Invitations i
    JOIN 
        Theses t ON i.thesis_id = t.thesis_id
    LEFT JOIN 
        Professors p ON t.professor_id = p.id
    LEFT JOIN 
        Students s ON t.student_id = s.id
    WHERE 
        i.professor_id = ? 
        AND i.status = 'pending';

    `;

    db.query(query, [professorId], (err, results) => {
        if (err) {
            console.error('Error fetching invitations:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        res.json({ success: true, invitations: results });
    });
});
//----------------- API for cancelling a sent Invitation as student -----------------
app.post('/api/invitation_cancel', authenticateJWT, (req, res) => {
    const student_id = req.user.userId;

    const query = `
    UPDATE Invitations I
    JOIN Theses T ON I.thesis_id = T.thesis_id
    JOIN Students S ON T.student_id = S.id
    SET I.status = 'cancelled'
    WHERE S.id = ? 
      AND I.status = 'pending'
      AND T.status NOT IN ('completed', 'cancelled', 'active', 'unassigned', 'to-be-reviewed');
`;

    db.query(query, [student_id], (err, results) => {
        if (err) {
            console.error('Error executing combined query:', err);
            return res.status(500).json({ success: false, message: 'Server error while canceling invitations.' });
        }

        const thesisQuery = `
          SELECT thesis_id
          FROM Theses T
          WHERE T.student_id = ?;
      `;

        db.query(thesisQuery, [student_id], (err, thesisResults) => {
            if (err) {
                console.error('Error fetching thesis_id:', err);
                return res.status(500).json({ success: false, message: 'Failed to retrieve thesis ID.' });
            }
            const thesis_id = thesisResults[0]?.thesis_id;
            res.json({ success: true, cancelled_invitation: results, thesis_id: thesis_id });
        });
    });
});


//----------------- API for Invitation Acceptance/Rejection -----------------
app.post('/api/invitations/action', authenticateJWT, (req, res) => {
    const { invitationId, action } = req.body;

    if (!invitationId || !['accepted', 'rejected'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Invalid input.' });
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

                        // We check if committee is full
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
                                        res.json({ success: true, message: 'Η πρόσκληση έγινε αποδεκτή, η Τριμελής είναι πλέον πλήρης.' });
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
                                    res.json({ success: true, message: 'Η πρόσκληση έγινε αποδεκτή.' });
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


//----------------- API for loading Past Invitations associated with a specific professor-----------------
app.get('/api/invitation-history', authenticateJWT, (req, res) => {
    const professorId = req.user.userId;

    const query = ` 
            SELECT 
                i.id AS invitation_id,
                t.title AS thesis_title,
                CONCAT(p.name, ' ', p.surname) AS professor_name,
                CONCAT(s.name, ' ', s.surname) AS student_name,
                s.student_number AS student_number,
                i.status AS response,
                DATE_FORMAT(i.invitation_date, '%Y-%m-%d') AS invitation_date,
                DATE_FORMAT(i.response_date, '%Y-%m-%d') AS response_date
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
        res.json({ success: true, invitations: results });
    });
});


//-----------------API for loading all the invitations associated with a specific thesis-------
app.post('/api/invitations-for-thesis', authenticateJWT, (req, res) => {
    const { thesis_id } = req.body;

    if (!thesis_id) {
        return res.status(400).json({ success: false, message: 'Το thesis_id είναι υποχρεωτικό.' });
    }

    const query = `
        SELECT 
            i.id,
            DATE_FORMAT(i.invitation_date, '%Y-%m-%d') AS invitation_date,
            DATE_FORMAT(i.response_date, '%Y-%m-%d') AS response_date,
            i.status AS invitation_status,
            p.name AS professor_name,
            p.surname AS professor_surname
        FROM 
            Invitations i
        INNER JOIN 
            Professors p ON i.professor_id = p.id
        WHERE 
            i.thesis_id = ?;
    `;

    db.query(query, [thesis_id], (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση των προσκλήσεων:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }
        res.status(200).json({ success: true, invitations: results });
    });
});

//-----------------API for loading all the notes of a professor associated with a specific thesis-------
app.post('/api/get-notes', authenticateJWT, (req, res) => {
    const { thesis_id } = req.body;
    const professor_id = req.user.userId;

    if (!thesis_id || !professor_id) {
        return res.status(400).json({ success: false, message: 'Απαιτούνται τα thesis_id και professor_id.' });
    }

    const query = `
        SELECT n.content, DATE_FORMAT(n.date, '%Y-%m-%d') AS date, p.name AS professor_name
        FROM Notes n
        JOIN Professors p ON n.professor_id = p.id
        WHERE n.thesis_id = ? AND n.professor_id = ?;
    `;

    db.query(query, [thesis_id, professor_id], (err, results) => {
        if (err) {
            console.error('Σφάλμα:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα κατά τη φόρτωση σημειώσεων.' });
        }
        res.json({ success: true, notes: results });
    });
});

//-----------------API for adding a note associated with a specific thesis-------
app.post('/api/add-note', authenticateJWT, (req, res) => {
    const { thesis_id, content } = req.body;
    const professor_id = req.user.userId;

    if (!thesis_id || !professor_id || !content) {
        return res.status(400).json({ success: false, message: 'Όλα τα πεδία είναι υποχρεωτικά.' });
    }

    const query = `INSERT INTO Notes (thesis_id, professor_id, content) VALUES (?, ?, ?)`;
    db.query(query, [thesis_id, professor_id, content], (err) => {
        if (err) {
            console.error('Σφάλμα κατά την καταχώρηση σημείωσης:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα κατά την καταχώρηση σημείωσης.' });
        }
        res.status(200).json({ success: true, message: 'Η σημείωση καταχωρήθηκε επιτυχώς!' });
    });
});

//-----------------API for loading the info of a cancelled thesis-------
app.post('/api/cancelled-thesis', authenticateJWT, (req, res) => {
    const { thesis_id } = req.body;

    if (!thesis_id) {
        return res.status(400).json({ success: false, message: 'Απαιτείται το thesis_id.' });
    }

    const query = `
            SELECT 
                l.gen_assembly_session,
                l.cancellation_reason,
                DATE_FORMAT(l.date_of_change, '%Y-%m-%d') AS formatted_date_of_change
            FROM Logs l
            WHERE l.thesis_id = ? AND l.new_state = 'cancelled'
            ORDER BY l.date_of_change DESC
            LIMIT 1;
`;

    db.query(query, [thesis_id], (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση των λεπτομερειών ακύρωσης:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Δεν βρέθηκαν λεπτομέρειες για την ακυρωμένη διπλωματική.' });
        }
        res.json({ success: true, details: results[0] });
    });
});


//-----------------API for changing an active thesis to to-be-reviewed status-----
app.post('/api/thesis/to-be-reviewed', authenticateJWT, (req, res) => {
    const { thesis_id, changeNumber, changeDate } = req.body; // Λαμβάνουμε το thesis_id ως query parameter

    if (!thesis_id) {
        return res.status(400).json({ success: false, message: 'Απαιτείται το thesis_id.' });
    }

    const thQuery = `UPDATE THESES
                         SET status = 'to-be-reviewed'
                         WHERE thesis_id = ?`;

    const logQuery = `INSERT INTO LOGS(thesis_id, date_of_change, old_state, new_state, gen_assembly_session)
                      VALUES (?, ?, 'active', 'to-be-reviewed', ?)`;

    db.beginTransaction((err) => {
        if (err) {
            console.error('Σφάλμα κατά την εκκίνηση της συναλλαγής:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }

        db.query(thQuery, [thesis_id], (thErr, thResult) => {
            if (thErr) {
                console.error('Σφάλμα κατά την μετατροπή της διπλωματικής σε υπό εξέταση:', thErr);
                return db.rollback(() => {
                    res.status(500).json({ success: false, message: 'Σφάλμα κατά την ενημέρωση της διπλωματικής.' });
                });
            }

            if (thResult.affectedRows === 0) {
                return db.rollback(() => {
                    res.status(400).json({ success: false, message: 'Η διπλωματική δεν βρέθηκε.' });
                });
            }

            db.query(logQuery, [thesis_id, changeDate, changeNumber], (logErr) => {
                if (logErr) {
                    console.error('Σφάλμα κατά την καταχώρηση στο LOGS:', logErr);
                    return db.rollback(() => {
                        res.status(500).json({ success: false, message: 'Σφάλμα κατά την καταχώρηση στο LOGS.' });
                    });
                }

                db.commit((commitErr) => {
                    if (commitErr) {
                        console.error('Σφάλμα κατά την επικύρωση της συναλλαγής:', commitErr);
                        return db.rollback(() => {
                            res.status(500).json({ success: false, message: 'Σφάλμα κατά την επικύρωση της συναλλαγής.' });
                        });
                    }

                    res.status(200).json({
                        success: true,
                        message: 'Η διπλωματική μετατράπηκε σε υπό εξέταση και η καταχώρηση στο LOGS ολοκληρώθηκε!'
                    });
                });
            });

        });

    });
})


//-----------------API for checking if a committee is full----------
app.post('/api/committee-status', authenticateJWT, (req, res) => {
    const { thesis_id } = req.body;

    if (!thesis_id) {
        return res.status(400).json({ success: false, message: 'Το thesis_id είναι υποχρεωτικό.' });
    }

    const query = `
        SELECT member1_id, member2_id
        FROM Committees
        WHERE thesis_id = ?;
    `;

    db.query(query, [thesis_id], (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά τον έλεγχο της επιτροπής:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Δεν βρέθηκε επιτροπή για τη συγκεκριμένη διπλωματική.' });
        }

        const { member1_id, member2_id } = results[0];
        const isFull = !!(member1_id && member2_id);
        res.status(200).json({ success: true, isFull });
    });
});

//-----------------API for changing an assigned thesis to active status---------------
app.post('/api/start-thesis', authenticateJWT, (req, res) => {
    const { thesisId, startNumber, startDate } = req.body;

    if (!thesisId || !startNumber || !startDate) {
        return res.status(400).json({ success: false, message: 'Όλα τα πεδία είναι υποχρεωτικά.' });
    }

    const thesisQuery = `UPDATE THESES
                         SET start_date = ?, status = 'active'
                         WHERE thesis_id = ?`;

    const logQuery = `INSERT INTO LOGS(thesis_id, date_of_change, old_state, new_state, gen_assembly_session)
                      VALUES (?, ?, 'assigned', 'active', ?)`;

    db.beginTransaction((err) => {
        if (err) {
            console.error('Σφάλμα κατά την εκκίνηση της συναλλαγής:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }

        // First query to update thesis
        db.query(thesisQuery, [startDate, thesisId], (thErr, thResult) => {
            if (thErr) {
                console.error('Σφάλμα κατά την ενημέρωση της διπλωματικής:', thErr);
                return db.rollback(() => {
                    res.status(500).json({ success: false, message: 'Σφάλμα κατά την ενημέρωση της διπλωματικής.' });
                });
            }

            if (thResult.affectedRows === 0) {
                return db.rollback(() => {
                    res.status(400).json({ success: false, message: 'Η διπλωματική δεν βρέθηκε.' });
                });
            }

            // Second query to update Logs
            db.query(logQuery, [thesisId, startDate, startNumber], (logErr) => {
                if (logErr) {
                    console.error('Σφάλμα κατά την καταχώρηση στο LOGS:', logErr);
                    return db.rollback(() => {
                        res.status(500).json({ success: false, message: 'Σφάλμα κατά την καταχώρηση στο LOGS.' });
                    });
                }

                db.commit((commitErr) => {
                    if (commitErr) {
                        console.error('Σφάλμα κατά την επικύρωση της συναλλαγής:', commitErr);
                        return db.rollback(() => {
                            res.status(500).json({ success: false, message: 'Σφάλμα κατά την επικύρωση της συναλλαγής.' });
                        });
                    }

                    res.status(200).json({
                        success: true,
                        message: 'Η διπλωματική ξεκίνησε επιτυχώς και η καταχώρηση στο LOGS ολοκληρώθηκε!'
                    });
                });
            });
        });
    });
});

//-----------------API for changing an active thesis to cancelled status---------------
app.post('/api/cancel-thesis', authenticateJWT, (req, res) => {
    const { thesis_id, cancellationNumber, cancellationDate, cancellationReasonText } = req.body;

    if (!thesis_id || !cancellationNumber || !cancellationDate || !cancellationReasonText) {
        return res.status(400).json({ success: false, message: 'Όλα τα πεδία είναι υποχρεωτικά.' });
    }

    const thesisQuery = `UPDATE THESES
                         SET status = 'cancelled'
                         WHERE thesis_id = ?`;

    const logQuery = `INSERT INTO LOGS(thesis_id, date_of_change, old_state, new_state, gen_assembly_session, cancellation_reason)
                         VALUES (?, ?, 'active', 'cancelled', ?, ?)`;

    db.beginTransaction((err) => {
        if (err) {
            console.error('Σφάλμα κατά την εκκίνηση της συναλλαγής:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }

        // First query to update thesis
        db.query(thesisQuery, [thesis_id], (thErr, thResult) => {
            if (thErr) {
                console.error('Σφάλμα κατά την ενημέρωση της διπλωματικής:', thErr);
                return db.rollback(() => {
                    res.status(500).json({ success: false, message: 'Σφάλμα κατά την ενημέρωση της διπλωματικής.' });
                });
            }

            if (thResult.affectedRows === 0) {
                return db.rollback(() => {
                    res.status(400).json({ success: false, message: 'Η διπλωματική δεν βρέθηκε.' });
                });
            }

            // Second query to update Logs
            db.query(logQuery, [thesis_id, cancellationDate, cancellationNumber, cancellationReasonText], (logErr) => {
                if (logErr) {
                    console.error('Σφάλμα κατά την καταχώρηση στο LOGS:', logErr);
                    return db.rollback(() => {
                        res.status(500).json({ success: false, message: 'Σφάλμα κατά την καταχώρηση στο LOGS.' });
                    });
                }

                db.commit((commitErr) => {
                    if (commitErr) {
                        console.error('Σφάλμα κατά την επικύρωση της συναλλαγής:', commitErr);
                        return db.rollback(() => {
                            res.status(500).json({ success: false, message: 'Σφάλμα κατά την επικύρωση της συναλλαγής.' });
                        });
                    }

                    res.status(200).json({
                        success: true,
                        message: 'Η διπλωματική ξεκίνησε επιτυχώς και η καταχώρηση στο LOGS ολοκληρώθηκε!'
                    });
                });
            });
        });
    });
});

//-----------------API for checking if an examination is announced----
app.post('/api/announcement-check', authenticateJWT, (req, res) => {
    const { thesisId } = req.body;

    if (!thesisId) {
        return res.status(400).json({ success: false, message: 'Missing thesisId' });
    }

    const announcementQuery = `
        SELECT *
        FROM ANNOUNCEMENTS
        WHERE thesis_id = ?;
    `;

    const examinationQuery = `
        SELECT *
        FROM Examinations
        WHERE thesis_id = ?;
    `;

    db.query(announcementQuery, [thesisId], (announcementErr, announcementResults) => {
        if (announcementErr) {
            console.error('Error fetching announcement details:', announcementErr);
            return res.status(500).json({ success: false, message: 'Server error' });
        }

        const announced = announcementResults.length > 0; // Αν υπάρχει ανακοίνωση, τότε είναι true

        db.query(examinationQuery, [thesisId], (examinationErr, examinationResults) => {
            if (examinationErr) {
                console.error('Error fetching examination details:', examinationErr);
                return res.status(500).json({ success: false, message: 'Server error' });
            }

            const examinationExists = examinationResults.length > 0; // Αν υπάρχει εξέταση, τότε είναι true

            return res.status(200).json({
                success: true,
                data: {
                    announced,
                    examinationExists
                }
            });
        });
    });
});



//-----------------API for creating an announcement of an examination----
app.post('/api/add-announcement', (req, res) => {
    const thesisId = req.body.thesisId;

    if (!thesisId) {
        return res.status(400).json({ success: false, message: 'Missing thesis_id parameter' });
    }

    const updateQuery = `
        INSERT INTO Announcements(thesis_id, announcement_date) 
        VALUES(?,CURRENT_DATE);
    `;

    db.query(updateQuery, [thesisId], (updateErr) => {
        if (updateErr) {
            console.error('Error updating thesis:', updateErr);
            return res.status(500).json({ success: false, message: 'Error updating thesis.' });
            ;
        }

        res.status(200).json({
            success: true,
            message: 'Announcement added successfully.'
        });
    });
});



//-----------------API for viewing an announcement of an examination----
app.get('/api/get-announcement-details/', (req, res) => {
    const thesisId = req.query.thesisId;

    if (!thesisId) {
        return res.status(400).json({ success: false, message: 'Missing thesis_id parameter' });
    }

    const selectQuery = `
        SELECT 
            t.thesis_id,
            t.title,
            CONCAT(s.name, ' ', s.surname) AS student_name,
            CONCAT(p.name, ' ', p.surname) AS professor_name,
            c.member1_id AS committee_member1_id,
            CONCAT(c1.name, ' ', c1.surname) AS committee_member1_name,
            c.member2_id AS committee_member2_id,
            CONCAT(c2.name, ' ', c2.surname) AS committee_member2_name,
            e.type_of_exam,
            e.date as exam_date,
            e.location AS examination_location,
            a.announcement_date as an_date
        FROM Theses t
        LEFT JOIN Announcements a ON t.thesis_id = a.thesis_id
        LEFT JOIN Examinations e ON t.thesis_id = e.thesis_id
        LEFT JOIN Students s ON t.student_id = s.id
        LEFT JOIN Professors p ON t.professor_id = p.id
        LEFT JOIN Committees c ON t.thesis_id = c.thesis_id
        LEFT JOIN Professors c1 ON c.member1_id = c1.id
        LEFT JOIN Professors c2 ON c.member2_id = c2.id
        WHERE t.thesis_id = ?;
    `;

    db.query(selectQuery, [thesisId], (err, results) => {
        if (err) {
            console.error('Error fetching thesis details:', err);
            return res.status(500).json({ success: false, message: 'Error fetching thesis details.' });
        }

        if (results.length === 0) {
            return res.status(200).json({
                success: false,
                message: 'No presentation details found.'
            });
        }

        const etag = crypto.createHash('sha1').update(JSON.stringify(results)).digest('hex');

        if (req.headers['if-none-match'] === etag) {
            return res.status(304).end(); 
        }

        res.setHeader('ETag', etag);
        res.status(200).json({
            success: true,
            data: results[0]
        });
    });
});


// API for viewing all announcements
app.get('/api/get-all-announcements/', (req, res) => {
    const selectQuery = `
        SELECT 
        t.thesis_id,
        t.title,
        CONCAT(s.name, ' ', s.surname) AS student_name,
        CONCAT(p.name, ' ', p.surname) AS professor_name,
        c.member1_id AS committee_member1_id,
        CONCAT(c1.name, ' ', c1.surname) AS committee_member1_name,
        c.member2_id AS committee_member2_id,
        CONCAT(c2.name, ' ', c2.surname) AS committee_member2_name,
        e.type_of_exam,
        e.date AS exam_date,
        e.location AS examination_location,
        a.announcement_date AS an_date
    FROM Theses t
    INNER JOIN Announcements a ON t.thesis_id = a.thesis_id
    LEFT JOIN Examinations e ON t.thesis_id = e.thesis_id
    LEFT JOIN Students s ON t.student_id = s.id
    LEFT JOIN Professors p ON t.professor_id = p.id
    LEFT JOIN Committees c ON t.thesis_id = c.thesis_id
    LEFT JOIN Professors c1 ON c.member1_id = c1.id
    LEFT JOIN Professors c2 ON c.member2_id = c2.id
    ORDER BY a.announcement_date DESC;
    `;

    db.query(selectQuery, (err, results) => {
        if (err) {
            console.error('Error fetching announcements:', err);
            return res.status(500).json({ success: false, message: 'Error fetching announcements.' });
        }

        if (results.length === 0) {
            return res.status(200).json({
                success: false,
                message: 'No announcements found.'
            });
        }
        const etag = crypto.createHash('sha1').update(JSON.stringify(results)).digest('hex');

        if (req.headers['if-none-match'] === etag) {
            return res.status(304).end(); 
        }
        res.setHeader('ETag', etag);
        res.status(200).json({
            success: true,
            data: results
        });
    });
});


//-----------------API for enabling the grading of an examination----
app.post('/api/enable-grading', authenticateJWT, (req, res) => {
    const { thesisId } = req.body;
    if (!thesisId) {
        return res.status(400).json({ success: false, message: 'Όλα τα πεδία είναι υποχρεωτικά.' });
    }
    const thesisQuery = ` UPDATE THESES
        SET grading_enabled = TRUE
        WHERE thesis_id = ?;`;
    db.query(thesisQuery, [thesisId], (thErr, thResults) => {
        if (thErr) {
            console.error('Σφάλμα κατά την ενεργοποίηση της βαθμολόγησης:', thErr);
            return res.status(500).json({ success: false, message: 'Σφάλμα κατά την ενεργοποίηση της βαθμολόγησης.' });
        }

        if (thResults.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Δεν βρέθηκε η συγκεκριμένη διπλωματική.' });
        }
        res.status(200).json({ success: true, message: 'Η βαθμολόγηση ενεργοποιήθηκε!' });
    });
});

//-----------------API for checking if a thesis has grading enabled----
app.post(`/api/thesis-status/`, authenticateJWT, (req, res) => {
    const { thesisId } = req.body;
    const professorId = req.user.userId;

    if (!thesisId) {
        return res.status(400).json({ success: false, message: 'Όλα τα πεδία είναι υποχρεωτικά.' });
    }

    const query = `
        SELECT 
            Theses.grading_enabled,
            Theses.final_grade,
            CASE
                WHEN Theses.professor_id = ? THEN 'Επιβλέπων'
                WHEN Committees.member1_id = ? OR Committees.member2_id = ? THEN 'Μέλος Τριμελούς'
                ELSE 'Χωρίς Σχέση'
            END AS role
        FROM Theses
        LEFT JOIN Committees ON Theses.thesis_id = Committees.thesis_id
        WHERE Theses.thesis_id = ?;
    `;

    db.query(query, [professorId, professorId, professorId, thesisId], (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την εύρεση της διπλωματικής:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα κατά την εύρεση της διπλωματικής.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Δεν βρέθηκε η συγκεκριμένη διπλωματική.' });
        }

        const { grading_enabled, final_grade, role } = results[0];
        res.status(200).json({
            success: true,
            gradingEnabled: grading_enabled,
            finalGrade: final_grade,
            role
        });
    });
});

app.get('api/thesis/check-completed', authenticateJWT, (req,res) =>{
    const studentId = req.user.userId;
    if(!studentId){
        return res.status(400).json({ success: false, message: 'Όλα τα πεδία είναι υποχρεωτικά.' });
    }

    const query = `SELECT * FROM THESES WHERE student_id =? and status='completed'; `;
    db.query(query, [thesisId, professorId, ...grades, comments], (err, result) => {
        if (err) {
            console.error('Σφάλμα κατά την καταχώρηση των βαθμών:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα κατά την καταχώρηση των βαθμών.' });
        }

        if (results.length === 0) {
            return res.status(200).json({ success: true, message: 'Η διπλωματική δεν είναι περατωμένη' });
        }
        res.status(200).json({ success: true, message: 'Η καταχώρηση βαθμών ολοκληρώθηκε επιτυχώς!' });
    });
});


//-----------------API for submitting a temporary grade for a specific thesis----
app.post('/api/submit-grades', authenticateJWT, (req, res) => {
    const { thesisId, grades, comments } = req.body;
    const professorId = req.user.userId;

    if (!thesisId || !grades || grades.length !== 4) {
        return res.status(400).json({ success: false, message: 'Όλα τα πεδία είναι υποχρεωτικά.' });
    }

    const query = `
        INSERT INTO Grades (thesis_id, professor_id, grade1, grade2, grade3, grade4, comments, finalized)
        VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)
        ON DUPLICATE KEY UPDATE 
        grade1 = VALUES(grade1), 
        grade2 = VALUES(grade2), 
        grade3 = VALUES(grade3), 
        grade4 = VALUES(grade4),
        comments =VALUES(comments),
        finalized = FALSE;
    `;

    db.query(query, [thesisId, professorId, ...grades, comments], (err, result) => {
        if (err) {
            console.error('Σφάλμα κατά την καταχώρηση των βαθμών:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα κατά την καταχώρηση των βαθμών.' });
        }
        res.status(200).json({ success: true, message: 'Η καταχώρηση βαθμών ολοκληρώθηκε επιτυχώς!' });
    });
});

//-----------------API for finalizing the grade of a professor for a specific thesis----
app.post('/api/finalize-submitted-grades', authenticateJWT, (req, res) => {
    const { thesisId, grades, comments } = req.body;
    const professorId = req.user.userId;

    if (!thesisId || !grades || grades.length !== 4) {
        return res.status(400).json({ success: false, message: 'Όλα τα πεδία είναι υποχρεωτικά.' });
    }

    const insertQuery = `
        INSERT INTO Grades (thesis_id, professor_id, grade1, grade2, grade3, grade4, comments, finalized)
        VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE 
        grade1 = VALUES(grade1), 
        grade2 = VALUES(grade2), 
        grade3 = VALUES(grade3), 
        grade4 = VALUES(grade4),
        comments = VALUES(comments),
        finalized = TRUE;
    `;

    const countQuery = `
        SELECT COUNT(*) AS finalized_count
        FROM Grades
        WHERE thesis_id = ? AND finalized = TRUE;
    `;

    const finalGradeQuery = `
        SELECT AVG((grade1 * 0.6 + grade2 * 0.15 + grade3 * 0.15 + grade4 * 0.1)) AS calculated_final_grade
        FROM Grades
        WHERE thesis_id = ?;
    `;

    const updateFinalGradeQuery = `
        UPDATE Theses
        SET final_grade = ?
        WHERE thesis_id = ?;
    `;

    db.beginTransaction((err) => {
        if (err) {
            console.error('Σφάλμα κατά την εκκίνηση της συναλλαγής:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }

        db.query(insertQuery, [thesisId, professorId, ...grades, comments], (err) => {
            if (err) {
                console.error('Σφάλμα κατά την καταχώρηση των βαθμών:', err);
                return db.rollback(() => {
                    res.status(500).json({ success: false, message: 'Σφάλμα κατά την καταχώρηση των βαθμών.' });
                });
            }

            db.query(countQuery, [thesisId], (countErr, countRes) => {
                if (countErr) {
                    console.error('Σφάλμα κατά την καταμέτρηση των βαθμών:', countErr);
                    return db.rollback(() => {
                        res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
                    });
                }

                const finalizedCount = countRes[0].finalized_count;

                if (finalizedCount === 3) {
                    db.query(finalGradeQuery, [thesisId], (finalGradeErr, finalGradeRes) => {
                        if (finalGradeErr) {
                            console.error('Σφάλμα κατά τον υπολογισμό του τελικού βαθμού:', finalGradeErr);
                            return db.rollback(() => {
                                res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
                            });
                        }
                        const finalGrade = finalGradeRes[0].calculated_final_grade;

                        db.query(updateFinalGradeQuery, [finalGrade, thesisId], (updateErr) => {
                            if (updateErr) {
                                console.error('Σφάλμα κατά την ενημέρωση του τελικού βαθμού:', updateErr);
                                return db.rollback(() => {
                                    res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
                                });
                            }

                            db.commit((commitErr) => {
                                if (commitErr) {
                                    console.error('Σφάλμα κατά την επικύρωση της συναλλαγής:', commitErr);
                                    return db.rollback(() => {
                                        res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
                                    });
                                }

                                res.status(200).json({
                                    success: true,
                                    message: 'Οι βαθμοί καταχωρήθηκαν και ο τελικός βαθμός υπολογίστηκε επιτυχώς.',
                                    finalizedCount,
                                    finalGrade
                                });
                            });
                        });
                    });
                } else {
                    db.commit((commitErr) => {
                        if (commitErr) {
                            console.error('Σφάλμα κατά την επικύρωση της συναλλαγής:', commitErr);
                            return db.rollback(() => {
                                res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
                            });
                        }

                        res.status(200).json({
                            success: true,
                            message: 'Οι βαθμοί καταχωρήθηκαν επιτυχώς.',
                            finalizedCount
                        });
                    });
                }
            });
        });
    });
});

//-----------------API for loading the grades of the other professors----
app.get('/api/get-grades-list/:thesisId', authenticateJWT, (req, res) => {
    const { thesisId } = req.params;

    if (!thesisId) {
        return res.status(400).json({ success: false, message: 'Ανεπαρκή δεδομένα.' });
    }

    const query = `SELECT 
        p.name AS professor_name,
        p.surname AS professor_surname,
        g.grade1 AS grade1,
        g.grade2 AS grade2,
        g.grade3 AS grade3,
        g.grade4 AS grade4,
        g.comments AS comments,
        g.finalized AS is_finalized
    FROM 
        Grades g
    JOIN 
        Professors p ON g.professor_id = p.id
    WHERE 
            g.thesis_id = ?;
    `;

    db.query(query, [thesisId], (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση βαθμολογίας:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα κατά την ανάκτηση βαθμολογίας.' });
        }

        if (results.length === 0) {
            return res.status(200).json({ success: true, grades: [] });
        }
        const etag = crypto.createHash('sha1').update(JSON.stringify(results)).digest('hex');

        if (req.headers['if-none-match'] === etag) {
            return res.status(304).end(); 
        }
        res.setHeader('ETag', etag);
        res.status(200).json({ success: true, grades: results });
    });

});

//-----------------API for loading the temporary grades of a professor for a specific thesis----
app.get('/api/get-professor-grades/:thesisId', authenticateJWT, (req, res) => {
    const { thesisId } = req.params;
    const professorId = req.user.userId;

    if (!thesisId || !professorId) {
        return res.status(400).json({ success: false, message: 'Ανεπαρκή δεδομένα.' });
    }

    const query = `
        SELECT grade1, grade2, grade3, grade4, comments, finalized
        FROM Grades
        WHERE thesis_id = ? AND professor_id = ?
    `;

    db.query(query, [thesisId, professorId], (err, results) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση βαθμολογίας:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα κατά την ανάκτηση βαθμολογίας.' });
        }

        if (results.length === 0) {
            return res.status(200).json({ success: true, grades: null });
        }
        
        const grades = results[0];
        const etag = crypto.createHash('sha1').update(JSON.stringify(grades)).digest('hex'); // Υπολογισμός ETag

        if (req.headers['if-none-match'] === etag) {
            return res.status(304).end(); 
        }
        res.setHeader('ETag', etag);
        res.status(200).json({ success: true, grades });
    });
});

//----------------- API to Assign Thesis to Students -----------------
app.post('/api/theses/assign', authenticateJWT, (req, res) => {
    const studentId = parseInt(req.body.studentId, 10);
    const thesisId = parseInt(req.body.thesisId, 10);
    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' '); // Current date with proper format for SQL

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

    const inslogQuery = `
        INSERT INTO LOGS(thesis_id, date_of_change, old_state, new_state)
        VALUES (?, ?, 'unassigned', 'assigned');
    `;

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

                db.query(inslogQuery, [thesisId, currentDate], (insLogErr) => {

                    if (insLogErr) {
                        console.error('Σφάλμα κατά τη καταχώρηση στα LOGS:', insLogErr);
                        return db.rollback(() => {
                            res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
                        });
                    }

                    db.commit((commitErr) => {
                        if (commitErr) {
                            console.error('Σφάλμα κατά την επικύρωση της συναλλαγής:', commitErr);
                            return db.rollback(() => {
                                res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
                            });
                        }
                        res.status(200).json({ success: true, message: 'Η διπλωματική ανατέθηκε και η καταχώρηση τριμελούς δημιουργήθηκε επιτυχώς!' });
                    });
                })
            });
        });
    });
});

//---------------- API for Unassigning a Thesis Theme -----------------
app.post('/api/theses/unassign', authenticateJWT, (req, res) => {
    const thesisId = parseInt(req.body.thesisId, 10);

    if (isNaN(thesisId)) {
        return res.status(400).json({ success: false, message: 'Μη έγκυρο thesis ID.' });
    }

    const unasQuery = `
        UPDATE THESES
        SET student_id = NULL, status = 'unassigned'
        WHERE thesis_id = ? AND status = 'assigned';
    `;

    const deleteCommitteeQuery = `
        DELETE FROM Committees
        WHERE thesis_id = ?;
    `;

    const deleteInvitationsQuery = `
        DELETE FROM INVITATIONS
        WHERE thesis_id = ?;
    `;

    const deleteLogsQuery = `
        DELETE FROM Logs
        WHERE thesis_id = ?;
    `;

    db.beginTransaction((err) => {
        if (err) {
            console.error('Σφάλμα κατά την εκκίνηση της συναλλαγής:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }

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

                    db.query(deleteLogsQuery, [thesisId], (deletelogErr) => {
                        if (deletelogErr) {
                            console.error('Σφάλμα κατά τη διαγραφή των Logs:', deletelogErr);
                            return db.rollback(() => {
                                res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
                            });
                        }

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
});

//---------------- API for Loading Professor Statistics -----------------
app.get('/api/stats/professors', authenticateJWT, (req, res) => {
    const professorId = req.user.userId;

    const queryStats = `
        SELECT distinct 
            AVG(CASE WHEN c.member1_id = ? OR c.member2_id = ? THEN t.final_grade END) AS avg_committee_member_grade,
            AVG(CASE WHEN t.professor_id = ? THEN t.final_grade END) AS avg_supervisor_grade,
            COUNT( CASE WHEN t.professor_id = ? THEN t.thesis_id ELSE NULL END) AS total_supervised_theses,
            COUNT( CASE WHEN c.member1_id = ? OR c.member2_id = ? THEN t.thesis_id ELSE NULL END) AS total_committee_theses,
        	AVG( CASE WHEN t.professor_id = ? THEN DATEDIFF( (SELECT e.date FROM examinations e WHERE e.thesis_id = t.thesis_id), t.start_date ) ELSE NULL END) AS avg_supervisor_completion_time,
            AVG( CASE WHEN c.member1_id = ? OR c.member2_id = ? THEN DATEDIFF( (SELECT e.date FROM examinations e WHERE e.thesis_id = t.thesis_id), t.start_date ) ELSE NULL END) AS avg_committee_member_completion_time
        FROM Theses t
        LEFT JOIN Committees c ON t.thesis_id = c.thesis_id
        LEFT JOIN Professors p ON t.professor_id = p.id
        WHERE t.status= 'completed';
    `;

    const queryName = `SELECT p.name, p.surname FROM Professors p WHERE p.id = ?`;

    db.query(queryStats, [
        professorId, professorId, professorId,
        professorId, professorId, professorId,
        professorId, professorId, professorId
    ], (err, statsResults) => {
        if (err) {
            console.error('Σφάλμα κατά την ανάκτηση των πληροφοριών για τα στατιστικά:', err);
            return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
        }

        db.query(queryName, [professorId], (err, nameResults) => {
            if (err) {
                console.error('Σφάλμα κατά την ανάκτηση του ονόματος του καθηγητή:', err);
                return res.status(500).json({ success: false, message: 'Σφάλμα στον server.' });
            }

            if (nameResults.length > 0) {
                const professorName = nameResults[0];
                statsResults[0].name = professorName.name;
                statsResults[0].surname = professorName.surname;
            }
            
            const etag = crypto.createHash('sha1').update(JSON.stringify(statsResults)).digest('hex');

            if (req.headers['if-none-match'] === etag) {
                return res.status(304).end(); 
            }
            res.setHeader('ETag', etag);

            res.status(200).json({ success: true, results: statsResults });
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