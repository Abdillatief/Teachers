import { auth } from '../../config/firebase.js';
import { showCustomConfirm } from '../utils/helpers.js';

/**
 * Renders the responsive navigation sidebar for Admins and Teachers.
 * @param {string} activePage - The name of the currently active page.
 * @param {string} role - 'admin' or 'teacher'
 */
export function renderSidebar(activePage, role) {
  const sidebarEl = document.getElementById('appSidebar');
  if (!sidebarEl) return;

  const prefix = role === 'admin' ? '../admin/' : '../teacher/';
  const rootPrefix = role === 'admin' ? '../' : '../';

  let menuItems = [];

  if (role === 'admin') {
    menuItems = [
      { id: 'dashboard', label: 'لوحة التحكم', icon: 'layout-dashboard', path: 'dashboard.html' },
      { id: 'admin-requests', label: 'إداري (طلبات الاستعادة)', icon: 'key-round', path: 'admin-requests.html' },
      { id: 'teachers', label: 'المعلمون', icon: 'users', path: 'teachers.html' },
      { id: 'students', label: 'الطلاب والدارسون', icon: 'graduation-cap', path: 'students.html' },
      { id: 'transfer-students', label: 'نقل الطلاب بين المعلمين', icon: 'arrow-left-right', path: 'transfer-students.html' },
      { id: 'sessions', label: 'سجل الحصص', icon: 'calendar', path: 'sessions.html' },
      { id: 'payments', label: 'المدفوعات والمستحقات', icon: 'wallet', path: 'payments.html' },
      { id: 'subscriptions', label: 'الاشتراكات النشطة', icon: 'credit-card', path: 'subscriptions.html' },
      { id: 'salary-archive', label: 'أرشيف الرواتب', icon: 'banknote', path: 'salary-archive.html' },
      { id: 'permissions', label: 'صلاحيات المشرفين', icon: 'shield-check', path: 'permissions.html' },
      { id: 'reports', label: 'التقارير المالية', icon: 'bar-chart-3', path: 'reports.html' },
      { id: 'academy-reports', label: 'تقارير الطلاب والأداء العام', icon: 'file-text', path: 'academy-reports.html' },
      { id: 'version-history', label: 'التغييرات والتعديلات', icon: 'history', path: 'version-history.html' },
      { id: 'trash', label: 'سلة المحذوفات والأرشيف', icon: 'trash-2', path: 'trash.html' },
      { id: 'settings', label: 'الإعدادات العامة', icon: 'settings', path: 'settings.html' }
    ];
  } else if (role === 'teacher') {
    menuItems = [
      { id: 'dashboard', label: 'لوحة التحكم', icon: 'layout-dashboard', path: 'dashboard.html' },
      { id: 'weekly-schedule', label: 'جدول الحصص الأسبوعي', icon: 'calendar-range', path: 'weekly-schedule.html' },
      { id: 'today-sessions', label: 'الحصص الجارية اليوم', icon: 'play-circle', path: 'today-sessions.html' },
      { id: 'sessions', label: 'سجل الحصص والأرشيف', icon: 'calendar-days', path: 'sessions.html' },
      { id: 'students', label: 'الطلاب والدارسون', icon: 'users', path: 'students.html' },
      { id: 'calendar', label: 'التقويم الدراسي', icon: 'calendar', path: 'calendar.html' },
      { id: 'current-salary', label: 'المرتب الحالي والمحاسبة', icon: 'wallet', path: 'current-salary.html' },
      { id: 'salary-archive', label: 'أرشيف الرواتب الشخصي', icon: 'banknote', path: 'salary-archive.html' },
      { id: 'profile', label: 'الملف الشخصي', icon: 'user', path: 'profile.html' }
    ];
  }

  const menuHtml = menuItems.map(item => {
    const isActive = item.id === activePage ? 'active' : '';
    return `
      <li>
        <a href="${prefix}${item.path}" class="sidebar-menu-item ${isActive}">
          <i data-lucide="${item.icon}" style="width: 18px; height: 18px;"></i>
          <span>${item.label}</span>
        </a>
      </li>
    `;
  }).join('');

  const cachedLogoUrl = localStorage.getItem('academy_logo_url');
  const cachedAcademyName = localStorage.getItem('academy_name') || 'سبيل';
  const cachedAcademyDesc = localStorage.getItem('academy_desc') || '';
  
  let headerHtml = '';
  if (cachedLogoUrl) {
    headerHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; gap: 0.4rem; text-align: center;">
        <img src="${cachedLogoUrl}" class="academy-logo-img" style="max-height: 52px; max-width: 100%; object-fit: contain; border-radius: 8px; transition: all 0.3s ease;" alt="Logo">
        <div class="sidebar-brand-text" style="display: flex; flex-direction: column; align-items: center; gap: 0.05rem; width: 100%;">
          <span style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary); line-height: 1.2;">${cachedAcademyName}</span>
          ${cachedAcademyDesc ? `<span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500; text-align: center; max-width: 180px; word-break: break-word; line-height: 1.3;">${cachedAcademyDesc}</span>` : ''}
        </div>
      </div>
    `;
  } else {
    headerHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; gap: 0.4rem; text-align: center;">
        <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
          <i data-lucide="graduation-cap" style="width: 24px; height: 24px; color: var(--primary-color); flex-shrink: 0;"></i>
          <span class="sidebar-brand-text" style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">${cachedAcademyName}</span>
        </div>
        ${cachedAcademyDesc ? `<span class="sidebar-brand-text" style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500; text-align: center; max-width: 180px; word-break: break-word; line-height: 1.3;">${cachedAcademyDesc}</span>` : ''}
      </div>
    `;
  }

  sidebarEl.innerHTML = `
    <div class="sidebar-header" style="height: auto; min-height: 85px; display: flex; align-items: center; justify-content: center; padding: 1rem; border-bottom: 1px solid var(--border-color);">
      <div class="logo logo-interactive" style="display: flex; align-items: center; justify-content: center; width: 100%; height: auto;">
        ${headerHtml}
      </div>
    </div>
    <ul class="sidebar-menu">
      ${menuHtml}
    </ul>
    
    <div class="sidebar-footer" style="padding: 1rem;">
      <style>
        @keyframes logoutGlow {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
            border-color: rgba(239, 68, 68, 0.3);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
            border-color: rgba(239, 68, 68, 0.1);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
            border-color: rgba(239, 68, 68, 0.3);
          }
        }
        .logout-pulse-btn {
          animation: logoutGlow 2.5s infinite ease-in-out;
          border: 1px solid rgba(239, 68, 68, 0.25) !important;
          border-radius: var(--border-radius-sm, 8px) !important;
          padding: 0.6rem 0.8rem !important;
          display: flex !important;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.25s ease-in-out !important;
          width: 100%;
          justify-content: center;
          background: rgba(239, 68, 68, 0.03) !important;
        }
        .logout-pulse-btn:hover {
          background: rgba(239, 68, 68, 0.12) !important;
          border-color: rgba(239, 68, 68, 0.6) !important;
          transform: translateY(-1px);
        }
      </style>
      <button class="sidebar-menu-item logout-pulse-btn" id="logoutBtn" style="border: none; cursor: pointer; text-align: center; font-family: inherit;">
        <i data-lucide="log-out" style="width: 18px; height: 18px; color: var(--danger);"></i>
        <span style="color: var(--danger); font-weight: 700;">تسجيل الخروج</span>
      </button>
    </div>
  `;

  // Bind logout action
  const logoutBtn = sidebarEl.querySelector('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      showCustomConfirm('هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟', async () => {
        try {
          await auth.signOut();
          window.location.href = '/index.html';
        } catch (error) {
          console.error("Error signing out:", error);
        }
      });
    });
  }

  // Trigger Lucide icons creation
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
