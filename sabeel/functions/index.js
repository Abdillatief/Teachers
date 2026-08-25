const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Cloud Function triggered on Firestore document creation in 'notifications/{notificationId}'
 * Dispatches Native Push Notifications (OneSignal) for Median App users and Web Push (FCM) for browser users.
 */
exports.sendPushNotificationOnCreate = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notificationId = context.params.notificationId;
    const data = snap.data();

    if (!data) return null;
    return processPushNotification(notificationId, data);
  });

/**
 * Cloud Function triggered on Firestore document update in 'notifications/{notificationId}'
 * Allows retrying push notifications when status is reset to 'pending'.
 */
exports.sendPushNotificationOnUpdate = functions.firestore
  .document('notifications/{notificationId}')
  .onUpdate(async (change, context) => {
    const notificationId = context.params.notificationId;
    const newData = change.after.data();
    const oldData = change.before.data();

    // Trigger push dispatch if status was updated back to 'pending' (retry action)
    if (newData && newData.status === 'pending' && oldData.status !== 'pending') {
      return processPushNotification(notificationId, newData);
    }
    return null;
  });

/**
 * Fetches OneSignal API configuration from Firestore settings/academy or process.env
 */
async function getOneSignalConfig(db) {
  let appId = process.env.ONESIGNAL_APP_ID || '61a2cc38-b4a8-4032-96ae-caa738df2ffd';
  let restApiKey = process.env.ONESIGNAL_REST_API_KEY || '';

  try {
    const snap = await db.collection('settings').doc('academy').get();
    if (snap.exists) {
      const data = snap.data();
      if (data.onesignalAppId) appId = data.onesignalAppId.trim();
      if (!restApiKey && data.onesignalRestApiKey) restApiKey = data.onesignalRestApiKey.trim();
    }
  } catch (e) {
    console.warn('[OneSignal Config Warning] Error reading settings/academy:', e);
  }

  return { appId, restApiKey };
}

/**
 * Sends Native Push Notification via OneSignal REST API v1
 */
async function dispatchToOneSignal(config, payload) {
  const { appId, restApiKey } = config;
  const {
    targetExternalIds = [],
    targetPlayerIds = [],
    title,
    body,
    url,
    icon,
    notificationId,
    type
  } = payload;

  if (!appId) {
    return {
      success: false,
      deliveredCount: 0,
      error: 'OneSignal App ID is not configured (process.env.ONESIGNAL_APP_ID or settings/academy).'
    };
  }

  const requestBody = {
    app_id: appId,
    target_channel: "push",
    headings: {
      en: title,
      ar: title
    },
    contents: {
      en: body || title,
      ar: body || title
    },
    data: {
      url: url || '/teacher/today-sessions.html',
      notifId: notificationId,
      type: type || 'broadcast'
    },
    url: url || '/teacher/today-sessions.html',
    web_url: url || '/teacher/today-sessions.html',
    app_url: url || '/teacher/today-sessions.html',

    // Android Native Channel and Sound
    android_channel_id: 'sabeel_academy_channel_high',
    android_sound: 'default',
    small_icon: 'ic_stat_notification',
    large_icon: icon || 'https://sabeel.academy/assets/icons/icon-192.png',

    // iOS APNs Native Configuration
    ios_sound: 'default',
    ios_badgeType: 'Increase',
    ios_badgeCount: 1,
    priority: 10
  };

  // Targeting: Prioritize Firebase UIDs as external_user_ids
  if (targetExternalIds.length > 0) {
    requestBody.include_aliases = {
      external_id: targetExternalIds
    };
    requestBody.include_external_user_ids = targetExternalIds;
  }

  if (targetPlayerIds.length > 0) {
    requestBody.include_player_ids = targetPlayerIds;
  }

  const headers = {
    'Content-Type': 'application/json; charset=utf-8'
  };
  if (restApiKey) {
    headers['Authorization'] = `Basic ${restApiKey}`;
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    const resJson = await response.json();
    if (response.ok && !resJson.errors) {
      const recipients = typeof resJson.recipients === 'number' ? resJson.recipients : targetExternalIds.length;
      return {
        success: true,
        deliveredCount: recipients,
        id: resJson.id,
        raw: resJson
      };
    } else {
      return {
        success: false,
        deliveredCount: 0,
        errors: resJson.errors || [resJson.message || 'OneSignal API Error'],
        raw: resJson
      };
    }
  } catch (err) {
    console.error('[OneSignal HTTP Error]:', err);
    return {
      success: false,
      deliveredCount: 0,
      error: err.message || 'Network error connecting to OneSignal REST API'
    };
  }
}

/**
 * Core processing logic for fetching target user tokens, dispatching OneSignal + FCM messages,
 * updating status, and cleaning up invalid tokens.
 */
