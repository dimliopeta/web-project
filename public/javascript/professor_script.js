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

        resetInfoSection();

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


//-----------Load the Dashboard Tab as the Homepage-------------
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




//-----------Function for Reversing the Assignment of a Thesis to a Student----------------- 
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
                const infoSection = document.getElementById('info-compartment');
                if (infoSection) {
                    resetInfoSection();
                }

                loadTheses();
                loadAssignedTheses(); // Επαναφόρτωση της λίστας
                loadUnassignedTheses();
            } else {
                console.error('Σφάλμα:', data.message);
            }
        })
        .catch(err => console.error('Σφάλμα κατά την αναίρεση ανάθεσης:', err));
}




//-----------Function for Loading Themes that haven't been assigned to a student----------------- 
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





//-------------Frontend for Editing a Thesis Theme on the Themes Tab----------------
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
    editTitle.value = thesis.title;
    editSummary.value = thesis.summary;
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

function resetInfoSection() {
    const infoSection = document.getElementById('info-compartment');
    const thesesCompartment = document.getElementById('theses-compartment');

    if (infoSection) {
        infoSection.classList.add('d-none'); // Απόκρυψη του info-compartment
        infoSection.innerHTML = ''; // Καθαρισμός περιεχομένου
    }

    if (thesesCompartment) {
        thesesCompartment.classList.remove('col-md-6'); // Αφαίρεση της μειωμένης διάταξης
        thesesCompartment.classList.add('col-lg-8', 'mx-auto'); // Επαναφορά της αρχικής διάταξης
    }
}



//----------------Frontend For Showing Info of a Thesis based on its status --------------
function showInfoSection(thesis) {
    const infoSection = document.getElementById('info-compartment');
    const thesesCompartment = document.getElementById('theses-compartment');
    const examReportSection = document.getElementById('examReportHTMLSection'); // Προσθέτουμε τη μεταβλητή για το πρακτικό

    // Κρύβουμε το προηγούμενο πρακτικό (αν υπάρχει)
    if (examReportSection) {
        examReportSection.style.display = 'none';
    }

    // Ενημέρωση διαστάσεων του info-compartment
    thesesCompartment.classList.remove('col-lg-8', 'mx-auto');
    thesesCompartment.classList.add('col-md-6');

    infoSection.classList.remove('d-none');
    infoSection.innerHTML = ''; // Καθαρισμός προηγούμενου περιεχομένου

    // Τίτλος Διπλωματικής
    const titleSection = document.createElement('section');
    titleSection.classList.add('text-center');
    titleSection.innerHTML = `
        <h3 class="text-primary">${thesis.title || 'Χωρίς τίτλο'}</h3>
        <hr>
    `;
    infoSection.appendChild(titleSection);

    // Βασικές Πληροφορίες
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

    const basicInfoSection = document.createElement('section');
    basicInfoSection.innerHTML = `
        <h4 class="text-center mb-3">Βασικές Πληροφορίες</h4>
        <p>Περιγραφή: ${thesis.summary || 'Χωρίς περιγραφή'}</p>
        <p>Φοιτητής: ${thesis.student_name || 'Χωρίς φοιτητή'} (ΑΜ: ${thesis.student_number || 'Χωρίς ΑΜ'})</p>
        <p>Email: ${thesis.student_email || 'Χωρίς email'}</p>
        <p>Κατάσταση: ${status || 'Άγνωστη'}</p>
    `;
    if (thesis.final_grade !== null) {
        const finalGradeDisplay = document.createElement('p');
        finalGradeDisplay.classList.add('text-success', 'fw-bold');
        finalGradeDisplay.innerHTML = `Τελικός Βαθμός: ${thesis.final_grade}
        <hr>`;
        basicInfoSection.appendChild(finalGradeDisplay);

    }
    infoSection.appendChild(basicInfoSection);
    infoSection.appendChild(Object.assign(document.createElement('hr'), { classList: 'mb-3 mt-2' }));

    // Δημιουργία του Status Change Section
    const statusChangeSection = document.createElement('section');
    statusChangeSection.id = 'statusChangeSection';
    statusChangeSection.innerHTML = '<h4 class="text-center mb-3">Αλλαγές Καταστάσεων</h4>';
    const statusChangeContainer = document.createElement('div');
    statusChangeContainer.id = 'statusChangeContainer';
    statusChangeSection.appendChild(statusChangeContainer);
    infoSection.appendChild(statusChangeSection);
    infoSection.appendChild(Object.assign(document.createElement('hr'), { classList: 'mb-3 mt-2' }));

    // Κλήση της loadLogs για να γεμίσει το statusChangeSection
    loadLogs(thesis.thesis_id);


    // Τριμελής Επιτροπή (εμφανίζεται μόνο για `active` και `to-be-reviewed`)
    if (thesis.status === 'active' || thesis.status === 'to-be-reviewed') {
        const committeeSection = document.createElement('section');
        committeeSection.innerHTML = `
            <h4 class="text-center">Μέλη Τριμελούς Επιτροπής</h4>
            <p>Επιβλέπων: ${thesis.professor_name || 'Χωρίς επιβλέποντα'}</p>
            <p>Μέλος 1: ${thesis.committee_member1_name || 'Χωρίς μέλος'}</p>
            <p>Μέλος 2: ${thesis.committee_member2_name || 'Χωρίς μέλος'}</p>
            <hr>
        `;
        infoSection.appendChild(committeeSection);
    }

    const statusSection = document.createElement('section');
    statusSection.innerHTML = `<h4 class="text-center">Διαχείριση Διπλωματικής</h4>`;
    // Κατάσταση και Δράσεις

    switch (thesis.status) {
        case 'assigned':
            addAssignedSection(thesis, statusSection);
            break;

        case "active":
            addActiveSection(thesis, statusSection);
            break;

        case "to-be-reviewed":
            addToBeReviewedSection(thesis, statusSection);
            break;
        case "cancelled":
            addCanceledSection(thesis, statusSection);
            break;
        case "completed":
            addCompletedSection(thesis, statusSection);
            break;
    }

    infoSection.appendChild(statusSection);

    // Footer με Ημερομηνίες
    const footer = document.createElement('section');
    footer.classList.add('text-center');
    footer.innerHTML = `
        <h4>Ημερομηνίες</h4>
        <p>Ημερομηνία Έναρξης: ${thesis.start_date || ''}</p>
        <p>Ημερομηνία Περάτωσης: ${thesis.exam_date || ''}</p>
        
    `;
    infoSection.appendChild(footer);
}


