import { auth, db } from '../../config/firebase.js';
import { showCustomConfirm } from '../utils/helpers.js';
import { removeFCMTokenOnLogout } from '../utils/fcmManager.js';
import { renderBottomNav } from './bottomNav.js';
import { dataStore } from '../data/dataStore.js';

let unsubscribeSidebarSessions = null;
let unsubscribeSidebarStudents = null;
let unsubscribeSidebarGroups = null;

function normalizeArabicDay(dayStr) {
  if (!dayStr) return '';
  return String(dayStr).trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه');
}

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
          { id: 'today-sessions', label: 'الحصص الجارية اليوم', icon: 'play-circle', path: 'today-sessions.html' },
          { id: 'teachers', label: 'المعلمون', icon: 'users', path: 'teachers.html' },
          { id: 'teacher-schedules', label: 'جداول المعلمين والشواغر', icon: 'calendar-clock', path: 'teacher-schedules.html' },
          { id: 'students', label: 'الطلاب والدارسون', icon: 'graduation-cap', path: 'students.html' },
          { id: 'groups', label: 'المجموعات الجماعية', icon: 'users-round', path: 'groups.html' },
          { id: 'transfer-students', label: 'نقل الطلاب', icon: 'arrow-left-right', path: 'transfer-students.html' }
        ]
      },
      {
        title: 'المالية والرواتب',
        items: [
          { id: 'earnings', label: 'الأرباح', icon: 'trending-up', path: 'earnings.html' },
          { id: 'sessions', label: 'سجل الحصص', icon: 'calendar', path: 'sessions.html' },
          { id: 'payments', label: 'المدفوعات والمستحقات', icon: 'wallet', path: 'payments.html' },
          { id: 'subscriptions', label: 'الاشتراكات النشطة', icon: 'credit-card', path: 'subscriptions.html' },
          { id: 'salary-archive', label: 'أرشيف الرواتب', icon: 'banknote', path: 'salary-archive.html' },
          { id: 'payroll-reconciliation', label: 'مطابقة الرواتب', icon: 'scale', path: 'payroll-reconciliation.html' }
        ]
      },
      {
        title: 'التقارير والنظام',
        items: [
          { id: 'feedback', label: 'فيدباك المعلمين', icon: 'messages-square', path: 'feedback.html' },
          { id: 'notifications', label: 'إدارة وتعميم الإشعارات', icon: 'bell', path: 'notifications.html' },
          { id: 'investigation', label: 'مركز التحقيق وإدارة العمليات', icon: 'search-check', path: 'investigation.html' },
          { id: 'permissions', label: 'صلاحيات المشرفين', icon: 'shield-check', path: 'permissions.html' },
          { id: 'reports', label: 'التقارير المالية', icon: 'bar-chart-3', path: 'reports.html' },
          { id: 'academy-reports', label: 'تقارير الأداء العام', icon: 'file-text', path: 'academy-reports.html' },
          { id: 'version-history', label: 'التغييرات والتعديلات', icon: 'history', path: 'version-history.html' },
          { id: 'trash', label: 'سلة المحذوفات', icon: 'trash-2', path: 'trash.html' },
          { id: 'settings', label: 'الإعدادات العامة', icon: 'settings', path: 'settings.html' },
          { id: 'blackbox', label: 'سجل النظام المحمي', icon: 'box', path: 'blackbox.html' }
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
          { id: 'groups', label: 'المجموعات الجماعية', icon: 'users-round', path: 'groups.html' },
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
  const roleBadge = role === 'admin' 
    ? '<span class="sidebar-role-badge admin">الإدارة المركزية</span>' 
    : '<span class="sidebar-role-badge teacher">بوابة المعلم</span>';

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

  const todayWidgetHtml = role === 'admin' ? `
    <div class="sidebar-section" style="margin-top: 0.5rem; border-top: 1px dashed var(--border-color); padding-top: 0.75rem;">
      <div class="sidebar-section-title" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="window.location.href='../admin/today-sessions.html'">
        <span style="display: flex; align-items: center; gap: 0.35rem; color: var(--text-primary); font-weight: 800;">
          <i data-lucide="play-circle" style="width: 14px; height: 14px; color: var(--primary-color);"></i>
          الحصص الجارية اليوم
        </span>
        <span id="sidebarTodayCountBadge" style="font-size: 0.65rem; padding: 2px 7px; border-radius: 10px; background: var(--primary-color); color: white; font-weight: 800;">0</span>
      </div>
      <div id="sidebarTodaySessionsList" style="display: flex; flex-direction: column; gap: 0.45rem; max-height: 240px; overflow-y: auto; padding: 0.25rem 0.2rem; margin-top: 0.25rem;">
        <div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 0.5rem;">جاري التحميل...</div>
      </div>
    </div>
  ` : '';

  sidebarEl.innerHTML = `
    <div class="sidebar-header">
      <div class="logo logo-interactive" style="display: flex; align-items: center; justify-content: center; width: 100%; height: auto;">
        ${headerHtml}
      </div>
    </div>
    <div class="sidebar-menu">
      ${menuHtml}
      ${todayWidgetHtml}
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
          if (auth.currentUser) {
            await removeFCMTokenOnLogout(auth.currentUser.uid).catch(e => console.warn(e));
          }
          await auth.signOut();
          window.location.href = '/index.html';
        } catch (error) {
          console.error("Error signing out:", error);
        }
      });
    });
  }

  if (role === 'admin') {
    initSidebarAdminTodaySessions();
  }

  // Render responsive Mobile Bottom Navigation
  try {
    renderBottomNav(activePage, role);
  } catch (err) {
    console.warn("Bottom nav render warning:", err);
  }

  // Store last visited page for persistent PWA app restore
  try {
    localStorage.setItem('sabeel_last_page', window.location.pathname);
  } catch (e) {}

  // Trigger Lucide icons creation
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function initSidebarAdminTodaySessions() {
  const container = document.getElementById('sidebarTodaySessionsList');
  if (!container) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const todayArabic = arabicDays[new Date().getDay()];

  if (unsubscribeSidebarSessions) { unsubscribeSidebarSessions(); unsubscribeSidebarSessions = null; }
  if (unsubscribeSidebarStudents) { unsubscribeSidebarStudents(); unsubscribeSidebarStudents = null; }
  if (unsubscribeSidebarGroups) { unsubscribeSidebarGroups(); unsubscribeSidebarGroups = null; }

  let sessionsTodayCache = [];
  let studentsTodayCache = [];
  let groupsTodayCache = [];

  const updateSidebarUI = () => {
    const itemsMap = new Map();

    // 1. Add group sessions scheduled for today
    groupsTodayCache.forEach(grp => {
      const recordedGS = sessionsTodayCache.find(s => s.groupId === grp.id || s.groupSessionId === grp.id);
      let statusBadge = '<span class="badge badge-info" style="font-size:0.65rem; padding:1px 5px;">مجدولة</span>';
      if (recordedGS) {
        statusBadge = '<span class="badge badge-success" style="font-size:0.65rem; padding:1px 5px;">تمت</span>';
      }

      itemsMap.set(`grp_${grp.id}`, {
        title: grp.name || 'مجموعة جماعية',
        teacherName: grp.teacherName || 'غير معين',
        time: grp.time || '05:30 مساءً',
        statusBadge
      });
    });

    // 2. Add individual scheduled students (excluding group students)
    studentsTodayCache.forEach(st => {
      const recorded = sessionsTodayCache.find(s => s.studentId === st.id);
      
      let statusBadge = '';
      if (recorded) {
        if (recorded.status === 'completed') {
          statusBadge = '<span class="badge badge-success" style="font-size:0.65rem; padding:1px 5px;">تمت</span>';
        } else if (recorded.status === 'student_absent') {
          statusBadge = '<span class="badge badge-warning" style="font-size:0.65rem; padding:1px 5px;">غياب</span>';
        } else if (recorded.status === 'delayed') {
          if (recorded.postponedFrom === todayStr && recorded.date !== todayStr) {
            statusBadge = `<span class="badge badge-warning" style="font-size:0.65rem; padding:1px 5px;">مؤجلة (${recorded.date})</span>`;
          } else {
            statusBadge = '<span class="badge badge-warning" style="font-size:0.65rem; padding:1px 5px;">مؤجلة</span>';
          }
        } else {
          statusBadge = '<span class="badge badge-danger" style="font-size:0.65rem; padding:1px 5px;">ملغاة</span>';
        }
      } else {
        statusBadge = '<span class="badge badge-info" style="font-size:0.65rem; padding:1px 5px;">مجدولة</span>';
      }

      let sessionTime = st.schedule?.uniformTime || st.sessionTime || 'غير محدد';
      if (st.schedule?.differentTimes && st.schedule?.times?.[todayArabic]) {
        sessionTime = st.schedule.times[todayArabic];
      }

      itemsMap.set(st.id, {
        title: st.name || 'طالب',
        teacherName: st.teacherName || recorded?.teacherName || 'غير معين',
        time: sessionTime,
        statusBadge
      });
    });

    function parseTimeToMinutes(timeStr) {
      if (!timeStr || typeof timeStr !== 'string') return 9999;
      const str = timeStr.trim().toLowerCase();
      if (str === 'غير محدد' || !str) return 9999;
      let isPM = str.includes('م') || str.includes('مساء') || str.includes('pm');
      let isAM = str.includes('ص') || str.includes('صباح') || str.includes('am');
      const match = str.match(/(\d{1,2})(?::(\d{2}))?/);
      if (!match) return 9999;
      let hours = parseInt(match[1], 10);
      let minutes = match[2] ? parseInt(match[2], 10) : 0;
      if (isPM && hours < 12) hours += 12;
      else if (isAM && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }

    const list = Array.from(itemsMap.values());
    list.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

    const badge = document.getElementById('sidebarTodayCountBadge');
    if (badge) badge.textContent = list.length;

    if (list.length === 0) {
      container.innerHTML = `
        <div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 0.5rem; background: var(--bg-primary); border-radius: 6px; border: 1px solid var(--border-color);">
          لا توجد حصص مجدولة اليوم (${todayArabic})
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(item => `
      <div style="padding: 0.45rem 0.55rem; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; display: flex; flex-direction: column; gap: 0.2rem; transition: transform 0.15s ease;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.3rem;">
          <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 120px;">
            ${item.title}
          </span>
          ${item.statusBadge}
        </div>
        <div style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.7rem; color: var(--text-secondary);">
          <i data-lucide="user-check" style="width: 11px; height: 11px; color: var(--primary-color); flex-shrink: 0;"></i>
          <span style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">المعلم: <strong style="color: var(--text-primary);">${item.teacherName}</strong></span>
        </div>
      </div>
    `).join('');

    if (window.lucide) {
      try { window.lucide.createIcons({ root: container }); } catch (e) {}
    }
  };

  let updateSidebarTimer = null;
  const debouncedUpdateSidebarUI = () => {
    if (updateSidebarTimer) cancelAnimationFrame(updateSidebarTimer);
    updateSidebarTimer = requestAnimationFrame(updateSidebarUI);
  };

  unsubscribeSidebarSessions = dataStore.subscribe('sessions', (allSessions) => {
    sessionsTodayCache = allSessions.filter(s => s.date === todayStr || s.postponedFrom === todayStr);
    debouncedUpdateSidebarUI();
  });

  unsubscribeSidebarStudents = dataStore.subscribe('students', (allStudents) => {
    studentsTodayCache = [];
    allStudents.forEach(student => {
      if (student.status !== "archived" && student.status !== "Suspended" && student.status !== "pending_approval") {
        if (student.subscriptionType === 'group' || student.groupId) return; // Exclude group students from individual sidebar items
        const scheduleDays = student.schedule?.days || student.sessionDays || [];
        if (scheduleDays.some(sd => normalizeArabicDay(sd) === normalizeArabicDay(todayArabic))) {
          studentsTodayCache.push(student);
        }
      }
    });
    debouncedUpdateSidebarUI();
  });

  unsubscribeSidebarGroups = dataStore.subscribe('groups', (allGroups) => {
    groupsTodayCache = [];
    allGroups.forEach(grp => {
      if (grp.status !== 'archived') {
        const grpDays = grp.day ? [grp.day] : (grp.days || []);
        if (grpDays.some(gd => normalizeArabicDay(gd) === normalizeArabicDay(todayArabic))) {
          groupsTodayCache.push(grp);
        }
      }
    });
    debouncedUpdateSidebarUI();
  });
}

