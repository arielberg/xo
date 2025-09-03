import { getList , runScript } from '../js/loader.js';
import { createOffer, acceptAnswer, onPeerEvents } from '../js/WebRtc.js';
import { b64urlEncode, b64urlDecode, getCurrentCertificate , getIconButton } from '../js/utils.js';

export async function run(containerId = "content") {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="container mt-5">
      <style>
        .page-actions { display:flex; justify-content:flex-end; margin-bottom:16px; }
        .btn { display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border:1px solid #222; border-radius:10px; cursor:pointer; text-decoration:none; }
        .btn.primary { background:#111; color:#fff; }
        .list { display:grid; gap:12px; }
        .card { border:1px solid #e5e7eb; border-radius:14px; padding:14px; display:flex; flex-wrap:wrap; align-items:flex-start; gap:12px; }
        .username { min-width:180px; border:0; border-bottom:1px dashed #bbb; padding:4px 2px; background:transparent; }
        .muted { color:#6b7280; font-size:12px; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
        .pill { font-size:12px; border:1px solid #ddd; border-radius:999px; padding:2px 8px; }
        .full { width:100%; }
      </style>

      <h1 class="mb-3">User List</h1>
      <div class="page-actions">
        <button class="btn primary" id="btnAdd">Add User</button>
      </div>

      <div id="userTable" class="list"></div>
    </div>
  `;

  container.querySelector('#btnAdd').onclick = () => runScript('/pages/addUser.js');

  try {
    const users = getList('users') || [];
    const list = container.querySelector("#userTable");
    list.innerHTML = "";

    
    users.forEach(user => {
      
      const row = document.createElement("div");
      row.className = "card";

      const nameInput = document.createElement("input");
      nameInput.className = "username";
      nameInput.value = user.username ?? "";
      nameInput.title = "Click to edit";
      row.appendChild(nameInput);

      const statusPill = document.createElement('span');
      statusPill.className = 'pill muted';
      statusPill.textContent = 'idle';
      row.appendChild(statusPill);

      // Single action button: generate & copy invite link
      const inviteBtn = getIconButton('Refresh', 'Connect');
      row.appendChild(inviteBtn);

      // Link area (hidden after copy)
      const linkArea = document.createElement('input');
      linkArea.className = 'mono full';
      linkArea.readOnly = true;
      linkArea.placeholder = 'Invitation link will appear here...';
      linkArea.style.display = 'none';
      row.appendChild(linkArea);

      // Answer area and process button (appear after copying)
      const answerArea = document.createElement('textarea');
      if ( user.offer ) {
      //  console.log(user.offer);
        acceptAnswer(JSON.stringify(user.offer)).then((a) => {
          console.log('Answer applied from stored offer');
          console.log(a);
        }).catch((e)=> {
          console.error('Failed to apply stored offer:', e);
        });
       // pc.setRemoteDescription(offerObj.offer);
      }
      answerArea.className = 'mono full';
      answerArea.rows = 6;
      answerArea.placeholder = 'Paste the base64url answer here...';
      answerArea.style.display = 'none';
      row.appendChild(answerArea);

      const processBtn = document.createElement('button');
      processBtn.className = 'btn';
      processBtn.textContent = 'Process Answer';
      processBtn.style.display = 'none';
      row.appendChild(processBtn);

      const logBox = document.createElement('textarea');
      logBox.className = 'mono full';
      logBox.rows = 6;
      logBox.readOnly = true;
      logBox.style.display = 'none';
      logBox.placeholder = 'Connection logs will appear here...';
      row.appendChild(logBox);

      const statusText = document.createElement('div');
      statusText.className = 'muted full';
      row.appendChild(statusText);

      const log = (...args) => {
        logBox.style.display='block';
        const line = args.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
        logBox.value += (logBox.value?'\n':'') + line;
        logBox.scrollTop = logBox.scrollHeight;
      };

      const bindPeerDebug = () => {
        try {
          onPeerEvents?.({
            onice: (state) => { log('[pc] ice:', state); statusPill.textContent = state; },
            onconn: (state) => { 
               
                if (state === 'connected') {
                  //  runScript('/apps/chat.js');
                }
            }
          });
        } catch {}
      };

      inviteBtn.onclick = async () => {
        try {
          inviteBtn.disabled = true;
          statusPill.textContent = 'creating offer...';
          statusText.textContent = '';

          const offerRes = await createOffer(user.id);
          const offerObj = offerRes?.type ? offerRes : (offerRes?.fullOffer ?? offerRes);
          
          var currentCertificate = getCurrentCertificate();

          var offerWrap = {
            offer:offerObj,
            username: nameInput.value.trim() || '', 
            cert: currentCertificate?.cert
          };

          const encoded = b64urlEncode(JSON.stringify(offerWrap));

          bindPeerDebug();

          const link = `${location.origin}${location.pathname}?offer=${encoded}`;
          linkArea.value = link;
          linkArea.style.display = '';

          // Copy immediately
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(link);
          } else {
            linkArea.select();
            document.execCommand('copy');
          }

          inviteBtn.style.display = 'none';
          statusPill.textContent = 'link copied — waiting for answer';
          statusText.textContent = 'Share the link. When you receive the base64url answer, paste it below and click Process.';
          answerArea.style.display = '';
          processBtn.style.display = 'inline-flex';
        } catch (e) {
          console.error('Failed to generate/copy invite link:', e);
          statusPill.textContent = 'error';
          statusText.textContent = e?.message || 'Error generating link';
          inviteBtn.disabled = false;
        }
      };

      processBtn.onclick = async () => {
        try {
          const encodedAnswer = (answerArea.value || '').trim();
          if (!encodedAnswer) { statusText.textContent = 'No answer pasted.'; return; }
          statusText.textContent = 'Applying answer...';

          const answerJson = b64urlDecode(encodedAnswer);
          const parsedAnswer = JSON.parse(answerJson);
          console.log(user);
          await acceptAnswer(user.id, parsedAnswer.answer); // expects JSON string of RTCSessionDescriptionInit

          bindPeerDebug(); // rebind in case pc was recreated internally

          statusText.textContent = 'Answer applied. Waiting for connection...';
          log('[ok] answer applied');
          processBtn.disabled = true;
        } catch (e) {
          console.error('Failed to apply answer:', e);
          statusText.textContent = 'Error applying answer';
          log('[err]', e?.message || e);
        }
      };

      list.appendChild(row);
    });

    if (!users.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = "No users yet. Click 'Add User' to create one.";
      list.appendChild(empty);
    }
  } catch (e) {
    console.error("Failed to load users:", e);
    container.innerHTML += `<p class="text-danger">Error loading users</p>`;
  }
}
