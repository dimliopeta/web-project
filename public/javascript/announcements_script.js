let currentPage = 1;
const announcementsPerPage = 6;
let hasMoreAnnouncements = true; // Μεταβλητή για να ελέγξουμε αν υπάρχουν περισσότερες ανακοινώσεις

function loadAnnouncements(filters = {}, exportFormat = null) {
    console.log("Φόρτωση ανακοινώσεων με φίλτρα:", filters);
    // Επαναφορά της τρέχουσας σελίδας αν αλλάζουν τα φίλτρα
    if (filters.anDateFrom || filters.anDateTo || filters.examDateFrom || filters.examDateTo) {
        currentPage = 1;
    }
    fetch('/api/get-all-announcements/', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
        .then(response => response.json())
        .then(data => {
            const announcements = data.data;
            console.log(announcements);
            if (!Array.isArray(announcements)) {
                throw new Error('Το data.announcements δεν είναι πίνακας');
            }
            // Έλεγχος για τα φίλτρα
            let filteredAnnouncements = announcements;
            if (Object.values(filters).some(filter => filter !== null)) {
                filteredAnnouncements = announcements.filter(announcement => {
                    let match = true;
                    // Φιλτράρισμα ημερομηνίας δημοσίευσης
                    if (filters.anDateFrom && new Date(announcement.an_date) < new Date(filters.anDateFrom)) {
                        match = false;
                    }
                    if (filters.anDateTo && new Date(announcement.an_date) > new Date(filters.anDateTo)) {
                        match = false;
                    }
                    // Φιλτράρισμα ημερομηνίας εξέτασης
                    if (filters.examDateFrom && new Date(announcement.exam_date) < new Date(filters.examDateFrom)) {
                        match = false;
                    }
                    if (filters.examDateTo && new Date(announcement.exam_date) > new Date(filters.examDateTo)) {
                        match = false;
                    }
                    return match;
                });
            }
            // Υπολογισμός του τρέχοντος εύρους
            const startIndex = (currentPage - 1) * announcementsPerPage;
            const endIndex = startIndex + announcementsPerPage;
            const announcementsToLoad = filteredAnnouncements.slice(startIndex, endIndex);
            const container = document.getElementById('announcements-container');

            // Αν εξάγουμε σε JSON ή XML, δεν καθαρίζουμε το container
            if (!exportFormat && currentPage === 1) {
                container.innerHTML = ''; // Καθαρισμός μόνο στην πρώτη σελίδα
            }

            // Δημιουργία κάρτας για κάθε ανακοίνωση (μόνο αν δεν εξάγουμε σε JSON ή XML)
            if (!exportFormat) {
                announcementsToLoad.forEach(announcement => {
                    const card = `
                <div class="col-md-4">
                    <div class="card h-100 shadow-lg border-0">
                        <div class="card-header bg-primary text-white">
                            <h5 class="card-title mb-0">Ανακοίνωση Παρουσίασης Διπλωματικής</h5>
                        </div>
                        <div class="card-body">
                            <h6 class="card-subtitle mb-2 text-muted">${announcement.title}</h6>
                            <p class="text-muted"><strong>Φοιτητής:</strong> ${announcement.student_name}</p>
                            <p class="text-muted"><strong>Τριμελής Επιτροπή:</strong></p>
                            <ul class="list-unstyled ps-3">
                                <li>${announcement.professor_name}</li>
                                <li>${announcement.committee_member1_name}</li>
                                <li>${announcement.committee_member2_name}</li>
                            </ul>
                            <p class="text-muted"><strong>Ημερομηνία Εξέτασης:</strong> ${new Date(announcement.exam_date).toLocaleDateString()}</p>
                            <p class="text-muted"><strong>Τύπος Εξέτασης:</strong> ${announcement.type_of_exam === 'online'
                            ? 'Ηλεκτρονική'
                            : announcement.type_of_exam === 'in-person'
                                ? 'Δια ζώσης'
                                : 'Άγνωστος τύπος'}</p>
                            <p class="text-muted"><strong>Τοποθεσία Εξέτασης:</strong> ${announcement.examination_location}</p>
                        </div>
                        <div class="card-footer bg-light d-flex justify-content-end">
                            <p class="text-center">Ημερομηνία Δημοσίευσης Ανακοίνωσης: ${new Date(announcement.an_date).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
                `;
                    container.innerHTML += card;
                });
            } else {
                let output;
                // Εξαγωγή σε JSON
                if (exportFormat === 'json') {
                    output = JSON.stringify(filteredAnnouncements, null, 2);
                    downloadFile('announcements.json', output);
                }
                // Εξαγωγή σε XML
                else if (exportFormat === 'xml') {
                    output = jsonToXml(filteredAnnouncements);
                    downloadFile('announcements.xml', output);
                }
            }
            // Ενημέρωση της κατάστασης για περισσότερες σελίδες
            if (announcementsToLoad.length < announcementsPerPage) {
                hasMoreAnnouncements = false;
            } else {
                hasMoreAnnouncements = true;
                currentPage++;
            }
        });
}

// Συνάρτηση για να κατεβάσεις το αρχείο
function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// Συνάρτηση για τη δημιουργία XML από JSON
function jsonToXml(json) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<announcements>\n';
    json.forEach(announcement => {
        xml += '  <announcement>\n';
        for (const key in announcement) {
            xml += `    <${key}>${announcement[key]}</${key}>\n`;
        }
        xml += '  </announcement>\n';
    });
    xml += '</announcements>';
    return xml;
}

document.getElementById('export-json').addEventListener('click', () => {
    loadAnnouncements({}, 'json');
});

document.getElementById('export-xml').addEventListener('click', () => {
    loadAnnouncements({}, 'xml');
});


document.getElementById('apply-filters').addEventListener('click', () => {
    console.log("2");
    const anDateFrom = document.getElementById('filter-an-date-from').value;
    const anDateTo = document.getElementById('filter-an-date-to').value;
    const examDateFrom = document.getElementById('filter-exam-date-from').value;
    const examDateTo = document.getElementById('filter-exam-date-to').value;

    const filters = {
        anDateFrom,
        anDateTo,
        examDateFrom,
        examDateTo
    };

    loadAnnouncements(filters);
});

document.getElementById('clear-filters').addEventListener('click', () => {
    console.log("3");
    document.getElementById('filter-an-date-from').value = '';
    document.getElementById('filter-an-date-to').value = '';
    document.getElementById('filter-exam-date-from').value = '';
    document.getElementById('filter-exam-date-to').value = '';

    const filters = {
        anDateFrom: null,
        anDateTo: null,
        examDateFrom: null,
        examDateTo: null
    };
    console.log(filters);
    loadAnnouncements(filters); // Επαναφόρτωση χωρίς φίλτρα
});



// Αρχική φόρτωση ανακοινώσεων
loadAnnouncements();

