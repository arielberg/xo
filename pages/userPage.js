import { getList , openPage, appendToList } from '../js/loader.js';
import { encrypt, decrypt } from '../js/AES_GCM.js';

export async function renderPage(containerId = "content", params) {
  
    const c = await encrypt('hello', params.user.password);
    const p = await decrypt(c, params.user.password); // 'hello'
    console.log(c,p);
    
}
