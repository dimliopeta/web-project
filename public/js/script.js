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
                studentList.innerHTML = ''; // Καθαρίζουμε τη λίστα

                data.students.forEach(student => {
                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item list-group-item-action';
                    listItem.textContent = `ID: ${student.id} - ${student.name} ${student.surname}`;
                    listItem.dataset.studentId = student.id;

                    // Προσθήκη listener για επιλογή φοιτητή
                    listItem.addEventListener('click', function () {
                        document.getElementById('studentNameInput').value = `${student.name} ${student.surname} (ID: ${student.id})`;
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

// Φόρτωση Διπλωματικών
function loadUnassignedTheses() {
    fetch('/api/theses/unassigned')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const thesisList = document.getElementById('thesisList');
                thesisList.innerHTML = ''; // Καθαρισμός υπάρχουσας λίστας

                data.theses.forEach(thesis => {
                    const radioItem = document.createElement('div');
                    radioItem.className = 'form-check';

                    const radioInput = document.createElement('input');
                    radioInput.className = 'form-check-input';
                    radioInput.type = 'radio';
                    radioInput.name = 'thesisRadio';
                    radioInput.id = `thesis-${thesis.theme_id}`;
                    radioInput.value = thesis.theme_id;

                    const radioLabel = document.createElement('label');
                    radioLabel.className = 'form-check-label';
                    radioLabel.htmlFor = `thesis-${thesis.theme_id}`;
                    radioLabel.textContent = thesis.title;

                    radioItem.appendChild(radioInput);
                    radioItem.appendChild(radioLabel);

                    thesisList.appendChild(radioItem);
                });
            } else {
                console.error('Σφάλμα:', data.message);
            }
        })
        .catch(err => console.error('Σφάλμα φόρτωσης διπλωματικών:', err));
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


document.addEventListener('DOMContentLoaded', function () {
    loadTheses(); 
    loadUnassignedTheses(); 
});
