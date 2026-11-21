/**
 * Sabeel Academy - Community Controller (مجتمع الأكاديمية والملتقى)
 * Version: 2.0.0
 * Powers Admin & Teacher community interaction, reactions with reactor details,
 * followers lists, community profile customization, and comments.
 */

import { 
  createCommunityPost, 
  deleteCommunityPost, 
  togglePinPost, 
  toggleLockComments, 
  toggleReaction, 
  addPostComment, 
  deletePostComment, 
  subscribeCommunityPosts, 
  subscribePostComments,
  formatRelativeTimeArabic, 
  updateCommunityProfile,
  POST_CATEGORIES, 
  REACTION_TYPES 
} from './communityService.js';
import { 
  toggleFollowTeacher, 
  subscribeUserFollowing, 
  subscribeAllFollowersMap,
  getTeacherFollowersList,
  getTeacherFollowingList
} from './communityFollowService.js';
import { Toast } from '../../shared/utils/toast.js';
import { showCustomConfirm } from '../../shared/utils/helpers.js';
import { updateTargetIcons } from '../../shared/utils/perfUtils.js';
import { db } from '../../config/firebase.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { dataStore } from '../../shared/data/dataStore.js';

/**
 * Client-side canvas compression for community avatar (320x320 JPEG)
 */
function processAndCompressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('الملف المحدد ليس صورة صالحة.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 320;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('فشل قراءة ملف الصورة.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف من الجهاز.'));
    reader.readAsDataURL(file);
  });
}

export class CommunityController {
  constructor(role = 'teacher', currentUser = {}) {
    this.role = role;
    this.isAdmin = role === 'admin' || role === 'sub_admin';
    this.currentUser = {
      ...currentUser,
      realName: currentUser.realName || currentUser.name || (this.isAdmin ? 'مدير الأكاديمية' : 'معلم معتمد'),
      communityDisplayName: currentUser.communityDisplayName || null,
      communityTitle: currentUser.communityTitle || '',
      communityPhotoURL: currentUser.communityPhotoURL || currentUser.communityAvatar || currentUser.photoURL || null
    };

    this.allPosts = [];
    this.currentCategory = 'all';
    this.searchQuery = '';
    this.sortBy = 'newest'; // 'newest' | 'reactions' | 'comments'

    this.expandedComments = new Set();
    this.commentsCache = new Map();
    this.commentsUnsubs = new Map();

    // Follow System States
    this.followingUserIds = new Set();
    this.followersCountsMap = new Map();
    this.followingUnsub = null;
    this.followersMapUnsub = null;

    this.postsUnsub = null;

    // Active Modal States
    this.activeReactorsPostId = null;
    this.currentReactorFilter = 'all';

    // Real names resolution cache & community avatar state
    this.teachersMap = new Map();
    this.pendingCommunityPhotoURL = undefined;
  }

  /**
   * Helper to get active display name in community (custom alias or fallback to permanent real name)
   */
  getMyCommunityDisplayName() {
    return this.currentUser.communityDisplayName || this.currentUser.realName || this.currentUser.name || (this.isAdmin ? 'الإدارة العامة' : 'معلم معتمد');
  }

  /**
   * Safe HTML string escape helper
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Initialize community page
   */
  init() {
    this.bindEvents();
    this.setupProfileUI();
    this.setupURLParams();
    this.setupFollowSubscriptions();
    this.listenToPosts();
  }

