// /apps/chat.js
// Minimal chat app with per-peer threads, peer picker, unread badges, and UI notification events.
import { sendMessage } from '../js/WebRtc.js';
import { getList } from '../js/utils.js'; // מניח שקיים. אם לא – דאג להטעין רשימת משתמשים בדרך אחרת.

const STORAGE_THREADS = 'chat:threads:v1';   // { [peerId]: [{dir:'out'|'in', text, ts}] }
const STORAGE_UNREAD  = 'chat:unread:v1';    // { [peerId]: number }

let activePeerId = null;
let elems = {};       // refs
let usersCache = [];  // [{id, name}]  (name אופציונלי)
let notifyCb = null;  // אופציונלי: callback חיצוני לבאדג'ים

// ---------- storage ----------
function loadJSON(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
}
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function getThreads()      { return loadJSON(STORAGE_THREADS, {}); }
function setThreads(data)  { saveJSON(STORAGE_THREADS, data); }
function getUnread()       { return loadJSON(STORAGE_UNREAD, {}); }
function setUnread(data)   { saveJSON(STORAGE_UNREAD, data); }

function appendMsg(peerId, dir, text, ts = Date.now()) {
  const threads = getThreads();
  (threads[peerId] ??= []).push({ dir, text, ts });
  setThreads(threads);
}

function incUnread(peerId) {
  const unread = getUnread();
  unread[peerId] = (unread[peerId] ?? 0) + 1;
  setUnread(unread);
  updateConversationsList(); // refresh badges
  if (notifyCb) notifyCb(peerId, unread[peerId]);
  document.dispatchEvent(new CustomEvent('chat:new-message', { detail: { from: peerId } }));
}

function clearUnread(peerId) {
  const unread = getUnread();
  if (unread[peerId]) {
    unread[peerId] = 0;
    setUnread(unread);
  }
}

// ---------- UI helpers ----------
const fmtTime = (ts) => new Date(ts).toLocaleTimeString();

