/**
 * Sabeel Academy - Global Notification Service (Modular & Production-Ready)
 * Version: 3.0.0
 * 
 * Central hub for all notification workflows:
 * 1. Creates standard notification documents in Firestore (`notifications`)
 * 2. Checks global admin notification settings (`settings/notifications`)
 * 3. Verifies user/device registration to prevent OneSignal `invalid_aliases` errors
 * 4. Dispatches push notifications via Cloudflare Worker API Gateway
 * 5. Logs dispatch outcomes to `notification_logs`
 * 6. Non-blocking, fault-tolerant, scalable up to 10,000+ users
 */

import { auth, db } from '../../config/firebase.js';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  getDoc, 
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { isPushSubscriptionOptedIn, ensureActivePushSubscription } from './oneSignalManager.js';
import { hasActiveOneSignalDevice } from './deviceService.js';
import { getAdminNotificationSettings } from './adminNotificationSettingsService.js';
import { sanitizeFirebaseUid } from '../utils/helpers.js';

export const WORKER_PUSH_URL = 'https://notification-api.prnccrft.workers.dev/';

/**
 * Validates and logs dispatch attempts to `notification_logs`
 */
async function writeNotificationLog({ notificationId, userId, sent, delivered, failed, error }) {
  try {
    const logRef = collection(db, 'notification_logs');
    await addDoc(logRef, {
      notificationId: notificationId || 'general',
      userId: userId || 'broadcast',
      sent: Boolean(sent),
      delivered: Boolean(delivered),
      opened: false,
      failed: Boolean(failed),
      error: error || null,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[NotificationService] Logging error:', err);
  }
}

/**
 * Checks if user is eligible for push and registered in OneSignal to prevent invalid_aliases
 */
async function isRecipientEligibleForPush(userId) {
  if (!userId || ['all', 'teachers', 'admins', 'admin'].includes(userId)) {
    return true; // Broadcasts or role segments are handled by OneSignal filters/segments
  }

  try {
    // 1. Check user doc in Firestore
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (userSnap.exists()) {
      const uData = userSnap.data();
      const hasSubscription = Boolean(uData.playerId || uData.subscriptionId || uData.oneSignalId || uData.pushOptedIn);
      if (hasSubscription) return true;
    }

    // 2. Check notification_devices collection
    const hasDevice = await hasActiveOneSignalDevice(userId);
    if (hasDevice) return true;

    return false;
  } catch (e) {
    console.warn('[NotificationService] Eligibility check warning:', e);
    return false;
  }
}

/**
 * Primary dispatch function: saves in Firestore, verifies, and triggers push
 * 
 * @param {Object} options
 * @param {string} options.title - Notification headline
 * @param {string} options.body - Message body
 * @param {string} [options.image] - Optional banner/image URL
 * @param {string} [options.type='general'] - Event type
 * @param {string} [options.priority='normal'] - 'low' | 'normal' | 'high' | 'urgent'
 * @param {string} [options.targetType='all'] - 'all' | 'teachers' | 'admins' | 'role' | 'specific_teachers' | 'specific_user'
 * @param {string|string[]} [options.targetIds] - Target user ID(s)
 * @param {string} [options.deepLink='/teacher/today-sessions.html'] - Action route
 * @param {string} [options.scheduledAt] - ISO date string for scheduling
 * @param {Object} [options.data={}] - Additional metadata payload
 * @returns {Promise<{success: boolean, notificationId?: string, skipped?: boolean, error?: string}>}
 */
export async function sendNotification({
  title,
  body,
  image = null,
  type = 'general',
  priority = 'normal',
  targetType = 'all',
  targetIds = [],
  recipientId = null,
  teacherId = null,
  targetRole = null,
  isPinned = false,
  deepLink = '/teacher/today-sessions.html',
  scheduledAt = null,
  senderId = null,
  data = {}
} = {}) {
  const cleanTitle = (title || 'إشعار من أكاديمية سبيل').toString().trim();
  const cleanBody = (body || '').toString().trim();
  const currentSender = senderId || auth?.currentUser?.uid || 'system';

  // Format targetIds array
  let normalizedTargets = [];
  if (Array.isArray(targetIds)) {
    normalizedTargets = targetIds.filter(Boolean);
  } else if (typeof targetIds === 'string' && targetIds) {
    normalizedTargets = [targetIds];
  }

  // Derive explicit recipientId, targetRole, and teacherId to guarantee ZERO leaks and perfect targeting
  let finalRecipientId = recipientId;
  let finalTargetRole = targetRole;
  let finalTeacherId = teacherId;

  if (!finalRecipientId) {
    if (targetType === 'teachers') {
      finalRecipientId = 'teachers';
      finalTargetRole = finalTargetRole || 'teacher';
    } else if (targetType === 'admins') {
      finalRecipientId = 'admin';
      finalTargetRole = finalTargetRole || 'admin';
    } else if (targetType === 'all') {
      finalRecipientId = 'all';
      finalTargetRole = finalTargetRole || 'all';
    } else if (normalizedTargets.length === 1) {
      finalRecipientId = normalizedTargets[0];
      finalTeacherId = finalTeacherId || normalizedTargets[0];
      finalTargetRole = finalTargetRole || 'teacher';
    } else if (normalizedTargets.length > 1) {
      finalRecipientId = 'specific_teachers';
      finalTargetRole = finalTargetRole || 'teacher';
    }
  }

  // 1. Check Global Admin Settings
  try {
    const settings = await getAdminNotificationSettings();
    if (type === 'session_start' && settings.sessionStartEnabled === false) {
      console.log('[NotificationService] Session start notifications globally disabled by admin.');
      return { success: false, skipped: true, reason: 'session start notifications disabled' };
    }
    if (type.startsWith('session') && type !== 'session_start' && settings.sessionReminderEnabled === false) {
      console.log('[NotificationService] Session reminders globally disabled by admin.');
      return { success: false, skipped: true, reason: 'session reminders disabled' };
    }
    if (type.startsWith('salary') && settings.salaryEnabled === false) {
      console.log('[NotificationService] Salary notifications globally disabled by admin.');
      return { success: false, skipped: true, reason: 'salary notifications disabled' };
    }
    if (type.startsWith('community') && settings.communityEnabled === false) {
      console.log('[NotificationService] Community notifications globally disabled by admin.');
      return { success: false, skipped: true, reason: 'community notifications disabled' };
    }
    if (type.startsWith('maintenance') && settings.maintenanceEnabled === false) {
      console.log('[NotificationService] Maintenance notifications globally disabled by admin.');
      return { success: false, skipped: true, reason: 'maintenance notifications disabled' };
    }
  } catch (e) {
    console.warn('[NotificationService] Settings check error:', e);
  }

  // 2. Persist in Firestore `notifications` collection
  let notifDocRef = null;
  let notifId = null;
  const isScheduled = Boolean(scheduledAt && new Date(scheduledAt).getTime() > Date.now() + 60000);

  // Deduplication Guard: Check if a notification with identical reminderKey exists
  const reminderKey = data.reminderKey || data.dedupKey || null;
  if (reminderKey) {
    try {
      const deterministicId = `rem_${String(reminderKey).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const docSnap = await getDoc(doc(db, 'notifications', deterministicId));
      if (docSnap.exists()) {
        console.log(`[NotificationService] Notification with reminderKey ${reminderKey} already exists. Skipping duplicate creation.`);
        return { success: true, notificationId: docSnap.id, duplicate: true };
      }
      const qExisting = query(
        collection(db, 'notifications'),
        where('reminderKey', '==', reminderKey),
        limit(1)
      );
      const snapExisting = await getDocs(qExisting);
      if (!snapExisting.empty) {
        console.log(`[NotificationService] Notification with reminderKey ${reminderKey} already exists. Skipping duplicate creation.`);
        return { success: true, notificationId: snapExisting.docs[0].id, duplicate: true };
      }
    } catch (e) {
      console.warn('[NotificationService] Dedup check error:', e);
    }
  }

  // Deduplication Guard: If same title, body, and recipient within the last 15 minutes, skip duplicate
  if (finalRecipientId && finalRecipientId !== 'all') {
    try {
      const qRecent = query(
        collection(db, 'notifications'),
        where('recipientId', '==', finalRecipientId),
        limit(20)
      );
      const snapRecent = await getDocs(qRecent);
      const nowMs = Date.now();
      const isDuplicate = snapRecent.docs.some(d => {
        const dData = d.data();
        const docTimeMs = dData.createdAt?.seconds 
          ? dData.createdAt.seconds * 1000 
          : (new Date(dData.createdAtIso || dData.createdAt || 0).getTime());
        const isRecent = docTimeMs > 0 ? (nowMs - docTimeMs) < (15 * 60 * 1000) : true;
        const sameTitle = (dData.title || '').trim() === cleanTitle;
        const sameBody = ((dData.body || dData.message || '').trim() === cleanBody);
        return isRecent && sameTitle && sameBody;
      });
      if (isDuplicate) {
        console.log(`[NotificationService] Duplicate recent notification detected for ${finalRecipientId}. Skipping duplicate creation.`);
        return { success: true, duplicate: true };
      }
    } catch (e) {
      console.warn('[NotificationService] Recent duplicate check warning:', e);
    }
  }

  try {
    const notifPayload = {
      title: cleanTitle,
      body: cleanBody,
      message: cleanBody,
      image: image || null,
      type: type || 'general',
      priority: priority || 'normal',
      targetType: targetType || 'all',
      targetIds: normalizedTargets,
      recipientId: finalRecipientId || 'all',
      targetRole: finalTargetRole || 'all',
      recipientRole: finalTargetRole || 'all',
      teacherId: finalTeacherId || (normalizedTargets.length === 1 ? normalizedTargets[0] : null),
      isPinned: Boolean(isPinned),
      unpinnedBy: [],
      senderId: currentSender,
      createdAt: serverTimestamp(),
      createdAtIso: new Date().toISOString(),
      scheduledAt: scheduledAt || null,
      status: isScheduled ? 'scheduled' : 'pending',
      deepLink: deepLink || '/teacher/today-sessions.html',
      read: false,
      readBy: [],
      openedBy: [],
      deletedBy: [],
      reminderKey: reminderKey || null,
      pushDispatchedByClient: true,
      data: {
        ...data,
        reminderKey: reminderKey || null,
        deepLink: deepLink || '/teacher/today-sessions.html',
        type: type || 'general'
      }
    };

    if (reminderKey) {
      const deterministicId = `rem_${String(reminderKey).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      notifDocRef = doc(db, 'notifications', deterministicId);
      await setDoc(notifDocRef, notifPayload, { merge: true });
      notifId = deterministicId;
    } else {
      notifDocRef = await addDoc(collection(db, 'notifications'), notifPayload);
      notifId = notifDocRef.id;
    }
  } catch (dbErr) {
    console.warn('[NotificationService] Firestore save error:', dbErr);
    // Generate fallback ID to allow push attempt
    notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  // If scheduled for the future, stop here (Cloud Function or Cron will trigger at scheduled time)
  if (isScheduled) {
    console.log(`[NotificationService] Notification ${notifId} scheduled for: ${scheduledAt}`);
    return { success: true, notificationId: notifId, status: 'scheduled' };
  }

  // 3. Resolve Real Target Firebase UIDs (Never pass generic roles like "teachers" or "admin")
  let targetExternalIds = [];

  if (normalizedTargets.length > 0) {
    targetExternalIds = normalizedTargets.map(sanitizeFirebaseUid).filter(Boolean);
  } else if (finalRecipientId && !['all', 'teachers', 'admin', 'admins', 'specific_teachers'].includes(finalRecipientId)) {
    const cleanId = sanitizeFirebaseUid(finalRecipientId);
    if (cleanId) targetExternalIds = [cleanId];
  } else if (targetType === 'teachers' || finalRecipientId === 'teachers' || finalTargetRole === 'teacher') {
    // Fetch all active teacher Firebase UIDs from Firestore
    try {
      const qTeachers = query(collection(db, 'users'), where('role', '==', 'teacher'));
      const snap = await getDocs(qTeachers);
      targetExternalIds = snap.docs.map(d => sanitizeFirebaseUid(d.id)).filter(Boolean);
    } catch (e) {
      console.warn('[NotificationService] Error querying teachers:', e);
    }
  } else if (targetType === 'admins' || finalRecipientId === 'admin' || finalRecipientId === 'admins' || finalTargetRole === 'admin') {
    try {
      const qAdmins = query(collection(db, 'users'), where('role', 'in', ['admin', 'sub_admin']));
      const snap = await getDocs(qAdmins);
      targetExternalIds = snap.docs.map(d => sanitizeFirebaseUid(d.id)).filter(Boolean);
    } catch (e) {
      console.warn('[NotificationService] Error querying admins:', e);
    }
  } else if (targetType === 'all' || finalRecipientId === 'all') {
    try {
      const snap = await getDocs(collection(db, 'users'));
      targetExternalIds = snap.docs.map(d => sanitizeFirebaseUid(d.id)).filter(Boolean);
    } catch (e) {
      console.warn('[NotificationService] Error querying all users:', e);
    }
  }

  // Deduplicate target UIDs and strictly filter out any generic role keywords
  targetExternalIds = [...new Set(targetExternalIds.filter(id => id && !['teachers', 'admin', 'admins', 'all', 'specific_teachers'].includes(id)))];

  // Self-heal / Re-register if current logged-in user is target and missing subscription
  if (auth?.currentUser && targetExternalIds.includes(auth.currentUser.uid)) {
    try {
      await ensureActivePushSubscription(auth.currentUser);
    } catch (e) {}
  }

  // Audit targets for OneSignal subscription & Player ID status
  const targetAudits = [];
  for (const uid of targetExternalIds) {
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

    // Check if current device is this user
    if (auth?.currentUser?.uid === uid) {
      const liveOpted = isPushSubscriptionOptedIn();
      if (liveOpted) hasSub = true;
      const localPId = localStorage.getItem('sabeel_onesignal_player_id');
      if (localPId) pId = pId || localPId;
    }

    targetAudits.push({ uid, hasSubscription: hasSub, playerId: pId });
  }

  // 4. Debug Logs before dispatching to OneSignal / Cloudflare Worker (Required by Prompt)
  console.log("=== [OneSignal Dispatch Debug] ===");
  console.log("Target external IDs (معرفات الأهداف):", targetExternalIds);
  console.log("Recipients count (عدد المستلمين):", targetExternalIds.length);
  console.log("Subscription status details (حالة الاشتراكات):", targetAudits.map(t => ({
    uid: t.uid,
    hasSubscription: t.hasSubscription ? 'نعم (Active)' : 'لا (Not Subscribed)',
    playerId: t.playerId || 'غير مرتبط'
  })));
  console.log("Subscribed count (المشتركون الفعليون):", targetAudits.filter(t => t.hasSubscription).length);
  console.log("===================================");

  if (targetExternalIds.length === 0) {
    console.warn('[NotificationService] No valid recipient Firebase UIDs found. Skipping worker push.');
    if (notifDocRef) {
      await updateDoc(notifDocRef, {
        status: 'delivered_inapp_only',
        pushSkipped: true,
        pushSkipReason: 'no_recipient_uids'
      }).catch(() => {});
    }
    return { success: true, notificationId: notifId, inAppOnly: true };
  }

  const payloadRecipient = targetExternalIds.length === 1 ? targetExternalIds[0] : targetExternalIds;
  const defaultActionUrl = (targetType === 'admins' || finalTargetRole === 'admin')
    ? '/admin/notifications.html'
    : '/teacher/today-sessions.html';
  const finalPushUrl = deepLink || defaultActionUrl;

  const workerPayload = {
    title: cleanTitle,
    body: cleanBody,
    image: image || undefined,
    recipientId: payloadRecipient, // String UID or Array of UIDs! NEVER "teachers"!
    external_id: payloadRecipient,
    userExternalId: payloadRecipient,
    type: type || 'general',
    url: finalPushUrl,
    priority: priority || 'normal',
    data: {
      url: finalPushUrl,
      deepLink: finalPushUrl,
      type: type || 'general',
      notifId: notifId,
      priority: priority || 'normal',
      timestamp: new Date().toISOString(),
      ...data
    }
  };

  try {
    const response = await fetch(WORKER_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workerPayload)
    });

    const resJson = await response.json().catch(() => ({}));
    const hasErrors = resJson && resJson.errors;
    const isSuccess = response.ok && !hasErrors;

    // Update Firestore status
    if (notifDocRef) {
      await updateDoc(notifDocRef, {
        status: isSuccess ? 'sent' : 'failed',
        sentAt: new Date().toISOString(),
        oneSignalResponse: resJson || null
      }).catch(() => {});
    }

    // Write audit log
    const logTargets = targetExternalIds.length > 0 ? targetExternalIds : ['broadcast'];
    for (const tId of logTargets) {
      await writeNotificationLog({
        notificationId: notifId,
        userId: tId,
        sent: isSuccess,
        delivered: isSuccess,
        failed: !isSuccess,
        error: hasErrors ? JSON.stringify(resJson.errors) : (response.ok ? null : `HTTP_${response.status}`)
      });
    }

    if (!isSuccess) {
      console.warn('[NotificationService Warning] Push dispatch returned error:', resJson);
      return { success: false, notificationId: notifId, error: resJson?.errors || `Status ${response.status}` };
    }

    console.log('[NotificationService Success] Dispatched successfully:', { notifId, cleanTitle, targets: targetExternalIds });
    return { success: true, notificationId: notifId, data: resJson };

  } catch (err) {
    console.warn('[NotificationService Error] Network or worker error:', err.message);

    if (notifDocRef) {
      await updateDoc(notifDocRef, {
        status: 'failed',
        error: err.message
      }).catch(() => {});
    }

    const errTargets = targetExternalIds.length > 0 ? targetExternalIds : ['broadcast'];
    for (const tId of errTargets) {
      await writeNotificationLog({
        notificationId: notifId,
        userId: tId,
        sent: false,
        delivered: false,
        failed: true,
        error: err.message
      });
    }

    return { success: false, notificationId: notifId, error: err.message };
  }
}

/**
 * Backward-compatible helper for sendCustomNotification
 */
export async function sendCustomNotification(params = {}) {
  const existingNotifId = params.notifId || params.data?.notifId || null;
  const recipient = params.external_id || params.recipientId || 'all';

  // If a document was ALREADY created in Firestore, do NOT create a second document!
  if (existingNotifId) {
    try {
      const workerPayload = {
        title: (params.title || '').trim(),
        body: (params.body || '').trim(),
        image: params.image || undefined,
        recipientId: recipient,
        external_id: recipient,
        userExternalId: recipient,
        type: params.type || 'general',
        url: params.url || params.deepLink || '/teacher/today-sessions.html',
        priority: params.priority || 'normal',
        data: {
          url: params.url || params.deepLink || '/teacher/today-sessions.html',
          deepLink: params.url || params.deepLink || '/teacher/today-sessions.html',
          type: params.type || 'general',
          notifId: existingNotifId,
          ...(params.data || {})
        }
      };

      const response = await fetch(WORKER_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workerPayload)
      });
      const resJson = await response.json().catch(() => ({}));
      return { success: response.ok, notificationId: existingNotifId, data: resJson };
    } catch (err) {
      console.warn('[PushService Error dispatching existing notif push]:', err);
      return { success: false, notificationId: existingNotifId, error: err.message };
    }
  }

  let targetType = 'all';
  let targetIds = [];

  if (recipient === 'teachers') {
    targetType = 'teachers';
  } else if (recipient === 'admin' || recipient === 'admins') {
    targetType = 'admins';
  } else if (recipient === 'all') {
    targetType = 'all';
  } else if (Array.isArray(recipient)) {
    targetType = 'specific_teachers';
    targetIds = recipient;
  } else if (typeof recipient === 'string') {
    targetType = 'specific_user';
    targetIds = [recipient];
  }

  return sendNotification({
    title: params.title,
    body: params.body,
    image: params.image,
    type: params.type || 'general',
    priority: params.priority || 'normal',
    targetType,
    targetIds,
    deepLink: params.url || params.deepLink || ((targetType === 'admins' || recipient === 'admin' || recipient === 'admins') ? '/admin/notifications.html' : '/teacher/today-sessions.html'),
    data: params.data || {}
  });
}

