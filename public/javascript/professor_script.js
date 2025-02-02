//--------------------------------------------- STARTUP SETTINGS ---------------------------------------------
//-------------------- Nav Bar Event Listener -----------------------------
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
            } else if (targetId === 'stats') {
                loadCharts();
            }
        }
        const editSection = document.getElementById('edit-section');
        if (editSection && !editSection.classList.contains('d-none')) {
            editSection.classList.add('d-none');
        }
        resetInfoSection();

        const themesCompartment = document.getElementById('themes-compartment');
        if (themesCompartment) {
            themesCompartment.classList.remove('col-md-6');
            themesCompartment.classList.add('col-lg-8', 'mx-auto');
        }

        document.querySelectorAll('.nav-link, .btn[data-target]').forEach(link => {
            link.classList.remove('active');
        });
        this.classList.add('active');
    });
});
//-------------- Log-Out Button Event Listener -------------
document.getElementById('logout-btn').addEventListener('click', (event) => {
    event.preventDefault();
    fetch('/logout', {
        method: 'POST',
        credentials: 'include'
    })
        .then(response => {
            if (response.ok) {
                window.location.href = '/';
            } else {
                alert('Η αποσύνδεση απέτυχε.');
            }
        })
        .catch(err => console.error('Error:', err));
});
//-------------- Show the Theses Section as main page after DOM is loaded -------------
window.addEventListener('DOMContentLoaded', () => {
    const defaultTab = document.querySelector('a[href="#theses-section"]');
    if (defaultTab) {
        defaultTab.click();
    }
});



//--------------------------------------------- THEMES TAB ---------------------------------------------

