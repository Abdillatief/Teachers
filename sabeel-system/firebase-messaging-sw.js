// Service Worker for Firebase Cloud Messaging (FCM) & Web Push
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCDQ7fVz00-BsITXg5qgIkh5KN9SkDJ3Lc",
  authDomain: "sabeelteacher.firebaseapp.com",
  projectId: "sabeelteacher",
  storageBucket: "sabeelteacher.firebasestorage.app",
  messagingSenderId: "1036327109252",
  appId: "1:1036327109252:web:e8077bca8d147b2a03f8d1"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background Push Message:', payload);
  const title = payload.notification?.title || payload.data?.title || 'إشعار جديد من سبيل ⏰';
  const body = payload.notification?.body || payload.data?.body || 'لديك إشعار جديد من الأكاديمية';
  const icon = payload.notification?.icon || payload.data?.icon || '/assets/icons/icon-192.png';
  
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
    badge: icon,
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

// Generic Web Push event listener fallback for browsers receiving raw Web Push payloads
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      let data = {};
      try {
        data = event.data.json();
      } catch (e) {
        data = { body: event.data.text() };
      }

      console.log('[SW push event received]:', data);
      const title = data.notification?.title || data.data?.title || data.title || 'إشعار عاجل من سبيل 🔔';
      const body = data.notification?.body || data.data?.body || data.body || 'إشعار جديد في الأكاديمية';
      const icon = data.notification?.icon || data.data?.icon || data.icon || '/assets/icons/icon-192.png';
      const notifId = data.data?.notifId || data.notifId || '';
      let url = data.data?.url || data.url || '/teacher/today-sessions.html';

      const options = {
        body: body,
        icon: icon,
        badge: icon,
        vibrate: [200, 100, 200, 100, 200],
        tag: notifId || `push_${Date.now()}`,
        renotify: true,
        requireInteraction: true,
        data: { url: url, notifId: notifId }
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (err) {
      console.error('[SW push listener error]:', err);
    }
  }
});

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

