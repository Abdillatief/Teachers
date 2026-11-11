const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// OneSignal App ID for Sabeel Academy
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '61a2cc38-b4a8-4032-96ae-caa738df2ffd';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || '';

/**
 * Dispatches push notification via OneSignal REST API
 */
async function sendToOneSignal({ title, body, image, deepLink, targetType, targetIds, data, priority }) {
  const payload = {
    app_id: ONESIGNAL_APP_ID,
    headings: { ar: title, en: title },
    contents: { ar: body, en: body },
    data: {
      deepLink: deepLink || '/teacher/today-sessions.html',
      url: deepLink || '/teacher/today-sessions.html',
      priority: priority || 'normal',
      ...(data || {})
    }
  };

  if (deepLink) {
    payload.url = deepLink;
    payload.web_url = deepLink;
    payload.app_url = deepLink;
  }

  if (image) {
    payload.big_picture = image;
    payload.chrome_web_image = image;
  }

  if (priority === 'urgent' || priority === 'high') {
    payload.priority = 10;
  }

  // Target assignment: resolve real Firebase UIDs instead of generic tags
  let resolvedTargetIds = [];
  if (Array.isArray(targetIds) && targetIds.length > 0) {
    resolvedTargetIds = targetIds.filter(Boolean);
  } else if (typeof targetIds === 'string' && targetIds) {
    resolvedTargetIds = [targetIds];
  } else if (targetType === 'teachers') {
    try {
      const snap = await db.collection('users').where('role', '==', 'teacher').get();
      resolvedTargetIds = snap.docs.map(d => d.id).filter(Boolean);
    } catch (e) {
      console.warn('Error querying teachers:', e);
    }
  } else if (targetType === 'admins') {
    try {
      const snap = await db.collection('users').where('role', 'in', ['admin', 'sub_admin']).get();
      resolvedTargetIds = snap.docs.map(d => d.id).filter(Boolean);
    } catch (e) {
      console.warn('Error querying admins:', e);
    }
  } else if (targetType === 'all') {
    try {
      const snap = await db.collection('users').get();
      resolvedTargetIds = snap.docs.map(d => d.id).filter(Boolean);
    } catch (e) {
      console.warn('Error querying all users:', e);
    }
  }

  // Strictly filter out any generic role keywords
  resolvedTargetIds = [...new Set(resolvedTargetIds.filter(id => id && !['teachers', 'admin', 'admins', 'all'].includes(id)))];

  // 4. Debug Logs before dispatching to OneSignal REST API (Requirement 4)
  console.log("=== [OneSignal Dispatch Debug - Cloud Functions] ===");
  console.log("Target external IDs (معرفات الأهداف):", resolvedTargetIds);
  console.log("Recipients count (عدد المستلمين):", resolvedTargetIds.length);
  console.log("Target Type:", targetType);

  if (resolvedTargetIds.length > 0) {
    // Specific external user IDs (Firebase UIDs)
    payload.include_aliases = {
      external_id: resolvedTargetIds
    };
    payload.target_channel = 'push';
  } else {
    payload.included_segments = ['Total Subscriptions'];
  }

  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (ONESIGNAL_REST_API_KEY) {
      headers['Authorization'] = `Basic ${ONESIGNAL_REST_API_KEY}`;
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const resJson = await response.json().catch(() => ({}));
    return {
      success: response.ok && !resJson.errors,
      status: response.status,
      data: resJson,
      errors: resJson.errors || null
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * 1. Automatic Firestore Trigger when a new notification document is created
 */
exports.onNotificationCreated = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notifData = snap.data();
    const notifId = context.params.notificationId;

    if (!notifData || notifData.status === 'sent' || notifData.status === 'cancelled' || notifData.pushDispatchedByClient || notifData.pushSent) {
      return null;
    }

    // Check if scheduled for the future
    if (notifData.scheduledAt) {
      const scheduledTime = new Date(notifData.scheduledAt).getTime();
      const now = Date.now();
      if (scheduledTime > now + 60000) {
        await snap.ref.update({ status: 'scheduled' });
        return null;
      }
    }

    // Check notification settings
    try {
      const settingsDoc = await db.doc('settings/notifications').get();
      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        if (notifData.type === 'session_start' && settings.sessionStartEnabled === false) {
          await snap.ref.update({ status: 'skipped', reason: 'session start notifications disabled' });
          return null;
        }
        if (notifData.type === 'session_reminder' && settings.sessionReminderEnabled === false) {
          await snap.ref.update({ status: 'skipped', reason: 'session reminders disabled' });
          return null;
        }
        if (notifData.type === 'salary' && settings.salaryEnabled === false) {
          await snap.ref.update({ status: 'skipped', reason: 'salary notifications disabled' });
          return null;
        }
        if (notifData.type === 'community' && settings.communityEnabled === false) {
          await snap.ref.update({ status: 'skipped', reason: 'community notifications disabled' });
          return null;
        }
        if (notifData.type === 'maintenance' && settings.maintenanceEnabled === false) {
          await snap.ref.update({ status: 'skipped', reason: 'maintenance notifications disabled' });
          return null;
        }
      }
    } catch (e) {
      console.warn('Notification settings check error:', e);
    }

    // Dispatch OneSignal Push
    const result = await sendToOneSignal({
      title: notifData.title,
      body: notifData.body,
      image: notifData.image,
      deepLink: notifData.deepLink,
      targetType: notifData.targetType,
      targetIds: notifData.targetIds,
      data: notifData.data || {},
      priority: notifData.priority
    });

    const status = result.success ? 'sent' : 'failed';
    const updatePayload = {
      status,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      oneSignalResult: result.data || null
    };

    if (!result.success && result.error) {
      updatePayload.error = result.error;
    }

    await snap.ref.update(updatePayload);

    // Write to notification_logs
    try {
      const targets = Array.isArray(notifData.targetIds) ? notifData.targetIds : [notifData.targetIds || 'broadcast'];
      const batch = db.batch();

      targets.slice(0, 50).forEach(uId => {
        const logRef = db.collection('notification_logs').doc();
        batch.set(logRef, {
          notificationId: notifId,
          userId: uId || 'all',
          sent: result.success,
          delivered: result.success,
          opened: false,
          failed: !result.success,
          error: result.error || (result.errors ? JSON.stringify(result.errors) : null),
          createdAt: new Date().toISOString()
        });
      });

      await batch.commit();
    } catch (logErr) {
      console.warn('Logging error:', logErr);
    }

    return null;
  });

