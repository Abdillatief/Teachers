/**
 * Sabeel Academy - Community Follow Service
 * Handles teacher follow/unfollow functionality, follower counts, and real-time state.
 * Collection: communityFollows
 * Document structure:
 * {
 *   followerId: string,
 *   followingId: string,
 *   createdAt: timestamp
 * }
 */

import { db } from '../../config/firebase.js';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Generate standard deterministic document ID for a follow relationship
 */
export function getFollowDocId(followerId, followingId) {
  return `${followerId}_${followingId}`;
}

/**
 * Toggle follow status for a teacher
 * @param {string} followerId - Current logged in user ID
 * @param {string} followingId - Target teacher user ID
 * @returns {Promise<{isFollowing: boolean}>}
 */
export async function toggleFollowTeacher(followerId, followingId) {
  if (!followerId || !followingId) {
    throw new Error("معرف المستخدم والمعلم المستهدف مطلوبان.");
  }

  if (followerId === followingId) {
    throw new Error("لا يمكن للمعلم متابعة حسابه الشخصي.");
  }

  const followId = getFollowDocId(followerId, followingId);
  const followDocRef = doc(db, "communityFollows", followId);
  const followSnap = await getDoc(followDocRef);

  if (followSnap.exists()) {
    // Already following -> Unfollow
    await deleteDoc(followDocRef);
    return { isFollowing: false };
  } else {
    // Not following -> Follow
    await setDoc(followDocRef, {
      followerId,
      followingId,
      createdAt: serverTimestamp()
    });
    return { isFollowing: true };
  }
}

/**
 * Check if a user is currently following another teacher
 */
export async function checkIsFollowing(followerId, followingId) {
  if (!followerId || !followingId || followerId === followingId) {
    return false;
  }
  const followId = getFollowDocId(followerId, followingId);
  const snap = await getDoc(doc(db, "communityFollows", followId));
  return snap.exists();
}

/**
 * Get follower IDs for a target teacher
 * @param {string} teacherId - The target teacher UID
 * @returns {Promise<string[]>} Array of follower UIDs
 */
export async function getTeacherFollowerIds(teacherId) {
  if (!teacherId) return [];
  try {
    const q = query(
      collection(db, "communityFollows"),
      where("followingId", "==", teacherId)
    );
    const snap = await getDocs(q);
    const followerIds = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.followerId) {
        followerIds.push(data.followerId);
      }
    });
    return followerIds;
  } catch (err) {
    console.warn("[CommunityFollowService] Error fetching follower IDs:", err);
    return [];
  }
}

/**
 * Get follower count for a teacher
 */
export async function getTeacherFollowersCount(teacherId) {
  if (!teacherId) return 0;
  try {
    const q = query(
      collection(db, "communityFollows"),
      where("followingId", "==", teacherId)
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    console.warn("[CommunityFollowService] Error getting follower count:", err);
    return 0;
  }
}

/**
 * Subscribe to the list of user IDs that the current user is following
 * @param {string} currentUserId
 * @param {Function} callback - Called with Set<string> of followed teacher IDs
 * @returns {Function} Unsubscribe function
 */
export function subscribeUserFollowing(currentUserId, callback) {
  if (!currentUserId) {
    callback(new Set());
    return () => {};
  }

  const q = query(
    collection(db, "communityFollows"),
    where("followerId", "==", currentUserId)
  );

  return onSnapshot(q, (snapshot) => {
    const followingSet = new Set();
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.followingId) {
        followingSet.add(data.followingId);
      }
    });
    callback(followingSet);
  }, (err) => {
    console.warn("[CommunityFollowService] Error in following subscription:", err);
    callback(new Set());
  });
}

/**
 * Subscribe to real-time followers count map for active teachers in community
 * @param {Function} callback - Called with Map<teacherId, count>
 */
export function subscribeAllFollowersMap(callback) {
  const q = collection(db, "communityFollows");
  return onSnapshot(q, (snapshot) => {
    const countsMap = new Map();
    snapshot.forEach(d => {
      const data = d.data();
      if (data.followingId) {
        const prev = countsMap.get(data.followingId) || 0;
        countsMap.set(data.followingId, prev + 1);
      }
    });
    callback(countsMap);
  }, (err) => {
    console.warn("[CommunityFollowService] Error in all followers map listener:", err);
    callback(new Map());
  });
}
