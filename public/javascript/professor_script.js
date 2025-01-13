//--------------------Nav Bar Event Listener-----------------------------
document.querySelectorAll('.nav-link, .btn[data-target]').forEach(tab => {
    tab.addEventListener('click', function (e) {
        e.preventDefault();

        
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });

        
        const targetId = this.getAttribute('href')
            ? this.getAttribute('href').substring(1)
            : this.getAttribute('data-target');
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.style.display = 'block';

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


        
        const themesCompartment = document.getElementById('themes-compartment');
        if (themesCompartment) {
            themesCompartment.classList.remove('col-md-6');
            themesCompartment.classList.add('col-lg-8', 'mx-auto'); // Επαναφορά
        }

        
        document.querySelectorAll('.nav-link, .btn[data-target]').forEach(link => {
            link.classList.remove('active');
        });
        this.classList.add('active');
    });
});


//-----------Load the Dashboard as the Homepage-------------
window.addEventListener('DOMContentLoaded', () => {
    const defaultTab = document.querySelector('a[href="#dashboard"]');
    if (defaultTab) {
        defaultTab.click();
    }
});




//------------Student Search Bar Event Listener when Typing-----------------------
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
                studentList.innerHTML = '';

                data.students.forEach(student => {
                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item list-group-item-action';
                    listItem.textContent = `AM: ${student.student_number} - ${student.name} ${student.surname}`;
                    listItem.dataset.studentId = student.id; // Αποθήκευση του ID

                   
                    listItem.addEventListener('click', function () {
                        document.getElementById('studentNameInput').value = `${student.student_number} - ${student.name} ${student.surname}`;
                        document.getElementById('assignThesisButton').dataset.studentId = student.id;

                    
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




//-------------------Selecting Student from Student Search Bar Event Listener--------------
document.querySelector('#student-list').addEventListener('click', function (event) {
    const selectedStudent = event.target; 
    if (selectedStudent.tagName === 'LI') {
        const studentId = selectedStudent.dataset.studentId;
        const studentName = selectedStudent.textContent;

        document.getElementById('studentNameInput').value = studentName;
        document.getElementById('assignThesisButton').dataset.studentId = studentId;

        document.getElementById('studentListWrapper').style.display = 'none';
    }
});




//--------------Change Selected Student Button on Assign Tab Event Listener------------
document.getElementById('changeStudentButton').addEventListener('click', function () {
    document.getElementById('studentListWrapper').style.display = 'block';

    document.getElementById('search-student').value = ''; 
    document.getElementById('student-list').innerHTML = ''; 

    document.getElementById('studentNameInput').value = '';
    delete document.getElementById('assignThesisButton').dataset.studentId;
});





//-----------Function for Loading Assigned Theses----------------- 
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
                asThesesTableBody.innerHTML = ''; 
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




//-----------Function for Reversing the Assignment of a Theme to a Student----------------- 
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




//-----------Function for Loading Unassigned Themes----------------- 
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
                        <td>Μη ανατεθημένο θέμα</td>
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

    // Ενημέρωση διαστάσεων του info-compartment
    thesesCompartment.classList.remove('col-lg-8', 'mx-auto');
    thesesCompartment.classList.add('col-md-6');

    infoSection.classList.remove('d-none');
    infoSection.innerHTML = ''; // Καθαρισμός προηγούμενου περιεχομένου

    // Προσθήκη τίτλου
    const title = document.createElement('h5');
    title.textContent = thesis.title || 'Χωρίς τίτλο';
    title.classList.add('text-primary', 'mb-3');
    infoSection.appendChild(title);

    // Δημιουργία βασικών πληροφοριών
    const fields = [
        { label: 'Περιγραφή', value: thesis.summary || 'Χωρίς περιγραφή' },
        { label: 'Φοιτητής', value: `${thesis.student_name || 'Χωρίς φοιτητή'} (ΑΜ: ${thesis.student_number || 'Χωρίς ΑΜ'})` },
        { label: 'Στοιχεία Επικοινωνίας', value: thesis.student_email || 'Χωρίς email' },
        { label: 'Ημερομηνία Έναρξης', value: thesis.start_date || 'Χωρίς ημερομηνία' },
        { label: 'Κατάσταση', value: thesis.status || 'Άγνωστη' },
    ];

    // Δημιουργία τμημάτων για τα πεδία
    fields.forEach(field => {
        const div = document.createElement('div');
        div.classList.add('mb-2');
        div.innerHTML = `<strong>${field.label}:</strong> ${field.value}`;
        infoSection.appendChild(div);
    });

    // Προσθήκη διαχωριστικών τμημάτων για αισθητική συνοχή
    infoSection.appendChild(document.createElement('hr'));

    // Δυναμική προσθήκη επιπλέον πληροφοριών ανάλογα με την κατάσταση
    if (thesis.status === 'active' || thesis.status === 'to-be-reviewed') {
        const committeeDiv = document.createElement('div');
        committeeDiv.innerHTML = `
            <h6 class="text-muted">Μέλη Τριμελούς Επιτροπής</h6>
            <p>${thesis.committee_member1_name || 'Χωρίς μέλος'}, ${thesis.committee_member2_name || 'Χωρίς μέλος'}</p>
        `;
        infoSection.appendChild(committeeDiv);
        infoSection.appendChild(document.createElement('hr'));
    }

    if (thesis.status === 'completed') {
        const gradesDiv = document.createElement('div');
        gradesDiv.innerHTML = `
            <h6 class="text-muted">Βαθμολογία</h6>
            <p>${thesis.grades || 'Χωρίς βαθμολογία'}</p>
            <h6 class="text-muted mt-3">Σύνδεσμος Τελικού Κειμένου</h6>
            <p>${thesis.final_repository_link || 'Χωρίς σύνδεσμο'}</p>
        `;
        infoSection.appendChild(gradesDiv);
        infoSection.appendChild(document.createElement('hr'));
    }

    // Footer με ημερομηνίες
    const footer = document.createElement('div');
    footer.innerHTML = `
        <h6 class="text-muted">Ημερομηνίες</h6>
        <p><strong>Ημερομηνία Έναρξης:</strong> ${thesis.start_date || 'Χωρίς ημερομηνία'}</p>
        <p><strong>Ημερομηνία Περάτωσης:</strong> ${thesis.exam_date || 'Χωρίς ημερομηνία'}</p>
    `;
    infoSection.appendChild(footer);
}




// Συνάρτηση για δημιουργία κουμπιών
function createButton(text, btnClass, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.classList.add('btn', btnClass, 'mt-2', 'me-2');
    button.addEventListener('click', onClick);
    return button;
}



// Dummy λειτουργίες για τα κουμπιά
function undoAssignment(thesisId) {
    console.log(`Αναίρεση ανάθεσης για τη διπλωματική με ID ${thesisId}`);
}

function createNoteForThesis(thesisId) {
    console.log(`Δημιουργία σημείωσης για τη διπλωματική με ID ${thesisId}`);
}

function changeStatusToUnderReview(thesisId) {
    console.log(`Αλλαγή κατάστασης σε "Υπό Εξέταση" για τη διπλωματική με ID ${thesisId}`);
}


function publishAnnouncement(thesisId) {
    console.log(`Παραγωγή ανακοίνωσης για τη διπλωματική με ID ${thesisId}`);
}

function enableGrading(thesisId) {
    console.log(`Ενεργοποίηση βαθμολογίας για τη διπλωματική με ID ${thesisId}`);
}


//------------Edit Theme Button Event Listener-----------
document.getElementById('editThesisForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const thesisId = this.dataset.id; // Διατήρηση του ID από το dataset
    const title = document.getElementById('editTitle').value;
    const summary = document.getElementById('editSummary').value;
    const pdf = document.getElementById('editPdf').files[0]; // Νέο αρχείο PDF

    const formData = new FormData();
    formData.append('thesisId', thesisId); // Προσθήκη του ID στο body
    formData.append('title', title);
    formData.append('summary', summary);
    if (pdf) {
        formData.append('pdf', pdf); // Επισύναψη νέου αρχείου PDF αν υπάρχει
    }

    fetch('/api/theses/update', { // Τροποποίηση του endpoint για να μην χρησιμοποιεί το ID στο URL
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





//-------------Invitation Acceptance/Rejection Handler ------------------
function handleInvitationAction(invitationId, action) {
    fetch('/api/invitations/action', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId, action }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                loadInvitations(); // Reload invitations
                loadInvitationHistory();
            } else {
                alert(`Error: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error handling invitation action:', error);
        });
}





//------------Theme Assignment Button Event Listener-----------
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




//------------------Thesis Creation Event Listener on Submit -------------------
document.getElementById('thesisForm').addEventListener('submit', function (e) {
    e.preventDefault(); // Αποτροπή της παραδοσιακής υποβολής φόρμας

    const title = document.getElementById('title').value;
    const summary = document.getElementById('summary').value;
    const pdf = document.getElementById('pdf').files[0]; h
    const token = localStorage.getItem('token'); 

   
    const formData = new FormData();
    formData.append('title', title);
    formData.append('summary', summary);
    formData.append('pdf', pdf); 

    
    fetch('/api/theses/new', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}` 
        },
        body: formData 
    })
        .then(response => response.json()) 
        .then(data => {
            if (data.success) {
                console.log('Success:', data);
                alert(data.message); 

                
                document.getElementById('title').value = '';
                document.getElementById('summary').value = '';
                document.getElementById('pdf').value = '';


               
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


//---------Function for Loading the Theses List of the professor-------
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


//------------Event Listener for export to csv button------- 
document.getElementById('export-csv').addEventListener('click', () => {
    const token = localStorage.getItem('token');
    fetch('/api/theses', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const rows = data.theses;
            if (rows.length === 0) {
                alert('Δεν υπάρχουν δεδομένα για εξαγωγή.');
                return;
            }

            // Δημιουργία κεφαλίδων (headers) από τα κλειδιά του πρώτου αντικειμένου
            const headers = Object.keys(rows[0]).map(header => `"${header}"`).join(',');

            // Δημιουργία περιεχομένου CSV από τις τιμές
            const csvContent = rows.map(row => {
                return Object.values(row).map(value => `"${value || ''}"`).join(',');
            });

            const csvBlob = new Blob(
                [`\uFEFF${headers}\n${csvContent.join('\n')}`], // Προσθέτει το BOM για σωστή κωδικοποίηση
                { type: 'text/csv;charset=utf-8;' }
            );
            
            const url = URL.createObjectURL(csvBlob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'theses.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            console.error('Σφάλμα API:', data.message);
        }
    })
    .catch(err => console.error('Σφάλμα φόρτωσης:', err));
});


//------------Event Listener for export to json button------- 
document.getElementById('export-json').addEventListener('click', () => {
    const token = localStorage.getItem('token');
    fetch('/api/theses', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const rows = data.theses;
            if (rows.length === 0) {
                alert('Δεν υπάρχουν δεδομένα για εξαγωγή.');
                return;
            }

            // Δημιουργία JSON
            const jsonBlob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8;' });

            const url = URL.createObjectURL(jsonBlob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'theses.json');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            console.error('Σφάλμα API:', data.message);
        }
    })
    .catch(err => console.error('Σφάλμα φόρτωσης:', err));
});


//------------Event Listener for Filter dropdown----------------
document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', event => {
        event.preventDefault(); // Αποφυγή default συμπεριφοράς του link
        const filterValue = event.target.getAttribute('data-filter');
        applyFilter(filterValue);
    });
});


//------------Filtering for Theses List----------------
let appliedFilters = { status: null, role: null };

function applyFilter(filterType, filterValue) {
    // Ενημέρωση των εφαρμοσμένων φίλτρων
    appliedFilters[filterType] = filterValue;

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
                if (!thesesTableBody) {
                    console.error('Δεν βρέθηκε το στοιχείο #theses tbody στη σελίδα.');
                    return;
                }

                thesesTableBody.innerHTML = '';

                // Φιλτράρισμα των δεδομένων
                data.theses
                    .filter(thesis => {
                        const matchesStatus = !appliedFilters.status || thesis.status === appliedFilters.status;
                        const matchesRole = !appliedFilters.role || thesis.role === appliedFilters.role;
                        return matchesStatus && matchesRole;
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
                        row.addEventListener('click', () => {
                            showInfoSection(thesis);
                        });

                        thesesTableBody.appendChild(row);
                    });
            } else {
                console.error('Σφάλμα:', data.message);
            }
        })
        .catch(err => console.error('Σφάλμα φόρτωσης διπλωματικών:', err));
}

function clearFilters() {
    appliedFilters = { status: null, role: null };
    applyFilter(); // Επαναφόρτωση χωρίς φίλτρα
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
