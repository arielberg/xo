import { getList } from './utils.js';
import { Apps } from './appsRegistry.js';

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
        var tab = document.createElement('div');
        tab.className = 'tab';
        tab.textContent = page.title;
        tab.onclick = async () => { 
                console.log(`Loading page: ${page.title} from ${page.path}`,page);
                runScript(page.path);
            
        }
        tabContainer.appendChild(tab);
    });
    runScript(getCurrentPage(queryParams), queryParams );
    
}


export function getCurrentPage(queryParams) {
    var mycertficates = getList('certificates', [], true );
    if( mycertficates.length === 0 ) {
        return '/pages/createCertificate.js';
    }
    if( queryParams.has('offer') ) {
        runScript('/pages/offerAnswer.js');
    }
    else {
        runScript('/pages/settings.js');
    }
    return '/pages/home.js';
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

export function appendToList(type, newItem, keys = [], override = true) {
    // נטען את הרשימה הקיימת
    let currentList = getList(type, []);

    // נבדוק אם יש כבר פריט זהה לפי כל המפתחות
    let index = currentList.findIndex(item =>
        keys.every(key => item[key] === newItem[key])
    );

    if (index !== -1) {
        if ( override ) {
        // אם קיים → עדכון הפריט
            currentList[index] = { ...currentList[index], ...newItem };
            console.log(`Updated item in ${type}:`, newItem);
        }
    } else {
        // אם לא קיים → הוספה
        currentList.push(newItem);
        console.log(`Appended item to ${type}:`, newItem);
    }

    // נשמור במטמון וב־localStorage
    moduleCache.set(type, currentList);
    localStorage.setItem(type, JSON.stringify(currentList));

    return currentList;
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

