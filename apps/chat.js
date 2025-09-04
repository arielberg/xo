// Minimal chat page: send/receive over an existing WebRTC DataChannel
import { getCurrentCertificate } from '../js/utils.js';
import { sendMessage } from '../js/WebRtc.js';

var userId;
export async function run(containerId = 'content', params = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const { peerId, username } = params; // ← מגיע מ-runScript
  const peerLabel = username || peerId || 'peer';
  
  userId = peerId;

  el.innerHTML = `
    <div style="max-width:720px;margin:24px auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font:14px system-ui, sans-serif;">
      <div style="padding:10px 12px;border-bottom:1px solid #e5e7eb;display:flex;gap:8px;align-items:center;">
        <strong>Mini Chat</strong>
        <span style="color:#6b7280;">&nbsp;•&nbsp;${peerLabel}</span>
        <span id="st" style="margin-left:auto;color:#6b7280;">connecting…</span>
      </div>
      <div style="height:50vh;overflow:auto;background:#fafafa;padding:10px;">
        <pre id="log" style="margin:0;white-space:pre-wrap;word-break:break-word;"></pre>
      </div>
      <div style="display:flex;gap:8px;padding:10px;border-top:1px solid #e5e7eb;">
        <input id="msg" type="text" placeholder="Type and Enter…" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:8px;" />
        <button id="send" style="padding:10px 14px;border:1px solid #222;border-radius:8px;background:#111;color:#fff;">Send</button>
      </div>
    </div>`;

  const st = el.querySelector('#st');
  const log = el.querySelector('#log');
  const msg = el.querySelector('#msg');
  const sendBtn = el.querySelector('#send');

  const println = (...a) => {
    log.textContent += (log.textContent ? '\n' : '') + a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
    log.parentElement.scrollTop = log.parentElement.scrollHeight;
  };

  // שליחה – משתמש ב-peerId שהועבר
  const send = () => {
    if (!peerId) { println('[err] No peerId provided'); return; }
    const text = msg.value.trim();
    if (!text) return;
    try {
      // channel label 'main' (או מה שאתם משתמשים בו), peerId מה־params
      sendMessage(text, 'main', peerId, '');
      println('me  :', text);
      msg.value = '';
      msg.focus();
    } catch (e) {
      println('[err] cannot send:', e.message || e);
    }
  };

  sendBtn.onclick = send;
  msg.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
}

export async function onmessage(msg) {
}