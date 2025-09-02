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
    var mycertficates = getList('certificates', [], true );
    if( mycertficates.length === 0 ) {
        runScript('/pages/createCertificate.js', queryParams );
    }
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


export function getList(type, defaultReturn = [], skipLoadingJson = false) {
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

    // 3. check file
    if ( !skipLoadingJson ) {
        try {
            let xhr = new XMLHttpRequest();
            xhr.open("GET", `data/${type}.json`, false); // סינכרוני – רק לשימוש פשוט
            xhr.send(null);

            if (xhr.status === 200) {
                let jsonData = JSON.parse(xhr.responseText);
                localStorage.setItem(type, JSON.stringify(jsonData));
                moduleCache.set(type, jsonData);
                console.log(`Loaded ${type} from file data/${type}.json`);
                return jsonData;
            } else {
                console.error(`Failed loading data/${type}.json (status ${xhr.status})`);
            }
        } catch (err) {
            console.error(`Error loading data/${type}.json`, err);
        }
    }
    
    // 4. default
    console.log(`Using default return for ${type}`);
    moduleCache.set(type, defaultReturn);
    return defaultReturn;
}

export function appendToList(type, newItem) {
    // נקבל את הרשימה הקיימת (או [] אם לא קיימת)
    let currentList = getList(type, []);

    // נוסיף את הפריט החדש
    currentList.push(newItem);

    // נשמור גם במטמון וגם ב-localStorage
    moduleCache.set(type, currentList);
    localStorage.setItem(type, JSON.stringify(currentList));

    console.log(`Appended item to ${type}:`, newItem);
    return currentList;
}

// Utility method to clear cache
function clearCache() {
    this.moduleCache.clear();
    console.log('Module cache cleared');
}


