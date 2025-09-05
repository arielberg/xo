// appsRegistry.js
export const Apps = {
    map: new Map(),                   // name -> { name, onLoad, onMessage }
    get(name) { return this.map.get(name); },
    async loadList(list) {
      // list: [{name:'chat', path:'/apps/chat.js'}, ...]
      for (const item of list) {
        const mod = await import(item.path);
        const app = mod.default ?? mod; // תומך גם default export וגם named
        if (!app?.name || !app?.onMessage) {
          console.warn(`App ${item.name} missing required fields`);
          continue;
        }
        this.map.set(app.name, app);
        app.onLoad?.();               // אופציונלי
      }
    },
    dispatch(channelName, payload, meta) {
      const app = this.get(channelName);
      if (!app) return console.warn(`No app for channel "${channelName}"`);
      try { app.onMessage(payload, meta); }
      catch (e) { console.error(`App ${channelName} onMessage error`, e); }
    }
  };
  