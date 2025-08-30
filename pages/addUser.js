import { getList , runScript, appendToList } from '../js/loader.js';

export async function renderPage(containerId = "content") {
    console.log("Rendering Users Page");
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="container mt-5">
            <h1 class="mb-4">Add User</h1>
            <div id="buttonContainer"></div>   
            <table class="table table-striped" id="userTable">
                <div style="margin-bottom: 10px;">
                    <input id="userName" type="text" placeholder="Name" />
                </div>
                <div style="margin-bottom: 10px;">
                    <input id="pass" type="text" placeholder="Sevcret" />
                </div>
                <button class="addButton">Add</button>
            </table>
        </div>
    `;
    container.querySelector('.addButton').onclick = () => {
       
        var user = {
            username: document.getElementById('userName').value,
            password: document.getElementById('pass').value 
        }
        appendToList('users', user);
        runScript('/users.js');  
    }
}