async function processPushNotification(notificationId, data) {
  const db = admin.firestore();
  const notifRef = db.collection('notifications').doc(notificationId);
  const nowIso = new Date().toISOString();

  const {
    title,
    body = '',
    recipientId = 'all',
    recipientRole = '',
    type = 'broadcast',
    url = '/teacher/today-sessions.html',
    icon = '/assets/icons/icon-192.png'
  } = data;

  // 1. Fetch Target Users strictly based on role and recipient ID
  const targetUsers = [];

  try {
    if (recipientId === 'all') {
      const teachersSnap = await db.collection('users').where('role', '==', 'teacher').get();
      teachersSnap.forEach(docSnap => {
        targetUsers.push({ id: docSnap.id, ...docSnap.data() });
      });
    } else if (recipientId === 'teachers' || recipientRole === 'teacher') {
      const teachersSnap = await db.collection('users').where('role', '==', 'teacher').get();
      teachersSnap.forEach(docSnap => {
        targetUsers.push({ id: docSnap.id, ...docSnap.data() });
      });
    } else if (recipientId === 'admin' || recipientId === 'sub_admin' || recipientRole === 'admin') {
      const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
      adminsSnap.forEach(docSnap => {
        targetUsers.push({ id: docSnap.id, ...docSnap.data() });
      });
    } else {
      // Specific user target (e.g. single teacher UID)
      const userSnap = await db.collection('users').doc(recipientId).get();
      if (userSnap.exists) {
        targetUsers.push({ id: userSnap.id, ...userSnap.data() });
      }
    }
  } catch (err) {
    console.error(`[Push Notification Error] Failed to fetch recipient users for notification ${notificationId}:`, err);
  }

  // 2. Separate recipients into OneSignal (Median Native App) and FCM (Web/PWA)
  const oneSignalExternalIds = [];
  const oneSignalPlayerIds = [];
  const webFcmTokens = [];
  const tokenToUserIdMap = new Map();

  targetUsers.forEach(u => {
    const isOneSignalUser = Boolean(
      u.oneSignalExternalId || 
      u.oneSignalId || 
      u.isMedianUser === true || 
      u.pushProvider === 'onesignal'
    );

    if (isOneSignalUser) {
      if (!oneSignalExternalIds.includes(u.id)) {
        oneSignalExternalIds.push(u.id);
      }
      if (u.oneSignalId && typeof u.oneSignalId === 'string' && !oneSignalPlayerIds.includes(u.oneSignalId)) {
        oneSignalPlayerIds.push(u.oneSignalId);
      }
    }

    // Also collect Web FCM tokens if present
    if (Array.isArray(u.fcmTokens)) {
      u.fcmTokens.forEach(t => {
        if (t && typeof t === 'string' && !webFcmTokens.includes(t)) {
          webFcmTokens.push(t);
          tokenToUserIdMap.set(t, u.id);
        }
      });
    }
  });

  const totalTargetsCount = targetUsers.length;
  const deliveryLogs = [];
  let totalSuccessCount = 0;
  let totalFailCount = 0;

  // If no targets or tokens are found at all
  if (totalTargetsCount === 0 || (oneSignalExternalIds.length === 0 && webFcmTokens.length === 0)) {
    console.warn(`[Push Notification] No registered target devices found for recipient: ${recipientId}`);
    await notifRef.update({
      status: 'no_tokens',
      targetTokensCount: 0,
      successTokensCount: 0,
      failTokensCount: 0,
      deliveryLogs: [
        {
          status: 'warning',
          channel: 'none',
          message: 'لم يتم العثور على أجهزة مسجلة أو مفعلة للمستخدم المستهدف.',
          time: nowIso
        }
      ],
      'statuses.failed.status': true,
      'statuses.failed.time': nowIso,
      'statuses.failed.reason': 'لا توجد أجهزة مسجلة للمستخدم لإرسال التنبيه.'
    });
    return null;
  }

  // 3. Dispatch OneSignal Native Push (for Median Mobile App Users)
  if (oneSignalExternalIds.length > 0 || oneSignalPlayerIds.length > 0) {
    const osConfig = await getOneSignalConfig(db);
    console.log(`[OneSignal Native Push] Dispatching to ${oneSignalExternalIds.length} user(s)...`);

    const osResult = await dispatchToOneSignal(osConfig, {
      targetExternalIds: oneSignalExternalIds,
      targetPlayerIds: oneSignalPlayerIds,
      title,
      body,
      url,
      icon,
      notificationId,
      type
    });

    if (osResult.success) {
      totalSuccessCount += (osResult.deliveredCount || oneSignalExternalIds.length);
      deliveryLogs.push({
        channel: 'onesignal-native',
        status: 'success',
        recipientsCount: osResult.deliveredCount,
        oneSignalId: osResult.id,
        targetUserIds: oneSignalExternalIds,
        time: new Date().toISOString()
      });
    } else {
      totalFailCount += oneSignalExternalIds.length;
      deliveryLogs.push({
        channel: 'onesignal-native',
        status: 'failed',
        error: osResult.error || osResult.errors,
        targetUserIds: oneSignalExternalIds,
        time: new Date().toISOString()
      });
    }
  }

  // 4. Dispatch Firebase Web Push (FCM) (for Standard Browser & PWA Users)
  if (webFcmTokens.length > 0) {
    console.log(`[Firebase Web Push] Dispatching to ${webFcmTokens.length} FCM token(s)...`);

    const messagePayload = {
      tokens: webFcmTokens,
      notification: {
        title: title,
        body: body
      },
      android: {
        priority: 'high',
        notification: {
          title: title,
          body: body,
          icon: 'ic_stat_notification',
          color: '#0d9488',
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
          channelId: 'sabeel_academy_channel_high',
          clickAction: 'OPEN_ACTIVITY',
          tag: notificationId
        }
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert'
        },
        payload: {
          aps: {
            alert: {
              title: title,
              body: body
            },
            sound: 'default',
            badge: 1,
            'content-available': 1
          }
        }
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          title: title,
          body: body,
          icon: icon,
          badge: icon,
          requireInteraction: true,
          data: {
            url: url,
            notifId: notificationId,
            type: type
          }
        },
        fcmOptions: {
          link: url
        }
      },
      data: {
        title: title,
        body: body,
        icon: icon,
        url: url,
        notifId: notificationId,
        type: type
      }
    };

    const tokensToRemoveByUser = new Map();

    try {
      const fcmResponse = await admin.messaging().sendEachForMulticast(messagePayload);

      fcmResponse.responses.forEach((resp, idx) => {
        const token = webFcmTokens[idx];
        const userId = tokenToUserIdMap.get(token);

        if (resp.success) {
          totalSuccessCount++;
          deliveryLogs.push({
            channel: 'fcm-web',
            token: token.substring(0, 15) + '...',
            status: 'success',
            messageId: resp.messageId,
            time: new Date().toISOString()
          });
        } else {
          totalFailCount++;
          const errorCode = resp.error ? resp.error.code : 'unknown';
          const errorMsg = resp.error ? resp.error.message : 'Unknown error';

          deliveryLogs.push({
            channel: 'fcm-web',
            token: token.substring(0, 15) + '...',
            status: 'failed',
            errorCode,
            errorMsg,
            time: new Date().toISOString()
          });

          // Detect invalid/unregistered tokens and queue for cleanup
          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/invalid-argument'
          ) {
            if (userId) {
              if (!tokensToRemoveByUser.has(userId)) {
                tokensToRemoveByUser.set(userId, new Set());
              }
              tokensToRemoveByUser.get(userId).add(token);
            }
          }
        }
      });
    } catch (fcmErr) {
      console.error(`[FCM Admin Dispatch Error] Failed to send multicast message:`, fcmErr);
      deliveryLogs.push({
        channel: 'fcm-web',
        status: 'error',
        message: fcmErr.message || 'Firebase Admin Messaging Dispatch Failed',
        time: nowIso
      });
    }

    // Clean up invalid FCM tokens automatically from user documents
    for (const [userId, tokensSet] of tokensToRemoveByUser.entries()) {
      try {
        const tokensArr = Array.from(tokensSet);
        await db.collection('users').doc(userId).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensArr)
        });
        console.log(`[FCM Cleanup] Removed ${tokensArr.length} invalid token(s) for user ${userId}`);
      } catch (cleanupErr) {
        console.warn(`[FCM Cleanup Warning] Failed removing invalid tokens for user ${userId}:`, cleanupErr);
      }
    }
  }

  // 5. Update Firestore Notification doc with authentic delivery status
  const finalStatus = totalSuccessCount > 0 ? 'delivered' : 'failed';
  const updatePayload = {
    status: finalStatus,
    targetTokensCount: totalTargetsCount,
    successTokensCount: totalSuccessCount,
    failTokensCount: totalFailCount,
    deliveryLogs: deliveryLogs,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (totalSuccessCount > 0) {
    updatePayload['statuses.delivered.status'] = true;
    updatePayload['statuses.delivered.time'] = nowIso;
  } else {
    updatePayload['statuses.failed.status'] = true;
    updatePayload['statuses.failed.time'] = nowIso;
    updatePayload['statuses.failed.reason'] = `فشل الإرسال عبر قنوات الإشعارات (${totalFailCount} جهاز مستهدف).`;
  }

  await notifRef.update(updatePayload);
  console.log(`[Push Dispatch Complete] Notif ID: ${notificationId} | Delivered: ${totalSuccessCount} | Failed: ${totalFailCount}`);

  return { successCount: totalSuccessCount, failCount: totalFailCount };
}
