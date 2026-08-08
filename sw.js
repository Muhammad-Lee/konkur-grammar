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
    
    // استراتژی کش برای محتوای داینامیک (درس‌ها و تست‌ها)
    // و همچنین هر درخواست GET که شامل محتوای متنی است
    if (url.pathname.includes('/lesson/') || 
        url.pathname.includes('/test/') ||
        url.pathname.endsWith('.html') ||
        url.pathname === '/' ||
        url.pathname === '/konkur-grammar/') {
        
        event.respondWith(
            caches.match(event.request).then(response => {
                if (response) {
                    // به‌روزرسانی کش در پس‌زمینه
                    fetch(event.request).then(networkResponse => {
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, networkResponse);
                            });
                        }
                    }).catch(() => {});
                    return response;
                }
                return fetch(event.request).then(response => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        if (response && response.status === 200) {
                            cache.put(event.request, responseClone);
                        }
                    });
                    return response;
                }).catch(() => {
                    return new Response('محتوا در حالت آفلاین در دسترس نیست', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({
                            'Content-Type': 'text/html; charset=UTF-8'
                        })
                    });
                });
            })
        );
    } else {
        // درخواست‌های استاتیک (تصاویر، فایل‌های CSS، JS)
        event.respondWith(
            caches.match(event.request).then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(response => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        if (response && response.status === 200) {
                            cache.put(event.request, responseClone);
                        }
                    });
                    return response;
                }).catch(() => {
                    // برای تصاویر، یک تصویر placeholder برگردان
                    if (event.request.url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
                        return new Response('', { status: 404 });
                    }
                    return new Response('محتوا در حالت آفلاین در دسترس نیست', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
        );
    }
});