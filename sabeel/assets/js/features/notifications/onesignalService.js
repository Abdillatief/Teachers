/**
 * OneSignal & Push Notification Service for Sabeel Academy
 * 
 * Features:
 * - Proper OneSignal.login(firebaseUID) using pure string UID (strictly NOT { externalId: ... })
 * - Cleans up corrupted/legacy JSON-based external IDs before binding
 * - Integrates with Median App (iOS/Android native wrapper) with requestPermission(true)
 * - Auto-detects un-subscribed state and automatically re-registers push device
 * - Synchronizes active Player ID / Subscription ID to Firestore under /users/{uid}
 */

import { ONESIGNAL_CONFIG, sanitizeExternalId } from '../../config/onesignalConfig.js';

class OneSignalService {
  constructor() {
    this.initialized = false;
    this.currentFirebaseUid = null;
    this.currentSubscriptionId = null;
    this.initPromise = null;
  }

  /**
   * Initialize OneSignal Web SDK and/or Median App push bridge
   */
  async init() {
    if (this.initialized) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // 1. Detect if running inside Median App (iOS / Android webview wrapper)
        const isMedian = this.isMedianApp();
        if (isMedian) {
          console.log('[OneSignal Service] Median App environment detected.');
          this.initMedianPush();
        }

        // 2. Initialize Web OneSignal SDK if window.OneSignal is available or loaded via CDN
        if (typeof window !== 'undefined') {
          window.OneSignalDeferred = window.OneSignalDeferred || [];

          await new Promise((resolve) => {
            window.OneSignalDeferred.push(async (OneSignal) => {
              try {
                if (!OneSignal.initialized) {
                  await OneSignal.init({
                    appId: ONESIGNAL_CONFIG.appId,
                    safari_web_id: ONESIGNAL_CONFIG.safariWebId,
                    notifyButton: {
                      enable: false // We use our custom UI
                    },
                    allowLocalhostAsSecureOrigin: true
                  });
                }

                // Listen to Push Subscription changes to sync subscription ID & opt-in status
                if (OneSignal.User?.PushSubscription) {
                  this.currentSubscriptionId = OneSignal.User.PushSubscription.id || null;
                  
                  OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
                    console.log('[OneSignal Service] Push subscription changed:', event);
                    const newSubId = event?.current?.id || OneSignal.User.PushSubscription.id;
                    const isOptedIn = event?.current?.optedIn ?? OneSignal.User.PushSubscription.optedIn;

                    this.currentSubscriptionId = newSubId;

                    if (this.currentFirebaseUid && newSubId) {
                      await this.syncSubscriptionToFirestore(this.currentFirebaseUid, {
                        subscriptionId: newSubId,
                        optedIn: isOptedIn,
                        token: event?.current?.token || null
                      });
                    }
                  });
                }

                this.initialized = true;
                resolve(true);
              } catch (initErr) {
                console.warn('[OneSignal Service] Web SDK init error:', initErr);
                resolve(false);
              }
            });

            // Timeout safety so promise doesn't hang indefinitely if script not loaded
            setTimeout(() => resolve(true), 3000);
          });
        }

        this.initialized = true;
        return true;
      } catch (err) {
        console.error('[OneSignal Service] Failed to initialize OneSignal:', err);
        return false;
      }
    })();

    return this.initPromise;
  }

  /**
   * Check if running inside Median App (iOS / Android webview)
   */
  isMedianApp() {
    if (typeof window === 'undefined') return false;
    return Boolean(
      window.median || 
      window.gonative || 
      navigator.userAgent.includes('Median') || 
      navigator.userAgent.includes('GoNative')
    );
  }

  /**
   * Initialize Median App Push with requestPermission(true)
   */
  initMedianPush() {
    try {
      console.log('[OneSignal Service] Configuring Median App Push permissions & listeners...');

      // Median / GoNative JS Bridge
      const bridge = window.median || window.gonative;

      if (bridge?.onesignal?.push) {
        // Request notification permission immediately with prompt
        // As requested: requestPermission(true)
        if (typeof bridge.onesignal.push.requestPermission === 'function') {
          bridge.onesignal.push.requestPermission(true);
        } else if (typeof bridge.onesignal.push.register === 'function') {
          bridge.onesignal.push.register({
            requestPermission: true,
            prompt: true
          });
        }

        // Retrieve native OneSignal device info / player ID from Median
        if (typeof bridge.onesignal.deviceInfo === 'function') {
          bridge.onesignal.deviceInfo((info) => {
            console.log('[OneSignal Service] Median OneSignal device info:', info);
            if (info?.oneSignalUserId) {
              this.currentSubscriptionId = info.oneSignalUserId;
              if (this.currentFirebaseUid) {
                this.syncSubscriptionToFirestore(this.currentFirebaseUid, {
                  subscriptionId: info.oneSignalUserId,
                  optedIn: !info.isSubscribed ? false : true,
                  platform: 'median_native'
                });
              }
            }
          });
        }
      }
    } catch (medianErr) {
      console.warn('[OneSignal Service] Error initializing Median push:', medianErr);
    }
  }

  /**
   * Links Firebase UID with OneSignal.
   * 
   * CRITICAL REQUIREMENT 1:
   * Must call OneSignal.login(firebaseUID) where firebaseUID is a pure string!
   * NOT OneSignal.login({ externalId: firebaseUID })
   * NOT JSON.stringify
   * 
   * CRITICAL REQUIREMENT 2:
   * Anti-duplication & cleanup of legacy JSON external IDs.
   * 
   * @param {string} rawFirebaseUid - Raw Firebase UID
   * @param {object} [metadata] - Optional role/name for tags
   */
  async loginUser(rawFirebaseUid, metadata = {}) {
    const cleanUid = sanitizeExternalId(rawFirebaseUid);

    if (!cleanUid) {
      console.error('[OneSignal Service] Aborting login: Invalid or corrupted Firebase UID:', rawFirebaseUid);
      return { success: false, error: 'INVALID_FIREBASE_UID' };
    }

    this.currentFirebaseUid = cleanUid;
    console.log(`[OneSignal Service] Initiating clean OneSignal login for UID: "${cleanUid}"`);

    // Ensure SDK is initialized
    await this.init();

    // 1. Median App Native Bridge registration
    if (this.isMedianApp()) {
      try {
        const bridge = window.median || window.gonative;
        if (bridge?.onesignal) {
          // In Median: Ensure requestPermission(true)
          if (typeof bridge.onesignal.push?.requestPermission === 'function') {
            bridge.onesignal.push.requestPermission(true);
          } else if (typeof bridge.onesignal.push?.register === 'function') {
            bridge.onesignal.push.register({ requestPermission: true });
          }

          // Register clean external user ID
          if (typeof bridge.onesignal.setExternalUserId === 'function') {
            // Note: Median's bridge format expects clean externalId string
            bridge.onesignal.setExternalUserId({ externalId: cleanUid });
          } else if (typeof bridge.onesignal.login === 'function') {
            bridge.onesignal.login({ externalId: cleanUid });
          }

          // Set user tags for role & status
          if (metadata.role && typeof bridge.onesignal.sendTags === 'function') {
            bridge.onesignal.sendTags({
              role: metadata.role,
              sync_source: 'median_app'
            });
          }
        }
      } catch (e) {
        console.warn('[OneSignal Service] Median login error:', e);
      }
    }

    // 2. Web OneSignal SDK (v16 Modern API)
    if (typeof window !== 'undefined' && window.OneSignal) {
      try {
        const OneSignal = window.OneSignal;

        // Requirement 2: Check current external ID to prevent duplicates and cleanup corrupted IDs
        let currentExternalId = null;
        if (typeof OneSignal.User?.getExternalId === 'function') {
          currentExternalId = await OneSignal.User.getExternalId();
        }

        // If existing external ID is a corrupted JSON string e.g. {"externalId":"..."} or mismatch
        if (currentExternalId) {
          const isCorruptedJson = currentExternalId.startsWith('{') || currentExternalId.includes('externalId');
          const isMismatch = currentExternalId !== cleanUid;

          if (isCorruptedJson || isMismatch) {
            console.warn(`[OneSignal Service] Detected old/corrupted external ID "${currentExternalId}". Logging out before re-linking...`);
            try {
              await OneSignal.logout();
            } catch (logoutErr) {
              console.warn('[OneSignal Service] OneSignal.logout warning:', logoutErr);
            }
          }
        }

        // REQUIREMENT 1: Execute OneSignal.login(cleanUid)
        // cleanUid is GUARANTEED to be a plain string: e.g. "t63ltWofLbSJylVZuecUaQCWA3W2"
        console.log(`[OneSignal Service] Executing OneSignal.login("${cleanUid}")`);
        await OneSignal.login(cleanUid);

        // Add role tag for segmenting (e.g. role="teacher")
        if (metadata.role && OneSignal.User?.addTag) {
          await OneSignal.User.addTag('role', metadata.role);
        }

        // REQUIREMENT 5: Verify Push Subscription & auto-opt in if not subscribed
        await this.verifyAndEnsurePushSubscription();

        // Get current subscription ID
        const subId = OneSignal.User?.PushSubscription?.id || null;
        const isOptedIn = OneSignal.User?.PushSubscription?.optedIn ?? false;

        this.currentSubscriptionId = subId;

        // Synchronize state with Firestore
        await this.syncSubscriptionToFirestore(cleanUid, {
          subscriptionId: subId,
          optedIn: isOptedIn,
          role: metadata.role || 'teacher',
          name: metadata.name || ''
        });

        console.log(`[OneSignal Service] Successfully mapped Firebase UID "${cleanUid}" to OneSignal. Sub ID: ${subId}, OptedIn: ${isOptedIn}`);
        return { success: true, externalId: cleanUid, subscriptionId: subId, optedIn: isOptedIn };
      } catch (webErr) {
        console.error('[OneSignal Service] OneSignal.login failed:', webErr);
        return { success: false, error: webErr.message };
      }
    }

    return { success: true, externalId: cleanUid };
  }

  /**
   * Logs out the user from OneSignal to prevent user cross-contamination
   */
  async logoutUser() {
    this.currentFirebaseUid = null;
    this.currentSubscriptionId = null;

    try {
      if (typeof window !== 'undefined') {
        if (window.OneSignal?.logout) {
          await window.OneSignal.logout();
        }
        const bridge = window.median || window.gonative;
        if (bridge?.onesignal?.removeExternalUserId) {
          bridge.onesignal.removeExternalUserId();
        }
      }
      console.log('[OneSignal Service] Successfully logged out from OneSignal.');
    } catch (err) {
      console.warn('[OneSignal Service] Logout error:', err);
    }
  }

  /**
   * REQUIREMENT 5 & 6:
   * Verifies if current user has an active Push Subscription.
   * If not subscribed or permission not yet requested:
   * Requests permission and re-registers the push subscription.
   */
  async verifyAndEnsurePushSubscription() {
    try {
      // 1. Check Median App
      if (this.isMedianApp()) {
        const bridge = window.median || window.gonative;
        if (bridge?.onesignal?.push?.requestPermission) {
          bridge.onesignal.push.requestPermission(true);
        }
      }

      // 2. Check Web OneSignal SDK
      if (typeof window !== 'undefined' && window.OneSignal) {
        const OneSignal = window.OneSignal;

        const permission = OneSignal.Notifications?.permission;
        console.log('[OneSignal Service] Current Push Permission:', permission);

        // If permission is not granted, request it
        if (!permission || permission === 'default' || permission === 'prompt') {
          console.log('[OneSignal Service] Prompting user for push permission...');
          await OneSignal.Notifications.requestPermission();
        }

        // If opted out or missing subscription, opt-in
        const pushSub = OneSignal.User?.PushSubscription;
        if (pushSub) {
          const isOptedIn = pushSub.optedIn;
          const subId = pushSub.id;

          if (!isOptedIn || !subId) {
            console.log('[OneSignal Service] Push subscription inactive or missing. Attempting optIn()...');
            await pushSub.optIn();
          }
        }
      }
    } catch (subErr) {
      console.warn('[OneSignal Service] Push subscription verification warning:', subErr);
    }
  }

  /**
   * Manual force re-registration method called from UI button
   * Solves "All included players are not subscribed" directly on user's device
   */
  async reRegisterDevice() {
    console.log('[OneSignal Service] Force re-registering push device...');

    if (this.isMedianApp()) {
      const bridge = window.median || window.gonative;
      if (bridge?.onesignal?.push) {
        if (bridge.onesignal.push.requestPermission) {
          bridge.onesignal.push.requestPermission(true);
        }
        if (bridge.onesignal.push.register) {
          bridge.onesignal.push.register({ requestPermission: true, prompt: true });
        }
      }
    }

    if (typeof window !== 'undefined' && window.OneSignal) {
      const OneSignal = window.OneSignal;
      try {
        await OneSignal.Notifications.requestPermission();
        if (OneSignal.User?.PushSubscription) {
          await OneSignal.User.PushSubscription.optIn();
          this.currentSubscriptionId = OneSignal.User.PushSubscription.id;
        }

        if (this.currentFirebaseUid) {
          await this.loginUser(this.currentFirebaseUid);
        }

        return {
          success: true,
          subscriptionId: OneSignal.User?.PushSubscription?.id,
          optedIn: OneSignal.User?.PushSubscription?.optedIn,
          permission: OneSignal.Notifications?.permission
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    return { success: true, message: 'Median device re-registration signaled.' };
  }

  /**
   * Sync active push subscription info to Firestore
   */
  async syncSubscriptionToFirestore(uid, data) {
    try {
      if (typeof window === 'undefined') return;

      // Dynamically import db or use global firebase if available
      const payload = {
        onesignalExternalId: uid,
        onesignalSubscriptionId: data.subscriptionId || null,
        onesignalOptedIn: Boolean(data.optedIn),
        pushActive: Boolean(data.subscriptionId && data.optedIn !== false),
        lastPushSyncAt: new Date().toISOString(),
        userAgent: navigator.userAgent
      };

      // Store in localStorage for rapid offline access
      localStorage.setItem(`sabeel_push_sub_${uid}`, JSON.stringify(payload));

      // Attempt Firestore update if firebase sdk is loaded
      if (window.__sabeel_db && window.__sabeel_updateDoc && window.__sabeel_doc) {
        const userRef = window.__sabeel_doc(window.__sabeel_db, 'users', uid);
        await window.__sabeel_updateDoc(userRef, payload);
        console.log('[OneSignal Service] Synced push subscription to Firestore for user:', uid);
      }
    } catch (e) {
      console.warn('[OneSignal Service] Could not sync subscription to Firestore:', e);
    }
  }
}

export const onesignalService = new OneSignalService();
export default onesignalService;
