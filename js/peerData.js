// appsRegistry.js
export const PeerData = {
    map: new Map(),      
    peerByConn: new Map(),  
    appByConn: new Map(),  
    getPeerData(name) { return this.map.get(name); },
    setPeerData( raw ) { 
      let data = JSON.parse(raw);
      console.log(data);
      this.map.set(data.connId, data); 
    }
  };
  