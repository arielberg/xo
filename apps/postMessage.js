// Minimal page: simple textarea to send messages over existing WebRTC DataChannel
import { getCurrentCertificate , getList } from '../js/utils.js';
import { sendMessage, onPeerEvents } from '../js/WebRtc.js';

export async function run(containerId = 'content', args) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div style="max-width:720px;margin:24px auto;font:14px system-ui, sans-serif;">
      <h2>Mini Chat</h2>
      <textarea id="msg" rows="4" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;" placeholder="Type message here..."></textarea>
      <button id="send" style="margin-top:8px;padding:8px 12px;border:1px solid #222;border-radius:6px;background:#111;color:#fff;">Send</button>
    </div>`;

  const msg = el.querySelector('#msg');
  const sendBtn = el.querySelector('#send');

  const send = () => {
    const text = msg.value.trim();
    if (!text) return;
    try {

      const users = getList('users', []);
      const currentCert = getCurrentCertificate();
      sendMessage(text,'main',users[0].id, '');   
      msg.value = '';
      msg.focus();
    } catch (e) {
      console.error('Send failed:', e);
      alert('Cannot send: ' + (e.message || e));
    }
  };

  sendBtn.onclick = send;
}
