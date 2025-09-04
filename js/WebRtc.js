import rsa_encrypt_b64 from '../wasm/ssl/ca.js';

let _pc = [];
let _dc = {};
let _handlers = null;


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
    bindDataChannel(dc);
    if( ! _dc[userId] )  _dc[userId] = {};
    _dc[userId][channelName] = dc;
  } 

  _pc[userId].ondatachannel = (ev) => {
    console.log('[pc] ondatachannel', ev.channel);
    console.log('[pc] userId', userId);
    if( !_dc[userId] ) _dc[userId] = {};
    _dc[userId][ev.channel.label] = ev.channel;
    bindDataChannel( _dc[userId]['main'] );
  };

  _pc[userId].oniceconnectionstatechange = () =>
    console.log('[pc] ice:', _pc[userId].iceConnectionState);
  _pc[userId].onconnectionstatechange = () =>
    console.log('[pc] conn:', _pc[userId].connectionState);

  return _pc[userId];
}

export async function tempUserAssignment(tempId, userId) {
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

export function bindDataChannel(dc) {  
  dc.onopen    = () => console.log('[dc] open');
  dc.onmessage = (e) => console.log('[dc] msg:', String(e.data).slice(0, 200));
  dc.onclose   = () => console.log('[dc] close');
}


export function sendMessage(content, channel, to_id  ) {
  if (!_pc[to_id] ) throw new Error('DataChannel not open');
  if (!_dc[to_id][channel]) {
    const dc = _pc[userId].createDataChannel(channel);   
  }
  
 // let messageEncrypted = rsa_encrypt_b64( JSON.stringify(message) );
 // let text = JSON.stringify(messageEncrypted);
 _dc[to_id][channel].send(content);
  console.log('sent');
}