//--------------Function for Presenting a Canceled Thesis Info-------------
function addCanceledSection(thesis, container) {
    const cancelledSection = document.createElement('section');

    const cancelledTitle = document.createElement('h4');
    cancelledTitle.textContent = 'Ακυρωμένη Διπλωματική';
    cancelledSection.appendChild(cancelledTitle);

    const detailsParagraph = document.createElement('p');
    detailsParagraph.textContent = 'Φόρτωση λεπτομερειών...';
    cancelledSection.appendChild(detailsParagraph);

    fetch(`/api/cancelled-thesis`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            thesis_id: thesis.thesis_id
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const details = data.details;

                detailsParagraph.innerHTML = `
                                <strong>Αριθμός Τμήματος:</strong> ${details.gen_assembly_session || 'Δεν υπάρχει διαθέσιμη πληροφορία'}<br>
                                <strong>Ημερομηνία Απόφασης:</strong> ${details.date_of_change || 'Δεν υπάρχει διαθέσιμη πληροφορία'}<br>
                                <strong>Λόγος Ακύρωσης:</strong> ${details.cancellation_reason || 'Δεν υπάρχει διαθέσιμη πληροφορία'}
                            `;
            } else {
                detailsParagraph.innerHTML = '<p class="text-danger">Αδυναμία φόρτωσης λεπτομερειών.</p>';
            }
        })
        .catch(error => {
            console.error('Σφάλμα κατά την ανάκτηση των λεπτομερειών ακύρωσης:', error);
            detailsParagraph.innerHTML = '<p class="text-danger">Σφάλμα κατά τη φόρτωση λεπτομερειών.</p>';
        });

    const cancelledHr = document.createElement('hr');
    cancelledSection.appendChild(cancelledHr);

    container.appendChild(cancelledSection);
}

//---------------Function to create Buttons more easily------------ 
function createButton(id, text, classes, onClick = null) {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = text;
    button.classList.add(...classes);
    if (onClick) {
        button.onclick = onClick;
    }
    return button;
}

//------------Frontend for Managing an Assigned Thesis----------
function addAssignedSection(thesis, container) {
    if (thesis.role === "Επιβλέπων") {
        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('d-flex', 'gap-2', 'mt-3');

        const showInvitationsButton = createButton('show-inv', 'Εμφάνιση Προσκλήσεων', ['btn', 'btn-info', 'mt-2'], () => {
            const existingList = container.querySelector('.invitations-list');

            if (existingList) {
                // Αν η λίστα υπάρχει, την αφαιρούμε και αλλάζουμε το κουμπί στην αρχική του κατάσταση
                existingList.remove();
                showInvitationsButton.textContent = 'Εμφάνιση Προσκλήσεων';
                showInvitationsButton.classList.remove('btn-primary');
                showInvitationsButton.classList.add('btn-info');
            } else {
                // Αν η λίστα δεν υπάρχει, την εμφανίζουμε και αλλάζουμε το κουμπί για "Απόκρυψη"
                //console.log('Container:', container);//DELETOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOooooooooooooooooooooooooooooooooooooooooooooooo
                showThesisInvitations(thesis.thesis_id, container);
                showInvitationsButton.textContent = 'Απόκρυψη Προσκλήσεων';
                showInvitationsButton.classList.remove('btn-info');
                showInvitationsButton.classList.add('btn-primary');
            }
        });
        buttonsContainer.appendChild(showInvitationsButton);

        const unassignThButton = createButton('unassign-thesis-button', 'Αναίρεση Ανάθεσης', ['btn', 'btn-danger', 'mt-2'], () => unassignThesis(thesis.thesis_id));

        buttonsContainer.appendChild(unassignThButton);

        const formContainer = document.createElement('div'); // Container για τη φόρμα
        formContainer.classList.add('mt-3'); // Τοποθέτηση κάτω από τα κουμπιά

        const startButtonContainer = document.createElement('div'); // Ξεχωριστό container για το Start Button
        startButtonContainer.classList.add('d-flex', 'align-items-center', 'mt-2');
        buttonsContainer.appendChild(startButtonContainer);

        checkCommitteeStatus(thesis.thesis_id).then(isFull => {
            if (isFull) {
                addStartThesisButton(thesis.thesis_id, formContainer);
            }
        });
        container.appendChild(buttonsContainer);
        container.appendChild(formContainer);

        const hr = document.createElement('hr');
        hr.classList.add('my-3');
        container.appendChild(hr);
    }
    else {
        const committeeText = document.createElement('p');
        committeeText.classList.add('text-center');
        committeeText.innerText = "Δεν μπορείτε ακόμα να διαχειριστείτε αυτή την διπλωματική!";
        container.append(committeeText);
    }
}

function addCompletedSection(thesis, container) {
    const complButtonContainer = document.createElement('div');
    complButtonContainer.classList.add('button-container', 'd-flex', 'gap-2', 'mt-4'); // Χρήση Bootstrap classes για στοίχιση

    const praktikoButton = createButton('configurationCompletedFilesExamReportButton', 'Πρακτικό Εξέτασης', ['btn', 'btn-outline-primary', 'btn-sm', 'float-start'], () => {
        const examReportSection = document.getElementById('examReportHTMLSection');
        examReportSection.style.display = 'none';

        loadExamReportData(thesis.thesis_id);

        examReportSection.style.display = 'block';
    });

    const nimertisLink = thesis.nimertis_link;
    const nimertisButton = createButton('configurationCompletedFilesNimertisLink', 'Σύνδεσμος αποθετηρίου "Νημερτής', ['btn', 'btn-outline-primary', 'btn-sm', 'float-start'], () => {
        if (nimertisLink) {
            window.open(nimertisLink, '_blank');
        } else {
            alert('Δεν έχει αναρτηθεί σύνδεσμος');
        }
    });
    complButtonContainer.appendChild(praktikoButton);
    complButtonContainer.appendChild(nimertisButton);
    container.appendChild(complButtonContainer);
    const hr = document.createElement('hr');
    hr.classList.add('my-3');
    container.appendChild(hr);

}

