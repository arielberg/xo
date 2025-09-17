const CACHE_NAME = 'web3-pwa-v1';
const CACHE_VERSION = '1.0';

// Files to cache for offline functionality
const urlsToCache = [];
  /*
  './',
  './index.html',
  './manifest.json',
  './data/pages.json',
  './data/settings.json',
   './data/users.json',
   './pages/users.js',
   './css/style.css',
  // Add other static assets here as needed
  // './styles.css',
  // './script.js',
  // './images/icon-192.png'
];
*/

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker version', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache)
          .catch(error => {
            console.warn('[SW] Failed to cache some resources:', error);
            // Don't fail the install if some resources can't be cached
            return Promise.resolve();
          });
      })
      .then(() => {
        console.log('[SW] Installation complete');
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker version', CACHE_VERSION);
  self.clients.claim();
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {

  console.log('[SW] fetch event:', event);

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          console.log('[SW] Serving from cache:', event.request.url);
          return response;
        }

        // Otherwise, fetch from network
        console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(response => {
           
            console.log('[SW] responsek:', response);
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Add to cache for future use
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            console.log('[SW] Network fetch failed:', error);
            
            // Return a custom offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return new Response(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Hello World PWA - Offline</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      text-align: center;
                      padding: 50px;
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      min-height: 100vh;
                      margin: 0;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      flex-direction: column;
                    }
                    h1 { font-size: 2rem; margin-bottom: 1rem; }
                    p { font-size: 1.2rem; }
                    .emoji { font-size: 3rem; margin-bottom: 1rem; }
                  </style>
                </head>
                <body>
                  <div class="emoji">📱</div>
                  <h1>You're Offline!</h1>
                  <p>This PWA is working offline thanks to Service Worker caching.</p>
                  <p>Check your connection and try again.</p>
                </body>
                </html>
              `, {
                status: 200,
                headers: {
                  'Content-Type': 'text/html'
                }
              });
            }
            
            // For other requests, return a simple offline response
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Listen for messages from the main thread
self.addEventListener('message', event => {
  console.log('[SW] Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION',
      version: CACHE_VERSION
    });
  }
});

// Background sync (if supported)
self.addEventListener('sync', event => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Add your background sync logic here
      console.log('[SW] Performing background sync')
    );
  }
});

// Push notifications (if needed)
self.addEventListener('push', event => {
  console.log('[SW] Push event received');
  
  const options = {
    body: event.data ? event.data.text() : 'Hello from your PWA!',
    icon: './icon-192.png',
    badge: './badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: './action-icon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: './close-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Hello World PWA', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click received');
  
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.openWindow('./')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

console.log('[SW] Service Worker script loaded successfully');