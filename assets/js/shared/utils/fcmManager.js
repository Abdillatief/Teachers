import { app, auth, db } from '../../config/firebase.js';
import { 
  getMessaging, 
  getToken, 
  onMessage, 
  deleteToken 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  deleteField,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  collection,
  query,
  where,
  increment,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from './toast.js';
import { playNotificationChime } from './reminderService.js';

let messagingInstance = null;
let currentSwRegistration = null;

/**
 * Gets or creates a persistent device ID for this browser
 */
export function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem('sabeel_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('sabeel_device_id', deviceId);
  }
  return deviceId;
}

/**
 * Registers the Service Worker required for FCM background web push
 */
export async function registerFCMServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker is not supported in this browser environment.');
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    currentSwRegistration = reg;
    console.log('Firebase Messaging Service Worker registered successfully:', reg);
    return reg;
  } catch (err) {
    console.warn('Failed to register firebase-messaging-sw.js, falling back to /sw.js:', err);
    try {
      const fallbackReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      currentSwRegistration = fallbackReg;
      return fallbackReg;
    } catch (fallbackErr) {
      console.error('Service worker registration failed:', fallbackErr);
      return null;
    }
  }
}

/**
 * Initializes Firebase Cloud Messaging (FCM), requests notification permission once at login,
 * retrieves the FCM token, and syncs it with Firestore under users/{userId} (multi-device support).
 * @param {object} user - Firebase Auth User object
 */
export async function initAndSyncFCM(user) {
  if (!user || !user.uid) return null;
  
  // Handle notification click tracking from deep link URL if present
  handleNotificationDeepLinkOnLoad(user);

  if (!('Notification' in window)) {
    console.warn('Web Notifications API is not supported in this browser.');
    return null;
  }

  try {
    const swReg = await registerFCMServiceWorker();
    if (!swReg) return null;

    try {
      messagingInstance = getMessaging(app);
    } catch (e) {
      console.warn("FCM messaging init error:", e);
    }

    // Request permission
    let permission = Notification.permission;
    if (permission === 'default') {
      const userPrompted = localStorage.getItem(`sabeel_notif_prompted_${user.uid}`);
      if (!userPrompted) {
        permission = await Notification.requestPermission();
        localStorage.setItem(`sabeel_notif_prompted_${user.uid}`, 'true');
      }
    }

    if (permission !== 'granted') {
      console.log('Notification permission not granted:', permission);
      return null;
    }

    // Get FCM Token
    let token = null;
    if (messagingInstance) {
      try {
        const tokenOptions = { serviceWorkerRegistration: swReg };
        if (window.VAPID_KEY) {
          tokenOptions.vapidKey = window.VAPID_KEY;
        }
        token = await getToken(messagingInstance, tokenOptions);
      } catch (tokenErr) {
        console.warn('FCM getToken failed:', tokenErr);
      }
    }

    if (token) {
      const deviceId = getOrCreateDeviceId();
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const updateData = {
          fcmTokens: arrayUnion(token),
          [`fcmDevices.${deviceId}`]: {
            token: token,
            userAgent: navigator.userAgent || 'Unknown Device',
            platform: navigator.platform || 'Web',
            lastUpdated: new Date().toISOString()
          },
          lastFcmUpdate: new Date().toISOString()
        };

        await updateDoc(userDocRef, updateData).catch(e => console.warn('Sync FCM doc error:', e));
        sessionStorage.setItem('sabeel_current_fcm_token', token);
        console.log('FCM Token generated and synced to Firestore for device:', deviceId, token);
      }

      // Foreground message listener
      if (messagingInstance) {
        onMessage(messagingInstance, (payload) => {
          console.log('[FCM Foreground Message]:', payload);
          const title = payload.notification?.title || payload.data?.title || 'تنبيه من سبيل ⏰';
          const body = payload.notification?.body || payload.data?.body || 'إشعار عاجل من الأكاديمية';
          const targetUrl = payload.data?.url || '/teacher/today-sessions.html';
          const notifId = payload.data?.notifId || '';

          playNotificationChime();
          Toast.info(`🔔 ${title}: ${body}`);

          // Mark delivered status in Firestore
          if (notifId) {
            updateDoc(doc(db, 'notifications', notifId), {
              'statuses.delivered.status': true,
              'statuses.delivered.time': new Date().toISOString()
            }).catch(e => console.warn('Update delivered status error:', e));
          }

          if (document.visibilityState === 'hidden' && swReg && swReg.showNotification) {
            const logoUrl = localStorage.getItem('academy_logo_url') || '/assets/icons/icon-192.png';
            swReg.showNotification(title, {
              body: body,
              icon: logoUrl,
              badge: logoUrl,
              vibrate: [200, 100, 200, 100, 200],
              data: { url: targetUrl, notifId }
            });
          }
        });
      }

      return token;
    } else {
      console.warn('No FCM registration token available.');
      return null;
    }
  } catch (err) {
    console.error('Error during FCM initialization & sync:', err);
    return null;
  }
}

