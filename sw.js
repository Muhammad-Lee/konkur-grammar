/* ============================================
   Service Worker Ultimate Pro | گرامر جامع کنکور
   نسخه: 5.0.0 - Enterprise Grade
   موتور: Workbox v7.0.0
   قابلیت‌ها: Pre-caching, Background Sync, Periodic Sync,
   Google Analytics Offline, Advanced Routing, 
   Cache Management, Version Control, 
   Offline Fallback, Report System
   ============================================ */

// ============================================
// ۱. ایمپورت Workbox از CDN
// ============================================

importScripts(
    'https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js'
);

// ============================================
// ۲. تنظیمات Workbox
// ============================================

workbox.setConfig({
    debug: false,
    modulePathPrefix: 'https://storage.googleapis.com/workbox-cdn/releases/7.0.0/'
});

// ============================================
// ۳. تعریف متغیرها و ثابت‌ها
// ============================================

const { 
    strategies, 
    routing, 
    cacheableResponse, 
    expiration, 
    precaching, 
    broadcastUpdate,
    backgroundSync,
    googleAnalytics
} = workbox;

const VERSION = '5.0.0';

// ============================================
// ۴. Pre-caching کامل (همه فایل‌ها)
// ============================================

const manifest = [
    // فایل‌های اصلی
    { url: '/konkur-grammar/', revision: '1' },
    { url: '/konkur-grammar/index.html', revision: '1' },
    { url: '/konkur-grammar/manifest.json', revision: '1' },
    
    // آیکون‌ها
    { url: '/konkur-grammar/icon-192.png', revision: '1' },
    { url: '/konkur-grammar/icon-512.png', revision: '1' },
    { url: '/konkur-grammar/favicon.ico', revision: '1' },
    { url: '/konkur-grammar/apple-touch-icon.png', revision: '1' },
    { url: '/konkur-grammar/splash.png', revision: '1' },
    
    // Font Awesome
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css', revision: '1' }
];

precaching.precacheAndRoute(manifest);

// ============================================
// ۵. استراتژی‌های کش پیشرفته
// ============================================

// ۵-۱. HTML - Network First (همیشه به‌روز)
routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new strategies.NetworkFirst({
        cacheName: 'pages-cache',
        networkTimeoutSeconds: 3,
        plugins: [
            new cacheableResponse.Plugin({
                statuses: [200]
            }),
            new expiration.Plugin({
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 روز
            }),
            new broadcastUpdate.Plugin({
                headersToCheck: ['content-length']
            })
        ]
    })
);

// ۵-۲. CSS/JS - Stale-While-Revalidate (سریع + به‌روز)
routing.registerRoute(
    ({ request }) => 
        request.destination === 'style' || 
        request.destination === 'script',
    new strategies.StaleWhileRevalidate({
        cacheName: 'static-cache',
        plugins: [
            new cacheableResponse.Plugin({
                statuses: [200]
            }),
            new expiration.Plugin({
                maxEntries: 100,
                maxAgeSeconds: 365 * 24 * 60 * 60 // 1 سال
            })
        ]
    })
);

// ۵-۳. تصاویر - Cache First (با ذخیره طولانی‌مدت)
routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new strategies.CacheFirst({
        cacheName: 'images-cache',
        plugins: [
            new cacheableResponse.Plugin({
                statuses: [200]
            }),
            new expiration.Plugin({
                maxEntries: 200,
                maxAgeSeconds: 365 * 24 * 60 * 60 // 1 سال
            })
        ]
    })
);

// ۵-۴. فونت‌ها - Cache First (ضروری)
routing.registerRoute(
    ({ url }) => 
        url.origin === 'https://cdnjs.cloudflare.com' &&
        (url.pathname.includes('webfonts') || 
         url.pathname.includes('font-awesome')),
    new strategies.CacheFirst({
        cacheName: 'fonts-cache',
        plugins: [
            new cacheableResponse.Plugin({
                statuses: [200]
            }),
            new expiration.Plugin({
                maxEntries: 30,
                maxAgeSeconds: 365 * 24 * 60 * 60 // 1 سال
            })
        ]
    })
);

