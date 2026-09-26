/**
 * Sabeel Academy - Centralized Notification Service
 * Version: 1.0.0
 * 
 * Central hub for all OneSignal Native Push Notifications via Cloudflare Worker proxy
 * and synchronized in-app Firestore notifications.
 * Worker Proxy: https://notification-api.prnccrft.workers.dev/
 */

import { db } from '../../config/firebase.js';
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const NOTIFICATION_API_URL = 'https://notification-api.prnccrft.workers.dev/';
export const WORKER_PUSH_URL = NOTIFICATION_API_URL;

/**
 * Dispatches a raw notification payload to the Cloudflare Worker proxy.
 * Completely non-blocking and safe: catches errors gracefully.
 *
 * @param {Object} payload - Notification data sent to worker
 * @returns {Promise<{success: boolean, status?: number, data?: any, error?: string}>}
 */
export async function sendPushPayload(payload) {
  try {
    const response = await fetch(NOTIFICATION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const resJson = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.warn('[NotificationService Warning] Worker returned status:', response.status, resJson);
      return { success: false, status: response.status, data: resJson };
    }

    console.log('[NotificationService Success] Push successfully dispatched via Cloudflare Worker:', resJson);
    return { success: true, status: response.status, data: resJson };
  } catch (err) {
    console.warn('[NotificationService Error] Could not reach Cloudflare Worker:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Creates an in-app notification in Firestore `notifications` collection
 * so the top navbar bell dropdown displays it immediately.
 */
export async function createInAppNotification({
  title,
  body,
  recipientId = 'all',
  url = '',
  type = 'general',
  data = {}
}) {
  try {
    const notifRef = await addDoc(collection(db, "notifications"), {
      title: title || 'إشعار جديد',
      message: body || '',
      body: body || '',
      recipientId: recipientId || 'all',
      url: url || '',
      type: type || 'general',
      read: false,
      readBy: [],
      archived: false,
      data: data || {},
      createdAt: serverTimestamp()
    });
    return notifRef.id;
  } catch (err) {
    console.warn('[NotificationService Warning] Could not save in-app notification:', err);
    return null;
  }
}

/**
 * Send notification to a specific user by their Firebase UID / OneSignal External ID.
 * 
 * @param {string} userId - Firebase User UID (associated as OneSignal external_id)
 * @param {string} title - Notification title
 * @param {string} body - Notification body/message
 * @param {string} [url] - Target deep link URL
 * @param {Object} [extraData] - Additional payload metadata
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function sendNotificationToUser(userId, title, body, url = '', extraData = {}) {
  if (!userId) {
    console.warn('[NotificationService] Missing userId for sendNotificationToUser');
    return { success: false, error: 'Missing userId parameter' };
  }

  // 1. Store in Firestore for in-app notification bell
  const inAppNotifId = await createInAppNotification({
    title,
    body,
    recipientId: userId,
    url,
    type: extraData.type || 'direct_user',
    data: extraData
  });

  // 2. Dispatch Push via Cloudflare Worker -> OneSignal
  const payload = {
    title: title || 'إشعار جديد',
    body: body || '',
    recipientId: userId,
    external_id: userId,
    userExternalId: userId,
    type: extraData.type || 'direct_user',
    url: url || '/teacher/today-sessions.html',
    data: {
      url: url || '/teacher/today-sessions.html',
      type: extraData.type || 'direct_user',
      notifId: inAppNotifId || `push-${Date.now()}`,
      userId,
      ...extraData
    }
  };

  return await sendPushPayload(payload);
}

/**
 * Send notification to all teachers in the academy.
 * 
 * @param {string} title - Notification title
 * @param {string} body - Notification body/message
 * @param {string} [url] - Target deep link URL (e.g. /teacher/community.html?postId=...)
 * @param {Object} [extraData] - Additional payload metadata
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function sendNotificationToTeachers(title, body, url = '', extraData = {}) {
  // 1. Store in Firestore for all teachers
  const inAppNotifId = await createInAppNotification({
    title,
    body,
    recipientId: 'teachers',
    url: url || '/teacher/today-sessions.html',
    type: extraData.type || 'community',
    data: extraData
  });

  // 2. Dispatch Push via Cloudflare Worker -> OneSignal
  const payload = {
    title: title || 'إشعار للمعلمين',
    body: body || '',
    recipientId: 'teachers',
    external_id: 'teachers',
    userExternalId: 'teachers',
    type: extraData.type || 'community',
    url: url || '/teacher/today-sessions.html',
    data: {
      url: url || '/teacher/today-sessions.html',
      type: extraData.type || 'community',
      notifId: inAppNotifId || `push-${Date.now()}`,
      target: 'teachers',
      ...extraData
    }
  };

  return await sendPushPayload(payload);
}

/**
 * Send notification to Academy Administration (Admin/Supervisors).
 * 
 * @param {string} title - Notification title
 * @param {string} body - Notification body/message
 * @param {string} [url] - Target deep link URL
 * @param {Object} [extraData] - Additional payload metadata
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function sendNotificationToAdmin(title, body, url = '', extraData = {}) {
  const inAppNotifId = await createInAppNotification({
    title,
    body,
    recipientId: 'admin',
    url: url || '/admin/notifications.html',
    type: extraData.type || 'admin_alert',
    data: extraData
  });

  const payload = {
    title: title || 'تنبيه إداري',
    body: body || '',
    recipientId: 'admin',
    external_id: 'admin',
    userExternalId: 'admin',
    type: extraData.type || 'admin_alert',
    url: url || '/admin/notifications.html',
    data: {
      url: url || '/admin/notifications.html',
      type: extraData.type || 'admin_alert',
      notifId: inAppNotifId || `push-${Date.now()}`,
      target: 'admin',
      ...extraData
    }
  };

  return await sendPushPayload(payload);
}

/**
 * Send general broadcast notification to all users across the academy.
 * 
 * @param {string} title - Notification title
 * @param {string} body - Notification body/message
 * @param {string} [url] - Target deep link URL
 * @param {Object} [extraData] - Additional payload metadata
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function sendNotificationToAll(title, body, url = '', extraData = {}) {
  const inAppNotifId = await createInAppNotification({
    title,
    body,
    recipientId: 'all',
    url: url || '',
    type: extraData.type || 'broadcast',
    data: extraData
  });

  const payload = {
    title: title || 'إعلان من أكاديمية سبيل',
    body: body || '',
    recipientId: 'all',
    external_id: 'all',
    userExternalId: 'all',
    type: extraData.type || 'broadcast',
    url: url || '',
    data: {
      url: url || '',
      type: extraData.type || 'broadcast',
      notifId: inAppNotifId || `push-${Date.now()}`,
      target: 'all',
      ...extraData
    }
  };

  return await sendPushPayload(payload);
}

/**
 * Unified dispatch helper for arbitrary push requests.
 * Compatible with options object structure.
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

  if (targetId === 'teachers') {
    return sendNotificationToTeachers(title, body, url, { type, ...data });
  }
  if (targetId === 'admin' || targetId === 'sub_admin') {
    return sendNotificationToAdmin(title, body, url, { type, ...data });
  }
  if (targetId === 'all') {
    return sendNotificationToAll(title, body, url, { type, ...data });
  }
  return sendNotificationToUser(targetId, title, body, url, { type, ...data });
}

// Global browser window bindings for universal accessibility across legacy scripts
if (typeof window !== 'undefined') {
  window.NotificationService = {
    sendNotificationToUser,
    sendNotificationToTeachers,
    sendNotificationToAdmin,
    sendNotificationToAll,
    sendPushNotification,
    sendPushPayload,
    createInAppNotification,
    NOTIFICATION_API_URL,
    WORKER_PUSH_URL
  };
  window.sendNotificationToUser = sendNotificationToUser;
  window.sendNotificationToTeachers = sendNotificationToTeachers;
  window.sendPushNotification = sendPushNotification;
}
