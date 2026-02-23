const CACHE_NAME = 'studyjournal-v2';
const urlsToCache = [
    '/app.html',
    '/index.html',
    '/favicon.png',
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
    '/cloud-storage.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});