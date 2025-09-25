import { getCurrentCertificate, getList, getCertificateId } from "../js/utils.js";
import { createOffer , acceptAnswer} from "../js/WebRtc.js";
import {importSettings} from "../pages/settings.js";
import {getOfferAnswer} from "../pages/offerAnswer.js"

// devScripts/deviceApi.js
// Expose local API (same-origin use)
console.log('Dev mode: device api loaded' );

  window.DeviceAPI = {
    ping() { return { ok: true, port: location.port || null }; },
    setTheme(mode) { document.documentElement.dataset.theme = mode; return "ok"; },
    clearAllData() { deleteAllData(); return "ok"; },   
    getUsers() { return getList("users"); },
    reload() { location.reload(); return "reloading"; },
    getUid() { var crt = getCurrentCertificate(); return getCertificateId(crt.cert); },
    importSettings(settingsData) { return importSettings(settingsData); },
    async offerAnswer(callerId, answer) {   
      var users = getList('users',[]);  
      //users.find(u=>u.id==callerId).cert
      const fullAnswer = await getOfferAnswer(callerId, answer);
      return { 
        uid: callerId,
        answer:JSON.stringify(fullAnswer)
      };
    },
    async processAnswer(userId, answer) { 
      return await acceptAnswer(userId, JSON.stringify(answer));
    },
    async getOffer(userId) { 
      var offer =  await createOffer(userId);
      return { uid:userId, 
               offer:JSON.stringify(offer)
              };
     }
  };
  
  // Cross-origin RPC server (for parent)
  window.addEventListener('message', e => {
    // only accept from the embedding parent
   
    const ref = document.referrer;
    if (!ref) return;
    const expected = new URL(ref).origin;
    if (e.origin !== expected) return;
  
    const msg = e.data || {};
    if (msg.type !== 'dev') return;

    const fn = window.DeviceAPI[msg.method];
    Promise.resolve(fn ? fn(...(msg.args || [])) : Promise.reject('no such method'))
      .then(result => {
        e.source.postMessage(
          { type: 'dev-response', id: msg.id, method: msg.method, result },
          e.origin
        )
      })
  //    .catch(err => e.source.postMessage({ id: msg.id, error: String(err) }, e.origin));
  });

  function deleteAllData() {
    localStorage.clear();
    sessionStorage.clear();
/*
    if (indexedDB && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        await Promise.all((dbs || []).map(d => d.name ? new Promise(res => {
        const req = indexedDB.deleteDatabase(d.name);
        req.onsuccess = req.onerror = req.onblocked = () => res();
        }) : Promise.resolve()));
    }
        
    if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
    }

    if (navigator.serviceWorker?.getRegistrations) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
    }
   */
  }