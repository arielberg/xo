let moduleCache = new Map();
    
export function initApp() {
    var pages = getList('pages');

    var tabContainer = document.getElementById('tabs');
    pages.forEach(page => {
        var tab = document.createElement('div');
        tab.className = 'tab';
        tab.textContent = page.title;
        tab.onclick = async () => { 
             try {
                console.log(`Loading page: ${page.title} from ${page.path}`,page);
                let module = await import('../pages'+page.path);
                module.renderPage("content");
            } catch (e) {
                console.error(e);
                content.innerHTML = `<h3>${page.title}</h3><p>Error loading page.</p>`;
            }
        }
        tabContainer.appendChild(tab);

    });
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


