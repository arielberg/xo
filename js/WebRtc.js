let _pc = null;
let _dc = null;
let _handlers = null;

export function onPeerEvents(handlers = {}) {
  //_handlers = handlers;
  //if (_dc && _handlers?.ondc) _handlers.ondc(_dc);
}

export function createPC(channelName) {
  if (_pc) return _pc;

  _pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

  if (channelName) {
    // caller side: create DC before createOffer()
    const dc = _pc.createDataChannel(channelName);
    bindDataChannel(dc);
  } else {
    // callee side: wait for incoming DC
    _pc.ondatachannel = (ev) => {
      console.log('[pc] ondatachannel', ev.channel);
      bindDataChannel(ev.channel);
    };
  }

  _pc.oniceconnectionstatechange = () =>
    console.log('[pc] ice:', _pc.iceConnectionState);
  _pc.onconnectionstatechange = () =>
    console.log('[pc] conn:', _pc.connectionState);

  return _pc;
}

export async function createOffer() {
  const pc = createPC('chat');                         // ensures DC exists in SDP
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await new Promise((res) => {
    if (pc.iceGatheringState === 'complete') return res();
    pc.addEventListener('icegatheringstatechange',
      () => pc.iceGatheringState === 'complete' && res());
  });

  return pc.localDescription;
}

export async function acceptAnswer(answerJson) {
  if (!_pc) throw new Error('PeerConnection not initialized');
  const answerObj = JSON.parse(answerJson);
  await _pc.setRemoteDescription(answerObj);
}

export function bindDataChannel(dc) {
  _dc = dc;
  _dc.onopen    = () => console.log('[dc] open');
  _dc.onmessage = (e) => console.log('[dc] msg:', String(e.data).slice(0, 200));
  _dc.onclose   = () => console.log('[dc] close');
  // notify listeners if registered
  _handlers?.ondc?.(_dc);
}

export function getDataChannel() {
  return _dc;
}

export function sendMessage(text) {
  console.log('sendMessage:', text);
  if (!_dc || _dc.readyState !== 'open') throw new Error('DataChannel not open');
  _dc.send(text);
  console.log('sent');
}
