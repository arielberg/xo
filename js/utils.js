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

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export async function getCertificateId(pem) {
  const b64 = pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "")
                 .replace(/\s+/g, "");
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

  const digest = await crypto.subtle.digest("SHA-256", bytes.buffer);
  const hashBytes = new Uint8Array(digest);

  const shortBytes = hashBytes.slice(0, 10);

  return toBase58(shortBytes);
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function toBase58(bytes){
  let x = BigInt('0x' + Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join(''));
  let out = '';
  while (x > 0n) { const r = x % 58n; x = x / 58n; out = B58[Number(r)] + out; }
  // תמיכה ב־0x00 מוביל (לא רלוונטי פה לרוב)
  const leadingZeros = bytes.findIndex(b => b !== 0);
  return (leadingZeros === -1 ? '1'.repeat(bytes.length) : '1'.repeat(Math.max(0, leadingZeros))) + out;
}

export function getIconButton(iconName, title = '') {
    const btn = document.createElement('button');
    btn.type = 'button';
    if (title) btn.title = title;
  
    // Load the SVG inline (requires bundler support like Vite: import.meta.glob)
    fetch(`../icons/${iconName}.svg`)
      .then(res => res.text())
      .then(svg => {
        btn.innerHTML = svg;
        const svgEl = btn.querySelector('svg');
        if (svgEl) {
          svgEl.setAttribute('fill', 'white');     // force fill
          svgEl.style.width = '20px';              // optional
          svgEl.style.height = '20px';
        }
      });
  
    return btn;
  }