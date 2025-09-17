import { PeerData  } from './peerData.js';

// appsRegistry.js
export const Apps = {
    map: new Map(),                   // name -> { name, onLoad, onMessage }
    get(name) { return this.map.get(name); },
    async loadList(list) {
      // list: [{name:'chat', path:'/apps/chat.js'}, ...]
      for (const path of list) {
        try {
          const mod = await import(path);
          const app = mod.default ?? mod; // תומך גם default export וגם named
          app.src = path;
          if (!app?.name || !app?.onMessage) {
            console.warn(`App ${path} missing required fields`);
            continue;
          }
          this.map.set(app.name, app);
          app.onLoad?.();       
        }
        catch(ex) {
          console.error(path                         );
          console.error(ex);
        }        
      }
    },
    getMap() {
      return this.map;
    },
    getMapKeys() {
      return Object.keys(this.map);
    },
    dispatch(channelName, payload, meta) {
      if ( channelName == 'system' ) {
        PeerData.setPeerData(payload);
        return;
      }
      const app = this.get(channelName);
      
      if (!app) return console.warn(`No app for channel "${channelName}"`);
      try { app.onMessage(payload, meta); }
      catch (e) { console.error(`App ${channelName} onMessage error`, e); }
    }
  };
  