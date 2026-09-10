/**
 * Sabeel Academy - Centralized OneSignal Manager & Sync Service
 * 
 * Handles OneSignal Web SDK v16 / User Model v5 & Median Native App Bridge:
 * - Direct integration with Firebase Authentication
 * - Awaiting OneSignal.login(firebaseUser.uid) and subscription registration
 * - Storing playerId, subscriptionId, and externalId in Firestore
 * - Preventing notification dispatch before OneSignal.User.pushSubscription.optedIn
 * - Reconciling any UID / externalId discrepancies
 * - Real-time Debugging & State Inspection
 */

import { auth, db } from '../../config/firebase.js';
import { doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { isMedianApp, getMedianOneSignalInfo, setMedianOneSignalTags } from '../utils/medianBridge.js';

export const ONESIGNAL_APP_ID = '61a2cc38-b4a8-4032-96ae-caa738df2ffd';

let isInitializing = false;
let isInitialized = false;
let initPromise = null;

/**
 * Dynamically loads and initializes the OneSignal Web SDK (v16)
 * Safe to call multiple times.
 */
export async function initOneSignal() {
  if (isInitialized) return window.OneSignal;
  if (initPromise) return initPromise;

  initPromise = new Promise(async (resolve) => {
    if (typeof window === 'undefined') {
      return resolve(null);
    }

    // Set up Deferred queue
    window.OneSignalDeferred = window.OneSignalDeferred || [];

    // Ensure SDK script is present
    if (!document.querySelector('script[src*="OneSignalSDK.page.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      document.head.appendChild(script);
    }

    window.OneSignalDeferred.push(async function(OneSignal) {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: false
          },
          serviceWorkerPath: 'OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/' }
        });

        isInitialized = true;
        console.log('[OneSignalManager] OneSignal SDK v16 initialized successfully with App ID:', ONESIGNAL_APP_ID);

        // Auto-listen for push subscription changes to sync to Firestore if user is logged in
        if (OneSignal.User?.pushSubscription) {
          OneSignal.User.pushSubscription.addEventListener('change', async (event) => {
            console.log('[OneSignalManager] pushSubscription change event detected:', event);
            const currentUser = auth.currentUser;
            if (currentUser) {
              await saveOneSignalStateToFirestore(currentUser);
            }
          });
        }

        resolve(OneSignal);
      } catch (err) {
        console.warn('[OneSignalManager] OneSignal.init warning/error:', err);
        isInitialized = true; // Avoid infinite retry loops
        resolve(window.OneSignal || null);
      }
    });
  });

  return initPromise;
}

/**
 * Waits until push subscription is registered (id generated and optedIn)
 * @param {number} timeoutMs
 * @returns {Promise<{ subscriptionId: string|null, pushToken: string|null, optedIn: boolean, playerId: string|null }>}
 */
export async function waitForSubscriptionRegistration(timeoutMs = 6000) {
  // If running inside Median Native App, check native bridge
  if (isMedianApp()) {
    try {
      const info = await getMedianOneSignalInfo(timeoutMs);
      return {
        subscriptionId: info?.userId || info?.playerId || null,
        pushToken: info?.pushToken || null,
        optedIn: info?.subscribed !== false && Boolean(info?.userId || info?.playerId),
        playerId: info?.userId || info?.playerId || null
      };
    } catch (e) {
      console.warn('[OneSignalManager] Median info wait error:', e);
    }
  }

  // Web SDK check
  await initOneSignal();

  return new Promise((resolve) => {
    let resolved = false;

    const checkNow = () => {
      const sub = window.OneSignal?.User?.pushSubscription;
      const onesignalId = window.OneSignal?.User?.onesignalId;
      if (sub && sub.id) {
        resolved = true;
        return resolve({
          subscriptionId: sub.id,
          pushToken: sub.token || null,
          optedIn: Boolean(sub.optedIn),
          playerId: onesignalId || sub.id
        });
      }
    };

    // 1. Immediate check
    checkNow();
    if (resolved) return;

    // 2. Listen to subscription changes
    const changeHandler = () => {
      if (!resolved) {
        const sub = window.OneSignal?.User?.pushSubscription;
        const onesignalId = window.OneSignal?.User?.onesignalId;
        if (sub && sub.id) {
          resolved = true;
          clearTimeout(timer);
          try {
            window.OneSignal?.User?.pushSubscription?.removeEventListener('change', changeHandler);
          } catch (e) {}
          resolve({
            subscriptionId: sub.id,
            pushToken: sub.token || null,
            optedIn: Boolean(sub.optedIn),
            playerId: onesignalId || sub.id
          });
        }
      }
    };

    try {
      window.OneSignal?.User?.pushSubscription?.addEventListener('change', changeHandler);
    } catch (e) {}

    // 3. Fallback timeout
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          window.OneSignal?.User?.pushSubscription?.removeEventListener('change', changeHandler);
        } catch (e) {}
        const sub = window.OneSignal?.User?.pushSubscription;
        const onesignalId = window.OneSignal?.User?.onesignalId;
        resolve({
          subscriptionId: sub?.id || null,
          pushToken: sub?.token || null,
          optedIn: Boolean(sub?.optedIn),
          playerId: onesignalId || sub?.id || null
        });
      }
    }, timeoutMs);
  });
}

