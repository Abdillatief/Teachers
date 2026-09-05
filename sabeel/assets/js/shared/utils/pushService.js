/**
 * Push Notification Service using Cloudflare Worker Proxy
 * Connects Firestore notifications seamlessly to OneSignal Native Push
 */

export const WORKER_PUSH_URL = 'https://notification-api.prnccrft.workers.dev/';

/**
 * Sends a Push notification via the Cloudflare Worker proxy.
 * Safe and non-blocking: won't break client-side execution if network fails.
 *
 * @param {Object} options
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {string|string[]} [options.recipientId] - Firebase UID, 'all', 'admin', 'teachers', or array of UIDs
 * @param {string|string[]} [options.external_id] - Alias for recipientId
 * @param {string} [options.type] - Notification category/type
 * @param {string} [options.url] - Deep link URL
 * @param {Object} [options.data] - Custom metadata
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function sendPushNotification({
  title,
  body,
  recipientId = 'all',
  external_id,
  type = 'general',
  url = '/teacher/today-sessions.html',
  data = {}
} = {}) {
  const targetId = external_id || recipientId || 'all';

  const payload = {
    title: title || 'إشعار جديد',
    body: body || '',
    recipientId: targetId,
    external_id: targetId,
    userExternalId: targetId,
    type: type || 'general',
    url: url || '/teacher/today-sessions.html',
    data: {
      url: url || '/teacher/today-sessions.html',
      type: type || 'general',
      notifId: data.notifId || `push-${Date.now()}`,
      ...data
    }
  };

  try {
    const response = await fetch(WORKER_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const resJson = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      console.warn('[PushService Warning] Worker returned status:', response.status, resJson);
      return { success: false, status: response.status, data: resJson };
    }

    console.log('[PushService Success] Push dispatched via Cloudflare Worker:', resJson);
    return { success: true, status: response.status, data: resJson };
  } catch (err) {
    console.warn('[PushService Error] Could not reach Cloudflare Worker:', err);
    return { success: false, error: err.message };
  }
}

// Attach globally to window for easy access across all modules/inline scripts
if (typeof window !== 'undefined') {
  window.sendPushNotification = sendPushNotification;
  window.PushService = {
    sendPushNotification,
    WORKER_PUSH_URL
  };
}
