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
                        break;
                    case 'canceled':
                        status = 'Ακυρωμένη.';

                }
                updateDataField('thesis_status', status); // Declared above, used in switch
                updateDataField('thesis_title', thesis.title);
                updateDataField('thesis_summary', thesis.summary);
                updateDataField('professor_name', thesis.professor_name);
                updateDataField('professor_surname', thesis.professor_surname);
                updateDataField('thesis_start_date', thesis.start_date || 'Δεν έχει εκκινήσει');
                updateDataField('thesis_exam_date', thesis.exam_date || 'Δεν');
                updateDataField('thesis_nimertis_link', thesis.nimertis_link);
                updateDataField('committee_member1_name', thesis.committee_member1_name || 'Δεν έχει οριστεί');
                updateDataField('committee_member1_surname', thesis.committee_member1_surname || ' ');
                updateDataField('committee_member2_name', thesis.committee_member2_name || 'Δεν έχει οριστεί');
                updateDataField('committee_member2_surname', thesis.committee_member2_surname || ' ');
                updateDataField('supervisor_grade', thesis.supervisor_grade || ' ');
                updateDataField('committee_member1_grade', thesis.committee_member1_grade || ' ');
                updateDataField('committee_member2_grade', thesis.committee_member2_grade || ' ');

                const finalGrade = calculateFinalGrade(thesis.supervisor_grade, thesis.committee_member1_grade, thesis.committee_member2_grade);
                updateDataField('final_grade', finalGrade);

                // Display thesis start date, duration, end date based on status
                const dashboardDuration = document.querySelector('[data-field="dashboardDuration"]');
                const dashboardStartDate = document.querySelector('[data-field="dashboardStartDate"]');
                const dashboardExamDate = document.querySelector('[data-field="dashboardExamDate"]');

                if (thesis.start_date && thesis.status === "active") {
                    dashboardDuration.style.display = 'inline';
                    dashboardExamDate.style.display = 'none';
                    const duration = calculateDuration(thesis.start_date);
                    updateDataField('thesis_duration', duration);
                } else if (thesis.start_date && (thesis.status === "to-be-reviewed" || thesis.status === "completed")) {
                    dashboardDuration.style.display = 'none';
                    dashboardExamDate.style.display = 'inline';
                } else {
                    dashboardDuration.style.display = 'none';
                    dashboardExamDate.style.display = 'none';
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
            } else if (data.success && data.theses.length == 0) {
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

    // Helper function to calculate the Final Grade (average of 3 committee members' grades)
    function calculateFinalGrade(supervisorGrade, committeeMember1Grade, committeeMember2Grade) {
        const grade1 = parseFloat(committeeMember1Grade) || null;
        const grade2 = parseFloat(committeeMember2Grade) || null;
        const grade3 = parseFloat(supervisorGrade) || null;

        if (grade1 === null || grade2 === null || grade3 === null) {
            return 'Η βαθμολόγιση δεν έχει ολοκληρωθεί.';
        }

        const totalGrade = grade1 + grade2 + grade3;
        const finalGrade = totalGrade / 3;
        return finalGrade.toFixed(2);
    }

    // Helper function to calculate the thesis duration in months and days
    function calculateDuration(startDate) {
        const currentDate = new Date();
        const start = new Date(startDate);

        let totalMonths = (currentDate.getFullYear() - start.getFullYear()) * 12 + (currentDate.getMonth() - start.getMonth());
        let days = currentDate.getDate() - start.getDate();

        // Adjust for negative days (crossed into a new month)
        if (days < 0) {
            totalMonths--; // Subtract one month
            const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate(); // Days in the previous month
            days += previousMonth;
        }
        const monthText = totalMonths > 0 ? `${totalMonths} μήνες` : '';
        const dayText = days > 0 ? `${days} ημέρες` : '';

        return [monthText, dayText].filter(Boolean).join(' και ');
    }
    //Helper function to replace ALL data-fields -and not just their first instance- as is needed
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
                const configurationDuration = document.querySelector('[data-field="configurationDuration"]');
                const configurationStartDate = document.querySelector('[data-field="configurationStartDate"]');
                const configurationExamDate = document.querySelector('[data-field="configurationExamDate"]');

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


                // Display thesis start date, duration, end date based on status
                if (thesis.start_date && thesis.status === "active") {
                    configurationDuration.style.display = 'inline';
                    configurationExamDate.style.display = 'none';
                    const duration = calculateDuration(thesis.start_date);
                    updateDataField('thesis_duration', duration);
                } else if (thesis.start_date && (thesis.status === "to-be-reviewed" || thesis.status === "completed")) {
                    configurationDuration.style.display = 'none';
                    configurationExamDate.style.display = 'inline';
                } else {
                    configurationDuration.style.display = 'none';
                    configurationExamDate.style.display = 'none';
                }


                switch (thesis.status) {
                    case 'assigned':
                        infoSection.style.display = "block";
                        configurationBody.style.display = "block";
                        configurationFooter.style.display = "block";
                        professorsSection.style.display = "block";
                        gradesSection.style.display = "none";
                        statusChangesSection.style.display = "none";
                        completedFilesSection.style.display = "none";
                        managementSection.style.display = "none";
                        datesSection.style.display = "none";
                        break;
                    case 'active':
                        infoSection.style.display = "block";
                        configurationBody.style.display = "block";
                        configurationFooter.style.display = "block";
                        professorsSection.style.display = "block";
                        gradesSection.style.display = "none";
                        statusChangesSection.style.display = "block";
                        completedFilesSection.style.display = "none";
                        managementSection.style.display = "block";
                        datesSection.style.display = "block";
                        break;
                    case 'to-be-reviewed':
                        infoSection.style.display = "block";
                        configurationBody.style.display = "block";
                        configurationFooter.style.display = "block";
                        professorsSection.style.display = "block";
                        gradesSection.style.display = "none";
                        statusChangesSection.style.display = "block";
                        completedFilesSection.style.display = "none";
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
                        configurationBody.style.display = "none";
                        configurationFooter.style.display = "none";
                        professorsSection.style.display = "block";
                        gradesSection.style.display = "none";
                        statusChangesSection.style.display = "none";
                        completedFilesSection.style.display = "none";
                        managementSection.style.display = "none";
                        datesSection.style.display = "none";
                        break;
                }


            } else if (data.success && data.theses.length == 0) {
                console.error('No thesis found for this student');
                const thesis = data.theses[0];

                const infoSection = document.getElementById("infoSection");
                const configurationBody = document.getElementById("configurationBody");
                const configurationFooter = document.getElementById("configurationFooter");
                const professorsSection = document.getElementById("professorsSection");
                const gradesSection = document.getElementById("gradesSection");
                const statusChangesSection = document.getElementById("statusChangesSection");
                const completedFilesSection = document.getElementById("completedFilesSection");
                const managementSection = document.getElementById("managementSection");
                const datesSection = document.getElementById("datesSection");

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


// --------------- Functions for handling the entire Thesis Management section ---------------
function setupThesisManagement() {
    const token = localStorage.getItem('token')

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
                setupEventListeners(thesis);
            }
        })
}
// FUNCTIONS TO HANDLE BUTTON PRESS FOR LINK/FILE UPLOAD
function setupEventListeners(thesis) {
    // Event listener for the file upload button
    document.getElementById('configurationUploadFile').addEventListener('click', function () {
        const fileInput = document.getElementById('fileInput').files[0];
        if (fileInput) {
            console.log(fileInput);  // Debug: Log the file object
            if (thesis) {
                uploadFile(fileInput, thesis);  // Pass thesis to the uploadFile function
            } else {
                alert('Thesis information is not available.');
            }
        } else {
            alert('Please select a file to upload.');
        }
    });
    // Event listener for the link upload button
    document.getElementById('uploadLink').addEventListener('click', function () {
        const link = document.getElementById('configurationLinkInput').value;
        if (link) {
            if (thesis) {
                uploadLink(link, thesis);  // Pass thesis to the uploadLink function
            } else {
                alert('Thesis information is not available.');
            }
        } else {
            alert('Please enter a link.');
        }
    });
}
// FUNCTIONS TO COMMUNICATE WITH THE BACKEND
// File Upload
function uploadFile(fileInput, thesis) {
    const formData = new FormData();
    formData.append('attachment', fileInput);
    formData.append('type', 'file'); // Specify that this is a file upload
    formData.append('thesis_id', thesis.thesis_id);

    fetch('/api/upload_attachment', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Ensure the cookie is sent with the request
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('fileInfo').textContent = 'File uploaded: ' + fileInput.name;
            } else {
                alert('Error uploading file: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error uploading file:', error);
            alert('Error uploading file');
        });
}
// Link upload
function uploadLink(link, thesis) {
    const formData = new FormData();
    formData.append('type', 'link'); // Specify that this is a link upload
    formData.append('link', link); // Add the link to FormData
    formData.append('thesis_id', thesis.thesis_id);

    fetch('/api/upload_attachment', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Ensure the cookie is sent with the request
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addLinkToList(link); // Add the uploaded link to the list
                document.getElementById('configurationLinkInput').value = ''; // Clear the input field
            } else {
                alert('Error uploading link: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error uploading link:', error);
            alert('Error uploading link');
        });
}

