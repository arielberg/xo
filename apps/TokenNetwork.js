// tokens/TokenNetwork.js
// P2P token state with validator buy-commitments and anonymous, randomized forwarding.

export class TokenNetwork {
    /**
     * @param {Object} opts
     * @param {string}   [opts.channel='tokens']                 // שם הערוץ ב-DataChannel
     * @param {Function} [opts.send]                             // (toId, channel, stringPayload) => void
     * @param {Function} [opts.getPeers]                         // () => [{id, name?}]
     * @param {Object}   [opts.crypto]                           // { hash(bytes)->Promise<ArrayBuffer>, verify(pubKey,bytes,sig)->Promise<bool>, sign?(privKey,bytes)->Promise<Uint8Array> }
     * @param {any}      [opts.validatorPubKey]                  // מפתח ציבורי של המאמת (Commitments)
     * @param {Function} [opts.onApply]                          // callback כשמצב טוקן התעדכן
     */
    constructor({ channel='tokens', send, getPeers, crypto, validatorPubKey, onApply } = {}) {
      this.channel = channel;
      this.send = send ?? ((to, ch, s) => { throw new Error('send(to,channel,payload) not provided'); });
      this.getPeers = getPeers ?? (() => []);
      this.crypto = crypto ?? noopCrypto();     // DEV only; החלף למימוש אמיתי
      this.validatorPubKey = validatorPubKey ?? null;
      this.onApply = onApply ?? (()=>{});
  
      this.state = new Map();  // tokenId -> { tokenId, ownerPubKey, value, seq, auth }  (auth={signerPubKey, signature})
    }
  
    // ---------- PUBLIC API ----------
  
    /** קבל מסר מהרשת */
    async onMessage(data, { from } = {}) {
      let msg;
      try { msg = typeof data === 'string' ? JSON.parse(data) : data; } catch { return; }
      if (!msg || typeof msg !== 'object') return;
  
      if (msg.type === 'token_update') {
        const applied = await this.applyUpdate(msg.payload);
        if (applied) this.forwardRandom(JSON.stringify(msg), from); // fanout=1
      } else if (msg.type === 'buy_commitment') {
        // אופציונלי: שמור/הצג commitment שהגיע מהרשת
        // אימות ייעשה בקריאה ל-verifyBuyCommitment(commitment)
        // כאן אין הפצה, אלא אם רוצים להפיץ גם commitments
      }
    }
  
    /** יצירת עדכון genesis ע\"י Issuer (seq=1) */
    async makeGenesis({ tokenId, ownerPubKey, value, issuerPubKey, issuerSignature }) {
      const payload = { kind:'genesis', tokenId, seq:1, ownerPubKey, value,
                        auth:{ signerPubKey: issuerPubKey, signature: issuerSignature } };
      // בד\"כ תאמת שהחתימה של המנפיק תקינה מול bytesToSign(payload)
      return { type:'token_update', payload };
    }
  
    /** העברת בעלות (נחתם ע\"י הבעלים הנוכחי) */
    async makeTransfer({ tokenId, newOwnerPubKey, value, prevOwnerPubKey, ownerSignature, nextSeq }) {
      // אפשר לגזור nextSeq = (this.state.get(tokenId)?.seq || 0) + 1 אם רוצים בצד היוצר
      const payload = { kind:'transfer', tokenId, seq: nextSeq, ownerPubKey: newOwnerPubKey,
                        value, prevOwnerPubKey,
                        auth:{ signerPubKey: prevOwnerPubKey, signature: ownerSignature } };
      return { type:'token_update', payload };
    }
  
    /** הפצה יזומה (למשל אחרי makeGenesis/makeTransfer) */
    broadcast(msgObj, firstHopId=null) {
      const payload = JSON.stringify(msgObj);
      const peers = this.getPeers()?.map(p=>p.id).filter(Boolean) ?? [];
      const target = firstHopId || pickRandom(peers, null);
      if (target) this.send(target, this.channel, payload);
    }
  
    /** החזר מצב עדכני לטוקן */
    getToken(tokenId) { return this.state.get(tokenId) || null; }
  
    /** Hash דטרמיניסטי של סנאפשוט המצב (ל-commitment) */
    async snapshotHashHex() {
      // canonical, sorted by tokenId
      const items = [...this.state.values()]
        .map(minifyRecord)
        .sort((a,b)=> (a.tokenId < b.tokenId ? -1 : a.tokenId > b.tokenId ? 1 : 0));
      const bytes = new TextEncoder().encode(JSON.stringify(items));
      const ab = await this.crypto.hash(bytes);
      return toHex(new Uint8Array(ab));
    }
  
