//--------------------------------------------- STARTUP SETTINGS & GLOBAL VARIABLES ---------------------------------------------
let currentPage = 1;
const announcementsPerPage = 6;
let hasMoreAnnouncements = true;

//--------------------------------------------- FUNCTIONS TO LOAD AND HANDLE ANNOUNCEMENTS ---------------------------------------------
//-------------- Function to Load Announcements -------------
function loadAnnouncements(filters = {}, exportFormat = null) {

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

            let filteredAnnouncements = announcements;
            if (Object.values(filters).some(filter => filter !== null && filter !== '')) {
                filteredAnnouncements = announcements.filter(announcement => {
                    let match = true;

                    if (filters.anDateFrom && new Date(announcement.an_date) < new Date(filters.anDateFrom)) {
                        match = false;
                    }
                    if (filters.anDateTo && new Date(announcement.an_date) > new Date(filters.anDateTo)) {
                        match = false;
                    }

                    if (filters.examDateFrom && new Date(announcement.exam_date) < new Date(filters.examDateFrom)) {
                        match = false;
                    }
                    if (filters.examDateTo && new Date(announcement.exam_date) > new Date(filters.examDateTo)) {
                        match = false;
                    }

                    return match;
                });
            }
            const startIndex = (currentPage - 1) * announcementsPerPage;
            const endIndex = startIndex + announcementsPerPage;
            const announcementsToLoad = filteredAnnouncements.slice(startIndex, endIndex);
            const container = document.getElementById('announcements-container');

            if (currentPage === 1) {
                container.innerHTML = '';
            }
            if (exportFormat === null) {
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
            }
            if (exportFormat === 'xml') {
                generateXmlFeed(filteredAnnouncements);
            }
            if (exportFormat === 'json') {
                generateJsonFeed(filteredAnnouncements);
            }

            if (exportFormat === null) {
                if (announcementsToLoad.length < announcementsPerPage) {
                    hasMoreAnnouncements = false;
                } else {
                    hasMoreAnnouncements = true;
                    currentPage++;
                }
            }

            // If more pages exist add the "Load more" button
            if (hasMoreAnnouncements) {
                const loadMoreButton = document.getElementById('load-more-button');
                loadMoreButton.style.display = 'block';
            } else {
                const loadMoreButton = document.getElementById('load-more-button');
                loadMoreButton.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Σφάλμα κατά τη λήψη των ανακοινώσεων:', error);
        });
}
//-------------- Function for XML Feed  -------------
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
    const filters = getFilterValues()
}
//-------------- Function for JSON Feed -------------
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
    const filters = getFilterValues()
}
//-------------- Function to get Filters -------------
function getFilterValues() {
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



//--------------------------------------------- EVENT LISTENERS ---------------------------------------------
document.getElementById('export-json').addEventListener('click', () => {
    const filters = getFilterValues();
    loadAnnouncements(filters, 'json');
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
    loadAnnouncements(filters);
});



//--------------------------------------------- RUN FUNCTIONS AFTER DOM ---------------------------------------------
//------------------------------ Load functions after DOM is loaded ------------------------------
loadAnnouncements();

