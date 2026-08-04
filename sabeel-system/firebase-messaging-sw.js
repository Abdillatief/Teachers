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
  const title = payload.notification?.title || payload.data?.title || 'تنبيه حصة من سبيل ⏰';
  const body = payload.notification?.body || payload.data?.body || 'لديك إشعار جديد بشأن حلقة القرآن';
  
  const studentName = payload.data?.studentName || '';
  const sessionTime = payload.data?.sessionTime || '';
  const duration = payload.data?.duration || '';
  const sessionId = payload.data?.sessionId || '';
  const studentId = payload.data?.studentId || '';
  
  let targetUrl = payload.data?.url || '/teacher/today-sessions.html';
  if (sessionId) {
    targetUrl = `/teacher/today-sessions.html?sessionId=${encodeURIComponent(sessionId)}`;
  } else if (studentId) {
    targetUrl = `/teacher/today-sessions.html?studentId=${encodeURIComponent(studentId)}`;
  }

  // Build rich body text if duration / studentName provided
  let formattedBody = body;
  if (studentName && sessionTime) {
    formattedBody = `الطالب: ${studentName} | الموعد: ${sessionTime}${duration ? ` | المدة: ${duration} دقيقة` : ''}\n${body}`;
  }

  const options = {
    body: formattedBody,
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: payload.data?.tag || `sess_${sessionId || studentId || Date.now()}`,
    renotify: true,
    data: {
      url: targetUrl,
      sessionId: sessionId,
      studentId: studentId
    },
    actions: [
      {
        action: 'open_session',
        title: 'فتح الحصة 📖'
      },
      {
        action: 'open_today',
        title: 'جدول اليوم 📅'
      }
    ]
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let targetUrl = event.notification.data?.url || '/teacher/today-sessions.html';
  if (event.action === 'open_today') {
    targetUrl = '/teacher/today-sessions.html';
  } else if (event.action === 'open_session') {
    if (event.notification.data?.sessionId) {
      targetUrl = `/teacher/today-sessions.html?sessionId=${event.notification.data.sessionId}`;
    } else if (event.notification.data?.studentId) {
      targetUrl = `/teacher/today-sessions.html?studentId=${event.notification.data.studentId}`;
    }
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
