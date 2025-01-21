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
                            <div class="card h-100">
                                <img src="https://via.placeholder.com/150" class="card-img-top" alt="${announcement.title}">
                                <div class="card-body">
                                    <h5 class="card-title">${announcement.title}</h5>
                                    <p class="card-text">${announcement.details}</p>
                                    <a href="#" class="btn btn-primary">Read More</a>
                                </div>
                                <div class="card-footer">
                                    <small class="text-muted">Φοιτητής: ${announcement.student_name} ${announcement.student_surname}</small><br>
                                    <small class="text-muted">Επιβλέπων: ${announcement.professor_name} ${announcement.professor_surname}</small><br>
                                    <small class="text-muted">Ημερομηνία Εξέτασης: ${new Date(announcement.examination_date).toLocaleString()}</small><br>
                                    <small class="text-muted">Τύπος Εξέτασης: ${announcement.type_of_exam === 'online' ? 'Ηλεκτρονική' : announcement.type_of_exam === 'in-person' ? 'Δια ζώσης' : 'Άγνωστος τύπος'}</small><br>
                                    <small class="text-muted">Τοποθεσία Εξέτασης: ${announcement.examination_location}</small>
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