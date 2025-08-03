class ExecLoader {
    constructor(jsonPath = './exec.json') {
        this.jsonPath = jsonPath;
        this.data = null;
    }

    /**
     * Load exec.json data (Node.js environment)
     */
    async loadFromFile() {
        try {
            if (typeof require !== 'undefined') {
                // Node.js environment
                const fs = require('fs').promises;
                const rawData = await fs.readFile(this.jsonPath, 'utf8');
                this.data = JSON.parse(rawData);
                return this.data;
            } else {
                throw new Error('loadFromFile() only works in Node.js environment. Use loadFromUrl() for browser.');
            }
        } catch (error) {
            console.error('Error loading exec.json from file:', error);
            throw error;
        }
    }

    /**
     * Load exec.json data via HTTP fetch (Browser environment)
     */
    async loadFromUrl(url = this.jsonPath) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.data = await response.json();
            return this.data;
        } catch (error) {
            console.error('Error loading exec.json from URL:', error);
            throw error;
        }
    }

    /**
     * Load from JSON string
     */
    loadFromString(jsonString) {
        try {
            this.data = JSON.parse(jsonString);
            return this.data;
        } catch (error) {
            console.error('Error parsing JSON string:', error);
            throw error;
        }
    }

    /**
     * Auto-detect environment and load appropriately
     */
    async load() {
        try {
            if (typeof window !== 'undefined') {
                // Browser environment
                return await this.loadFromUrl();
            } else {
                // Node.js environment
                return await this.loadFromFile();
            }
        } catch (error) {
            console.error('Error auto-loading exec.json:', error);
            throw error;
        }
    }

    /**
     * Get all data
     */
    getData() {
        return this.data;
    }

    /**
     * Get specific property from the loaded data
     */
    get(key) {
        return this.data ? this.data[key] : undefined;
    }

    /**
     * Check if data is loaded
     */
    isLoaded() {
        return this.data !== null;
    }

    /**
     * Get execution commands if they exist
     */
    getCommands() {
        return this.get('commands') || this.get('exec') || [];
    }

    /**
     * Get configuration if it exists
     */
    getConfig() {
        return this.get('config') || this.get('configuration') || {};
    }

    /**
     * Execute a command by name (if commands are defined)
     */
    executeCommand(commandName) {
        const commands = this.getCommands();
        const command = commands.find(cmd => cmd.name === commandName);
        
        if (command) {
            console.log(`Executing command: ${commandName}`);
            if (command.script) {
                return eval(command.script);
            }
            if (command.function && typeof window[command.function] === 'function') {
                return window[command.function]();
            }
        } else {
            console.warn(`Command '${commandName}' not found`);
        }
    }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExecLoader;
}
if (typeof window !== 'undefined') {
    window.ExecLoader = ExecLoader;
}