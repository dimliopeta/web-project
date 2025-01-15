//--------------------------------------------- STARTUP SETTINGS ---------------------------------------------
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
console.log('Hello fellow web user. Congratulations for finding this message! You win a mediocre sense of accomplishment.')

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
                alert('Η αποσύνδεση απέτυχε.');
            }
        })
        .catch(err => console.error('Error:', err));
});



//--------------------------------------------- DASHBOARD ---------------------------------------------
//------------------------------ Functions to Load Thesis and helper functions ------------------------------
//------------------------------ Load Thesis Function ------------------------------
function loadStudentThesis() {
    const token = localStorage.getItem('token'); // Get the JWT token stored in local storage

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
                    case 'cancelled':
                        status = 'Ακυρωμένη.';

                }
                // Update the data-fields in the dashboard
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
                if (thesis.pdf_path) {
                    pdfButton.addEventListener('click', () => {
                        window.open(thesis.pdf_path, '_blank'); // Opens PDF in a new tab
                    });
                } else {
                    pdfButton.addEventListener('click', () => {
                        alert('Δεν υπάρχει PDF διαθέσιμο γι αυτή τη διπλωματική.');
                    });

                    //pdfButton.disabled = true; // Optionally disable the button if no PDF exists
                    //pdfButton.style.display = 'none'; // Optionally hide the button if no PDF exists
                }

                // Hide the Committee Invitation button in thesis Management if committee is full
                if (thesis.committee_member1_name && thesis.committee_member2_name) {
                    document.querySelector('.inviteCommitteeButton').style.display = 'none';
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

}
//---------------Helper function add 2 strings together (Name + Surname)
function nameSurname(name, surname) {
    return name + ' ' + surname;
}
//---------------Helper function to sort alphabetically 3 inputs
function sortThreeStrings(input1, input2, input3) {
    const inputs = [input1, input2, input3];
    inputs.sort();
    return inputs;
}
//---------------Helper function to calculate the Final Grade (average of 3 committee members' grades)
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
//---------------Helper function to calculate the thesis duration in months and days
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
//---------------Helper function to replace ALL data-fields -and not just their first instance- as is needed
function updateDataField(dataField, value, errorMessage = 'Error - no data') {
    const elements = document.querySelectorAll(`[data-field="${dataField}"]`);
    elements.forEach(element => {
        element.textContent = (value && value !== null) ? value : errorMessage;
    });
}



