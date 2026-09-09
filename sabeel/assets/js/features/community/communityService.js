/**
 * Sabeel Academy - Community Service (مجتمع الأكاديمية والملتقى)
 * Version: 1.0.0
 * Handles real-time posts, comments, reactions, and administrative moderation.
 */

import { db } from '../../config/firebase.js';
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  increment,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const POST_CATEGORIES = {
  announcement: { id: 'announcement', label: 'إعلان وتوجيه إداري 📢', badgeClass: 'badge-danger', icon: 'megaphone', adminOnly: true },
  idea: { id: 'idea', label: 'فكرة وتطوير 💡', badgeClass: 'badge-primary', icon: 'lightbulb' },
  experience: { id: 'experience', label: 'تبادل خبرات قرآنية 📖', badgeClass: 'badge-success', icon: 'book-open' },
  question: { id: 'question', label: 'استفسار ومناقشة ❓', badgeClass: 'badge-warning', icon: 'help-circle' },
  general: { id: 'general', label: 'منشور عام وترحيب 💬', badgeClass: 'badge-secondary', icon: 'message-circle' }
};

export const REACTION_TYPES = {
  like: { id: 'like', emoji: '👍', label: 'أعجبني' },
  idea: { id: 'idea', emoji: '💡', label: 'فكرة ملهمة' },
  love: { id: 'love', emoji: '❤️', label: 'شكر وتقدير' },
  clap: { id: 'clap', emoji: '👏', label: 'أحسنت' }
};

/**
 * Format timestamp into friendly Arabic relative time
 */
export function formatRelativeTimeArabic(timestamp) {
  if (!timestamp) return 'الآن';
  const date = timestamp.toDate ? timestamp.toDate() : (timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp));
  if (isNaN(date.getTime())) return 'الآن';

  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 45) return 'الآن';
  if (diffSec < 90) return 'منذ دقيقة';
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `منذ ${mins} ${mins <= 10 ? 'دقائق' : 'دقيقة'}`;
  }
  if (diffSec < 7200) return 'منذ ساعة';
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `منذ ${hours} ${hours <= 10 ? 'ساعات' : 'ساعة'}`;
  }
  if (diffSec < 172800) {
    const timeStr = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    return `أمس في ${timeStr}`;
  }
  
  return date.toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Create a new post in the community
 */
export async function createCommunityPost({
  title = '',
  content,
  category = 'general',
  authorId,
  authorName,
  authorRole = 'teacher',
  isPinned = false,
  isOfficial = false,
  allowComments = true
}) {
  if (!content || !content.trim()) {
    throw new Error("محتوى المنشور لا يمكن أن يكون فارغاً.");
  }

  const categoryMeta = POST_CATEGORIES[category] || POST_CATEGORIES.general;

  const postData = {
    title: (title || '').trim(),
    content: content.trim(),
    category,
    categoryLabel: categoryMeta.label,
    authorId,
    authorName: authorName || (authorRole === 'admin' ? 'الإدارة العامة' : 'معلم معتمد'),
    authorRole,
    authorBadge: authorRole === 'admin' ? 'الإدارة العامة' : 'معلم معتمد',
    isPinned: Boolean(isPinned && authorRole === 'admin'),
    isOfficial: Boolean(isOfficial || authorRole === 'admin' && category === 'announcement'),
    allowComments: allowComments !== false,
    reactions: {
      like: [],
      idea: [],
      love: [],
      clap: []
    },
    commentsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, "community_posts"), postData);
  return { id: docRef.id, ...postData };
}

/**
 * Delete a post (Admin can delete any post; Author can delete their own post)
 */
