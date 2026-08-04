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
  getDoc 
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
  if (!('Notification' in window)) {
    console.warn('Web Notifications API is not supported in this browser.');
    return null;
  }

  try {
    const swReg = await registerFCMServiceWorker();
    if (!swReg) return null;

    messagingInstance = getMessaging(app);

    // Request permission if default (asks once)
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
    const tokenOptions = {
      serviceWorkerRegistration: swReg
    };

    const token = await getToken(messagingInstance, tokenOptions);

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

        await updateDoc(userDocRef, updateData);
        sessionStorage.setItem('sabeel_current_fcm_token', token);
        console.log('FCM Token generated and synced to Firestore for device:', deviceId, token);
      }

      // Foreground message listener
      onMessage(messagingInstance, (payload) => {
        console.log('[FCM Foreground Message]:', payload);
        const title = payload.notification?.title || payload.data?.title || 'تنبيه حصة من سبيل ⏰';
        const body = payload.notification?.body || payload.data?.body || 'إشعار عاجل من الأكاديمية';
        const targetUrl = payload.data?.url || '/teacher/today-sessions.html';

        playNotificationChime();
        Toast.info(`🔔 ${title}: ${body}`);

        // If page is hidden or in background, trigger native system notification
        if (document.visibilityState === 'hidden' && swReg && swReg.showNotification) {
          swReg.showNotification(title, {
            body: body,
            icon: '/assets/icons/icon-192.png',
            badge: '/assets/icons/icon-192.png',
            vibrate: [200, 100, 200],
            data: { url: targetUrl }
          });
        }
      });

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
 * Removes the FCM token for the current device from Firestore upon user logout.
 * Supports multi-device logins by ensuring only the current device's token is removed.
 * @param {string} userId - UID of the logging out user
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
