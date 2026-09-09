/**
 * Sabeel Academy - Community Controller (مجتمع الأكاديمية والملتقى)
 * Version: 1.0.0
 * Powers both Admin and Teacher community interaction, filtering, reactions, and comments.
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
  POST_CATEGORIES, 
  REACTION_TYPES 
} from './communityService.js';
import { Toast } from '../../shared/utils/toast.js';
import { showCustomConfirm } from '../../shared/utils/helpers.js';
import { updateTargetIcons } from '../../shared/utils/perfUtils.js';

export class CommunityController {
  constructor(role = 'teacher', currentUser = {}) {
    this.role = role;
    this.isAdmin = role === 'admin' || role === 'sub_admin';
    this.currentUser = currentUser;

    this.allPosts = [];
    this.currentCategory = 'all';
    this.searchQuery = '';
    this.sortBy = 'newest'; // 'newest' | 'reactions' | 'comments'

    this.expandedComments = new Set();
    this.commentsCache = new Map();
    this.commentsUnsubs = new Map();

    this.postsUnsub = null;
  }

  /**
   * Initialize community page
   */
  init() {
    this.bindEvents();
    this.setupURLParams();
    this.listenToPosts();
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
            لا توجد منشورات مطابقة للبحث أو التصفية
          </h3>
          <p style="color: var(--text-secondary); font-size: 0.88rem; max-width: 420px; margin: 0 auto 1.25rem auto;">
            ${this.searchQuery ? 'جرب البحث بكلمات أخرى أو مسح الفلاتر الحالية.' : 'كن أول من يشارك فكرة، استفساراً، أو توجيهاً تعليمياً لإثراء المجتمع!'}
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

    // Attach dynamic listeners to post cards (reactions, comments, admin actions)
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

    const authorInitials = (post.authorName || 'م').trim().charAt(0);
    const authorBadgeBg = isOfficial ? 'rgba(234, 179, 8, 0.18)' : 'rgba(14, 165, 233, 0.12)';
    const authorBadgeColor = isOfficial ? '#b45309' : 'var(--primary-color)';
    const cardBorderColor = isPinned ? '#eab308' : (isOfficial ? 'var(--primary-color)' : 'var(--border-color)');

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

    const commentsOpen = this.expandedComments.has(post.id);
    const allowComments = post.allowComments !== false;

    return `
      <article id="postCard-${post.id}" class="card community-post-card ${isPinned ? 'pinned-post' : ''}" style="border-right: 4px solid ${cardBorderColor}; padding: 1.35rem; margin-bottom: 1.25rem;">
        
        <!-- Post Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.75rem;">
          
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 42px; height: 42px; border-radius: 50%; background: ${authorBadgeBg}; color: ${authorBadgeColor}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; border: 1.5px solid ${authorBadgeColor}40;">
              ${authorInitials}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                <strong style="font-size: 0.95rem; color: var(--text-primary);">${post.authorName || 'عضو بالأكاديمية'}</strong>
                <span class="badge" style="background: ${authorBadgeBg}; color: ${authorBadgeColor}; font-size: 0.7rem; font-weight: 800; padding: 0.15rem 0.45rem;">
                  ${isOfficial ? '👑 الإدارة العامة' : '👨‍🏫 معلم معتمد'}
                </span>
                ${isPinned ? `<span class="badge" style="background: rgba(234, 179, 8, 0.2); color: #854d0e; font-size: 0.7rem; font-weight: 800; border: 1px solid rgba(234, 179, 8, 0.35);">📌 مثبت بأعلى المجتمع</span>` : ''}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.4rem; margin-top: 0.15rem;">
                <span><i data-lucide="clock" style="width: 12px; height: 12px; vertical-align: middle;"></i> ${timeAgo}</span>
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
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.75rem; flex-wrap: wrap; gap: 0.65rem;">
          
          <!-- Reaction Buttons -->
          <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
            ${reactionButtonsHtml}
          </div>

          <!-- Toggle Comments Button -->
          <div>
            <button type="button" class="btn btn-secondary btn-sm" data-action="toggle-comments" data-post-id="${post.id}" style="font-size: 0.8rem; font-weight: 700; gap: 0.4rem;">
              <i data-lucide="message-square" style="width: 14px; height: 14px;"></i>
              <span>التعليقات (${post.commentsCount || 0})</span>
              <i data-lucide="${commentsOpen ? 'chevron-up' : 'chevron-down'}" style="width: 13px; height: 13px;"></i>
            </button>
          </div>

        </div>

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
            <form id="commentForm-${post.id}" data-post-id="${post.id}" style="display: flex; gap: 0.5rem; align-items: flex-end;">
              <textarea id="commentInput-${post.id}" class="form-control" placeholder="اكتب تعليقك أو استفسارك هنا..." rows="1" style="resize: none; min-height: 40px; font-size: 0.85rem; border-radius: 8px;" required></textarea>
              <button type="submit" class="btn btn-primary" style="padding: 0.55rem 0.95rem; font-size: 0.82rem; font-weight: 700; gap: 0.35rem; white-space: nowrap;">
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
    // Escape HTML first
    const div = document.createElement('div');
    div.textContent = text;
    let safe = div.innerHTML;

    // Convert links to clickable anchors
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
          // Optimistic UI pulse
          btn.classList.toggle('active');
          await toggleReaction(post.id, reactionType, this.currentUser.uid);
        } catch (err) {
          console.error("Error toggling reaction:", err);
          Toast.danger("حدث خطأ أثناء تسجيل التفاعل.");
        }
      });
    });

    // 2. Comments toggle
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

    // If comments section was already expanded, subscribe to its comments
    if (this.expandedComments.has(post.id)) {
      this.subscribeCommentsForPost(post.id);
    }

    // 3. Add comment form
    const commentForm = cardEl.querySelector(`#commentForm-${post.id}`);
    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById(`commentInput-${post.id}`);
        if (!input || !input.value.trim()) return;

        const text = input.value.trim();
        input.value = '';

        try {
          await addPostComment(post.id, {
            text,
            authorId: this.currentUser.uid,
            authorName: this.currentUser.name || (this.isAdmin ? 'الإدارة العامة' : 'معلم معتمد'),
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

    // 4. Admin pin toggle
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

    // 5. Admin comments lock toggle
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

    // 6. Delete post
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
              Toast.success("تم حذف المنشور بنجاح. 🗑️");
            } catch (err) {
              console.error("Error deleting post:", err);
              Toast.danger(err.message || "حدث خطأ أثناء حذف المنشور.");
            }
          }
        });
      });
    }
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
        const canDelete = this.isAdmin || c.authorId === this.currentUser.uid;
        const timeStr = formatRelativeTimeArabic(c.createdAt);
        const initials = (c.authorName || 'م').trim().charAt(0);

        return `
          <div class="comment-item" style="display: flex; gap: 0.6rem; background: var(--bg-primary); padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid var(--border-color); position: relative;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: ${isOfficial ? 'rgba(234,179,8,0.2)' : 'rgba(14,165,233,0.15)'}; color: ${isOfficial ? '#b45309' : 'var(--primary-color)'}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; flex-shrink: 0;">
              ${initials}
            </div>
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <strong style="font-size: 0.84rem; color: var(--text-primary);">${c.authorName || 'عضو'}</strong>
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

  /**
   * Modal management
   */
  openCreatePostModal() {
    const modal = document.getElementById('createPostModal');
    if (!modal) return;
    modal.style.display = 'flex';

    // Focus on content textarea
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
      await createCommunityPost({
        title,
        content,
        category,
        authorId: this.currentUser.uid,
        authorName: this.currentUser.name || (this.isAdmin ? 'الإدارة العامة' : 'معلم معتمد'),
        authorRole: this.role,
        isPinned: this.isAdmin && isPinned,
        isOfficial: this.isAdmin && (category === 'announcement' || isPinned),
        allowComments
      });

      Toast.success("تم نشر المنشور في مجتمع الأكاديمية بنجاح! 🚀");
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
    this.commentsUnsubs.forEach(unsub => {
      if (typeof unsub === 'function') unsub();
    });
    this.commentsUnsubs.clear();
  }
}
