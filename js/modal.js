 // openModal(domEl, buttons, { title?, closeOnBackdrop?, width?, onClose? })
 export function openModal(domEl, buttons = [], opts = {})  {
    const { title = '', closeOnBackdrop = true, width = '520px', onClose = null, restore = true } = opts;

    // overlay + dialog
    const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
    const dialog  = document.createElement('div'); dialog.className  = 'modal'; dialog.style.maxWidth = width;
    const head = document.createElement('div'); head.className = 'modal-head';
    head.innerHTML = `<div class="modal-title">${(title)}</div><button class="modal-x" aria-label="Close">×</button>`;
    const body = document.createElement('div'); body.className = 'modal-body';
    const foot = document.createElement('div'); foot.className = 'modal-foot';

    dialog.append(head, body, foot);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // move content in, remember where to restore it
    const originalParent = domEl.parentNode, next = domEl.nextSibling;
    body.appendChild(domEl);

    function restoreContent(){
      if (!restore || !originalParent) return;
      if (next) originalParent.insertBefore(domEl, next); else originalParent.appendChild(domEl);
    }

    function close(result){
      restoreContent();
      try { overlay.remove(); } catch {}
      window.removeEventListener('keydown', onKey);
      if (typeof onClose === 'function') { try { onClose(result); } catch(e) { console.error(e); } }
    }

    const onKey = (e) => { if (e.key === 'Escape') close('esc'); };
    window.addEventListener('keydown', onKey);

    if (closeOnBackdrop) overlay.addEventListener('click', (e) => { if (e.target === overlay) close('backdrop'); });
    head.querySelector('.modal-x').addEventListener('click', () => close('x'));

    // buttons
    buttons.forEach((b, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'modal-btn' + (b.primary ? ' modal-btn--primary' : '');
      btn.textContent = b.text || `Button ${i+1}`;
      if (b.disabled) btn.disabled = true;
      btn.addEventListener('click', async () => {
        try {
          // onClick({ close, dialog, body, button }) → return false to keep modal open
          const keepOpen = (await b.onClick?.({ close, dialog, body, button: btn })) === false;
          if (!keepOpen) close(b.text);
        } catch (err) {
          console.error('modal button error:', err);
        }
      });
      foot.appendChild(btn);
    });

    // focus primary or first button
    setTimeout(() => (foot.querySelector('.modal-btn--primary') || foot.querySelector('button') || dialog).focus(), 0);

    return { close, overlay, dialog, body };
  };