function loadExamReportData(thesisId) {
    const token = localStorage.getItem('token');

    fetch(`/api/examReportDetails_fetch/?thesisId=${thesisId}`, {
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

                const finalGradeSupervisor = (reportData.supervisor_grade1 * 0.6 + reportData.supervisor_grade2 * 0.15 + reportData.supervisor_grade3 * 0.15 + reportData.supervisor_grade4 * 0.1);
                const finalGradeCommittee1 = (reportData.committee_member1_grade1 * 0.6 + reportData.committee_member1_grade2 * 0.15 + reportData.committee_member1_grade3 * 0.15 + reportData.committee_member1_grade4 * 0.1);
                const finalGradeCommittee2 = (reportData.committee_member2_grade1 * 0.6 + reportData.committee_member2_grade2 * 0.15 + reportData.committee_member2_grade3 * 0.15 + reportData.committee_member2_grade4 * 0.1);
                const final_grade = reportData.final_grade;

                updateDataField('final_grade', final_grade); // Grades calculated and passed to the grades section here
                updateDataField('supervisor_finalgrade', finalGradeSupervisor);
                updateDataField('committee_member1_finalgrade', finalGradeCommittee1);
                updateDataField('committee_member2_finalgrade', finalGradeCommittee2);

                const examReportNameSurname = nameSurname(reportData.student_surname, reportData.student_name);
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
                updateDataField('examReportNameSurname', examReportNameSurname)
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
                updateDataField('examReportFinalGrade', final_grade);
                updateDataField('examReportSupervisorGrade', finalGradeSupervisor);
                updateDataField('examReportCommitteeMember1Grade', finalGradeCommittee1);
                updateDataField('examReportCommitteeMember2Grade', finalGradeCommittee2);




            } else if (data.success && data.examReport.length == 0) {
                console.error('No Report Data found');
            }
        })
        .catch(error => {
            console.error('Error loading reportData data:', error);
        });

}

function updateDataField(dataField, value, errorMessage = 'Error - no data') {
    const elements = document.querySelectorAll(`[data-field="${dataField}"]`);
    elements.forEach(element => {
        // Ensure valid strings (e.g., '0 ημέρες') are not replaced by errorMessage
        element.textContent = (value !== undefined && value !== null && value !== '') ? value : errorMessage;
    });
}

function nameSurname(name, surname) {
    return name + ' ' + surname;
}

function sortThreeStrings(input1, input2, input3) {
    const inputs = [input1, input2, input3];
    inputs.sort();
    return inputs;
}

function getDayName(dateStr, locale) {
    var date = new Date(dateStr);
    return date.toLocaleDateString(locale, { weekday: 'long' });
}


//------------Display of Invitations associated with a specific thesis ----------
function showThesisInvitations(thesis_id, container) {
    // Έλεγχος αν το container είναι έγκυρο
    if (!container) {
        console.error('Το container δεν βρέθηκε στο DOM.');
        return;
    }

    // Καθαρισμός παλαιότερης λίστας, αν υπάρχει
    const existingList = container.querySelector('.invitations-list');
    if (existingList) {
        // Αν υπάρχει, την αφαιρούμε (toggle behavior)
        existingList.remove();
        //console.log('Η λίστα προσκλήσεων αφαιρέθηκε.');//DELETOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOooooooooooooooooooooooooooooooooooooooooooooooo
        return;
    }

    // Δημιουργία λίστας
    const invitationsList = document.createElement('div');
    invitationsList.classList.add('invitations-list', 'mt-3');

    // Αν το invitations είναι κενό ή undefined, χρησιμοποιούμε προεπιλεγμένες τιμές
    const defaultInvitations = invitations && invitations.length > 0 ? invitations : [
        {
            professor_name: 'Προεπιλεγμένος Καθηγητής 1',
            status: 'Αποδεκτή',
            invitation_date: '2025-01-01',
            response_date: '2025-01-02'
        },
        {
            professor_name: 'Προεπιλεγμένος Καθηγητής 2',
            status: 'Απορρίφθηκε',
            invitation_date: '2025-01-03',
            response_date: '2025-01-04'
        }
    ];

    fetch('/api/invitations-for-thesis', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ thesis_id })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.invitations) {
                invitationsList.innerHTML = data.invitations.map(invitation => `
                    <div class="card mb-2">
                        <div class="card-body">
                            <p><strong>Καθηγητής:</strong> ${invitation.professor_name} ${invitation.professor_surname}</p>
                            <p><strong>Κατάσταση:</strong> ${invitation.invitation_status}</p>
                            <p><strong>Ημερομηνία Αποστολής:</strong> ${invitation.invitation_date}</p>
                            <p><strong>Ημερομηνία Απάντησης:</strong> ${invitation.response_date || 'Καμία απάντηση'}</p>
                        </div>
                    </div>
                `).join('');
            } else {
                invitationsList.innerHTML = '<p class="text-muted">Δεν βρέθηκαν προσκλήσεις.</p>';
            }
        })
        .catch(error => {
            console.error('Σφάλμα κατά την κλήση του API:', error);
            invitationsList.innerHTML = '<p class="text-danger">Αποτυχία φόρτωσης προσκλήσεων.</p>';
        });

    container.appendChild(invitationsList);

}


//----------Checks if Committee is Full, if so, the Start Button Appears-------
function checkCommitteeStatus(thesisId) {
    return fetch('/api/committee-status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ thesis_id: thesisId })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                return data.isFull; // Επιστρέφουμε true αν η επιτροπή είναι πλήρης
            } else {
                console.error('Σφάλμα:', data.message);
                return false; // Αν υπάρξει σφάλμα, θεωρούμε πως δεν είναι πλήρης
            }
        })
        .catch(err => {
            console.error('Σφάλμα κατά την επικοινωνία με το API:', err);
            return false; // Αν υπάρξει σφάλμα δικτύου, θεωρούμε πως δεν είναι πλήρης
        });
}



//--------Function that Manages the Display of the Start Thesis Button ----------
function addStartThesisButton(thesisId, container) {
    const startThesisButton = createButton('start-thesis-button', 'Εκκίνηση Διπλωματικής', ['btn', 'btn-success', 'mt-2'], () => {
        // Αφαίρεση του κουμπιού και εμφάνιση των inputs
        startThesisButton.remove();

        const startThesisForm = document.createElement('div');
        startThesisForm.classList.add('mt-3');

        const startNumberInput = document.createElement('input');
        startNumberInput.type = 'number';
        startNumberInput.id = 'start-number';
        startNumberInput.classList.add('form-control', 'mb-2');
        startNumberInput.placeholder = 'Αριθμός Γενικής Συνέλευσης';
        startThesisForm.appendChild(startNumberInput);

        const startDateInput = document.createElement('input');
        startDateInput.type = 'date';
        startDateInput.id = 'start-date';
        startDateInput.classList.add('form-control', 'mb-2');
        startDateInput.placeholder = 'Ημερομηνία Γενικής Συνέλευσης';
        startThesisForm.appendChild(startDateInput);

        const confirmStartButton = createButton('confirm-start-button', 'Επιβεβαίωση Εκκίνησης', ['btn', 'btn-primary'], () => {
            const startNumber = startNumberInput.value;
            const startDate = startDateInput.value;

            if (!startNumber || !startDate) {
                alert('Παρακαλώ συμπληρώστε όλα τα πεδία.');
                return;
            }

            // Κλήση στο API για την εκκίνηση της διπλωματικής
            fetch('/api/start-thesis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ thesisId, startNumber, startDate })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Η διπλωματική ξεκίνησε επιτυχώς!');
                        loadTheses();
                        resetInfoSection();
                    } else {
                        alert(`Σφάλμα: ${data.message}`);
                    }
                })
                .catch(error => {
                    console.error('Σφάλμα κατά την εκκίνηση:', error);
                    alert('Κάτι πήγε στραβά κατά την εκκίνηση!');
                });
        });

        startThesisForm.appendChild(confirmStartButton);
        container.appendChild(startThesisForm);
    });

    container.appendChild(startThesisButton);
}



