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
            alert('Logout failed');
        }
    })
    .catch(err => console.error('Error:', err));
});


document.addEventListener('DOMContentLoaded', loadTheses);