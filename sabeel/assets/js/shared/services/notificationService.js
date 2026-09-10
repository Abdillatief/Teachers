/**
 * Sabeel Academy - Centralized Notification Service
 * Version: 2.0.0
 * 
 * Central hub for all OneSignal push notifications via the Cloudflare Worker proxy.
 * Interfaces seamlessly with https://notification-api.prnccrft.workers.dev/
 * Non-blocking, fault-tolerant, and supports user mapping, role broadcasts,
 * and deep links for teachers and administrators.
 */

import { auth, db } from '../../config/firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { isPushSubscriptionOptedIn } from './oneSignalManager.js';

export const WORKER_PUSH_URL = 'https://notification-api.prnccrft.workers.dev/';

/**
 * Standard Dispatcher to Cloudflare Worker
 * 
 * @param {Object} payload - Notification parameters
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body content
 * @param {string|string[]} [payload.recipientId='all'] - UID, 'all', 'admin', 'teachers', or array of UIDs
 * @param {string} [payload.type='general'] - Category/Event tag
 * @param {string} [payload.url] - Deep link URL
 * @param {Object} [payload.data] - Additional metadata payload
 * @returns {Promise<{success: boolean, status?: number, data?: any, error?: string}>}
 */
export async function sendCustomNotification({
  title,
  body,
  recipientId = 'all',
  external_id,
  type = 'general',
  url = '/teacher/today-sessions.html',
  data = {}
} = {}) {
  const targetId = external_id || recipientId || 'all';

  // REQUIREMENT: Do not send push notification before OneSignal.User.pushSubscription.optedIn is complete
  if (typeof window !== 'undefined' && window.OneSignal?.User?.pushSubscription) {
    const isOptedIn = window.OneSignal.User.pushSubscription.optedIn;
    // If target is current user or self-test, strictly enforce optedIn
    if (auth?.currentUser && (targetId === auth.currentUser.uid || targetId === 'self')) {
      if (!isOptedIn) {
        console.warn('[NotificationService] Blocked push: OneSignal.User.pushSubscription.optedIn is false for current user.');
        return {
          success: false,
          skipped: true,
          error: 'OneSignal push subscription is not opted in yet. Please enable push permissions first.'
        };
      }
    }
  }

  // If sending to a specific user UID (not broadcast channels like 'all', 'admin', 'teachers')
  if (typeof targetId === 'string' && !['all', 'admin', 'teachers'].includes(targetId)) {
    try {
      if (db) {
        const recipientSnap = await getDoc(doc(db, 'users', targetId));
        if (recipientSnap.exists()) {
          const rData = recipientSnap.data();
          const isRegistered = Boolean(rData.subscriptionId || rData.playerId || rData.oneSignalId || rData.pushOptedIn);
          if (!isRegistered) {
            console.warn(`[NotificationService] Skipping push to ${targetId}: user has not registered or opted in to OneSignal yet. Prevents invalid_aliases error.`);
            return {
              success: false,
              skipped: true,
              error: 'Recipient has not registered an active OneSignal subscription yet.'
            };
          }
        }
      }
    } catch (e) {
      console.warn('[NotificationService] Recipient subscription check warning:', e);
    }
  }

  const cleanBody = (body || '').toString().trim();
  const cleanTitle = (title || 'إشعار من أكاديمية سبيل').toString().trim();

  const payload = {
    title: cleanTitle,
    body: cleanBody,
    recipientId: targetId,
    external_id: targetId,
    userExternalId: targetId,
    type: type || 'general',
    url: url || '/teacher/today-sessions.html',
    data: {
      url: url || '/teacher/today-sessions.html',
      type: type || 'general',
      notifId: data.notifId || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
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

    // Handle OneSignal API invalid_aliases even when HTTP status is 200 OK
    if (resJson && resJson.errors) {
      console.warn('[NotificationService Warning] OneSignal returned errors despite HTTP response:', resJson.errors);
      return { 
        success: false, 
        status: response.status, 
        data: resJson, 
        errors: resJson.errors,
        error: typeof resJson.errors === 'string' ? resJson.errors : JSON.stringify(resJson.errors)
      };
    }

    if (!response.ok) {
      console.warn('[NotificationService Warning] Worker returned error status:', response.status, resJson);
      return { success: false, status: response.status, data: resJson };
    }

    console.log('[NotificationService Success] Notification dispatched successfully:', {
      target: targetId,
      type,
      title: cleanTitle
    });

    return { success: true, status: response.status, data: resJson };
  } catch (err) {
    console.warn('[NotificationService Error] Network or worker error while dispatching notification:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send notification to a specific user (by Firebase UID or external_id)
 * 
 * @param {string|string[]} userId - Single Firebase UID or array of user IDs
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} [options] - Additional options (url, type, data)
 */
export async function sendNotificationToUser(userId, title, body, options = {}) {
  if (!userId) {
    console.warn('[NotificationService] sendNotificationToUser called without userId');
    return { success: false, error: 'User ID is required' };
  }

  return sendCustomNotification({
    title,
    body,
    recipientId: userId,
    external_id: userId,
    url: options.url || '/teacher/today-sessions.html',
    type: options.type || 'user_alert',
    data: options.data || {}
  });
}

/**
 * Send notification to all teachers or a subset of teachers
 * 
 * @param {string} title - Notification title
 * @param {string} body - Notification message
 * @param {Object} [options] - Optional configurations (url, type, data, specificTeacherIds)
 */
export async function sendNotificationToTeachers(title, body, options = {}) {
  const recipient = options.specificTeacherIds && options.specificTeacherIds.length > 0
    ? options.specificTeacherIds
    : 'teachers';

  return sendCustomNotification({
    title,
    body,
    recipientId: recipient,
    external_id: recipient,
    url: options.url || '/teacher/today-sessions.html',
    type: options.type || 'teacher_broadcast',
    data: {
      channel: 'teachers',
      ...(options.data || {})
    }
  });
}

/**
 * Send notification to administration
 * 
 * @param {string} title - Notification title
 * @param {string} body - Notification message
 * @param {Object} [options] - Optional configurations (url, type, data)
 */
export async function sendNotificationToAdmins(title, body, options = {}) {
  return sendCustomNotification({
    title,
    body,
    recipientId: 'admin',
    external_id: 'admin',
    url: options.url || '/admin/sessions.html',
    type: options.type || 'admin_alert',
    data: {
      channel: 'admin',
      ...(options.data || {})
    }
  });
}

/**
 * Broadcast notification to all academy members (teachers + staff)
 * 
 * @param {string} title - Notification title
 * @param {string} body - Notification message
 * @param {Object} [options] - Optional configurations (url, type, data)
 */
export async function sendNotificationToAll(title, body, options = {}) {
  return sendCustomNotification({
    title,
    body,
    recipientId: 'all',
    external_id: 'all',
    url: options.url || '/teacher/today-sessions.html',
    type: options.type || 'academy_broadcast',
    data: {
      channel: 'all',
      ...(options.data || {})
    }
  });
}

/**
 * Specific Community Notification Trigger:
 * Triggered whenever an admin posts an announcement or update in the community forum.
 * Dispatches an instant push to all teachers with a preview snippet and deep link.
 * 
 * @param {Object} params
 * @param {string} params.postId - ID of the created community post
 * @param {string} [params.title] - Title of post if available
 * @param {string} params.content - Post body text
 * @param {string} [params.authorName='الإدارة العامة'] - Author display name
 * @param {string} [params.category='announcement'] - Post category
 */
export async function notifyCommunityAnnouncement({
  postId,
  title = '',
  content = '',
  authorName = 'الإدارة العامة',
  category = 'announcement'
}) {
  if (!postId) {
    console.warn('[NotificationService] notifyCommunityAnnouncement missing postId');
    return { success: false, error: 'postId is required' };
  }

  // Format clean Arabic title
  const notifTitle = title && title.trim()
    ? `📢 إعلان إداري: ${title.trim()}`
    : `📢 إعلان وتوجيه جديد من إدارة أكاديمية سبيل`;

  // Create clean content snippet without excess length or newlines
  const plainText = (content || '').replace(/\r?\n|\r/g, ' ').trim();
  const snippet = plainText.length > 130 
    ? plainText.substring(0, 127) + '...'
    : plainText;

  const notifBody = snippet || 'توجيه إداري جديد، اضغط هنا للاطلاع عليه والمشاركة.';
  const deepLink = `/teacher/community.html?postId=${postId}`;

  console.log('[NotificationService] Dispatching community post notification to all teachers:', {
    postId,
    notifTitle,
    notifBody,
    deepLink
  });

  return sendNotificationToTeachers(notifTitle, notifBody, {
    url: deepLink,
    type: 'community_announcement',
    data: {
      postId,
      category,
      authorName,
      source: 'community_feed'
    }
  });
}

/**
 * Specific Follower Notification Trigger:
 * Triggered whenever a teacher creates a new community post.
 * Fetches all followers of the teacher, filters out those who disabled followersPosts notifications,
 * and sends an instant push with deep link to the post.
 * 
 * Title: "منشور جديد من أحد المعلمين"
 * Content: "{اسم المعلم} نشر منشورًا جديدًا"
 * 
 * @param {Object} params
 * @param {string} params.authorId - Teacher UID
 * @param {string} params.authorName - Teacher display name
 * @param {string} params.postId - Post UID
 */
export async function notifyTeacherFollowers({
  authorId,
  authorName = 'أحد المعلمين',
  postId
}) {
  if (!authorId || !postId) {
    console.warn('[NotificationService] notifyTeacherFollowers missing authorId or postId');
    return { success: false, count: 0 };
  }

  try {
    const { getTeacherFollowerIds } = await import('../../features/community/communityFollowService.js');
    const { getUserNotificationSettings } = await import('../../features/community/notificationSettingsService.js');

    const followerIds = await getTeacherFollowerIds(authorId);
    if (!followerIds || followerIds.length === 0) {
      console.log(`[NotificationService] Teacher ${authorId} has no followers to notify.`);
      return { success: true, count: 0 };
    }

    // Filter followers by their notificationSettings (followersPosts !== false)
    const eligibleFollowers = [];
    for (const fId of followerIds) {
      const settings = await getUserNotificationSettings(fId);
      if (settings.followersPosts !== false) {
        eligibleFollowers.push(fId);
      }
    }

    if (eligibleFollowers.length === 0) {
      console.log(`[NotificationService] All followers of ${authorId} disabled followersPosts notifications.`);
      return { success: true, count: 0 };
    }

    const title = 'منشور جديد من أحد المعلمين';
    const body = `${authorName} نشر منشورًا جديدًا`;
    const deepLink = `/teacher/community.html?postId=${postId}`;

    console.log(`[NotificationService] Sending follower notifications to ${eligibleFollowers.length} followers:`, eligibleFollowers);

    const dispatchPromises = eligibleFollowers.map(fId => {
      return sendNotificationToUser(fId, title, body, {
        url: deepLink,
        type: 'teacher_follower_post',
        data: {
          postId,
          authorId,
          authorName
        }
      });
    });

    await Promise.allSettled(dispatchPromises);
    return { success: true, count: eligibleFollowers.length };
  } catch (err) {
    console.error('[NotificationService] Error in notifyTeacherFollowers:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Maintenance Mode Notification Trigger:
 * Triggered by administrator when maintenance mode is activated.
 * Broadcasts maintenance alert to all users.
 * 
 * Title: "تنبيه من أكاديمية سبيل"
 * Content: Maintenance message written by admin
 * 
 * @param {Object} params
 * @param {string} params.message - Custom maintenance message from admin
 * @param {boolean} [params.enabled=true] - Maintenance active flag
 */
export async function notifyMaintenanceMode({ message, enabled = true }) {
  if (!enabled) {
    return { success: true, message: 'Maintenance disabled, no push sent' };
  }

  const title = 'تنبيه من أكاديمية سبيل';
  const body = (message || 'يقوم الفريق التقني للأكاديمية حالياً ببعض أعمال الصيانة والتحسينات المجدولة.').trim();
  const url = '/teacher/maintenance.html';

  console.log('[NotificationService] Dispatching maintenance alert to all users:', { title, body });

  return sendNotificationToAll(title, body, {
    url,
    type: 'maintenance_alert',
    data: {
      alertType: 'maintenance',
      enabled: true,
      timestamp: new Date().toISOString()
    }
  });
}

// Backward-compatible alias for existing modules that use sendPushNotification
export const sendPushNotification = sendCustomNotification;

// Attach globally to window for accessibility in inline scripts or console debugging
if (typeof window !== 'undefined') {
  window.NotificationService = {
    sendCustomNotification,
    sendNotificationToUser,
    sendNotificationToTeachers,
    sendNotificationToAdmins,
    sendNotificationToAll,
    notifyCommunityAnnouncement,
    notifyTeacherFollowers,
    notifyMaintenanceMode,
    sendPushNotification,
    WORKER_PUSH_URL
  };
  window.notificationService = window.NotificationService;
  window.sendPushNotification = sendPushNotification;
}
