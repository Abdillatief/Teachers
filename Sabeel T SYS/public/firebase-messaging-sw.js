// Unified Service Worker for Sabeel Academy PWA & Firebase Cloud Messaging (FCM)
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const CACHE_NAME = 'sabeel-pwa-v1.0.0';

// Core static assets to pre-cache
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

// Initialize Firebase in Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyCDQ7fVz00-BsITXg5qgIkh5KN9SkDJ3Lc",
  authDomain: "sabeelteacher.firebaseapp.com",
  projectId: "sabeelteacher",
  storageBucket: "sabeelteacher.firebasestorage.app",
  messagingSenderId: "1036327109252",
  appId: "1:1036327109252:web:e8077bca8d147b2a03f8d1"
});

const messaging = firebase.messaging();

// 1. Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[FCM-SW] Pre-caching warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Smart Cache Routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  const isBypassed = BYPASS_URL_PATTERNS.some((pattern) => url.hostname.includes(pattern) || url.pathname.includes(pattern));
  if (isBypassed) {
    return;
  }

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
          if (cachedResponse) return cachedResponse;
          const fallback = await caches.match('/index.html');
          return fallback || caches.match('/offline.html');
        })
    );
    return;
  }

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
        }).catch(() => {});

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});

// 4. FCM Background Message Listener
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM-SW] Background Push Message:', payload);
  const title = payload.notification?.title || payload.data?.title || 'إشعار جديد من سبيل ⏰';
  const body = payload.notification?.body || payload.data?.body || 'لديك إشعار جديد من الأكاديمية';
  const icon = payload.notification?.icon || payload.data?.icon || '/icons/icon-192.png';
  
  const studentName = payload.data?.studentName || '';
  const sessionTime = payload.data?.sessionTime || '';
  const duration = payload.data?.duration || '';
  const sessionId = payload.data?.sessionId || '';
  const studentId = payload.data?.studentId || '';
  const notifId = payload.data?.notifId || '';
  
  let targetUrl = payload.data?.url || '/teacher/today-sessions.html';
  if (sessionId) {
    targetUrl = `/teacher/today-sessions.html?sessionId=${encodeURIComponent(sessionId)}`;
  } else if (studentId) {
    targetUrl = `/teacher/today-sessions.html?studentId=${encodeURIComponent(studentId)}`;
  }

  let formattedBody = body;
  if (studentName && sessionTime) {
    formattedBody = `الطالب: ${studentName} | الموعد: ${sessionTime}${duration ? ` | المدة: ${duration} دقيقة` : ''}\n${body}`;
  }

  const options = {
    body: formattedBody,
    icon: icon,
    badge: '/icons/icon-96.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: notifId || payload.data?.tag || `notif_${sessionId || studentId || Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: {
      url: targetUrl,
      sessionId: sessionId,
      studentId: studentId,
      notifId: notifId
    },
    actions: [
      {
        action: 'open_url',
        title: 'فتح الصفحة 📖'
      }
    ]
  };

  self.registration.showNotification(title, options);
});

// 5. Generic Web Push Fallback
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      let data = {};
      try {
        data = event.data.json();
      } catch (e) {
        data = { body: event.data.text() };
      }

      const title = data.notification?.title || data.data?.title || data.title || 'إشعار عاجل من سبيل 🔔';
      const body = data.notification?.body || data.data?.body || data.body || 'إشعار جديد في الأكاديمية';
      const icon = data.notification?.icon || data.data?.icon || data.icon || '/icons/icon-192.png';
      const notifId = data.data?.notifId || data.notifId || '';
      let url = data.data?.url || data.url || '/teacher/today-sessions.html';

      const options = {
        body: body,
        icon: icon,
        badge: '/icons/icon-96.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: notifId || `push_${Date.now()}`,
        renotify: true,
        requireInteraction: true,
        data: { url: url, notifId: notifId }
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (err) {
      console.error('[FCM-SW] push error:', err);
    }
  }
});

// 6. Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let targetUrl = event.notification.data?.url || '/teacher/today-sessions.html';
  const notifId = event.notification.data?.notifId;

  if (notifId) {
    const sep = targetUrl.includes('?') ? '&' : '?';
    targetUrl = `${targetUrl}${sep}notifId=${encodeURIComponent(notifId)}&action=clicked`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