//--------------------------------------------- THESIS CONFIGURATION PAGE ---------------------------------------------
// ------------------------------ Functions for Thesis Management handling ------------------------------
//--------------- Main func that pulls thesis data and helper funcs ---------------
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

                // If Nimertis Link exists in the thesis table, then 
                const nimertisLinkButton = document.getElementById('configurationCompletedFilesNimertisLink');
                if (thesis.nimertis_link) {
                    nimertisLinkButton.addEventListener('click', () => {
                        window.open(thesis.nimertis_link, '_blank');
                    });

                } else {
                    nimertisLinkButton.addEventListener('click', () => {
                        alert('Ο σύνδεσμος Νημερτή δεν είναι ακόμα διαθέσιμος.')
                    });

                }

                setupEventListeners(thesis);
                fetchAndDisplayAttachments(thesis);
                fetchAndDisplayNimertisLink(thesis);
                fetchAndDisplayExaminations(thesis);
                loadThesisInvitations(thesis.thesis_id);
            }
        })
}
//------------------------------ Show/Hide Configuration Page parts based on status ------------------------------
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
                    case 'cancelled':
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
//------------------------------ Functions for Committee Assignment and Professor Search Bar ------------------------------
//------------------------------ Professor List creation, data load ------------------------------
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
                        document.getElementById('sendInviteButton').dataset.professorId = professor.id;
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
        document.getElementById('sendInviteButton').dataset.professorId = professorId;
        // Hide the list
        document.getElementById('professorListWrapper').style.display = 'none';
    }
});
//--------------- EventListener for changing chosen professor ---------------
document.getElementById('changeProfessorButton').addEventListener('click', function () {
    //Show the list again, hide the chosen professor section
    document.getElementById('professorListWrapper').style.display = 'block';
    document.getElementById('chosenProfessor').style.display = 'none';

    document.getElementById('search-professor').value = ''; // Clears
    document.getElementById('professor-list').innerHTML = '';
    document.getElementById('professorNameInput').value = '';

    delete document.getElementById('sendInviteButton').dataset.professorId;
});
//--------------- Get the "Πρόσκληση" button to open the professor Search Bar
document.querySelectorAll('.inviteCommitteeButton').forEach(button => {
    button.addEventListener('click', function () {
        // Show the professor search bar
        document.getElementById('professorSearchBar').style.display = 'block';
    });
});
//--------------- EventListener for inviting a Professor to a Committee via the "Πρόσκληση Καθηγητή" button ---------------
document.getElementById('sendInviteButton').addEventListener('click', function () {
    const token = localStorage.getItem('token');
    const professorId = this.dataset.professorId;

    fetch('/api/invitation_create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ professorId })
    })
        .then(response => {
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert('Η πρόσκληση στάλθηκε.');
                document.getElementById('professorListWrapper').style.display = 'block';
                document.getElementById('chosenProfessor').style.display = 'none';

                document.getElementById('search-professor').value = ''; // Clears
                document.getElementById('professor-list').innerHTML = '';
                document.getElementById('professorNameInput').value = '';
                document.getElementById('professorSearchBar').style.display = 'none';

                delete document.getElementById('sendInviteButton').dataset.professorId;
                loadThesisInvitations(data.thesis_id);
            } else {
                alert('Σφάλμα κατά την αποστολή της πρόσκλησης ' + data.message);
            }
        })
        .catch(err => console.error('Error sending invitation:', err));
});
//--------------- Function for loading Invitations associated with the students Thesis ---------------
function loadThesisInvitations(thesis_id) {
    const token = localStorage.getItem('token');

    fetch('/api/invitations-for-thesis', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ thesis_id: thesis_id }) // Send thesis_id in the request body
    })
        .then(response => response.json())
        .then(data => {
            const container = document.querySelector('#invitationCardSection .row');
            container.innerHTML = ''; // Clear previous content

            if (data.success && data.invitations.length > 0) {
                document.querySelector('#invitationCardSection').style.display = 'block';

                data.invitations.forEach(invitation => {
                    const card = document.createElement('div');
                    card.classList.add('col-lg-6', 'mb-3');
                    // Set up the status message
                    const statusText = invitation.invitation_status === 'pending' ? 'Εκκρεμής'
                        : invitation.invitation_status === 'accepted' ? 'Αποδεκτή'
                            : 'Ακυρώθηκε';
                    // Set up the status message color
                    const statusColor = invitation.invitation_status === 'accepted' ? 'text-success'
                        : invitation.invitation_status === 'cancelled' ? 'text-danger'
                            : '';

                    // Build the card content dynamically
                    card.innerHTML = `
                        <div class="card">
                            <div class="card-header">
                                Ημερομηνία Πρόσκλησης: ${invitation.invitation_date || 'Μη διαθέσιμη'}
                            </div>
                            <div class="card-body">
                                <h5 class="card-title">Καθηγητής: ${invitation.professor_name || 'Μη διαθέσιμος'} ${invitation.professor_surname || ''}</h5>
                                <p class="card-text ${statusColor}"><strong>Κατάσταση Πρόσκλησης:</strong> ${statusText}</p>
                                ${invitation.invitation_status === 'cancelled' ? '' : `
                                    <p><strong>Ημερομηνία Απόκρισης:</strong> ${invitation.response_date || ''}</p>
                                `}
                                ${invitation.invitation_status === 'pending' ? `
                                    <button class="btn btn-outline-danger cancelCommitteInvitation">Ακύρωση Πρόσκλησης</button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                    container.appendChild(card);
                });
            } else {
                console.warn('No invitations found or API error.');
                container.innerHTML = '<h5 class="text-center">Δεν υπάρχουν προσκλήσεις για τη συγκεκριμένη διπλωματική!</h5>';
            }
        })
        .catch(error => {
            console.error('Σφάλμα κατά τη φόρτωση των προσκλήσεων:', error);
        });
}
//--------------- Function for cancelling an invitation ---------------
document.querySelector('#invitationCardSection .row').addEventListener('click', function (event) {
    if (event.target && event.target.classList.contains('cancelCommitteInvitation')) {
        const invitationCard = event.target.closest('.card');
        const token = localStorage.getItem('token');

        fetch('/api/invitation_cancel', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    loadThesisInvitations(data.thesis_id)
                } else {
                    alert('Σφάλμα κατά την ακύρωση της πρόσκλησης.');
                }
            })
            .catch(error => {
                console.error('Error while canceling invitation:', error);
                alert('Σφάλμα κατά την ακύρωση της πρόσκλησης.');
            });
    }
});
//--------------- EventListener for the student to Show/Hide the invitation section ---------------
document.getElementById('HideInvitesButton').addEventListener('click', function () {
    const invitationCardSection = document.getElementById('invitationCardSection');
    invitationCardSection.style.display = 'none';
});
//------------------------------ Functions for upload buttons click Event Listeners ------------------------------
function setupEventListeners(thesis) {
    // File upload button
    document.getElementById('configurationUploadFileButton').addEventListener('click', function () {
        const configurationUploadFileInputBox = document.getElementById('configurationUploadFileInputBox').files[0];
        if (configurationUploadFileInputBox) {
            if (thesis) {
                uploadFile(configurationUploadFileInputBox, thesis);  // Pass thesis to the uploadFile function
            } else {
                alert('Δεν είναι διαθέσιμες οι πληροφορίες γι αυτή τη διπλωματική.');
            }
        } else {
            alert('Παρακαλώ επιλέξτε ένα αρχείο προς ανάρτηση.');
        }
    });
    // Link upload button event listener
    document.getElementById('configurationUploadLinkButton').addEventListener('click', function () {
        const configurationUploadLinkInputBox = document.getElementById('configurationUploadLinkInputBox').value;
        if (configurationUploadLinkInputBox) {
            if (thesis) {
                uploadLink(configurationUploadLinkInputBox, thesis);  // Pass thesis to the uploadLink function
            } else {
                alert('Δεν είναι διαθέσιμες οι πληροφορίες γι αυτή τη διπλωματική.');
            }
        } else {
            alert('Παρακαλώ εισάγετε ένα σύνδεσμο προς ανάρτηση.');
        }
    });

    // Nimertis upload button event listener
    document.getElementById('configurationUploadNimertisButton').addEventListener('click', function () {
        const configurationUploadNimertisInputBox = document.getElementById('configurationUploadNimertisInputBox').value;
        if (configurationUploadNimertisInputBox) {
            if (thesis) {
                uploadNimertisLink(configurationUploadNimertisInputBox, thesis);
            } else {
                alert('Δεν είναι διαθέσιμες οι πληροφορίες γι αυτή τη διπλωματική.');
            }
        } else {
            alert('Παρακαλώ εισάγετε έναν σύνδεσμο προς το αποθετήριο Νημερτή.');
        }
    });

    // Examination Data upload button event listener
    document.getElementById('configurationExamDataSubmitButton').addEventListener('click', function () {
        const examDate = document.getElementById('configurationExamDateInputBox').value;
        const typeOfExam = document.getElementById('configurationTypeOfExamInputBox').value;
        const examLocation = document.getElementById('configurationExamLocationInputBox').value;
        let typeOfExamProper = null;
        if (!examDate || !typeOfExam || !examLocation) {
            alert('Παρακαλώ συμπληρώστε όλα τα πεδία.');
        } else {
            if (typeOfExam === "Δια ζώσης") {
                typeOfExamProper = "in-person";
            }
            else if (typeOfExam === "Εξ αποστάσεως") {
                typeOfExamProper = "online";
            }
            uploadExaminationDetails({ examDate, typeOfExamProper, examLocation, thesis });

        }
    });
}
//------------------------------ Functions to upload Attachments-Nimertis Link-Examination Details via APIs ------------------------------
//--------------- File Upload
function uploadFile(fileInput, thesis) {
    const formData = new FormData();
    formData.append('attachment', fileInput);
    formData.append('type', 'file');
    formData.append('thesis_id', thesis.thesis_id);

    fetch('/api/upload_attachment', {
        method: 'POST',
        body: formData,         //Send as formData since its a file
        credentials: 'include', // Ensure the cookie is sent with the request
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Το αρχείο αναρτήθηκε. Αν υπήρχε προηγούμενο αρχείο έχει αντικατασταθεί.');
                fetchAndDisplayAttachments(thesis); // Refresh the displayed file on every upload
            } else {
                alert('Παρουσιάστηκε πρόβλημα στην ανάρτηση: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Παρουσιάστηκε πρόβλημα στην ανάρτηση:', error);
            alert('Error uploading file.');
        });
}
//--------------- Link upload
function uploadLink(link, thesis) {
    const formData = new FormData();
    formData.append('type', 'link'); // Specify that this is a link upload
    formData.append('link', link);
    formData.append('thesis_id', thesis.thesis_id);

    fetch('/api/upload_attachment', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Ensure the cookie is sent with the request
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addLinkToList(link);
                document.getElementById('configurationUploadLinkInputBox').value = '';
                fetchAndDisplayAttachments(thesis);
            } else {
                alert('Παρουσιάστηκε πρόβλημα στην ανάρτηση: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error uploading link:', error);
            alert('Παρουσιάστηκε πρόβλημα στην ανάρτηση:');
        });
}
//--------------- Nimertis Link upload
function uploadNimertisLink(link, thesis) {
    if (!link.startsWith('https://nemertes.library.upatras.gr/')) {
        alert('Λανθασμένη μορφή συνδέσμου. Ένας σύνδεσμος προς το αποθετήριο Νημερτή πρέπει να ξεκινά με: https://nemertes.library.upatras.gr/');
        return;
    }

    const data = {
        nimertis_link: link,
        thesis_id: thesis.thesis_id
    };

    fetch('/api/update_nimertis_link', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',  // Send as JSON
        },
        body: JSON.stringify(data),
        credentials: 'include',
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                thesis.nimertis_link = link;
                fetchAndDisplayNimertisLink(thesis); // Refresh the displayed Nimertis link
            } else {
                alert('Παρουσιάστηκε πρόβλημα στην ανάρτηση: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error uploading Nimertis link:', error);
            alert('Παρουσιάστηκε πρόβλημα στην ανάρτηση.');
        });
}
//--------------- Examination Details upload
function uploadExaminationDetails({ examDate, typeOfExamProper, examLocation, thesis }) {
    const data = {
        thesis_id: thesis.thesis_id,
        exam_date: examDate,
        type_of_exam: typeOfExamProper,
        location: examLocation,
    };


    fetch('/api/examinations_upload', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include', // Ensure cookies are sent
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                fetchAndDisplayExaminations(thesis); // Refresh exam details display
                //document.getElementById('examDateSection').style.display = 'block';
            } else {
                alert('Παρουσιάστηκε πρόβλημα στην ανάρτηση: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error saving exam details:', error);
            alert('Παρουσιάστηκε πρόβλημα στην ανάρτηση.');
        });
}
//--------------- Helper function to add a link to the list of uploaded links ---------------
function addLinkToList(link) {
    const linkList = document.getElementById('configurationUploadedLinksList');
    const newLinkElement = document.createElement('div');
    newLinkElement.classList.add('link-item');

    const linkText = document.createElement('span');
    linkText.textContent = link;

    newLinkElement.appendChild(linkText);
    linkList.appendChild(newLinkElement);
}


