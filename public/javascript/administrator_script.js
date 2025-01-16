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