/**
 * Sabeel Academy - Production Progressive Web App (PWA) Service Worker
 * Version: 1.0.0
 * Features:
 *  - High-performance asset caching & instant app launch
 *  - Offline fallback resilience
 *  - Safe exclusion of all Firestore, Firebase Auth, and FCM sensitive endpoints
 *  - Seamless background push & session reminder notifications
 */

const CACHE_NAME = 'sabeel-pwa-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Core static assets to pre-cache during installation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/register.html',
  '/manifest.json',
  '/assets/css/variables.css',
  '/assets/css/main.css',
  '/assets/css/components.css',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/favicon.ico',
  '/favicon.png'
];

// Domains and endpoints strictly bypassed by Service Worker Cache
const BYPASS_URL_PATTERNS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'fcm.googleapis.com',
  'firebasestorage.googleapis.com',
  'google-analytics.com',
  'analytics.google.com',
  'api.whatsapp.com',
  'wa.me'
];

// 1. Install Event: Pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Sabeel SW] Pre-caching app shell & essential assets');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[Sabeel SW] Non-fatal pre-cache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up outdated caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Sabeel SW] Removing legacy cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Smart routing with strict Firebase & live data safety
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Exclude non-GET requests (POST, PUT, DELETE, PATCH)
  if (request.method !== 'GET') {
    return;
  }

  // Exclude non-http(s) schemas (like chrome-extension://)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Strictly exclude Firebase Auth, Firestore, FCM, and dynamic external services
  const isBypassed = BYPASS_URL_PATTERNS.some((pattern) => url.hostname.includes(pattern) || url.pathname.includes(pattern));
  if (isBypassed) {
    return;
  }

  // A. Navigation Requests (HTML Pages): Network-First with Cache/Offline Fallback
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return cached login page or offline page if offline
          const fallback = await caches.match('/index.html');
          return fallback || new Response(
            `<!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>سبيل - غير متصل بالإنترنت</title>
              <style>
                body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 1.5rem; text-align: center; direction: rtl; }
                .card { background: #1e293b; padding: 2rem; border-radius: 1rem; border: 1px solid #334155; max-width: 420px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
                h1 { color: #14b8a6; margin-top: 0; font-size: 1.5rem; }
                p { color: #94a3b8; font-size: 0.95rem; line-height: 1.6; }
                button { background: #0d9488; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: bold; cursor: pointer; margin-top: 1rem; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>📡 لا يوجد اتصال بالإنترنت</h1>
                <p>يبدو أن جهازك غير متصل بالإنترنت حالياً. يرجى التحقق من اتصال الشبكة وإعادة المحاولة للوصول إلى النظام المباشر.</p>
                <button onclick="window.location.reload()">إعادة المحاولة 🔄</button>
              </div>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // B. Static Assets (CSS, JS, Images, Icons, Fonts): Stale-While-Revalidate
  const isStaticAsset = ['style', 'script', 'image', 'font'].includes(request.destination) ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        }).catch(() => {
          // Network fetch failed; silence error if we already served cache
        });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});

// 4. Push Event: Background session alerts and system notifications
self.addEventListener('push', (event) => {
  let data = {
    title: 'تنبيه أكاديمية سبيل ⏰',
    body: 'لديك موعد حصة جديد أو تنبيه مهم في الأكاديمية.'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || data.notification?.body || 'لديك موعد حصة قريب، يرجى التجهز.',
    icon: data.icon || data.notification?.icon || '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || `sabeel_notif_${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || data.data?.url || '/teacher/today-sessions.html',
      notifId: data.notifId || data.data?.notifId || ''
    },
    actions: [
      {
        action: 'open_url',
        title: 'فتح الصفحة 📖'
      }
    ]
  };

  const notificationTitle = data.title || data.notification?.title || 'أكاديمية سبيل 📖';

  event.waitUntil(
    self.registration.showNotification(notificationTitle, options)
  );
});

// 5. Notification Click Handler: Deep Link navigation
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/teacher/today-sessions.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
