export async function createOffer() {
  // יצירת PeerConnection עם STUN ברירת מחדל
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  pc.createDataChannel("chat");

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // המתנה עד שה־ICE candidates נכנסים ל־SDP
  await new Promise(resolve => {
    if (pc.iceGatheringState === "complete") {
      resolve();
    } else {
      pc.addEventListener("icegatheringstatechange", () => {
        if (pc.iceGatheringState === "complete") resolve();
      });
    }
  });

  // לקיחת SDP מלא
  const fullOffer = pc.localDescription;
  return fullOffer;
  
}