//------------Frontend for Managing an Active Thesis----------
function addActiveSection(thesis, container) {
    // Τμήμα για καταχώρηση σημείωσης
    const notesSection = document.createElement('section');

    const notesTitle = document.createElement('h4');
    notesTitle.textContent = 'Σημειώσεις';
    notesSection.appendChild(notesTitle);

    const noteTextarea = document.createElement('textarea');
    noteTextarea.id = 'new-note';
    noteTextarea.classList.add('form-control', 'mb-2');
    noteTextarea.placeholder = 'Καταχωρήστε μια νέα σημείωση (μέγιστο 300 χαρακτήρες)';
    noteTextarea.maxLength = 300;
    notesSection.appendChild(noteTextarea);

    const addNoteButton = createButton('add-note', 'Καταχώρηση Σημείωσης', ['btn', 'btn-primary', 'mb-3'], () => {
        const noteContent = noteTextarea.value.trim();

        if (!noteContent) {
            alert('Παρακαλώ καταχωρήστε μια σημείωση.');
            return;
        }

        fetch('/api/add-note', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                thesis_id: thesis.thesis_id,
                content: noteContent
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Η σημείωση καταχωρήθηκε επιτυχώς!');
                    noteTextarea.value = ''; // Καθαρισμός του textarea
                    loadNotes(thesis.thesis_id); // Επαναφόρτωση σημειώσεων
                } else {
                    alert(`Σφάλμα: ${data.message}`);
                }
            })
            .catch(error => {
                console.error('Σφάλμα κατά την καταχώρηση της σημείωσης:', error);
                alert('Κάτι πήγε στραβά!');
            });

    });
    notesSection.appendChild(addNoteButton);

    const previousNotesTitle = document.createElement('h5');
    previousNotesTitle.textContent = 'Προηγούμενες Σημειώσεις';
    notesSection.appendChild(previousNotesTitle);

    const notesList = document.createElement('div');
    notesList.id = 'notes-list';
    notesList.classList.add('border', 'p-3');
    notesList.style.maxHeight = '150px';
    notesList.style.overflowY = 'auto';
    notesList.innerHTML = '';
    notesSection.appendChild(notesList);

    const notesHr = document.createElement('hr');
    notesSection.appendChild(notesHr);

    loadNotes(thesis.thesis_id);
    container.appendChild(notesSection);

    if (thesis.role === "Επιβλέπων") {
        // Τμήμα για ακύρωση διπλωματικής
        cancelThesisForm = document.createElement('div');
        cancelThesisForm.classList.add('mt-3');

        const cancelTitle = document.createElement('h4');
        cancelTitle.textContent = 'Ακύρωση Διπλωματικής';
        cancelThesisForm.appendChild(cancelTitle);

        const cancellationNumberInput = document.createElement('input');
        cancellationNumberInput.type = 'number';
        cancellationNumberInput.id = 'cancellation-number';
        cancellationNumberInput.classList.add('form-control', 'mb-2');
        cancellationNumberInput.placeholder = 'Αριθμός Γενικής Συνέλευσης';
        cancelThesisForm.appendChild(cancellationNumberInput);

        const cancellationDateInput = document.createElement('input');
        cancellationDateInput.type = 'date';
        cancellationDateInput.id = 'cancellation-year';
        cancellationDateInput.classList.add('form-control', 'mb-2');
        cancellationDateInput.placeholder = 'Ημερομηνία Γενικής Συνέλευσης';
        cancelThesisForm.appendChild(cancellationDateInput);

        const cancellationReasonTextarea = document.createElement('textarea');
        cancellationReasonTextarea.id = 'cancellation-reason';
        cancellationReasonTextarea.classList.add('form-control', 'mb-2');
        cancellationReasonTextarea.placeholder = 'Καταχωρήστε τον λόγο ακύρωσης';
        cancellationReasonTextarea.maxLength = 300;
        cancelThesisForm.appendChild(cancellationReasonTextarea);

        const cancelButton = createButton('cancel-thesis-button', 'Ακύρωση Διπλωματικής', ['btn', 'btn-danger', 'mb-3'], () => {
            const cancellationNumber = cancellationNumberInput.value;
            const cancellationDate = cancellationDateInput.value;
            const cancellationReasonText = cancellationReasonTextarea.value;


            if (!cancellationNumber || !cancellationDate || !cancellationReasonText) {
                alert('Παρακαλώ συμπληρώστε όλα τα πεδία.');
                return;
            }

            // Κλήση στο API για την εκκίνηση της διπλωματικής
            fetch('/api/cancel-thesis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ thesis_id: thesis.thesis_id, cancellationNumber, cancellationDate, cancellationReasonText })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Η διπλωματική ακυρώθηκε επιτυχώς!');
                        loadTheses();
                        resetInfoSection();
                    } else {
                        alert(`Σφάλμα: ${data.message}`);
                    }
                })
                .catch(error => {
                    console.error('Σφάλμα κατά την ακύρωση:', error);
                    alert('Κάτι πήγε στραβά κατά την ακύρωση!');
                });
        });

        cancelThesisForm.appendChild(cancelButton);

        const cancelHr = document.createElement('hr');
        cancelThesisForm.appendChild(cancelHr);

        container.appendChild(cancelThesisForm);


        // Τμήμα για αλλαγή κατάστασης
        const changeStatusSection = document.createElement('section');

        const changeStatusTitle = document.createElement('h4');
        changeStatusTitle.textContent = 'Μετατροπή σε υπό Εξέταση';
        changeStatusSection.appendChild(changeStatusTitle);

        const changeToUnderReviewButton = createButton('change-to-under-review-button', 'Αλλαγή σε Υπό Εξέταση', ['btn', 'btn-warning'], () => {
            changeToUnderReviewButton.remove();

            const existingForm = document.getElementById('change-thesis-form');
            if (existingForm) {
                existingForm.remove();
            }

            const changeThesisForm = document.createElement('div');
            changeThesisForm.id = 'change-thesis-form';
            changeThesisForm.classList.add('mt-3');

            const changeNumberInput = document.createElement('input');
            changeNumberInput.type = 'number';
            changeNumberInput.classList.add('form-control', 'mb-2');
            changeNumberInput.placeholder = 'Αριθμός Γενικής Συνέλευσης';
            changeThesisForm.appendChild(changeNumberInput);

            const changeDateInput = document.createElement('input');
            changeDateInput.type = 'date';
            changeDateInput.classList.add('form-control', 'mb-2');
            changeDateInput.placeholder = 'Ημερομηνία Γενικής Συνέλευσης';
            changeThesisForm.appendChild(changeDateInput);

            const confirmChangeButton = createButton('confirm-change-button', 'Επιβεβαίωση Μετατροπής σε Υπό Εξέταση', ['btn', 'btn-primary'], () => {
                const changeNumber = changeNumberInput.value;
                const changeDate = changeDateInput.value;

                if (!changeNumber || !changeDate) {
                    alert('Παρακαλώ συμπληρώστε όλα τα πεδία.');
                    return;
                }

                fetch('/api/thesis/to-be-reviewed', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ thesis_id: thesis.thesis_id, changeNumber, changeDate })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert('Η διπλωματική μετατράπηκε σε υπό εξέταση επιτυχώς!');
                            loadTheses();
                            resetInfoSection();
                        } else {
                            alert(`Σφάλμα: ${data.message}`);
                        }
                    })
                    .catch(error => {
                        console.error('Σφάλμα κατά την μετατροπή:', error);
                        alert('Κάτι πήγε στραβά κατά την μετατροπή σε υπό εξέταση!');
                    });
            });

            changeThesisForm.appendChild(confirmChangeButton);
            changeStatusSection.appendChild(changeThesisForm);
        });

        changeStatusSection.appendChild(changeToUnderReviewButton);

        const changeStatusHr = document.createElement('hr');
        changeStatusSection.appendChild(changeStatusHr);

        container.appendChild(changeStatusSection);

    }

}

