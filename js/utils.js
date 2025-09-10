import { getCached, overrideCache, cacheVar } from './loader.js';


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
  const label = title || iconName;
  if (label) btn.title = label;
  btn.setAttribute('aria-label', label);

  // נטען את ה־SVG; אם נכשל – ניפול לטקסט
  (async () => {
    try {
      const url = `../icons/${encodeURIComponent(iconName)}.svg`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const svg = await res.text();

      btn.innerHTML = svg;
      const svgEl = btn.querySelector('svg');
      if (svgEl) {
        // צבע לבן וגודל
        svgEl.setAttribute('fill', 'currentColor');
        svgEl.style.width = '20px';
        svgEl.style.height = '20px';
        btn.style.color = '#fff'; // הופך את הצבע בפועל ללבן
      }
    } catch (e) {
      // Fallback לטקסט אם הקובץ לא נמצא / שגיאת רשת
      btn.textContent = label;
    }
  })();

  return btn;
}

  export function removeFromList(type, item ) {
    let list = getList(type, []);
    const index = list.findIndex(u => u.id === item.id);

    if (index !== -1) {
      list.splice(index, 1);
      return overrideCache(type, list);
    } 
    return list;
  }
  export function getList(type, defaultReturn = [], skipLoadingJson = false) {
      // 1. check cache
      var data = getCached(type );
      if ( data ) return data;
      // 3. check file
      let newVal = defaultReturn;
      if ( !skipLoadingJson ) {
          try {
              let xhr = new XMLHttpRequest();
              xhr.open("GET", `data/${type}.json`, false); // סינכרוני – רק לשימוש פשוט
              xhr.send(null);
  
              if (xhr.status === 200) {
                 newVal = JSON.parse(xhr.responseText);                
              } else {
                  console.error(`Failed loading data/${type}.json (status ${xhr.status})`);
              }
          } catch (err) {
              console.error(`Error loading data/${type}.json`, err);
          }
      }
      
      // 4. default
      return overrideCache(type, newVal);
  }
  export function refresh() {
    window.location.reload();
  }
  export function appendToList(type, newItem, keys = [], override = true) {
      // נטען את הרשימה הקיימת
      let currentList = getList(type, []);
  
      // נבדוק אם יש כבר פריט זהה לפי כל המפתחות
      let index = -1;
      if ( keys.length ) {
        index = currentList.findIndex(item =>
          keys.every(key => item[key] === newItem[key])
        );
      }
  
      if (index !== -1) {
          if ( override ) {
          // אם קיים → עדכון הפריט
              currentList[index] = { ...currentList[index], ...newItem };
              console.log(`Updated item in ${type}:`, newItem);
          }
      } else {
          // אם לא קיים → הוספה
          currentList.push(newItem);
          console.log(`Appended item to ${type}:`, newItem);
      }
  
      cacheVar(type, currentList);
  
      return currentList;
  }