export async function deleteCommunityPost(postId, currentUserId, currentUserRole) {
  if (!postId) throw new Error("معرف المنشور غير صحيح");

  const postRef = doc(db, "community_posts", postId);
  const snap = await getDoc(postRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'sub_admin';
  if (!isAdmin && data.authorId !== currentUserId) {
    throw new Error("ليس لديك صلاحية حذف هذا المنشور");
  }

  // Delete all comments in subcollection first
  try {
    const commentsSnap = await getDocs(collection(db, "community_posts", postId, "comments"));
    const deletePromises = commentsSnap.docs.map(cDoc => deleteDoc(cDoc.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn("Error cleaning comments for deleted post:", err);
  }

  await deleteDoc(postRef);
}

/**
 * Toggle Pin post (Admin Only)
 */
export async function togglePinPost(postId, currentPinnedStatus) {
  const postRef = doc(db, "community_posts", postId);
  await updateDoc(postRef, {
    isPinned: !currentPinnedStatus,
    updatedAt: serverTimestamp()
  });
}

/**
 * Toggle Lock Comments (Admin Only)
 */
export async function toggleLockComments(postId, currentAllowComments) {
  const postRef = doc(db, "community_posts", postId);
  await updateDoc(postRef, {
    allowComments: !currentAllowComments,
    updatedAt: serverTimestamp()
  });
}

/**
 * Toggle reaction on a post
 */
export async function toggleReaction(postId, reactionType, userId) {
  if (!postId || !reactionType || !userId) return;

  const postRef = doc(db, "community_posts", postId);
  const snap = await getDoc(postRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const reactions = data.reactions || { like: [], idea: [], love: [], clap: [] };
  const currentList = Array.isArray(reactions[reactionType]) ? reactions[reactionType] : [];

  const hasReacted = currentList.includes(userId);

  // If already reacted, remove user. If not, add user.
  if (hasReacted) {
    await updateDoc(postRef, {
      [`reactions.${reactionType}`]: arrayRemove(userId)
    });
  } else {
    await updateDoc(postRef, {
      [`reactions.${reactionType}`]: arrayUnion(userId)
    });
  }
}

/**
 * Add a comment to a post
 */
export async function addPostComment(postId, { text, authorId, authorName, authorRole }) {
  if (!text || !text.trim()) {
    throw new Error("التعليق لا يمكن أن يكون فارغاً.");
  }

  const postRef = doc(db, "community_posts", postId);
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) throw new Error("المنشور لم يعد متاحاً.");
  if (postSnap.data().allowComments === false && authorRole !== 'admin') {
    throw new Error("تم إغلاق التعليقات على هذا المنشور من قِبل الإدارة.");
  }

  const commentData = {
    postId,
    text: text.trim(),
    authorId,
    authorName: authorName || (authorRole === 'admin' ? 'الإدارة' : 'معلم'),
    authorRole: authorRole || 'teacher',
    createdAt: serverTimestamp()
  };

  const commentsCol = collection(db, "community_posts", postId, "comments");
  const commentRef = await addDoc(commentsCol, commentData);

  // Increment comments count on post
  await updateDoc(postRef, {
    commentsCount: increment(1),
    updatedAt: serverTimestamp()
  });

  return { id: commentRef.id, ...commentData };
}

/**
 * Delete a comment
 */
export async function deletePostComment(postId, commentId, currentUserId, currentUserRole) {
  const commentRef = doc(db, "community_posts", postId, "comments", commentId);
  const snap = await getDoc(commentRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'sub_admin';
  if (!isAdmin && data.authorId !== currentUserId) {
    throw new Error("ليس لديك صلاحية حذف هذا التعليق");
  }

  await deleteDoc(commentRef);

  // Decrement comments count on post
  const postRef = doc(db, "community_posts", postId);
  await updateDoc(postRef, {
    commentsCount: increment(-1)
  });
}

/**
 * Real-time listener for community posts
 */
export function subscribeCommunityPosts(onPostsChanged, onError) {
  const postsQuery = query(
    collection(db, "community_posts"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(postsQuery, (snapshot) => {
    const posts = [];
    snapshot.forEach((docSnap) => {
      posts.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    // Custom sorting: Pinned posts first, then newest
    posts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

    onPostsChanged(posts);
  }, (err) => {
    console.error("Error subscribing to community posts:", err);
    if (onError) onError(err);
  });
}

/**
 * Real-time listener for comments on a specific post
 */
export function subscribePostComments(postId, onCommentsChanged) {
  const commentsQuery = query(
    collection(db, "community_posts", postId, "comments"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(commentsQuery, (snapshot) => {
    const comments = [];
    snapshot.forEach((docSnap) => {
      comments.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    onCommentsChanged(comments);
  }, (err) => {
    console.warn(`Error subscribing to comments for post ${postId}:`, err);
  });
}

/**
 * Real-time listener for the latest community post (used for Dashboards)
 */
export function subscribeLatestCommunityPost(onLatestChanged) {
  const latestQuery = query(
    collection(db, "community_posts"),
    orderBy("createdAt", "desc"),
    limit(5)
  );

  return onSnapshot(latestQuery, (snapshot) => {
    if (snapshot.empty) {
      onLatestChanged(null);
      return;
    }

    const posts = [];
    snapshot.forEach(docSnap => {
      posts.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Pick pinned announcement if exists, or the absolute newest
    const pinned = posts.find(p => p.isPinned);
    const topPost = pinned || posts[0];
    onLatestChanged(topPost);
  }, (err) => {
    console.warn("Error subscribing to latest community post:", err);
    onLatestChanged(null);
  });
}
