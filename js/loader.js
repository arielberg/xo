import { getList, getIconButton, getIconSVG } from './utils.js';
import { Apps } from './appsRegistry.js';
import { openModal } from './modal.js';
let moduleCache = new Map();
    
export function initApp() {
    /*
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
      */

    const apps = getList('apps');
    console.log(apps);
    Apps.loadList(apps);

    var pages = getList('pages');
    let queryParams = new URLSearchParams(window.location.search);
    var tabContainer = document.getElementById('tabs');
    pages.forEach(page => {
        var tab = document.createElement('button');
        tab.className = 'tab';
        var btn_icon = document.createElement('span');
        getIconSVG(page.icon).then(svg => btn_icon.innerHTML = svg);
        var btn_text = document.createElement('span');
        btn_text.textContent = page.title;
        tab.appendChild(btn_icon);
        tab.appendChild(btn_text);
        tab.onclick = async () => { 
                console.log(`Loading page: ${page.title} from ${page.path}`,page);
                runScript(page.path);
            
        }
        tabContainer.appendChild(tab);
    });
   // createfooterBUttons();  
    runScript(getCurrentPage(queryParams), queryParams );
    
}


export function getCurrentPage(queryParams) {
    var mycertficates = getList('certificates', [], true );
    if( mycertficates.length === 0 ) {
        return '/pages/createCertificate.js';
    }
    if( queryParams.has('offer') ) {
        return'/pages/offerAnswer.js';
    }
    return '/pages/home.js';
}

export function openApp(){
    
}

export function runScript(pagePath, params) {
    try {
        console.log(`Opening page from ${pagePath}`);
        import('..'+pagePath)
            .then(module => {
                module.run("content", params );
            })
            .catch(e => {
                console.error(e);
                content.innerHTML = `<h3>Error</h3><p>Error loading page.</p>`;
            });
    } catch (e) {
        console.error(e);
        content.innerHTML = `<h3>Error</h3><p>Error loading page.</p>`;
    }
}

function createfooterBUttons(){
    const deleteBtn = getIconButton('refresh', 'Refresh');
    document.getElementById('footer').appendChild(deleteBtn);
    deleteBtn.onclick=()=>{
        window.location.reload();
    }
    const openBtn = getIconButton('MoreCircled', 'OpenUrl');
    document.getElementById('footer').appendChild(openBtn);
    openBtn.onclick=()=>{
        var content = document.createElement('div');
        var inp = document.createElement('input');
        inp.placeholder = 'Url To Open';
        content.appendChild(inp);
        var redirectBtn = {text:'Open Url'};
        redirectBtn.onClick = ()=>{
            window.location = inp.value;
        };
       openModal(content,[redirectBtn],{title:'Open Url'});
    }
}

// Utility method to clear cache
function clearCache() {
    this.moduleCache.clear();
    console.log('Module cache cleared');
}

export function overrideCache(type, newVal) {
    moduleCache.set(type, newVal); 
    localStorage.setItem(type, JSON.stringify(newVal)); 
    return newVal;
}

export function getCached(type) {
    // 1. check cache
    if (moduleCache.has(type)) {
        console.log(`Loaded ${type} from moduleCache`);
        return moduleCache.get(type);
    }

    // 2. check localStorage
    let data = localStorage.getItem(type);
    if (data) {
        try {
            let parsed = JSON.parse(data);
            moduleCache.set(type, parsed); // נשמור גם במטמון
            console.log(`Loaded ${type} from localStorage`);
            return parsed;
        } catch (e) {
            console.error(`Error parsing localStorage for ${type}`, e);
        }
    }
}

export function cacheVar(name, value) {

      // נשמור במטמון וב־localStorage
      moduleCache.set(name, value);
      localStorage.setItem(name, JSON.stringify(value));
}