//------------------------------ Helper functions to Fetch and Display Attachments-Nimertis link-Examination Details ------------------------------
//--------------- Fetch and Display File&Links
function fetchAndDisplayAttachments(thesis) {
    const token = localStorage.getItem('token');

    fetch(`/api/fetch_attachments?thesis_id=${thesis.thesis_id}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        },
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const configurationFileInfo = document.getElementById('configurationFileInfo');
                const configurationUploadedLinksList = document.getElementById('configurationUploadedLinksList');

                configurationFileInfo.innerHTML = 'Δεν έχει αναρτηθεί αρχείο';
                configurationUploadedLinksList.innerHTML = '';

                const file = data.attachments.find(attachment => attachment.type === 'file');
                const links = data.attachments.filter(attachment => attachment.type === 'link');

                if (file) {
                    const link = document.createElement('a');
                    link.href = file.file_path.replace('./', '/');
                    link.textContent = file.file_path.split('/').pop();
                    link.download = link.textContent; //Press to download
                    configurationFileInfo.innerHTML = '';
                    configurationFileInfo.appendChild(link);
                } else {
                    configurationFileInfo.innerHTML = 'Δεν έχει αναρτηθεί αρχείο';
                }

                if (links.length > 0) {
                    // Remove the "No links uploaded yet" message
                    const noLinksMessage = document.querySelector('#configurationUploadedLinksList li');
                    if (noLinksMessage) {
                        noLinksMessage.remove();
                    }
                    links.forEach(linkObj => {
                        const li = document.createElement('li');
                        const link = document.createElement('a');
                        link.href = linkObj.link_path;
                        link.textContent = linkObj.link_path;
                        link.target = '_blank'; // Press t open in a new tab
                        li.appendChild(link);
                        configurationUploadedLinksList.appendChild(li);
                    });
                } else {
                    configurationUploadedLinksList.innerHTML = '<li class="no-bullet">Δεν έχουν αναρτηθεί σύνδεσμοι</li>';
                }
            } else {
                alert('Παρουσιάστηκε πρόβλημα στην ανεύρευση των αρχείων: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching files:', error);
            alert('Παρουσιάστηκε πρόβλημα στην ανεύρευση των αρχείων.');
        });
}
//--------------- Fetch and Display Nimertis Links
function fetchAndDisplayNimertisLink(thesis) {

    const nimertisLink = thesis.nimertis_link;
    const nimertisInfo = document.getElementById('configurationNimertisLinkInfo');

    if (nimertisLink) {
        const linkElement = document.createElement('a');
        linkElement.href = nimertisLink;
        linkElement.textContent = `${nimertisLink}`;
        linkElement.target = '_blank';
        nimertisInfo.innerHTML = '';
        nimertisInfo.appendChild(linkElement);
    } else {
        nimertisInfo.textContent = 'Δεν έχει αναρτηθεί σύνδεσμος';
    }
}
//--------------- Fetch and Display Examination Date-Type-Location-Report
function fetchAndDisplayExaminations(thesis) {
    const token = localStorage.getItem('token');

    fetch(`/api/fetch_examinations/${thesis.thesis_id}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Translate type of exam
                const examData = data.examination;
                if (examData.type_of_exam === "in-person") {
                    examData.type_of_exam = "Δια ζώσης";
                } else if (examData.type_of_exam === "online") {
                    examData.type_of_exam = "Εξ αποστάσως";
                }
                // Format the date properly
                const [year, month, day] = examData.date.split("-");
                examData.date = `${day}-${month}-${year}`;

                document.getElementById('configurationExamDateInfo').innerHTML = `${examData.date || 'Δεν έχει οριστεί.'}`;
                document.getElementById('configurationTypeOfExamInfo').innerHTML = `${examData.type_of_exam || 'Δεν έχει οριστεί.'}`;
                document.getElementById('configurationExamLocationInfo').innerHTML = `${examData.location || 'Δεν έχει οριστεί.'}`;


            } else {
                alert('Παρουσιάστηκε πρόβλημα στην δημιουργία του πρακτικού εξέτασης: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching exam details:', error);
            alert('Παρουσιάστηκε πρόβλημα στην δημιουργία του πρακτικού εξέτασης:');
        });
}