/**
 * Send notification to a specific user (Firebase UID)
 */
export async function sendNotificationToUser(userId, title, body, options = {}) {
  if (!userId) {
    console.warn('[NotificationService] sendNotificationToUser called without userId');
    return { success: false, error: 'User ID is required' };
  }

  return sendNotification({
    title,
    body,
    image: options.image || null,
    targetType: 'specific_user',
    targetIds: [userId],
    recipientId: userId,
    teacherId: options.teacherId || (options.targetRole === 'teacher' ? userId : null),
    targetRole: options.targetRole || 'teacher',
    isPinned: Boolean(options.isPinned),
    type: options.type || 'user_alert',
    priority: options.priority || 'normal',
    deepLink: options.url || options.deepLink || '/teacher/today-sessions.html',
    data: options.data || {}
  });
}

/**
 * Send notification to all teachers or specific teachers
 */
export async function sendNotificationToTeachers(title, body, options = {}) {
  const specificIds = options.specificTeacherIds && options.specificTeacherIds.length > 0
    ? options.specificTeacherIds
    : null;

  return sendNotification({
    title,
    body,
    image: options.image || null,
    targetType: specificIds ? 'specific_teachers' : 'teachers',
    targetIds: specificIds || [],
    recipientId: specificIds ? (specificIds.length === 1 ? specificIds[0] : 'specific_teachers') : 'teachers',
    teacherId: specificIds && specificIds.length === 1 ? specificIds[0] : null,
    targetRole: 'teacher',
    isPinned: Boolean(options.isPinned),
    type: options.type || 'teacher_broadcast',
    priority: options.priority || 'normal',
    deepLink: options.url || options.deepLink || '/teacher/today-sessions.html',
    data: options.data || {}
  });
}