/**
 * Checks whether push subscription is opted in for the current client
 * @returns {boolean}
 */
export function isPushSubscriptionOptedIn() {
  if (isMedianApp()) {
    const stored = localStorage.getItem('sabeel_onesignal_player_id');
    return Boolean(stored);
  }
  return Boolean(window.OneSignal?.User?.pushSubscription?.optedIn);
}

/**
 * Directly executes:
 * 1. await OneSignal.login(firebaseUser.uid)
 * 2. Waits until subscription is registered
 * 3. Saves playerId, subscriptionId, and externalId into Firestore
 * 4. Fixes any UID discrepancy between Firestore and OneSignal
 * 
 * @param {object} firebaseUser - Authenticated Firebase User
 * @param {string} [role='teacher'] - User role ('teacher' | 'admin')
 * @returns {Promise<{ success: boolean, externalId: string, playerId: string|null, subscriptionId: string|null, optedIn: boolean }>}
 */
export async function loginAndSyncOneSignal(firebaseUser, role = 'teacher') {
  if (!firebaseUser || !firebaseUser.uid) {
    console.warn('[OneSignalManager] loginAndSyncOneSignal called without authenticated Firebase user!');
    return { success: false, error: 'User is not authenticated' };
  }

  const uid = firebaseUser.uid;
  console.log(`[OneSignalManager] Initializing OneSignal sync for UID: ${uid} (Role: ${role})...`);

  try {
    // 1. Ensure OneSignal Web SDK is initialized
    await initOneSignal();

    // 2. Perform Median Native Bridge login if inside Median App
    if (isMedianApp()) {
      try {
        if (window.median?.onesignal?.login) {
          window.median.onesignal.login({ externalId: uid });
        } else if (window.gonative?.onesignal?.login) {
          window.gonative.onesignal.login({ externalId: uid });
        }
      } catch (e) {
        console.warn('[OneSignalManager] Median native login call warning:', e);
      }
    }

    // 3. Web SDK login: await OneSignal.login(firebaseUser.uid)
    if (window.OneSignal && typeof window.OneSignal.login === 'function') {
      try {
        const currentExternalId = window.OneSignal.User?.externalId;
        // If already logged in with a different externalId, log out first to fix discrepancy
        if (currentExternalId && currentExternalId !== uid) {
          console.warn(`[OneSignalManager] Discrepancy detected! Current: ${currentExternalId}, Expected: ${uid}. Resetting session...`);
          try { await window.OneSignal.logout(); } catch (e) {}
        }
        
        await window.OneSignal.login(uid);
        console.log(`[OneSignalManager] Successfully executed: await OneSignal.login('${uid}')`);
      } catch (loginErr) {
        console.warn('[OneSignalManager] OneSignal.login error:', loginErr);
      }
    } else {
      // Push into deferred queue
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal) {
        try {
          await OneSignal.login(uid);
          console.log(`[OneSignalManager] OneSignalDeferred executed OneSignal.login('${uid}')`);
        } catch (e) {
          console.warn('[OneSignalManager] OneSignalDeferred login error:', e);
        }
      });
    }

    // 4. Set user tags for role and identification
    try {
      const tags = {
        uid: uid,
        external_id: uid,
        role: role,
        email: firebaseUser.email || '',
        last_sync: new Date().toISOString()
      };
      if (window.OneSignal?.User?.addTags) {
        window.OneSignal.User.addTags(tags);
      }
      setMedianOneSignalTags(tags);
    } catch (e) {}

    // 5. If browser permission was already granted, ensure pushSubscription is opted in
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      if (window.OneSignal?.User?.pushSubscription && !window.OneSignal.User.pushSubscription.optedIn) {
        try {
          await window.OneSignal.User.pushSubscription.optIn();
          console.log('[OneSignalManager] OneSignal.User.pushSubscription.optIn executed');
        } catch (optErr) {
          console.warn('[OneSignalManager] optIn attempt notice:', optErr);
        }
      }
    }

    // 6. Wait until subscription registration completes
    const subInfo = await waitForSubscriptionRegistration(4000);

    const playerId = subInfo.playerId || window.OneSignal?.User?.onesignalId || localStorage.getItem('sabeel_onesignal_player_id') || null;
    const subscriptionId = subInfo.subscriptionId || window.OneSignal?.User?.pushSubscription?.id || null;
    const pushToken = subInfo.pushToken || window.OneSignal?.User?.pushSubscription?.token || null;
    const optedIn = Boolean(subInfo.optedIn || window.OneSignal?.User?.pushSubscription?.optedIn);
    const permission = window.OneSignal?.Notifications?.permission || (typeof Notification !== 'undefined' ? Notification.permission : 'default');

    // If permission is still default and user hasn't dismissed the prompt, suggest enabling notifications
    if (permission === 'default' && !isMedianApp() && typeof window !== 'undefined') {
      showPushPromptBanner(firebaseUser);
    }

    // Cache locally
    localStorage.setItem('sabeel_onesignal_external_id', uid);
    if (playerId) localStorage.setItem('sabeel_onesignal_player_id', playerId);
    if (subscriptionId) localStorage.setItem('sabeel_onesignal_subscription_id', subscriptionId);

    // 7. Save in Firestore: playerId, subscriptionId, externalId
    await saveOneSignalStateToFirestore(firebaseUser, {
      playerId,
      subscriptionId,
      externalId: uid,
      pushToken,
      optedIn,
      permission
    });

    console.log('[OneSignalManager] Sync completed successfully:', {
      externalId: uid,
      playerId,
      subscriptionId,
      optedIn,
      permission
    });

    return {
      success: true,
      externalId: uid,
      playerId,
      subscriptionId,
      pushToken,
      optedIn,
      permission
    };
  } catch (err) {
    console.error('[OneSignalManager] Error in loginAndSyncOneSignal:', err);
    return {
      success: false,
      externalId: uid,
      error: err.message
    };
  }
}

