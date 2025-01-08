//------------------------------ STARTUP SETTINGS ------------------------------
//--------------- Event listener for the navbar ---------------
document.querySelectorAll('.nav-link, .btn[data-target').forEach(tab => {
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

        // Set active tab
        document.querySelectorAll('.nav-link, .btn[data-target]').forEach(link => {
            link.classList.remove('active');
        });
        this.classList.add('active');

        // Set active tab for when buttons are used to change tabs
        const correspondingTab = document.querySelector(`.nav-link[href='#${targetId}']`);
        if (correspondingTab) {
            correspondingTab.classList.add('active');
        }
    });
});

//--------------- Logout Function ---------------
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




//------------------------------ DASHBOARD & THESIS CONFIGURATION PAGE ------------------------------
//---------------Load Thesis Function---------------
function loadStudentThesis() {
    const token = localStorage.getItem('token'); // Get the JWT token stored in local storage

    // Fetch thesis data from the backend API
    fetch('/api/theses', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}` // Add token to authorization header
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch thesis data');
            }
            return response.json(); // Parse the response as JSON
        })
        .then(data => {
            if (data.success && data.theses.length > 0) {
                // If thesis data exists, populate the dashboard with the thesis info
                const thesis = data.theses[0]; // Assuming one thesis per student

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
                    case 'unassigned':
                        status = 'Υπό Ανάθεση';
                }
                //Helper functions to replace ALL data-fields -and not just their first instance- as is needed
                function updateDataField(dataField, value, errorMessage = 'Error - no data') {
                    const elements = document.querySelectorAll(`[data-field="${dataField}"]`);
                    elements.forEach(element => {
                        // If value is null or invalid, show error message
                        element.textContent = (value && value !== null) ? value : errorMessage;
                    });
                }
                updateDataField('thesis_status', status); // Declared above, used in switch
                updateDataField('thesis_title', thesis.title);
                updateDataField('thesis_summary', thesis.summary);
                updateDataField('professor_name', thesis.professor_name);
                updateDataField('professor_surname', thesis.professor_surname);
                updateDataField('thesis_start_date', thesis.thesis_start_date);
                updateDataField('thesis_exam_date', thesis.thesis_exam_date);
                updateDataField('thesis_nimertis_link', thesis.thesis_nimertis_link);
                updateDataField('committee_member1_name', thesis.committee_member1_name ? 'placeholder' : 'Δεν έχει οριστεί');
                updateDataField('committee_member1_surname', thesis.committee_member1_surname ? 'placeholder' : ' ');
                updateDataField('committee_member2_name', thesis.committee_member2_name ? 'placeholder' : 'Δεν έχει οριστεί');
                updateDataField('committee_member2_surname', thesis.committee_member2_surname ? 'placeholder' : ' ');

                // Handle the PDF download button
                const pdfButton = document.querySelector('#dashboard [data-field="pdf_button"]');
                if (thesis.pdf_path) { // If PDF exists
                    pdfButton.addEventListener('click', () => {
                        window.open(thesis.pdf_path, '_blank'); // Opens PDF in a new tab
                    });
                } else {
                    pdfButton.addEventListener('click', () => { // If not
                        alert('No PDF available for this thesis.');
                    });
                    //pdfButton.disabled = true; // Optionally disable the button if no PDF exists
                    //pdfButton.style.display = 'none'; // Optionally hide the button if no PDF exists
                }
            } else {
                console.error('No thesis found for this student');
            }
        })
        .catch(error => {
            console.error('Error loading thesis data:', error);
        });
}

//--------------- Function to calculate thesis duration---------------
function calculateDuration(startDate) {
    const currentDate = new Date();
    const start = new Date(startDate);

    // Calculate the difference in months
    let months = currentDate.getMonth() - start.getMonth() + (12 * (currentDate.getFullYear() - start.getFullYear()));
    
    // If the current day is earlier in the month than the start day, subtract 1 from the month count
    if (currentDate.getDate() < start.getDate()) {
        months--;
    }

    // Calculate the difference in days
    const days = Math.floor((currentDate - start) / (1000 * 60 * 60 * 24)) % 30; // Remaining days after full months

    return { months, days };
}

// Function to update the duration in the card footer
function updateDuration() {
    // Fetch the thesis start date (replace 'thesis_start_date' with your actual date value)
    const startDate = document.querySelector('[data-field="thesis_start_date"]').textContent;

    // Calculate the duration
    const { months, days } = calculateDuration(startDate);

    // Display the duration in the data-field="thesis_duration" span
    const durationElement = document.querySelector('[data-field="thesis_duration"]');
    durationElement.textContent = `${months} μήνες και ${days} ημέρες`;
}

// Call the function to update the duration when the page loads
updateDuration();



//------------------------------ PROFILE PAGE ------------------------------
//--------------- Load Profile Function ---------------
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

//--------------- Event Listener for clicks on the edit buttons in Student Profile ---------------
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
            field.innerHTML = `<input type="text" class="p-1 form-control" value="${currentValue}">`;
            button.textContent = 'Αποθήκευση';
            // Change button appearance to green
            button.classList.remove('btn-outline-primary');
            button.classList.add('btn-success');
        } else {
            // Switch to view mode and save data
            const input = field.querySelector('input');
            const newValue = input.value;

            // Update the field display
            field.textContent = newValue;
            button.textContent = 'Αλλαγή';
            // Revert button appearance to grey
            button.classList.remove('btn-success');
            button.classList.add('btn-outline-primary');

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



//------------------------------ RUN FUNCTIONS AFTER DOM ------------------------------
//--------------- Load the student profile after DOM is loaded ---------------
document.addEventListener('DOMContentLoaded', () => {
    loadStudentProfile();
    loadStudentThesis();
});

//--------------- Show the dashboard as main page after DOM is loaded ---------------
window.addEventListener('DOMContentLoaded', () => {
    const defaultTab = document.querySelector('a[href="#dashboard"]');
    if (defaultTab) {
        defaultTab.click();
    }
});

