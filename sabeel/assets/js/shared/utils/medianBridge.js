/**
 * Sabeel Academy - Median (GoNative) Native Mobile App Wrapper Bridge
 * 
 * Provides unified native integrations for:
 * 1. Environment Detection (Median Native WebView vs Regular Web/PWA)
 * 2. Native Biometrics (Android BiometricPrompt & iOS Touch ID / Face ID)
 * 3. Native Push Notifications (Firebase Cloud Messaging via Median Native Push)
 * 4. Native Keychain / Secure Storage
 */

/**
 * Detects if the current web app is executing inside Median Native App Wrapper (Android or iOS)
 * @returns {boolean}
 */
export function isMedianApp() {
  if (typeof window === 'undefined') return false;
  
  // 1. Check window objects injected by Median / GoNative JavaScript Bridge
  const hasMedianBridge = typeof window.median !== 'undefined' || typeof window.gonative !== 'undefined';
  
  // 2. Check User Agent for Median identifiers
  const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
  const isMedianUA = ua.includes('median') || ua.includes('gonative');
  
  // 3. Check custom query parameter or stored flag for manual preview / testing
  const isMedianQuery = window.location.search.includes('median=true') || window.location.search.includes('gonative=true');
  const isMedianStored = localStorage.getItem('sabeel_median_mode') === 'true';

  return Boolean(hasMedianBridge || isMedianUA || isMedianQuery || isMedianStored);
}

/**
 * Detects native operating system platform
 * @returns {'median-android' | 'median-ios' | 'web-mobile' | 'web-desktop'}
 */
export function getAppPlatform() {
  const isMedian = isMedianApp();
  const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);

  if (isMedian) {
    return isIOS ? 'median-ios' : 'median-android';
  }
  if (isIOS || isAndroid) {
    return isIOS ? 'web-ios' : 'web-android';
  }
  return 'web-desktop';
}

/**
 * Executes a native command via Median JS Bridge with fallback to custom URL scheme
 */
function invokeMedianCommand(command, params = {}) {
  try {
    // 1. Try window.median JS Bridge
    if (window.median) {
      const parts = command.split('.');
      let current = window.median;
      for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]]) {
          current = current[parts[i]];
        } else {
          break;
        }
      }
      const lastMethod = parts[parts.length - 1];
      if (typeof current[lastMethod] === 'function') {
        return current[lastMethod](params);
      }
    }

    // 2. Try legacy window.gonative JS Bridge
    if (window.gonative) {
      const parts = command.split('.');
      let current = window.gonative;
      for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]]) {
          current = current[parts[i]];
        } else {
          break;
        }
      }
      const lastMethod = parts[parts.length - 1];
      if (typeof current[lastMethod] === 'function') {
        return current[lastMethod](params);
      }
    }

    // 3. Fallback to median:// URL scheme
    const query = new URLSearchParams(params).toString();
    const schemeUrl = `median://${command.replace(/\./g, '/')}${query ? '?' + query : ''}`;
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = schemeUrl;
    document.body.appendChild(iframe);
    setTimeout(() => {
      try { iframe.remove(); } catch (e) {}
    }, 500);

    return null;
  } catch (err) {
    console.warn(`[MedianBridge] Error invoking command ${command}:`, err);
    return null;
  }
}

/* ==========================================================================
   Median Native Biometrics & Auth Plugin
   ========================================================================== */

/**
 * Triggers native device Biometric Authentication (Fingerprint / Face ID / Screen Lock)
 * @param {string} promptTitle - Message displayed on native prompt
 * @returns {Promise<boolean>}
 */