/**
 * Handles deep link parameters when clicking push notifications
 */
export async function handleNotificationDeepLinkOnLoad(user) {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const notifId = urlParams.get('notifId');
    const action = urlParams.get('action');

    if (notifId) {
      console.log('Notification deep link opened:', notifId, action);
      const notifRef = doc(db, 'notifications', notifId);
      const nowIso = new Date().toISOString();
      
      const updatePayload = {
        'statuses.clicked.status': true,
        'statuses.clicked.time': nowIso,
        'statuses.read.status': true,
        'statuses.read.time': nowIso
      };

      if (user && user.uid) {
        updatePayload.readBy = arrayUnion(user.uid);
      }

      await updateDoc(notifRef, updatePayload).catch(e => console.warn('Update clicked status error:', e));

      // Clean URL query string without reloading page
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  } catch (err) {
    console.warn('Error handling notification deep link:', err);
  }
}

/**
 * Removes the FCM token for the current device from Firestore upon user logout.
 */
export async function removeFCMTokenOnLogout(userId) {
  if (!userId) return;

  try {
    const deviceId = getOrCreateDeviceId();
    const currentToken = sessionStorage.getItem('sabeel_current_fcm_token');
    const userDocRef = doc(db, 'users', userId);

    const updateObj = {
      [`fcmDevices.${deviceId}`]: deleteField()
    };

    if (currentToken) {
      updateObj.fcmTokens = arrayRemove(currentToken);
    }

    await updateDoc(userDocRef, updateObj).catch(err => {
      console.warn('Firestore FCM cleanup warning:', err);
    });

    if (messagingInstance && currentToken) {
      deleteToken(messagingInstance).catch(err => {
        console.warn('FCM deleteToken warning:', err);
      });
    }

    sessionStorage.removeItem('sabeel_current_fcm_token');
    console.log('FCM Token removed successfully on logout for device:', deviceId);
  } catch (err) {
    console.error('Error cleaning up FCM token on logout:', err);
  }
}

/**
 * Dispatches a notification by adding/queuing it in Firestore 'notifications' collection.
 * The actual Push Notification dispatch to devices is processed asynchronously by the
 * Firebase Cloud Function (sendPushNotificationOnCreate) using Firebase Admin SDK (FCM HTTP v1).
 * 
 * @param {object} notif - Notification payload object
 * @returns {Promise<string>} Document ID of created notification
 */
export async function dispatchPushNotification(notif) {
  const {
    title,
    body,
    recipientId = 'all',
    type = 'broadcast',
    url = '/teacher/today-sessions.html',
    icon = (localStorage.getItem('academy_logo_url') || '/assets/icons/icon-192.png'),
    existingDocId = null
  } = notif;

  const nowIso = new Date().toISOString();
  let notifRef = null;

  if (existingDocId) {
    notifRef = doc(db, 'notifications', existingDocId);
    await updateDoc(notifRef, {
      status: 'pending',
      'statuses.sent.status': true,
      'statuses.sent.time': nowIso,
      'statuses.delivered.status': false,
      'statuses.delivered.time': null,
      'statuses.failed.status': false,
      'statuses.failed.time': null,
      'statuses.failed.reason': null,
      retryCount: increment(1),
      lastRetryAt: nowIso
    });
  } else {
    notifRef = await addDoc(collection(db, 'notifications'), {
      title,
      body: body || '',
      recipientId: recipientId || 'all',
      type: type || 'broadcast',
      url: url || '/teacher/today-sessions.html',
      icon: icon,
      readBy: [],
      createdAt: serverTimestamp(),
      status: 'pending', // 'pending' -> Cloud Function picks up and sets 'delivered' or 'failed'
      statuses: {
        sent: { status: true, time: nowIso },
        delivered: { status: false, time: null },
        clicked: { status: false, time: null },
        read: { status: false, time: null },
        failed: { status: false, time: null, reason: null }
      },
      targetTokensCount: 0,
      successTokensCount: 0,
      failTokensCount: 0,
      deliveryLogs: [],
      retryCount: 0
    });
  }

  // Trigger Service Worker broadcast for active tabs if open
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PUSH_NOTIFICATION',
        payload: { title, body, icon, url, notifId: notifRef.id }
      });
    }
  } catch (e) {
    console.warn('PostMessage to SW error:', e);
  }

  return notifRef.id;
}

