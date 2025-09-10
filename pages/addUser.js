// /pages/addUser.js
import { runScript } from '../js/loader.js';
import { ConvertTempToUID, createOffer, acceptAnswer, onPeerEvents } from '../js/WebRtc.js';
import { appendToList, b64urlEncode, b64urlDecode, getCertificateId , getCurrentCertificate } from '../js/utils.js';

export async function getInviteUserLink(username) {
  const currentCertificate = getCurrentCertificate?.() || {};

  let tempUid = "10000000100040008000".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
  // create offer
  const offerRes = await createOffer(tempUid);
  const offerObj = offerRes?.type ? offerRes : (offerRes?.fullOffer ?? offerRes);

  // include current certificate (if any)
  
  const offerWrap = {
    offer: offerObj,
    username: currentCertificate?.username,
    isNew: true,
    cert: currentCertificate?.cert
  };

  const encoded = b64urlEncode(JSON.stringify(offerWrap));

  const url = `${location.origin}${location.pathname}?offer=${b64urlEncode(JSON.stringify(offerWrap))}`;
  return { url, tempUid };
}

export async function run(containerId = "content") {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div class="container mt-5">
      <style>
        .btn { display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border:1px solid #222; border-radius:10px; cursor:pointer; text-decoration:none; }
        .btn.primary { background:#111; color:#fff; }
        .row { margin:10px 0; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
        .muted { color:#6b7280; font-size:12px; }
        .pill { font-size:12px; border:1px solid #ddd; border-radius:999px; padding:2px 8px; margin-left:8px; }
        .full { width:100%; }
      </style>

      <h1 class="mb-4">Add User & Invite</h1>

      <div class="row">
        <input id="userName" type="text" placeholder="Name" style="padding:8px;border:1px solid #ddd;border-radius:8px;min-width:240px;" />
        <button id="createInvite" class="btn primary" style="margin-left:8px;">Create Invitation</button>
        <span id="statusPill" class="pill muted">idle</span>
      </div>

      <div class="row">
        <input id="inviteLink" class="mono full" readonly placeholder="Invitation link will appear here..." style="display:none;padding:8px;border:1px solid #ddd;border-radius:10px;background:#fafafa;" />
      </div>

      <div class="row" id="answerWrap" style="display:none;">
        <div class="muted" style="margin-bottom:6px;">Paste the <strong>b64url answer</strong> you received:</div>
        <textarea id="answerBox" rows="6" class="mono full" placeholder="Paste answer here..." style="padding:8px;border:1px solid #ddd;border-radius:10px;background:#fafafa;"></textarea>
        <div style="margin-top:8px;display:flex;gap:8px;">
          <button id="processAnswer" class="btn">Process Answer</button>
          <button id="backToUsers" class="btn">Back to Users</button>
        </div>
      </div>

      <div class="row">
        <textarea id="logs" rows="6" class="mono full" readonly placeholder="Logs..." style="display:none;padding:8px;border:1px solid #ddd;border-radius:10px;background:#fafafa;"></textarea>
      </div>
    </div>
  `;

  const nameInput = el.querySelector('#userName');
  const btnCreate  = el.querySelector('#createInvite');
  const pill       = el.querySelector('#statusPill');
  const linkInput  = el.querySelector('#inviteLink');
  const answerWrap = el.querySelector('#answerWrap');
  const answerBox  = el.querySelector('#answerBox');
  const btnProcess = el.querySelector('#processAnswer');
  const btnBack    = el.querySelector('#backToUsers');
  const logs       = el.querySelector('#logs');

  const log = (...args) => {
    logs.style.display = 'block';
    const line = args.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
    logs.value += (logs.value ? '\n' : '') + line;
    logs.scrollTop = logs.scrollHeight;
  };

  var tempUid;
  
  btnCreate.onclick = async () => {
    try {
      const username = (nameInput.value || '').trim();
      if (!username) { nameInput.focus(); return; }

      btnCreate.disabled = true;
      pill.textContent = 'creating offer...';
      var res = await getInviteUserLink(username);

      tempUid = res.tempUid;
      linkInput.value = res.url;
      linkInput.style.display = '';

      /*
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(res.url);
      } else {
        linkInput.select(); document.execCommand('copy');
      }
      */

      pill.textContent = 'link copied — waiting for answer';
      answerWrap.style.display = '';

    } catch (e) {
      console.error('Failed to create/copy invite:', e);
      pill.textContent = 'error';
      log(e?.message || String(e));
      btnCreate.disabled = false;
    }
  };

  btnProcess.onclick = async () => {
    try {
      const encodedAnswer = (answerBox.value || '').trim();
      if (!encodedAnswer) { log('No answer pasted.'); return; }

      log('Applying answer...');
      pill.textContent = 'applying answer...';

      const answerJson = b64urlDecode(encodedAnswer);
      const parsedAnswer = JSON.parse(answerJson);
      await acceptAnswer(tempUid, parsedAnswer.answer);
     
      pill.textContent = 'answer applied — connecting...';
      log('[ok] answer applied');
      btnProcess.disabled = true;

      let newUserId = await getCertificateId(parsedAnswer.cert);
      
      ConvertTempToUID(tempUid, newUserId);
      // Add to list immediately (if desired)
      appendToList('users', { 
        username: nameInput.value, 
        id: newUserId,
        cert:parsedAnswer.cert 
      });

    } catch (e) {
      console.error('Failed to apply answer:', e);
      pill.textContent = 'error';
      log('[err]', e?.message || String(e));
    }
  };

  btnBack.onclick = () => runScript('/pages/users.js');
}