export async function promptMedianNativeBiometric(promptTitle = 'تسجيل الدخول إلى تطبيق سَبِيل') {
  return new Promise((resolve, reject) => {
    if (!isMedianApp()) {
      return reject(new Error('هذه الخاصية تتطلب تشغيل التطبيق عبر تطبيق الهاتف الأصلي (Median).'));
    }

    let resolved = false;
    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        // Fallback: If bridge callback didn't fire in 20 seconds, treat as cancellation
        reject(new Error('انتهت مهلة قراءة البصمة أو تم إلغاؤها من قبل المستخدم.'));
      }
    }, 20000);

    // Global callback for Median Biometrics
    const callbackName = 'median_auth_biometric_callback_' + Date.now();
    window[callbackName] = function(result) {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutTimer);
      delete window[callbackName];

      if (result && (result.success === true || result.authenticated === true || result.status === 'success')) {
        resolve(true);
      } else {
        const errMsg = result && result.error ? result.error : 'فشلت مطابقة البصمة أو تم إلغاؤها.';
        reject(new Error(errMsg));
      }
    };

    try {
      // 1. Check if median.auth.biometric returns a Promise
      if (window.median && window.median.auth && typeof window.median.auth.biometric === 'function') {
        const res = window.median.auth.biometric({
          prompt: promptTitle,
          promptTitle: promptTitle,
          callback: callbackName
        });

        if (res && typeof res.then === 'function') {
          res.then((data) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutTimer);
              if (data && (data.success === true || data.authenticated === true || data.status === 'success' || data === true)) {
                resolve(true);
              } else {
                reject(new Error((data && data.error) || 'فشلت مطابقة البصمة.'));
              }
            }
          }).catch((err) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutTimer);
              reject(err || new Error('فشلت عملية البصمة.'));
            }
          });
          return;
        }
      }

      // 2. Try gonative.auth.biometric
      if (window.gonative && window.gonative.auth && typeof window.gonative.auth.biometric === 'function') {
        const res = window.gonative.auth.biometric({
          prompt: promptTitle,
          promptTitle: promptTitle,
          callback: callbackName
        });
        if (res && typeof res.then === 'function') {
          res.then((data) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutTimer);
              resolve(Boolean(data && data.success !== false));
            }
          }).catch(err => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutTimer);
              reject(err);
            }
          });
          return;
        }
      }

      // 3. Invoke command via helper
      invokeMedianCommand('auth.biometric', {
        prompt: promptTitle,
        promptTitle: promptTitle,
        callback: callbackName
      });

    } catch (err) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutTimer);
        reject(err);
      }
    }
  });
}

/* ==========================================================================
   Median Native Push Notifications (OneSignal & Native FCM Plugin)
   ========================================================================== */

let cachedOneSignalInfo = null;
const oneSignalListeners = [];
let cachedMedianFcmToken = null;
const tokenListeners = [];

/**
 * Registers global Median OneSignal and Push token receiver callbacks
 */
function initMedianPushTokenListener() {
  if (typeof window === 'undefined') return;

  // 1. OneSignal Info Receiver
  const handleOneSignalInfo = (infoData) => {
    if (!infoData) return;
    console.log('[MedianBridge] OneSignal Info received:', infoData);
    
    const playerId = infoData.userId || infoData.oneSignalUserId || infoData.id || infoData.playerId || null;
    const pushToken = infoData.pushToken || infoData.registrationToken || null;
    const subscribed = infoData.subscribed !== false && infoData.optedOut !== true;

    const parsed = {
      userId: playerId,
      playerId: playerId,
      pushToken: pushToken,
      subscribed: subscribed,
      raw: infoData
    };

    cachedOneSignalInfo = parsed;
    if (playerId) {
      localStorage.setItem('sabeel_onesignal_player_id', playerId);
    }

    oneSignalListeners.forEach(listener => {
      try { listener(parsed); } catch (e) { console.warn(e); }
    });
  };

  // OneSignal global bridge callbacks
  window.median_onesignal_info = handleOneSignalInfo;
  window.gonative_onesignal_info = handleOneSignalInfo;
  window.median_onesignal_player_id = (id) => handleOneSignalInfo({ userId: id });
  window.gonative_onesignal_player_id = (id) => handleOneSignalInfo({ userId: id });

  // OneSignal Notification Opened Deep Link Handler
  window.median_onesignal_opened = function(payload) {
    console.log('[MedianBridge] OneSignal Notification clicked/opened:', payload);
    const targetUrl = payload?.url || payload?.data?.url || payload?.custom?.u;
    if (targetUrl) {
      window.location.href = targetUrl;
    }
  };
  window.gonative_onesignal_opened = window.median_onesignal_opened;

  // 2. FCM Native Token Receiver (Fallback)
  const handleReceivedToken = (tokenData) => {
    let tokenStr = null;
    if (typeof tokenData === 'string' && tokenData.length > 10) {
      tokenStr = tokenData;
    } else if (tokenData && typeof tokenData.token === 'string') {
      tokenStr = tokenData.token;
    } else if (tokenData && typeof tokenData.fcmToken === 'string') {
      tokenStr = tokenData.fcmToken;
    } else if (tokenData && typeof tokenData.registrationToken === 'string') {
      tokenStr = tokenData.registrationToken;
    }

    if (tokenStr) {
      console.log('[MedianBridge] Native FCM Token received from Median:', tokenStr.substring(0, 15) + '...');
      cachedMedianFcmToken = tokenStr;
      localStorage.setItem('sabeel_median_fcm_token', tokenStr);
      tokenListeners.forEach(listener => {
        try { listener(tokenStr); } catch (e) { console.warn(e); }
      });
    }
  };

  // Define Median & GoNative standard callback functions
  window.median_push_fcm_token = handleReceivedToken;
  window.gonative_push_fcm_token = handleReceivedToken;
  window.median_push_token = handleReceivedToken;
  window.gonative_push_info = handleReceivedToken;
  window.median_push_info = handleReceivedToken;
  window.gonative_push_opened = function(payload) {
    console.log('[MedianBridge] Native Notification clicked/opened in Median:', payload);
    if (payload && payload.url) {
      window.location.href = payload.url;
    }
  };
}

