let currentPage = 1;
const announcementsPerPage = 6;
let hasMoreAnnouncements = true;

function loadAnnouncements(filters = {}, exportFormat = null) {
    console.log("Φόρτωση ανακοινώσεων με φίλτρα:", filters);

    // Επαναφορά της τρέχουσας σελίδας όταν αλλάζουν τα φίλτρα
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
        if (!Array.isArray(announcements)) {
            throw new Error('Το data.announcements δεν είναι πίνακας');
        }

        // Εφαρμογή φίλτρων
        let filteredAnnouncements = announcements;
        if (Object.values(filters).some(filter => filter !== null && filter !== '')) {
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

        console.log('Φιλτραρισμένες ανακοινώσεις:', filteredAnnouncements);

        // Υπολογισμός του τρέχοντος εύρους
        const startIndex = (currentPage - 1) * announcementsPerPage;
        const endIndex = startIndex + announcementsPerPage;
        const announcementsToLoad = filteredAnnouncements.slice(startIndex, endIndex);

        console.log('Ανακοινώσεις προς φόρτωση:', announcementsToLoad);

        const container = document.getElementById('announcements-container');

        // Καθαρισμός του container μόνο στην πρώτη σελίδα
        if (currentPage === 1) {
            container.innerHTML = '';
        }

        // Δημιουργία κάρτας για κάθε ανακοίνωση
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

        if (exportFormat === 'xml') {
            generateXmlFeed(filteredAnnouncements); // Δημιουργία του XML
        }

        if (exportFormat === 'json') {
            generateJsonFeed(filteredAnnouncements); // Δημιουργία του JSON
        }    

        // Ενημέρωση κατάστασης για περισσότερες σελίδες
        if (announcementsToLoad.length < announcementsPerPage) {
            hasMoreAnnouncements = false;
        } else {
            hasMoreAnnouncements = true;
            currentPage++;
        }

        // Αν υπάρχουν περισσότερες σελίδες, προσθέτουμε το κουμπί "Επόμενη Σελίδα"
        if (hasMoreAnnouncements) {
            const loadMoreButton = document.getElementById('load-more-button');
            loadMoreButton.style.display = 'block'; // Εμφανίζουμε το κουμπί
        } else {
            const loadMoreButton = document.getElementById('load-more-button');
            loadMoreButton.style.display = 'none'; // Κρύβουμε το κουμπί όταν δεν υπάρχουν περισσότερες σελίδες
        }
    })
    .catch(error => {
        console.error('Σφάλμα κατά τη λήψη των ανακοινώσεων:', error);
    });
}

function generateXmlFeed(filteredAnnouncements) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<announcements>\n';

    filteredAnnouncements.forEach(announcement => {
        xml += `
        <announcement>
            <title>${announcement.title}</title>
            <student_name>${announcement.student_name}</student_name>
            <committee_members>
                <member>${announcement.professor_name}</member>
                <member>${announcement.committee_member1_name}</member>
                <member>${announcement.committee_member2_name}</member>
            </committee_members>
            <exam_date>${new Date(announcement.exam_date).toISOString()}</exam_date>
            <exam_type>${announcement.type_of_exam}</exam_type>
            <examination_location>${announcement.examination_location}</examination_location>
            <announcement_date>${new Date(announcement.an_date).toISOString()}</announcement_date>
        </announcement>\n`;
    });

    xml += '</announcements>';

    const xmlBlob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(xmlBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'announcements.xml';
    a.click();
}

function generateJsonFeed(filteredAnnouncements) {
    const jsonFeed = filteredAnnouncements.map(announcement => ({
        title: announcement.title,
        student_name: announcement.student_name,
        committee_members: [
            announcement.professor_name,
            announcement.committee_member1_name,
            announcement.committee_member2_name
        ],
        exam_date: new Date(announcement.exam_date).toISOString(),
        exam_type: announcement.type_of_exam,
        examination_location: announcement.examination_location,
        announcement_date: new Date(announcement.an_date).toISOString(),
    }));

    const jsonBlob = new Blob([JSON.stringify(jsonFeed, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(jsonBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'announcements.json';
    a.click();
}


function getFilterValues(){
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
    return filters;
}

document.getElementById('export-json').addEventListener('click', () => {
    const filters = getFilterValues();
    loadAnnouncements( filters, 'json');
});

document.getElementById('export-xml').addEventListener('click', () => {
    const filters = getFilterValues();
    loadAnnouncements(filters, 'xml');
});


document.getElementById('apply-filters').addEventListener('click', () => {
    const filters = getFilterValues();
    loadAnnouncements(filters);
});

document.getElementById('clear-filters').addEventListener('click', () => {
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

