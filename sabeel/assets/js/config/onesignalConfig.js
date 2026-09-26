/**
 * OneSignal & Push Notification Configuration for Sabeel Academy
 */

export const ONESIGNAL_CONFIG = {
  // OneSignal App ID
  appId: (typeof window !== 'undefined' && window.__ONESIGNAL_APP_ID__) 
    || '4e84be41-e945-4279-8874-29758e57fef1',
  
  // Cloudflare Worker URL for sending notifications
  workerUrl: (typeof window !== 'undefined' && window.__CLOUDFLARE_WORKER_URL__) 
    || '/api/notifications/send',

  // Safari Web Push ID if configured
  safariWebId: undefined,

  // Logging & Debugging flag
  debug: true
};

/**
 * Sanitizes and validates a Firebase UID to be used as OneSignal External ID.
 * CRITICAL RULE:
 * Must return pure raw string Firebase UID (e.g. "t63ltWofLbSJylVZuecUaQCWA3W2").
 * NEVER an object like { externalId: uid } or JSON.stringify({...}).
 * Rejects group terms like "teachers" or "all".
 * 
 * @param {any} input 
 * @returns {string|null} Sanitized UID string or null if invalid
 */
export function sanitizeExternalId(input) {
  if (!input) return null;

  let raw = input;

  // If accidentally passed an object e.g. { externalId: "..." } or { uid: "..." }
  if (typeof raw === 'object' && raw !== null) {
    raw = raw.externalId || raw.external_id || raw.uid || raw.id || '';
  }

  // Convert to string and trim
  let str = String(raw).trim();

  // If stringified JSON e.g. '{"externalId":"t63ltWof..."}'
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      str = String(parsed.externalId || parsed.external_id || parsed.uid || parsed.id || '').trim();
    } catch {
      // Try regex extraction of UID
      const match = str.match(/["']?(?:externalId|uid)["']?\s*:\s*["']([^"']+)["']/i);
      if (match && match[1]) {
        str = match[1].trim();
      }
    }
  }

  // Strip wrapping quotes if any
  str = str.replace(/^["']+|["']+$/g, '').trim();

  // Blacklist generic group keywords which are NOT valid user external IDs
  const invalidKeywords = ['teachers', 'teacher', 'admins', 'admin', 'all', 'users', 'students', '[object Object]', 'undefined', 'null'];
  if (invalidKeywords.includes(str.toLowerCase())) {
    console.error(`[OneSignal Config] Invalid external_id detected: "${str}". External ID must be a specific Firebase UID!`);
    return null;
  }

  // Firebase UIDs are typically 20-36 alphanumeric characters
  if (str.length < 5) {
    console.error(`[OneSignal Config] External ID is suspiciously short or invalid: "${str}"`);
    return null;
  }

  return str;
}

export default ONESIGNAL_CONFIG;
