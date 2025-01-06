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






async function loadStudentData(studentId) {
    try {
        // Fetch student data from the backend API
        const response = await fetch(`/api/student/${studentId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch student data');
        }
        const student = await response.json();

        // Update the profile page with fetched data
        document.querySelector('#student_profile h5').textContent = student.name;
        document.querySelector('#student_profile .text-muted.mb-1').textContent = student.student_number;

        // Update contact information
        document.querySelector('#student_profile [data-field="email"]').textContent = student.email;
        document.querySelector('#student_profile [data-field="mobile_telephone"]').textContent = student.mobile_telephone;
        document.querySelector('#student_profile [data-field="landline_telephone"]').textContent = student.landline_telephone;
        document.querySelector('#student_profile [data-field="street"]').textContent = student.street;
        document.querySelector('#student_profile [data-field="street_number"]').textContent = student.street_number;
        document.querySelector('#student_profile [data-field="city"]').textContent = student.city;
        document.querySelector('#student_profile [data-field="postcode"]').textContent = student.postcode;
    } catch (error) {
        console.error('Error loading student data:', error);
    }
}

// Call the function with a sample student ID (replace "12345" with actual ID)
document.addEventListener('DOMContentLoaded', () => {
    const studentId = ''; // Replace with dynamically fetched ID if available
    loadStudentData(studentId);
});


document.addEventListener('DOMContentLoaded', loadTheses);