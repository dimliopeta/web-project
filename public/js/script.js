// Event listener για το navbar
document.querySelectorAll('.nav-link').forEach(tab => {
    tab.addEventListener('click', function (e) {
        e.preventDefault();

        // Απόκρυψη όλων των sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });

        // Εμφάνιση του ενεργού section
        const targetId = this.getAttribute('href').substring(1); // Παίρνουμε το ID από το href (π.χ., #dashboard)
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        // Ενημέρωση του active class στα tabs
        document.querySelectorAll('.nav-link').forEach(link => {
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

document.querySelector('#assign input[type="search"]').addEventListener('input', function () {
    const filter = this.value.trim(); // Παίρνουμε την τιμή που πληκτρολογήθηκε

    const studentList = document.getElementById('student-list');

    if (filter.length === 0) {
        // Αν το πεδίο είναι άδειο, καθαρίζουμε τη λίστα
        studentList.innerHTML = ''; // Καθαρισμός λίστας
        return; // Σταματάμε την εκτέλεση
    }

    // Κλήση στο backend για δυναμική αναζήτηση
    fetch(`/api/student-search?input=${encodeURIComponent(filter)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                studentList.innerHTML = ''; // Καθαρίζουμε τη λίστα

                data.students.forEach(student => {
                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item';
                    listItem.textContent = `Φοιτητής: ${student.NAME} ${student.SURNAME}`;
                    listItem.dataset.studentId = student.id; // Βάζουμε το ID του φοιτητή στο data attribute
                    studentList.appendChild(listItem);
                });
            } else {
                console.error('Σφάλμα:', data.message);
            }
        })
        .catch(err => console.error('Σφάλμα κατά την επικοινωνία με το API:', err));
});


// Event delegation για τη λίστα φοιτητών
document.getElementById('student-list').addEventListener('click', function (e) {
    // Ελέγχουμε αν το κλικ έγινε σε στοιχείο της λίστας
    const clickedItem = e.target.closest('.list-group-item');
    if (!clickedItem) return; // Αν δεν έγινε κλικ σε στοιχείο, δεν κάνουμε τίποτα

    // Παίρνουμε τα δεδομένα από το στοιχείο που κλικάραμε
    const studentName = clickedItem.textContent.trim();
    const studentId = clickedItem.dataset.studentId; // Υποθέτουμε ότι κάθε στοιχείο έχει `data-student-id`

    // Ενημερώνουμε το modal με τα δεδομένα του φοιτητή
    document.getElementById('studentNameInput').value = studentName.replace('Φοιτητής: ', ''); // Εμφάνιση του ονόματος
    document.getElementById('assignThesisButton').dataset.studentId = studentId; // Αποθήκευση του ID στο κουμπί

    // Εμφάνιση modal
    const modal = new bootstrap.Modal(document.getElementById('assignStudentModal'));
    modal.show();
});

document.getElementById('changeStudentButton').addEventListener('click', function () {
    const modal = bootstrap.Modal.getInstance(document.getElementById('assignStudentModal')); // Παίρνουμε την τρέχουσα instance του modal
    modal.hide(); // Κλείνουμε το modal
});


// Αναζήτηση διπλωματικών
document.getElementById('thesisSearchInput').addEventListener('input', function () {
    const query = this.value.trim();

    fetch(`/api/theses-search?query=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            const thesisList = document.getElementById('thesisList');
            thesisList.innerHTML = ''; // Καθαρισμός λίστας

            data.theses.forEach(thesis => {
                const listItem = document.createElement('li');
                listItem.className = 'list-group-item';
                listItem.textContent = thesis.title;
                listItem.dataset.thesisId = thesis.theme_id;
                thesisList.appendChild(listItem);

                listItem.addEventListener('click', function () {
                    document.querySelectorAll('#thesisList .list-group-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    this.classList.add('active');
                });
            });
        })
        .catch(err => console.error('Σφάλμα:', err));
});

// Ανάθεση διπλωματικής
document.getElementById('assignThesisButton').addEventListener('click', function () {
    const studentId = this.dataset.studentId;
    const thesisId = document.querySelector('#thesisList .list-group-item.active')?.dataset.thesisId;

    if (!thesisId) {
        alert('Επιλέξτε διπλωματική για ανάθεση.');
        return;
    }

    fetch('/api/assign-thesis', {
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
                $('#assignStudentModal').modal('hide'); // Κλείσιμο modal
            } else {
                alert('Σφάλμα: ' + data.message);
            }
        })
        .catch(err => console.error('Σφάλμα:', err));
});



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
                loadTheses();
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
    const token = localStorage.getItem('token'); // Ανάκτηση του token από το localStorage

    fetch('/api/theses', {
        headers: {
            'Authorization': `Bearer ${token}` // Προσθήκη του token στο header
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const thesesList = document.querySelector('#theses ul');
                thesesList.innerHTML = ''; // Καθαρίζουμε το υπάρχον περιεχόμενο

                data.theses.forEach((thesis, index) => {
                    let status = ""; // Δημιουργούμε τη μεταβλητή status εκτός του switch

                    switch (thesis.status) {
                        case 'active':
                            status = "Ενεργή";
                            break;
                        case 'to-be-reviewed':
                            status = "Υπό Εξέταση";
                            break;
                        case 'completed':
                            status = "Περατωμένη";
                            break;
                        default:
                            status = "Υπό Ανάθεση";
                    }

                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item';
                    listItem.textContent = `Διπλωματική ${index + 1}: ${thesis.title} - ${thesis.summary} - Κατάσταση: ${status}`;
                    thesesList.appendChild(listItem);
                });
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


document.addEventListener('DOMContentLoaded', loadTheses);
