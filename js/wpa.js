const manifest = {
    "short_name": "hello",
    "name": "Hello World PWA",
    "icons": [
        {
            "src": "/favicon-192x192.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "/favicon-512x512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ],
    "start_url": ".",
    "display": "standalone",
    "theme_color": "#000000",
    "background_color": "#ffffff"
};

const base64Manifest = btoa(JSON.stringify(manifest));
const link = document.createElement("link");
link.rel = "manifest";
link.href = `data:application/json;base64,${base64Manifest}`;
document.head.appendChild(link);

<link rel="apple-touch-icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgZmlsbD0iIzIxOTZGMyIvPjx0ZXh0IHg9IjY0IiB5PSI2NCIgdHlwZT0ibWlkZGxlIiBmb250LXNpemU9IjMxcHgiIGZpbGw9IiNmZmZmZmYiPkhlbGxvPC90ZXh0Pjwvc3ZnPg==">


/ PWA Installation
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'inline-block';
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response: ${outcome}`);
        deferredPrompt = null;
        installBtn.style.display = 'none';
    }
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    
    window.addEventListener('load', () => {
        /*
        console.log('load');
        developer;
        const swCode = `
            
        `;
        
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        
        navigator.serviceWorker.register(swUrl)
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
        */
    });
}


