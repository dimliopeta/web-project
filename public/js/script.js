document.getElementById('thesisForm').addEventListener('submit', function (e) {
    e.preventDefault(); // Αποτροπή της παραδοσιακής υποβολής φόρμας

    const title = document.getElementById('title').value;
    const summary = document.getElementById('summary').value;
    const token = localStorage.getItem('token'); // Ανάκτηση του token από το localStorage

    // Δημιουργία ενός AJAX request με Fetch API
    fetch('/api/theses/new', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', // Ορίζουμε το περιεχόμενο ως JSON
            'Authorization': `Bearer ${token}` // Προσθήκη του token στο header
        },
        body: JSON.stringify({
            title: title,
            summary: summary
        })
    })
    .then(response => response.json()) // Μετατροπή της απάντησης σε JSON
    .then(data => {
        if (data.success) {
            console.log('Success:', data);
            alert(data.message); // Εμφάνιση μηνύματος επιτυχίας

            // Καθαρίζουμε τη φόρμα
            document.getElementById('title').value = '';
            document.getElementById('summary').value = '';

            // Επαναφόρτωση της λίστας διπλωματικών
            loadTheses();
        } else {
            alert('Σφάλμα: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Σφάλμα: Κάτι πήγε στραβά!');
    });
});


// Συνάρτηση για φόρτωση των διπλωματικών
function loadTheses() {
    const token = localStorage.getItem('token'); // Ανάκτηση του token από το localStorage

    fetch('/api/theses', {
        headers: {
            'Authorization': `Bearer ${token}` // Προσθήκη του token στο header
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const thesesList = document.querySelector('#theses ul');
            thesesList.innerHTML = ''; // Καθαρίζουμε το υπάρχον περιεχόμενο

            data.theses.forEach((thesis, index) => {
                let status = ""; // Δημιουργούμε τη μεταβλητή status εκτός του switch

                switch (thesis.status) {
                    case 'active':
                        status = "Ενεργή";
                        break; 
                    case 'to-be-reviewed':
                        status = "Υπό Εξέταση";
                        break; 
                    case 'completed':
                        status = "Περατωμένη";
                        break;
                    default:
                        status = "Υπό Ανάθεση";
                }

                const listItem = document.createElement('li');
                listItem.className = 'list-group-item';
                listItem.textContent = `Διπλωματική ${index + 1}: ${thesis.title} - ${thesis.summary} - Κατάσταση: ${status}`;
                thesesList.appendChild(listItem);
            });
        }
    })
    .catch(err => console.error('Σφάλμα φόρτωσης διπλωματικών:', err));
}

document.addEventListener('DOMContentLoaded', loadTheses);
