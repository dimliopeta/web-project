// Event listener για το navbar
document.querySelectorAll('.nav-link, .btn[data-target]').forEach(tab => {
    tab.addEventListener('click', function (e) {
        e.preventDefault();

        // Απόκρυψη όλων των sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });

        // Εμφάνιση του ενεργού section
        const targetId = this.getAttribute('href')
            ? this.getAttribute('href').substring(1)
            : this.getAttribute('data-target');
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.style.display = 'block';

            // Φόρτωση δεδομένων ανάλογα με το section
            if (targetId === 'theses-section') {
                loadUnassignedTheses();
            } else if (targetId === 'list') {
                loadTheses();
            } else if (targetId === 'assign') {
                loadUnassignedTheses();
                loadAssignedTheses();
            } else if (targetId === 'invitations') {
                loadInvitations();
                loadInvitationHistory();
            }
        }

        // Απόκρυψη του παραθύρου επεξεργασίας
        const editSection = document.getElementById('edit-section');
        if (editSection && !editSection.classList.contains('d-none')) {
            editSection.classList.add('d-none'); // Απόκρυψη
        }

        const infoSection = document.getElementById('info-compartment');
        if (infoSection && !infoSection.classList.contains('d-none')) {
            infoSection.classList.add('d-none'); // Απόκρυψη
        }

        const thesesCompartment = document.getElementById('theses-compartment');
        if (thesesCompartment) {
            thesesCompartment.classList.remove('col-md-6');
            thesesCompartment.classList.add('col-lg-8', 'mx-auto'); // Επαναφορά
        }


        // Επαναφορά του μεγέθους του `themes-compartment`
        const themesCompartment = document.getElementById('themes-compartment');
        if (themesCompartment) {
            themesCompartment.classList.remove('col-md-6');
            themesCompartment.classList.add('col-lg-8', 'mx-auto'); // Επαναφορά
        }

        // Ενημέρωση του active class στα tabs
        document.querySelectorAll('.nav-link, .btn[data-target]').forEach(link => {
            link.classList.remove('active');
        });
        this.classList.add('active');
    });
});


// Εμφάνιση του dashboard κατά την αρχική φόρτωση
window.addEventListener('DOMContentLoaded', () => {
    const defaultTab = document.querySelector('a[href="#dashboard"]');
    if (defaultTab) {
        defaultTab.click();
    }
});