//------------------------------ Functions for the Completed Files Section ------------------------------
//------------------------------ Completed Files Section Event Listeners  ------------------------------
//--------------- Examination Report button Event Listener  ---------------
document.getElementById('configurationCompletedFilesExamReportButton').addEventListener('click', function () {
    loadExamReportData();
    const examReportSection = document.getElementById('examReportHTMLSection');
    // Toggle visibility of the section
    if (examReportSection.style.display === 'none' || examReportSection.style.display === '') {
        examReportSection.style.display = 'block';
    } else {
        examReportSection.style.display = 'none';
    }
});
//--------------- Helper function to get the day-name of a date ---------------
function getDayName(dateStr, locale) {
    var date = new Date(dateStr);
    return date.toLocaleDateString(locale, { weekday: 'long' });
}
//------------------------------ Load Exam Report Data Function ------------------------------
function loadExamReportData() {
    const token = localStorage.getItem('token'); // Get the JWT token stored in local storage

    fetch('/api/examReportDetails_fetch', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch Exam Report data');
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.examReport.length > 0) {
                const reportData = data.examReport[0];

                const finalGrade = calculateFinalGrade(reportData.supervisor_grade, reportData.committee_member1_grade, reportData.committee_member2_grade);
                updateDataField('final_grade', finalGrade);

                const supervisorNameSurname = nameSurname(reportData.professor_name, reportData.professor_surname);
                const committeeMember1NameSurname = nameSurname(reportData.committee_member1_name, reportData.committee_member1_surname);
                const committeeMember2NameSurname = nameSurname(reportData.committee_member2_name, reportData.committee_member2_surname);
                const supervisorSurnameName = nameSurname(reportData.professor_surname, reportData.professor_name);
                const committeeMember1SurnameName = nameSurname(reportData.committee_member1_surname, reportData.committee_member1_name);
                const committeeMember2SurnameName = nameSurname(reportData.committee_member2_surname, reportData.committee_member2_name);

                sortedCommitteeNames = sortThreeStrings(supervisorSurnameName, committeeMember1SurnameName, committeeMember2SurnameName);
                examReportCommitteAlphabetical1 = sortedCommitteeNames[0];
                examReportCommitteAlphabetical2 = sortedCommitteeNames[1];
                examReportCommitteAlphabetical3 = sortedCommitteeNames[2];

                const examReportDoneInPerson = document.getElementsByClassName('examReportDoneInPerson')[0];
                const examReportDoneOnline = document.getElementsByClassName('examReportDoneOnline')[0];

                if (reportData.type_of_exam === 'in-person') {
                    examReportDoneInPerson.style.display = 'inline';
                    examReportDoneOnline.style.display = 'none';
                } else if (reportData.type_of_exam === 'online') {
                    examReportDoneInPerson.style.display = 'none';
                    examReportDoneOnline.style.display = 'inline';
                }
                dayName = getDayName(reportData.exam_date, "el-GR");

                // Update the datafields in the Exam Report
                updateDataField('examReportLocation', reportData.exam_location);
                updateDataField('examReportDate', reportData.exam_date);
                updateDataField('examReportDateName', dayName);
                updateDataField('examReportSupervisorNameSurname', supervisorSurnameName);
                updateDataField('examReportCommitteeMember1NameSurname', committeeMember1SurnameName);
                updateDataField('examReportCommitteeMember2NameSurname', committeeMember2SurnameName);
                updateDataField('examReportAssemblyNo', reportData.gen_assembly_session);
                updateDataField('examReportTitle', reportData.thesis_title);
                updateDataField('examReportCommitteAlphabetical1', examReportCommitteAlphabetical1);
                updateDataField('examReportCommitteAlphabetical2', examReportCommitteAlphabetical2);
                updateDataField('examReportCommitteAlphabetical3', examReportCommitteAlphabetical3);
                updateDataField('examReportFinalGrade', finalGrade);
                updateDataField('examReportSupervisorGrade', reportData.supervisor_grade);
                updateDataField('examReportCommittee1Grade', reportData.committee_member1_grade);
                updateDataField('examReportCommittee2Grade', reportData.committee_member2_grade);




            } else if (data.success && data.examReport.length == 0) {
                console.error('No Report Data found for this student');
            }
        })
        .catch(error => {
            console.error('Error loading reportData data:', error);
        });

}