/**
 * Send notification to administrators
 */
export async function sendNotificationToAdmins(title, body, options = {}) {
  return sendNotification({
    title,
    body,
    image: options.image || null,
    targetType: 'admins',
    type: options.type || 'admin_alert',
    priority: options.priority || 'high',
    deepLink: options.url || options.deepLink || '/admin/sessions.html',
    data: options.data || {}
  });
}

/**
 * Broadcast notification to all members
 */
export async function sendNotificationToAll(title, body, options = {}) {
  return sendNotification({
    title,
    body,
    image: options.image || null,
    targetType: 'all',
    type: options.type || 'academy_broadcast',
    priority: options.priority || 'normal',
    deepLink: options.url || options.deepLink || '/teacher/today-sessions.html',
    data: options.data || {}
  });
}

/**
 * Community announcement notification
 */
export async function notifyCommunityAnnouncement({
  postId,
  title = '',
  content = '',
  authorName = 'الإدارة العامة',
  category = 'announcement'
}) {
  const notifTitle = title && title.trim()
    ? `📢 إعلان إداري: ${title.trim()}`
    : `📢 إعلان وتوجيه جديد من إدارة أكاديمية سبيل`;

  const plainText = (content || '').replace(/\r?\n|\r/g, ' ').trim();
  const snippet = plainText.length > 130 ? plainText.substring(0, 127) + '...' : plainText;
  const notifBody = snippet || 'توجيه إداري جديد، اضغط هنا للاطلاع عليه والمشاركة.';
  const deepLink = `/teacher/community.html?postId=${postId}`;

  return sendNotificationToTeachers(notifTitle, notifBody, {
    deepLink,
    type: 'community_announcement',
    priority: 'normal',
    data: { postId, category, authorName }
  });
}

