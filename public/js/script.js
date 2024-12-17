// Διαχείριση φόρμας Δημιουργίας Νέου Θέματος
const createThesisForm = document.getElementById('createThesisForm');

createThesisForm.addEventListener('submit', function (event) {
    event.preventDefault(); // Αποτρέπουμε το προεπιλεγμένο refresh της σελίδας

    // Παίρνουμε τις τιμές των πεδίων
    const title = document.getElementById('thesisTitle').value;
    const description = document.getElementById('thesisDescription').value;

    // Εμφανίζουμε ένα alert
    alert(`Νέο Θέμα Δημιουργήθηκε:\nΤίτλος: ${title}\nΠεριγραφή: ${description}`);

    // Προσθέτουμε δυναμικά το θέμα στη λίστα
    const list = document.querySelector('#theses ul');
    const newListItem = document.createElement('li');
    newListItem.className = 'list-group-item';
    newListItem.textContent = `${title} - ${description}`;
    list.appendChild(newListItem);

    // Καθαρίζουμε τη φόρμα
    createThesisForm.reset();
});

// Δυναμική Εναλλαγή Περιεχομένου (Tabs από Sidebar)
const navLinks = document.querySelectorAll('.nav-link');

navLinks.forEach(link => {
    link.addEventListener('click', function (event) {
        event.preventDefault(); // Αποτρέπουμε τη μετάβαση σε νέα σελίδα

        // Κρύβουμε όλα τα sections
        const sections = document.querySelectorAll('.main-content > div');
        sections.forEach(section => section.style.display = 'none');

        // Εμφανίζουμε μόνο το αντίστοιχο section
        const sectionId = this.getAttribute('data-section');
        document.getElementById(sectionId).style.display = 'block';
    });
});

// Προεπιλεγμένο section: Πίνακας Ελέγχου
document.getElementById('dashboard').style.display = 'block';
