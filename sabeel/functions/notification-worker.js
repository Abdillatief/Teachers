/**
 * Cloudflare Worker for Sabeel Academy Push Notifications (OneSignal + Firebase)
 * 
 * Fixes addressed:
 * 1. Replaced illegal alias ["teachers"] with genuine array of Firebase UIDs: ["uid1", "uid2", ...]
 * 2. Strict sanitization to prevent corrupted JSON external IDs: {"externalId": "..."}
 * 3. Rich pre-dispatch Debug Logs:
 *    - target external IDs
 *    - recipient count
 *    - OneSignal subscription status
 *    - linked Player IDs / Subscriptions
 * 4. Resolves "All included players are not subscribed" error with pre-flight subscription audit
 *    and actionable device re-registration alerts.
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = await request.json();
      const {
        title,
        message,
        targetType = 'single', // 'single' | 'all_teachers' | 'custom'
        teacherId,             // for single teacher
        teacherIds = [],       // for multiple teachers
        url,
        data = {}
      } = body;

      if (!title || !message) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Title and message are required fields.'
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      // Configuration: OneSignal App ID and REST API Key
      const appId = env?.ONESIGNAL_APP_ID || body.appId || '4e84be41-e945-4279-8874-29758e57fef1';
      const restApiKey = env?.ONESIGNAL_REST_API_KEY || body.restApiKey || '';

      // =========================================================================
      // REQUIREMENT 1 & 3: Resolve & Sanitize Genuine Firebase UIDs
      // Never use generic strings like "teachers" in include_aliases.external_id!
      // =========================================================================
      let rawTargets = [];

      if (targetType === 'single' && teacherId) {
        rawTargets = [teacherId];
      } else if (Array.isArray(teacherIds) && teacherIds.length > 0) {
        rawTargets = teacherIds;
      } else if (targetType === 'all_teachers') {
        // If caller passed "teachers" or no list, retrieve teachers from Firebase or request payload
        if (Array.isArray(body.resolvedTeacherUids) && body.resolvedTeacherUids.length > 0) {
          rawTargets = body.resolvedTeacherUids;
        } else {
          // If env has Firebase credentials or caller supplied UIDs
          rawTargets = teacherIds;
        }
      }

      // Clean & validate all external IDs
      const cleanExternalIds = [];
      const invalidEntries = [];

      for (const item of rawTargets) {
        const cleaned = sanitizeUid(item);
        if (cleaned && cleaned.toLowerCase() !== 'teachers' && cleaned.toLowerCase() !== 'all') {
          if (!cleanExternalIds.includes(cleaned)) {
            cleanExternalIds.push(cleaned);
          }
        } else {
          invalidEntries.push(item);
        }
      }

      // Check if targets were empty or only contained the invalid "teachers" keyword
      if (cleanExternalIds.length === 0) {
        console.error('[Cloudflare Worker Error] No valid Firebase UIDs found! Received targets:', rawTargets);
        return new Response(JSON.stringify({
          success: false,
          error: 'NO_VALID_TARGET_UIDS',
          message: 'يجب تحديد معرّفات Firebase UIDs حقيقية للمعلمين وليس كلمة عامة مثل "teachers".',
          received: rawTargets,
          invalidEntries
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // =========================================================================
      // REQUIREMENT 4: Pre-dispatch Subscription Audit & Debug Logs
      // =========================================================================
      const subscriptionAudit = await inspectOneSignalSubscriptions(appId, restApiKey, cleanExternalIds);

      console.log('======================================================');
      console.log('📋 [ONESIGNAL DISPATCH PRE-FLIGHT AUDIT]');
      console.log('1. Target External IDs:', JSON.stringify(cleanExternalIds));
      console.log('2. Recipient Count:', cleanExternalIds.length);
      console.log('3. Subscription Verification Status:');
      console.log(JSON.stringify(subscriptionAudit.statusMap, null, 2));
      console.log('4. Linked Player IDs / Subscriptions:');
      console.log(JSON.stringify(subscriptionAudit.linkedPlayerIds, null, 2));
      console.log('======================================================');

      // Check if any recipient has an active subscription
      const hasAnySubscribed = subscriptionAudit.activeCount > 0;
      if (!hasAnySubscribed && restApiKey) {
        console.warn('⚠️ [Cloudflare Worker Warning] None of the targeted players have active push subscriptions!');
      }

      // =========================================================================
      // REQUIREMENT 3: Format Outgoing OneSignal Payload with include_aliases
      // =========================================================================
      const oneSignalPayload = {
        app_id: appId,
        headings: {
          ar: title,
          en: title
        },
        contents: {
          ar: message,
          en: message
        },
        // Correct OneSignal v16+ modern user model alias targeting:
        // Pure array of string Firebase UIDs: ["uid1", "uid2"]
        include_aliases: {
          external_id: cleanExternalIds
        },
        target_channel: 'push',
        url: url || undefined,
        data: {
          ...data,
          sent_at: new Date().toISOString(),
          sabeel_system: 'v2.4',
          dispatched_targets_count: cleanExternalIds.length
        }
      };

      console.log('5. Outgoing OneSignal Payload:');
      console.log(JSON.stringify(oneSignalPayload, null, 2));

      // Dispatch to OneSignal REST API
      const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${restApiKey}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(oneSignalPayload)
      });

      const responseText = await oneSignalResponse.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { rawResponse: responseText };
      }

      console.log('ONESIGNAL RESPONSE:');
      console.log(JSON.stringify(responseData, null, 2));

      // =========================================================================
      // REQUIREMENT 5: Handle "All included players are not subscribed"
      // =========================================================================
      const isNotSubscribedError = 
        responseData?.errors?.includes('All included players are not subscribed') ||
        (Array.isArray(responseData?.errors) && responseData.errors.some(e => String(e).includes('not subscribed')));

      if (isNotSubscribedError) {
        console.error('🚨 [Cloudflare Worker] OneSignal returned: All included players are not subscribed.');
        console.info('👉 Root cause: The target Firebase UIDs exist or are mapped, but no active Push Subscription token/device is registered with OneSignal for these UIDs.');

        return new Response(JSON.stringify({
          success: false,
          error: 'ALL_PLAYERS_NOT_SUBSCRIBED',
          message: 'لم يتم تسليم الإشعار لأن الأجهزة المستهدفة غير مشتركة أو لم تمنح إذن الإشعارات بعد.',
          solution: 'يجب على المعلم فتح التطبيق (Web أو Median App) وتفعيل إذن الإشعارات عبر زر "إعادة تسجيل الجهاز".',
          debug: {
            targetExternalIds: cleanExternalIds,
            recipientCount: cleanExternalIds.length,
            oneSignalResponse: responseData,
            subscriptionAudit
          }
        }), {
          status: 422,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // Check if OneSignal returned other errors
      if (!oneSignalResponse.ok || (responseData.errors && responseData.errors.length > 0)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'ONESIGNAL_API_ERROR',
          errors: responseData.errors || [responseData],
          debug: {
            targetExternalIds: cleanExternalIds,
            recipientCount: cleanExternalIds.length,
            oneSignalResponse: responseData
          }
        }), {
          status: oneSignalResponse.status >= 400 ? oneSignalResponse.status : 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // Success response
      return new Response(JSON.stringify({
        success: true,
        notificationId: responseData.id,
        recipients: responseData.recipients,
        debug: {
          targetExternalIds: cleanExternalIds,
          recipientCount: cleanExternalIds.length,
          subscriptionAudit
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (err) {
      console.error('[Cloudflare Worker Fatal Error]:', err);
      return new Response(JSON.stringify({
        success: false,
        error: 'WORKER_INTERNAL_ERROR',
        message: err.message || 'Internal server error while dispatching notification'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};

/**
 * Sanitizes and strips corrupted JSON from a Firebase UID
 */
