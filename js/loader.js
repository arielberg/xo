let moduleCache = new Map();
    

export function installPWA (elementToWrap) {
    console.log('loaded');
}


export initApp( type, app ) {
        try {
            const url = this.get( type, app );
            if (!url) {
                throw new Error('No URL generated for loading');
            }

            // Check cache first
            if (this.moduleCache.has(url)) {
                console.log('Using cached module');
                const CachedModule = this.moduleCache.get(url);
                return this.executeModule(CachedModule);
            }

            const response = await fetch(url);
            if (response.status !== 200) {
                throw new Error(`HTTP ${response.status}: Failed to load ${url}`);
            }

            const miniAppCode = await response.text();
            console.log('Loaded code:', miniAppCode);

            // Execute and get the module
            const moduleResult = this.loadAndExecuteJS(miniAppCode);
            
            // Cache the module
            this.moduleCache.set(url, moduleResult.constructor);
            
            return moduleResult;

        } catch (error) {
            console.error('Error in initApp:', error);
            throw error;
        }
    }

function loadAndExecuteJS(jsCode) {
        try {
            // Create a safe execution context
            const moduleContext = {
                console: console,
                alert: alert,
                // Add other safe globals as needed
            };

            // Wrap the code to return the class/object
            const wrappedCode = `
                (function(context) {                   
                    ${jsCode}
                               
                })
            `;

            const moduleFactory = eval(wrappedCode);
           // const ModuleClass = moduleFactory(moduleContext);
            
            // Create instance and return it
            return new ModuleClass();

        } catch (error) {
            console.error('Error executing JS code:', error);
            throw error;
        }
    }

    executeModule(ModuleClass) {
        try {
            const instance = new ModuleClass();
            // Auto-execute if showAlert method exists
            if (typeof instance.showAlert === 'function') {
                instance.showAlert();
            }
            return instance;
        } catch (error) {
            console.error('Error executing module:', error);
            throw error;
        }
    }

export function get(command, type, op = null) {
        if (typeof command === 'undefined' || command === null) {
            return '';
        }

        if (typeof command === 'string') {
            
            switch (command) {

                case 'eval':
                    try {
                        return eval(type);
                    } catch (error) {
                        console.error('Eval error:', error);
                        return '';
                    }
                    
                case 'load':
                    return `apps/${type}`;
                    
                case 'url':
                    return command.startsWith('http') ? command : `/${command}`;
                    
                case 'relative':
                    return `./${type}`;
                    
                default:
                    console.warn('Unknown type:', type);
                   
            }
        }
        return type;        
}

    // Utility method to clear cache
 function clearCache() {
        this.moduleCache.clear();
        console.log('Module cache cleared');
    }


