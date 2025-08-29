import { getList , openPage } from '../js/loader.js';

export async function renderPage(containerId = "content") {
    console.log("Rendering Users Page");
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="container mt-5">
            <h1 class="mb-4">Add User</h1>
            <div id="buttonContainer"></div>   
            <table class="table table-striped" id="userTable">
                <input typwe="text" placeholder="Name" />
                <input typwe="text" placeholder="Sevcret" />
                <button class="addButton">Add</button>
            </table>
        </div>
    `;
    container.querySelector('.addButton').onclick = () => {
       alert("Add User Clicked");
    }
}