/**
 * Saves playerId, subscriptionId, and externalId into Firestore document users/{uid}
 * @param {object} firebaseUser
 * @param {object} [customData]
 */
export async function saveOneSignalStateToFirestore(firebaseUser, customData = null) {
  if (!firebaseUser || !firebaseUser.uid) return;

  const uid = firebaseUser.uid;
  const userDocRef = doc(db, 'users', uid);

  let playerId = customData?.playerId || window.OneSignal?.User?.onesignalId || localStorage.getItem('sabeel_onesignal_player_id') || null;
  let subscriptionId = customData?.subscriptionId || window.OneSignal?.User?.pushSubscription?.id || localStorage.getItem('sabeel_onesignal_subscription_id') || null;
  let pushToken = customData?.pushToken || window.OneSignal?.User?.pushSubscription?.token || null;
  let optedIn = customData !== null ? customData.optedIn : Boolean(window.OneSignal?.User?.pushSubscription?.optedIn);
  let permission = customData?.permission || window.OneSignal?.Notifications?.permission || (typeof Notification !== 'undefined' ? Notification.permission : 'default');

  const updatePayload = {
    playerId: playerId,
    subscriptionId: subscriptionId,
    externalId: uid,
    // Keep backward-compatible properties
    oneSignalId: playerId || subscriptionId || null,
    oneSignalExternalId: uid,
    pushOptedIn: optedIn,
    pushPermission: permission,
    pushToken: pushToken,
    lastPushSyncAt: new Date().toISOString()
  };

  try {
    await updateDoc(userDocRef, updatePayload);
    console.log(`[OneSignalManager] Firestore updated for users/${uid} with playerId, subscriptionId, externalId`);
  } catch (err) {
    // If document doesn't exist yet, use setDoc with merge
    try {
      await setDoc(userDocRef, updatePayload, { merge: true });
    } catch (setErr) {
      console.warn('[OneSignalManager] Firestore save error:', setErr);
    }
  }
}

