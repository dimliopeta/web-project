let currentPage = 1;
const announcementsPerPage = 6;

// Συνάρτηση για τη φόρτωση των ανακοινώσεων από το JSON
function loadAnnouncements() {
    fetch('announcements.json')
        .then(response => response.json())
        .then(data => {
            const announcements = data.announcements;

            if (!Array.isArray(announcements)) {
                throw new Error('Το data.announcements δεν είναι πίνακας');
            }

            const startIndex = (currentPage - 1) * announcementsPerPage;
            const endIndex = startIndex + announcementsPerPage;
            const announcementsToLoad = announcements.slice(startIndex, endIndex);


            const container = document.getElementById('announcements-container');
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
                            <p class="text-muted"><strong>Ημερομηνία Εξέτασης:</strong> ${new Date(announcement.exam_date)}</p>
                            <p class="text-muted"><strong>Τύπος Εξέτασης:</strong> ${announcement.type_of_exam === 'online'
                                    ? 'Ηλεκτρονική'
                                    : announcement.type_of_exam === 'in-person'
                                        ? 'Δια ζώσης'
                                        : 'Άγνωστος τύπος'
                                }</p>
                            <p class="text-muted"><strong>Τοποθεσία Εξέτασης:</strong> ${announcement.examination_location}</p>
                        </div>
                        <div class="card-footer bg-light d-flex justify-content-end">
                            <p class="text-center">Ημερομηνία Δημοσίευσης Ανακοίνωσης: ${announcement.an_date}</p>
                        </div>
                    </div>
                </div>
`;


                container.innerHTML += card;
            });

            currentPage++;


        });
}

// Συνάρτηση για το infinite scroll
function infiniteScroll() {
    const scrollableHeight = document.documentElement.scrollHeight;
    const currentScroll = window.scrollY + window.innerHeight;

    if (currentScroll >= scrollableHeight - 100) {
        loadAnnouncements();
    }
}

// Αρχική φόρτωση ανακοινώσεων
loadAnnouncements();

// Ενεργοποίηση infinite scroll
window.addEventListener('scroll', infiniteScroll);