import { auth, db } from '../../config/firebase.js';
import { showCustomConfirm } from '../utils/helpers.js';

let unsubscribeSupervisorBadges = null;

/**
 * Dedicated sidebar navigation exclusively for Supervisors.
 * Reflects live permissions granted by administration.
 * Strictly isolates supervisors from system administration, general settings,
 * financials, payroll, and user credentials.
 */
export function renderSupervisorSidebar(activePage) {
  const sidebarEl = document.getElementById('appSidebar');
  if (!sidebarEl) return;

  let sessionUser = null;
  let perms = {};
  try {
    const raw = sessionStorage.getItem('sabeel_user_session');
    if (raw) {
      sessionUser = JSON.parse(raw);
      perms = sessionUser.permissions || {};
    }
  } catch (e) {}

  // Determine allowed menu items based on actual permissions (Strict Opt-in Whitelist)
  const supItems = [
    { id: 'dashboard', label: 'لوحة الإشراف', icon: 'layout-dashboard', path: 'dashboard.html', visible: Boolean(perms.dashboard === true) },
    { id: 'students', label: 'متابعة شؤون الطلاب', icon: 'graduation-cap', path: 'students.html', visible: Boolean(perms.viewStudents === true) },
    { id: 'teachers', label: 'دليل ومتابعة المعلمين', icon: 'users', path: 'teachers.html', visible: Boolean(perms.viewTeachers === true) },
    { id: 'today-sessions', label: 'متابعة حصص اليوم', icon: 'play-circle', path: 'today-sessions.html', visible: Boolean(perms.manageSessions === true) },
    { id: 'sessions', label: 'سجل الحصص المنفذة', icon: 'calendar-check-2', path: 'sessions.html', visible: Boolean(perms.manageSessions === true) },
    { id: 'groups', label: 'حلقات المجموعات', icon: 'users-round', path: 'groups.html', visible: Boolean(perms.manageGroups === true) },
    { id: 'parents', label: 'أولياء الأمور', icon: 'phone-call', path: 'parents.html', visible: Boolean(perms.parents === true || perms.viewParents === true) },
    { id: 'requests', label: 'طلباتي للمدير', icon: 'send', path: 'requests.html', visible: Boolean(perms.requests === true) },
    { id: 'warnings', label: 'التحذيرات التشغيلية', icon: 'alert-triangle', path: 'warnings.html', visible: Boolean(perms.viewInvestigation === true) },
    { id: 'notifications', label: 'مركز الإشعارات', icon: 'bell', path: 'notifications.html', visible: Boolean(perms.sendNotifications === true) }
  ];

  const visibleSupItems = supItems.filter(i => i.visible === true);
  const prefix = '/supervisor/';
  const isFinanceHidden = perms.hideFinancials !== false;

  let html = `
    <div class="sidebar-header" style="padding: 1.25rem 1.5rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color, #1c1d22);">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(2, 132, 199, 0.15); border: 1px solid rgba(2, 132, 199, 0.3); display: flex; align-items: center; justify-content: center; color: var(--primary-color, #0284c7);">
          <i data-lucide="shield-check" style="width: 20px; height: 20px;"></i>
        </div>
        <div>
          <h2 style="font-size: 1rem; font-weight: 700; color: var(--text-primary, #f8fafc); margin: 0;">أكاديمية سَبِيل</h2>
          <div style="display: flex; align-items: center; gap: 0.35rem; margin-top: 2px;">
            <span style="font-size: 0.72rem; color: var(--primary-color, #0284c7); font-weight: 700;">لوحة المشرفين</span>
            ${isFinanceHidden ? '<span style="font-size: 0.65rem; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 1px 5px; border-radius: 4px; font-weight: 700;">تشغيلي نقي</span>' : ''}
          </div>
        </div>
      </div>
    </div>

    <div class="sidebar-content" style="padding: 1rem 0; flex: 1; overflow-y: auto;">
  `;

  if (visibleSupItems.length > 0) {
    html += `
      <div class="sidebar-section" style="margin-bottom: 1.25rem;">
        <div style="padding: 0 1.5rem 0.5rem; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b);">
          الأقسام المصرح بها
        </div>
        <nav style="display: flex; flex-direction: column; gap: 0.25rem; padding: 0 0.75rem;">
    `;

    visibleSupItems.forEach(item => {
      const isActive = item.id === activePage;
      const activeClass = isActive ? 'active' : '';
      const activeStyle = isActive 
        ? 'background: rgba(2, 132, 199, 0.12); color: var(--primary-color, #0284c7); font-weight: 600; border: 1px solid rgba(2, 132, 199, 0.25);' 
        : 'color: var(--text-secondary, #94a3b8);';

      html += `
        <a href="${prefix}${item.path}" class="sidebar-link ${activeClass}" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.85rem; border-radius: 8px; text-decoration: none; font-size: 0.90rem; transition: all 0.15s; ${activeStyle}">
          <i data-lucide="${item.icon}" style="width: 18px; height: 18px;"></i>
          <span style="flex: 1;">${item.label}</span>
        </a>
      `;
    });

    html += `
        </nav>
      </div>
    `;
  } else {
    html += `
      <div style="padding: 2.5rem 1.25rem; text-align: center; color: var(--text-muted);">
        <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(239, 68, 68, 0.1); color: #ef4444; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.75rem;">
          <i data-lucide="shield-alert" style="width: 22px; height: 22px;"></i>
        </div>
        <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">لا توجد أقسام مفعلة</div>
        <p style="font-size: 0.74rem; color: var(--text-muted); line-height: 1.4; margin: 0;">
          لم تقم الإدارة بعد بتفعيل أي أقسام تشغيلية لهذا الحساب.
        </p>
      </div>
    `;
  }

  // Profile link section (always available)
  const isProfileActive = activePage === 'profile';
  html += `
    <div class="sidebar-section" style="margin-top: auto; padding: 0.5rem 0.75rem; border-top: 1px solid var(--border-color, #1c1d22);">
      <a href="${prefix}profile.html" class="sidebar-link ${isProfileActive ? 'active' : ''}" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.85rem; border-radius: 8px; text-decoration: none; font-size: 0.88rem; transition: all 0.15s; ${isProfileActive ? 'background: rgba(2, 132, 199, 0.12); color: var(--primary-color, #0284c7); font-weight: 600;' : 'color: var(--text-secondary, #94a3b8);'}">
        <i data-lucide="user" style="width: 18px; height: 18px;"></i>
        <span style="flex: 1;">الملف الشخصي والحساب</span>
      </a>
    </div>
  `;

  html += `
    </div>

    <div class="sidebar-footer" style="padding: 1rem 1.25rem; border-top: 1px solid var(--border-color, #1c1d22); display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 0.75rem; overflow: hidden;">
        <div style="width: 34px; height: 34px; border-radius: 8px; background: var(--bg-surface, #14161a); border: 1px solid var(--border-color-strong, #2c2f38); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--text-primary, #f8fafc); font-size: 0.85rem;">
          ${(sessionUser?.name || 'م')[0]}
        </div>
        <div style="overflow: hidden;">
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary, #f8fafc); white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">
            ${sessionUser?.name || 'مشرف معتمد'}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted, #64748b);">
            ${sessionUser?.supervisorTitle || 'مشرف إداري'}
          </div>
        </div>
      </div>

      <button id="supervisorLogoutBtn" type="button" title="تسجيل الخروج" style="background: transparent; border: none; color: var(--text-muted, #64748b); cursor: pointer; padding: 0.4rem; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="log-out" style="width: 18px; height: 18px;"></i>
      </button>
    </div>
  `;

  sidebarEl.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();

  const logoutBtn = document.getElementById('supervisorLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const confirmed = await showCustomConfirm({
        title: 'تسجيل الخروج',
        message: 'هل تريد تسجيل الخروج من لوحة تحكم المشرفين؟',
        confirmText: 'نعم، تسجيل الخروج',
        confirmColor: '#dc2626'
      });
      if (confirmed) {
        sessionStorage.removeItem('sabeel_user_session');
        await auth.signOut();
        window.location.href = '/index.html';
      }
    });
  }

  // Live Permission listener for real-time sidebar re-rendering
  const onPermUpdate = () => {
    renderSupervisorSidebar(activePage);
  };
  window.addEventListener('sabeel:permissions-updated', onPermUpdate);
  window.addEventListener('sabeel-permissions-updated', onPermUpdate);
}
