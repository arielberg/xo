import { getList , runScript } from '../js/loader.js';

export async function renderPage(containerId = "content") {
    console.log("Rendering Users Page");
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="container mt-5">
            <h1 class="mb-4">User List</h1>
            <div id="buttonContainer"></div>   
            <div id="userTable"> </div>
        </div>
    `;

    var addButton = document.createElement("button");
    addButton.textContent = "Add User";
    addButton.onclick = () => {
       runScript('/addUser.js');
    }
    container.querySelector('#buttonContainer').appendChild(addButton);
    
    try {
        let users = getList('users');

        let tbody = container.querySelector("#userTable");
        tbody.innerHTML = "";

        users.forEach(user => {
            console.log("Adding user:", user);
            let div = document.createElement("div");
            div.style='padding: 8px; border-bottom: 1px solid #ccc;';
            div.innerHTML = `${user.username}`;
            div.onclick = () => {
                runScript(`/userPage.js`,{user:user});
            }
            tbody.appendChild(div);
        });
    } catch (e) {
        console.error("Failed to load users:", e);
        container.innerHTML += `<p class="text-danger">Error loading users</p>`;
    }
    
}

