import { getList } from '../js/loader.js';

export async function renderPage(containerId = "content") {
    console.log("Rendering Users Page");
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="container mt-5">
            <h1 class="mb-4">User List</h1>
            <table class="table table-striped" id="userTable">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;

    try {
        let users = getList('users');

        let tbody = container.querySelector("#userTable tbody");
        tbody.innerHTML = "";

        users.forEach(user => {
            console.log("Adding user:", user);
            let tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Failed to load users:", e);
        container.innerHTML += `<p class="text-danger">Error loading users</p>`;
    }
}