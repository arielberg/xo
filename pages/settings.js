// settings.js
import { getList, runScript } from '../js/loader.js';

const STORAGE_KEY = 'certificates';

function loadCerts() {
  const fromLoader = getList?.(STORAGE_KEY);
  if (Array.isArray(fromLoader)) return fromLoader;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCerts(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderList(container, list) {
  const table = document.createElement('table');
  table.className = 'table table-striped';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Active</th>
        <th>Username</th>
        <th>Label</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');

  list.forEach((cert, idx) => {
    const tr = document.createElement('tr');

    // Active radio
    const tdActive = document.createElement('td');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'activeCert';
    radio.checked = !!cert.active;
    radio.onchange = () => {
      list.forEach((c, i) => (c.active = i === idx));
      saveCerts(list);
      renderList(container, list);
    };
    tdActive.appendChild(radio);
    tr.appendChild(tdActive);

    // Username
    const tdUser = document.createElement('td');
    tdUser.textContent = cert.username || '(unknown)';
    tr.appendChild(tdUser);

    // Label editable
    const tdLabel = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = cert.label || '';
    input.onchange = () => {
      list[idx].label = input.value;
      saveCerts(list);
    };
    tdLabel.appendChild(input);
    tr.appendChild(tdLabel);

    // Actions
    const tdActions = document.createElement('td');
    const btnDelete = document.createElement('button');
    btnDelete.textContent = 'Delete';
    btnDelete.onclick = () => {
      list.splice(idx, 1);
      saveCerts(list);
      renderList(container, list);
    };
    tdActions.appendChild(btnDelete);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });

  const wrapper = container.querySelector('#certListWrapper');
  wrapper.innerHTML = '';
  wrapper.appendChild(table);
}

export async function run(containerId = 'content') {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="container mt-5">
      <h1 class="mb-4">Settings</h1>

      <div class="card" style="padding:16px; margin-bottom:12px;">
        <h3>Certificates</h3>
        <div id="certListWrapper"></div>
      </div>

      <div class="card" style="padding:16px; margin-bottom:12px;">
        <h3>Export / Import</h3>
        <button id="btnExport">Download JSON</button>
        <input id="fileInput" type="file" accept="application/json" style="margin-left:8px" />
        <label style="margin-left:8px;">
          <input id="overwrite" type="checkbox" /> Overwrite duplicates
        </label>
        <button id="btnImport" style="margin-left:8px;">Import</button>
        <span id="importMsg" style="margin-left:8px; opacity:.7;"></span>
      </div>

      <div class="card" style="padding:16px;">
        <h3>Add New Certificate</h3>
        <button id="btnAdd">Create Certificate</button>
      </div>
    </div>
  `;

  let list = loadCerts();
  renderList(container, list);

  container.querySelector('#btnExport').onclick = () => {
    list = loadCerts();
    download('certificates.json', JSON.stringify(list, null, 2));
  };

  container.querySelector('#btnImport').onclick = async () => {
    const msg = container.querySelector('#importMsg');
    const file = container.querySelector('#fileInput').files?.[0];
    const overwrite = container.querySelector('#overwrite').checked;
    if (!file) {
      msg.textContent = 'Select JSON file...';
      return;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const incoming = Array.isArray(data) ? data : data?.certificates;
      if (!Array.isArray(incoming)) {
        msg.textContent = 'Invalid JSON format';
        return;
      }
      const existing = loadCerts();
      const merged = overwrite ? incoming : existing.concat(incoming);
      saveCerts(merged);
      list = merged;
      renderList(container, list);
      msg.textContent = `Imported ${incoming.length} certificates`;
    } catch (e) {
      console.error(e);
      msg.textContent = 'Import failed';
    }
  };

  container.querySelector('#btnAdd').onclick = async () => {
    await runScript?.('/pages/createCertificate.js');
  };
}