//------------Function that displays all notes of a professor for a specific thesis as a list-----
function loadNotes(thesisId) {
    fetch('/api/get-notes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            thesis_id: thesisId,
        })
    })
        .then(response => response.json())
        .then(data => {
            const notesList = document.getElementById('notes-list');
            if (data.success) {
                if (data.notes.length === 0) {
                    notesList.innerHTML = '<p class="text-muted">Δεν υπάρχουν σημειώσεις.</p>';
                } else {
                    notesList.innerHTML = '';
                    data.notes.forEach(note => {
                        const noteItem = document.createElement('div');
                        noteItem.classList.add('note-item', 'mb-2');
                        noteItem.innerHTML = `
                            <p>${note.content}</p>
                            <small class="text-muted">Καθηγητής: ${note.professor_name} - ${note.date}</small>
                            <hr>
                        `;
                        notesList.appendChild(noteItem);
                    });
                }
            } else {
                notesList.innerHTML = '<p class="text-danger">Αποτυχία φόρτωσης σημειώσεων.</p>';
            }
        })
        .catch(error => {
            console.error('Σφάλμα κατά τη φόρτωση σημειώσεων:', error);
            notesList.innerHTML = '<p class="text-danger">Σφάλμα κατά τη φόρτωση σημειώσεων.</p>';
        });
}


