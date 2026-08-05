const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (!admin.apps.length) {
  admin.initializeApp();
}

const DATABASE_ID = 'ai-studio-47da20f1-fb86-4639-bc25-ea3c65761651';

/**
 * Cloud Function triggered on Firestore document creation in 'notifications/{notificationId}'
 * Dispatches Push Notifications via Firebase Admin SDK (FCM HTTP v1) to all target device tokens.
 */
exports.sendPushNotificationOnCreate = functions.firestore
  .database(DATABASE_ID)
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
  .database(DATABASE_ID)
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
 * Core processing logic for fetching target user tokens, dispatching FCM multicast messages,
 * updating status, and cleaning up invalid tokens.
 */
async function processPushNotification(notificationId, data) {
  const db = getFirestore(DATABASE_ID);
  const notifRef = db.collection('notifications').doc(notificationId);
  const nowIso = new Date().toISOString();

  const {
    title,
    body = '',
    recipientId = 'all',
    type = 'broadcast',
    url = '/teacher/today-sessions.html',
    icon = '/assets/icons/icon-192.png'
  } = data;

  // 1. Fetch target FCM Tokens & map tokens to user IDs for token cleanup
  const tokenToUserIdMap = new Map();
  const targetTokens = [];

  try {
    if (recipientId === 'all') {
      const teachersSnap = await db.collection('users').where('role', '==', 'teacher').get();
      teachersSnap.forEach((docSnap) => {
        const u = docSnap.data();
        if (Array.isArray(u.fcmTokens)) {
          u.fcmTokens.forEach((t) => {
            if (t && typeof t === 'string') {
              tokenToUserIdMap.set(t, docSnap.id);
              if (!targetTokens.includes(t)) targetTokens.push(t);
            }
          });
        }
      });
    } else {
      const userSnap = await db.collection('users').doc(recipientId).get();
      if (userSnap.exists) {
        const u = userSnap.data();
        if (Array.isArray(u.fcmTokens)) {
          u.fcmTokens.forEach((t) => {
            if (t && typeof t === 'string') {
              tokenToUserIdMap.set(t, userSnap.id);
              if (!targetTokens.includes(t)) targetTokens.push(t);
            }
          });
        }
      }
    }
  } catch (err) {
    console.error(`[FCM Push Error] Failed to fetch recipient tokens for notification ${notificationId}:`, err);
  }

  // 2. Handle case where no tokens are found
  if (targetTokens.length === 0) {
    console.warn(`[FCM Push] No registered FCM tokens found for recipient: ${recipientId}`);
    await notifRef.update({
      status: 'no_tokens',
      targetTokensCount: 0,
      successTokensCount: 0,
      failTokensCount: 0,
      deliveryLogs: [
        {
          status: 'warning',
          message: 'لم يتم العثور على أجهزة مسجلة للمستخدم Target.',
          time: nowIso
        }
      ],
      'statuses.failed.status': true,
      'statuses.failed.time': nowIso,
      'statuses.failed.reason': 'لا توجد أجهزة مسجلة للمستخدم لإرسال التنبيه.'
    });
    return null;
  }

  // 3. Construct FCM Multicast payload (FCM HTTP v1 format via Firebase Admin SDK)
  const messagePayload = {
    tokens: targetTokens,
    notification: {
      title: title,
      body: body
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

  // 4. Send FCM Multicast Message via Admin SDK
  let successCount = 0;
  let failCount = 0;
  const deliveryLogs = [];
  const tokensToRemoveByUser = new Map(); // userId -> Set of tokens to remove

  try {
    const response = await admin.messaging().sendEachForMulticast(messagePayload);

    response.responses.forEach((resp, idx) => {
      const token = targetTokens[idx];
      const userId = tokenToUserIdMap.get(token);

      if (resp.success) {
        successCount++;
        deliveryLogs.push({
          token: token.substring(0, 15) + '...',
          status: 'success',
          messageId: resp.messageId,
          time: new Date().toISOString()
        });
      } else {
        failCount++;
        const errorCode = resp.error ? resp.error.code : 'unknown';
        const errorMsg = resp.error ? resp.error.message : 'Unknown error';

        deliveryLogs.push({
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
  } catch (sendErr) {
    console.error(`[FCM Admin Dispatch Error] Failed to send multicast message:`, sendErr);
    await notifRef.update({
      status: 'failed',
      targetTokensCount: targetTokens.length,
      successTokensCount: 0,
      failTokensCount: targetTokens.length,
      deliveryLogs: [
        {
          status: 'error',
          message: sendErr.message || 'Firebase Admin Messaging Dispatch Failed',
          time: nowIso
        }
      ],
      'statuses.failed.status': true,
      'statuses.failed.time': nowIso,
      'statuses.failed.reason': sendErr.message || 'خطأ أثناء الإرسال عبر Firebase Admin SDK'
    });
    return null;
  }

  // 5. Clean up invalid tokens automatically from user documents
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

  // 6. Update Firestore Notification doc with authentic delivery status
  const finalStatus = successCount > 0 ? 'delivered' : 'failed';
  const updatePayload = {
    status: finalStatus,
    targetTokensCount: targetTokens.length,
    successTokensCount: successCount,
    failTokensCount: failCount,
    deliveryLogs: deliveryLogs,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (successCount > 0) {
    updatePayload['statuses.delivered.status'] = true;
    updatePayload['statuses.delivered.time'] = nowIso;
  } else {
    updatePayload['statuses.failed.status'] = true;
    updatePayload['statuses.failed.time'] = nowIso;
    updatePayload['statuses.failed.reason'] = `فشل الإرسال لجميع الأجهزة المستهدفة (${failCount} جهاز).`;
  }

  await notifRef.update(updatePayload);
  console.log(`[FCM Push Complete] Notif ID: ${notificationId} | Delivered: ${successCount} | Failed: ${failCount}`);

  return { successCount, failCount };
}
