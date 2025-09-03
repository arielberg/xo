<!DOCTYPE html>
<html>
<head>
    <title>JavaScript Eval</title>
    <style>
        body { margin: 0; font-family: Arial, sans-serif; }
        .container { display: flex; height: 100vh; }
        .sidebar { width: 200px; background: #f0f0f0; padding: 20px; }
        .sidebar button { width: 100%; padding: 10px; margin-bottom: 10px; cursor: pointer; }
        .sidebar button.active { background: #007cba; color: white; }
        .content { flex: 1; padding: 20px; }
        .view { display: none; }
        .view.active { display: block; }
        .app-item { border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; }
        .app-item h4 { margin: 0 0 10px 0; }
        .app-item button { margin-right: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="sidebar">
            <h3>Mini App Builder</h3>
            <button class="nav-btn active" onclick="showView('create')">Create App</button>
            <button class="nav-btn" onclick="showView('myapps')">My Apps</button>
        </div>
        
        <div class="content">
            <!-- Create App View -->
            <div id="create-view" class="view active">
                <h1>Create App</h1>
                
                <input type="text" id="appName" placeholder="App name..." style="width: 300px; padding: 5px; margin-bottom: 10px;"><br>
                <textarea id="commandInput" rows="15" cols="80" placeholder="Enter JavaScript commands here..."></textarea>
                <br><br>
                
                <button onclick="runCommand()">Run</button>
                <button onclick="clearAll()">Clear</button>
                <button onclick="saveToCache()">Save to Cache</button>
                <button onclick="saveToFile()">Save to File</button>
                <br><br>
                
                <h3>Output:</h3>
                <div id="output"></div>
            </div>
            
            <!-- My Apps View -->
            <div id="myapps-view" class="view">
                <h1>My Apps</h1>
                <div id="appsList"></div>
            </div>
        </div>
    </div>
    
    <script>
        function runCommand() {
            const input = document.getElementById('commandInput').value;
            const output = document.getElementById('output');
            
            try {
                const result = eval(input);
                output.innerHTML = '<pre>' + String(result) + '</pre>';
            } catch (error) {
                output.innerHTML = '<pre style="color: red;">Error: ' + error.message + '</pre>';
            }
        }
        
        function clearAll() {
            document.getElementById('commandInput').value = '';
            document.getElementById('output').innerHTML = '';
        }
        
        // Simple hash function for versioning
        function hashCode(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash).toString(16);
        }
        
        function saveToCache() {
            const code = document.getElementById('commandInput').value;
            const name = document.getElementById('appName').value || 'Untitled App';
            
            if (!code.trim()) {
                alert('No code to save!');
                return;
            }
            
            const currentVersion = hashCode(code);
            let savedApps = JSON.parse(localStorage.getItem('miniApps') || '[]');
            
            // Check if we're editing an existing app
            if (window.editingAppId) {
                const appIndex = savedApps.findIndex(a => a.id === window.editingAppId);
                if (appIndex >= 0) {
                    // Update existing app - store previous version in history
                    const existingApp = savedApps[appIndex];
                    const previousVersions = existingApp.previousVersions || [];
                    
                    // Add current version to history
                    previousVersions.push({
                        version: existingApp.currentVersion,
                        code: existingApp.code,
                        timestamp: existingApp.updated || existingApp.created
                    });
                    
                    savedApps[appIndex] = {
                        ...existingApp,
                        name: name,
                        currentVersion: currentVersion,
                        code: code,
                        previousVersions: previousVersions,
                        updated: new Date().toLocaleString()
                    };
                    
                    window.editingAppId = null; // Clear editing state
                    localStorage.setItem('miniApps', JSON.stringify(savedApps));
                    alert('App updated with previous version saved!');
                    document.getElementById('appName').value = '';
                    document.getElementById('commandInput').value = '';
                    return;
                }
            }
            
            // Check if app already exists by name
            const existingIndex = savedApps.findIndex(app => app.name === name);
            
            if (existingIndex >= 0) {
                // Update existing app - store previous version in history
                const existingApp = savedApps[existingIndex];
                const previousVersions = existingApp.previousVersions || [];
                
                // Add current version to history
                previousVersions.push({
                    version: existingApp.currentVersion,
                    code: existingApp.code,
                    timestamp: existingApp.updated || existingApp.created
                });
                
                savedApps[existingIndex] = {
                    ...existingApp,
                    currentVersion: currentVersion,
                    code: code,
                    previousVersions: previousVersions,
                    updated: new Date().toLocaleString()
                };
            } else {
                // Create new app
                const app = {
                    id: Date.now(),
                    name: name,
                    code: code,
                    currentVersion: currentVersion,
                    previousVersions: [],
                    created: new Date().toLocaleString()
                };
                savedApps.push(app);
            }
            
            localStorage.setItem('miniApps', JSON.stringify(savedApps));
            alert('App saved to cache!');
            document.getElementById('appName').value = '';
            document.getElementById('commandInput').value = '';
        }
        
        function saveToFile() {
            const code = document.getElementById('commandInput').value;
            const name = document.getElementById('appName').value || 'Untitled App';
            
            if (!code.trim()) {
                alert('No code to save!');
                return;
            }
            
            // Create class code for download
            const miniAppCode = `class miniApp {
    constructor() {
        this.code = \`${code.replace(/`/g, '\\`')}\`;
    }
    
    run() {
        try {
            return eval(this.code);
        } catch (error) {
            console.error('Error:', error.message);
            return error.message;
        }
    }
}`;
            
            // Create and download the file
            const blob = new Blob([miniAppCode], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.js';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('App downloaded as file!');
        }
        
        function showView(viewName) {
            // Hide all views
            document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            
            // Show selected view
            document.getElementById(viewName + '-view').classList.add('active');
            event.target.classList.add('active');
            
            if (viewName === 'myapps') {
                loadMyApps();
            }
        }
        
        function loadMyApps() {
            const savedApps = JSON.parse(localStorage.getItem('miniApps') || '[]');
            const appsList = document.getElementById('appsList');
            
            if (savedApps.length === 0) {
                appsList.innerHTML = '<p>No apps saved yet.</p>';
                return;
            }
            
            appsList.innerHTML = savedApps.map(app => `
                <div class="app-item">
                    <h4>${app.name}</h4>
                    <p>Created: ${app.created}</p>
                    <p>Current Version: ${app.currentVersion || 'N/A'}</p>
                    <p>Last Version: ${(app.previousVersions && app.previousVersions.length > 0) ? app.previousVersions[app.previousVersions.length - 1].version : 'N/A'}</p>
                    <button onclick="runSavedApp(${app.id})">Run</button>
                    <button onclick="editApp(${app.id})">Edit</button>
                    <button onclick="editMeta(${app.id})">Edit Meta</button>
                    <button onclick="downloadApp(${app.id})">Download</button>
                    <button onclick="deleteApp(${app.id})">Delete</button>
                    <div id="output-${app.id}" style="margin-top: 10px;"></div>
                </div>
            `).join('');
        }
        
        function runSavedApp(id) {
            const savedApps = JSON.parse(localStorage.getItem('miniApps') || '[]');
            const app = savedApps.find(a => a.id === id);
            const output = document.getElementById(`output-${id}`);
            
            try {
                const result = eval(app.code);
                output.innerHTML = '<pre>' + String(result) + '</pre>';
            } catch (error) {
                output.innerHTML = '<pre style="color: red;">Error: ' + error.message + '</pre>';
            }
        }
        
        function editApp(id) {
            const savedApps = JSON.parse(localStorage.getItem('miniApps') || '[]');
            const app = savedApps.find(a => a.id === id);
            
            // Load app into create view for editing
            document.getElementById('appName').value = app.name;
            document.getElementById('commandInput').value = app.code;
            showView('create');
            
            // Store the app ID for saving with version history
            window.editingAppId = id;
            
            // Update nav button
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector('.nav-btn').classList.add('active');
        }
        
        function editMeta(id) {
            const savedApps = JSON.parse(localStorage.getItem('miniApps') || '[]');
            const app = savedApps.find(a => a.id === id);
            
            // Create meta edit form
            const editForm = document.createElement('div');
            editForm.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border: 2px solid #ccc; z-index: 1000; width: 400px;';
            
            const lastVersion = (app.previousVersions && app.previousVersions.length > 0) ? 
                app.previousVersions[app.previousVersions.length - 1].version : '';
            
            editForm.innerHTML = `
                <h3>Edit Meta: ${app.name}</h3>
                <label>Current Version Hash:</label><br>
                <input type="text" id="editCurrentVersion" value="${app.currentVersion || ''}" style="width: 100%; margin-bottom: 10px; padding: 5px;"><br>
                
                <label>Last Version Hash:</label><br>
                <input type="text" id="editLastVersion" value="${lastVersion}" style="width: 100%; margin-bottom: 10px; padding: 5px;"><br>
                
                <button onclick="saveMetaChanges(${id})">Save Meta</button>
                <button onclick="closeMetaForm()">Cancel</button>
            `;
            
            // Add overlay
            const overlay = document.createElement('div');
            overlay.id = 'metaEditOverlay';
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999;';
            overlay.onclick = closeMetaForm;
            
            document.body.appendChild(overlay);
            document.body.appendChild(editForm);
        }
        
        function saveMetaChanges(id) {
            const newCurrentVersion = document.getElementById('editCurrentVersion').value.trim();
            const newLastVersion = document.getElementById('editLastVersion').value.trim();
            
            if (!newCurrentVersion) {
                alert('Current version cannot be empty!');
                return;
            }
            
            let savedApps = JSON.parse(localStorage.getItem('miniApps') || '[]');
            const appIndex = savedApps.findIndex(a => a.id === id);
            
            if (appIndex >= 0) {
                savedApps[appIndex].currentVersion = newCurrentVersion;
                
                // Update last version in history
                if (savedApps[appIndex].previousVersions && savedApps[appIndex].previousVersions.length > 0 && newLastVersion) {
                    savedApps[appIndex].previousVersions[savedApps[appIndex].previousVersions.length - 1].version = newLastVersion;
                }
                
                savedApps[appIndex].updated = new Date().toLocaleString();
                localStorage.setItem('miniApps', JSON.stringify(savedApps));
                
                closeMetaForm();
                loadMyApps();
                alert('Meta data updated!');
            }
        }
        
        function closeMetaForm() {
            const overlay = document.getElementById('metaEditOverlay');
            if (overlay) overlay.remove();
            const forms = document.querySelectorAll('div[style*="position: fixed"]');
            forms.forEach(form => {
                if (form.innerHTML.includes('Edit Meta:')) {
                    form.remove();
                }
            });
        }
        
        function downloadApp(id) {
            const savedApps = JSON.parse(localStorage.getItem('miniApps') || '[]');
            const app = savedApps.find(a => a.id === id);
            
            const miniAppCode = `class miniApp {
    constructor() {
        this.code = \`${app.code.replace(/`/g, '\\`')}\`;
    }
    
    run() {
        try {
            return eval(this.code);
        } catch (error) {
            console.error('Error:', error.message);
            return error.message;
        }
    }
}`;
            
            const blob = new Blob([miniAppCode], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = app.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.js';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        function deleteApp(id) {
            if (confirm('Are you sure you want to delete this app?')) {
                let savedApps = JSON.parse(localStorage.getItem('miniApps') || '[]');
                savedApps = savedApps.filter(app => app.id !== id);
                localStorage.setItem('miniApps', JSON.stringify(savedApps));
                loadMyApps();
            }
        }
    </script>
</body>
</html>