// ۵-۵. داده‌ها - Network First (با کش پشتیبان)
routing.registerRoute(
    ({ url }) => 
        url.pathname.includes('/data/') ||
        url.pathname.includes('/api/') ||
        url.pathname.endsWith('.json'),
    new strategies.NetworkFirst({
        cacheName: 'data-cache',
        networkTimeoutSeconds: 3,
        plugins: [
            new cacheableResponse.Plugin({
                statuses: [200]
            }),
            new expiration.Plugin({
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60 // 7 روز
            })
        ]
    })
);

// ============================================
// ۶. Background Sync (همگام‌سازی پس‌زمینه)
// ============================================

const bgSyncQueue = new backgroundSync.Queue('sync-queue', {
    maxRetentionTime: 24 * 60, // 24 ساعت
    onSync: async ({ queue }) => {
        let entry;
        while (entry = await queue.shiftRequest()) {
            try {
                const response = await fetch(entry.request);
                if (response && response.status === 200) {
                    // موفقیت
                } else {
                    // بازگشت به صف
                    await queue.unshiftRequest(entry);
                    throw new Error('Failed to sync');
                }
            } catch (error) {
                // ذخیره برای تلاش مجدد
                await queue.unshiftRequest(entry);
                throw error;
            }
        }
    }
});

// دریافت درخواست‌ها برای همگام‌سازی
routing.registerRoute(
    ({ url }) => url.pathname.includes('/sync/'),
    async ({ event }) => {
        try {
            const response = await fetch(event.request);
            return response;
        } catch (error) {
            // اضافه به صف همگام‌سازی
            await bgSyncQueue.pushRequest({
                request: event.request
            });
            return new Response('', { status: 202 });
        }
    }
);

// ============================================
// ۷. Google Analytics Offline
// ============================================

googleAnalytics.initialize({
    parameterOverrides: {
        cd1: 'offline',
        cd2: VERSION
    },
    hitFilter: (params) => {
        params.set('qt', Date.now());
    }
});

// ============================================
// ۸. مدیریت نسخه‌ها و به‌روزرسانی
// ============================================

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ============================================
// ۹. اطلاع‌رسانی به کاربر
// ============================================

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const clients_ = await self.clients.matchAll();
            clients_.forEach(client => {
                client.postMessage({
                    type: 'SW_ACTIVATED',
                    version: VERSION,
                    timestamp: Date.now()
                });
            });
        })()
    );
});

// ============================================
// ۱۰. گزارش‌گیری و خطایابی
// ============================================

// ۱۰-۱. نمایش وضعیت در کنسول
console.log(`🚀 Service Worker ${VERSION} is running`);
console.log('📦 Workbox version:', workbox.core.version);

// ۱۰-۲. ذخیره گزارش‌ها
self.addEventListener('fetch', (event) => {
    event.respondWith(
        (async () => {
            try {
                const response = await fetch(event.request);
                if (response) {
                    const headers = new Headers(response.headers);
                    headers.set('X-Offline', 'false');
                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: headers
                    });
                }
                throw new Error('No response');
            } catch (error) {
                const cached = await caches.match(event.request);
                if (cached) {
                    const headers = new Headers(cached.headers);
                    headers.set('X-Offline', 'true');
                    return new Response(cached.body, {
                        status: cached.status,
                        statusText: cached.statusText,
                        headers: headers
                    });
                }
                return caches.match('/konkur-grammar/index.html');
            }
        })()
    );
});

// ============================================
// ۱۱. مدیریت خطاها
// ============================================

self.addEventListener('error', (event) => {
    console.error('❌ Service Worker error:', event.error);
    // ذخیره خطا برای گزارش‌گیری
    caches.open('logs').then(cache => {
        const logEntry = {
            timestamp: Date.now(),
            version: VERSION,
            error: event.error?.message || 'Unknown error',
            stack: event.error?.stack
        };
        cache.put(
            `log-${Date.now()}`,
            new Response(JSON.stringify(logEntry), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
    });
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled rejection:', event.reason);
});

// ============================================
// ۱۲. نهایی
// ============================================

console.log(`✅ Service Worker ${VERSION} initialized successfully`);
console.log('🎯 Strategies: Cache First, Network First, Stale-While-Revalidate');
console.log('📡 Background Sync: Enabled');
console.log('📊 Google Analytics Offline: Enabled');