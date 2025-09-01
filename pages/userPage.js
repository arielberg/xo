import { getList , runScript, appendToList } from '../js/loader.js';
import createCA from '../wasm/ssl/ca.js';

export async function run(containerId = "content", params) {
    var certInfo = "CN=My Test CA,O=Main,C=IL";

    const caModule = await createCA();
    const { certPem, keyPem } = caModule.generate_ca(3650, certInfo);
    console.log(certPem, keyPem);
    console.log(caModule.derive_public_pem(keyPem), certPem);
    
}
