//---------------Event listener for the navbar---------------
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



//---------------Logout Function---------------
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





//---------------Load Profile Function---------------
function loadStudentProfile() {
    const token = localStorage.getItem('token');

    // Fetch student data from the backend API
    fetch('/api/student', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, // Send token in Authorization header
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch student data');
            }
            return response.json(); // Parse the response as JSON
        })
        .then(data => {
            // Update the profile page with fetched data
            const student = data;

            // Profile details
            document.querySelector('#student_profile [data-field="name"]').textContent = student.name;
            document.querySelector('#student_profile [data-field="surname"]').textContent = student.surname;
            document.querySelector('#student_profile [data-field="student_number"]').textContent = student.student_number;

            // Contact information
            document.querySelector('#student_profile [data-field="contact_email"]').textContent = student.contact_email;
            document.querySelector('#student_profile [data-field="mobile_telephone"]').textContent = student.mobile_telephone;
            document.querySelector('#student_profile [data-field="landline_telephone"]').textContent = student.landline_telephone;
            document.querySelector('#student_profile [data-field="street"]').textContent = student.street;
            document.querySelector('#student_profile [data-field="number"]').textContent = student.number;
            document.querySelector('#student_profile [data-field="city"]').textContent = student.city;
            document.querySelector('#student_profile [data-field="postcode"]').textContent = student.postcode;

        })
        .catch(error => {
            console.error('Error loading student data:', error);
        });
}

//---------------Load Thesis Function---------------
function loadStudentThesis() {
    const token = localStorage.getItem('token');

    fetch('/api/student/thesis', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch thesis data');
            }
            return response.json(); // Parse the response as JSON
        })
        .then(data => {
            if (data.success) {
                const thesis = data.thesis;

                // Update the dashboard with thesis details
                document.querySelector('#dashboard [data-field="thesis_status"]').textContent = thesis.thesis_status;
                document.querySelector('#dashboard [data-field="thesis_title"]').textContent = thesis.thesis_title;
                document.querySelector('#dashboard [data-field="professor_name"]').textContent = thesis.professor_name;
                document.querySelector('#dashboard [data-field="professor_surname"]').textContent = thesis.professor_name;
                //document.querySelector('#dashboard [data-field="committee2_name"]').textContent = thesis.committee2_name;
                //document.querySelector('#dashboard [data-field="committee3_name"]').textContent = thesis.committee3_name;
                document.querySelector('#dashboard [data-field="thesis_start_date"]').textContent = thesis.start_date;
                document.querySelector('#dashboard [data-field="thesis_exam_date"]').textContent = thesis.exam_date;
                document.querySelector('#dashboard [data-field="thesis_end_date"]').textContent = thesis.end_date;
                //document.querySelector('#dashboard [data-field="thesis_grade_total"]').textContent = thesis.thesis_grade_total;
                //document.querySelector('#dashboard [data-field="thesis_grade_1"]').textContent = thesis.thesis_grade_1;
                //document.querySelector('#dashboard [data-field="thesis_grade_2"]').textContent = thesis.thesis_grade_2;
                //document.querySelector('#dashboard [data-field="thesis_grade_3"]').textContent = thesis.thesis_grade_3;
                document.querySelector('#dashboard [data-field="thesis_pdf"]').textContent = thesis.pdf_path;
                document.querySelector('#dashboard [data-field="thesis_nimertis_link"]').textContent = thesis.thesis_nimertis_link;
                //document.querySelector('#dashboard [data-field="thesis_exam_report"]').textContent = thesis.thesis_exam_report;
                //document.querySelector('#dashboard [data-field="thesis_uploaded_file"]').textContent = thesis.thesis_uploaded_file;
                //document.querySelector('#dashboard [data-field="thesis_uploaded_link"]').textContent = thesis.thesis_uploaded_link; 
                

                

                // Handle PDF button (if applicable)
                const pdfButton = document.querySelector('#dashboard .btn-outline-primary');
                if (thesis.thesis_pdf_path) {
                    pdfButton.style.display = 'inline-block';
                    pdfButton.addEventListener('click', () => {
                        window.open(thesis.thesis_pdf_path, '_blank');
                    });
                } else {
                    pdfButton.style.display = 'none';
                }
            } else {
                console.error('Error:', data.message);
            }
        })
        .catch(error => {
            console.error('Error loading thesis data:', error);
        });
}

//---------------Event Listener for clicks on the edit buttons in Student Profile---------------
document.querySelector('#student_profile').addEventListener('click', function (event) {
    // Check if the clicked element is a toggle button
    if (event.target.classList.contains('toggle-edit')) {
        const button = event.target;
        const row = button.closest('.row');
        const field = row.querySelector('[data-field]');
        const fieldName = field.getAttribute('data-field');

        if (button.textContent === 'Αλλαγή') {
            // Switch to edit mode
            const currentValue = field.textContent;
            field.innerHTML = `<input type="text" class="form-control" value="${currentValue}">`;
            button.textContent = 'Αποθήκευση';
        } else {
            // Switch to view mode and save data
            const input = field.querySelector('input');
            const newValue = input.value;

            // Update the field display
            field.textContent = newValue;
            button.textContent = 'Αλλαγή';

            // Save the updated data to the backend
            const token = localStorage.getItem('token'); // Get the JWT token
            fetch('/api/updateProfile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ [fieldName]: newValue }) // Send the updated field name and value
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to update profile data');
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Profile updated successfully:', data);
                })
                .catch(error => {
                    console.error('Error updating profile:', error);
                    alert('Αποτυχία ενημέρωσης προφίλ');
                });
        }
    }
});

//------ Load the student profile after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadStudentProfile();
});

//---------------Show the dashboard as main page after DOM is loaded---------------
window.addEventListener('DOMContentLoaded', () => {
    const defaultTab = document.querySelector('a[href="#dashboard"]');
    if (defaultTab) {
        defaultTab.click();
    }
});