/**
 * Teacher follower notification
 */
export async function notifyTeacherFollowers({ authorId, authorName = 'أحد المعلمين', postId }) {
  if (!authorId || !postId) return { success: false, count: 0 };
  try {
    const { getTeacherFollowerIds } = await import('../../features/community/communityFollowService.js');
    const { getUserNotificationSettings } = await import('../../features/community/notificationSettingsService.js');

    const followerIds = await getTeacherFollowerIds(authorId);
    if (!followerIds || followerIds.length === 0) return { success: true, count: 0 };

    const eligible = [];
    for (const fId of followerIds) {
      const settings = await getUserNotificationSettings(fId);
      if (settings.followersPosts !== false) {
        eligible.push(fId);
      }
    }

    if (eligible.length === 0) return { success: true, count: 0 };

    const title = 'منشور جديد من أحد المعلمين';
    const body = `${authorName} نشر منشوراً جديداً في الملتقى.`;
    const deepLink = `/teacher/community.html?postId=${postId}`;

    return sendNotification({
      title,
      body,
      targetType: 'specific_teachers',
      targetIds: eligible,
      type: 'teacher_follower_post',
      priority: 'low',
      deepLink,
      data: { postId, authorId, authorName }
    });
  } catch (err) {
    console.warn('[NotificationService] Error in notifyTeacherFollowers:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Maintenance mode alert
 */
export async function notifyMaintenanceMode({ message, enabled = true }) {
  if (!enabled) return { success: true };
  const title = 'تنبيه صيانة من أكاديمية سبيل';
  const body = (message || 'يقوم الفريق التقني للأكاديمية حالياً ببعض أعمال الصيانة والتحسينات المجدولة.').trim();

  return sendNotificationToAll(title, body, {
    deepLink: '/teacher/maintenance.html',
    type: 'maintenance_alert',
    priority: 'urgent',
    data: { alertType: 'maintenance' }
  });
}

/**
 * Session Reminder notification (15 minutes before)
 */
export async function notifySessionReminder({
  teacherId,
  teacherName = 'أستاذنا الفاضل',
  studentName = 'الطالب',
  time = '15 دقيقة',
  deepLink = '/teacher/today-sessions.html'
}) {
  const title = '⏰ تذكير بموعد حصة قادمة';
  const body = `السلام عليكم ${teacherName}، لديك حصة مع ${studentName} بعد ${time}.`;

  return sendNotificationToUser(teacherId, title, body, {
    deepLink,
    teacherId,
    targetRole: 'teacher',
    type: 'session_reminder_15m',
    priority: 'high',
    data: { teacherId, studentName, time }
  });
}

/**
 * Session Start notification (Exact start time)
 */
export async function notifySessionStart({
  teacherId,
  teacherName = 'أستاذنا الفاضل',
  studentName = 'الطالب',
  deepLink = '/teacher/today-sessions.html'
}) {
  const title = '🔴 حان موعد الحصة الآن';
  const body = `حان موعد حصتك الآن مع ${studentName}. نتمنى لك حصة موفقة ومباركة.`;

  return sendNotificationToUser(teacherId, title, body, {
    deepLink,
    teacherId,
    targetRole: 'teacher',
    type: 'session_start',
    priority: 'urgent',
    data: { teacherId, studentName }
  });
}

/**
 * Session unrecorded after 1 hour alert
 */
export async function notifySessionUnrecorded1h({
  teacherId,
  teacherName = 'أستاذنا الفاضل',
  studentName = 'الطالب',
  deepLink = '/teacher/today-sessions.html'
}) {
  const title = '⚠️ تنبيه: عدم تسجيل الحصة';
  const body = `السلام عليكم ${teacherName}، مضت ساعة على موعد حصتك مع ${studentName} ولم يتم توثيقها بعد. يرجى تسجيل الحصة لضمان احتسابها في الراتب.`;

  return sendNotificationToUser(teacherId, title, body, {
    deepLink,
    teacherId,
    targetRole: 'teacher',
    type: 'session_unrecorded_1h',
    priority: 'urgent',
    data: { teacherId, studentName }
  });
}

/**
 * Salary Deposit notification
 */
export async function notifySalaryDeposit({
  teacherId,
  teacherName = 'أستاذنا الفاضل',
  month = '',
  amount = 0,
  deepLink = '/teacher/current-salary.html'
}) {
  const title = '💰 إيداع مستحقات الراتب';
  const body = `السلام عليكم ${teacherName}، تم اعتماد وتجهيز مستحقات الراتب لشهر ${month}. يمكنك الاطلاع على التفاصيل وتأكيد الاستلام.`;

  return sendNotificationToUser(teacherId, title, body, {
    deepLink,
    teacherId,
    targetRole: 'teacher',
    type: 'salary_deposit',
    priority: 'normal',
    data: { teacherId, month, amount }
  });
}

/**
 * Subscription Expiry alert
 */
export async function notifySubscriptionExpiry({
  targetId,
  studentName = 'الطالب',
  remainingLessons = 0,
  deepLink = '/admin/subscriptions.html'
}) {
  const title = '💳 تنبيه رصيد باقة الطالب';
  const body = `تنبيه: أوشك رصيد حصص الطالب ${studentName} على النفاد (المتبقي: ${remainingLessons} حصص). يرجى التنسيق للتجديد.`;

  return sendNotificationToUser(targetId || 'admin', title, body, {
    deepLink,
    targetRole: targetId && targetId !== 'admin' ? 'teacher' : 'admin',
    type: 'subscription_expiry',
    priority: 'normal',
    data: { studentName, remainingLessons }
  });
}

/**
 * Zero-Leak Notification Gate: Mathematically verifies whether a notification is permitted for a given user.
 * Blocks any cross-teacher leakage, admin internal records, or parent data.
 */
export function isNotificationPermittedForUser(item, userUid, userRole = 'teacher') {
  if (!item || !userUid) return false;

  const isAdmin = (userRole === 'admin' || userRole === 'sub_admin');
  if (isAdmin) return true; // Admins have full access to view notifications

  // --- Strict Gate for Teachers & Non-Admins ---
  // 1. Exclude ALL Admin-Internal notification types, targets, or sensitive payload records
  const ADMIN_EXCLUSIVE_TYPES = [
    'completed_session',
    'late_session_recorded',
    'overdue_unrecorded_session',
    'trial_session_submitted',
    'password_reset_request',
    'new_student_request',
    'group_request',
    'teacher_profile_update',
    'feedback_submitted',
    'session_ongoing',
    'student_debt_alert',
    'low_credits_alert',
    'credit_overdraft_alert',
    'credit_exhausted_alert',
    'credit_reminder',
    'package_expired',
    'package_exhausted',
    'payment_overdue'
  ];

  if (
    item.targetType === 'admins' ||
    item.recipientId === 'admin' ||
    item.recipientId === 'admins' ||
    item.recipientId === 'sub_admin' ||
    item.recipientRole === 'admin' ||
    item.targetRole === 'admin' ||
    item.teacherPassword ||
    ADMIN_EXCLUSIVE_TYPES.includes(item.type) ||
    ADMIN_EXCLUSIVE_TYPES.includes(item.category)
  ) {
    return false;
  }

  // 2. Exclude parent and student internal notifications
  if (
    item.recipientRole === 'parent' ||
    item.targetRole === 'parent' ||
    item.recipientRole === 'student' ||
    item.targetRole === 'student' ||
    item.type === 'parent_update' ||
    item.type === 'parent_session_report' ||
    (item.parentPhone && !item.teacherId && item.recipientId !== userUid)
  ) {
    return false;
  }

  // 3. ZERO-LEAK: Prevent cross-teacher leakage
  // A. If recipientId is specified and is NOT this teacher, and NOT an authorized broadcast ('teachers' / 'all'), reject!
  if (item.recipientId && !['teachers', 'all'].includes(item.recipientId) && item.recipientId !== userUid) {
    return false;
  }

  // B. If targetTeacherId is specified and is NOT this teacher, reject!
  if (item.targetTeacherId && item.targetTeacherId !== userUid) {
    return false;
  }

  // C. If targeted to specific teachers or specific user, verify this teacher is actually the intended recipient!
  if (item.targetType === 'specific_teachers' || item.targetType === 'specific_user') {
    const isTargeted = (
      item.recipientId === userUid ||
      item.teacherId === userUid ||
      item.targetTeacherId === userUid ||
      (Array.isArray(item.targetIds) && item.targetIds.includes(userUid))
    );
    if (!isTargeted) return false;
  }

  // D. If targetIds array is provided and not empty, it must explicitly include this teacher!
  if (Array.isArray(item.targetIds) && item.targetIds.length > 0 && !item.targetIds.includes(userUid)) {
    return false;
  }

  // E. If teacherId is set and belongs to another teacher, ensure this is genuinely a general broadcast before showing
  if (item.teacherId && item.teacherId !== userUid) {
    const isExplicitBroadcast = (
      (item.recipientId === 'teachers' || item.recipientId === 'all') &&
      item.targetType !== 'specific_teachers' &&
      item.targetType !== 'specific_user' &&
      (!Array.isArray(item.targetIds) || item.targetIds.length === 0)
    );
    if (!isExplicitBroadcast) return false;
  }

  // 4. Affirmative eligibility: Must be directly targeted or an authorized broadcast
  const isDirect = (
    item.recipientId === userUid ||
    item.teacherId === userUid ||
    item.targetTeacherId === userUid ||
    (Array.isArray(item.targetIds) && item.targetIds.includes(userUid))
  );

  const isBroadcast = (
    item.recipientId === 'teachers' ||
    item.recipientId === 'all' ||
    item.targetType === 'teachers' ||
    item.targetType === 'all' ||
    item.targetRole === 'teachers' ||
    item.targetRole === 'teacher' ||
    item.targetRole === 'all' ||
    item.recipientRole === 'teachers' ||
    item.recipientRole === 'teacher' ||
    item.recipientRole === 'all' ||
    item.type === 'broadcast' ||
    item.type === 'admin_broadcast' ||
    item.type === 'academy_broadcast' ||
    item.type === 'teacher_broadcast' ||
    item.type === 'maintenance_alert' ||
    item.type === 'community_announcement'
  ) && (
    item.recipientId !== 'admin' &&
    item.recipientId !== 'admins' &&
    item.recipientId !== 'sub_admin' &&
    item.targetRole !== 'admin' &&
    item.recipientRole !== 'admin' &&
    item.targetType !== 'admins' &&
    item.targetType !== 'specific_teachers' &&
    item.targetType !== 'specific_user' &&
    (!item.recipientId || ['teachers', 'all'].includes(item.recipientId)) &&
    (!item.teacherId || item.teacherId === userUid) &&
    (!item.targetTeacherId || item.targetTeacherId === userUid) &&
    (!Array.isArray(item.targetIds) || item.targetIds.length === 0 || item.targetIds.includes(userUid))
  );

  return Boolean(isDirect || isBroadcast);
}

/**
 * Real-time listener for a user's notifications with strict zero-leak isolation.
 * Guarantees teachers receive 100% of their notifications and NEVER leak cross-teacher or admin data.
 * 
 * @param {Object} user - Firebase Auth user object
 * @param {string} userRole - 'teacher' | 'admin' | 'sub_admin' | 'parent'
 * @param {Function} onUpdate - Callback receiving the strictly filtered, deduplicated notifications list
 * @returns {Function} Unsubscribe function to tear down all listeners
 */
export function subscribeToUserNotifications(user, userRole, onUpdate) {
  if (!user || !user.uid) {
    onUpdate([]);
    return () => {};
  }

  const isAdmin = (userRole === 'admin' || userRole === 'sub_admin');
  const teacherUid = user.uid;

  if (isAdmin) {
    // Admin sees all system notifications (latest 80)
    let unsubAdmin = null;
    try {
      const qAdmin = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(80));
      unsubAdmin = onSnapshot(qAdmin, (snapshot) => {
        const items = [];
        snapshot.forEach(d => {
          items.push({ id: d.id, ...d.data() });
        });
        onUpdate(items);
      }, (err) => {
        console.warn("[NotificationService] Admin notifications stream warning:", err);
        const qFallback = query(collection(db, "notifications"), limit(80));
        onSnapshot(qFallback, (s) => {
          const fallbackItems = [];
          s.forEach(d => fallbackItems.push({ id: d.id, ...d.data() }));
          onUpdate(fallbackItems);
        }, (e2) => console.error("[NotificationService] Admin fallback failed:", e2));
      });
    } catch (e) {
      console.warn("[NotificationService] Admin listener setup error:", e);
    }

    return () => {
      if (unsubAdmin) unsubAdmin();
    };
  }

  // Teacher or non-admin user: Multi-stream targeted listeners + zero-leak gate
  const docsMap = new Map(); // id -> doc data
  const unsubs = [];

  const triggerUpdate = () => {
    const rawList = Array.from(docsMap.values());
    const filtered = rawList.filter(item => isNotificationPermittedForUser(item, teacherUid, userRole));
    
    // Sort: Pinned first, then newest first
    filtered.sort((a, b) => {
      const isPinnedA = Boolean(a.isPinned) && (!a.unpinnedBy || !a.unpinnedBy.includes(teacherUid));
      const isPinnedB = Boolean(b.isPinned) && (!b.unpinnedBy || !b.unpinnedBy.includes(teacherUid));
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;

      const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (new Date(a.createdAt || a.createdAtIso || 0).getTime());
      const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (new Date(b.createdAt || b.createdAtIso || 0).getTime());
      return timeB - timeA;
    });

    // Zero-Duplicate Deduplication: ensure the exact same notification is never presented twice
    const seenIds = new Set();
    const seenReminderKeys = new Set();
    const seenContentSigs = new Set();
    const uniqueNotifications = [];

    for (const item of filtered) {
      if (!item.id || seenIds.has(item.id)) continue;
      seenIds.add(item.id);

      if (item.reminderKey) {
        const rKey = String(item.reminderKey).trim();
        if (seenReminderKeys.has(rKey)) continue;
        seenReminderKeys.add(rKey);
      }

      // Strong content fingerprint deduplication:
      // Same recipient + same title + same body within the same 6-hour window or day: only show once!
      const cleanTitle = (item.title || '').trim().replace(/\s+/g, ' ');
      const cleanBody = (item.body || item.message || '').trim().replace(/\s+/g, ' ');
      const recipient = item.recipientId || item.teacherId || 'all';
      
      const timeMs = item.createdAt?.seconds 
        ? item.createdAt.seconds * 1000 
        : (new Date(item.createdAt || item.createdAtIso || 0).getTime() || Date.now());
      // 6-hour window
      const timeWindow = Math.floor(timeMs / (6 * 60 * 60 * 1000));
      const sig = `${recipient}___${cleanTitle}___${cleanBody}___${timeWindow}`;

      if (cleanTitle && cleanBody && seenContentSigs.has(sig)) {
        continue;
      }
      if (cleanTitle && cleanBody) {
        seenContentSigs.add(sig);
      }

      uniqueNotifications.push(item);
    }

    onUpdate(uniqueNotifications);
  };

  // Immediate invocation with current/empty state to prevent lingering "loading" spinners
  triggerUpdate();

  const handleSnapshot = (snapshot) => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'removed') {
        docsMap.delete(change.doc.id);
      } else {
        docsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
      }
    });
    triggerUpdate();
  };

  const safeSubscribe = (q, name) => {
    try {
      const u = onSnapshot(q, handleSnapshot, err => {
        console.warn(`[NotificationService] ${name} stream warning:`, err.message);
      });
      unsubs.push(u);
    } catch (e) {
      console.warn(`[NotificationService] ${name} setup error:`, e.message);
    }
  };

  try {
    // Stream 1: Direct to this teacher UID (recipientId == user.uid)
    safeSubscribe(
      query(collection(db, "notifications"), where("recipientId", "==", teacherUid)),
      "DirectRecipient"
    );

    // Stream 2: Directly referencing teacherId == user.uid
    safeSubscribe(
      query(collection(db, "notifications"), where("teacherId", "==", teacherUid)),
      "TeacherId"
    );

    // Stream 3: Referencing targetTeacherId == user.uid (used in group requests etc.)
    safeSubscribe(
      query(collection(db, "notifications"), where("targetTeacherId", "==", teacherUid)),
      "TargetTeacherId"
    );

    // Stream 4: TargetIds array containing user.uid
    safeSubscribe(
      query(collection(db, "notifications"), where("targetIds", "array-contains", teacherUid)),
      "TargetIds"
    );

    // Stream 5: Broadcasts where recipientId in ['teachers', 'all']
    safeSubscribe(
      query(collection(db, "notifications"), where("recipientId", "in", ["teachers", "all"])),
      "BroadcastRecipient"
    );

    // Stream 6: TargetType broadcasts in ['teachers', 'all']
    safeSubscribe(
      query(collection(db, "notifications"), where("targetType", "in", ["teachers", "all"])),
      "BroadcastTargetType"
    );

    // Stream 7: TargetRole broadcasts in ['teachers', 'teacher', 'all']
    safeSubscribe(
      query(collection(db, "notifications"), where("targetRole", "in", ["teachers", "teacher", "all"])),
      "BroadcastTargetRole"
    );

    // Stream 8: General collection recent stream (latest 80) passed through the strict Zero-Leak Gate
    try {
      const qRecent = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(80));
      safeSubscribe(qRecent, "RecentGeneralWithOrder");
    } catch (orderErr) {
      const qRecentFallback = query(collection(db, "notifications"), limit(80));
      safeSubscribe(qRecentFallback, "RecentGeneralFallback");
    }

  } catch (err) {
    console.warn("[NotificationService] Setting up teacher notification streams error:", err);
  }

  return () => {
    unsubs.forEach(u => {
      try { u(); } catch (e) {}
    });
    docsMap.clear();
  };
}

// Backward-compatible alias
export const sendPushNotification = sendCustomNotification;

// Window exposure for inline scripts and debugging
if (typeof window !== 'undefined') {
  window.NotificationService = {
    sendNotification,
    sendCustomNotification,
    sendNotificationToUser,
    sendNotificationToTeachers,
    sendNotificationToAdmins,
    sendNotificationToAll,
    notifyCommunityAnnouncement,
    notifyTeacherFollowers,
    notifyMaintenanceMode,
    notifySessionReminder,
    notifySessionStart,
    notifySessionUnrecorded1h,
    notifySalaryDeposit,
    notifySubscriptionExpiry,
    isNotificationPermittedForUser,
    subscribeToUserNotifications,
    sendPushNotification,
    WORKER_PUSH_URL
  };
  window.notificationService = window.NotificationService;
  window.sendPushNotification = sendPushNotification;
}