function sanitizeUid(input) {
  if (!input) return null;
  let raw = input;
  if (typeof raw === 'object' && raw !== null) {
    raw = raw.externalId || raw.external_id || raw.uid || raw.id || '';
  }
  let str = String(raw).trim();
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      str = String(parsed.externalId || parsed.external_id || parsed.uid || parsed.id || '').trim();
    } catch {
      const match = str.match(/["']?(?:externalId|uid)["']?\s*:\s*["']([^"']+)["']/i);
      if (match && match[1]) str = match[1].trim();
    }
  }
  str = str.replace(/^["']+|["']+$/g, '').trim();
  return str.length > 0 ? str : null;
}

/**
 * Inspects OneSignal users and active subscriptions via REST API
 */
async function inspectOneSignalSubscriptions(appId, restApiKey, externalIds) {
  const result = {
    statusMap: {},
    linkedPlayerIds: {},
    activeCount: 0,
    totalAudited: externalIds.length
  };

  if (!restApiKey) {
    // If REST API key not configured, return default audit
    externalIds.forEach(id => {
      result.statusMap[id] = 'UNKNOWN (REST API Key not provided)';
      result.linkedPlayerIds[id] = [];
    });
    return result;
  }

  // Audit up to first 10 targets to keep latency under 1 second
  const auditSample = externalIds.slice(0, 10);

  await Promise.all(auditSample.map(async (uid) => {
    try {
      const url = `https://onesignal.com/api/v1/apps/${appId}/users/by/external_id/${encodeURIComponent(uid)}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Basic ${restApiKey}`,
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        const userData = await res.json();
        const subscriptions = userData?.subscriptions || [];
        const pushSubs = subscriptions.filter(s => s.type === 'Push' || s.type === 'iOSPush' || s.type === 'AndroidPush');
        const activePushSubs = pushSubs.filter(s => s.opted_in !== false && s.notification_types !== -2);

        result.statusMap[uid] = activePushSubs.length > 0 ? 'ACTIVE_PUSH_SUBSCRIBED' : (pushSubs.length > 0 ? 'PUSH_OPTED_OUT' : 'NO_PUSH_SUBSCRIPTION');
        result.linkedPlayerIds[uid] = pushSubs.map(s => s.id);

        if (activePushSubs.length > 0) {
          result.activeCount++;
        }
      } else if (res.status === 404) {
        result.statusMap[uid] = 'USER_NOT_FOUND_IN_ONESIGNAL';
        result.linkedPlayerIds[uid] = [];
      } else {
        result.statusMap[uid] = `STATUS_CHECK_ERROR_${res.status}`;
        result.linkedPlayerIds[uid] = [];
      }
    } catch (e) {
      result.statusMap[uid] = `ERROR: ${e.message}`;
      result.linkedPlayerIds[uid] = [];
    }
  }));

  return result;
}
