import { getList } from './loader.js';


// עוזרות ל-base64url כששולחים/מקבלים SDP
export function b64urlEncode(str) {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}

export function b64urlDecode(b64u) {
    const pad = b64u.length % 4 === 2 ? '==' : b64u.length % 4 === 3 ? '=' : '';
    const b64 = b64u.replace(/-/g,'+').replace(/_/g,'/') + pad;
    return decodeURIComponent(escape(atob(b64)));
}

export function getCurrentCertificate() {
    let certList = getList('certificates');
    
    let certInfo = certList.find( c => c.active );
    console.log("Current certificate:", certInfo );
    if( !certInfo ) {
     certInfo = certList.find( c => true );
    }
    return certInfo;
}