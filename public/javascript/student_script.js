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
                    case 'assigned':
                        status = 'Υπό Ανάθεση';
                        break;
                    case 'active':
                        status = 'Ενεργή';
                        break;
                    case 'to-be-reviewed':
                        status = 'Υπό Εξέταση';
                        break;
                    case 'completed':
                        status = 'Περατωμένη';
                }

                updateDataField('thesis_status', status); // Declared above, used in switch
                updateDataField('thesis_title', thesis.title);
                updateDataField('thesis_summary', thesis.summary);
                updateDataField('professor_name', thesis.professor_name);
                updateDataField('professor_surname', thesis.professor_surname);
                updateDataField('thesis_start_date', thesis.start_date || 'Δεν έχει εκκινήσει');
                updateDataField('thesis_end_date', thesis.end_date || 'Δεν');
                updateDataField('thesis_exam_date', thesis.exam_date);
                updateDataField('thesis_nimertis_link', thesis.nimertis_link);
                updateDataField('committee_member1_name', thesis.committee_member1_name || 'Δεν έχει οριστεί');
                updateDataField('committee_member1_surname', thesis.committee_member1_surname || ' ');
                updateDataField('committee_member2_name', thesis.committee_member2_name || 'Δεν έχει οριστεί');
                updateDataField('committee_member2_surname', thesis.committee_member2_surname || ' ');

                // Calculate and display thesis duration
                const durationElement = document.querySelector('[data-field="duration_block"]');
                if (thesis.start_date) {
                    durationElement.style.display = 'inline';
                    const duration = calculateDuration(thesis.start_date);
                    updateDataField('thesis_duration', duration);
                } else {
                    durationElement.style.display = 'none';

                }

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
            } else if(data.success && data.theses.length == 0){
                console.error('No thesis found for this student');
                updateDataField('thesis_status', "Δεν έχει εκκινήσει");
                const dashboardFooter = document.getElementById("dashboardFooter");
                const dashboardBody = document.getElementById("dashboardBody");
                dashboardBody.style.display = "none";
                dashboardFooter.style.display = "none";
            }
        })
        .catch(error => {
            console.error('Error loading thesis data:', error);
        });

    // Helper function to calculate the duration in months and days
    function calculateDuration(startDate) {
        const currentDate = new Date();
        const start = new Date(startDate);
        // Calculate the difference in months
        let months = currentDate.getMonth() - start.getMonth() + (12 * (currentDate.getFullYear() - start.getFullYear()));
        if (currentDate.getDate() < start.getDate()) {
            months--;
        }
        // Calculate the difference in days
        const days = Math.floor((currentDate - start) / (1000 * 60 * 60 * 24)) % 30;

        return `${months} μήνες και ${days} ημέρες`;
    }
    //Helper functions to replace ALL data-fields -and not just their first instance- as is needed
    function updateDataField(dataField, value, errorMessage = 'Error - no data') {
        const elements = document.querySelectorAll(`[data-field="${dataField}"]`);
        elements.forEach(element => {
            // If value is null or invalid, show error message
            element.textContent = (value && value !== null) ? value : errorMessage;
        });
    }
}


