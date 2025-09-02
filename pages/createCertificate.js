import { getList , runScript, appendToList } from '../js/loader.js';
import createCA from '../wasm/ssl/ca.js';


export async function run(containerId = "content", queryParams = {}) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
    <div class="container mt-5">
        <h1 class="mb-4">Username</h1>
          
        <input type='text' id='certInfo' />
        <div id="buttonContainer" style="margin-top:10px"></div> 
    </div>`;
    
    var addButton = document.createElement("button");
    addButton.textContent = "Enter";
    var called = false
    addButton.onclick = async () => {
        if (called) return;
        called = true;
        addButton.disabled = true;
        var certInfo = document.getElementById('certInfo');
        var username = certInfo.value;
        certInfo.disabled = true;
        
        var certInfo = "CN="+username+",O=Main,C=IL";
        const caModule = await createCA();
        const { certPem, keyPem } = caModule.generate_ca(3650,certInfo );
        console.log(certPem, keyPem);
        appendToList('certificates', {cert:certPem, key:keyPem, active:true, username:username } );
        if( queryParams.has('offer') ) {
            runScript('/pages/offerAnswer.js');
        }
        else {
            runScript('/pages/settings.js');
        }
    }

    container.querySelector('#buttonContainer').appendChild(addButton);
    
}