// Auto-initialize listener immediately
initMedianPushTokenListener();

/**
 * Associates current authenticated user with OneSignal via Median Native Bridge
 * Sets OneSignal External User ID = Firebase User UID
 * @param {object} user - Firebase User object
 * @param {string} [role] - User role ('teacher' | 'admin')
 * @returns {Promise<{ oneSignalId: string|null, externalId: string }>}
 */
export async function initMedianOneSignal(user, role = 'teacher') {
  if (!user || !user.uid) return { oneSignalId: null, externalId: null };
  if (!isMedianApp()) return { oneSignalId: null, externalId: null };

  const externalId = user.uid;
  const userRole = role || localStorage.getItem('sabeel_user_role') || 'teacher';
  const platform = getAppPlatform();

  console.log(`[Median OneSignal] Associating User UID (${externalId}) with OneSignal Native Bridge...`);

  // 1. Set OneSignal External User ID via Median Bridge
  try {
    if (window.median?.onesignal?.setExternalUserId) {
      window.median.onesignal.setExternalUserId({ externalId: externalId });
    } else if (window.gonative?.onesignal?.setExternalUserId) {
      window.gonative.onesignal.setExternalUserId({ externalId: externalId });
    } else if (window.median?.onesignal?.login) {
      window.median.onesignal.login({ externalId: externalId });
    } else {
      invokeMedianCommand('onesignal.setExternalUserId', { externalId: externalId });
    }
  } catch (e) {
    console.warn('[Median OneSignal] setExternalUserId error:', e);
  }

  // 2. Set OneSignal User Tags (Role, UID, Email, Platform)
  const tags = {
    uid: externalId,
    role: userRole,
    email: user.email || '',
    platform: platform,
    isApprovedTeacher: userRole === 'teacher' ? 'true' : 'false',
    isAdmin: userRole === 'admin' ? 'true' : 'false'
  };

  setMedianOneSignalTags(tags);

  // 3. Request OneSignal Info (Player ID / Subscription ID)
  const info = await getMedianOneSignalInfo(6000);
  const oneSignalId = info?.userId || info?.playerId || localStorage.getItem('sabeel_onesignal_player_id') || null;

  return {
    oneSignalId: oneSignalId,
    externalId: externalId,
    platform: platform
  };
}

/**
 * Sets native OneSignal push tags in Median
 * @param {object} tags - Key-value pair of tags
 */
