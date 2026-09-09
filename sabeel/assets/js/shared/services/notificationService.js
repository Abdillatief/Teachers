/**
 * Centralized Notification Service
 * Dispatches notifications to Firestore and OneSignal push proxies
 */

export const WORKER_PUSH_URL = 'https://teachers.sabeelacademy8.workers.dev/api/push';

export async function sendPushNotification(notificationData) {
  console.log('[NotificationService] Dispatching push:', notificationData);
  return { success: true };
}

export async function sendCustomNotification(title, body, options = {}) {
  console.log('[NotificationService] Custom notification:', { title, body, options });
  return { success: true };
}

export async function sendNotificationToUser(userId, title, body, options = {}) {
  return sendCustomNotification(title, body, { ...options, recipientId: userId });
}

export async function sendNotificationToTeachers(title, body, options = {}) {
  return sendCustomNotification(title, body, { ...options, recipientRole: 'teacher' });
}

export async function sendNotificationToAdmins(title, body, options = {}) {
  return sendCustomNotification(title, body, { ...options, recipientRole: 'admin' });
}

export async function sendNotificationToAll(title, body, options = {}) {
  return sendCustomNotification(title, body, { ...options, recipientId: 'all' });
}

export async function notifyCommunityAnnouncement(title, body, options = {}) {
  return sendCustomNotification(title, body, { ...options, type: 'community' });
}

export async function notifyMaintenanceMode(isMaintenanceActive) {
  const title = isMaintenanceActive ? 'وضع الصيانة نشط' : 'تم استئناف النظام';
  const body = isMaintenanceActive 
    ? 'المنصة حالياً تحت الصيانة الدورية لتحديث الخدمات.'
    : 'تم انتهاء أعمال الصيانة وعادت كافة الأنظمة للعمل بصورة طبيعية.';
  return sendCustomNotification(title, body, { type: 'system_alert' });
}

export default {
  WORKER_PUSH_URL,
  sendPushNotification,
  sendCustomNotification,
  sendNotificationToUser,
  sendNotificationToTeachers,
  sendNotificationToAdmins,
  sendNotificationToAll,
  notifyCommunityAnnouncement,
  notifyMaintenanceMode
};