//------------Frontend for Managing an To-be-reviewed Thesis----------
function addToBeReviewedSection(thesis, container) {
    // Τμήμα για λήψη πρόχειρου διπλωματικής
    const downloadSection = document.createElement('section');

    const downloadButton = createButton('download-thesis-button', 'Λήψη Πρόχειρου Φοιτητή', ['btn', 'btn-primary', 'my-3'], () => {
        const thesisId = thesis.thesis_id;  // ID της διπλωματικής

        fetch(`/api/fetch_attachments?thesis_id=${thesisId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const file = data.attachments.find(attachment => attachment.type === 'file');
                    if (data.attachments.length > 0) {
                        const downloadLink = document.createElement('a');
                        downloadLink.href = file.file_path.replace('./', '/');
                        downloadLink.textContent = file.file_path.split('/').pop();
                        downloadLink.download = link.textContent; //Press to download
                    } else {
                        alert('Δεν έχει αναρτηθεί πρόχειρο.');
                    }
                } else {
                    alert('Παρουσιάστηκε πρόβλημα στην ανεύρεση του αρχείου');
                }
            })
            .catch(error => {
                console.error('Download failed:', error);
            });
    });

    downloadSection.appendChild(downloadButton);

    const downloadHr = document.createElement('hr');
    downloadSection.appendChild(downloadHr);

    container.appendChild(downloadSection);

    // Τμήμα για δημιουργία ανακοίνωσης
    if (thesis.role === 'Επιβλέπων') {
        const announcementSection = document.createElement('section'); // Δηλώνουμε ρητά το announcementSection

        // Εδώ δημιουργούμε το κουμπί και το πρόσθετο περιεχόμενο για την ανακοίνωση
        announcementButtonController(thesis.thesis_id, announcementSection);

        let announcementContainer = document.querySelector('#announcement-container');
        if (!announcementContainer) {
            announcementContainer = document.createElement('div');
            announcementContainer.id = 'announcement-container';
            announcementContainer.classList.add('container', 'mt-4');
            document.body.appendChild(announcementContainer); // Εδώ μπορείς να προσαρμόσεις το σημείο εισαγωγής
        }

        container.appendChild(announcementSection); // Προσθέτουμε το announcementSection στο container
    }

    // Τμήμα για καταχώρηση βαθμού
    const gradeSection = document.createElement('section');

    const gradeTitle = document.createElement('h4');
    gradeTitle.textContent = 'Καταχώρηση Βαθμού';
    gradeTitle.classList.add('text-center');
    gradeSection.appendChild(gradeTitle);

    // Δημιουργία wrapper για δυναμικό περιεχόμενο
    const gradeContent = document.createElement('div');
    gradeContent.id = 'grade-content';
    gradeSection.appendChild(gradeContent);

    loadGradeSection(thesis.thesis_id, gradeContent);

    container.appendChild(gradeSection);
    container.appendChild(Object.assign(document.createElement('hr'), { classList: 'mb-3 mt-4' }));
}

function announcementButtonController(thesisId, container) {
    fetch('/api/check-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thesisId: thesisId })
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Failed to add announcement');
            }
            return response.json();
        })
        .then((data) => {

            if (!data.success || !data.data) {
                const unannouncedHeader = document.createElement('h4');
                unannouncedHeader.textContent = 'Δημιουργία Ανακοίνωσης';
                unannouncedHeader.classList.add('text-center');
                container.appendChild(unannouncedHeader);
                const unannouncedText = document.createElement('p');
                unannouncedText.textContent =
                    'Δεν έχουν καταχωρηθεί οι λεπτομέρειες της εξέτασης από τον φοιτητή. Δεν μπορείτε να δημιουργήσετε ανακοίνωση!';
                container.appendChild(unannouncedText);
                const announcementHr = document.createElement('hr');
                container.appendChild(announcementHr);
                return;
            }  
            const { announced } = data.data;

            if (!announced) {
                const announcementButton = createButton('create-announcement-button', 'Δημιουργία Ανακοίνωσης', ['btn', 'btn-warning', 'mb-3'], () => addToAnnouncements(thesisId));
                container.appendChild(announcementButton);
                const announcementHr = document.createElement('hr');
                container.appendChild(announcementHr);
            } else {
                const showAnnouncementButton = createButton('show-announcement-button', 'Προβολή Ανακοίνωσης', ['btn', 'btn-warning', 'mb-3'], () => {
                    fetchAnnouncementDetails(thesisId);
                });
                container.appendChild(showAnnouncementButton);
                const announcementHr = document.createElement('hr');
                container.appendChild(announcementHr);
            }
        });
}

function fetchAnnouncementDetails(thesisId) {
    fetch(`/api/get-announcement-details?thesisId=${thesisId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAnnouncementModal(data.data);
            } else {
                alert('Πρόβλημα στην ανάκτηση της ανακοίνωσης');
            }
        })
        .catch(error => {
            console.error('Error fetching announcement details:', error);
            alert('Κάτι πήγε στραβά κατά την ανάκτηση της ανακοίνωσης.');
        });
}

function showAnnouncementModal(announcementDetails) {
    // Δημιουργία του modal container
    const modal = document.createElement('div');
    modal.classList.add('modal', 'fade');
    modal.id = 'announcementModal';
    modal.tabIndex = -1;
    modal.setAttribute('aria-labelledby', 'announcementModalLabel');
    modal.setAttribute('aria-hidden', 'true');

    // Δημιουργία του modal dialog
    const modalDialog = document.createElement('div');
    modalDialog.classList.add('modal-dialog');

    // Δημιουργία του modal content
    const modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');

    // Header
    const modalHeader = document.createElement('div');
    modalHeader.classList.add('modal-header');

    const modalTitle = document.createElement('h5');
    modalTitle.classList.add('modal-title');
    modalTitle.id = 'announcementModalLabel';
    modalTitle.textContent = `Ανακοίνωση για την Διπλωματική: ${announcementDetails.title}`;
    modalHeader.appendChild(modalTitle);

    const closeButton = document.createElement('button');
    closeButton.classList.add('btn-close');
    closeButton.setAttribute('data-bs-dismiss', 'modal');
    closeButton.setAttribute('aria-label', 'Close');
    modalHeader.appendChild(closeButton);

    modalContent.appendChild(modalHeader);

    // Body
    const modalBody = document.createElement('div');
    modalBody.classList.add('modal-body');

    // Προσθήκη περιεχομένων ανακοίνωσης στο modal body
    modalBody.innerHTML = `
        <p><strong>Φοιτητής:</strong> ${announcementDetails.student_name} </p>
        <p class="text-muted"><strong>Τριμελής Επιτροπή:</strong></p>
                            <ul class="list-unstyled ps-3">
                                <li>${announcementDetails.professor_name}</li>
                                <li>${announcementDetails.committee_member1_name}</li>
                                <li>${announcementDetails.committee_member2_name}</li>
                            </ul>        
        <p><strong>Ημερομηνία Εξέτασης:</strong> ${announcementDetails.exam_date}</p>
        <p><strong>Τύπος Εξέτασης:</strong> ${announcementDetails.type_of_exam === 'online' ? 'Ηλεκτρονική' : announcementDetails.type_of_exam === 'in-person' ? 'Δια ζώσης' : 'Άγνωστος τύπος'}</p>
        <p><strong>Τοποθεσία Εξέτασης:</strong> ${announcementDetails.examination_location}</p>
    `;

    modalContent.appendChild(modalBody);

    // Footer
    const modalFooter = document.createElement('div');
    modalFooter.classList.add('modal-footer');

    const closeModalButton = document.createElement('button');
    closeModalButton.classList.add('btn', 'btn-secondary');
    closeModalButton.setAttribute('data-bs-dismiss', 'modal');
    closeModalButton.textContent = 'Κλείσιμο';
    modalFooter.appendChild(closeModalButton);

    modalContent.appendChild(modalFooter);

    modalDialog.appendChild(modalContent);
    modal.appendChild(modalDialog);

    document.body.appendChild(modal);

    // Εμφάνιση του modal
    const myModal = new bootstrap.Modal(modal);
    myModal.show();

    // Καθαρισμός μετά το κλείσιμο
    modal.addEventListener('hidden.bs.modal', () => {
        modal.remove();
    });
}


function addToAnnouncements(thesisId) {
    const announcementButton = document.querySelector('#create-announcement-button');

    fetch('/api/add-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thesisId: thesisId }) // Sending thesisId, not thesis.id
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Failed to add announcement');
            }
            return response.json();
        })
        .then((data) => {
            //console.log('Received data:', data); // Προσθήκη log για να δούμε τα δεδομένα//DELETOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOooooooooooooooooooooooooooooooooooooooooooooooo

            // Ελέγχουμε αν υπάρχουν τα announcementDetails
            if (data.success && data.data) {

                // Αφαίρεση του κουμπιού μετά την επιτυχή δημιουργία ανακοίνωσης
                if (announcementButton) {
                    announcementButton.remove();
                }

                showAnnouncementModal(data.data);

                // Προσθήκη του στοιχείου ανακοίνωσης στην σελίδα (π.χ. μέσα σε κάποιο container)
            } else {
                alert(data.message);
            }
        })
        .catch((error) => {
            console.error('Error creating announcement:', error);
        });
}