// Αναζήτηση Φοιτητών
document.querySelector('#search-student').addEventListener('input', function () {
    const filter = this.value.trim();
    const studentList = document.getElementById('student-list');

    if (filter.length === 0) {
        studentList.innerHTML = '';
        return;
    }

    // Κλήση στο backend
    fetch(`/api/student-search?input=${encodeURIComponent(filter)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                studentList.innerHTML = ''; // Καθαρισμός λίστας

                data.students.forEach(student => {
                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item list-group-item-action';
                    listItem.textContent = `AM: ${student.student_number} - ${student.name} ${student.surname}`;
                    listItem.dataset.studentId = student.id; // Αποθήκευση του ID

                    // Προσθήκη event listener για επιλογή φοιτητή
                    listItem.addEventListener('click', function () {
                        document.getElementById('studentNameInput').value = `${student.student_number} - ${student.name} ${student.surname}`;
                        document.getElementById('assignThesisButton').dataset.studentId = student.id;

                        // Απόκρυψη της λίστας φοιτητών
                        document.getElementById('studentListWrapper').style.display = 'none';
                    });

                    studentList.appendChild(listItem);
                });
            } else {
                console.error('Σφάλμα:', data.message);
            }
        })
        .catch(err => console.error('Σφάλμα κατά την επικοινωνία με το API:', err));

});


// Επιλογή Φοιτητή από τη Λίστα
document.querySelector('#student-list').addEventListener('click', function (event) {
    const selectedStudent = event.target; // Παίρνουμε το στοιχείο που επιλέχθηκε
    if (selectedStudent.tagName === 'LI') {
        const studentId = selectedStudent.dataset.studentId;
        const studentName = selectedStudent.textContent;

        // Εμφάνιση του επιλεγμένου φοιτητή
        document.getElementById('studentNameInput').value = studentName;
        document.getElementById('assignThesisButton').dataset.studentId = studentId;

        // Απόκρυψη λίστας φοιτητών
        document.getElementById('studentListWrapper').style.display = 'none';
    }
});

// Αλλαγή Επιλεγμένου Φοιτητή
// Εμφάνιση λίστας φοιτητών όταν πατάει το κουμπί "Αλλαγή Επιλεγμένου Φοιτητή"
document.getElementById('changeStudentButton').addEventListener('click', function () {
    // Εμφανίζουμε ξανά το studentListWrapper
    document.getElementById('studentListWrapper').style.display = 'block';

    // Επαναφέρουμε το search-student και τη λίστα φοιτητών
    document.getElementById('search-student').value = ''; // Καθαρισμός του input αναζήτησης
    document.getElementById('student-list').innerHTML = ''; // Καθαρισμός της λίστας φοιτητών

    // Καθαρίζουμε επίσης το επιλεγμένο όνομα φοιτητή και το ID
    document.getElementById('studentNameInput').value = '';
    delete document.getElementById('assignThesisButton').dataset.studentId;
});



//Φόρτωση ανατεθημένων θεμάτων
function loadAssignedTheses() {
    fetch('/api/theses/assigned', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const asThesesTableBody = document.querySelector('#assigned-theses tbody');
                asThesesTableBody.innerHTML = ''; // Καθαρισμός προηγούμενων δεδομένων

                data.theses.forEach(thesis => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${thesis.thesis_title}</td>
                        <td>${thesis.thesis_id}</td>
                        <td>${thesis.student_name}</td>
                        <td>${thesis.student_number}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" data-id="${thesis.thesis_id}">Αναίρεση Ανάθεσης</button>
                        </td>
                    `;

                    // Προσθήκη event listener για το κουμπί "Αναίρεση Ανάθεσης"
                    const unassignButton = row.querySelector('button');
                    unassignButton.addEventListener('click', () => {
                        unassignThesis(thesis.thesis_id);
                    });

                    asThesesTableBody.appendChild(row);
                });
            } else {
                console.error('Σφάλμα:', data.message);
            }
        })
        .catch(err => console.error('Σφάλμα φόρτωσης διπλωματικών:', err));
}

function unassignThesis(thesisId) {
    fetch(`/api/theses/unassign`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ thesisId })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Η ανάθεση αφαιρέθηκε επιτυχώς!');
                loadAssignedTheses(); // Επαναφόρτωση της λίστας
                loadUnassignedTheses();
            } else {
                console.error('Σφάλμα:', data.message);
            }
        })
        .catch(err => console.error('Σφάλμα κατά την αναίρεση ανάθεσης:', err));
}




