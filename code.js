class person {
    constructor(settings) {
        for (let key in settings) {
            this[key] = settings[key];
        }
    }
}
var contacts = [];
function loadContacts() {
    var storedContacts = localStorage.getItem('contacts');
}
function viewContact(contact) {
    var properties = ['name', 'phonebook', 'hash', 'channel']; // fixed typo: 'channgel' → 'channel'
    var form = document.createElement('form');

    properties.forEach(prop => {
        var label = document.createElement('label');
        label.textContent = prop;
        label.setAttribute('for', prop);

        var input = document.createElement('input');
        input.type = 'text';
        input.name = prop;
        input.id = prop;

        form.appendChild(label);
        form.appendChild(document.createElement('br'));
        form.appendChild(input);
        form.appendChild(document.createElement('br'));
    });

}
function addContact(contact){
    var isNew = false;
    var properties = ['name', 'phonebook', 'hash', 'channel']; 
    if (typeof contact === 'undefined') {
        contact = {};
        isNew = true;
    } 
    else {
        properties.forEach(prop => {
            if (typeof contact[prop] === 'undefined') {
             //   contact[prop] = '';
            }
        });
    }
   
    var form = document.createElement('form');

    properties.forEach(prop => {
        var label = document.createElement('label');
        label.textContent = prop;
        label.setAttribute('for', prop);

        var input = document.createElement('input');
        input.type = 'text';
        input.name = prop;
        input.id = prop;

        form.appendChild(label);
        form.appendChild(document.createElement('br'));
        form.appendChild(input);
        form.appendChild(document.createElement('br'));
    });

    var submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'Add Contact';
    form.appendChild(submit);
    form.onsubmit = function(event) {
        contacts.push({
            name: document.getElementById('name').value,
            phonebook: document.getElementById('phonebook').value,
            hash: document.getElementById('hash').value,
            channel: document.getElementById('channel').value
        });
        localStorage.setItem('contacts', JSON.stringify(contacts));
        alert('Contact added successfully!');
    }
    document.getElementById('contact').innerHTML = ''; // clear previous content
    document.getElementById('contact').appendChild(form);
    setPage('contact');
}
function gotoHome() {
    setPage('list');
}

function setPage(page) {
    let pages = document.querySelectorAll('.page');
    pages.forEach(function(p) {
        p.style.display = 'none';
    });
    document.getElementById(page).style.display = 'block';
}

document.addEventListener("DOMContentLoaded", function() {
    contacts = JSON.parse(localStorage.getItem('contacts')) || [];

    contacts.forEach(function(p) {
        let div = document.createElement("div");
        div.onclick = function() {
            addContact(p);
            setPage('contact');
        };
        div.className = 'contact';
        div.innerHTML = `<strong>${p.name}</strong> from ${p.channel}`;
        document.getElementById('list').appendChild(div);
    });
    setPage('list');
});