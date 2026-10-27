/**
 * Sabeel Academy - User Notification Settings Service
 * Manages user preferences for push & in-app notifications.
 * Stored inside users/{userId} under notificationSettings:
 * {
 *   communityPosts: boolean,    // Official community & admin announcements
 *   followersPosts: boolean,    // Posts by followed teachers
 *   maintenance: boolean        // Maintenance mode & system alerts
 * }
 */

import { db } from '../../config/firebase.js';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const DEFAULT_NOTIFICATION_SETTINGS = {
  communityPosts: true,
  followersPosts: true,
  maintenance: true
};

/**
 * Fetch notification preferences for a given user
 * Defaults to all true if unset
 */
export async function getUserNotificationSettings(userId) {
  if (!userId) return { ...DEFAULT_NOTIFICATION_SETTINGS };
  try {
    const userDocRef = doc(db, "users", userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...(data.notificationSettings || {})
      };
    }
  } catch (err) {
    console.warn(`[NotificationSettingsService] Error loading settings for user ${userId}:`, err);
  }
  return { ...DEFAULT_NOTIFICATION_SETTINGS };
}

/**
 * Update notification preferences for a user
 */
export async function updateUserNotificationSettings(userId, newSettings) {
  if (!userId) throw new Error("معرف المستخدم مطلوب لحفظ إعدادات الإشعارات.");

  const sanitizedSettings = {
    communityPosts: newSettings.communityPosts !== false,
    followersPosts: newSettings.followersPosts !== false,
    maintenance: newSettings.maintenance !== false
  };

  const userDocRef = doc(db, "users", userId);
  await setDoc(userDocRef, {
    notificationSettings: sanitizedSettings
  }, { merge: true });

  return sanitizedSettings;
}

/**
 * Helper to check if user allows a specific notification type
 * @param {string} userId
 * @param {'communityPosts' | 'followersPosts' | 'maintenance'} typeKey
 * @returns {Promise<boolean>}
 */
export async function canSendNotificationType(userId, typeKey) {
  if (!userId) return false;
  const settings = await getUserNotificationSettings(userId);
  return settings[typeKey] !== false;
}