/**
 * 2. Callable / HTTPS API for Cloudflare Gateway or Direct Client invocations
 */
exports.dispatchNotification = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    const { title, body, image, deepLink, targetType, targetIds, data, priority, senderId } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'title and body are required' });
    }

    const notifRef = await db.collection('notifications').add({
      title,
      body,
      image: image || null,
      type: (data && data.type) || 'general',
      priority: priority || 'normal',
      targetType: targetType || 'all',
      targetIds: targetIds || [],
      senderId: senderId || 'admin',
      createdAt: new Date().toISOString(),
      status: 'pending',
      deepLink: deepLink || '/teacher/today-sessions.html',
      readBy: [],
      openedBy: [],
      deletedBy: []
    });

    const result = await sendToOneSignal({
      title,
      body,
      image,
      deepLink,
      targetType,
      targetIds,
      data,
      priority
    });

    await notifRef.update({
      status: result.success ? 'sent' : 'failed',
      sentAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: result.success,
      notificationId: notifRef.id,
      oneSignal: result.data || null,
      error: result.error || null
    });
  } catch (err) {
    console.error('dispatchNotification error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. Scheduled Worker / Cron for processing scheduled notifications
 * Can be triggered via Cloud Scheduler (pubsub) or HTTPS Cron endpoint
 */
exports.processScheduledNotifications = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).send('');

  try {
    const nowIso = new Date().toISOString();
    const snap = await db.collection('notifications')
      .where('status', '==', 'scheduled')
      .where('scheduledAt', '<=', nowIso)
      .limit(50)
      .get();

    if (snap.empty) {
      return res.status(200).json({ success: true, processed: 0, message: 'No pending scheduled notifications' });
    }

    let processedCount = 0;
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const result = await sendToOneSignal({
        title: data.title,
        body: data.body,
        image: data.image,
        deepLink: data.deepLink,
        targetType: data.targetType,
        targetIds: data.targetIds,
        data: data.data || {},
        priority: data.priority
      });

      await docSnap.ref.update({
        status: result.success ? 'sent' : 'failed',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        oneSignalResult: result.data || null,
        error: result.error || null
      });

      processedCount++;
    }

    return res.status(200).json({ success: true, processed: processedCount });
  } catch (err) {
    console.error('processScheduledNotifications error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

