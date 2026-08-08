const CACHE_NAME = 'grammar-v1';
const urlsToCache = [
    '/konkur-grammar/index.html',
    '/konkur-grammar/manifest.json',
    '/konkur-grammar/apple-touch-icon.png',
    '/konkur-grammar/favicon.ico',
    '/konkur-grammar/icon-192.png',
    '/konkur-grammar/icon-512.png',
    '/konkur-grammar/splash.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.map((key) => {
                if (key !== CACHE_NAME) return caches.delete(key);
            }));
        })
    );
});