function loadGradeSection(thesisId, container) {
    // Δημιουργία wrapper για το περιεχόμενο βαθμολογίας
    const existingContent = document.getElementById('grade-content');
    if (existingContent && container.contains(existingContent)) {
        container.removeChild(existingContent);
    }

    const gradeContent = document.createElement('div');
    gradeContent.id = 'grade-content';

    // Αίτημα για την κατάσταση της διπλωματικής
    fetch(`/api/thesis-status/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ thesisId })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success && !data.gradingEnabled) {
                //console.log("Final grade:", data.finalGrade);//DELETOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOooooooooooooooooooooooooooooooooooooooooooooooo

                if (data.role === 'Επιβλέπων') {
                    gradeEnableButton(thesisId, gradeContent);
                } else {
                    const message = document.createElement('p');
                    message.textContent = 'Η βαθμολόγηση δεν έχει ενεργοποιηθεί από τον επιβλέποντα διδάσκοντα.';
                    message.classList.add('text-warning', 'mt-3'); // Προσθήκη κάποιου στυλ για έμφαση
                    gradeContent.appendChild(message);
                }
            } else if (data.success && data.gradingEnabled) {
                renderGradeSection(thesisId, gradeContent);
                loadGradeList(thesisId, gradeContent);
            }
            container.appendChild(gradeContent); // Προσθήκη περιεχομένου βαθμολογίας
        })
        .catch(error => {
            console.error('Σφάλμα κατά την ανάκτηση της κατάστασης:', error);
        });
}



function renderGradeSection(thesisId, container) {
    container.innerHTML = '';

    fetch(`/api/get-professor-grades/${thesisId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
        .then(response => response.json())
        .then(data => {
            const grades = data.grades || {};

            if (!grades.finalized) {

                const criteria = [
                    'Ποιότητα της Δ.Ε. και βαθμός εκπλήρωσης των στόχων της (60%)',
                    'Χρονικό διάστημα εκπόνησής της (15%)',
                    'Ποιότητα και πληρότητα του κειμένου της εργασίας και των υπολοίπων παραδοτέων της (15%)',
                    'Συνολική εικόνα της παρουσίασης (10%)'
                ];

                criteria.forEach((criterion, index) => {
                    const label = document.createElement('label');
                    label.textContent = criterion;
                    label.classList.add('form-label', 'mt-3');
                    container.appendChild(label);

                    const input = document.createElement('input');
                    input.type = 'number';
                    input.id = `grade-criterion-${index + 1}`;
                    input.classList.add('form-control');
                    input.placeholder = `Βαθμός (0-10)`;
                    const gradeKey = `grade${index + 1}`;
                    input.value = grades[gradeKey] !== undefined ? grades[gradeKey] : '';
                    container.appendChild(input);
                });

                const commentsLabel = document.createElement('label');
                commentsLabel.textContent = 'Σχόλια:';
                commentsLabel.classList.add('form-label', 'mt-3');
                container.appendChild(commentsLabel);

                const commentsTextarea = document.createElement('textarea');
                commentsTextarea.id = 'grade-comments';
                commentsTextarea.classList.add('form-control');
                commentsTextarea.rows = 4; // Προαιρετικά για το ύψος
                commentsTextarea.placeholder = 'Προσθέστε σχόλια...';
                commentsTextarea.value = (data.grades && data.grades.comments) ? data.grades.comments : '';
                container.appendChild(commentsTextarea);

                // Δημιουργία button container
                const buttonContainer = document.createElement('div');
                buttonContainer.classList.add('button-container', 'd-flex', 'gap-2', 'mt-4'); // Χρήση Bootstrap classes για στοίχιση

                const submitGradeButton = createButton(
                    'submit-grade-button',
                    grades.grade !== undefined ? 'Αλλαγή Βαθμού' : 'Καταχώρηση Βαθμού',
                    ['btn', 'btn-success'], () => handleSubmitGradeButtonClick(thesisId, container)
                );

                buttonContainer.appendChild(submitGradeButton);

                // Δημιουργία κουμπιού "Οριστική Υποβολή"
                const finalizeButton = createButton(
                    'finalize-grade-button',
                    'Οριστική Υποβολή',
                    ['btn', 'btn-danger'], () => handleFinalizeButtonClick(thesisId, container)
                );

                buttonContainer.appendChild(finalizeButton);

                container.appendChild(buttonContainer);
            } else {
                // Μήνυμα αν η βαθμολογία είναι οριστικοποιημένη
                container.innerHTML = '<p class="text-danger text-center">Οι βαθμοί έχουν ήδη υποβληθεί οριστικά και δεν μπορούν να τροποποιηθούν.</p>';
            }
        })
        .catch(error => {
            console.error('Σφάλμα κατά την ανάκτηση βαθμολογίας:', error);
        });
}

function loadGradeList(thesisId, container) {
    fetch(`/api/get-grades-list/${thesisId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
        .then(response => response.json())
        .then(data => {
            //console.log('API Response:', data);  // Ελέγχουμε τα δεδομένα που επιστρέφει το API//DELETOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOooooooooooooooooooooooooooooooooooooooooooooooo

            const gradeListSection = document.createElement('div');
            gradeListSection.classList.add('grade-list', 'mt-4');

            const gradeListTitle = document.createElement('h5');
            gradeListTitle.textContent = 'Καταχωρηθέντες Βαθμοί';
            gradeListSection.appendChild(gradeListTitle);

            const gradeListContainer = document.createElement('ul');
            gradeListContainer.classList.add('list-group');

            // Ελέγχουμε αν το 'grades' είναι πίνακας και έχει δεδομένα
            if (data.success && Array.isArray(data.grades) && data.grades.length > 0) {
                // Διατρέχουμε τον πίνακα και δημιουργούμε ένα στοιχείο για κάθε βαθμό
                data.grades.forEach(grade => {
                    const gradeItem = document.createElement('li');
                    gradeItem.classList.add('list-group-item');

                    gradeItem.innerHTML = `
                        Καθηγητής:<strong> ${grade.professor_name} ${grade.professor_surname} </strong> <br>
                        Ποιότητα της Δ.Ε. και βαθμός εκπλήρωσης των στόχων της (60%): <strong>  ${grade.grade1} </strong><br>
                        Χρονικό διάστημα εκπόνησής της (15%): <strong>  ${grade.grade2} </strong> <br>
                        Ποιότητα και πληρότητα του κειμένου της εργασίας και των υπολοίπων παραδοτέων της (15%): <strong>  ${grade.grade3} </strong> <br>
                        Συνολική εικόνα της παρουσίασης (10%): <strong>  ${grade.grade4} </strong><br>
                        Σχόλια:<strong> ${grade.comments || 'Δεν υπάρχουν σχόλια'} </strong><br>
                        Οριστικοποιημένο: <strong> ${grade.is_finalized ? 'Ναι' : 'Όχι'} </strong>
                    `;

                    gradeListContainer.appendChild(gradeItem);
                });
                gradeListSection.appendChild(gradeListContainer);
            } else {
                const noGradesMessage = document.createElement('p');
                noGradesMessage.textContent = 'Δεν υπάρχουν βαθμολογίες.';
                gradeListSection.appendChild(noGradesMessage);
            }

            container.appendChild(gradeListSection);
        })
        .catch(error => {
            console.error('Σφάλμα κατά την φόρτωση βαθμολογιών:', error);
            container.innerHTML = '<p>Προέκυψε σφάλμα κατά την φόρτωση των βαθμολογιών.</p>';
        });
}


function handleSubmitGradeButtonClick(thesisId, container) {
    const grades = [];

    // Συλλογή βαθμών από τα input πεδία
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById(`grade-criterion-${i}`);
        const value = parseFloat(input.value);

        if (isNaN(value) || value < 0 || value > 10) {
            alert(`Ο βαθμός ${i} πρέπει να είναι μεταξύ 0 και 10.`);
            return;
        }

        grades.push(value);
    }

    // Συλλογή σχολίων
    const comments = document.getElementById('grade-comments')?.value || '';

    // Αποστολή δεδομένων στο API
    fetch('/api/submit-grades', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            thesisId,
            grades,
            comments // Προσθήκη σχολίων στο αίτημα
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Η καταχώρηση βαθμών ολοκληρώθηκε επιτυχώς!');
                renderGradeSection(thesisId, container); // Επαναφόρτωση της ενότητας
                loadGradeList(thesisId, container);
            } else {
                alert(`Σφάλμα: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Σφάλμα κατά την καταχώρηση βαθμών:', error);
            alert('Κάτι πήγε στραβά!');
        });
}


function handleFinalizeButtonClick(thesisId, container) {
    const grades = [];

    // Συλλογή βαθμών από τα input πεδία
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById(`grade-criterion-${i}`);
        const value = parseFloat(input.value);

        if (isNaN(value) || value < 0 || value > 10) {
            alert(`Ο βαθμός ${i} πρέπει να είναι μεταξύ 0 και 10.`);
            return;
        }

        grades.push(value);
    }

    const comments = document.getElementById('grade-comments')?.value || '';

    // Αποστολή δεδομένων στο API για οριστική υποβολή
    fetch('/api/finalize-submitted-grades', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            thesisId,
            grades,
            comments
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Η οριστική καταχώρηση βαθμών ολοκληρώθηκε επιτυχώς!');
                renderGradeSection(thesisId, container); // Επαναφόρτωση της ενότητας
                loadGradeList(thesisId, container);

            } else {
                alert(`Σφάλμα: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Σφάλμα κατά την οριστική υποβολή βαθμών:', error);
            alert('Κάτι πήγε στραβά!');
        });
}




function gradeEnableButton(thesisId, container) {
    const gradeThesisButton = createButton('grade-thesis-button', 'Ενεργοποίηση Βαθμολόγησης', ['btn', 'btn-success', 'mt-2'], () => {
        fetch('/api/enable-grading', {
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
                    alert('Ενεργοποιήθηκε η βαθμολόγηση επιτυχώς!');
                    if (gradeThesisButton.parentNode) {
                        gradeThesisButton.remove();
                    }
                    loadGradeSection(thesisId, container);
                } else {
                    alert(`Σφάλμα: ${data.message}`);
                }
            })
            .catch(error => {
                console.error('Σφάλμα κατά την εκκίνηση:', error);
                alert('Κάτι πήγε στραβά κατά την εκκίνηση!');
            });
    });

    container.appendChild(gradeThesisButton);
}



function loadLogs(thesis_id) {
    fetch('/api/thesis/logs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            thesis_id: thesis_id, // Σωστή μεταβλητή
        })
    })
        .then(response => response.json())
        .then(data => {
            const statusChangeContainer = document.getElementById('statusChangeContainer');
            statusChangeContainer.innerHTML = ''; // Καθαρισμός προηγούμενου περιεχομένου

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
                    logEntry.classList.add('card', 'mb-3', 'shadow-sm'); // Εξασφαλίζει στυλ card

                    logEntry.innerHTML = `
                        <div class="card-body">
                            <h5 class="card-title">${log.old_state} → ${log.new_state}</h5>
                            <p class="card-text">${new Date(log.date_of_change).toLocaleDateString('el-GR')}</p>
                        </div>
                    `;

                    statusChangeContainer.appendChild(logEntry);
                });
            } else if (data.success && data.log.length === 0) {
                const noChangesCard = document.createElement('div');
                noChangesCard.classList.add('card', 'mb-3', 'shadow-sm'); // Στυλ κάρτας

                noChangesCard.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title text-center">Δεν υπάρχουν αλλαγές κατάστασης</h5>
                    </div>
                `;

                statusChangeContainer.appendChild(noChangesCard);
            }
        })
        .catch(error => {
            console.error('Error loading log data:', error);
        });
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
                alert('Η διπλωματική ενημερώθηκε επιτυχώς! Το προηγούμενο PDF, αν υπήρχε, αντικαταστάθηκε.');
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





