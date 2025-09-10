import { runScript, getCurrentPage } from '../js/loader.js';
import createCA from '../wasm/ssl/ca.js';
import {getList, getCertificateId, appendToList} from '../js/utils.js';


export async function run(containerId = "content", queryParams = {}) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
    <div class="container mt-5">
        <h1 class="mb-4">Test</h1>
          
        <input type='text' id='certInfo' />
        <div id="buttonContainer" style="margin-top:10px"></div> 
    </div>`;

    var btn = document.createElement('button');
    btn.innerHTML = "click";
    const caModule = await createCA();

    btn.onclick = ()=>{
        var users = getList('users',[]);
      //  console.log(caModule.rsa_encrypt_b64(users[0].cert,document.getElementById('certInfo').value));
        getCertificateId(users[0].cert).then(s=>console.log(s));
    }
    document.getElementById('buttonContainer').appendChild(btn);
}