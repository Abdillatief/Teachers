/**
 * Push Notification Service using Cloudflare Worker Proxy
 * Connects Firestore notifications seamlessly to OneSignal Native Push
 * Proxies to centralized notificationService
 */

export { 
  WORKER_PUSH_URL,
  sendCustomNotification,
  sendPushNotification,
  sendNotificationToUser,
  sendNotificationToTeachers,
  sendNotificationToAdmins,
  sendNotificationToAll,
  notifyCommunityAnnouncement
} from '../services/notificationService.js';

import {
  WORKER_PUSH_URL,
  sendCustomNotification,
  sendPushNotification,
  sendNotificationToUser,
  sendNotificationToTeachers,
  sendNotificationToAdmins,
  sendNotificationToAll,
  notifyCommunityAnnouncement
} from '../services/notificationService.js';

// Attach globally to window for easy access across all modules/inline scripts
if (typeof window !== 'undefined') {
  window.sendPushNotification = sendPushNotification;
  window.PushService = {
    sendPushNotification,
    sendCustomNotification,
    sendNotificationToUser,
    sendNotificationToTeachers,
    sendNotificationToAdmins,
    sendNotificationToAll,
    notifyCommunityAnnouncement,
    WORKER_PUSH_URL
  };
}

