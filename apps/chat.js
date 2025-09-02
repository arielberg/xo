import { onPeerEvents } from '../js/WebRtc.js';

let dc = null; // active DataChannel
let ready = false;

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appendBubble(listEl, text, who = 'me') {
  const row = document.createElement('div');
  row.className = `row ${who}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = nowTime();
  row.appendChild(bubble);
  row.appendChild(meta);
  listEl.appendChild(row);
  listEl.scrollTop = listEl.scrollHeight;
}

function bindChannel(listEl, statusEl) {
  console.log('ddddd',dc);
  if (!dc) return;
  dc.onopen = () => { ready = true; statusEl.textContent = 'connected'; statusEl.classList.add('ok'); };
  dc.onclose = () => { ready = false; statusEl.textContent = 'disconnected'; statusEl.classList.remove('ok'); };
  dc.onmessage = (e) => {
    const msg = String(e.data || '').trim();
    if (!msg) return;
    appendBubble(listEl, msg, 'peer');
  };
}

export async function run(containerId = 'content') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="container mt-5">
      <style>
        .chat { max-width: 800px; margin: 0 auto; border:1px solid #e5e7eb; border-radius:16px; display:flex; flex-direction:column; height:70vh; }
        .chat-header { padding:10px 14px; border-bottom:1px solid #e5e7eb; display:flex; align-items:center; gap:8px; }
        .status { font-size:12px; color:#6b7280; }
        .status.ok { color:#059669; }
        .chat-body { flex:1; overflow:auto; padding:12px; background:#fafafa; }
        .row { display:flex; align-items:flex-end; gap:8px; margin:6px 0; }
        .row.me { justify-content:flex-end; }
        .row.peer { justify-content:flex-start; }
        .bubble { max-width:70%; padding:8px 12px; border-radius:14px; background:#111; color:#fff; }
        .row.peer .bubble { background:#fff; color:#111; border:1px solid #e5e7eb; }
        .meta { font-size:11px; color:#6b7280; }
        .chat-input { display:flex; gap:8px; padding:10px; border-top:1px solid #e5e7eb; }
        .chat-input input { flex:1; padding:10px; border:1px solid #ddd; border-radius:10px; }
        .btn { padding:10px 14px; border:1px solid #222; border-radius:10px; background:#111; color:#fff; cursor:pointer; }
        .btn:disabled { opacity:.6; cursor:not-allowed; }
      </style>

      <div class="chat">
        <div class="chat-header">
          <strong>Chat</strong>
          <span id="status" class="status">connecting…</span>
          <span style="margin-left:auto;"><button id="btnClear" class="btn" style="background:#fff;color:#111;">Clear</button></span>
        </div>
        <div id="list" class="chat-body"></div>
        <div class="chat-input">
          <input id="msg" type="text" placeholder="Type a message" />
          <button id="send" class="btn" disabled>Send</button>
        </div>
      </div>
    </div>
  `;

  const listEl = container.querySelector('#list');
  const statusEl = container.querySelector('#status');
  const msgEl = container.querySelector('#msg');
  const sendBtn = container.querySelector('#send');
  const clearBtn = container.querySelector('#btnClear');

  let dc = null;

    onPeerEvents?.({
        ondc: (channel) => { dc = channel; wire(); },
        onconn: (state) => { /* עדכון סטטוס UI */ }
    });

    function wire() {
      console.log('wire');
      const ch = dc || getDataChannel();
      console.log(dc);
      if (!ch) return;
      ch.onmessage = (e) => appendBubble(listEl, String(e.data), 'peer');
      ch.onopen    = () => { sendBtn.disabled = false; setStatus('connected'); };
      ch.onclose   = () => { sendBtn.disabled = true;  setStatus('disconnected'); };
    }

    sendBtn.onclick = () => {
        const text = msgEl.value.trim();
        if (!text) return;
        try {
            sendMessage(text);      // משתמש בפונקציה מ־WebRtc.js
            appendBubble(listEl, text, 'me');
            msgEl.value = '';
        } catch (e) {
            // הציגי שגיאה קטנה ב־UI אם תרצי
        }
    };
    
    clearBtn.onclick = () => { 
        listEl.innerHTML = ''; };
}
