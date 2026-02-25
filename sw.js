const CACHE_NAME = 'studyjournal-v3';
const urlsToCache = [
    '/app.html',
    '/index.html',
    '/favicon.png',
    '/home.css',
    '/theme.css',
    '/global.css',
    '/layout.css',
    '/style.css',
    '/features.css',
    '/animations.css',
    '/responsive.css',
    '/gamification.css',
    '/script.js',
    '/auth.js',
    '/ui-manager.js',
    '/ui-interactions.js',
    '/cloud-storage.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    // Escludiamo le API dal caching del SW
    if (event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});