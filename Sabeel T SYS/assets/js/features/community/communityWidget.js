/**
 * Sabeel Academy - Community Dashboard Widget (كارت أحدث منشورات المجتمع في الداشبورد)
 * Version: 1.0.0
 * Renders the latest community post for Admin and Teacher dashboards.
 */

import { subscribeLatestCommunityPost, formatRelativeTimeArabic, POST_CATEGORIES, REACTION_TYPES } from './communityService.js';
import { updateTargetIcons } from '../../shared/utils/perfUtils.js';

/**
 * Initializes and renders the community widget into a container.
 * @param {string} containerId - Element ID where the widget will be rendered.
 * @param {object} options - { role: 'admin' | 'teacher', currentUserId: string }
 * @returns {Function} Unsubscribe listener function
 */
export function initCommunityDashboardWidget(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return () => {};

  const role = options.role || 'teacher';
  const communityPath = role === 'admin' ? '../admin/community.html' : '../teacher/community.html';

  const unsub = subscribeLatestCommunityPost((latestPost) => {
    if (!latestPost) {
      container.innerHTML = `
        <div class="card" style="border-right: 4px solid var(--primary-color); padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="background: rgba(14, 165, 233, 0.12); color: var(--primary-color); width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                <i data-lucide="messages-square" style="width: 18px; height: 18px;"></i>
              </div>
              <h3 style="margin: 0; font-size: 1rem; font-weight: 800; color: var(--text-primary);">
                مجتمع الأكاديمية والملتقى
              </h3>
            </div>
            <a href="${communityPath}" class="btn btn-secondary btn-sm" style="font-size: 0.78rem;">
              <span>فتح المجتمع</span>
              <i data-lucide="arrow-left" style="width: 13px; height: 13px;"></i>
            </a>
          </div>

          <div style="text-align: center; padding: 1.5rem 1rem; background: var(--bg-primary); border-radius: 8px; border: 1px dashed var(--border-color);">
            <i data-lucide="message-square-plus" style="width: 32px; height: 32px; color: var(--text-muted); margin-bottom: 0.5rem;"></i>
            <p style="margin: 0 0 0.75rem 0; font-size: 0.85rem; color: var(--text-secondary);">
              لا توجد منشورات حتى الآن في مجتمع الأكاديمية. كن أول من يشارك فكرة أو إعلاناً!
            </p>
            <a href="${communityPath}?action=new" class="btn btn-primary btn-sm" style="font-weight: 700;">
              <i data-lucide="pen-tool" style="width: 14px; height: 14px;"></i>
              <span>نشر أول مشاركة الآن</span>
            </a>
          </div>
        </div>
      `;
      updateTargetIcons(container);
      return;
    }

    // Process post details
    const categoryInfo = POST_CATEGORIES[latestPost.category] || POST_CATEGORIES.general;
    const timeAgo = formatRelativeTimeArabic(latestPost.createdAt);
    const isPinned = Boolean(latestPost.isPinned);
    const isOfficial = Boolean(latestPost.isOfficial || latestPost.authorRole === 'admin');

    // Calculate reactions total
    const reactions = latestPost.reactions || {};
    let totalReactions = 0;
    const activeEmojis = [];
    Object.keys(REACTION_TYPES).forEach(key => {
      const count = Array.isArray(reactions[key]) ? reactions[key].length : 0;
      if (count > 0) {
        totalReactions += count;
        activeEmojis.push(`${REACTION_TYPES[key].emoji} ${count}`);
      }
    });

    const commentsCount = latestPost.commentsCount || 0;
    const snippet = (latestPost.content || '').length > 200 
      ? (latestPost.content || '').substring(0, 197) + '...' 
      : (latestPost.content || '');

    const authorInitials = (latestPost.authorName || 'م').trim().charAt(0);
    const authorBadgeBg = isOfficial ? 'rgba(234, 179, 8, 0.15)' : 'rgba(14, 165, 233, 0.12)';
    const authorBadgeColor = isOfficial ? '#b45309' : 'var(--primary-color)';
    const borderColor = isPinned ? '#eab308' : (isOfficial ? 'var(--primary-color)' : 'var(--border-color)');

    container.innerHTML = `
      <div class="card" style="border-right: 4px solid ${borderColor}; padding: 1.25rem; transition: transform var(--transition-fast);">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <div style="background: rgba(14, 165, 233, 0.12); color: var(--primary-color); width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <i data-lucide="messages-square" style="width: 18px; height: 18px;"></i>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <h3 style="margin: 0; font-size: 1rem; font-weight: 800; color: var(--text-primary);">
                  آخر ما نُشر في مجتمع الأكاديمية
                </h3>
                ${isPinned ? `<span class="badge" style="background: rgba(234, 179, 8, 0.18); color: #854d0e; font-size: 0.7rem; font-weight: 800; border: 1px solid rgba(234, 179, 8, 0.3);">📌 إعلان مثبت</span>` : ''}
              </div>
              <span style="font-size: 0.72rem; color: var(--text-muted);">ملتقى الإدارة والمعلمين لطرح الأفكار والتواصل</span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <a href="${communityPath}?action=new" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.3rem 0.65rem;" title="كتابة منشور جديد">
              <i data-lucide="plus" style="width: 13px; height: 13px;"></i>
              <span>${role === 'admin' ? 'نشر إعلان' : 'مشاركة فكرة'}</span>
            </a>
            <a href="${communityPath}" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.3rem 0.65rem;">
              <span>تصفح المجتمع</span>
              <i data-lucide="arrow-left" style="width: 13px; height: 13px;"></i>
            </a>
          </div>
        </div>

        <!-- Post Content Preview Box -->
        <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem;">
          
          <!-- Post Meta -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: ${authorBadgeBg}; color: ${authorBadgeColor}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95rem; border: 1px solid ${authorBadgeColor}40;">
                ${authorInitials}
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <strong style="font-size: 0.88rem; color: var(--text-primary);">${latestPost.authorName || 'عضو بالأكاديمية'}</strong>
                  <span class="badge" style="background: ${authorBadgeBg}; color: ${authorBadgeColor}; font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.4rem;">
                    ${isOfficial ? '👑 الإدارة العامة' : '👨‍🏫 معلم معتمد'}
                  </span>
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.4rem; margin-top: 0.1rem;">
                  <span><i data-lucide="clock" style="width: 11px; height: 11px; vertical-align: middle;"></i> ${timeAgo}</span>
                  <span>•</span>
                  <span style="color: var(--primary-color); font-weight: 600;">${categoryInfo.label}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Title & Body Snippet -->
          ${latestPost.title ? `<h4 style="margin: 0 0 0.35rem 0; font-size: 0.95rem; font-weight: 800; color: var(--text-primary); line-height: 1.4;">${latestPost.title}</h4>` : ''}
          <p style="margin: 0 0 0.75rem 0; font-size: 0.84rem; color: var(--text-secondary); line-height: 1.6; white-space: pre-line;">
            ${snippet}
          </p>

          <!-- Interaction Footer -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.65rem; margin-top: 0.65rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem; font-size: 0.78rem; color: var(--text-muted);">
              <span title="إجمالي التفاعلات">
                ${activeEmojis.length > 0 ? activeEmojis.join(' ') : '👍 0'}
              </span>
              <span>•</span>
              <span title="عدد التعليقات">
                💬 ${commentsCount} ${commentsCount === 1 ? 'تعليق' : 'تعليقات'}
              </span>
            </div>

            <a href="${communityPath}?postId=${latestPost.id}" class="btn btn-primary btn-sm" style="font-size: 0.78rem; font-weight: 700; padding: 0.35rem 0.85rem; gap: 0.35rem;">
              <span>فتح المنشور والمناقشة</span>
              <i data-lucide="arrow-left" style="width: 13px; height: 13px;"></i>
            </a>
          </div>

        </div>

      </div>
    `;

    updateTargetIcons(container);
  });

  return unsub;
}