export function setMedianOneSignalTags(tags = {}) {
  if (!isMedianApp()) return;

  try {
    if (window.median?.onesignal?.tags?.set) {
      window.median.onesignal.tags.set({ tags });
      return;
    }
    if (window.gonative?.onesignal?.tags?.set) {
      window.gonative.onesignal.tags.set({ tags });
      return;
    }
    if (window.median?.onesignal?.sendTags) {
      window.median.onesignal.sendTags(tags);
      return;
    }
    invokeMedianCommand('onesignal.tags.set', { tags });
  } catch (err) {
    console.warn('[MedianBridge] Error setting OneSignal tags:', err);
  }
}

/**
 * Retrieves OneSignal registration info (Player ID, Push Token, Subscription Status)
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<{ userId: string|null, pushToken: string|null, subscribed: boolean }|null>}
 */
export async function getMedianOneSignalInfo(timeoutMs = 5000) {
  if (!isMedianApp()) return null;

  if (cachedOneSignalInfo && cachedOneSignalInfo.userId) {
    return cachedOneSignalInfo;
  }

  const storedPlayerId = localStorage.getItem('sabeel_onesignal_player_id');
  if (storedPlayerId) {
    cachedOneSignalInfo = {
      userId: storedPlayerId,
      playerId: storedPlayerId,
      pushToken: null,
      subscribed: true
    };
  }

  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(cachedOneSignalInfo || null);
      }
    }, timeoutMs);

    oneSignalListeners.push((info) => {
      if (!resolved && info && info.userId) {
        resolved = true;
        clearTimeout(timer);
        resolve(info);
      }
    });

    try {
      // 1. Try median.onesignal.info()
      if (window.median?.onesignal?.info) {
        const res = window.median.onesignal.info();
        if (res && typeof res.then === 'function') {
          res.then((data) => {
            if (data && !resolved) {
              const playerId = data.userId || data.oneSignalUserId || data.id;
              if (playerId) {
                resolved = true;
                clearTimeout(timer);
                cachedOneSignalInfo = {
                  userId: playerId,
                  playerId: playerId,
                  pushToken: data.pushToken || null,
                  subscribed: data.subscribed !== false
                };
                localStorage.setItem('sabeel_onesignal_player_id', playerId);
                resolve(cachedOneSignalInfo);
              }
            }
          }).catch(e => console.warn('[Median] onesignal.info error:', e));
        }
      }

      // 2. Try gonative.onesignal.info()
      if (window.gonative?.onesignal?.info) {
        const res = window.gonative.onesignal.info();
        if (res && typeof res.then === 'function') {
          res.then((data) => {
            if (data && !resolved) {
              const playerId = data.userId || data.oneSignalUserId || data.id;
              if (playerId) {
                resolved = true;
                clearTimeout(timer);
                cachedOneSignalInfo = {
                  userId: playerId,
                  playerId: playerId,
                  pushToken: data.pushToken || null,
                  subscribed: data.subscribed !== false
                };
                localStorage.setItem('sabeel_onesignal_player_id', playerId);
                resolve(cachedOneSignalInfo);
              }
            }
          }).catch(e => console.warn('[GoNative] onesignal.info error:', e));
        }
      }

      // 3. Trigger command via URL scheme / callback
      invokeMedianCommand('onesignal.info', { callback: 'median_onesignal_info' });
      invokeMedianCommand('onesignal.getUserId', { callback: 'median_onesignal_player_id' });

    } catch (err) {
      console.warn('[MedianBridge] Error querying OneSignal info:', err);
    }
  });
}

/**
 * Removes user association with OneSignal upon logout
 */
export function logoutMedianOneSignal() {
  if (!isMedianApp()) return;

  try {
    if (window.median?.onesignal?.removeExternalUserId) {
      window.median.onesignal.removeExternalUserId();
    } else if (window.gonative?.onesignal?.removeExternalUserId) {
      window.gonative.onesignal.removeExternalUserId();
    } else if (window.median?.onesignal?.logout) {
      window.median.onesignal.logout();
    } else {
      invokeMedianCommand('onesignal.removeExternalUserId');
    }
    localStorage.removeItem('sabeel_onesignal_player_id');
    cachedOneSignalInfo = null;
    console.log('[Median OneSignal] Unregistered external user ID on logout.');
  } catch (err) {
    console.warn('[MedianBridge] Error logging out from OneSignal:', err);
  }
}

/**
 * Retrieves the Native FCM device token from Median Native App Bridge (FCM Plugin mode)
 * @returns {Promise<string|null>}
 */