//------------------------------ Function to Load Logs Data for Status Change Section ------------------------------
function loadLogsData() {
    const token = localStorage.getItem('token'); // Get the JWT token stored in local storage

    fetch('/api/logs_fetch', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch Logs data');
            }
            return response.json();
        })
        .then(data => {
            const statusChangeContainer = document.getElementById('statusChangeContainer');
            statusChangeContainer.innerHTML = '';

            if (data.success && data.log.length > 0) {
                let logData = data.log;

                const statusTranslations = {
                    'unassigned': 'Μη Ανατεθειμένη',
                    'assigned': 'Ανατεθειμένη',
                    'active': 'Ενεργή',
                    'to-be-reviewed': 'Προς Εξέταση',
                    'completed': 'Ολοκληρωμένη',
                    'cancelled': 'Ακυρωμένη'
                };

                logData = logData.map(log => {
                    log.old_state = statusTranslations[log.old_state];
                    log.new_state = statusTranslations[log.new_state];

                    return log;
                });

                logData.forEach((log) => {
                    const logEntry = document.createElement('div');
                    logEntry.classList.add('logcard', 'mb-3');

                    logEntry.innerHTML = `
                        <div class="logcard-body">
                            <h5 class="card-title">${log.old_state} → ${log.new_state}</h5>
                            <p class="card-text">${new Date(log.date_of_change).toLocaleDateString('el-GR')}</p>
                        </div>
                    `;

                    statusChangeContainer.appendChild(logEntry);
                });
            } else if (data.success && data.log.length === 0) {
                const statusChangeContainer = document.getElementById('statusChangeContainer');
                statusChangeContainer.innerHTML = '<p>Δεν υπάρχουν αλλαγές κατάστασης.</p>';
            }
        })
        .catch(error => {
            console.error('Error loading reportData data:', error);
        });

}


