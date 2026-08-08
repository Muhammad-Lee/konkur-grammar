const CACHE_NAME = 'konkur-grammar-v2';
const STATIC_FILES = [
    '/konkur-grammar/',
    '/konkur-grammar/index.html',
    '/konkur-grammar/manifest.json',
    '/konkur-grammar/icon-192.png',
    '/konkur-grammar/icon-512.png',
    '/konkur-grammar/favicon.ico',
    '/konkur-grammar/apple-touch-icon.png',
    '/konkur-grammar/splash.png'
];

// ============================================
// نصب: کش فایل‌های استاتیک
// ============================================
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_FILES);
        }).then(() => self.skipWaiting())
    );
});

// ============================================
// فعال‌سازی: حذف کش‌های قدیمی
// ============================================
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// ============================================
// دریافت: استراتژی "Cache First with Network Fallback"
// ============================================
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // درخواست‌های محتوای داینامیک (درس‌ها و تست‌ها)
    if (url.pathname.includes('/lesson/') || url.pathname.includes('/test/')) {
        event.respondWith(
            caches.match(event.request).then(response => {
                if (response) {
                    // به‌روزرسانی کش در پس‌زمینه
                    fetch(event.request).then(networkResponse => {
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, networkResponse);
                        });
                    });
                    return response;
                }
                return fetch(event.request).then(response => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                }).catch(() => {
                    return new Response('محتوا در حالت آفلاین در دسترس نیست', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
        );
    } else {
        // درخواست‌های استاتیک
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
    }
});