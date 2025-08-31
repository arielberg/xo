import { getList , runScript, appendToList } from '../js/loader.js';
import createCA from '../wasm/ssl/ca.js';

export async function renderPage(containerId = "content", params) {
    const caModule = await createCA();
    const { certPem, keyPem } = caModule.generate_ca(3650);
    console.log(certPem, keyPem);
    
}