// Exam date set button handler
document.getElementById('configurationSetExamDateSection').addEventListener('click', function () {
    const examDate = document.getElementById('examDateInput').value;
    if (examDate) {
        document.getElementById('examDateInfo').textContent = 'Exam Date set: ' + examDate;
    } else {
        alert('Please select an exam date.');
    }
});
// Nimertis link submit button handler
document.getElementById('configurtaionSubmitNimertis').addEventListener('click', function () {
    const nimertisLink = document.getElementById('configurationNimertisSubmissionSection').value;
    if (nimertisLink) {
        document.getElementById('configurationNimertisInfo').textContent = 'Nimertis link submitted: ' + nimertisLink;
    } else {
        alert('Please enter the Nimertis link.');
    }
});

// SHOW/HIDE CONTROL FOR THESIS MANAGEMENT SECTIONS
document.getElementById('configurationButtonUploadFile').addEventListener('click', function () {
    showSection('configurationUploadFileSection');
});

document.getElementById('configurationButtonUploadLink').addEventListener('click', function () {
    showSection('linkSection');
});

document.getElementById('configurationButtonSetExamDate').addEventListener('click', function () {
    showSection('examDateSection');
});

document.getElementById('configurationButtonNimertisSubmission').addEventListener('click', function () {
    showSection('nimertisSection');
});

// Helper function to show a specific section and hide the others
function showSection(sectionId) {
    const sections = ['configurationUploadFileSection', 'linkSection', 'examDateSection', 'nimertisSection'];
    sections.forEach(function (section) {
        const element = document.getElementById(section);
        if (section === sectionId) {
            element.style.display = 'block';
        } else {
            element.style.display = 'none';
        }
    });
}
// Helper function to add a link to the list of uploaded links
function addLinkToList(link) {
    const linkList = document.getElementById('configurationUploadLinkSection');
    const newLinkElement = document.createElement('div');
    newLinkElement.classList.add('link-item');

    const linkText = document.createElement('span');
    linkText.textContent = link;

    newLinkElement.appendChild(linkText);
    linkList.appendChild(newLinkElement);
}


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
    setupThesisManagement();
});

//--------------- Show the dashboard as main page after DOM is loaded ---------------
window.addEventListener('DOMContentLoaded', () => {
    const defaultTab = document.querySelector('a[href="#dashboard"]');
    if (defaultTab) {
        defaultTab.click();
    }
});

//If exam dates exists and status completed , end_date=exam date. Also create end date as null.
//2 instances of PARAMS in server.js
//API Naming scheme . What even is '/api/invitations/:id/action'

