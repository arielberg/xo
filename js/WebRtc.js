import rsa_encrypt_b64 from '../wasm/ssl/ca.js';
import { Apps } from './appsRegistry.js';

let _pc = [];
let _dc = {};
const _queue = {};  

function ensureMaps(peerId) {
  _dc[peerId] ??= {};
  _queue[peerId] ??= {};
}

export function onPeerEvents(handlers = {}) {
  //_handlers = handlers;
  //if (_dc && _handlers?.ondc) _handlers.ondc(_dc);
}

export function createPC(userId, channelName) {
  
  if( !userId ) throw new TypeError('userId must be provided');

  if (_pc[userId]) return _pc[userId];

  _pc[userId] = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

  if (channelName) {
    // caller side: create DC before createOffer()
    const dc = _pc[userId].createDataChannel(channelName);   
    wireDC(userId, dc);
    if( ! _dc[userId] )  _dc[userId] = {};
    _dc[userId][channelName] = dc;
  } 

  _pc[userId].ondatachannel = (ev) => {
    if( !_dc[userId] ) _dc[userId] = {};
    _dc[userId][ev.channel.label] = ev.channel;
    wireDC(userId, _dc[userId][ ev.channel.label ] );
  };

  _pc[userId].oniceconnectionstatechange = () =>
    console.log('[pc] ice:', _pc[userId].iceConnectionState);
  _pc[userId].onconnectionstatechange = () =>
    console.log('[pc] conn:', _pc[userId].connectionState);

  return _pc[userId];
}

export async function ConvertTempToUID(tempId, userId) {
  _pc[userId] = _pc[tempId];
  _dc[userId] = _dc[tempId];
  delete _pc[tempId];
  delete _dc[tempId];
}
export async function createOffer(userId) {
  
  if( !userId ) throw new TypeError('userId must be provided');

  const pc = createPC(userId, 'main');                         // ensures DC exists in SDP
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await new Promise((res) => {
    if (pc.iceGatheringState === 'complete') return res();
    pc.addEventListener('icegatheringstatechange',
      () => pc.iceGatheringState === 'complete' && res());
  });

  return pc.localDescription;
}

export async function acceptAnswer(userId, answerJson) {
  if (!_pc[userId]) throw new Error('PeerConnection not initialized');
  const answerObj = JSON.parse(answerJson);
  await _pc[userId].setRemoteDescription(answerObj);
}

function wireDC(peerId, dc){
  ensureMaps(peerId);
  const name = dc.label;
  _dc[peerId][name] = dc;

  dc.onopen = () => {
    const q = _queue[peerId][name] || [];
    while (q.length) dc.send(q.shift());
  };
  dc.onclose = () => { delete _dc[peerId][name]; };
  dc.onerror = (e) => console.error('dc error', peerId, name, e);
  dc.onmessage = (ev) => {
    // dispatch לפי שם הערוץ (האפליקציה)
    Apps.dispatch(name, ev.data, { from: peerId });
  };
}


export function sendMessage(content, channel, to_id){
  const pc = _pc[to_id];
  if (!pc) throw new Error('PeerConnection not found');
  ensureMaps(to_id);

  let dc = _dc[to_id][channel];
  if (!dc) {
    dc = pc.createDataChannel(channel, { ordered: true });
    wireDC(to_id, dc);                 // <<< חשוב!
    // שימי לב: יצירת DC חדש מחייבת renegotiation אם החיבור כבר מבוסס.
    // טיפ: תטפלי ב-pc.onnegotiationneeded או תיצרי את הערוצים לפני ה-offer הראשון.
  }

  const text = (typeof content === 'string') ? content : JSON.stringify(content);

  if (dc.readyState === 'open') {
    dc.send(text);
  } else {
    // עדיין לא פתוח — נכניס לתור ונשלח ב-onopen
    _queue[to_id][channel] ??= [];
    _queue[to_id][channel].push(text);
  }
}
