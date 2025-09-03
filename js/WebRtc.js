// WebRtc.js — minimal shared state & helpers

let _pc = null;
let _dc = null;

let _handlers = null;
export function onPeerEvents(handlers = {}) {
  _handlers = handlers;

  if (_dc && _handlers?.ondc) _handlers.ondc(_dc);
}

export function createPC() {
  if ( _pc ) return _pc;
  _pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

  _pc.ondatachannel = (ev) => {
        console.log('[pc] ondatachannel', ev.channel);
        const dc = ev.channel;
        bindDataChannel(dc); 
        /*
        dc.onopen = () => {
          log('[dc] open');
          let currentCertificate = getCurrentCertificate();
          sendMessage(currentCertificate?.cert);
        };
        dc.onmessage = (e) => log('[dc] msg:', String(e.data).slice(0, 200));
        dc.onclose = () => log('[dc] close');
        */
        };
  _pc.oniceconnectionstatechange = () => console.log('[pc] ice:', _pc.iceConnectionState);
  _pc.oniceconnectionstatechange = () => console.log('[pc] oniceconnectionstatechange:', _pc);//_handlers.onice(pc.iceConnectionState);
  _pc.onconnectionstatechange   = () => console.log('[pc] onconnectionstatechange:', _pc);//_handlers.onconn(pc.connectionState); 
  _pc.onice = () => console.log('[pc] onconnectionstatechange:', _pc);
  _pc.onconn = () => console.log('[pc] onconnectionstatechange:', _pc);
  _pc.ondc = () => bindDataChannel;//_handlers.

  return _pc;
}



export async function createOffer() {
  _pc = createPC();
  console.log("ppppp",_pc);
  // הצד המזמן יוצר ערוץ
  _dc = _pc.createDataChannel('chat');

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

export function bindDataChannel(dc) {
  _dc = dc;
  _dc.onopen = () => console.log('[dc] open');
  _dc.onmessage = (e) => console.log('[dc] msg:', String(e.data).slice(0, 200));
  _dc.onclose = () => console.log('[dc] close');

}

export function getDataChannel() {
  console.log(_dc);
  return _dc; 
}

// שליחת הודעה (נוח לשימוש ישיר מהעמודים)
export function sendMessage(text) {
  if (!_dc || _dc.readyState !== 'open') throw new Error('DataChannel not open');
  _dc.send(text);
}