import { getList , runScript } from '../js/loader.js';
import { createOffer } from '../js/WebRtc.js';
import { b64urlDecode, b64urlEncode } from '../js/utils.js';

export async function run(containerId = "content") {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="container mt-5">
      <style>
        .page-actions { display:flex; justify-content:flex-end; margin-bottom:16px; }
        .btn { display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border:1px solid #222; border-radius:10px; cursor:pointer; text-decoration:none; }
        .btn.primary { background:#111; color:#fff; }
        .btn.ghost { background:#fff; color:#111; }
        .list { display:grid; gap:12px; }
        .card { border:1px solid #e5e7eb; border-radius:14px; padding:14px; display:flex; flex-wrap:wrap; align-items:center; gap:10px; }
        .username { min-width:180px; border:0; border-bottom:1px dashed #bbb; padding:4px 2px; background:transparent; }
        .linkwrap { flex:1; min-width:260px; display:flex; gap:8px; align-items:center; }
        .linkwrap input { flex:1; padding:8px; border:1px solid #ddd; border-radius:10px; background:#fafafa; }
        .muted { color:#6b7280; font-size:12px; }
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

      // שם משתמש (עריך-במקום)
      const nameInput = document.createElement("input");
      nameInput.className = "username";
      nameInput.value = user.username ?? "";
      nameInput.title = "Click to edit";
      row.appendChild(nameInput);

      // אזור לינק + כפתורים
      const linkWrap = document.createElement("div");
      linkWrap.className = "linkwrap";

      const linkInput = document.createElement("input");
      linkInput.readOnly = true;
      linkInput.placeholder = "Invitation link will appear here...";
      linkWrap.appendChild(linkInput);

      const genBtn = document.createElement("button");
      genBtn.className = "btn ghost";
      genBtn.textContent = "Generate";
      linkWrap.appendChild(genBtn);

      const copyBtn = document.createElement("button");
      copyBtn.className = "btn ghost";
      copyBtn.textContent = "Copy";
      copyBtn.disabled = true; // עד שיש לינק
      linkWrap.appendChild(copyBtn);

      row.appendChild(linkWrap);

      const hint = document.createElement("div");
      hint.className = "muted";
      hint.textContent = "Generates a WebRTC offer and builds a shareable link (?offer=...)";
      row.appendChild(hint);

      // לוגיקה: יצירת לינק
      genBtn.onclick = async () => {
        genBtn.disabled = true;
        genBtn.textContent = "Generating...";
        try {
          // תומך בשתי הגרסאות: או שמחזיר RTCSessionDescriptionInit, או אובייקט עם fullOffer
          const offerRes = await createOffer();
          const offerObj = offerRes?.type ? offerRes : (offerRes?.fullOffer ?? offerRes);
          const encoded = b64urlEncode(JSON.stringify(offerObj));
          const link = `${location.origin}${location.pathname}?offer=${encoded}`;
          linkInput.value = link;
          copyBtn.disabled = false;
        } catch (e) {
          console.error("Failed to generate offer:", e);
          linkInput.value = "Error generating offer";
          copyBtn.disabled = true;
        } finally {
          genBtn.disabled = false;
          genBtn.textContent = "Generate";
        }
      };

      // לוגיקה: העתקה ללוח
      copyBtn.onclick = async () => {
        const text = linkInput.value.trim();
        if (!text) return;
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
          } else {
            // נפילה: סימון והעתקה ידנית
            linkInput.select();
            document.execCommand('copy');
          }
          const prev = copyBtn.textContent;
          copyBtn.textContent = "Copied!";
          setTimeout(() => (copyBtn.textContent = prev), 900);
        } catch (e) {
          console.warn("Clipboard not available, showing selection for manual copy.");
          linkInput.focus();
          linkInput.select();
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
