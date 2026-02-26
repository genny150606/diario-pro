const CACHE_NAME = 'studyjournal-bust-v4';

self.addEventListener('install', event => {
    // Force new service worker to install immediately
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Wipe ALL caches to rescue trapped users
                    return caches.delete(cacheName);
                })
            );
        })
    );
    // Take control immediately and force refresh
    self.clients.claim().then(() => {
        self.clients.matchAll().then(clients => {
            clients.forEach(client => client.navigate(client.url));
        });
    });
});

self.addEventListener('fetch', event => {
    // DO NOT CACHE ANYTHING ANYMORE
    // The React + Vite build handles caching via hashes
    event.respondWith(fetch(event.request));
});