/**
 * Fixes any discrepancy between Firestore UID and OneSignal External ID
 * @param {object} firebaseUser
 */
export async function reconcileOneSignalIds(firebaseUser) {
  if (!firebaseUser || !firebaseUser.uid) return;

  const uid = firebaseUser.uid;
  await initOneSignal();

  const currentOneSignalExternalId = window.OneSignal?.User?.externalId;
  
  if (currentOneSignalExternalId !== uid) {
    console.warn(`[OneSignalManager] Discrepancy found! OneSignal: ${currentOneSignalExternalId} vs Firebase: ${uid}. Re-aligning...`);
    try {
      if (window.OneSignal && typeof window.OneSignal.logout === 'function') {
        await window.OneSignal.logout();
      }
      if (window.OneSignal && typeof window.OneSignal.login === 'function') {
        await window.OneSignal.login(uid);
      }
    } catch (e) {
      console.warn('[OneSignalManager] Discrepancy re-login error:', e);
    }
  }

  // Also update Firestore to make sure
  await saveOneSignalStateToFirestore(firebaseUser);
}

/**
 * Handles user logout from OneSignal
 */
export async function logoutOneSignal() {
  try {
    if (window.OneSignal && typeof window.OneSignal.logout === 'function') {
      await window.OneSignal.logout();
    }
    localStorage.removeItem('sabeel_onesignal_external_id');
    localStorage.removeItem('sabeel_onesignal_player_id');
    localStorage.removeItem('sabeel_onesignal_subscription_id');
    console.log('[OneSignalManager] Logged out from OneSignal.');
  } catch (err) {
    console.warn('[OneSignalManager] Logout error:', err);
  }
}

/**
 * Prompts user for push notification permission and updates subscription & Firestore
 * @param {object} [firebaseUser]
 * @returns {Promise<{ permission: string, optedIn: boolean, subscriptionId: string|null }>}
 */
export async function requestPushPermissionAndSubscribe(firebaseUser = null) {
  await initOneSignal();
  const user = firebaseUser || auth.currentUser;

  try {
    let permission = 'default';
    if (window.OneSignal?.Notifications?.requestPermission) {
      await window.OneSignal.Notifications.requestPermission();
      permission = window.OneSignal?.Notifications?.permission || (typeof Notification !== 'undefined' ? Notification.permission : 'default');
    } else if (typeof Notification !== 'undefined') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
      // Opt into push subscription
      if (window.OneSignal?.User?.pushSubscription) {
        try {
          await window.OneSignal.User.pushSubscription.optIn();
        } catch (optErr) {}
      }
    }

    if (user) {
      await loginAndSyncOneSignal(user);
    }

    // Dismiss any active prompt banner
    const existingBanner = document.getElementById('sabeelPushPromptBanner');
    if (existingBanner) existingBanner.remove();

    return {
      permission: window.OneSignal?.Notifications?.permission || (typeof Notification !== 'undefined' ? Notification.permission : 'default'),
      optedIn: isPushSubscriptionOptedIn(),
      subscriptionId: window.OneSignal?.User?.pushSubscription?.id || null
    };
  } catch (err) {
    console.warn('[OneSignalManager] requestPushPermission error:', err);
    return { error: err.message };
  }
}

/**
 * Shows a subtle in-app banner encouraging the user to allow notifications
 * @param {object} firebaseUser
 */
export function showPushPromptBanner(firebaseUser) {
  if (typeof document === 'undefined') return;

  // Don't show if already active or recently dismissed
  if (document.getElementById('sabeelPushPromptBanner')) return;
  const dismissedTime = localStorage.getItem('sabeel_push_prompt_dismissed');
  if (dismissedTime && (Date.now() - parseInt(dismissedTime, 10) < 24 * 60 * 60 * 1000)) {
    return; // Dismissed within last 24h
  }

  const banner = document.createElement('div');
  banner.id = 'sabeelPushPromptBanner';
  banner.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 99999;
    background: #0f172a;
    color: #ffffff;
    border-radius: 12px;
    padding: 14px 18px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    gap: 14px;
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 420px;
    direction: rtl;
  `;

  banner.innerHTML = `
    <div style="font-size: 1.5rem; line-height: 1;">🔔</div>
    <div style="flex: 1;">
      <div style="font-weight: 800; font-size: 0.92rem; margin-bottom: 3px;">تفعيل إشعارات سبيل المباشرة</div>
      <div style="font-size: 0.8rem; color: #94a3b8; line-height: 1.4;">لتصلك تنبيهات الحصص والرسائل وجدول المواعيد فورياً.</div>
    </div>
    <div style="display: flex; gap: 6px; align-items: center;">
      <button id="btnAcceptPushPrompt" style="background: #0d9488; color: #ffffff; border: none; padding: 7px 14px; border-radius: 8px; font-weight: 800; font-size: 0.82rem; cursor: pointer;">
        تفعيل الآن
      </button>
      <button id="btnDismissPushPrompt" style="background: transparent; color: #94a3b8; border: none; padding: 7px 10px; font-size: 0.82rem; cursor: pointer;">
        لاحقاً
      </button>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById('btnAcceptPushPrompt')?.addEventListener('click', async () => {
    banner.remove();
    await requestPushPermissionAndSubscribe(firebaseUser);
  });

  document.getElementById('btnDismissPushPrompt')?.addEventListener('click', () => {
    localStorage.setItem('sabeel_push_prompt_dismissed', Date.now().toString());
    banner.remove();
  });
}