//-----------Function for Loading Themes that haven't been assigned to a student----------------- 
function loadUnassignedTheses() {
    fetch('/api/theses/unassigned')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
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

//-------------- Frontend for Editing a Thesis Theme on the Themes Tab -------------
function showEditSection(thesis) {
    const editSection = document.getElementById('edit-section');
    const themesCompartment = document.getElementById('themes-compartment');

    if (!editSection || !themesCompartment) {
        console.error('Το edit-section ή το themes-compartment δεν βρέθηκε στο DOM.');
        return;
    }

    const editTitle = document.getElementById('editTitle');
    const editSummary = document.getElementById('editSummary');
    editTitle.value = thesis.title;
    editSummary.value = thesis.summary;
    editTitle.placeholder = thesis.title || 'Δεν υπάρχει τίτλος';
    editSummary.placeholder = thesis.summary && thesis.summary.trim() !== ''
        ? thesis.summary
        : 'Δεν υπάρχει περιγραφή';

    const editForm = document.getElementById('editThesisForm');
    editForm.dataset.id = thesis.thesis_id;

    themesCompartment.classList.remove('col-lg-8', 'mx-auto');
    themesCompartment.classList.add('col-md-6');
    editSection.classList.remove('d-none');

    editSection.scrollIntoView({ behavior: 'smooth' });
}

//-------------- Edit Theme Button Event Listener -------------
document.getElementById('editThesisForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const thesisId = this.dataset.id;
    const title = document.getElementById('editTitle').value;
    const summary = document.getElementById('editSummary').value;
    const pdf = document.getElementById('editPdf').files[0];

    const formData = new FormData();
    formData.append('thesisId', thesisId);
    formData.append('title', title);
    formData.append('summary', summary);
    if (pdf) {
        formData.append('pdf', pdf);
    }

    fetch('/api/theses/update', {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Η διπλωματική ενημερώθηκε επιτυχώς! Το προηγούμενο PDF, αν υπήρχε, αντικαταστάθηκε.');
                loadUnassignedTheses();
            } else {
                alert(`Σφάλμα: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Σφάλμα:', error);
            alert('Κάτι πήγε στραβά κατά την αποθήκευση!');
        });
});
//-------------- Thesis Creation Event Listener on Submit -------------
document.getElementById('thesisForm').addEventListener('submit', function (e) {
    e.preventDefault();
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



//--------------------------------------------- ASSIGN TO STUDENT TAB ---------------------------------------------
//----------- Function for Loading Assigned Theses ----------------- 
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
//-------------- Event Listener for Student Search Bar when Typing -------------
document.querySelector('#search-student').addEventListener('input', function () {
    const filter = this.value.trim();
    const studentList = document.getElementById('student-list');

    if (filter.length === 0) {
        studentList.innerHTML = '';
        return;
    }
    fetch(`/api/student-search?input=${encodeURIComponent(filter)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                studentList.innerHTML = '';
                data.students.forEach(student => {
                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item list-group-item-action';
                    listItem.textContent = `AM: ${student.student_number} - ${student.name} ${student.surname}`;
                    listItem.dataset.studentId = student.id;

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

//-------------- Selecting Student from Student Search Bar Event Listener -------------
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

//-------------- Event Listener for Change Selected Student Button on Assign Tab  -------------
document.getElementById('changeStudentButton').addEventListener('click', function () {
    document.getElementById('studentListWrapper').style.display = 'block';

    document.getElementById('search-student').value = '';
    document.getElementById('student-list').innerHTML = '';
    document.getElementById('studentNameInput').value = '';
    delete document.getElementById('assignThesisButton').dataset.studentId;
});
//-------------- Event Listener for Theme Assignment Button -----------
document.getElementById('assignThesisButton').addEventListener('click', function () {
    const studentId = this.dataset.studentId;
    const selectedThesis = document.querySelector('input[name="thesisRadio"]:checked');

    if (!studentId || !selectedThesis) {
        alert('Παρακαλώ επιλέξτε φοιτητή και διπλωματική.');
        return;
    }
    const thesisId = selectedThesis.value;

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

                document.getElementById('search-student').value = '';
                document.getElementById('student-list').innerHTML = '';

                document.getElementById('studentNameInput').value = '';
                delete document.getElementById('assignThesisButton').dataset.studentId;
            } else {
                alert('Σφάλμα: ' + data.message);
            }
        })
        .catch(err => console.error('Σφάλμα:', err));
});
//-------------- Function for Reversing the Assignment of a Thesis to a Student ------------- 
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
                loadAssignedTheses();
                loadUnassignedTheses();
            } else {
                console.error('Σφάλμα:', data.message);
            }
        })
        .catch(err => console.error('Σφάλμα κατά την αναίρεση ανάθεσης:', err));
}



//--------------------------------------------- THESES LIST TAB ---------------------------------------------
//------------- Function For Showing Info of a Thesis based on its status ----------------
function showInfoSection(thesis) {
    const infoSection = document.getElementById('info-compartment');
    const thesesCompartment = document.getElementById('theses-compartment');
    const examReportSection = document.getElementById('examReportHTMLSection');

    if (examReportSection) {
        examReportSection.style.display = 'none';
    }

    thesesCompartment.classList.remove('col-lg-8', 'mx-auto');
    thesesCompartment.classList.add('col-md-6');
    infoSection.classList.remove('d-none');
    infoSection.innerHTML = '';

    const titleSection = document.createElement('section');
    titleSection.classList.add('text-center');
    titleSection.innerHTML = `
        <h3 class="text-primary">${thesis.title || 'Χωρίς τίτλο'}</h3>
        <hr>
    `;
    infoSection.appendChild(titleSection);

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
        case 'cancelled':
            status = 'Ακυρωμένη';
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

    const statusChangeSection = document.createElement('section');
    statusChangeSection.id = 'statusChangeSection';
    statusChangeSection.innerHTML = '<h4 class="text-center mb-3">Αλλαγές Καταστάσεων</h4>';
    const statusChangeContainer = document.createElement('div');
    statusChangeContainer.id = 'statusChangeContainer';
    statusChangeSection.appendChild(statusChangeContainer);
    infoSection.appendChild(statusChangeSection);
    infoSection.appendChild(Object.assign(document.createElement('hr'), { classList: 'mb-3 mt-2' }));

    if (thesis.status !== 'assigned') {
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

    loadLogs(thesis.thesis_id);


    const statusSection = document.createElement('section');
    statusSection.innerHTML = `<h4 class="text-center">Διαχείριση Διπλωματικής</h4>`;

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
            const configTitleElement = statusSection.querySelector('h4');
            configTitleElement.remove();
            addCanceledSection(thesis, statusSection);
            break;

        case "completed":
            addCompletedSection(thesis, statusSection);
            break;
    }

    infoSection.appendChild(statusSection);

    const footer = document.createElement('section');
    footer.classList.add('text-center');
    if (thesis.status === "active" || thesis.status === "to-be-reviewed") {
        footer.innerHTML = `
        <hr>
        <h4 class="mb-3 mt-3">Ημερομηνίες</h4>
        <p>Ημερομηνία Έναρξης: ${thesis.start_date || ''}</p>
        <p>Διάρκεια: ${calculateDuration(thesis.start_date) || ''}</p>
        
    `;
    } else if (thesis.status === "completed") {
        footer.innerHTML = `
        <hr>
        <h4 class="mb-3 mt-3">Ημερομηνίες</h4>
        <p>Ημερομηνία Έναρξης: ${thesis.start_date || ''}</p>
        <p>Ημερομηνία Περάτωσης: ${thesis.exam_date || ''}</p>`;
    }
    else if (thesis.status === "cancelled") {
        footer.innerHTML = `
        <hr>
        <h4 class="mb-3 mt-3">Ημερομηνίες</h4>
        <p>Ημερομηνία Έναρξης: ${thesis.start_date || ''}</p>
        <p>Ημερομηνία Περάτωσης: Ακυρωμένη</p>`;
    }
    else if (thesis.status === "assigned") {
        footer.innerHTML = `
        <hr>
        <h4 class="mb-3 mt-3">Ημερομηνίες</h4>
        <p>Ημερομηνία Έναρξης: Η διπλωματική αυτή δεν έχει εκκινήσει ακόμα.</p>`
            ;
    }
    infoSection.appendChild(footer);
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
        const previousMonthDays = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate(); // Days in the previous month
        days += previousMonthDays;
    }
    const monthText = totalMonths > 0
        ? `${totalMonths} ${totalMonths === 1 ? 'μήνα' : 'μήνες'}`
        : '0 μήνες';

    const dayText = days > 0
        ? `${days} ${days === 1 ? 'ημέρα' : 'ημέρες'}`
        : '0 μέρες';

    return [monthText, dayText].filter(Boolean).join(' και ');
}