//------------------------------ Show/Hide Management Sections based on section clicked on ------------------------------
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
//--------------- Helper function to show a specific section and hide the others ---------------
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



//--------------------------------------------- PROFILE PAGE ---------------------------------------------
//------------------------------ Load Profile Function ------------------------------
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

            // Update student details in ExamReport
            const studentFullname = nameSurname(student.name, student.surname);
            updateDataField('examReportNameSurname', studentFullname);

        })
        .catch(error => {
            console.error('Error loading student data:', error);
        });
}
//------------------------------ Event Listener for clicks on the edit buttons in Student Profile ------------------------------
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



//--------------------------------------------- RUN FUNCTIONS AFTER DOM ---------------------------------------------
//------------------------------ Load the student profile after DOM is loaded ------------------------------
document.addEventListener('DOMContentLoaded', () => {
    loadStudentProfile();
    loadStudentThesis();
    loadSectionsBasedOnStatus();
    setupThesisManagement();
    loadExamReportData();
    loadLogsData();
});
//------------------------------ Show the dashboard as main page after DOM is loaded ------------------------------
window.addEventListener('DOMContentLoaded', () => {
    const defaultTab = document.querySelector('a[href="#dashboard"]');
    if (defaultTab) {
        defaultTab.click();
    }
});

//If exam dates exists and status completed , end_date=exam date. Also create end date as null.
//fix buttons for inv
//API Naming scheme.

