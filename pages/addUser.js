import { getList , runScript, appendToList } from '../js/loader.js';

export async function run(containerId = "content") {
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
                <button class="addButton">Add</button>
            </table>
        </div>
    `;
    container.querySelector('.addButton').onclick = () => {
        var certInfo = getList('certificates').find( c => c.active );
        if( !certInfo ) {
            certInfo = getList('certificates').find( c => true );
        }
        var user = {
            username: certInfo.username
        }
        appendToList('users', user);
        runScript('/pages/users.js');  
    }
}
