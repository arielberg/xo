// shadowScript.js
export function createShadowScript({ ops = {}, timeoutMs = 3000 } = {}) {
    // worker bootstrap (כקוד־מחרוזת כדי להימנע מ-importScripts חיצוני)
    const bootstrap = `
      let seq=0, waits=new Map();
      function call(op, ...args){
        return new Promise((res,rej)=>{
          const id=++seq; waits.set(id,{res,rej});
          postMessage({ t:'op', id, op, args });
        });
      }
      onmessage = async (e) => {
        const { t } = e.data || {};
        if (t === 'run') {
          const { code, args } = e.data;
          try {
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            const fn = new AsyncFunction('call','args','"use strict";\\n'+code);
            const result = await fn(call, args);
            postMessage({ t:'result', ok:true, result });
          } catch(err){ postMessage({ t:'result', ok:false, err: String(err) }); }
        } else if (t === 'opResult') {
          const { id, ok, val, err } = e.data;
          const w = waits.get(id); if(!w) return; waits.delete(id); ok ? w.res(val) : w.rej(err);
        }
      };
    `;
    const blob = new Blob([bootstrap], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob), { type: 'module' });
  
    // מספקים רק את ה־ops שאישרת (Capability-based)
    worker.onmessage = async (e) => {
      const { t } = e.data || {};
      if (t === 'op') {
        const { id, op, args } = e.data;
        try {
          if (!(op in ops)) throw new Error('op not allowed: ' + op);
          const val = await ops[op](...args);
          worker.postMessage({ t:'opResult', id, ok:true, val });
        } catch (err) {
          worker.postMessage({ t:'opResult', id, ok:false, err: String(err) });
        }
      }
    };
  
    async function run(code, args) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { try { worker.terminate(); } catch {} reject(new Error('shadow timeout')); }, timeoutMs);
        const handler = (e) => {
          const { t } = e.data || {};
          if (t === 'result') {
            worker.removeEventListener('message', handler);
            clearTimeout(timer);
            e.data.ok ? resolve(e.data.result) : reject(new Error(e.data.err));
          }
        };
        worker.addEventListener('message', handler);
        worker.postMessage({ t:'run', code, args });
      });
    }
  
    function terminate(){ try { worker.terminate(); } catch {} }
    return { run, terminate };
  }