// Φόρτωση Θεμάτων που δεν έχουν ανατεθεί 
function loadUnassignedTheses() {
    fetch('/api/theses/unassigned')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Φόρτωση στο "Θέματα Διπλωματικών"
                const thesesTableBody = document.querySelector('#theses-section table tbody');
                thesesTableBody.innerHTML = '';

                data.theses.forEach(thesis => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${thesis.title}</td>
                        <td>${thesis.thesis_id}</td>
                        <td>Υπό Ανάθεση</td>
                        <td>
                            <button class="btn btn-sm btn-primary" data-id="${thesis.thesis_id}">Επεξεργασία</button>
                        </td>
                    `;

                    const editButton = row.querySelector('button');
                    editButton.addEventListener('click', () => showEditSection(thesis));

                    thesesTableBody.appendChild(row);
                });

                // Φόρτωση στο "Ανάθεση σε Φοιτητή"
                const thesisList = document.getElementById('thesisList');
                thesisList.innerHTML = '';

                data.theses.forEach(thesis => {
                    const radioItem = document.createElement('div');
                    radioItem.className = 'form-check';

                    radioItem.innerHTML = `
                        <input class="form-check-input" type="radio" name="thesisRadio" id="thesis-${thesis.thesis_id}" value="${thesis.thesis_id}">
                        <label class="form-check-label" for="thesis-${thesis.thesis_id}">${thesis.title}</label>
                    `;

                    thesisList.appendChild(radioItem);
                });
            } else {
                console.error('Σφάλμα:', data.message);
            }
        })
        .catch(err => console.error('Σφάλμα φόρτωσης διπλωματικών:', err));
}

function showEditSection(thesis) {
    const editSection = document.getElementById('edit-section');
    const themesCompartment = document.getElementById('themes-compartment');

    if (!editSection || !themesCompartment) {
        console.error('Το edit-section ή το themes-compartment δεν βρέθηκε στο DOM.');
        return;
    }

    // Ενημέρωση των πεδίων του κουτιού επεξεργασίας
    const editTitle = document.getElementById('editTitle');
    const editSummary = document.getElementById('editSummary');

    // Ενημέρωση placeholder για τίτλο και περιγραφή
    editTitle.value = ''; // Κενό πεδίο για αλλαγή
    editSummary.value = ''; // Κενό πεδίο για αλλαγή
    editTitle.placeholder = thesis.title || 'Δεν υπάρχει τίτλος';
    editSummary.placeholder = thesis.summary && thesis.summary.trim() !== ''
        ? thesis.summary
        : 'Δεν υπάρχει περιγραφή';

    // Ορισμός του ID της διπλωματικής στο dataset της φόρμας
    const editForm = document.getElementById('editThesisForm');
    editForm.dataset.id = thesis.thesis_id; // thesis_id από το αντικείμενο thesis

    // Αλλαγή διατάξεων
    themesCompartment.classList.remove('col-lg-8', 'mx-auto');
    themesCompartment.classList.add('col-md-6');
    editSection.classList.remove('d-none');

    // Εστίαση στο edit-section
    editSection.scrollIntoView({ behavior: 'smooth' });
}

function showInfoSection(thesis) {
    const infoSection = document.getElementById('info-compartment');
    const thesesCompartment = document.getElementById('theses-compartment');

    if (!infoSection || !thesesCompartment) {
        console.error('Το info-compartment ή το theses-compartment δεν βρέθηκε.');
        return;
    }

    // Δημιουργία περιεχομένου βασικών πληροφοριών
    infoSection.innerHTML = `
        <div class="border p-3 rounded">
            <h5 class="text-primary">Βασικές Πληροφορίες</h5>
            <p><strong>Τίτλος:</strong> ${thesis.title || 'Δεν υπάρχει τίτλος'}</p>
            <p><strong>Κατάσταση:</strong> ${thesis.status || 'Άγνωστη'}</p>
            <p><strong>Περιγραφή:</strong> ${thesis.summary || 'Δεν υπάρχει διαθέσιμη περιγραφή.'}</p>
            <p><strong>Ρόλος Καθηγητή:</strong> ${thesis.role || 'Άγνωστος'}</p>
            <p><strong>Φοιτητής:</strong> ${thesis.student_name || 'Δεν έχει ανατεθεί'} (ΑΜ: ${thesis.student_number || '-'})</p>
            <p><strong>Στοιχεία Επικοινωνίας Φοιτητή:</strong> ${thesis.student_email || 'Δεν υπάρχουν διαθέσιμα στοιχεία'}</p>
            <button id="manage-thesis-btn" class="btn btn-primary mt-3">Διαχείριση Διπλωματικής</button>
        </div>
    `;

    thesesCompartment.classList.replace('col-lg-8', 'col-md-6');
    infoSection.classList.remove('d-none');
    infoSection.scrollIntoView({ behavior: 'smooth' });

    // Event για Διαχείριση
    document.getElementById('manage-thesis-btn').addEventListener('click', () => {
        showManagementSection(thesis);
    });
}




document.getElementById('editThesisForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const thesisId = this.dataset.id;
    const title = document.getElementById('editTitle').value;
    const summary = document.getElementById('editSummary').value;
    const pdf = document.getElementById('editPdf').files[0]; // Νέο αρχείο PDF

    const formData = new FormData();
    formData.append('title', title);
    formData.append('summary', summary);
    if (pdf) {
        formData.append('pdf', pdf); // Επισύναψη νέου αρχείου PDF αν υπάρχει
    }

    fetch(`/api/theses/${thesisId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}` // Αν χρειάζεται token
        },
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Η διπλωματική ενημερώθηκε επιτυχώς!');
                loadUnassignedTheses(); // Επαναφόρτωση λίστας
            } else {
                alert(`Σφάλμα: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Σφάλμα:', error);
            alert('Κάτι πήγε στραβά κατά την αποθήκευση!');
        });
});





