// Example usage of ExecLoader class

// For Node.js environment
const ExecLoader = require('./exec-loader.js');

// For browser environment (include exec-loader.js in HTML first)
// const ExecLoader = window.ExecLoader;

async function demonstrateExecLoader() {
    try {
        // Create instance
        const execLoader = new ExecLoader('./exec.json');
        
        // Method 1: Auto-detect environment and load
        console.log('Loading exec.json...');
        const data = await execLoader.load();
        console.log('Loaded data:', data);
        
        // Method 2: Access specific properties
        console.log('Application name:', execLoader.get('name'));
        console.log('Version:', execLoader.get('version'));
        console.log('Configuration:', execLoader.getConfig());
        console.log('Commands:', execLoader.getCommands());
        
        // Method 3: Execute commands (if defined)
        console.log('\nExecuting commands:');
        execLoader.executeCommand('initialize');
        
        // Method 4: Check if data is loaded
        console.log('Is data loaded?', execLoader.isLoaded());
        
        // Method 5: Get all data
        console.log('Full data:', execLoader.getData());
        
    } catch (error) {
        console.error('Error in demonstration:', error);
    }
}

// Browser usage example
function browserExample() {
    const execLoader = new ExecLoader('/path/to/exec.json');
    
    execLoader.loadFromUrl()
        .then(data => {
            console.log('Loaded from URL:', data);
            return execLoader.getCommands();
        })
        .then(commands => {
            console.log('Available commands:', commands);
        })
        .catch(error => {
            console.error('Browser loading error:', error);
        });
}

// Node.js usage example
function nodeExample() {
    const execLoader = new ExecLoader('./exec.json');
    
    execLoader.loadFromFile()
        .then(data => {
            console.log('Loaded from file:', data);
            console.log('Config:', execLoader.getConfig());
        })
        .catch(error => {
            console.error('File loading error:', error);
        });
}

// JSON string usage example
function jsonStringExample() {
    const jsonString = `{
        "name": "Dynamic Config",
        "commands": [
            {
                "name": "test",
                "script": "console.log('Test executed')"
            }
        ]
    }`;
    
    const execLoader = new ExecLoader();
    const data = execLoader.loadFromString(jsonString);
    console.log('Loaded from string:', data);
    execLoader.executeCommand('test');
}

// Run demonstration if in Node.js
if (typeof require !== 'undefined') {
    demonstrateExecLoader();
}