  /**
   * Setup Teacher / Admin Community Profile Header Box
   */
  setupProfileUI() {
    this.updateProfileCardDOM();

    // Bind Edit Profile Button
    const btnEdit = document.getElementById('btnEditCommunityProfile');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => this.openEditProfileModal());
    }

    // Bind Followers Button
    const btnFollowers = document.getElementById('btnViewMyFollowers');
    if (btnFollowers) {
      btnFollowers.addEventListener('click', () => this.openFollowersModal(this.currentUser.uid, this.getMyCommunityDisplayName()));
    }

    const btnDirectFollowers = document.getElementById('btnOpenFollowersListDirect');
    if (btnDirectFollowers) {
      btnDirectFollowers.addEventListener('click', () => this.openFollowersModal(this.currentUser.uid, this.getMyCommunityDisplayName()));
    }

    // Bind Following Button
    const btnFollowing = document.getElementById('btnViewMyFollowing');
    if (btnFollowing) {
      btnFollowing.addEventListener('click', () => this.openFollowingModal(this.currentUser.uid));
    }

    // Bind Filter My Posts Button
    const btnMyPosts = document.getElementById('btnFilterMyPosts');
    if (btnMyPosts) {
      btnMyPosts.addEventListener('click', () => {
        const tabs = document.querySelectorAll('.community-category-tab');
        tabs.forEach(t => t.classList.remove('active'));
        this.currentCategory = this.currentCategory === 'my_posts' ? 'all' : 'my_posts';
        
        // Highlight tab if exists or reset
        const myTab = document.querySelector('[data-category="my_posts"]');
        if (myTab && this.currentCategory === 'my_posts') {
          myTab.classList.add('active');
        } else if (this.currentCategory === 'all') {
          document.querySelector('[data-category="all"]')?.classList.add('active');
        }
        this.renderPostsList();
      });
    }

    // Bind Profile Modal Forms
    const formEdit = document.getElementById('editCommunityProfileForm');
    if (formEdit) {
      formEdit.addEventListener('submit', (e) => this.handleEditProfileSubmit(e));
    }

    const btnCloseEditModal = document.getElementById('btnCloseEditProfileModal');
    const btnCancelEditModal = document.getElementById('btnCancelEditProfileModal');
    if (btnCloseEditModal) btnCloseEditModal.addEventListener('click', () => this.closeEditProfileModal());
    if (btnCancelEditModal) btnCancelEditModal.addEventListener('click', () => this.closeEditProfileModal());

    // Bind Reactors Modal Close
    const btnCloseReactors = document.getElementById('btnCloseReactorsModal');
    if (btnCloseReactors) {
      btnCloseReactors.addEventListener('click', () => this.closeReactorsModal());
    }

    // Bind Followers / Following Modals Close
    const btnCloseFollowers = document.getElementById('btnCloseFollowersModal');
    if (btnCloseFollowers) {
      btnCloseFollowers.addEventListener('click', () => this.closeFollowersModal());
    }
    const btnCloseFollowing = document.getElementById('btnCloseFollowingModal');
    if (btnCloseFollowing) {
      btnCloseFollowing.addEventListener('click', () => this.closeFollowingModal());
    }

    // Modal backdrop click-to-close handlers
    ['createPostModal', 'editCommunityProfileModal', 'reactorsModal', 'followersModal', 'followingModal'].forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) modal.style.display = 'none';
        });
      }
    });

    // Global Escape key closes any open modal
    if (!this._hasEscListener) {
      this._hasEscListener = true;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          ['createPostModal', 'editCommunityProfileModal', 'reactorsModal', 'followersModal', 'followingModal'].forEach(id => {
            const m = document.getElementById(id);
            if (m && m.style.display !== 'none') m.style.display = 'none';
          });
        }
      });
    }
  }

  /**
   * Update Profile Card in DOM
   */
  updateProfileCardDOM() {
    const elName = document.getElementById('myCommunityName');
    const elTitle = document.getElementById('myCommunityTitle');
    const elAvatar = document.getElementById('myCommunityAvatar');
    const elBadge = document.getElementById('myCommunityRoleBadge');
    const elRealBadge = document.getElementById('myCommunityRealNameBadge');

    const realName = this.currentUser.realName || this.currentUser.name || (this.isAdmin ? 'مدير الأكاديمية' : 'معلم معتمد');
    const communityName = this.getMyCommunityDisplayName();
    const title = this.currentUser.communityTitle || (this.isAdmin ? 'الإدارة العامة للأكاديمية والملتقى' : 'كادر التحفيظ والتعليم القرآني');

    if (elName) elName.textContent = communityName;
    if (elTitle) elTitle.textContent = title;
    if (elAvatar) elAvatar.textContent = communityName.trim().charAt(0) || 'م';
    if (elBadge) {
      elBadge.textContent = this.isAdmin ? '👑 الإدارة العامة' : '👨‍🏫 معلم معتمد';
      elBadge.style.background = this.isAdmin ? 'rgba(234, 179, 8, 0.2)' : 'rgba(14, 165, 233, 0.15)';
      elBadge.style.color = this.isAdmin ? '#854d0e' : 'var(--primary-color)';
    }

    if (elRealBadge) {
      if (this.currentUser.communityDisplayName && this.currentUser.communityDisplayName !== realName) {
        elRealBadge.style.display = 'inline-flex';
        elRealBadge.innerHTML = `<i data-lucide="shield" style="width: 12px; height: 12px; margin-left: 3px;"></i> <span>الاسم الرسمي: ${this.escapeHtml(realName)}</span>`;
        updateTargetIcons(elRealBadge);
      } else {
        elRealBadge.style.display = 'none';
      }
    }

    this.updateUserStatsCounters();
  }

  /**
   * Update follower counts on profile card
   */
  updateUserStatsCounters() {
    const followersCount = this.followersCountsMap.get(this.currentUser.uid) || 0;
    const followingCount = this.followingUserIds.size || 0;
    const myPostsCount = this.allPosts.filter(p => p.authorId === this.currentUser.uid).length;

    const elFollowers = document.getElementById('myFollowersCountLabel');
    const elFollowing = document.getElementById('myFollowingCountLabel');
    const elMyPosts = document.getElementById('myPostsCountLabel');

    if (elFollowers) elFollowers.textContent = followersCount;
    if (elFollowing) elFollowing.textContent = followingCount;
    if (elMyPosts) elMyPosts.textContent = myPostsCount;

    this.updateFollowersNamesPreview();
  }

  /**
   * Render preview of current user's follower names on profile card
   */
  async updateFollowersNamesPreview() {
    const elList = document.getElementById('myFollowersNamesList');
    if (!elList || !this.currentUser?.uid) return;

    try {
      const followers = await getTeacherFollowersList(this.currentUser.uid);
      if (!followers || followers.length === 0) {
        elList.innerHTML = `<span style="color: var(--text-muted); font-size: 0.78rem;">لا يوجد متابعون لحسابك حتى الآن. شارك أفكاراً وتوجيهات مميزة في المجتمع لزيادة متابعيك!</span>`;
        return;
      }

      const chipsHtml = followers.slice(0, 4).map(f => `
        <span class="badge" style="background: rgba(14, 165, 233, 0.12); color: var(--primary-color); font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 99px; display: inline-flex; align-items: center; gap: 0.25rem;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
          ${f.followerName || 'معلم معتمد'}
        </span>
      `).join('');

      const remaining = followers.length - 4;
      const extraHtml = remaining > 0 ? `<span style="color: var(--text-muted); font-size: 0.75rem; font-weight: 700;"> و ${remaining} آخرين</span>` : '';

      elList.innerHTML = `${chipsHtml}${extraHtml}`;
    } catch (err) {
      console.warn("Error updating followers names preview:", err);
    }
  }

  /**
   * Setup real-time follow listeners
   */
  setupFollowSubscriptions() {
    if (this.currentUser?.uid) {
      this.followingUnsub = subscribeUserFollowing(this.currentUser.uid, (followingSet) => {
        this.followingUserIds = followingSet;
        this.updateFollowButtonsUI();
        this.updateUserStatsCounters();
      });
    }

    this.followersMapUnsub = subscribeAllFollowersMap((countsMap) => {
      this.followersCountsMap = countsMap;
      this.updateFollowerCountBadgesUI();
      this.updateUserStatsCounters();
    });
  }

  /**
   * Check for query params e.g. ?postId=... or ?action=new
   */
  setupURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const targetPostId = urlParams.get('postId');
    const action = urlParams.get('action');

    if (targetPostId) {
      this.targetPostIdOnLoad = targetPostId;
      this.expandedComments.add(targetPostId);
    }

    if (action === 'new') {
      setTimeout(() => {
        this.openCreatePostModal();
      }, 300);
    }
  }

  /**
   * Bind DOM event listeners
   */
  bindEvents() {
    // Open new post modal
    const btnOpenNew = document.getElementById('btnOpenNewPostModal');
    if (btnOpenNew) {
      btnOpenNew.addEventListener('click', () => this.openCreatePostModal());
    }

    // Modal close buttons
    const btnCloseModal = document.getElementById('btnClosePostModal');
    const btnCancelModal = document.getElementById('btnCancelPostModal');
    const modalEl = document.getElementById('createPostModal');
    if (btnCloseModal) btnCloseModal.addEventListener('click', () => this.closeCreatePostModal());
    if (btnCancelModal) btnCancelModal.addEventListener('click', () => this.closeCreatePostModal());
    if (modalEl) {
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) this.closeCreatePostModal();
      });
    }

    // Form submission
    const formEl = document.getElementById('createPostForm');
    if (formEl) {
      formEl.addEventListener('submit', (e) => this.handleCreatePostSubmit(e));
    }

    // Category Tabs
    const tabs = document.querySelectorAll('.community-category-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentCategory = tab.dataset.category || 'all';
        this.renderPostsList();
      });
    });

    // Search input
    const searchInput = document.getElementById('communitySearchInput');
    if (searchInput) {
      let debounceTimer = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.searchQuery = (e.target.value || '').trim().toLowerCase();
          this.renderPostsList();
        }, 250);
      });
    }

    // Sort select
    const sortSelect = document.getElementById('communitySortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value || 'newest';
        this.renderPostsList();
      });
    }
  }

  /**
   * Listen to real-time posts stream
   */
  listenToPosts() {
    const feedContainer = document.getElementById('communityFeedContainer');
    if (feedContainer) {
      feedContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div class="spinner" style="margin: 0 auto 1rem auto; width: 32px; height: 32px; border-width: 3px;"></div>
          <p style="font-size: 0.9rem;">جاري تحميل محادثات ومنشورات المجتمع...</p>
        </div>
      `;
    }

    this.postsUnsub = subscribeCommunityPosts((posts) => {
      this.allPosts = posts;
      this.updateStatsCounters();
      this.updateUserStatsCounters();
      this.renderPostsList();

      // If targeted a post from URL, scroll to it smoothly
      if (this.targetPostIdOnLoad) {
        setTimeout(() => {
          const targetEl = document.getElementById(`postCard-${this.targetPostIdOnLoad}`);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetEl.style.boxShadow = '0 0 0 3px var(--primary-color)';
            setTimeout(() => { targetEl.style.boxShadow = ''; }, 3000);
          }
          this.targetPostIdOnLoad = null;
        }, 350);
      }
    }, (err) => {
      if (feedContainer) {
        feedContainer.innerHTML = `
          <div class="card" style="text-align: center; padding: 2rem; color: var(--danger);">
            <i data-lucide="alert-circle" style="width: 36px; height: 36px; margin-bottom: 0.5rem;"></i>
            <p>حدث خطأ أثناء تحميل المنشورات: ${err.message || 'خطأ غير متوقع'}</p>
          </div>
        `;
        updateTargetIcons(feedContainer);
      }
    });
  }

  /**
   * Update top stats metrics
   */
  updateStatsCounters() {
    const elTotalPosts = document.getElementById('statTotalPosts');
    const elAnnouncements = document.getElementById('statTotalAnnouncements');
    const elIdeas = document.getElementById('statTotalIdeas');
    const elComments = document.getElementById('statTotalComments');

    if (!elTotalPosts && !elAnnouncements) return;

    let announcementsCount = 0;
    let ideasCount = 0;
    let totalCommentsCount = 0;

    this.allPosts.forEach(p => {
      if (p.category === 'announcement' || p.isOfficial) announcementsCount++;
      if (p.category === 'idea') ideasCount++;
      totalCommentsCount += (p.commentsCount || 0);
    });

    if (elTotalPosts) elTotalPosts.textContent = this.allPosts.length;
    if (elAnnouncements) elAnnouncements.textContent = announcementsCount;
    if (elIdeas) elIdeas.textContent = ideasCount;
    if (elComments) elComments.textContent = totalCommentsCount;
  }

  /**
   * Render posts feed
   */
  renderPostsList() {
    const container = document.getElementById('communityFeedContainer');
    if (!container) return;

    // Filter
    let filtered = this.allPosts.filter(post => {
      // Category filter
      if (this.currentCategory === 'pinned') {
        if (!post.isPinned) return false;
      } else if (this.currentCategory === 'following') {
        if (!post.authorId || !this.followingUserIds.has(post.authorId)) return false;
      } else if (this.currentCategory === 'my_posts') {
        if (post.authorId !== this.currentUser.uid) return false;
      } else if (this.currentCategory !== 'all') {
        if (post.category !== this.currentCategory) return false;
      }

      // Search filter
      if (this.searchQuery) {
        const titleMatch = (post.title || '').toLowerCase().includes(this.searchQuery);
        const contentMatch = (post.content || '').toLowerCase().includes(this.searchQuery);
        const authorMatch = (post.authorName || '').toLowerCase().includes(this.searchQuery);
        if (!titleMatch && !contentMatch && !authorMatch) return false;
      }

      return true;
    });

    // Sort
    if (this.sortBy === 'reactions') {
      filtered.sort((a, b) => {
        const reactionsA = Object.values(a.reactions || {}).reduce((acc, arr) => acc + (arr?.length || 0), 0);
        const reactionsB = Object.values(b.reactions || {}).reduce((acc, arr) => acc + (arr?.length || 0), 0);
        return reactionsB - reactionsA;
      });
    } else if (this.sortBy === 'comments') {
      filtered.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
    }

    // Empty state
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 3rem 1.5rem; background: var(--bg-secondary);">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(14, 165, 233, 0.1); color: var(--primary-color); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto;">
            <i data-lucide="messages-square" style="width: 28px; height: 28px;"></i>
          </div>
          <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0 0 0.5rem 0;">
            ${this.currentCategory === 'my_posts' ? 'لم تقم بنشر أي مشاركات بعد' : 'لا توجد منشورات مطابقة للبحث أو التصفية'}
          </h3>
          <p style="color: var(--text-secondary); font-size: 0.88rem; max-width: 420px; margin: 0 auto 1.25rem auto;">
            ${this.searchQuery ? 'جرب البحث بكلمات أخرى أو مسح الفلاتر الحالية.' : 'كن أول من يشارك فكرة، استفساراً، أو توجيهاً تعليمياً لإثراء مجتمع الأكاديمية!'}
          </p>
          <button class="btn btn-primary" onclick="window.communityCtrl.openCreatePostModal()">
            <i data-lucide="pen-tool"></i>
            <span>نشر مشاركة جديدة الآن</span>
          </button>
        </div>
      `;
      updateTargetIcons(container);
      return;
    }

    // Build feed HTML
    const html = filtered.map(post => this.buildPostCardHtml(post)).join('');
    container.innerHTML = html;

    // Attach dynamic listeners to post cards (reactions, view reactors, comments, admin actions)
    filtered.forEach(post => {
      this.attachPostEventListeners(post);
    });

    updateTargetIcons(container);
  }

  /**
   * Build HTML for a single post card
   */
  buildPostCardHtml(post) {
    const isOwner = post.authorId === this.currentUser.uid;
    const canDelete = this.isAdmin || isOwner;
    const isPinned = Boolean(post.isPinned);
    const isOfficial = Boolean(post.isOfficial || post.authorRole === 'admin');
    const categoryInfo = POST_CATEGORIES[post.category] || POST_CATEGORIES.general;
    const timeAgo = formatRelativeTimeArabic(post.createdAt);

    // If post author is current user, display their active community display name
    const authorDisplayName = isOwner ? this.getMyCommunityDisplayName() : (post.authorName || 'عضو بالأكاديمية');
    const authorInitials = (authorDisplayName || 'م').trim().charAt(0);
    const authorBadgeBg = isOfficial ? 'rgba(234, 179, 8, 0.18)' : 'rgba(14, 165, 233, 0.12)';
    const authorBadgeColor = isOfficial ? '#b45309' : 'var(--primary-color)';
    const cardBorderColor = isPinned ? '#eab308' : (isOfficial ? 'var(--primary-color)' : 'var(--border-color)');

    // Follow System attributes
    const authorId = post.authorId;
    const followersCount = this.followersCountsMap.get(authorId) || 0;
    const canFollow = this.currentUser?.uid && authorId && authorId !== this.currentUser.uid;
    const isFollowing = this.followingUserIds.has(authorId);

    // Author Avatar HTML
    const avatarUrl = post.authorPhotoURL || post.authorAvatar;
    const authorAvatarHtml = avatarUrl
      ? `<img src="${avatarUrl}" alt="${this.escapeHtml(authorDisplayName)}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid ${authorBadgeColor}40; flex-shrink: 0;" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div style="display: none; width: 44px; height: 44px; border-radius: 50%; background: ${authorBadgeBg}; color: ${authorBadgeColor}; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; border: 1.5px solid ${authorBadgeColor}40; flex-shrink: 0;">${authorInitials}</div>`
      : `<div style="width: 44px; height: 44px; border-radius: 50%; background: ${authorBadgeBg}; color: ${authorBadgeColor}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; border: 1.5px solid ${authorBadgeColor}40; flex-shrink: 0;">${authorInitials}</div>`;

    // Reactions counts & user status
    const reactions = post.reactions || {};
    const reactionButtonsHtml = Object.keys(REACTION_TYPES).map(key => {
      const meta = REACTION_TYPES[key];
      const usersList = Array.isArray(reactions[key]) ? reactions[key] : [];
      const hasReacted = usersList.includes(this.currentUser.uid);
      const activeClass = hasReacted ? 'active' : '';

      return `
        <button type="button" class="reaction-pill-btn ${activeClass}" data-action="react" data-post-id="${post.id}" data-reaction-type="${key}" title="${meta.label}">
          <span class="emoji">${meta.emoji}</span>
          <span class="count">${usersList.length > 0 ? usersList.length : ''}</span>
        </button>
      `;
    }).join('');

    // Total Reactions count
    const totalReactions = Object.values(reactions).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);

    // Collect all reactors with their names
    const reactorsMap = post.reactors || {};
    let reactorsList = Object.values(reactorsMap);

    // Fallback: If reactorsMap is missing any reactors from reactions arrays
    Object.keys(reactions).forEach(type => {
      const uids = Array.isArray(reactions[type]) ? reactions[type] : [];
      uids.forEach(uid => {
        if (!reactorsMap[uid]) {
          const isMe = uid === this.currentUser.uid;
          const isAuthor = uid === post.authorId;
          const fallbackName = isMe ? this.getMyCommunityDisplayName() : (isAuthor ? authorDisplayName : 'معلم معتمد');
          reactorsList.push({
            uid,
            name: fallbackName,
            role: isMe ? this.role : 'teacher',
            reactionType: type
          });
        }
      });
    });

    // Ensure current user's reactor entry reflects their active community display name
    reactorsList = reactorsList.map(r => {
      if (r.uid === this.currentUser.uid) {
        return { ...r, name: this.getMyCommunityDisplayName() };
      }
      return r;
    });

    let reactorsPreviewHtml = '';
    if (reactorsList.length > 0) {
      const namesPreview = reactorsList.slice(0, 3).map(r => {
        const emoji = REACTION_TYPES[r.reactionType]?.emoji || '👍';
        return `<span style="font-weight: 700; color: var(--text-primary);">${this.escapeHtml(r.name)} ${emoji}</span>`;
      }).join('، ');

      const extraCount = reactorsList.length - 3;
      const extraText = extraCount > 0 ? ` و <strong style="color: var(--primary-color);">${extraCount} آخرين</strong>` : '';

      reactorsPreviewHtml = `
        <div class="post-reactors-preview-row" style="margin-top: 0.65rem; padding: 0.45rem 0.85rem; background: var(--bg-primary); border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.78rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.35rem;">
          <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            <span style="color: var(--text-muted); font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
              <i data-lucide="smile" style="width: 13px; height: 13px; color: var(--primary-color);"></i>
              المتفاعلون:
            </span>
            <span>${namesPreview}${extraText}</span>
          </div>
          <button type="button" class="btn-link-subtle" data-action="view-reactors" data-post-id="${post.id}" style="background: none; border: none; font-size: 0.75rem; color: var(--primary-color); font-weight: 800; cursor: pointer; text-decoration: underline;">
            عرض أسماء المتفاعلين بالتفصيل (${reactorsList.length}) 👥
          </button>
        </div>
      `;
    }

    const commentsOpen = this.expandedComments.has(post.id);
    const allowComments = post.allowComments !== false;

    return `
      <article id="postCard-${post.id}" class="card community-post-card ${isPinned ? 'pinned-post' : ''}" style="border-right: 4px solid ${cardBorderColor}; padding: 1.35rem; margin-bottom: 1.25rem;">
        
        <!-- Post Header -->
        <div class="post-header-flex" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.75rem;">
          
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            ${authorAvatarHtml}
            <div>
              <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                <strong style="font-size: 0.98rem; color: var(--text-primary);">${this.escapeHtml(authorDisplayName)}</strong>
                <span class="badge" style="background: ${authorBadgeBg}; color: ${authorBadgeColor}; font-size: 0.7rem; font-weight: 800; padding: 0.15rem 0.45rem;">
                  ${isOfficial ? '👑 الإدارة العامة' : '👨‍🏫 معلم معتمد'}
                </span>
                ${isPinned ? `<span class="badge" style="background: rgba(234, 179, 8, 0.2); color: #854d0e; font-size: 0.7rem; font-weight: 800; border: 1px solid rgba(234, 179, 8, 0.35);">📌 مثبت بأعلى المجتمع</span>` : ''}
                
                <!-- Follower count badge (clickable to view followers) -->
                <button type="button" class="author-followers-badge" data-action="view-teacher-followers" data-teacher-id="${authorId}" data-teacher-name="${this.escapeHtml(authorDisplayName)}" title="اضغط لعرض متابعي هذا المعلم" style="background: none; border: 1px solid var(--border-color); padding: 0.15rem 0.5rem; border-radius: 99px; cursor: pointer; font-size: 0.72rem; color: var(--text-secondary); display: inline-flex; align-items: center; gap: 0.3rem;">
                  <i data-lucide="users" style="width: 12px; height: 12px; color: var(--primary-color);"></i>
                  <span><span data-follower-count-for="${authorId}">${followersCount}</span> متابع • أسماء المتابعين</span>
                </button>

                <!-- Follow / Unfollow button -->
                ${canFollow ? `
                  <button type="button" 
                          class="btn-follow ${isFollowing ? 'following' : ''}" 
                          data-action="toggle-follow" 
                          data-author-id="${authorId}" 
                          data-author-name="${this.escapeHtml(authorDisplayName)}" 
                          title="${isFollowing ? 'إلغاء المتابعة' : 'متابعة المعلم'}">
                    <i data-lucide="${isFollowing ? 'user-check' : 'user-plus'}" style="width: 13px; height: 13px;"></i>
                    <span class="btn-text">${isFollowing ? 'مُتابَع ✓' : 'متابعة +'}</span>
                  </button>
                ` : ''}
              </div>
              <div style="font-size: 0.76rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.45rem; margin-top: 0.25rem;">
                <span style="display: inline-flex; align-items: center; gap: 0.25rem;">
                  <i data-lucide="clock" style="width: 12px; height: 12px;"></i> ${timeAgo}
                </span>
                <span>•</span>
                <span style="color: var(--primary-color); font-weight: 700;">${categoryInfo.label}</span>
              </div>
            </div>
          </div>

          <!-- Post Actions Menu -->
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            ${this.isAdmin ? `
              <button class="btn btn-secondary btn-sm" data-action="toggle-pin" data-post-id="${post.id}" data-pinned="${isPinned}" title="${isPinned ? 'إلغاء التثبيت' : 'تثبيت المنشور بالأعلى'}" style="padding: 0.3rem 0.55rem; font-size: 0.75rem;">
                <i data-lucide="pin" style="width: 14px; height: 14px; ${isPinned ? 'color: #eab308;' : ''}"></i>
                <span>${isPinned ? 'مثبت' : 'تثبيت'}</span>
              </button>
              <button class="btn btn-secondary btn-sm" data-action="toggle-lock" data-post-id="${post.id}" data-locked="${!allowComments}" title="${allowComments ? 'قفل التعليقات' : 'فتح التعليقات'}" style="padding: 0.3rem 0.55rem; font-size: 0.75rem;">
                <i data-lucide="${allowComments ? 'lock' : 'unlock'}" style="width: 14px; height: 14px;"></i>
                <span>${allowComments ? 'قفل' : 'مغلق'}</span>
              </button>
            ` : ''}

            ${canDelete ? `
              <button class="btn btn-secondary btn-sm" data-action="delete-post" data-post-id="${post.id}" title="حذف المنشور" style="padding: 0.3rem 0.55rem; color: var(--danger); border-color: rgba(239,68,68,0.3);">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
              </button>
            ` : ''}
          </div>

        </div>

        <!-- Post Content -->
        <div style="margin-bottom: 1rem;">
          ${post.title ? `
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0 0 0.55rem 0; line-height: 1.5;">
              ${post.title}
            </h3>
          ` : ''}
          <div style="font-size: 0.92rem; color: var(--text-primary); line-height: 1.75; white-space: pre-line; word-break: break-word;">
            ${this.formatPostText(post.content)}
          </div>
        </div>

        <!-- Reactions & Comments Toolbar -->
        <div class="community-toolbar-flex" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.75rem; flex-wrap: wrap; gap: 0.65rem;">
          
          <!-- Reaction Buttons & Clickable Reactors Badge (Know Who Reacted) -->
          <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
            ${reactionButtonsHtml}
            <button type="button" class="likes-summary-badge clickable" data-action="view-reactors" data-post-id="${post.id}" title="اضغط لعرض أسماء من قام بالتفاعل">
              <i data-lucide="heart" style="width: 13px; height: 13px; fill: currentColor;"></i>
              <span>${totalReactions} تفاعل • أسماء المتفاعلون 👥</span>
            </button>
          </div>

          <!-- Toggle Comments Button -->
          <div>
            <button type="button" class="btn btn-secondary btn-sm" data-action="toggle-comments" data-post-id="${post.id}" style="font-size: 0.8rem; font-weight: 700; gap: 0.4rem; min-height: 38px;">
              <i data-lucide="message-square" style="width: 14px; height: 14px;"></i>
              <span>التعليقات (${post.commentsCount || 0})</span>
              <i data-lucide="${commentsOpen ? 'chevron-up' : 'chevron-down'}" style="width: 13px; height: 13px;"></i>
            </button>
          </div>

        </div>

        <!-- عرض أسماء المتفاعلين مباشرة على المنشور -->
        ${reactorsPreviewHtml}

        <!-- Comments Section Box (Shown if expanded) -->
        <div id="commentsSection-${post.id}" class="post-comments-container" style="display: ${commentsOpen ? 'block' : 'none'}; margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border-color);">
          
          <!-- Comments List -->
          <div id="commentsList-${post.id}" style="display: flex; flex-direction: column; gap: 0.65rem; margin-bottom: 1rem;">
            <div style="text-align: center; color: var(--text-muted); padding: 0.75rem; font-size: 0.82rem;">
              جاري تحميل التعليقات...
            </div>
          </div>

          <!-- Add Comment Form -->
          ${allowComments ? `
            <form id="commentForm-${post.id}" data-post-id="${post.id}" class="comment-form-responsive" style="display: flex; gap: 0.5rem; align-items: flex-end;">
              <textarea id="commentInput-${post.id}" class="form-control" placeholder="اكتب تعليقك أو استفسارك هنا..." rows="1" style="resize: none; min-height: 42px; font-size: 0.88rem; border-radius: 8px;" required></textarea>
              <button type="submit" class="btn btn-primary" style="padding: 0.55rem 0.95rem; font-size: 0.85rem; font-weight: 700; gap: 0.35rem; white-space: nowrap; min-height: 42px;">
                <i data-lucide="send" style="width: 14px; height: 14px;"></i>
                <span>إرسال</span>
              </button>
            </form>
          ` : `
            <div style="background: rgba(148, 163, 184, 0.1); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.65rem 1rem; text-align: center; font-size: 0.82rem; color: var(--text-muted);">
              🔒 تم قفل التعليقات على هذا المنشور الإداري من قِبل الإدارة.
            </div>
          `}

        </div>

      </article>
    `;
  }

  /**
   * Safe HTML linkify for post content
   */
  formatPostText(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    let safe = div.innerHTML;

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    safe = safe.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: underline;">${url}</a>`);

    return safe;
  }

  /**
   * Attach event listeners to card interactive elements
   */
  attachPostEventListeners(post) {
    const cardEl = document.getElementById(`postCard-${post.id}`);
    if (!cardEl) return;

    // 1. Reactions
    const reactionBtns = cardEl.querySelectorAll('[data-action="react"]');
    reactionBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const reactionType = btn.dataset.reactionType;
        try {
          btn.classList.toggle('active');
          const myName = this.getMyCommunityDisplayName();
          await toggleReaction(post.id, reactionType, this.currentUser.uid, myName, this.role);
        } catch (err) {
          console.error("Error toggling reaction:", err);
          Toast.danger("حدث خطأ أثناء تسجيل التفاعل.");
        }
      });
    });

    // 2. View Reactors Button (Know Who Reacted)
    const viewReactorsBtn = cardEl.querySelector('[data-action="view-reactors"]');
    if (viewReactorsBtn) {
      viewReactorsBtn.addEventListener('click', () => {
        this.openReactorsModal(post.id);
      });
    }

    // View Teacher Followers Button from header badge
    const teacherFollowersBtn = cardEl.querySelector('[data-action="view-teacher-followers"]');
    if (teacherFollowersBtn) {
      teacherFollowersBtn.addEventListener('click', () => {
        const tId = teacherFollowersBtn.dataset.teacherId;
        const tName = teacherFollowersBtn.dataset.teacherName;
        this.openFollowersModal(tId, tName);
      });
    }

    // 3. Comments toggle
    const toggleCommentsBtn = cardEl.querySelector('[data-action="toggle-comments"]');
    if (toggleCommentsBtn) {
      toggleCommentsBtn.addEventListener('click', () => {
        const commentsContainer = document.getElementById(`commentsSection-${post.id}`);
        if (!commentsContainer) return;

        if (this.expandedComments.has(post.id)) {
          this.expandedComments.delete(post.id);
          commentsContainer.style.display = 'none';
        } else {
          this.expandedComments.add(post.id);
          commentsContainer.style.display = 'block';
          this.subscribeCommentsForPost(post.id);
        }
      });
    }

    if (this.expandedComments.has(post.id)) {
      this.subscribeCommentsForPost(post.id);
    }

    // 4. Add comment form
    const commentForm = cardEl.querySelector(`#commentForm-${post.id}`);
    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById(`commentInput-${post.id}`);
        if (!input || !input.value.trim()) return;

        const text = input.value.trim();
        input.value = '';

        try {
          const myName = this.getMyCommunityDisplayName();
          await addPostComment(post.id, {
            text,
            authorId: this.currentUser.uid,
            authorName: myName,
            authorRole: this.role
          });
          Toast.success("تم إرسال تعليقك بنجاح! 💬");
        } catch (err) {
          console.error("Error adding comment:", err);
          Toast.danger(err.message || "فشل إرسال التعليق");
          input.value = text;
        }
      });
    }

    // 5. Admin pin toggle
    const pinBtn = cardEl.querySelector('[data-action="toggle-pin"]');
    if (pinBtn) {
      pinBtn.addEventListener('click', async () => {
        const isPinned = pinBtn.dataset.pinned === 'true';
        try {
          await togglePinPost(post.id, isPinned);
          Toast.success(isPinned ? "تم إلغاء تثبيت المنشور." : "تم تثبيت المنشور في أعلى المجتمع! 📌");
        } catch (err) {
          console.error("Error toggling pin:", err);
          Toast.danger("حدث خطأ أثناء تعديل حالة التثبيت.");
        }
      });
    }

    // 6. Admin comments lock toggle
    const lockBtn = cardEl.querySelector('[data-action="toggle-lock"]');
    if (lockBtn) {
      lockBtn.addEventListener('click', async () => {
        const isLocked = lockBtn.dataset.locked === 'true';
        try {
          await toggleLockComments(post.id, !isLocked);
          Toast.success(isLocked ? "تم فتح التعليقات على المنشور." : "تم قفل التعليقات على المنشور. 🔒");
        } catch (err) {
          console.error("Error toggling lock:", err);
          Toast.danger("حدث خطأ أثناء قفل/فتح التعليقات.");
        }
      });
    }

    // 7. Delete post
    const deleteBtn = cardEl.querySelector('[data-action="delete-post"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        showCustomConfirm({
          title: "حذف المنشور؟",
          message: "هل أنت متأكد من حذف هذا المنشور وجميع التعليقات التابعة له نهائياً؟",
          confirmText: "نعم، احذف",
          confirmClass: "btn-danger",
          onConfirm: async () => {
            try {
              await deleteCommunityPost(post.id, this.currentUser.uid, this.role);
              this.allPosts = this.allPosts.filter(p => p.id !== post.id);
              cardEl.remove();
              this.updateStatsCounters();
              this.updateUserStatsCounters();
              Toast.success("تم حذف المنشور بنجاح. 🗑️");
            } catch (err) {
              console.error("Error deleting post:", err);
              Toast.danger(err.message || "حدث خطأ أثناء حذف المنشور.");
            }
          }
        });
      });
    }

    // 8. Follow/Unfollow Teacher button
    const followBtn = cardEl.querySelector('[data-action="toggle-follow"]');
    if (followBtn) {
      followBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const targetAuthorId = followBtn.dataset.authorId;
        const targetAuthorName = followBtn.dataset.authorName || 'المعلم';

        if (!this.currentUser?.uid) {
          Toast.warning("يرجى تسجيل الدخول أولاً لتتمكن من متابعة المعلمين.");
          return;
        }

        if (targetAuthorId === this.currentUser.uid) {
          Toast.warning("لا يمكنك متابعة نفسك.");
          return;
        }

        followBtn.disabled = true;
        try {
          const myName = this.getMyCommunityDisplayName();
          const res = await toggleFollowTeacher(
            this.currentUser.uid,
            targetAuthorId,
            myName,
            this.role,
            targetAuthorName,
            'teacher'
          );

          if (res.isFollowing) {
            this.followingUserIds.add(targetAuthorId);
            Toast.success(`أنت الآن تتابع ${targetAuthorName} بنجاح ✨`);
          } else {
            this.followingUserIds.delete(targetAuthorId);
            Toast.info(`تم إلغاء متابعة ${targetAuthorName}.`);
          }

          this.updateFollowButtonsUI();
          this.updateUserStatsCounters();

        } catch (err) {
          console.error("Error toggling follow:", err);
          Toast.danger(err.message || "حدث خطأ أثناء تحديث حالة المتابعة.");
        } finally {
          followBtn.disabled = false;
        }
      });
    }
  }

  /**
   * Optimistically update all follow/unfollow buttons in DOM without re-rendering
   */
  updateFollowButtonsUI() {
    const buttons = document.querySelectorAll('[data-action="toggle-follow"]');
    buttons.forEach(btn => {
      const authorId = btn.dataset.authorId;
      if (!authorId) return;

      const isFollowing = this.followingUserIds.has(authorId);
      if (isFollowing) {
        btn.classList.add('following');
        btn.setAttribute('title', 'إلغاء المتابعة');
        btn.innerHTML = `<i data-lucide="user-check" style="width: 13px; height: 13px;"></i><span class="btn-text">مُتابَع ✓</span>`;
      } else {
        btn.classList.remove('following');
        btn.setAttribute('title', 'متابعة المعلم');
        btn.innerHTML = `<i data-lucide="user-plus" style="width: 13px; height: 13px;"></i><span class="btn-text">متابعة +</span>`;
      }
      updateTargetIcons(btn);
    });
  }

  /**
   * Update follower count badges across the page in real-time
   */
  updateFollowerCountBadgesUI() {
    const badges = document.querySelectorAll('[data-follower-count-for]');
    badges.forEach(span => {
      const authorId = span.getAttribute('data-follower-count-for');
      if (authorId) {
        const count = this.followersCountsMap.get(authorId) || 0;
        span.textContent = count;
      }
    });
  }

  /**
   * Subscribe to comments stream for a specific post
   */
  subscribeCommentsForPost(postId) {
    if (this.commentsUnsubs.has(postId)) return;

    const listEl = document.getElementById(`commentsList-${postId}`);

    const unsub = subscribePostComments(postId, (comments) => {
      this.commentsCache.set(postId, comments);
      if (!listEl) return;

      if (comments.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; color: var(--text-muted); padding: 0.6rem; font-size: 0.8rem; background: var(--bg-primary); border-radius: 6px;">
            لا توجد تعليقات بعد، كن أول من يترك تعليقاً!
          </div>
        `;
        return;
      }

      listEl.innerHTML = comments.map(c => {
        const isOfficial = c.authorRole === 'admin';
        const isMyComment = c.authorId === this.currentUser.uid;
        const canDelete = this.isAdmin || isMyComment;
        const timeStr = formatRelativeTimeArabic(c.createdAt);
        const commentAuthor = isMyComment ? this.getMyCommunityDisplayName() : (c.authorName || 'عضو');
        const initials = (commentAuthor || 'م').trim().charAt(0);

        return `
          <div class="comment-item" style="display: flex; gap: 0.6rem; background: var(--bg-primary); padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid var(--border-color); position: relative;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: ${isOfficial ? 'rgba(234,179,8,0.2)' : 'rgba(14,165,233,0.15)'}; color: ${isOfficial ? '#b45309' : 'var(--primary-color)'}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; flex-shrink: 0;">
              ${initials}
            </div>
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <strong style="font-size: 0.84rem; color: var(--text-primary);">${this.escapeHtml(commentAuthor)}</strong>
                  <span class="badge" style="background: ${isOfficial ? 'rgba(234,179,8,0.18)' : 'rgba(14,165,233,0.1)'}; color: ${isOfficial ? '#b45309' : 'var(--primary-color)'}; font-size: 0.65rem; padding: 0.1rem 0.35rem;">
                    ${isOfficial ? 'الإدارة' : 'معلم'}
                  </span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  <span style="font-size: 0.7rem; color: var(--text-muted);">${timeStr}</span>
                  ${canDelete ? `
                    <button type="button" class="btn-icon-subtle" data-action="delete-comment" data-post-id="${postId}" data-comment-id="${c.id}" title="حذف التعليق" style="background: transparent; border: none; cursor: pointer; color: var(--danger); padding: 2px;">
                      <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
                    </button>
                  ` : ''}
                </div>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.5; word-break: break-word;">
                ${this.formatPostText(c.text)}
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Attach comment delete events
      const delBtns = listEl.querySelectorAll('[data-action="delete-comment"]');
      delBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const cId = btn.dataset.commentId;
          showCustomConfirm({
            title: "حذف التعليق؟",
            message: "هل أنت متأكد من رغبتك في حذف هذا التعليق؟",
            confirmText: "حذف",
            confirmClass: "btn-danger",
            onConfirm: async () => {
              try {
                await deletePostComment(postId, cId, this.currentUser.uid, this.role);
                btn.closest('.comment-item')?.remove();
                Toast.success("تم حذف التعليق بنجاح.");
              } catch (err) {
                console.error("Error deleting comment:", err);
                Toast.danger(err.message || "حدث خطأ أثناء حذف التعليق.");
              }
            }
          });
        });
      });

      updateTargetIcons(listEl);
    });

    this.commentsUnsubs.set(postId, unsub);
  }

  // ==========================================
  // REACTORS MODAL (Who Reacted / مين عمل رياكت)
  // ==========================================

  openReactorsModal(postId) {
    this.activeReactorsPostId = postId;
    this.currentReactorFilter = 'all';

    const modal = document.getElementById('reactorsModal');
    if (!modal) return;

    modal.style.display = 'flex';
    this.renderReactorsList();
  }

  closeReactorsModal() {
    const modal = document.getElementById('reactorsModal');
    if (modal) modal.style.display = 'none';
    this.activeReactorsPostId = null;
  }

  renderReactorsList() {
    const post = this.allPosts.find(p => p.id === this.activeReactorsPostId);
    const container = document.getElementById('reactorsModalBody');
    const tabsContainer = document.getElementById('reactorsTabsContainer');
    if (!container || !post) return;

    // Collect all reactors
    const reactorsMap = post.reactors || {};
    let allReactors = Object.values(reactorsMap);

    // Fallback: If older post has reactions arrays with UIDs not in reactorsMap
    const reactions = post.reactions || {};
    Object.keys(reactions).forEach(type => {
      const uids = reactions[type] || [];
      uids.forEach(uid => {
        if (!reactorsMap[uid]) {
          const isMe = uid === this.currentUser.uid;
          const isAuthor = uid === post.authorId;
          const fallbackName = isMe ? this.getMyCommunityDisplayName() : (isAuthor ? (post.authorName || 'المؤلف') : 'معلم معتمد');
          const fallbackRole = isMe ? this.role : (isAuthor ? post.authorRole : 'teacher');
          allReactors.push({
            uid,
            name: fallbackName,
            role: fallbackRole,
            reactionType: type,
            reactedAt: post.updatedAt?.seconds ? post.updatedAt.seconds * 1000 : Date.now()
          });
        }
      });
    });

    // Counts for tabs
    const counts = {
      all: allReactors.length,
      like: allReactors.filter(r => r.reactionType === 'like').length,
      love: allReactors.filter(r => r.reactionType === 'love').length,
      idea: allReactors.filter(r => r.reactionType === 'idea').length,
      clap: allReactors.filter(r => r.reactionType === 'clap').length
    };

    // Render filter tabs
    if (tabsContainer) {
      tabsContainer.innerHTML = `
        <button type="button" class="reactors-tab-btn ${this.currentReactorFilter === 'all' ? 'active' : ''}" data-type="all">
          <span>الكل</span>
          <span class="badge" style="background: rgba(0,0,0,0.06); font-size: 0.7rem; padding: 1px 5px; border-radius: 99px;">${counts.all}</span>
        </button>
        <button type="button" class="reactors-tab-btn ${this.currentReactorFilter === 'like' ? 'active' : ''}" data-type="like">
          <span>👍</span>
          <span class="badge" style="background: rgba(0,0,0,0.06); font-size: 0.7rem; padding: 1px 5px; border-radius: 99px;">${counts.like}</span>
        </button>
        <button type="button" class="reactors-tab-btn ${this.currentReactorFilter === 'love' ? 'active' : ''}" data-type="love">
          <span>❤️</span>
          <span class="badge" style="background: rgba(0,0,0,0.06); font-size: 0.7rem; padding: 1px 5px; border-radius: 99px;">${counts.love}</span>
        </button>
        <button type="button" class="reactors-tab-btn ${this.currentReactorFilter === 'idea' ? 'active' : ''}" data-type="idea">
          <span>💡</span>
          <span class="badge" style="background: rgba(0,0,0,0.06); font-size: 0.7rem; padding: 1px 5px; border-radius: 99px;">${counts.idea}</span>
        </button>
        <button type="button" class="reactors-tab-btn ${this.currentReactorFilter === 'clap' ? 'active' : ''}" data-type="clap">
          <span>👏</span>
          <span class="badge" style="background: rgba(0,0,0,0.06); font-size: 0.7rem; padding: 1px 5px; border-radius: 99px;">${counts.clap}</span>
        </button>
      `;

      tabsContainer.querySelectorAll('.reactors-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.currentReactorFilter = btn.dataset.type;
          this.renderReactorsList();
        });
      });
    }

    // Filter by tab
    let displayList = allReactors;
    if (this.currentReactorFilter !== 'all') {
      displayList = allReactors.filter(r => r.reactionType === this.currentReactorFilter);
    }

    if (displayList.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 2.5rem 1rem;">
          <i data-lucide="heart-off" style="width: 36px; height: 36px; margin-bottom: 0.5rem; opacity: 0.4;"></i>
          <p style="font-size: 0.88rem; margin: 0;">لا يوجد متفاعلون في هذا التصنيف بعد.</p>
        </div>
      `;
      updateTargetIcons(container);
      return;
    }

    container.innerHTML = displayList.map(r => {
      const emoji = REACTION_TYPES[r.reactionType]?.emoji || '👍';
      const isOfficial = r.role === 'admin' || r.role === 'sub_admin';
      const initials = (r.name || 'م').trim().charAt(0);
      const isMe = r.uid === this.currentUser.uid;
      const reactorName = isMe ? this.getMyCommunityDisplayName() : (r.name || 'معلم');

      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; border-bottom: 1px solid var(--border-color); gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div style="position: relative;">
              <div style="width: 38px; height: 38px; border-radius: 50%; background: ${isOfficial ? 'rgba(234, 179, 8, 0.18)' : 'rgba(14, 165, 233, 0.12)'}; color: ${isOfficial ? '#b45309' : 'var(--primary-color)'}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95rem;">
                ${initials}
              </div>
              <span style="position: absolute; bottom: -3px; right: -3px; font-size: 0.9rem; line-height: 1;">${emoji}</span>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                <strong style="font-size: 0.88rem; color: var(--text-primary);">${this.escapeHtml(reactorName)}</strong>
                ${isMe ? `<span class="badge" style="background: rgba(16,185,129,0.15); color: #059669; font-size: 0.65rem;">أنت</span>` : ''}
              </div>
              <span class="badge" style="background: ${isOfficial ? 'rgba(234, 179, 8, 0.18)' : 'rgba(14, 165, 233, 0.1)'}; color: ${isOfficial ? '#b45309' : 'var(--primary-color)'}; font-size: 0.65rem; padding: 0.1rem 0.35rem; margin-top: 0.2rem; display: inline-block;">
                ${isOfficial ? '👑 الإدارة العامة' : '👨‍🏫 معلم معتمد'}
              </span>
            </div>
          </div>
          <span style="font-size: 1.15rem;">${emoji}</span>
        </div>
      `;
    }).join('');

    updateTargetIcons(container);
  }

  // ==========================================
  // FOLLOWERS & FOLLOWING MODALS
  // ==========================================

  async openFollowersModal(teacherId, teacherName) {
    const modal = document.getElementById('followersModal');
    const container = document.getElementById('followersModalList');
    const titleEl = document.getElementById('followersModalTitle');
    if (!modal || !container) return;

    if (titleEl) {
      const isMe = teacherId === this.currentUser.uid;
      titleEl.textContent = isMe ? 'قائمة المتابعين لحسابي (Followers)' : `المتابعون للمعلم: ${teacherName || ''}`;
    }

    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <div class="spinner" style="margin: 0 auto 0.5rem auto; width: 24px; height: 24px; border-width: 2px;"></div>
        <p style="font-size: 0.85rem;">جاري تحميل قائمة المتابعين...</p>
      </div>
    `;

    modal.style.display = 'flex';

    try {
      const list = await getTeacherFollowersList(teacherId);
      if (list.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; color: var(--text-muted); padding: 2.5rem 1rem;">
            <i data-lucide="users" style="width: 38px; height: 38px; margin-bottom: 0.5rem; opacity: 0.35;"></i>
            <p style="font-size: 0.9rem; font-weight: 700; margin: 0 0 0.25rem 0;">لا يوجد متابعون بعد</p>
            <p style="font-size: 0.78rem; margin: 0;">شارك أفكاراً وتجارب مميزة في المجتمع لزيادة متابعيك!</p>
          </div>
        `;
        updateTargetIcons(container);
        return;
      }

      container.innerHTML = list.map(item => {
        const isMe = item.followerId === this.currentUser.uid;
        const isFollowingHim = this.followingUserIds.has(item.followerId);
        const followerDisplay = isMe ? this.getMyCommunityDisplayName() : (item.followerName || 'معلم');
        const initials = (followerDisplay || 'م').trim().charAt(0);

        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-bottom: 1px solid var(--border-color); gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(14, 165, 233, 0.15); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95rem;">
                ${initials}
              </div>
              <div>
                <strong style="font-size: 0.88rem; color: var(--text-primary);">${this.escapeHtml(followerDisplay)}</strong>
                <div style="font-size: 0.7rem; color: var(--text-muted);">معلم معتمد بالمنظومة</div>
              </div>
            </div>

            ${!isMe ? `
              <button type="button" class="btn-follow ${isFollowingHim ? 'following' : ''}" data-action="modal-toggle-follow" data-target-id="${item.followerId}" data-target-name="${this.escapeHtml(item.followerName)}">
                <i data-lucide="${isFollowingHim ? 'user-check' : 'user-plus'}" style="width: 12px; height: 12px;"></i>
                <span>${isFollowingHim ? 'مُتابَع ✓' : 'رد المتابعة +'}</span>
              </button>
            ` : `<span class="badge" style="background: rgba(16,185,129,0.15); color: #059669; font-size: 0.7rem;">حسابك</span>`}
          </div>
        `;
      }).join('');

      // Attach follow back handlers
      container.querySelectorAll('[data-action="modal-toggle-follow"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const tId = btn.dataset.targetId;
          const tName = btn.dataset.targetName;
          btn.disabled = true;
          try {
            const myName = this.getMyCommunityDisplayName();
            const res = await toggleFollowTeacher(this.currentUser.uid, tId, myName, this.role, tName, 'teacher');
            if (res.isFollowing) {
              this.followingUserIds.add(tId);
              btn.classList.add('following');
              btn.innerHTML = `<i data-lucide="user-check" style="width: 12px; height: 12px;"></i><span>مُتابَع ✓</span>`;
              Toast.success(`تمت متابعة ${tName} بنجاح ✨`);
            } else {
              this.followingUserIds.delete(tId);
              btn.classList.remove('following');
              btn.innerHTML = `<i data-lucide="user-plus" style="width: 12px; height: 12px;"></i><span>رد المتابعة +</span>`;
              Toast.info(`تم إلغاء متابعة ${tName}.`);
            }
            this.updateFollowButtonsUI();
            this.updateUserStatsCounters();
            updateTargetIcons(btn);
          } catch (err) {
            Toast.danger("خطأ في تحديث المتابعة: " + err.message);
          } finally {
            btn.disabled = false;
          }
        });
      });

      updateTargetIcons(container);

    } catch (err) {
      container.innerHTML = `<p style="color: var(--danger); text-align: center; padding: 1rem;">فشل التحميل: ${err.message}</p>`;
    }
  }

  closeFollowersModal() {
    const modal = document.getElementById('followersModal');
    if (modal) modal.style.display = 'none';
  }

  async openFollowingModal(userId) {
    const modal = document.getElementById('followingModal');
    const container = document.getElementById('followingModalList');
    if (!modal || !container) return;

    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <div class="spinner" style="margin: 0 auto 0.5rem auto; width: 24px; height: 24px; border-width: 2px;"></div>
        <p style="font-size: 0.85rem;">جاري تحميل قائمة المتابَعين...</p>
      </div>
    `;

    modal.style.display = 'flex';

    try {
      const list = await getTeacherFollowingList(userId);
      if (list.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; color: var(--text-muted); padding: 2.5rem 1rem;">
            <i data-lucide="user-x" style="width: 38px; height: 38px; margin-bottom: 0.5rem; opacity: 0.35;"></i>
            <p style="font-size: 0.9rem; font-weight: 700; margin: 0 0 0.25rem 0;">أنت لا تتابع أحداً حالياً</p>
            <p style="font-size: 0.78rem; margin: 0;">تابع زملاءك المعلمين لمشاهدة منشوراتهم وتجاربهم فور نشرها!</p>
          </div>
        `;
        updateTargetIcons(container);
        return;
      }

      container.innerHTML = list.map(item => {
        const initials = (item.followingName || 'م').trim().charAt(0);

        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-bottom: 1px solid var(--border-color); gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); color: #059669; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95rem;">
                ${initials}
              </div>
              <div>
                <strong style="font-size: 0.88rem; color: var(--text-primary);">${item.followingName}</strong>
                <div style="font-size: 0.7rem; color: var(--text-muted);">معلم معتمد بالأكاديمية</div>
              </div>
            </div>

            <button type="button" class="btn-follow following" data-action="modal-unfollow" data-target-id="${item.followingId}" data-target-name="${item.followingName}">
              <i data-lucide="user-x" style="width: 12px; height: 12px;"></i>
              <span>إلغاء المتابعة</span>
            </button>
          </div>
        `;
      }).join('');

      container.querySelectorAll('[data-action="modal-unfollow"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const tId = btn.dataset.targetId;
          const tName = btn.dataset.targetName;
          btn.disabled = true;
          try {
            await toggleFollowTeacher(this.currentUser.uid, tId);
            this.followingUserIds.delete(tId);
            btn.closest('div').style.opacity = '0.4';
            btn.textContent = 'تم الإلغاء';
            Toast.info(`تم إلغاء متابعة ${tName}.`);
            this.updateFollowButtonsUI();
            this.updateUserStatsCounters();
          } catch (err) {
            Toast.danger("خطأ: " + err.message);
          }
        });
      });

      updateTargetIcons(container);

    } catch (err) {
      container.innerHTML = `<p style="color: var(--danger); text-align: center; padding: 1rem;">فشل التحميل: ${err.message}</p>`;
    }
  }

  closeFollowingModal() {
    const modal = document.getElementById('followingModal');
    if (modal) modal.style.display = 'none';
  }

  // ==========================================
  // EDIT COMMUNITY PROFILE MODAL
  // ==========================================

  openEditProfileModal() {
    const modal = document.getElementById('editCommunityProfileModal');
    const inputName = document.getElementById('editCommunityNameInput');
    const inputTitle = document.getElementById('editCommunityTitleInput');
    const lblRealName = document.getElementById('modalRealAccountNameLabel');
    const btnReset = document.getElementById('btnResetToOriginalName');
    if (!modal) return;

    const realName = this.currentUser.realName || this.currentUser.name || (this.isAdmin ? 'مدير الأكاديمية' : 'معلم معتمد');

    if (lblRealName) {
      lblRealName.textContent = realName;
    }

    if (inputName) {
      inputName.value = this.currentUser.communityDisplayName || '';
      inputName.placeholder = realName;
    }
    if (inputTitle) {
      inputTitle.value = this.currentUser.communityTitle || '';
    }

    if (btnReset) {
      btnReset.onclick = () => {
        if (inputName) {
          inputName.value = '';
          inputName.focus();
        }
      };
    }

    modal.style.display = 'flex';
    setTimeout(() => inputName?.focus(), 150);
  }

  closeEditProfileModal() {
    const modal = document.getElementById('editCommunityProfileModal');
    if (modal) modal.style.display = 'none';
  }

  async handleEditProfileSubmit(e) {
    e.preventDefault();
    const inputName = document.getElementById('editCommunityNameInput');
    const inputTitle = document.getElementById('editCommunityTitleInput');
    const submitBtn = document.getElementById('btnSubmitEditProfile');

    const newName = inputName?.value.trim() || '';
    const newTitle = inputTitle?.value.trim() || '';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<div class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></div> <span>جاري الحفظ...</span>`;
    }

    try {
      await updateCommunityProfile(this.currentUser.uid, {
        communityDisplayName: newName || null,
        communityTitle: newTitle
      });

      // Update ONLY communityDisplayName and communityTitle; preserve official account name!
      this.currentUser.communityDisplayName = newName || null;
      this.currentUser.communityTitle = newTitle;

      this.updateProfileCardDOM();
      this.closeEditProfileModal();

      if (newName) {
        Toast.success("تم حفظ اسم الظهور في مجتمع الأكاديمية بنجاح! ✨ (اسمك الرسمي في المنظومة محفوظ كما هو)");
      } else {
        Toast.success("تمت العودة لاستخدام اسمك الرسمي في مجتمع المعلمين.");
      }

      // Re-render feed to reflect new name in my posts if any
      this.renderPostsList();

    } catch (err) {
      console.error("Error updating community profile:", err);
      Toast.danger(err.message || "حدث خطأ أثناء حفظ التعديلات.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i data-lucide="check"></i> <span>حفظ اسم الظهور</span>`;
        updateTargetIcons(submitBtn);
      }
    }
  }

  // ==========================================
  // CREATE POST MODAL
  // ==========================================

  openCreatePostModal() {
    const modal = document.getElementById('createPostModal');
    if (!modal) return;
    modal.style.display = 'flex';

    const contentInput = document.getElementById('postContentInput');
    if (contentInput) {
      setTimeout(() => contentInput.focus(), 150);
    }
  }

  closeCreatePostModal() {
    const modal = document.getElementById('createPostModal');
    if (modal) modal.style.display = 'none';
    const form = document.getElementById('createPostForm');
    if (form) form.reset();
    const titleInput = document.getElementById('postTitleInput');
    const contentInput = document.getElementById('postContentInput');
    if (titleInput) titleInput.value = '';
    if (contentInput) contentInput.value = '';
  }

  /**
   * Handle Create Post Form Submit
   */
  async handleCreatePostSubmit(e) {
    e.preventDefault();

    const titleInput = document.getElementById('postTitleInput');
    const contentInput = document.getElementById('postContentInput');
    const categorySelect = document.getElementById('postCategorySelect');
    const pinCheckbox = document.getElementById('postPinCheckbox');
    const allowCommentsCheckbox = document.getElementById('postAllowCommentsCheckbox');
    const submitBtn = document.getElementById('btnSubmitCreatePost');

    const title = titleInput ? titleInput.value.trim() : '';
    const content = contentInput ? contentInput.value.trim() : '';
    const category = categorySelect ? categorySelect.value : 'general';
    const isPinned = Boolean(pinCheckbox && pinCheckbox.checked);
    const allowComments = allowCommentsCheckbox ? allowCommentsCheckbox.checked : true;

    if (!content) {
      Toast.warning("يرجى كتابة محتوى المنشور.");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <div class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></div>
        <span>جاري النشر...</span>
      `;
    }

    try {
      const myName = this.getMyCommunityDisplayName();
      await createCommunityPost({
        title,
        content,
        category,
        authorId: this.currentUser.uid,
        authorName: myName,
        authorRole: this.role,
        authorPhotoURL: this.currentUser.photoURL || this.currentUser.photoUrl || this.currentUser.avatar || '',
        isPinned: this.isAdmin && isPinned,
        isOfficial: this.isAdmin && (category === 'announcement' || isPinned),
        allowComments
      });

      if (this.isAdmin) {
        Toast.success("تم نشر التوجيه وإرسال إشعار فوري لجميع المعلمين بنجاح! 🚀");
      } else {
        Toast.success("تم نشر مشاركتك في ملتقى الأكاديمية بنجاح! 🚀");
      }

      if (titleInput) titleInput.value = '';
      if (contentInput) contentInput.value = '';
      this.closeCreatePostModal();
    } catch (err) {
      console.error("Error creating community post:", err);
      Toast.danger(err.message || "حدث خطأ أثناء نشر المنشور.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <i data-lucide="send"></i>
          <span>نشر المشاركة</span>
        `;
        updateTargetIcons(submitBtn);
      }
    }
  }

  /**
   * Cleanup listeners on destroy
   */
  destroy() {
    if (this.postsUnsub) this.postsUnsub();
    if (this.followingUnsub) this.followingUnsub();
    if (this.followersMapUnsub) this.followersMapUnsub();
    this.commentsUnsubs.forEach(unsub => {
      if (typeof unsub === 'function') unsub();
    });
    this.commentsUnsubs.clear();
  }
}