    /** אימות התחייבות קנייה של המאמת מול הסנאפשוט המקומי */
    async verifyBuyCommitment(commitment) {
      // commitment = { snapshotHash, price, maxAmount, expiresAt, validatorPubKey, signature }
      if (!commitment || commitment.validatorPubKey == null) return false;
      if (this.validatorPubKey && !pubKeyEq(this.validatorPubKey, commitment.validatorPubKey)) return false;
  
      const localHash = await this.snapshotHashHex();
      if (localHash !== commitment.snapshotHash) return false;
  
      const msgBytes = new TextEncoder().encode(canonical(JSON.stringify({
        snapshotHash: commitment.snapshotHash,
        price:        commitment.price,
        maxAmount:    commitment.maxAmount,
        expiresAt:    commitment.expiresAt,
        validatorPubKey: commitment.validatorPubKey,
      })));
      return await this.crypto.verify(commitment.validatorPubKey, msgBytes, b64uToBytes(commitment.signature));
    }
  
    /** הוכחת בעלות (חתימה על אתגר) — דורש sign() בהזרקה */
    async proveOwnership(tokenId, challengeBytes, myPrivKey) {
      const rec = this.getToken(tokenId);
      if (!rec) throw new Error('unknown token');
      if (!this.crypto.sign) throw new Error('sign() not provided');
      return await this.crypto.sign(myPrivKey, challengeBytes);
    }
  
    // ---------- CORE MERGE/APPLY ----------
  
    async applyUpdate(update) {
      // update: { kind:'genesis'|'transfer', tokenId, seq, ownerPubKey, value, prevOwnerPubKey?, auth:{signerPubKey,signature} }
      if (!update || !update.tokenId || !update.seq || !update.ownerPubKey || !update.auth) return false;
  
      const cur = this.state.get(update.tokenId);
      if (cur && update.seq <= cur.seq) return false; // יש לנו חדש יותר/שווה
  
      // אימות חתימה:
      // חותמים על bytesToSign(update) ללא שדה auth
      const msgBytes = new TextEncoder().encode(bytesToSign(update));
      const sigOk = await this.crypto.verify(update.auth.signerPubKey, msgBytes, b64uToBytes(update.auth.signature));
      if (!sigOk) return false;
  
      // חוקים:
      if (update.kind === 'genesis') {
        if (cur) return false; // כבר יש רשומה
        // אפשר לבדוק שהsignerPubKey הוא המנפיק המורשה
      } else if (update.kind === 'transfer') {
        if (!cur) return false;                  // אין בסיס
        if (update.seq !== cur.seq + 1) return false;
        if (!pubKeyEq(update.prevOwnerPubKey, cur.ownerPubKey)) return false; // החותם חייב להיות הבעלים הקודם
        if (!pubKeyEq(update.auth.signerPubKey, cur.ownerPubKey)) return false;
      } else {
        return false;
      }
  
      // כתיבה
      const rec = {
        tokenId: update.tokenId,
        seq: update.seq,
        ownerPubKey: update.ownerPubKey,
        value: update.value,
        auth: update.auth
      };
      this.state.set(update.tokenId, rec);
      this.onApply(rec);
      return true;
    }
  
    // ---------- INTERNAL ----------
  
    forwardRandom(payloadString, fromPeerId) {
      const peers = this.getPeers()?.map(p=>p.id).filter(Boolean) ?? [];
      const to = pickRandom(peers, fromPeerId);
      if (to) this.send(to, this.channel, payloadString);
    }
  }
  
  // ---------- helpers ----------
  
  function pickRandom(list, exclude) {
    const c = (list||[]).filter(x => x && x !== exclude);
    if (!c.length) return null;
    return c[Math.floor(Math.random()*c.length)];
  }
  function toHex(bytes){ return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join(''); }
  function b64uToBytes(s){
    // base64url -> Uint8Array
    s = s.replace(/-/g,'+').replace(/_/g,'/'); const pad = s.length%4 ? 4-(s.length%4) : 0; s += '='.repeat(pad);
    const bin = atob(s); const out = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
    return out;
  }
  function canonical(jsonStr){
    // יצירת מחרוזת קנונית ע\"י פריסה/מיון שדות (פשוט ותקין עבור JSON שטוח/רקורסיבי)
    const obj = JSON.parse(jsonStr);
    return JSON.stringify(sortKeysDeep(obj));
  }
  function sortKeysDeep(o){
    if (Array.isArray(o)) return o.map(sortKeysDeep);
    if (o && typeof o === 'object'){
      const out = {};
      Object.keys(o).sort().forEach(k => { out[k] = sortKeysDeep(o[k]); });
      return out;
    }
    return o;
  }
  function bytesToSign(update){
    const { auth, ...rest } = update;
    return canonical(JSON.stringify(rest));
  }
  function minifyRecord(r){ return { tokenId:r.tokenId, seq:r.seq, ownerPubKey:r.ownerPubKey, value:r.value }; }
  function pubKeyEq(a,b){ return JSON.stringify(a) === JSON.stringify(b); }
  
  // DEV-only crypto (hash=SHA-256, verify=always true) — החלף למימוש אמיתי!
  function noopCrypto(){
    return {
      async hash(bytes){ return await crypto.subtle.digest('SHA-256', bytes); },
      async verify(pubKey, bytes, sig){ console.warn('[DEV crypto] verify() always true'); return true; },
      async sign(privKey, bytes){ throw new Error('not implemented'); }
    };
  }
  