//------------ Invitation Loading Froentend ----------
function loadInvitations() {
    fetch('/api/invitations', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
        .then(response => response.json())
        .then(data => {
            console.log('Data from API:', data);

            const container = document.querySelector('#invitations .row');
            container.innerHTML = ''; // Καθαρισμός προηγούμενου περιεχομένου

            if (data.success && data.invitations.length > 0) {
                data.invitations.forEach(invitation => {
                    const card = document.createElement('div');
                    card.classList.add('col-lg-6', 'mb-3');
                    card.innerHTML = `
                        <div class="card">
                            <div class="card-header">
                                Ημερομηνία Πρόσκλησης: ${invitation.invitation_date || 'Μη διαθέσιμη'}
                            </div>
                            <div class="card-body">
                                <h5 class="card-title">${invitation.thesis_title || 'Χωρίς τίτλο'}</h5>
                                <p class="card-text">${invitation.thesis_summary || 'Δεν υπάρχει περιγραφή'}</p>
                                <p class="text-muted">Κατάσταση: ${invitation.invitation_status || 'Μη διαθέσιμη'}</p>
                                <button class="btn btn-primary btn-sm accept-btn" data-id="${invitation.invitation_id}">Αποδοχή</button>
                                <button class="btn btn-outline-danger btn-sm reject-btn" data-id="${invitation.invitation_id}">Απόρριψη</button>
                            </div>
                        </div>
                    `;
                    container.appendChild(card);
                });

                // Προσθήκη event listeners στα κουμπιά
                document.querySelectorAll('.accept-btn').forEach(button => {
                    button.addEventListener('click', (event) => {
                        const invitationId = event.target.dataset.id;
                        handleInvitationAction(invitationId, 'accepted');
                    });
                });

                document.querySelectorAll('.reject-btn').forEach(button => {
                    button.addEventListener('click', (event) => {
                        const invitationId = event.target.dataset.id;
                        handleInvitationAction(invitationId, 'rejected');
                    });
                });
            } else {
                console.warn('No invitations found or API error.');
                container.innerHTML = '<h5 class="text-center">Δεν υπάρχουν προσκλήσεις!</h5>';
            }
        })
        .catch(error => {
            console.error('Σφάλμα κατά τη φόρτωση των προσκλήσεων:', error);
        });
}



//-----------------Invitation History Frontend -------------------
function loadInvitationHistory() {
    console.log('Fetching invitation history...');
    fetch('/api/invitation-history', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
        .then(response => {
            console.log('Fetch Response:', response);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('API Data:', data);
            if (data.success) {
                const invHistTableBody = document.querySelector('#invitation-history tbody');
                if (!invHistTableBody) {
                    console.error('Δεν βρέθηκε το στοιχείο #theses tbody.');
                    return;
                }

                invHistTableBody.innerHTML = ''; // Καθαρισμός του πίνακα

                if (data.invitations.length === 0) {
                    invHistTableBody.innerHTML = '<tr><td colspan="7">Δεν βρέθηκαν δεδομένα.</td></tr>';
                    return;
                }

                data.invitations.forEach(invitation => {
                    console.log('Invitation Data:', invitation);
                    const row = document.createElement('tr');

                    let response;
                    switch (invitation.response) {
                        case 'cancelled':
                            response = 'Ακυρωμένη';
                            break;
                        case 'rejected':
                            response = 'Απορρίφθηκε';
                            break;
                        case 'accepted':
                            response = 'Εγκρίθηκε';
                            break;
                    }

                    row.innerHTML = `
                        <td>${invitation.thesis_title}</td>
                        <td>${invitation.professor_name}</td>
                        <td>${invitation.student_name}</td>
                        <td>${invitation.student_number}</td>
                        <td>${response}</td>
                        <td>${invitation.invitation_date}</td>
                        <td>${invitation.response_date}</td>
                    `;
                    invHistTableBody.appendChild(row);
                });
            } else {
                console.error('Σφάλμα API:', data.message);
            }
        })
        .catch(err => console.error('Σφάλμα φόρτωσης:', err));
}





//-------------Invitation Acceptance/Rejection ------------------
function handleInvitationAction(invitationId, action) {
    fetch(`/api/invitations/${invitationId}/action`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }) // Δράση: "accepted" ή "rejected"
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                loadInvitations(); // Επαναφόρτωση της λίστας προσκλήσεων
                loadInvitationHistory();
            } else {
                alert(`Σφάλμα: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Σφάλμα κατά την ενέργεια πρόσκλησης:', error);
        });
}




// Ανάθεση Διπλωματικής
document.getElementById('assignThesisButton').addEventListener('click', function () {
    const studentId = this.dataset.studentId;
    const selectedThesis = document.querySelector('input[name="thesisRadio"]:checked');

    if (!studentId || !selectedThesis) {
        alert('Παρακαλώ επιλέξτε φοιτητή και διπλωματική.');
        return;
    }

    const thesisId = selectedThesis.value;

    console.log('Sending Student ID:', studentId);
    console.log('Sending Thesis ID:', thesisId);

    fetch('/api/theses/assign', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId, thesisId }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Η ανάθεση ολοκληρώθηκε επιτυχώς!');
                loadUnassignedTheses();
                loadAssignedTheses();
                document.getElementById('studentListWrapper').style.display = 'block';

                // Επαναφέρουμε το search-student και τη λίστα φοιτητών
                document.getElementById('search-student').value = ''; // Καθαρισμός του input αναζήτησης
                document.getElementById('student-list').innerHTML = ''; // Καθαρισμός της λίστας φοιτητών

                // Καθαρίζουμε επίσης το επιλεγμένο όνομα φοιτητή και το ID
                document.getElementById('studentNameInput').value = '';
                delete document.getElementById('assignThesisButton').dataset.studentId;
            } else {
                alert('Σφάλμα: ' + data.message);
            }
        })
        .catch(err => console.error('Σφάλμα:', err));
});




//------------------THESIS CREATION MODAL ------------------------------------
document.getElementById('thesisForm').addEventListener('submit', function (e) {
    e.preventDefault(); // Αποτροπή της παραδοσιακής υποβολής φόρμας

    const title = document.getElementById('title').value;
    const summary = document.getElementById('summary').value;
    const pdf = document.getElementById('pdf').files[0]; // Get the file object, not the file path
    const token = localStorage.getItem('token'); // Ανάκτηση του token από το localStorage

    // Create a new FormData object to send the form data and the file
    const formData = new FormData();
    formData.append('title', title);
    formData.append('summary', summary);
    formData.append('pdf', pdf); // Attach the file

    // Δημιουργία ενός AJAX request με Fetch API
    fetch('/api/theses/new', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}` // Προσθήκη του token στο header
        },
        body: formData // Send the FormData as the request body
    })
        .then(response => response.json()) // Μετατροπή της απάντησης σε JSON
        .then(data => {
            if (data.success) {
                console.log('Success:', data);
                alert(data.message); // Εμφάνιση μηνύματος επιτυχίας

                // Καθαρίζουμε τη φόρμα
                document.getElementById('title').value = '';
                document.getElementById('summary').value = '';
                document.getElementById('pdf').value = '';


                // Επαναφόρτωση της λίστας διπλωματικών
                loadUnassignedTheses();
            } else {
                alert('Σφάλμα: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Σφάλμα: Κάτι πήγε στραβά!');
        });
});


