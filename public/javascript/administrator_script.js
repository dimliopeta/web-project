
//--------------------------------------------- STARTUP SETTINGS ---------------------------------------------
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
            } else if (targetId === 'administratorFullThesisList') {
                loadAllTheses();
            } else if (targetId === 'assign') {
                // loadUnassignedTheses();
                //loadAssignedTheses();
            } else if (targetId === 'invitations') {
                //loadInvitations();
                //loadInvitationHistory();
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



//--------------------------------------------- DASHBOARD / FRONT PAGE ---------------------------------------------
//--------------- Function for Loading the Full Theses List ---------------
function loadAllTheses() {
    const token = localStorage.getItem('token');

    fetch('/api/thesesAdministrator', {
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
                const thesesTableBody = document.querySelector('#theses tbody');
                if (!thesesTableBody) {
                    console.error('Element with selector #theses tbody not found.');
                    return;
                }

                thesesTableBody.innerHTML = ''; // Clear existing table rows

                if (data.thesesAll.length === 0) {
                    thesesTableBody.innerHTML = '<tr><td colspan="4">No theses found.</td></tr>';
                    return;
                }

                data.thesesAll.forEach(thesis => {
                    // Translate status
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
                            status = 'Ανατεθείσα';
                            break;
                        case 'cancelled':
                            status = 'Ακυρωμένη';
                            break;
                        default:
                            status = 'Άγνωστη';
                    }

                    // Construct table row
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${thesis.thesis_id || 'Χωρίς ID'}</td>
                        <td>${thesis.title || 'Χωρίς Τίτλο'}</td>
                        <td>${(thesis.professor_surname && thesis.professor_name) ? `${thesis.professor_surname} ${thesis.professor_name}` : 'Χωρίς Καθηγητή'}</td>
                        <td>${status}</td>
                    `;

                    // Add a click event for additional actions if needed
                    row.addEventListener('click', () => {
                        showInfoSection(thesis);
                    });

                    thesesTableBody.appendChild(row);
                });
            } else {
                console.error('API Error:', data.message);
            }
        })
        .catch(err => console.error('Error loading theses:', err));
}



let selectedThesisId = null;
//--------------- Function for Showing Info of clicked Thesis ---------------
function showInfoSection(thesis) {

    const infoSection = document.getElementById('administratorThesesInfoSection');
    const managementSection = document.getElementById('administratorThesesManagementSection');
    const thesesCompartment = document.getElementById('theses-compartment');
    infoSection.style.display = 'block';
    managementSection.style.display = 'block';
    selectedThesisId = thesis.thesis_id;

    thesesCompartment.classList.remove('col-lg-8', 'mx-auto');
    thesesCompartment.classList.add('col-md-6');

    infoSection.classList.remove('d-none');
    infoSection.innerHTML = '';

    const titleSection = document.createElement('section');
    titleSection.classList.add('text-center', 'mb-4');
    titleSection.innerHTML = `
        <h3 class="text-primary">${thesis.title || 'Χωρίς τίτλο'}</h3>
        <hr>
    `;
    infoSection.appendChild(titleSection);

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
            status = 'Ανατεθείσα';
            break;
        case 'cancelled':
            status = 'Ακυρωμένη';
            break;
        default:
            status = 'Άγνωστη';
    }

    const duration = calculateDuration(thesis.start_date);

    infoSection.innerHTML = `
                <div class="card">
                    <div class="card-header text-center">
                        <h3 class="text-primary">${thesis.title || 'Χωρίς τίτλο'}</h3>
                    </div>
                    <div class="card-body">
                        <section>
                            <h4>Βασικές Πληροφορίες</h4>
                            <p>Περιγραφή: ${thesis.summary || 'Χωρίς περιγραφή'}</p>
                            <p>Φοιτητής: ${thesis.student_name || 'Χωρίς φοιτητή'} ${thesis.student_surname || ''}
                                (ΑΜ: ${thesis.student_number || 'Χωρίς ΑΜ'})</p>
                            <p>Κατάσταση: ${status}</p>
                            <hr>
                        </section>
                        ${thesis.status === 'active' || thesis.status === 'to-be-reviewed' ? `
                        <section>
                            <h4>Μέλη Τριμελούς Επιτροπής</h4>
                            <p>Επιβλέπων: ${thesis.professor_name + ' ' + thesis.professor_surname || 'Χωρίς επιβλέποντα'}</p>
                            <p>Μέλος 1: ${thesis.committee_member1_name + ' ' + thesis.committee_member1_surname || 'Δεν έχει οριστεί'}
                            </p>
                            <p>Μέλος 2: ${thesis.committee_member2_name + ' ' + thesis.committee_member2_surname || 'Δεν έχει οριστεί'}
                            </p>
                        </section>` : ''}
                    </div>
                    <div class="card-footer text-muted">
                        <span data-field="dashboardStartDate">
                            <span class="ps-5">Ημερομηνία έναρξης:</span>
                            <span class="pe-4" data-field="thesis_start_date">${thesis.start_date || 'err'}</span>
                        </span>
                        <span data-field="dashboardDuration">
                            <span class="ps-5">Διάρκεια:</span>
                            <span class="pe-4" data-field="thesis_duration">${duration || 'err'}</span>
                        </span>
                    </div>
                </div>
            `;
    if (thesis.status === "active") {
        managementSection.innerHTML = `
            <div class="card">
                <div class="card-header text-center">
                    <h3 class="text-dark">Διαχείρηση Διπλωματικής</h3>
                </div>
                <div class="card-body">
                    <section>
                        <div class="row">
                            <!-- Submit AP Area -->
                            <div class="d-flex flex-column align-items-center w-50" id="APSection">
                                <h5 class="my-1">Καταχώριση ΑΠ έγκρισης</h5>
                                <p id="APSavedData" class="text-success"></p>
                                <label class="">ΑΠ:</label>
                                <input type="text" id="APInputBox" class="form-control mt-1" placeholder="Αριθμός πρωτοκόλλου">
                                <button class="btn btn-secondary w-100 my-3" id="submitAPButton">
                                    Καταχώρηση
                                </button>
                            </div>
                            
                            <!-- Cancel Thesis Area -->
                            <div class="d-flex flex-column align-items-center w-50" id="cancelThesisArea">
                                <h5 class="my-1">Ακύρωση ανάθεσης θέματος</h5>
                                <p id="cancelThesisSavedInput" class="text-danger"></p>
                                <label id="GSTLabel">Α/Α ΓΣΤ:</label>
                                <input type="text" id="GSTInputBox" class="form-control mt-1 mb-2">
                                <label id="dateLabel">Ημερομηνία:</label>
                                <input type="date" id="dateInputBox" class="form-control mt-1 mb-2">
                                <label id="reasonLabel">Λόγος:</label>
                                <textarea id="reasonInputBox" class="form-control mb-3 mt-1">Μετά από αίτηση του/της φοιτητή/φοιτήτριας</textarea>
                                <button class="btn btn-danger w-100" id="cancelThesisButton">
                                    Ακύρωση
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
                <div class="card-footer text-muted">
                </div>
            </div>
        `;
    } else if (thesis.status === "to-be-reviewed") {
        managementSection.innerHTML = `
    <h4>vagin</h4>
    `;
    }

}

//--------------- Event Listener for Submit AP Button (Delegated since the APButton wasnt loaded in the DOM in time) ---------------
administratorThesesManagementSection.addEventListener('click', (event) => {
    if (event.target && event.target.id === 'submitAPButton') {
        const APInput = document.getElementById('APInputBox').value.trim();
        if (APInput && selectedThesisId) {
            fetch('/api/AP_save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apNumber: APInput, thesis_id: selectedThesisId })
            })
                .then(response => response.json())
                .then(data => {
                    document.getElementById('APSavedData').innerText = `Αριθμός Πρωτοκόλλου: ${APInput}`;
                    document.getElementById('APInputBox').value = '';
                })
                .catch(error => console.error('Error saving AP:', error));
        } else {
            console.error('AP Number or Thesis ID is missing.');
        }
    }
});

//--------------- Event Listener for Cancel Thesis Button ---------------
administratorThesesManagementSection.addEventListener('click', (event) => {
    if (event.target && event.target.id === 'cancelThesisButton') {
        const GSTInput = document.getElementById('GSTInputBox').value.trim();
        const dateInput = document.getElementById('dateInputBox').value.trim();
        const reasonInput = document.getElementById('reasonInputBox').value;

        if (GSTInput && dateInput && reasonInput) {
            fetch('/api/Thesis_cancel_admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({thesis_id: selectedThesisId , date: dateInput, gstNumber: GSTInput, reason: reasonInput})
            })
                .then(response => response.json())
                .then(data => {
                    
                    // Insert the saved values next to the labels
                    document.getElementById('GSTLabel').innerHTML = `Α/Α ΓΣΤ: ${GSTInput}`;
                    document.getElementById('dateLabel').innerHTML = `Ημερομηνία: ${dateInput}`;
                    document.getElementById('reasonLabel').innerHTML = `Λόγος: ${reasonInput}`;

                    // Clear the input fields
                    document.getElementById('GSTInputBox').value = '';
                    document.getElementById('dateInputBox').value = '';
                    document.getElementById('reasonInputBox').value = 'Μετά από αίτηση του/της φοιτητή/φοιτήτριας';
                })
                .catch(error => console.error('Error cancelling thesis:', error));
        } else {
            console.error('Missing input fields for canceling thesis.');
        }
    }
});


//--------------- Event Listener for Filter dropdown ---------------
document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', event => {
        event.preventDefault(); // Αποφυγή default συμπεριφοράς του link
        const filterType = event.target.getAttribute('data-type');
        const filterValue = event.target.getAttribute('data-value');
        applyFilter(filterType, filterValue);
    });
});
//--------------- Event Listener for Search Bar click on professor ---------------
document.getElementById('administratorFilterProfessorSearch').addEventListener('input', event => {
    const searchValue = event.target.value.trim().toLowerCase(); // Normalize input for comparison
    searchProfessors(searchValue); // Call function to search professors as the user types
});
// Trigger search and show results
document.getElementById('administratorFilterProfessorSearch').addEventListener('input', (event) => {
    const searchQuery = event.target.value.trim().toLowerCase();

    // Hide results if the input is empty
    if (searchQuery === '') {
        const searchResults = document.getElementById('administratorProfessorSearchResults');
        if (searchResults) {
            searchResults.style.display = 'none'; // Hide the results if input is empty
        }
    } else {
        searchProfessors(searchQuery); // Trigger the search as before
    }
});

// Hide results when clicking outside the search bar or results container
document.addEventListener('click', (event) => {
    const searchResults = document.getElementById('administratorProfessorSearchResults');
    const searchInput = document.getElementById('administratorFilterProfessorSearch');

    // If the click is outside the search bar or search results, hide the results
    if (!searchInput.contains(event.target) && !searchResults.contains(event.target)) {
        if (searchResults) {
            searchResults.style.display = 'none'; // Hide the results
        }
    }
});

//--------------- Function for filtering for Theses List ---------------
let appliedFilters = { status: null, professor: '' };
function applyFilter(filterType, filterValue) {
    // Ενημέρωση των εφαρμοσμένων φίλτρων
    appliedFilters[filterType] = filterValue;

    const token = localStorage.getItem('token');

    fetch('/api/thesesAll', {
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
                data.thesesAll
                    .filter(thesis => {
                        const matchesStatus = !appliedFilters.status || thesis.status === appliedFilters.status;
                        const professorFullName = `${thesis.professor_surname || ''} ${thesis.professor_name || ''}`.toLowerCase();
                        const matchesProfessor = !appliedFilters.professor || professorFullName.includes(appliedFilters.professor);

                        return matchesStatus && matchesProfessor;
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
                        <td>${thesis.thesis_id || 'Χωρίς ID'}</td>
                        <td>${thesis.title || 'Χωρίς Τίτλο'}</td>
                        <td>${(thesis.professor_surname && thesis.professor_name) ? `${thesis.professor_surname} ${thesis.professor_name}` : 'Χωρίς Καθηγητή'}</td>
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

//--------------- Function to load professor data in search bar ---------------
function searchProfessors(searchQuery) {
    const token = localStorage.getItem('token');
    const searchResults = document.getElementById('administratorProfessorSearchResults');
    searchResults.style.display = "block";

    fetch(`/api/professor_search_all?search=${searchQuery}`, {  // Send the search term in the query string
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            const searchResults = document.querySelector('#administratorProfessorSearchResults');
            if (!searchResults) return;

            searchResults.innerHTML = ''; // Clear previous search results

            if (data.success && data.professors) {
                data.professors.forEach(professor => {
                    const li = document.createElement('li');
                    li.classList.add('dropdown-item');
                    li.textContent = `${professor.surname} ${professor.name}`;
                    li.addEventListener('click', () => {
                        // Apply filter when a professor name is clicked
                        appliedFilters.professor = `${professor.surname} ${professor.name}`.toLowerCase();
                        applyFilter('professor', appliedFilters.professor);
                    });
                    searchResults.appendChild(li);
                });
            }
        })
        .catch(err => console.error('Σφάλμα κατά την αναζήτηση καθηγητών:', err));
}
//--------------- Function to clear selected filters --------------- 
function clearFilters() {
    appliedFilters = { status: null, professor: '' };
    document.getElementById('administratorFilterProfessorSearch').value = '';
    applyFilter();
}

//--------------- Helper function to calculate the thesis duration in months and days --------------- 
function calculateDuration(startDate) {
    if(startDate !== null){
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
        : '';

    const dayText = days > 0
        ? `${days} ${days === 1 ? 'ημέρα' : 'ημέρες'}`
        : '';

    return [monthText, dayText].filter(Boolean).join(' και ');
}else {
    return 'err';
}
}

function resetInfoSection() {
    const infoSection = document.getElementById('administratorThesesInfoSection');
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



//--------------------------------------------- RUN FUNCTIONS AFTER DOM ---------------------------------------------

document.addEventListener('DOMContentLoaded', function () {
    loadAllTheses();
});

//-----------Load the Dashboard Tab as the Homepage-------------
window.addEventListener('DOMContentLoaded', () => {
    const defaultTab = document.querySelector('a[href="#administratorFullThesisList"]');
    if (defaultTab) {
        defaultTab.click();
    }
});

