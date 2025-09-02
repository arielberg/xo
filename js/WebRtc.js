// WebRtc.js
let _pc = null;
let _dc = null;
let _handlers = null;

export function onPeerEvents(handlers = {}) { 
  _handlers = handlers; if (_pc) bindEvents();
}

function bindEvents() {
  if (!_pc) return;
  if (_handlers?.onice) _pc.oniceconnectionstatechange = () => _handlers.onice(_pc.iceConnectionState);
  if (_handlers?.onconn) _pc.onconnectionstatechange   = () => _handlers.onconn(_pc.connectionState);
  _pc.ondatachannel = (ev) => {
    _dc = ev.channel;
    _handlers?.ondc?.(_dc);
  };
}

export async function createOffer() {
  _pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  bindEvents();
  _dc = _pc.createDataChannel('chat'); // הצד המזמן יוצר ערוץ
  _handlers?.ondc?.(_dc);

  const offer = await _pc.createOffer();
  await _pc.setLocalDescription(offer);
  await new Promise(res => {
    if (_pc.iceGatheringState === 'complete') return res();
    _pc.addEventListener('icegatheringstatechange', () => _pc.iceGatheringState === 'complete' && res());
  });
  return _pc.localDescription;
}

export async function acceptAnswer(answerJson) {
  if (!_pc) throw new Error('PeerConnection not initialized');
  const answerObj = JSON.parse(answerJson);
  await _pc.setRemoteDescription(answerObj);
}

export function getDataChannel() {
  console.log(_dc);
  return _dc; 
}

export function sendMessage(text) {
  if (!_dc || _dc.readyState !== 'open') throw new Error('DataChannel not open');
  _dc.send(text);
}