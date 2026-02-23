const CACHE_NAME = 'studyjournal-v1';
const urlsToCache = [
    '/app.html',
    '/index.html',
    '/favicon.png'
    // Aggiungi qui i tuoi file CSS e JS principali
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});