export async function getMedianNativeFcmToken(timeoutMs = 6000) {
  if (!isMedianApp()) return null;

  // Check cached or persisted token
  if (cachedMedianFcmToken) return cachedMedianFcmToken;
  const storedToken = localStorage.getItem('sabeel_median_fcm_token');
  if (storedToken) cachedMedianFcmToken = storedToken;

  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(cachedMedianFcmToken || null);
      }
    }, timeoutMs);

    // Register token listener
    tokenListeners.push((token) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(token);
      }
    });

    try {
      // 1. Try median.push.fcm.getToken()
      if (window.median?.push?.fcm?.getToken) {
        const res = window.median.push.fcm.getToken();
        if (res && typeof res.then === 'function') {
          res.then((data) => {
            if (data && !resolved) {
              const tok = typeof data === 'string' ? data : data.token || data.fcmToken;
              if (tok) {
                resolved = true;
                clearTimeout(timer);
                cachedMedianFcmToken = tok;
                localStorage.setItem('sabeel_median_fcm_token', tok);
                resolve(tok);
              }
            }
          }).catch(e => console.warn('[Median] push.fcm.getToken error:', e));
        }
      }

      // 2. Try median.push.getToken()
      if (window.median?.push?.getToken) {
        const res = window.median.push.getToken();
        if (res && typeof res.then === 'function') {
          res.then((data) => {
            if (data && !resolved) {
              const tok = typeof data === 'string' ? data : data.token;
              if (tok) {
                resolved = true;
                clearTimeout(timer);
                cachedMedianFcmToken = tok;
                localStorage.setItem('sabeel_median_fcm_token', tok);
                resolve(tok);
              }
            }
          }).catch(e => console.warn('[Median] push.getToken error:', e));
        }
      }

      // 3. Try gonative.push.getToken()
      if (window.gonative?.push?.getToken) {
        const res = window.gonative.push.getToken();
        if (res && typeof res.then === 'function') {
          res.then((data) => {
            if (data && !resolved) {
              const tok = typeof data === 'string' ? data : data.token;
              if (tok) {
                resolved = true;
                clearTimeout(timer);
                cachedMedianFcmToken = tok;
                localStorage.setItem('sabeel_median_fcm_token', tok);
                resolve(tok);
              }
            }
          }).catch(e => console.warn('[GoNative] push.getToken error:', e));
        }
      }

      // 4. Trigger token request via bridge command
      invokeMedianCommand('push.fcm.getToken', { callback: 'median_push_fcm_token' });
      invokeMedianCommand('push.getToken', { callback: 'median_push_token' });
      invokeMedianCommand('push.info', { callback: 'median_push_info' });

    } catch (err) {
      console.warn('[MedianBridge] Error requesting native FCM token:', err);
    }
  });
}

/**
 * Sets native push tags/topics in Median (e.g. role, userId)
 * @param {object} tags - Key-value pair of tags
 */
export function setMedianPushTags(tags = {}) {
  if (!isMedianApp()) return;

  try {
    if (window.median?.push?.tags?.set) {
      window.median.push.tags.set(tags);
      return;
    }
    if (window.gonative?.push?.tags?.set) {
      window.gonative.push.tags.set(tags);
      return;
    }
    invokeMedianCommand('push.tags.set', tags);
  } catch (err) {
    console.warn('[MedianBridge] Error setting push tags:', err);
  }
}

/**
 * Subscribes the device to an FCM Topic via Median Native Push
 * @param {string} topic - Topic name (e.g. 'all', 'teachers', 'admins')
 */
export function subscribeMedianFcmTopic(topic) {
  if (!isMedianApp() || !topic) return;

  try {
    if (window.median?.push?.fcm?.subscribe) {
      window.median.push.fcm.subscribe({ topic });
      return;
    }
    if (window.gonative?.push?.fcm?.subscribe) {
      window.gonative.push.fcm.subscribe({ topic });
      return;
    }
    invokeMedianCommand('push.fcm.subscribe', { topic });
  } catch (err) {
    console.warn('[MedianBridge] Error subscribing to FCM topic:', err);
  }
}
