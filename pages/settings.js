// settings.js
import { runScript } from '../js/loader.js';
import { getList, appendToList, refresh } from '../js/utils.js';

const STORAGE_KEY = 'certificates';

function loadCerts() {
  const fromLoader = getList?.(STORAGE_KEY);
  if (Array.isArray(fromLoader)) return fromLoader;
  try {
    return JSON.parse(getList(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCerts(list) {
  appendToList(STORAGE_KEY, JSON.stringify(list));
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
   
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });

  const wrapper = container.querySelector('#certListWrapper');
  wrapper.innerHTML = '';
  wrapper.appendChild(table);
}

export async function importSettings(settingText) {
  const data = JSON.parse(settingText);
  var uniqueKeys = {
    'certificates':['cert'],
    'apps':['name'],
    'users':['id']
  }
  Object.keys(data).forEach(key => {
    data[key].forEach(newEntery=>{
      appendToList(key,newEntery, uniqueKeys[key],true);
    })
  });
  refresh();
};

export async function run(containerId = 'content') {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="container mt-5">
    <style>
        .i-btn, .sep { cursor:pointer; color:#ddd; }
        .i-btn:hover { color:#1e40af; }
        .i-btn.active, .i-btn.active:hover {color:#000;background: #ddd;padding: 7px 10px;border-radius: 12px;}
    </style>  
    <h1 class="mb-4">Settings</h1>

      <div class="card" style="padding:16px; margin-bottom:12px;">
        <h3>Certificates</h3>
        <div id="certListWrapper"></div>
        
        <div class="card" style="padding:16px;">        
            <button id="btnAdd">Add New Certificate</button>
        </div>
      </div>

      <div class="card" style="padding:16px; margin-bottom:12px;">
        <h3>
            <span class='i-btn' data-action='export'>Export</span>
            <span class='sep'>/</span> 
            <span class='i-btn' data-action='import'>Import<span></h3>
        <div id='export_form' style='display:none'>
            <button id="btnExport">Download JSON</button>
        </div>
        <div id='import_form' style='display:none'>
            <input id="fileInput" type="file" accept="application/json" style="margin-left:8px" /> 
            <button id="btnImport" style="margin-left:8px;">Import</button>
        </div>
        <span id="importMsg" style="margin-left:8px; opacity:.7;"></span>
      </div>
      
    </div>
  `;

  const exportForm = container.querySelector('#export_form');
  const importForm = container.querySelector('#import_form');

  container.querySelectorAll('.i-btn').forEach(el => {
    
    const toggle = () => {
      const action = el.dataset.action;
      container.querySelectorAll('.i-btn').forEach(el => {
        el.classList.remove('active');
      });
      el.classList.add('active');
      exportForm.style.display = 'none';
      importForm.style.display = 'none';

      if (action === 'export') {
        exportForm.style.display = 'block';
      } else if (action === 'import') {
        importForm.style.display = 'block';
      }
    };
    el.addEventListener('click', toggle);
  });

  let list = loadCerts();
  renderList(container, list);

  container.querySelector('#btnExport').onclick = () => {
    var output = {};
    output.certificates = loadCerts();
    output.users = getList('users',[]);
    output.apps = getList('apps',[]);
    download('certificates.json', JSON.stringify(output, null, 2));
  };

  container.querySelector('#btnImport').onclick = async () => {
    const msg = container.querySelector('#importMsg');
    const file = container.querySelector('#fileInput').files?.[0];
   
    if (!file) {
      msg.textContent = 'Select JSON file...';
      return;
    }
    try {
      const text = await file.text();
      importSettings(text);
    } catch (e) {
      console.error(e);
      msg.textContent = 'Import failed';
    }
  }


  container.querySelector('#btnAdd').onclick = async () => {
    await runScript?.('/pages/createCertificate.js');
  };
}