/**
 * Collects full diagnostic information for Debug Page
 * @returns {Promise<Object>}
 */
export async function getOneSignalDebugState() {
  const firebaseUser = auth.currentUser;
  const firebaseUid = firebaseUser?.uid || null;
  const firebaseEmail = firebaseUser?.email || null;

  await initOneSignal();

  const oneSignalExternalId = window.OneSignal?.User?.externalId || localStorage.getItem('sabeel_onesignal_external_id') || null;
  const subscription = window.OneSignal?.User?.pushSubscription;
  const subscriptionId = subscription?.id || localStorage.getItem('sabeel_onesignal_subscription_id') || null;
  const pushToken = subscription?.token || null;
  const permission = window.OneSignal?.Notifications?.permission || (typeof Notification !== 'undefined' ? Notification.permission : 'not_supported');
  const optedIn = Boolean(subscription?.optedIn);
  const onesignalId = window.OneSignal?.User?.onesignalId || localStorage.getItem('sabeel_onesignal_player_id') || null;

  // Retrieve Firestore record
  let firestoreData = null;
  if (firebaseUid) {
    try {
      const snap = await getDoc(doc(db, 'users', firebaseUid));
      if (snap.exists()) {
        firestoreData = snap.data();
      }
    } catch (e) {
      console.warn('Could not read user Firestore doc for debug:', e);
    }
  }

  const isMatched = Boolean(
    firebaseUid &&
    oneSignalExternalId === firebaseUid &&
    firestoreData?.externalId === firebaseUid
  );

  const playerState = {
    onesignalId: onesignalId,
    externalId: oneSignalExternalId,
    optedIn: optedIn,
    subscriptionId: subscriptionId,
    pushToken: pushToken ? `${pushToken.substring(0, 16)}...` : null,
    permission: permission,
    isMedian: isMedianApp(),
    environment: window.location.hostname,
    sdkVersion: window.OneSignal?.VERSION || 'v16-web',
    aliases: window.OneSignal?.User?.aliases || { external_id: oneSignalExternalId },
    rawSubscription: subscription ? {
      id: subscription.id,
      optedIn: subscription.optedIn,
      type: subscription.type
    } : null
  };

  return {
    firebaseUid,
    firebaseEmail,
    oneSignalExternalId,
    subscriptionId,
    pushToken,
    permission,
    optedIn,
    playerState,
    firestoreData: {
      playerId: firestoreData?.playerId || null,
      subscriptionId: firestoreData?.subscriptionId || null,
      externalId: firestoreData?.externalId || null,
      pushOptedIn: firestoreData?.pushOptedIn || false,
      lastPushSyncAt: firestoreData?.lastPushSyncAt || null
    },
    isMatched,
    hasDiscrepancy: Boolean(firebaseUid && (oneSignalExternalId !== firebaseUid || firestoreData?.externalId !== firebaseUid))
  };
}

// Global window exposure for console testing
if (typeof window !== 'undefined') {
  window.OneSignalManager = {
    initOneSignal,
    loginAndSyncOneSignal,
    saveOneSignalStateToFirestore,
    reconcileOneSignalIds,
    waitForSubscriptionRegistration,
    isPushSubscriptionOptedIn,
    logoutOneSignal,
    getOneSignalDebugState,
    requestPushPermissionAndSubscribe,
    showPushPromptBanner,
    ONESIGNAL_APP_ID
  };
}
