let currentPage = 1;
const announcementsPerPage = 6;
let hasMoreAnnouncements = true; // Μεταβλητή για να ελέγξουμε αν υπάρχουν περισσότερες ανακοινώσεις

function loadAnnouncements(filters = {}) {
    // Επαναφορά τρέχουσας σελίδας όταν αλλάζουν τα φίλτρα
    if (filters.anDateFrom || filters.anDateTo || filters.examDateFrom || filters.examDateTo) {
        currentPage = 1;
        hasMoreAnnouncements = true; // Επαναφορά της κατάστασης για περισσότερες ανακοινώσεις
    }

    fetch('announcements.json')
        .then(response => response.json())
        .then(data => {
            const announcements = data.announcements;
            if (!Array.isArray(announcements)) {
                throw new Error('Το data.announcements δεν είναι πίνακας');
            }

            // Φιλτράρισμα ανακοινώσεων
            const filteredAnnouncements = announcements.filter(announcement => {
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

            // Εάν δεν υπάρχουν περισσότερες ανακοινώσεις, σταματάμε τη φόρτωση
            if (filteredAnnouncements.length <= (currentPage - 1) * announcementsPerPage) {
                hasMoreAnnouncements = false;
            }

            // Φόρτωση των ανακοινώσεων για την τρέχουσα σελίδα
            const startIndex = (currentPage - 1) * announcementsPerPage;
            const endIndex = startIndex + announcementsPerPage;
            const announcementsToLoad = filteredAnnouncements.slice(startIndex, endIndex);

            const container = document.getElementById('announcements-container');
            if (currentPage === 1) {
                container.innerHTML = ''; // Καθαρισμός του περιεχομένου όταν γίνεται νέα φόρτωση
            }

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
                                    : 'Άγνωστος τύπος'
                            }</p>
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

            if (hasMoreAnnouncements) {
                currentPage++; // Αν υπάρχουν περισσότερες ανακοινώσεις, αυξάνουμε τη σελίδα
            }
        });
}

// Συνάρτηση για το infinite scroll
function infiniteScroll() {
    if (!hasMoreAnnouncements) return; // Αν δεν υπάρχουν περισσότερες ανακοινώσεις, σταματάμε τη φόρτωση

    const scrollableHeight = document.documentElement.scrollHeight;
    const currentScroll = window.scrollY + window.innerHeight;

    if (currentScroll >= scrollableHeight - 100) {
        loadAnnouncements();
    }
}

document.getElementById('apply-filters').addEventListener('click', () => {
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
    loadAnnouncements(filters); // Επαναφόρτωση χωρίς φίλτρα
});

// Αρχική φόρτωση ανακοινώσεων
loadAnnouncements();

// Ενεργοποίηση infinite scroll
window.addEventListener('scroll', infiniteScroll);