//------------Froentend for loading Invitations associated with a specific professor----------
function loadInvitations() {
    fetch('/api/invitations-for-professor', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
        .then(response => response.json())
        .then(data => {
            //console.log('Data from API:', data);//DELETOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOooooooooooooooooooooooooooooooooooooooooooooooo

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
                                <p><strong>Φοιτητής:</strong> ${invitation.student_name || 'Μη διαθέσιμος'} (AM: ${invitation.student_number || 'Μη διαθέσιμος'})</p>
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
    //console.log('Fetching invitation history...');//DELETOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOooooooooooooooooooooooooooooooooooooooooooooooo
    fetch('/api/invitation-history', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
        .then(response => {
            //console.log('Fetch Response:', response);//DELETOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOooooooooooooooooooooooooooooooooooooooooooooooo
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            //console.log('API Data:', data);//DELETOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOooooooooooooooooooooooooooooooooooooooooooooooo
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
                    //console.log('Invitation Data:', invitation);//DELETOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOooooooooooooooooooooooooooooooooooooooooooooooo
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
                alert(`Σφάλμα: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Σφάλμα πρόσκλησης', error);
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

    //console.log('Sending Student ID:', studentId);//DELETOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOooooooooooooooooooooooooooooooooooooooooooooooo
    //console.log('Sending Thesis ID:', thesisId);//DELETOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOooooooooooooooooooooooooooooooooooooooooooooooo

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
    const pdf = document.getElementById('pdf').files[0];
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
                //console.log('Success:', data);//DELETOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOooooooooooooooooooooooooooooooooooooooooooooooo
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
                    //console.log('Προσθήκη θέματος:', thesis);//DELETOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOooooooooooooooooooooooooooooooooooooooooooooooo

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
                        case 'cancelled':
                            status = 'Ακυρωμένη';
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
                        //console.log('clicked!');//DELETOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOooooooooooooooooooooooooooooooooooooooooooooooo
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

//----------------------------------------------------


//---------------Log-Out Button Event Listener-----------------------------
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


document.addEventListener('DOMContentLoaded', function () {
    loadTheses();
    loadInvitations();
    loadInvitationHistory();
    loadUnassignedTheses();
    loadAssignedTheses();
});