//--------------- Show/Hide Configuration parts based on status ---------------
function loadSectionsBasedOnStatus() {
    const token = localStorage.getItem('token');
    fetch('/api/theses', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch thesis data');
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.theses.length > 0) {
                const thesis = data.theses[0];
                // Reference each section
                const infoSection = document.getElementById("infoSection");
                const configurationBody = document.getElementById("configurationBody");
                const configurationFooter = document.getElementById("configurationFooter");
                const professorsSection = document.getElementById("professorsSection");
                const gradesSection = document.getElementById("gradesSection");
                const statusChangesSection = document.getElementById("statusChangesSection");
                const completedFilesSection = document.getElementById("completedFilesSection");
                const managementSection = document.getElementById("managementSection");
                const datesSection = document.getElementById("datesSection");

                // Show all sections as default
                infoSection.style.display = "block";
                configurationBody.style.display = "block";
                configurationFooter.style.display = "block";
                professorsSection.style.display = "block";
                gradesSection.style.display = "block";
                statusChangesSection.style.display = "block";
                completedFilesSection.style.display = "block";
                managementSection.style.display = "block";
                datesSection.style.display = "block";


                switch (thesis.status) {
                    case 'assigned':
                        infoSection.style.display = "block";
                        configurationBody.style.display = "block";
                        configurationFooter.style.display = "block";
                        professorsSection.style.display = "block";
                        gradesSection.style.display = "block";
                        statusChangesSection.style.display = "block";
                        completedFilesSection.style.display = "block";
                        managementSection.style.display = "block";
                        datesSection.style.display = "block";
                        break;
                    case 'active':
                        infoSection.style.display = "block";
                        configurationBody.style.display = "block";
                        configurationFooter.style.display = "block";
                        professorsSection.style.display = "block";
                        gradesSection.style.display = "block";
                        statusChangesSection.style.display = "block";
                        completedFilesSection.style.display = "block";
                        managementSection.style.display = "block";
                        datesSection.style.display = "block";
                        break;
                    case 'to-be-reviewed':
                        infoSection.style.display = "block";
                        configurationBody.style.display = "block";
                        configurationFooter.style.display = "block";
                        professorsSection.style.display = "block";
                        gradesSection.style.display = "block";
                        statusChangesSection.style.display = "block";
                        completedFilesSection.style.display = "block";
                        managementSection.style.display = "block";
                        datesSection.style.display = "block";
                        break;
                    case 'completed':
                        infoSection.style.display = "block";
                        configurationBody.style.display = "block";
                        configurationFooter.style.display = "block";
                        professorsSection.style.display = "block";
                        gradesSection.style.display = "block";
                        statusChangesSection.style.display = "block";
                        completedFilesSection.style.display = "block";
                        managementSection.style.display = "block";
                        datesSection.style.display = "block";
                        break;
                    case 'canceled':
                        infoSection.style.display = "block";
                        configurationBody.style.display = "block";
                        configurationFooter.style.display = "block";
                        professorsSection.style.display = "block";
                        gradesSection.style.display = "block";
                        statusChangesSection.style.display = "block";
                        completedFilesSection.style.display = "block";
                        managementSection.style.display = "block";
                        datesSection.style.display = "block";
                        break;
                }


            } else if (data.success && data.theses.length == 0) {
                console.error('No thesis found for this student');
                const thesis = data.theses[0];
                // Reference each section
                const infoSection = document.getElementById("infoSection");
                const configurationBody = document.getElementById("configurationBody");
                const configurationFooter = document.getElementById("configurationFooter");
                const professorsSection = document.getElementById("professorsSection");
                const gradesSection = document.getElementById("gradesSection");
                const statusChangesSection = document.getElementById("statusChangesSection");
                const completedFilesSection = document.getElementById("completedFilesSection");
                const managementSection = document.getElementById("managementSection");
                const datesSection = document.getElementById("datesSection");
                // Hide all sections but the info
                infoSection.style.display = "block";
                configurationBody.style.display = "none";
                configurationFooter.style.display = "none";
                professorsSection.style.display = "none";
                gradesSection.style.display = "none";
                statusChangesSection.style.display = "none";
                completedFilesSection.style.display = "none";
                managementSection.style.display = "none";
                datesSection.style.display = "none";

            } else {
                console.error('Error retriving data.');

            }
        })
        .catch(error => {
            console.error('Error loading thesis data:', error);
        });
}


//--------------- Functions for Committee Assignment and professor Search Bar ---------------
//--------------- Professor List creation, data load ---------------
document.querySelector('#search-professor').addEventListener('input', function () {
    const filter = this.value.trim();
    const professorList = document.getElementById('professor-list');

    if (filter.length === 0) {
        professorList.innerHTML = '';
        return;
    }

    fetch(`/api/professor-search?input=${encodeURIComponent(filter)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                professorList.innerHTML = ''; // Clear list

                data.professors.forEach(professor => {
                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item list-group-item-action';
                    listItem.textContent = `${professor.name} ${professor.surname}`;
                    listItem.dataset.professorId = professor.id;

                    listItem.addEventListener('click', function () {
                        document.getElementById('professorNameInput').value = `${professor.name} ${professor.surname}`;
                        document.getElementById('assignCommitteeButton').dataset.professorId = professor.id;
                        document.getElementById('professorListWrapper').style.display = 'none';
                    });

                    professorList.appendChild(listItem);
                });
            } else {
                console.error('Σφάλμα:', data.message);
            }
        })
        .catch(err => console.error('Σφάλμα κατά την επικοινωνία με το API:', err));

});
//--------------- EventListener for click on specific professor ---------------
document.querySelector('#professor-list').addEventListener('click', function (event) {
    const selectedProfessor = event.target;
    if (selectedProfessor.tagName === 'LI') {
        const professorId = selectedProfessor.dataset.professorId;
        const professorName = selectedProfessor.textContent;
        document.getElementById('chosenProfessor').style.display = 'block';

        document.getElementById('professorNameInput').value = professorName;
        document.getElementById('assignCommitteeButton').dataset.professorId = professorId;
        // Hide the list
        document.getElementById('professorListWrapper').style.display = 'none';
    }
});
//--------------- EventListener for changing chosed professor ---------------
document.getElementById('changeProfessorButton').addEventListener('click', function () {
    //Show the list again, hide the chosen professoer section
    document.getElementById('professorListWrapper').style.display = 'block';
    document.getElementById('chosenProfessor').style.display = 'none';

    document.getElementById('search-professor').value = ''; // Clears
    document.getElementById('professor-list').innerHTML = '';
    document.getElementById('professorNameInput').value = '';

    delete document.getElementById('assignCommitteeButton').dataset.professorId;
});
// Get the "Ορισμός" button to Show the professor Search Bar
document.querySelectorAll('.assignCommittee').forEach(button => {
    button.addEventListener('click', function () {
        // Show the professor search bar
        document.getElementById('professorSearchBar').style.display = 'block';
    });
});



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
    loadSectionsBasedOnStatus();
});

//--------------- Show the dashboard as main page after DOM is loaded ---------------
window.addEventListener('DOMContentLoaded', () => {
    const defaultTab = document.querySelector('a[href="#dashboard"]');
    if (defaultTab) {
        defaultTab.click();
    }
});

