// pages/offerAnswer.js — auto-apply, no incoming-offer UI, output = base64url(answer)
// Uses shared encoders from ../js/utils.js

import { getCurrentCertificate, b64urlEncode, b64urlDecode } from '../js/utils.js';
import { getList , runScript, appendToList } from '../js/loader.js';
import { createPC, sendMessage } from '../js/WebRtc.js';

async function waitIceComplete(pc) {
  if (pc.iceGatheringState === 'complete') return;
  await new Promise((resolve) => {
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', onChange);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', onChange);
  });
}

export async function run(containerId = 'content', queryParams = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const params = queryParams instanceof URLSearchParams
    ? queryParams
    : new URLSearchParams(window.location.search);

  container.innerHTML = `
    <div class="container mt-5">
      <style>
        .card { border:1px solid #e5e7eb; border-radius:14px; padding:16px; max-width:900px; }
        .row { display:flex; gap:10px; align-items:center; margin:10px 0; flex-wrap:wrap; }
        .btn { padding:8px 12px; border:1px solid #222; border-radius:10px; cursor:pointer; }
        .input, textarea { width:100%; padding:8px; border:1px solid #ddd; border-radius:10px; background:#fafafa; }
        .muted { color:#6b7280; font-size:12px; }
        .ok { color:#059669; }
        .err{ color:#dc2626; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      </style>

      <h1 class="mb-4">WebRTC Answer</h1>
      <div class="card">
        <div id="status" class="muted">Initializing...</div>
        <div class="row">
          <label class="muted">Answer (base64url)</label>
          <textarea id="answerOut" rows="6" class="mono" readonly placeholder="Will appear after generating answer"></textarea>
          <button id="btnCopy" class="btn" disabled>Copy</button>
        </div>
        <div class="row">
          <label class="muted">Logs</label>
          <textarea id="logs" rows="8" class="mono" readonly></textarea>
        </div>
      </div>
    </div>
  `;

  const $ = (sel) => container.querySelector(sel);
  const status = $('#status');
  const answerOut = $('#answerOut');
  const btnCopy = $('#btnCopy');
  const logs = $('#logs');

  const log = (...args) => {
    const line = args.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
    logs.value += (logs.value ? '\n' : '') + line;
    logs.scrollTop = logs.scrollHeight;
  };

  // 1) Read offer from URL automatically
  const offerParam = params.get('offer');
  if (!offerParam) {
    status.innerHTML = '<span class="err">No offer found in URL (?offer=...).</span>';
    return;
  }
  status.textContent = 'Offer found. Applying...';

  // 2) Apply offer, create answer, wait ICE, output base64url(answer)
  let pc = null; 
  let dc = null;
  
  try {
    const offerText = b64urlDecode(offerParam);
    const offerObjOrWrapper = JSON.parse(offerText); // might be {type,sdp} or {offer:{type,sdp}}

    const pc = createPC();            // registers ondatachannel BEFORE applying offer
    const remote = offerObjOrWrapper?.type
      ? offerObjOrWrapper
      : offerObjOrWrapper?.offer?.type
        ? offerObjOrWrapper.offer
        : null;

    if (!remote) throw new Error('Invalid offer payload');

    await pc.setRemoteDescription(remote);   // <-- key fix
    log('Remote description set. Creating answer...');

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await waitIceComplete(pc);

    const fullAnswer = pc.localDescription; // RTCSessionDescription
    const encodedAnswer = b64urlEncode(JSON.stringify(fullAnswer));

    answerOut.value = encodedAnswer;
    btnCopy.disabled = false;
    status.innerHTML = '<span class="ok">Answer ready. Copy and send back to caller.</span>';
    log('Answer generated.');
  } catch (e) {
    console.error(e);
    status.innerHTML = `<span class=\"err\">Error: ${e.message}</span>`;
    log('Error:', e.message);
  }

  // 3) Copy button
  btnCopy.onclick = async () => {
    try {
      if (!answerOut.value) return;
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(answerOut.value);
      else {
        answerOut.focus();
        answerOut.select();
        document.execCommand('copy');
      }
      const prev = btnCopy.textContent; btnCopy.textContent = 'Copied!';
      setTimeout(() => btnCopy.textContent = prev, 900);
    } catch (e) {
      log('Clipboard error:', e.message);
    }
  };
}
