let moduleCache = new Map();
    
export function initApp() {
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
      
    var pages = getList('pages');

    var tabContainer = document.getElementById('tabs');
    pages.forEach(page => {
        var tab = document.createElement('div');
        tab.className = 'tab';
        tab.textContent = page.title;
        tab.onclick = async () => { 
                console.log(`Loading page: ${page.title} from ${page.path}`,page);
                openPage(page.path);
            
        }
        tabContainer.appendChild(tab);

    });
}
export function openPage(pagePath) {
    try {
        console.log(`Opening page from ${pagePath}`);
        import('../pages'+pagePath)
            .then(module => {
                module.renderPage("content");
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


export function getList( type , defaultReturn = []) {
        
    let data = localStorage.getItem(type);
    if (data) {
        try {
            return JSON.parse(data);html
        } catch (e) {
            console.error(`Error parsing localStorage for ${type}`, e);
        }
    }

    try {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", `data/${type}.json`, false); // סינכרוני – לשימוש בסיסי
        xhr.send(null);

        if (xhr.status === 200) {
            let jsonData = JSON.parse(xhr.responseText);
            // נשמור ב-localStorage להבא
            localStorage.setItem(type, JSON.stringify(jsonData));
            return jsonData;
        } else {
            console.error(`Failed loading data/${type}.json (status ${xhr.status})`);
            return defaultReturn;
        }
    } catch (err) {
        console.error(`Error loading data/${type}.json`, err);
        return defaultReturn;
    }
}

    // Utility method to clear cache
function clearCache() {
    this.moduleCache.clear();
    console.log('Module cache cleared');
}


