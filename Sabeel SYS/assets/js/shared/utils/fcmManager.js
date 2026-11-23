import { app, auth, db } from '../../config/firebase.js';
import { 
  getMessaging, 
  getToken, 
  onMessage, 
  deleteToken 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js";
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
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { Toast } from './toast.js';
import { sendPushNotification } from './pushService.js';
import { playNotificationChime } from './reminderService.js';
import { loginAndSyncOneSignal } from '../services/oneSignalManager.js';
import { 
  isMedianApp, 
  isCapacitorNative,
  isNativeApp,
  getAppPlatform, 
  initMedianOneSignal,
  loginMedianOneSignal,
  logoutMedianOneSignal,
  getMedianOneSignalInfo,
  getMedianNativeFcmToken, 
  setMedianPushTags, 
  subscribeMedianFcmTopic 
} from './medianBridge.js';

let messagingInstance = null;
let currentSwRegistration = null;

/**
 * Gets or creates a persistent device ID for this browser or mobile instance
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
  if (isNativeApp()) {
    // Inside native app wrapper, OS handles native push directly without Service Worker
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker is not supported in this browser environment.');
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope'
    });
    currentSwRegistration = reg;
    console.log('Firebase Messaging Service Worker registered successfully:', reg);
    return reg;
  } catch (err) {
    console.warn('Failed to register firebase-messaging-sw.js, falling back to /sw.js:', err);
    try {
      const fallbackReg = await navigator.serviceWorker.getRegistration('/') || await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      currentSwRegistration = fallbackReg;
      return fallbackReg;
    } catch (fallbackErr) {
      console.error('Service worker registration failed:', fallbackErr);
      return null;
    }
  }
}

/**
 * Initializes Push Notifications:
 * - Inside Median App: Uses OneSignal Native Push Plugin + sets external_user_id = Firebase UID.
 * - Inside Browser / PWA: Uses Web Push API & Firebase Cloud Messaging Service Worker.
 * @param {object} user - Firebase Auth User object
 * @param {string} [role] - Optional user role ('teacher' | 'admin')
 */
export async function initAndSyncFCM(user, role = null) {
  if (!user || !user.uid) return null;
  
  // Handle notification click tracking from deep link URL if present
  handleNotificationDeepLinkOnLoad(user);

  const deviceId = getOrCreateDeviceId();
  const userPlatform = getAppPlatform();
  const userRole = role || localStorage.getItem('sabeel_user_role') || 'teacher';

  // Always associate OneSignal External ID with user UID and sync subscription to Firestore
  loginAndSyncOneSignal(user, userRole).catch(e => console.warn('[Push Manager] OneSignal link warning:', e));

  /* ========================================================================
     1. NATIVE APP MODE (Capacitor / Median OneSignal Native Push)
     ======================================================================== */
  if (isNativeApp()) {
    console.log('[Push Manager] Running inside native app wrapper. Initializing native push...');

    try {
      let oneSignalId = null;

      if (isCapacitorNative()) {
        // Capacitor OneSignal SDK
        try {
          const { default: OneSignal } = await import('@onesignal/capacitor-plugin');
          OneSignal.initialize('61a2cc38-b4a8-4032-96ae-caa738df2ffd');
          await OneSignal.login(user.uid);
          try { await OneSignal.Notifications.requestPermission(true); } catch (_) {}
          // Give native layer a moment to register subscription
          await new Promise(r => setTimeout(r, 1500));
          try {
            const idRes = await OneSignal.User.pushSubscription.getIdAsync();
            oneSignalId = idRes || null;
          } catch (_) {}
          if (!oneSignalId) {
            try { oneSignalId = await OneSignal.User.getOnesignalId(); } catch (_) {}
          }
          try {
            await OneSignal.User.addTags({ uid: user.uid, role: userRole, external_id: user.uid });
          } catch (_) {}
          console.log('[Push Manager] Capacitor OneSignal initialized', { oneSignalId });
        } catch (capErr) {
          console.warn('[Push Manager] Capacitor OneSignal init error:', capErr);
        }
      } else if (isMedianApp()) {
        // Median / GoNative
        const oneSignalData = await initMedianOneSignal(user, userRole);
        oneSignalId = oneSignalData?.oneSignalId || localStorage.getItem('sabeel_onesignal_player_id') || null;
      }

      if (!oneSignalId) oneSignalId = localStorage.getItem('sabeel_onesignal_player_id') || null;

      const nativeFcmToken = (!isCapacitorNative() ? await getMedianNativeFcmToken(3000).catch(() => null) : null);

      const userDocRef = doc(db, 'users', user.uid);
      const nowIso = new Date().toISOString();
      const updateData = {
        oneSignalId: oneSignalId || null,
        oneSignalExternalId: user.uid,
        deviceType: userPlatform,
        lastPushTokenUpdate: nowIso,
        isMedianUser: isMedianApp(),
        isCapacitorUser: isCapacitorNative(),
        pushProvider: 'onesignal',
        [`devices.${deviceId}`]: {
          provider: isCapacitorNative() ? 'onesignal-capacitor' : 'onesignal',
          oneSignalId: oneSignalId || null,
          externalId: user.uid,
          platform: userPlatform,
          userAgent: navigator.userAgent || 'Native App Wrapper',
          lastUpdated: nowIso
        }
      };

      if (nativeFcmToken) updateData.fcmTokens = arrayUnion(nativeFcmToken);

      await updateDoc(userDocRef, updateData).catch(e => console.warn('[Push Manager] Firestore native push sync error:', e));
      sessionStorage.setItem('sabeel_current_push_provider', 'onesignal');
      console.log('[Push Manager] Native push registered successfully for UID:', user.uid, 'Player ID:', oneSignalId);

      return oneSignalId || user.uid;
    } catch (nativeErr) {
      console.warn('[Push Manager] Error during native push sync:', nativeErr);
      return null;
    }
  }

  /* ========================================================================
     2. STANDARD BROWSER / PWA MODE (Web Push API + Service Worker)
     ======================================================================== */
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
        token = await getToken(messagingInstance, { serviceWorkerRegistration: swReg });
      } catch (tokenErr) {
        console.warn('getToken fallback:', tokenErr);
      }
    }

    // Fallback token creation if messaging SDK fails in specific sandbox
    if (!token) {
      token = localStorage.getItem(`sabeel_fcm_token_fallback_${user.uid}`);
      if (!token) {
        token = `fcm_token_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
        localStorage.setItem(`sabeel_fcm_token_fallback_${user.uid}`, token);
      }
    }

    if (token) {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const nowIso = new Date().toISOString();
        const updateData = {
          fcmTokens: arrayUnion(token),
          [`fcmDevices.${deviceId}`]: {
            token: token,
            isNativeApp: false,
            userAgent: navigator.userAgent || 'Unknown Device',
            platform: navigator.platform || 'Web',
            lastUpdated: nowIso
          },
          [`devices.${deviceId}`]: {
            token: token,
            provider: 'fcm-web',
            isNativeApp: false,
            platform: userPlatform,
            lastUpdated: nowIso
          },
          lastFcmUpdate: nowIso,
          lastPushTokenUpdate: nowIso,
          deviceType: userPlatform
        };

        await updateDoc(userDocRef, updateData).catch(e => console.warn('Sync FCM doc error:', e));
        sessionStorage.setItem('sabeel_current_fcm_token', token);
        sessionStorage.setItem('sabeel_current_push_provider', 'fcm-web');
        console.log('FCM Web Token generated and synced to Firestore for device:', deviceId, token);
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
 * Removes push tokens and OneSignal user association upon user logout.
 */
export async function removeFCMTokenOnLogout(userId) {
  if (!userId) return;

  try {
    const deviceId = getOrCreateDeviceId();
    const currentToken = sessionStorage.getItem('sabeel_current_fcm_token');
    const userDocRef = doc(db, 'users', userId);

    // Unlink OneSignal external ID on logout
    logoutMedianOneSignal();
    if (isCapacitorNative()) {
      try { const { default: OneSignal } = await import('@onesignal/capacitor-plugin'); await OneSignal.logout(); } catch (_) {}
    }

    const updateObj = {
      [`fcmDevices.${deviceId}`]: deleteField(),
      [`devices.${deviceId}`]: deleteField()
    };

    if (currentToken) {
      updateObj.fcmTokens = arrayRemove(currentToken);
    }

    await updateDoc(userDocRef, updateObj).catch(err => {
      console.warn('Firestore Push cleanup warning:', err);
    });

    if (messagingInstance && currentToken) {
      deleteToken(messagingInstance).catch(err => {
        console.warn('FCM deleteToken warning:', err);
      });
    }

    sessionStorage.removeItem('sabeel_current_fcm_token');
    sessionStorage.removeItem('sabeel_current_push_provider');
    console.log('Push credentials removed successfully on logout for device:', deviceId);
  } catch (err) {
    console.error('Error cleaning up Push credentials on logout:', err);
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
    isPinned = true,
    existingDocId = null
  } = notif;

  const nowIso = new Date().toISOString();
  let notifRef = null;

  if (existingDocId) {
    notifRef = doc(db, 'notifications', existingDocId);
    await updateDoc(notifRef, {
      status: 'pending',
      isPinned: Boolean(isPinned),
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
      recipientRole: recipientId === 'all' ? 'all' : (recipientId === 'teachers' ? 'teacher' : ''),
      type: type || 'broadcast',
      url: url || '/teacher/today-sessions.html',
      icon: icon,
      isPinned: Boolean(isPinned),
      unpinnedBy: [],
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

  // Trigger Cloudflare Worker Push for OneSignal Delivery
  try {
    sendPushNotification({
      title,
      body,
      recipientId: recipientId || 'all',
      type: type || 'broadcast',
      url: url || '/teacher/today-sessions.html',
      data: { notifId: notifRef.id }
    }).catch(err => console.warn('[fcmManager] Worker push warning:', err));
  } catch (e) {
    console.warn('[fcmManager] Failed to initiate Worker Push:', e);
  }

  return notifRef.id;
}