function println(text, who = 'me', ts = Date.now()) {
  if (!elems.log) return;
  const line = document.createElement('div');
  who = who.substr(0,15);
  line.style.margin = '6px 0';
  line.innerHTML = `<span style="color:#6b7280">${fmtTime(ts)}</span> · 
                    <strong>${who === 'me' ? 'me' : who}</strong>: 
                    <span>${escapeHTML(text)}</span>`;
  elems.log.appendChild(line);
  elems.scroller.scrollTop = elems.scroller.scrollHeight;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function setStatus(txt) {
  if (elems.st) elems.st.textContent = txt;
}

function buildShell(container, peerLabel = '') {
  container.innerHTML = `
  <div style="max-width:960px;margin:24px auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font:14px system-ui, sans-serif;display:grid;grid-template-columns:220px 1fr;">
    <aside style="border-right:1px solid #e5e7eb;min-height:60vh;">
      <div style="padding:10px 12px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:6px;">
        <strong>Conversations</strong>
        <button id="newChat" title="New chat" style="margin-left:auto;border:1px solid #ddd;border-radius:8px;padding:6px 8px;background:#fff;cursor:pointer;">＋</button>
      </div>
      <div id="convList" style="padding:8px;display:flex;flex-direction:column;gap:4px;"></div>
    </aside>
    <main>
      <div style="padding:10px 12px;border-bottom:1px solid #e5e7eb;display:flex;gap:8px;align-items:center;">
        <strong>Mini Chat</strong>
        <span id="peerLabel" style="color:#6b7280;">&nbsp;•&nbsp;${escapeHTML(peerLabel || (activePeerId ?? 'choose user'))}</span>
        <span id="st" style="margin-left:auto;color:#6b7280;">ready</span>
      </div>
      <div id="scroller" style="height:50vh;overflow:auto;background:#fafafa;padding:10px;">
        <div id="log"></div>
      </div>
      <div style="display:flex;gap:8px;padding:10px;border-top:1px solid #e5e7eb;">
        <select id="peerPicker" style="min-width:220px;padding:8px;border:1px solid #ddd;border-radius:8px;display:none;"></select>
        <input id="msg" type="text" placeholder="Type and Enter…" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:8px;" />
        <button id="send" style="padding:10px 14px;border:1px solid #222;border-radius:8px;background:#111;color:#fff;">Send</button>
      </div>
    </main>
  </div>`;
  // refs
  elems = {
    st: container.querySelector('#st'),
    peerLabelEl: container.querySelector('#peerLabel'),
    scroller: container.querySelector('#scroller'),
    log: container.querySelector('#log'),
    msg: container.querySelector('#msg'),
    sendBtn: container.querySelector('#send'),
    convList: container.querySelector('#convList'),
    newChatBtn: container.querySelector('#newChat'),
    peerPicker: container.querySelector('#peerPicker'),
  };
}

function updateConversationsList() {
  if (!elems.convList) return;
  const threads = getThreads();
  const unread = getUnread();

  // union of known peers from threads + users cache
  const ids = new Set([
    ...Object.keys(threads),
    ...usersCache.map(u => u.id).filter(Boolean),
    ...(activePeerId ? [activePeerId] : []),
  ]);

  elems.convList.innerHTML = '';
  [...ids].forEach(pid => {
    const user = usersCache.find(u => u.id === pid);
    console.log(user);
    const name = user?.username || pid;
    const btn = document.createElement('button');
    btn.style.cssText = `display:flex;align-items:center;justify-content:space-between;gap:6px;
      width:100%;padding:8px;border:1px solid ${pid===activePeerId?'#111':'#e5e7eb'};
      border-radius:8px;background:${pid===activePeerId?'#111':'#fff'};
      color:${pid===activePeerId?'#fff':'#111'};cursor:pointer;`;
    btn.innerHTML = `<span>${escapeHTML(name)}</span>
                     <span style="font-size:12px;color:${pid===activePeerId?'#ddd':'#6b7280'}">${unread[pid] ? `• ${unread[pid]}` : ''}</span>`;
    btn.onclick = () => switchPeer(pid);
    elems.convList.appendChild(btn);
  });
}

function populatePeerPicker(show = false) {
  if (!elems.peerPicker) return;
  elems.peerPicker.style.display = show ? '' : 'none';
  elems.peerPicker.innerHTML = `<option value="">Choose user…</option>` +
    usersCache.map(u => `<option value="${u.id}">${escapeHTML(u.username || u.id)}</option>`).join('');
  elems.peerPicker.onchange = () => {
    const pid = elems.peerPicker.value || null;
    if (pid) switchPeer(pid);
  };
}

// ---------- behavior ----------
function renderThread(peerId) {
  if (!elems.log) return;
  elems.log.innerHTML = '';
  const thread = getThreads()[peerId] || [];
  const user = usersCache.find(u => u.id === peerId);
  const who = user?.username || peerId;
  thread.forEach(m => println(m.text, m.dir === 'in' ? who : 'me', m.ts));
}

function switchPeer(peerId) {
  activePeerId = peerId;
  const user = usersCache.find(u => u.id === peerId);
  const label = user?.username || peerId;
  if (elems.peerLabelEl) elems.peerLabelEl.innerHTML = '&nbsp;•&nbsp;' + escapeHTML(label);
  clearUnread(peerId);
  updateConversationsList();
  renderThread(peerId);
}

async function ensureUsers() {
  try {
    const list = await getList('users'); // מצפה למבנה [{id, name?}, ...]
    if (Array.isArray(list)) usersCache = list;
  } catch {
    usersCache = usersCache || [];
  }
}

// ---------- sending ----------
function doSend() {
  if (!activePeerId) { println('[err] choose a user first', 'system'); return; }
  const text = elems.msg.value.trim();
  if (!text) return;
  try {
    sendMessage(text, 'chat', activePeerId); // DataChannel label 'chat'
    appendMsg(activePeerId, 'out', text);
    println(text, 'me');
    elems.msg.value = '';
    elems.msg.focus();
  } catch (e) {
    println('[err] ' + (e.message || e), 'system');
  }
}

// ---------- public API ----------
export async function run(containerId = 'content', params = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;

  await ensureUsers();

  const { peerId, username } = params || {};
  activePeerId = peerId || null;

  buildShell(el, username || peerId);

  // controls
  elems.sendBtn.onclick = doSend;
  elems.msg.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });
  elems.newChatBtn.onclick = () => populatePeerPicker(true);

  // initial state
  updateConversationsList();
  if (activePeerId) {
    renderThread(activePeerId);
  } else {
    setStatus('choose a user to start');
    populatePeerPicker(true); // דרישה #2 – בלי קונטקסט: לבחור משתמש
  }
}

// אופציונלי לחיבור ל־UI חיצוני (באדג'ים/צפצופים)
export function setChatNotifier(fn) { notifyCb = typeof fn === 'function' ? fn : null; }

// ---------- app object for AppsRegistry ----------
export default {
  name: 'chat',
  onLoad() {
    // no-op
  },
  onMessage(data, { from }) {
    // שמירה + הצגה או סימון כהודעה חדשה
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    appendMsg(from, 'in', text);

    if (from === activePeerId) {
      println(text, (usersCache.find(u => u.id === from)?.name) || from);
      clearUnread(from);
      updateConversationsList();
    } else {
      incUnread(from); // דרישה #4 – איתות ל־UI (באדג', אירוע)
    }
  }
};