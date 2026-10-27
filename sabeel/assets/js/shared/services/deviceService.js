/**
 * Sabeel Academy - Device Registration & Multi-Device Manager
 * Handles multi-device tracking (phone, tablet, desktop) for notifications
 */

import { auth, db } from '../../config/firebase.js';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { isMedianApp, getAppPlatform } from '../utils/medianBridge.js';

const DEVICE_ID_KEY = 'sabeel_unique_device_id';

/**
 * Gets or generates a persistent device ID for this client instance
 */
export function getDeviceId() {
  if (typeof window === 'undefined') return 'unknown_device';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    const randomPart = Math.random().toString(36).substring(2, 10);
    const timePart = Date.now().toString(36);
    deviceId = `dev_${randomPart}_${timePart}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Detects device form factor / model
 */
export function getDeviceDetails() {
  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '') || '';
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(ua);
  const isMobile = /mobile|iphone|ipod|android.*mobile/i.test(ua);
  
  let deviceType = 'desktop';
  if (isTablet) deviceType = 'tablet';
  else if (isMobile) deviceType = 'mobile';

  return {
    deviceType,
    platform: getAppPlatform(),
    userAgent: ua.substring(0, 150),
    isMedian: isMedianApp()
  };
}

/**
 * Registers or updates current device in Firestore collection `notification_devices`
 * 
 * @param {object} user - Firebase User object
 * @param {string} [oneSignalPlayerId] - OneSignal Player/Subscription ID
 */
export async function registerDevice(user, oneSignalPlayerId = null) {
  if (!user || !user.uid) return null;

  const deviceId = getDeviceId();
  const details = getDeviceDetails();
  const player = oneSignalPlayerId || localStorage.getItem('sabeel_onesignal_player_id') || null;

  const deviceDocRef = doc(db, 'notification_devices', deviceId);
  const payload = {
    userId: user.uid,
    deviceId: deviceId,
    oneSignalPlayerId: player,
    platform: details.platform,
    deviceType: details.deviceType,
    isMedian: details.isMedian,
    lastActive: new Date().toISOString(),
    updatedAt: serverTimestamp()
  };

  try {
    const existingSnap = await getDoc(deviceDocRef);
    if (!existingSnap.exists()) {
      payload.createdAt = new Date().toISOString();
    }
    await setDoc(deviceDocRef, payload, { merge: true });
    console.log(`[DeviceService] Device ${deviceId} registered for user ${user.uid}`);
    return deviceId;
  } catch (err) {
    console.warn('[DeviceService] Error registering device:', err);
    return null;
  }
}

/**
 * Fetches all registered devices for a given user
 * @param {string} userId - Firebase UID
 */
export async function getUserDevices(userId) {
  if (!userId) return [];
  try {
    const q = query(collection(db, 'notification_devices'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('[DeviceService] Error fetching user devices:', err);
    return [];
  }
}

/**
 * Checks if a user has any active device registered with OneSignal
 * @param {string} userId - Firebase UID
 */
export async function hasActiveOneSignalDevice(userId) {
  if (!userId) return false;
  try {
    const devices = await getUserDevices(userId);
    return devices.some(d => Boolean(d.oneSignalPlayerId));
  } catch (e) {
    return false;
  }
}

/**
 * Removes inactive devices older than maxDays (e.g. 90 days)
 */
export async function cleanInactiveDevices(maxDays = 90) {
  try {
    const cutoff = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000).toISOString();
    const q = query(collection(db, 'notification_devices'), where('lastActive', '<', cutoff));
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.allSettled(deletePromises);
    console.log(`[DeviceService] Cleaned ${snap.size} inactive devices.`);
  } catch (err) {
    console.warn('[DeviceService] Cleanup warning:', err);
  }
}