// Συνάρτηση για φόρτωση των διπλωματικών
function loadTheses() {
    const token = localStorage.getItem('token');

    fetch('/api/theses', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const thesesTableBody = document.querySelector('#list #theses tbody');
                if (!thesesTableBody) {
                    console.error('Δεν βρέθηκε το στοιχείο #theses tbody.');
                    return;
                }

                thesesTableBody.innerHTML = ''; // Καθαρισμός του πίνακα

                if (data.theses.length === 0) {
                    thesesTableBody.innerHTML = '<tr><td colspan="4">Δεν βρέθηκαν δεδομένα.</td></tr>';
                    return;
                }

                data.theses.forEach(thesis => {
                    console.log('Προσθήκη θέματος:', thesis);

                    let status;
                    switch (thesis.status) {
                        case 'active':
                            status = 'Ενεργή';
                            break;
                        case 'to-be-reviewed':
                            status = 'Υπό Εξέταση';
                            break;
                        case 'completed':
                            status = 'Περατωμένη';
                            break;
                        case 'assigned':
                            status = 'Υπό Ανάθεση';
                            break;
                        default:
                            status = 'Μη ανατεθημένο θέμα';
                    }

                    const roleText = thesis.role === 'Επιβλέπων' ? 'Επιβλέπων Καθηγητής' 
                  : thesis.role === 'Μέλος Τριμελούς' ? 'Μέλος Τριμελούς Επιτροπής' 
                  : 'Άγνωστος Ρόλος';


                    // Δημιουργία γραμμής πίνακα
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${thesis.title || 'Χωρίς τίτλο'}</td>
                        <td>${thesis.thesis_id || 'Χωρίς ID'}</td>
                        <td>${roleText}</td>
                        <td>${status}</td>
                    `;

                    // Ενεργοποίηση εμφάνισης πληροφοριών κατά το κλικ
                    row.addEventListener('click', (event) => {
                        showInfoSection(thesis);
                        console.log('clicked!');
                    });

                    thesesTableBody.appendChild(row);
                });
            } else {
                console.error('Σφάλμα API:', data.message);
            }
        })
        .catch(err => console.error('Σφάλμα φόρτωσης:', err));
}




//------------Event Listener for Filter dropdown----------------
document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', event => {
        event.preventDefault(); // Αποφυγή default συμπεριφοράς του link
        const filterValue = event.target.getAttribute('data-filter');
        applyFilter(filterValue);
    });
});


//------------Filtering for Theses List----------------
function applyFilter(filterValue) {
    const token = localStorage.getItem('token');

    fetch('/api/theses', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const thesesTableBody = document.querySelector('#theses tbody');
                thesesTableBody.innerHTML = '';
                if (!thesesTableBody) {
                    console.error('Δεν βρέθηκε το στοιχείο #theses tbody στη σελίδα.');
                    return;
                }

                data.theses
                    .filter(thesis => {
                        if (['to-be-reviewed', 'active', 'completed', 'canceled', 'unassigned'].includes(filterValue)) {
                            return thesis.status === filterValue;
                        }
                        return true; // Default: εμφάνιση όλων
                    })
                    .forEach(thesis => {
                        const row = document.createElement('tr');

                        let status;
                        switch (thesis.status) {
                            case 'assigned':
                                status = 'Υπό Ανάθεση';
                                break;
                            case 'to-be-reviewed':
                                status = 'Υπό Εξέταση';
                                break;
                            case 'completed':
                                status = 'Περατωμένη';
                                break;
                            case 'unassigned':
                                status = 'Μη Ανατεθημένο Θέμα';
                                break;
                            case 'active':
                                status = 'Ενεργή';
                                break;
                            default:
                                status = 'Άγνωστη Κατάσταση';
                        }

                        row.innerHTML = `
                            <td>${thesis.title}</td>
                            <td>${thesis.thesis_id}</td>
                            <td>${thesis.role}</td>
                            <td>${status}</td>
                        `;
                        row.addEventListener('click', (event) => {
                            showInfoSection(thesis);
                            console.log('clicked!');
                        });

                        thesesTableBody.appendChild(row);
                    });
            } else {
                console.error('Σφάλμα:', data.message);
            }
        })
        .catch(err => console.error('Σφάλμα φόρτωσης διπλωματικών:', err));
}




document.getElementById('logout-btn').addEventListener('click', (event) => {
    event.preventDefault(); // Αποφυγή της προεπιλεγμένης συμπεριφοράς του link
    fetch('/logout', {
        method: 'POST',
        credentials: 'include' // Περιλαμβάνει cookies
    })
        .then(response => {
            if (response.ok) {
                window.location.href = '/'; // Ανακατεύθυνση στο index
            } else {
                alert('Logout failed');
            }
        })
        .catch(err => console.error('Error:', err));
});


document.addEventListener('DOMContentLoaded', function () {
    loadTheses();
    loadInvitations();
    loadInvitationHistory();
    loadUnassignedTheses();
    loadAssignedTheses();
});