//-------------- Function for Reseting the Info Section in Theses List ------------- 
function resetInfoSection() {
    const infoSection = document.getElementById('info-compartment');
    const thesesCompartment = document.getElementById('theses-compartment');

    if (infoSection) {
        infoSection.classList.add('d-none');
        infoSection.innerHTML = '';
    }

    if (thesesCompartment) {
        thesesCompartment.classList.remove('col-md-6');
        thesesCompartment.classList.add('col-lg-8', 'mx-auto');
    }
}
//-------------- Function for Loading the Theses List of the professor -------------
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
                thesesTableBody.innerHTML = '';

                if (data.theses.length === 0) {
                    thesesTableBody.innerHTML = '<tr><td colspan="4">Δεν βρέθηκαν δεδομένα.</td></tr>';
                    return;
                }

                data.theses.forEach(thesis => {

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

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${thesis.title || 'Χωρίς τίτλο'}</td>
                        <td>${thesis.thesis_id || 'Χωρίς ID'}</td>
                        <td>${roleText}</td>
                        <td>${status}</td>
                    `;

                    row.addEventListener('click', (event) => {
                        showInfoSection(thesis);
                    });

                    thesesTableBody.appendChild(row);
                });
            } else {
                console.error('Σφάλμα API:', data.message);
            }
        })
        .catch(err => console.error('Σφάλμα φόρτωσης:', err));
}

//-------------- Function for Presenting a Canceled Thesis Info -------------
function addCanceledSection(thesis, container) {
    const cancelledSection = document.createElement('section');

    const cancelledTitle = document.createElement('h4');
    cancelledTitle.classList.add('text-center');
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
    container.appendChild(cancelledSection);
}

//-------------- Function for Managing an Assigned Thesis -------------
function addAssignedSection(thesis, container) {
        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('d-flex', 'gap-2', 'mt-3');

        const showInvitationsButton = createButton('show-inv', 'Εμφάνιση Προσκλήσεων', ['btn', 'btn-info', 'mt-2'], () => {
            const existingList = container.querySelector('.invitations-list');

            if (existingList) {
                existingList.remove();
                showInvitationsButton.textContent = 'Εμφάνιση Προσκλήσεων';
                showInvitationsButton.classList.remove('btn-primary');
                showInvitationsButton.classList.add('btn-info');
            } else {

                showThesisInvitations(thesis.thesis_id, container);
                showInvitationsButton.textContent = 'Απόκρυψη Προσκλήσεων';
                showInvitationsButton.classList.remove('btn-info');
                showInvitationsButton.classList.add('btn-primary');
            }
        });
        buttonsContainer.appendChild(showInvitationsButton);
        const unassignThButton = createButton('unassign-thesis-button', 'Αναίρεση Ανάθεσης', ['btn', 'btn-danger', 'mt-2'], () => unassignThesis(thesis.thesis_id));
        buttonsContainer.appendChild(unassignThButton);

        const formContainer = document.createElement('div');
        formContainer.classList.add('mt-3');

        const startButtonContainer = document.createElement('div');
        startButtonContainer.classList.add('d-flex', 'align-items-center', 'mt-2');
        buttonsContainer.appendChild(startButtonContainer);

        checkCommitteeStatus(thesis.thesis_id).then(isFull => {
            if (isFull) {
                addStartThesisButton(thesis.thesis_id, formContainer);
            }
        });
        container.appendChild(buttonsContainer);
        container.appendChild(formContainer);
   
}
//-------------- Function to Display Invitations associated with a specific thesis in Theses List -------------
function showThesisInvitations(thesis_id, container) {
    if (!container) {
        console.error('Το container δεν βρέθηκε στο DOM.');
        return;
    }
    const existingList = container.querySelector('.invitations-list');
    if (existingList) {
        existingList.remove();
        return;
    }

    const invitationsList = document.createElement('div');
    invitationsList.classList.add('invitations-list', 'mt-3');

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
                invitationsList.innerHTML = data.invitations.map(invitation => {
                    let inv_status;
                    switch (invitation.invitation_status) {
                        case 'pending':
                            inv_status = 'Εκκρεμής';
                            break;
                        case 'accepted':
                            inv_status = 'Αποδεκτή';
                            break;
                        case 'rejected':
                            inv_status = 'Απορρίφθηκε';
                            break;
                        case 'cancelled':
                            inv_status = 'Ακυρώθηκε';
                    }
                    return `
                        <div class="card mb-2">
                            <div class="card-body">
                                <p><strong>Καθηγητής:</strong> ${invitation.professor_name} ${invitation.professor_surname}</p>
                                <p><strong>Κατάσταση:</strong> ${inv_status}</p>
                                <p><strong>Ημερομηνία Αποστολής:</strong> ${invitation.invitation_date}</p>
                                <p><strong>Ημερομηνία Απάντησης:</strong> ${invitation.response_date || 'Καμία απάντηση'}</p>
                            </div>
                        </div>
                    `;
                }).join('');
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
//-------------- Function that Checks if Committee is Full, if so, the Start Button Appears -------------
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
                return data.isFull;
            } else {
                console.error('Σφάλμα:', data.message);
                return false;
            }
        })
        .catch(err => {
            console.error('Σφάλμα κατά την επικοινωνία με το API:', err);
            return false;
        });
}
//-------------- Function that Manages the Display the Start Thesis Button -------------
function addStartThesisButton(thesisId, container) {
    const startThesisButton = createButton('start-thesis-button', 'Εκκίνηση Διπλωματικής', ['btn', 'btn-success', 'mt-2'], () => {
        startThesisButton.remove();

        const startThesisForm = document.createElement('div');
        startThesisForm.classList.add('mt-3');

        const startNumberLabel = document.createElement('label');
        startNumberLabel.textContent = 'A/A ΓΣΤ έγκρισης διπλωματικής';
        startNumberLabel.classList.add('form-label');
        startThesisForm.appendChild(startNumberLabel);

        const startNumberInput = document.createElement('input');
        startNumberInput.type = 'number';
        startNumberInput.min = "1";
        startNumberInput.step = '1';
        startNumberInput.id = 'start-number';
        startNumberInput.classList.add('form-control', 'mb-2');
        startNumberInput.placeholder = 'Αριθμός Γενικής Συνέλευσης';
        startThesisForm.appendChild(startNumberInput);

        const startDateLabel = document.createElement('label');
        startDateLabel.textContent = 'Ημερομηνία ΓΣΤ';
        startDateLabel.classList.add('form-label');
        startThesisForm.appendChild(startDateLabel);

        const startDateInput = document.createElement('input');
        startDateInput.type = 'date';
        startDateInput.id = 'start-date';
        startDateInput.classList.add('form-control', 'mb-2');
        startDateInput.placeholder = 'Ημερομηνία Γενικής Συνέλευσης';
        // Set max attribute to today
        const today = new Date().toISOString().split('T')[0];
        startDateInput.max = today;
        startThesisForm.appendChild(startDateInput);

        const confirmStartButton = createButton('confirm-start-button', 'Επιβεβαίωση Εκκίνησης', ['btn', 'btn-primary'], () => {
            const startNumber = startNumberInput.value;
            const startDate = startDateInput.value;

            if (!startNumber || !startDate) {
                alert('Παρακαλώ συμπληρώστε όλα τα πεδία.');
                return;
            }

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

//-------------- Function for Managing a Completed Thesis -------------
function addCompletedSection(thesis, container) {
    const complButtonContainer = document.createElement('div');
    complButtonContainer.classList.add('button-container', 'd-flex', 'gap-2', 'mt-4');

    const praktikoButton = createButton('configurationCompletedFilesExamReportButton', 'Πρακτικό Εξέτασης', ['btn', 'btn-outline-primary', 'btn-sm', 'float-start'], () => {
        const examReportSection = document.getElementById('examReportHTMLSection');

        if (examReportSection.style.display === 'none') {
            loadExamReportData(thesis.thesis_id);
            examReportSection.style.display = 'block';

        } else {
            examReportSection.style.display = 'none';
        }
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


}
//-------------- Function for Managing an Active Thesis -------------
function addActiveSection(thesis, container) {
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
                    noteTextarea.value = '';
                    loadNotes(thesis.thesis_id);
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
        const startDate = new Date(thesis.start_date); // Convert the start date to a Date object
        const currentDate = new Date(); // Get the current date
        const twoYearsAgo = new Date(currentDate.setFullYear(currentDate.getFullYear() - 2)); // Calculate the date 2 years ago

        if (startDate <= twoYearsAgo) {
            cancelThesisForm = document.createElement('div');
            cancelThesisForm.classList.add('mt-3');

            const cancelTitle = document.createElement('h4');
            cancelTitle.textContent = 'Ακύρωση Διπλωματικής';
            cancelThesisForm.appendChild(cancelTitle);

            const cancellationNumberLabel = document.createElement('label');
            cancellationNumberLabel.textContent = 'Α/Α ΓΣΤ';
            cancellationNumberLabel.classList.add('form-label');
            cancelThesisForm.appendChild(cancellationNumberLabel);

            const cancellationNumberInput = document.createElement('input');
            cancellationNumberInput.type = 'number';
            cancellationNumberInput.min = '1';
            cancellationNumberInput.step = '1';
            cancellationNumberInput.id = 'cancellation-number';
            cancellationNumberInput.classList.add('form-control', 'mb-2');
            cancellationNumberInput.placeholder = 'Αριθμός Γενικής Συνέλευσης';
            cancelThesisForm.appendChild(cancellationNumberInput);

            const cancellationDateLabel = document.createElement('label');
            cancellationDateLabel.textContent = 'Ημερομηνία ΓΣΤ';
            cancellationDateLabel.classList.add('form-label');
            cancelThesisForm.appendChild(cancellationDateLabel);

            const cancellationDateInput = document.createElement('input');
            cancellationDateInput.type = 'date';
            cancellationDateInput.id = 'cancellation-year';
            cancellationDateInput.classList.add('form-control', 'mb-2');
            cancellationDateInput.placeholder = 'Ημερομηνία Γενικής Συνέλευσης';
            cancelThesisForm.appendChild(cancellationDateInput);

            const cancellationReasonLabel = document.createElement('label');
            cancellationReasonLabel.textContent = 'Λόγος ακύρωσης';
            cancellationReasonLabel.classList.add('form-label');
            cancelThesisForm.appendChild(cancellationReasonLabel);

            const cancellationReasonTextarea = document.createElement('textarea');
            cancellationReasonTextarea.id = 'cancellation-reason';
            cancellationReasonTextarea.classList.add('form-control', 'mb-2');
            cancellationReasonTextarea.placeholder = 'Καταχωρήστε τον λόγο ακύρωσης';
            cancellationReasonTextarea.maxLength = 300;
            cancellationReasonTextarea.value = 'Από Διδάσκοντα';
            cancelThesisForm.appendChild(cancellationReasonTextarea);

            const cancelButton = createButton('cancel-thesis-button', 'Ακύρωση Διπλωματικής', ['btn', 'btn-danger', 'mb-3'], () => {
                const cancellationNumber = cancellationNumberInput.value;
                const cancellationDate = cancellationDateInput.value;
                const cancellationReasonText = cancellationReasonTextarea.value;

                if (!cancellationNumber || !cancellationDate || !cancellationReasonText) {
                    alert('Παρακαλώ συμπληρώστε όλα τα πεδία.');
                    return;
                }

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
        }

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

            const aaLabel = document.createElement('label');
            aaLabel.textContent = 'A/A ΓΣΤ';
            aaLabel.classList.add('form-label');

            const aaInput = document.createElement('input');
            aaInput.type = 'number';
            aaInput.min = '1';
            aaInput.step = '1';
            aaInput.classList.add('form-control', 'mb-2');
            aaInput.placeholder = 'A/A Γενικής Συνέλευσης';

            const dateLabel = document.createElement('label');
            dateLabel.textContent = 'Ημερομηνία ΓΣΤ';
            dateLabel.classList.add('form-label');

            const changeDateInput = document.createElement('input');
            changeDateInput.type = 'date';
            changeDateInput.classList.add('form-control', 'mb-2');
            changeDateInput.placeholder = 'Ημερομηνία Γενικής Συνέλευσης';

            changeThesisForm.appendChild(aaLabel);
            changeThesisForm.appendChild(aaInput);

            changeThesisForm.appendChild(dateLabel);
            changeThesisForm.appendChild(changeDateInput);

            const confirmChangeButton = createButton('confirm-change-button', 'Επιβεβαίωση Μετατροπής σε Υπό Εξέταση', ['btn', 'btn-primary'], () => {
                const changeNumber = aaInput.value;
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
        container.appendChild(changeStatusSection);

    }

}

//-------------- Function for Loading the Exam Report Data -------------
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

                updateDataField('final_grade', final_grade);
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
                updateDataField('examReportAssemblyNo', reportData.gen_assembly_session_date);
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

//-------------- Function that displays all notes of a professor for a specific thesis -------------
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

//-------------- Function for Managing a To-be-reviewed Thesis -------------
function addToBeReviewedSection(thesis, container) {
    const downloadSection = document.createElement('section');
    const downloadButton = createButton('download-thesis-button', 'Λήψη Πρόχειρου Φοιτητή', ['btn', 'btn-primary', 'my-3'], () => {
        const thesisId = thesis.thesis_id;

        fetch(`/api/fetch_all_attachments?thesis_id=${thesisId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const file = data.attachments.find(attachment => attachment.type === 'file');
                    if (file) {
                        const downloadLink = document.createElement('a');
                        downloadLink.href = file.file_path.replace('./', '/');
                        downloadLink.textContent = file.file_path.split('/').pop();
                        downloadLink.download = file.file_path.split('/').pop();
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
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

    container.appendChild(downloadSection);

    if (thesis.role === 'Επιβλέπων') {
        const announcementSection = document.createElement('section');

        announcementButtonController(thesis.thesis_id, announcementSection);

        let announcementContainer = document.querySelector('#announcement-container');
        if (!announcementContainer) {
            announcementContainer = document.createElement('div');
            announcementContainer.id = 'announcement-container';
            announcementContainer.classList.add('container', 'mt-4');
            document.body.appendChild(announcementContainer);
        }
        container.appendChild(announcementSection);
    }


    const gradeSection = document.createElement('section');
    const gradeTitle = document.createElement('h4');
    gradeTitle.textContent = 'Καταχώρηση Βαθμού';
    gradeTitle.classList.add('text-center');
    gradeSection.appendChild(gradeTitle);

    const gradeContent = document.createElement('div');
    gradeContent.id = 'grade-content';
    gradeSection.appendChild(gradeContent);

    loadGradeSection(thesis.thesis_id, gradeContent);

    container.appendChild(gradeSection);

}
//-------------- Function for Announcement controls in Theses List -------------
function announcementButtonController(thesisId, container) {
    fetch('/api/announcement-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thesisId: thesisId })
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            if (!data.success) {
                throw new Error('Server error: ' + data.message);
            }

            const { announced, examinationExists } = data.data;

            if (!examinationExists) {
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

            if (!announced) {
                const announcementButton = createButton('create-announcement-button', 'Δημιουργία Ανακοίνωσης', ['btn', 'btn-warning', 'mb-3'], () => addToAnnouncements(thesisId));
                container.appendChild(announcementButton);
            } else {
                const showAnnouncementButton = createButton('show-announcement-button', 'Προβολή Ανακοίνωσης', ['btn', 'btn-warning', 'mb-3'], () => {
                    fetchAnnouncementDetails(thesisId);
                });
                container.appendChild(showAnnouncementButton);
            }
            const announcementHr = document.createElement('hr');
            container.appendChild(announcementHr);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}


//-------------- Function for Loading Announcement Data in Theses List -------------
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
                console.log(data);
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
//-------------- Function for creating the Announcement View Modal in Theses List -------------
function showAnnouncementModal(announcementDetails) {

    const modal = document.createElement('div');
    modal.classList.add('modal', 'fade');
    modal.id = 'announcementModal';
    modal.tabIndex = -1;
    modal.setAttribute('aria-labelledby', 'announcementModalLabel');
    modal.setAttribute('aria-hidden', 'true');

    const modalDialog = document.createElement('div');
    modalDialog.classList.add('modal-dialog');

    const modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');

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

    const modalBody = document.createElement('div');
    modalBody.classList.add('modal-body');

    modalBody.innerHTML = `
        <p><strong>Φοιτητής:</strong> ${announcementDetails.student_name} </p>
        <p class="text-muted"><strong>Τριμελής Επιτροπή:</strong></p>
                            <ul class="list-unstyled ps-3">
                                <li>${announcementDetails.professor_name}</li>
                                <li>${announcementDetails.committee_member1_name}</li>
                                <li>${announcementDetails.committee_member2_name}</li>
                            </ul>        
        <p><strong>Ημερομηνία Εξέτασης:</strong> ${new Date(announcementDetails.exam_date).toLocaleDateString()}</p>
        <p><strong>Τύπος Εξέτασης:</strong> ${announcementDetails.type_of_exam === 'online' ? 'Ηλεκτρονική' : announcementDetails.type_of_exam === 'in-person' ? 'Δια ζώσης' : 'Άγνωστος τύπος'}</p>
        <p><strong>Τοποθεσία Εξέτασης:</strong> ${announcementDetails.examination_location}</p>
    `;

    modalContent.appendChild(modalBody);

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

    const myModal = new bootstrap.Modal(modal);
    myModal.show();

    modal.addEventListener('hidden.bs.modal', () => {
        modal.remove();
    });
}
//-------------- Function for saving a new Announcement in the DB in Theses List -------------
function addToAnnouncements(thesisId) {
    const announcementButton = document.querySelector('#create-announcement-button');

    fetch('/api/add-announcement', {
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
            if (data.success) {
                resetInfoSection();
                fetchAnnouncementDetails(thesisId);
            }
        })
        .catch((error) => {
            console.error('Error creating announcement:', error);
        });
}
//-------------- Function for Enabling the Grading of a Thesis in Theses List -------------
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
//-------------- Function for Loading the Grades if enabled in Theses List-------------
function loadGradeSection(thesisId, container) {
    const existingContent = document.getElementById('grade-content');
    if (existingContent && container.contains(existingContent)) {
        container.removeChild(existingContent);
    }

    const gradeContent = document.createElement('div');
    gradeContent.id = 'grade-content';

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
                if (data.role === 'Επιβλέπων') {
                    gradeEnableButton(thesisId, gradeContent);
                } else {
                    const message = document.createElement('p');
                    message.textContent = 'Η βαθμολόγηση δεν έχει ενεργοποιηθεί από τον επιβλέποντα διδάσκοντα.';
                    message.classList.add('text-warning', 'mt-3');
                    gradeContent.appendChild(message);
                }
            } else if (data.success && data.gradingEnabled) {
                renderGradeSection(thesisId, gradeContent);
                loadGradeList(thesisId, gradeContent);
            }
            container.appendChild(gradeContent);
        })
        .catch(error => {
            console.error('Σφάλμα κατά την ανάκτηση της κατάστασης:', error);
        });
}
//-------------- Function for showing the Grading Form in Theses List -------------
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
                commentsTextarea.rows = 4;
                commentsTextarea.placeholder = 'Προσθέστε σχόλια...';
                commentsTextarea.value = (data.grades && data.grades.comments) ? data.grades.comments : '';
                container.appendChild(commentsTextarea);

                const buttonContainer = document.createElement('div');
                buttonContainer.classList.add('button-container', 'd-flex', 'gap-2', 'mt-4');

                const submitGradeButton = createButton(
                    'submit-grade-button',
                    grades.grade !== undefined ? 'Αλλαγή Βαθμού' : 'Καταχώρηση Βαθμού',
                    ['btn', 'btn-warning'], () => handleSubmitGradeButtonClick(thesisId, container)
                );

                buttonContainer.appendChild(submitGradeButton);

                const finalizeButton = createButton(
                    'finalize-grade-button',
                    'Οριστική Υποβολή',
                    ['btn', 'btn-success'], () => handleFinalizeButtonClick(thesisId, container)
                );

                buttonContainer.appendChild(finalizeButton);

                container.appendChild(buttonContainer);
            } else {
                container.innerHTML = '<p class="text-danger text-center">Οι βαθμοί έχουν ήδη υποβληθεί οριστικά και δεν μπορούν να τροποποιηθούν.</p>';
            }
        })
        .catch(error => {
            console.error('Σφάλμα κατά την ανάκτηση βαθμολογίας:', error);
        });
}
//-------------- Function for loading the submitted grades in Theses List -------------
function loadGradeList(thesisId, container) {
    fetch(`/api/get-grades-list/${thesisId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
        .then(response => response.json())
        .then(data => {

            const gradeListSection = document.createElement('div');
            gradeListSection.classList.add('grade-list', 'mt-4');

            const gradeListTitle = document.createElement('h5');
            gradeListTitle.textContent = 'Καταχωρηθέντες Βαθμοί';
            gradeListSection.appendChild(gradeListTitle);

            const gradeListContainer = document.createElement('ul');
            gradeListContainer.classList.add('list-group');

            if (data.success && Array.isArray(data.grades) && data.grades.length > 0) {
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
//-------------- Function for Temporary Grade Submit Button in Theses List -------------
function handleSubmitGradeButtonClick(thesisId, container) {
    const grades = [];

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

    fetch('/api/submit-grades', {
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
                alert('Η καταχώρηση βαθμών ολοκληρώθηκε επιτυχώς!');
                renderGradeSection(thesisId, container);
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
//-------------- Function for Final Grade Submit Button in Theses List  -------------
function handleFinalizeButtonClick(thesisId, container) {
    const grades = [];

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
                renderGradeSection(thesisId, container);
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


//-------------- Event Listener for Export to CSV button in Theses List ------------- 
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
                const headers = Object.keys(rows[0]).map(header => `"${header}"`).join(',');
                const csvContent = rows.map(row => {
                    return Object.values(row).map(value => `"${value || ''}"`).join(',');
                });

                const csvBlob = new Blob(
                    [`\uFEFF${headers}\n${csvContent.join('\n')}`],
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
//-------------- Event Listener for Export to JSON button in Theses List  ------------- 
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
//-------------- Event Listener for Filter dropdown in Theses List  -------------
document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', event => {
        event.preventDefault();
        const filterValue = event.target.getAttribute('data-filter');
        applyFilter(filterValue);
    });
});

//-------------- Functions for handling the Filtering in Theses List -------------
let appliedFilters = { status: null, role: null };
function applyFilter(filterType, filterValue) {
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
                            case 'cancelled':
                                status = 'Ακυρωμένη';
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
    applyFilter();
}

//-------------- Function for Loading Logs Data in Theses List -------------
function loadLogs(thesis_id) {
    fetch('/api/thesis/logs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            thesis_id: thesis_id,
        })
    })
        .then(response => response.json())
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
                    logEntry.classList.add('card', 'mb-3', 'shadow-sm');

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
                noChangesCard.classList.add('card', 'mb-3', 'shadow-sm');

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
//-------------- Function for updating all section with the same DataField -------------
function updateDataField(dataField, value, errorMessage = 'Error - no data') {
    const elements = document.querySelectorAll(`[data-field="${dataField}"]`);
    elements.forEach(element => {
        element.textContent = (value !== undefined && value !== null && value !== '') ? value : errorMessage;
    });
}
//-------------- Function for combining name and surname in one String -------------
function nameSurname(name, surname) {
    return name + ' ' + surname;
}
//-------------- Function for sorting 3 strings -------------
function sortThreeStrings(input1, input2, input3) {
    const inputs = [input1, input2, input3];
    inputs.sort();
    return inputs;
}
//-------------- Function for getting the day name of a date -------------
function getDayName(dateStr, locale) {
    var date = new Date(dateStr);
    return date.toLocaleDateString(locale, { weekday: 'long' });
}
//-------------- Function to create Buttons more easily ------------- 
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



//--------------------------------------------- INVITATION TAB ---------------------------------------------
//------------ Function for loading Invitations associated with a specific professor -------------
function loadInvitations() {
    fetch('/api/invitations-for-professor', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
        .then(response => response.json())
        .then(data => {
            const container = document.querySelector('#invitations .row');
            container.innerHTML = '';

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
                                <p><strong>Επιβλέπων Καθηγητής:</strong> ${invitation.professor_name}</p>
                                <button class="btn btn-primary btn-sm accept-btn" data-id="${invitation.invitation_id}">Αποδοχή</button>
                                <button class="btn btn-outline-danger btn-sm reject-btn" data-id="${invitation.invitation_id}">Απόρριψη</button>
                            </div>
                        </div>
                    `;
                    container.appendChild(card);
                });
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
                container.innerHTML = '<h5 class="text-center">Δεν υπάρχουν προσκλήσεις!</h5>';
            }
        })
        .catch(error => {
            console.error('Σφάλμα κατά τη φόρτωση των προσκλήσεων:', error);
        });
}
//-------------- Invitation History Frontend -------------
function loadInvitationHistory() {
    fetch('/api/invitation-history', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
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
                const invHistTableBody = document.querySelector('#invitation-history tbody');
                if (!invHistTableBody) {
                    console.error('Δεν βρέθηκε το στοιχείο #theses tbody.');
                    return;
                }

                invHistTableBody.innerHTML = '';

                if (data.invitations.length === 0) {
                    invHistTableBody.innerHTML = '<tr><td colspan="7">Δεν βρέθηκαν δεδομένα.</td></tr>';
                    return;
                }

                data.invitations.forEach(invitation => {
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
//-------------- Invitation Acceptance/Rejection Handler -------------
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
                loadInvitations();
                loadInvitationHistory();
            } else {
                alert(`Σφάλμα: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Σφάλμα πρόσκλησης', error);
        });
}

//--------------------- Function for Loading the Charts of a professor -------------
let chartInstance;

let chartSupervisorGrades, chartCompletionTimes, chartSupervisedTheses;

function loadCharts() {
    fetch('/api/stats/professors', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('API returned an error:', data.message);
                return;
            }

            const results = data.results;

            const avgSupervisorGrades = results.map(prof => parseFloat(prof.avg_supervisor_grade));
            const avgCommitteeMemberGrades = results.map(prof => parseFloat(prof.avg_committee_member_grade));
            const avgSupervisorCompletionTimes = results.map(prof => parseFloat(prof.avg_supervisor_completion_time));
            const avgCommitteeMemberCompletionTimes = results.map(prof => parseFloat(prof.avg_committee_member_completion_time));
            const totalSupervisedTheses = results.map(prof => prof.total_supervised_theses);
            const totalCommitteeTheses = results.map(prof => prof.total_committee_theses);
            const labels = results.map(prof => `${prof.name} ${prof.surname}`);

            const supervisorGradesChartElement = document.getElementById('chartSupervisorGrades');
            if (supervisorGradesChartElement) {
                if (chartSupervisorGrades) {
                    chartSupervisorGrades.destroy();
                }
                chartSupervisorGrades = new Chart(supervisorGradesChartElement, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Μέσος Τελικός Βαθμός Διπλωματικών (ως Επιβλέπωντας)',
                                data: avgSupervisorGrades,
                                backgroundColor: 'rgba(75, 192, 192, 0.5)'
                            },
                            {
                                label: 'Μέσος Τελικός Βαθμός Διπλωματικών (ως Μέλος Τριμελούς)',
                                data: avgCommitteeMemberGrades,
                                backgroundColor: 'rgba(255, 99, 132, 0.5)'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        aspectRatio: 0.99,
                        scales: {
                            y: { beginAtZero: true }
                        }
                    }
                });
            }

            const completionTimesChartElement = document.getElementById('chartCompletionTimes');
            if (completionTimesChartElement) {
                if (chartCompletionTimes) {
                    chartCompletionTimes.destroy();
                }
                chartCompletionTimes = new Chart(completionTimesChartElement, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Μέση Διάρκεια Περάτωσης Διπλωματικών (ως Επιβλέπωντας)',
                                data: avgSupervisorCompletionTimes,
                                backgroundColor: 'rgba(54, 162, 235, 0.5)'
                            },
                            {
                                label: 'Μέση Διάρκεια Περάτωσης Διπλωματικών (ως Μέλος Τριμελούς)',
                                data: avgCommitteeMemberCompletionTimes,
                                backgroundColor: 'rgba(153, 102, 255, 0.5)'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        aspectRatio: 0.99,
                        scales: {
                            y: { beginAtZero: true }
                        }
                    }
                });
            }

            const supervisedThesesChartElement = document.getElementById('chartSupervisedTheses');
            if (supervisedThesesChartElement) {
                if (chartSupervisedTheses) {
                    chartSupervisedTheses.destroy();
                }
                chartSupervisedTheses = new Chart(supervisedThesesChartElement, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Συνολικός Αριθμός Διπλωματικών (ως Επιβλέπωντας)',
                                data: totalSupervisedTheses,
                                backgroundColor: 'rgba(255, 159, 64, 0.5)'
                            },
                            {
                                label: 'Συνολικός Αριθμός Διπλωματικών (ως Μέλος Τριμελούς)',
                                data: totalCommitteeTheses,
                                backgroundColor: 'rgba(255, 99, 71, 0.5)'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        aspectRatio: 0.99,
                        scales: {
                            y: { beginAtZero: true }
                        }
                    }
                });
            }
        })
        .catch(error => console.error('Error in loadCharts:', error));
}



//--------------------------------------------- RUN FUNCTIONS AFTER DOM ---------------------------------------------
//------------------------------ Load functions after DOM is loaded ------------------------------
document.addEventListener('DOMContentLoaded', function () {
    loadTheses();
    loadInvitations();
    loadInvitationHistory();
    loadUnassignedTheses();
    loadAssignedTheses();
    loadCharts();
});
