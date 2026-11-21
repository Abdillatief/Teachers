/**
 * Sabeel Academy - Admin Master Notification Settings Service
 * Manages global system-wide switches for notifications in `settings/notifications`
 */

import { db } from '../../config/firebase.js';
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const DEFAULT_ADMIN_NOTIFICATION_SETTINGS = {
  sessionReminderEnabled: true,
  sessionStartEnabled: true,
  salaryEnabled: true,
  communityEnabled: true,
  maintenanceEnabled: true,
  subscriptionEnabled: true
};

/**
 * Gets global notification settings from Firestore
 */
export async function getAdminNotificationSettings() {
  try {
    const docRef = doc(db, 'settings', 'notifications');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return {
        ...DEFAULT_ADMIN_NOTIFICATION_SETTINGS,
        ...snap.data()
      };
    } else {
      await setDoc(docRef, {
        ...DEFAULT_ADMIN_NOTIFICATION_SETTINGS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return { ...DEFAULT_ADMIN_NOTIFICATION_SETTINGS };
    }
  } catch (err) {
    console.warn('[AdminSettings] Error fetching notification settings:', err);
    return { ...DEFAULT_ADMIN_NOTIFICATION_SETTINGS };
  }
}

/**
 * Updates global notification settings in Firestore
 */
export async function updateAdminNotificationSettings(newSettings) {
  try {
    const docRef = doc(db, 'settings', 'notifications');
    const payload = {
      ...newSettings,
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, payload, { merge: true });
    return { success: true };
  } catch (err) {
    console.error('[AdminSettings] Error updating notification settings:', err);
    return { success: false, error: err.message };
  }
}
