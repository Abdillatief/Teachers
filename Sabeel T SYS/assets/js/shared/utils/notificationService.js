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
  query,
  where,
  getDocs,
  getDoc,
  doc,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { sanitizeFirebaseUid } from './helpers.js';

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
  const cleanUid = sanitizeFirebaseUid(userId);
  if (!cleanUid) {
    console.warn('[NotificationService] Missing or invalid userId for sendNotificationToUser');
    return { success: false, error: 'Missing userId parameter' };
  }

  // 1. Store in Firestore for in-app notification bell
  const inAppNotifId = await createInAppNotification({
    title,
    body,
    recipientId: cleanUid,
    url,
    type: extraData.type || 'direct_user',
    data: extraData
  });

  // Check subscription and Player ID
  let hasSub = false;
  let pId = null;
  try {
    const uSnap = await getDoc(doc(db, 'users', cleanUid));
    if (uSnap.exists()) {
      const uData = uSnap.data();
      pId = uData.playerId || uData.subscriptionId || uData.oneSignalId || null;
      hasSub = Boolean(uData.pushOptedIn || pId);
    }
  } catch (e) {}

  // 4. Debug Logs before dispatching to OneSignal / Worker:
  console.log("=== [OneSignal Dispatch Debug] ===");
  console.log("Target external IDs (معرفات الأهداف):", [cleanUid]);
  console.log("Recipients count (عدد المستلمين):", 1);
  console.log("Has OneSignal subscription (هل لديه اشتراك):", hasSub ? 'نعم (Active)' : 'لا (Not Subscribed)');
  console.log("Player ID مرتبط:", pId || 'غير مرتبط');
  console.log("===================================");

  // 2. Dispatch Push via Cloudflare Worker -> OneSignal
  const payload = {
    title: title || 'إشعار جديد',
    body: body || '',
    recipientId: cleanUid,
    external_id: cleanUid,
    userExternalId: cleanUid,
    type: extraData.type || 'direct_user',
    url: url || '/teacher/today-sessions.html',
    data: {
      url: url || '/teacher/today-sessions.html',
      type: extraData.type || 'direct_user',
      notifId: inAppNotifId || `push-${Date.now()}`,
      userId: cleanUid,
      ...extraData
    }
  };

  return await sendPushPayload(payload);
}

/**
 * Send notification to all teachers in the academy.
 * Resolves real Firebase UIDs of teachers instead of sending generic "teachers" tag.
 * 
 * @param {string} title - Notification title
 * @param {string} body - Notification body/message
 * @param {string} [url] - Target deep link URL
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

  // Resolve Real Teacher Firebase UIDs
  let teacherUids = [];
  try {
    const qTeachers = query(collection(db, 'users'), where('role', '==', 'teacher'));
    const snap = await getDocs(qTeachers);
    teacherUids = snap.docs.map(d => sanitizeFirebaseUid(d.id)).filter(Boolean);
  } catch (err) {
    console.warn('[NotificationService] Error querying teachers:', err);
  }

  teacherUids = [...new Set(teacherUids.filter(id => id && id !== 'teachers'))];

  // Audit subscriptions for debug logs
  const targetAudits = [];
  for (const uid of teacherUids) {
    let hasSub = false;
    let pId = null;
    try {
      const uSnap = await getDoc(doc(db, 'users', uid));
      if (uSnap.exists()) {
        const uData = uSnap.data();
        pId = uData.playerId || uData.subscriptionId || uData.oneSignalId || null;
        hasSub = Boolean(uData.pushOptedIn || pId);
      }
    } catch (e) {}
    targetAudits.push({ uid, hasSubscription: hasSub, playerId: pId });
  }

  // 4. Debug Logs before dispatching to OneSignal / Worker:
  console.log("=== [OneSignal Dispatch Debug - Teachers] ===");
  console.log("Target external IDs (معرفات المعلمين الحقيقية):", teacherUids);
  console.log("Recipients count (عدد المعلمين المستهدفين):", teacherUids.length);
  console.log("Subscription status details (حالة الاشتراكات):", targetAudits.map(t => ({
    uid: t.uid,
    hasSubscription: t.hasSubscription ? 'نعم (Active)' : 'لا (Not Subscribed)',
    playerId: t.playerId || 'غير مرتبط'
  })));
  console.log("Subscribed count (المشتركون الفعليون):", targetAudits.filter(t => t.hasSubscription).length);
  console.log("===================================");

  if (teacherUids.length === 0) {
    console.warn('[NotificationService] No teacher UIDs found to dispatch push.');
    return { success: true, inAppOnly: true, notificationId: inAppNotifId };
  }

  const payloadRecipient = teacherUids.length === 1 ? teacherUids[0] : teacherUids;

  // 2. Dispatch Push via Cloudflare Worker -> OneSignal with REAL UIDs
  const payload = {
    title: title || 'إشعار للمعلمين',
    body: body || '',
    recipientId: payloadRecipient, // REAL UIDs ARRAY or String!
    external_id: payloadRecipient,
    userExternalId: payloadRecipient,
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

  // Resolve Real Admin Firebase UIDs
  let adminUids = [];
  try {
    const qAdmins = query(collection(db, 'users'), where('role', 'in', ['admin', 'sub_admin']));
    const snap = await getDocs(qAdmins);
    adminUids = snap.docs.map(d => sanitizeFirebaseUid(d.id)).filter(Boolean);
  } catch (err) {
    console.warn('[NotificationService] Error querying admins:', err);
  }

  adminUids = [...new Set(adminUids.filter(id => id && !['admin', 'admins'].includes(id)))];

  // Debug Logs
  console.log("=== [OneSignal Dispatch Debug - Admins] ===");
  console.log("Target external IDs (معرفات الإدارة):", adminUids);
  console.log("Recipients count (عدد المستلمين):", adminUids.length);
  console.log("===================================");

  if (adminUids.length === 0) {
    return { success: true, inAppOnly: true, notificationId: inAppNotifId };
  }

  const payloadRecipient = adminUids.length === 1 ? adminUids[0] : adminUids;

  const payload = {
    title: title || 'تنبيه إداري',
    body: body || '',
    recipientId: payloadRecipient,
    external_id: payloadRecipient,
    userExternalId: payloadRecipient,
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

  // Resolve Real All User Firebase UIDs
  let allUids = [];
  try {
    const snap = await getDocs(collection(db, 'users'));
    allUids = snap.docs.map(d => sanitizeFirebaseUid(d.id)).filter(Boolean);
  } catch (err) {
    console.warn('[NotificationService] Error querying all users:', err);
  }

  allUids = [...new Set(allUids.filter(id => id && id !== 'all'))];

  // Debug Logs
  console.log("=== [OneSignal Dispatch Debug - Broadcast All] ===");
  console.log("Target external IDs (معرفات جميع المستخدمين):", allUids);
  console.log("Recipients count (عدد المستلمين):", allUids.length);
  console.log("===================================");

  if (allUids.length === 0) {
    return { success: true, inAppOnly: true, notificationId: inAppNotifId };
  }

  const payloadRecipient = allUids.length === 1 ? allUids[0] : allUids;

  const payload = {
    title: title || 'إعلان من أكاديمية سبيل',
    body: body || '',
    recipientId: payloadRecipient,
    external_id: payloadRecipient,
    userExternalId: payloadRecipient,
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
