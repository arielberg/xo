// /apps/anon.js
// Anonymous message spreading via randomized single-hop forwarding (fanout=1)
// Each peer can originate a message. On *every* reception, the peer forwards to one random other peer.
// Completion is detected via anonymous receipt tokens: each peer contributes a unique, unlinkable token per message.
// When the number of distinct tokens equals the known peer count, we mark the message as "Delivered to all" —
// without revealing who originated it.


import { sendMessage } from '../js/WebRtc.js';
import { getList } from '../js/loader.js';


const LS_PEERS = 'anon:peers:v1'; // [{id, name?}]
const LS_MSGS = 'anon:messages:v1'; // { [msgId]: { text, receipts: string[], created, last, complete: bool } }
const LS_TOKENS = 'anon:tokens:v1'; // { [msgId]: myReceiptToken }


let peers = []; // runtime cache
let elems = {}; // UI refs
let activeSeedPeer = null; // optional seed for first hop


// ----------------------------- storage ---------------------------------
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));


function getPeers() { return peers.length ? peers : load(LS_PEERS, []); }
function setPeers(list) { peers = Array.isArray(list) ? list : []; save(LS_PEERS, peers); }


function getMsgs() { return load(LS_MSGS, {}); }
function setMsgs(m) { save(LS_MSGS, m); }


function getTokens() { return load(LS_TOKENS, {}); }
function setTokens(t) { save(LS_TOKENS, t); }


// --------------------------- ids & tokens -------------------------------
function randomId(bits = 128) {
    const bytes = new Uint8Array(bits/8);
    crypto.getRandomValues(bytes);
    return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
}


function myTokenFor(msgId) {
    const tokens = getTokens();
    if (tokens[msgId]) return tokens[msgId];
    const tok = 't_' + randomId(128); // 128-bit random token; unlinkable
    tokens[msgId] = tok;
    setTokens(tokens);
    return tok;
}


function uniq(arr) { 
    return [...new Set(arr)];
}


// --------------------------- gossip logic -------------------------------
function pickRandomPeer(excludeId) {
    const list = getPeers().map(p=>p.id).filter(Boolean);
    const candidates = list.filter(id => id && id !== excludeId);
    if (!candidates.length) return null;
    const i = Math.floor(Math.random()*candidates.length);
    return candidates[i];
}


function peersCount() { return getPeers().filter(p=>!!p.id).length; }


function upsertMessageRecord(msgId, text, receipts) {
const msgs = getMsgs();
const rec = msgs[msgId] || { text, receipts: [], created: Date.now(), last: Date.now(), complete: false };
if (text && !rec.text) rec.text = text;
rec.receipts = uniq([...(rec.receipts||[]), ...(receipts||[])]);
rec.last = Date.now();
rec.complete = (rec.receipts.length >= Math.max(1, peersCount()));
msgs[msgId] = rec;
setMsgs(msgs);