import { runScript } from '../js/loader.js';

// Simple WhatsApp opener page
// - If a phone number is provided, opens chat with that number
// - Otherwise, opens WhatsApp with a prefilled message only
// - Works on mobile (deep link) and desktop (WhatsApp Web)

export async function run(containerId = 'content') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="container mt-5">
      <h1 class="mb-4">WhatsApp Invite</h1>
      <div class="card p-3" style="max-width: 560px;">
        <label style="display:block;margin-bottom:6px;">Phone (optional)</label>
        <input id="waPhone" type="tel" placeholder="e.g. 972501234567" style="width:100%;padding:8px;margin-bottom:12px;" />

        <label style="display:block;margin-bottom:6px;">Message</label>
        <textarea id="waMsg" rows="3" style="width:100%;padding:8px;">hello world</textarea>

        <div style="margin-top:16px;display:flex;gap:8px;">
          <button id="btnOpenWA" class="btn btn-success">Open WhatsApp</button>
          <button id="btnBack" class="btn btn-secondary">Back</button>
        </div>
        <small style="display:block;margin-top:10px;opacity:.8;">If the phone is empty, WhatsApp will open with the message only.</small>
      </div>
    </div>
  `;

  const btn = container.querySelector('#btnOpenWA');
  const back = container.querySelector('#btnBack');

  btn.addEventListener('click', () => {
    const rawPhone = document.getElementById('waPhone').value || '';
    const msg = document.getElementById('waMsg').value || 'hello world';

    // Sanitize phone: keep digits only (WhatsApp expects international format without +)
    const phone = rawPhone.replace(/\D+/g, '');
    const encodedMsg = encodeURIComponent(msg);

    // Build URLs
    const webUrl = phone
      ? `https://wa.me/${phone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;

    const mobileScheme = phone
      ? `whatsapp://send?phone=${phone}&text=${encodedMsg}`
      : `whatsapp://send?text=${encodedMsg}`;

    // Simple mobile detection
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);

    if (isMobile) {
      // Try deep link first; fallback to web after a short delay
      const fallback = setTimeout(() => {
        window.open(webUrl, '_blank');
      }, 800);
      window.location.href = mobileScheme;
      // If it succeeds, the page will switch to WhatsApp and the timeout won't matter
      // If it fails, the timeout opens WA Web
    } else {
      window.open(webUrl, '_blank');
    }
  });

  back.addEventListener('click', () => {
    // Navigate elsewhere in your app if you have a page to return to
    // Adjust the path to your landing page module as needed
    try { runScript('/pages/home.js'); } catch (e) { console.warn('No home.js route configured'); }
  });
}
