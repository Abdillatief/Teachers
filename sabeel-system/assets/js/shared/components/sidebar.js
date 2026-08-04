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

  let menuSections = [];

  if (role === 'admin') {
    menuSections = [
      {
        title: 'الرئيسية والإدارة',
        items: [
          { id: 'dashboard', label: 'لوحة التحكم', icon: 'layout-dashboard', path: 'dashboard.html' },
          { id: 'teachers', label: 'المعلمون', icon: 'users', path: 'teachers.html' },
          { id: 'students', label: 'الطلاب والدارسون', icon: 'graduation-cap', path: 'students.html' },
          { id: 'transfer-students', label: 'نقل الطلاب', icon: 'arrow-left-right', path: 'transfer-students.html' }
        ]
      },
      {
        title: 'المالية والرواتب',
        items: [
          { id: 'sessions', label: 'سجل الحصص', icon: 'calendar', path: 'sessions.html' },
          { id: 'payments', label: 'المدفوعات والمستحقات', icon: 'wallet', path: 'payments.html' },
          { id: 'subscriptions', label: 'الاشتراكات النشطة', icon: 'credit-card', path: 'subscriptions.html' },
          { id: 'salary-archive', label: 'أرشيف الرواتب', icon: 'banknote', path: 'salary-archive.html' }
        ]
      },
      {
        title: 'التقارير والنظام',
        items: [
          { id: 'permissions', label: 'صلاحيات المشرفين', icon: 'shield-check', path: 'permissions.html' },
          { id: 'reports', label: 'التقارير المالية', icon: 'bar-chart-3', path: 'reports.html' },
          { id: 'academy-reports', label: 'تقارير الأداء العام', icon: 'file-text', path: 'academy-reports.html' },
          { id: 'version-history', label: 'التغييرات والتعديلات', icon: 'history', path: 'version-history.html' },
          { id: 'trash', label: 'سلة المحذوفات', icon: 'trash-2', path: 'trash.html' },
          { id: 'settings', label: 'الإعدادات العامة', icon: 'settings', path: 'settings.html' }
        ]
      }
    ];
  } else if (role === 'teacher') {
    menuSections = [
      {
        title: 'الأنشطة والحصص',
        items: [
          { id: 'dashboard', label: 'لوحة التحكم', icon: 'layout-dashboard', path: 'dashboard.html' },
          { id: 'weekly-schedule', label: 'جدول الحصص الأسبوعي', icon: 'calendar-range', path: 'weekly-schedule.html' },
          { id: 'today-sessions', label: 'الحصص الجارية اليوم', icon: 'play-circle', path: 'today-sessions.html' },
          { id: 'sessions', label: 'سجل الحصص والأرشيف', icon: 'calendar-days', path: 'sessions.html' }
        ]
      },
      {
        title: 'الطلاب والتقويم',
        items: [
          { id: 'students', label: 'الطلاب والدارسون', icon: 'users', path: 'students.html' },
          { id: 'calendar', label: 'التقويم الدراسي', icon: 'calendar', path: 'calendar.html' }
        ]
      },
      {
        title: 'المالية والحساب',
        items: [
          { id: 'current-salary', label: 'المرتب الحالي والمحاسبة', icon: 'wallet', path: 'current-salary.html' },
          { id: 'salary-archive', label: 'أرشيف الرواتب الشخصي', icon: 'banknote', path: 'salary-archive.html' },
          { id: 'profile', label: 'الملف الشخصي', icon: 'user', path: 'profile.html' }
        ]
      }
    ];
  }

  const menuHtml = menuSections.map(section => {
    const itemsHtml = section.items.map(item => {
      const isActive = item.id === activePage ? 'active' : '';
      return `
        <li>
          <a href="${prefix}${item.path}" class="sidebar-menu-item ${isActive}">
            <div class="sidebar-item-icon">
              <i data-lucide="${item.icon}"></i>
            </div>
            <span>${item.label}</span>
          </a>
        </li>
      `;
    }).join('');

    return `
      <div class="sidebar-section">
        <div class="sidebar-section-title">${section.title}</div>
        <ul class="sidebar-menu-list">
          ${itemsHtml}
        </ul>
      </div>
    `;
  }).join('');

  const cachedLogoUrl = localStorage.getItem('academy_logo_url');
  const cachedAcademyName = localStorage.getItem('academy_name') || 'سبيل';
  const cachedAcademyDesc = localStorage.getItem('academy_desc') || '';
  const roleBadge = role === 'admin' 
    ? '<span class="sidebar-role-badge admin">لوحة الإدارة والإشراف 👑</span>' 
    : '<span class="sidebar-role-badge teacher">بوابة المعلم المعتمد 🎓</span>';

  let headerHtml = '';
  if (cachedLogoUrl) {
    headerHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; gap: 0.3rem; text-align: center;">
        <img src="${cachedLogoUrl}" class="academy-logo-img" style="max-height: 48px; max-width: 100%; object-fit: contain; transition: all 0.3s ease;" alt="Logo">
        <div class="sidebar-brand-text" style="display: flex; flex-direction: column; align-items: center; gap: 0.1rem; width: 100%;">
          <span style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary); line-height: 1.2;">${cachedAcademyName}</span>
          ${roleBadge}
        </div>
      </div>
    `;
  } else {
    headerHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; gap: 0.3rem; text-align: center;">
        <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
          <i data-lucide="graduation-cap" style="width: 26px; height: 26px; color: var(--primary-color); flex-shrink: 0;"></i>
          <span class="sidebar-brand-text" style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">${cachedAcademyName}</span>
        </div>
        ${roleBadge}
      </div>
    `;
  }

  sidebarEl.innerHTML = `
    <div class="sidebar-header">
      <div class="logo logo-interactive" style="display: flex; align-items: center; justify-content: center; width: 100%; height: auto;">
        ${headerHtml}
      </div>
    </div>
    <div class="sidebar-menu">
      ${menuHtml}
    </div>
    
    <div class="sidebar-footer">
      <button class="btn btn-secondary" id="logoutBtn" style="width: 100%; color: var(--danger); border-color: rgba(239, 68, 68, 0.2); justify-content: center; font-weight: 600;">
        <i data-lucide="log-out" style="width: 16px; height: 16px;"></i>
        <span>تسجيل الخروج</span>
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
