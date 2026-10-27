import { auth, db } from '../../config/firebase.js';
import { showCustomConfirm } from '../utils/helpers.js';
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
    let isSubAdmin = false;
    let perms = {};
    try {
      const rawSession = sessionStorage.getItem('sabeel_user_session');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        isSubAdmin = Boolean(parsed.isSubAdmin);
        perms = parsed.permissions || {};
      }
    } catch (e) {}

    const allSections = [
      {
        title: 'الرئيسية والإدارة',
        items: [
          { id: 'dashboard', label: 'لوحة التحكم', icon: 'layout-dashboard', path: 'dashboard.html', visible: true },
          { id: 'community', label: 'مجتمع الأكاديمية والملتقى', icon: 'messages-square', path: 'community.html', visible: true },
          { id: 'today-sessions', label: 'الحصص الجارية اليوم', icon: 'play-circle', path: 'today-sessions.html', visible: !isSubAdmin || perms.manageSessions !== false },
          { id: 'teachers', label: 'المعلمون', icon: 'users', path: 'teachers.html', visible: !isSubAdmin || perms.viewTeachers !== false },
          { id: 'teacher-schedules', label: 'جداول المعلمين والشواغر', icon: 'calendar-clock', path: 'teacher-schedules.html', visible: !isSubAdmin || perms.manageTeacherSchedules === true || perms.viewTeachers !== false },
          { id: 'students', label: 'الطلاب والدارسون', icon: 'graduation-cap', path: 'students.html', visible: !isSubAdmin || perms.viewStudents !== false },
          { id: 'groups', label: 'المجموعات الجماعية', icon: 'users-round', path: 'groups.html', visible: !isSubAdmin || perms.manageGroups !== false },
          { id: 'transfer-students', label: 'نقل الطلاب', icon: 'arrow-left-right', path: 'transfer-students.html', visible: !isSubAdmin || perms.transferStudents === true }
        ]
      },
      {
        title: 'المالية والرواتب',
        items: [
          { id: 'earnings', label: 'المالية والأرباح', icon: 'trending-up', path: 'earnings.html', visible: !isSubAdmin || perms.viewFinancials === true },
          { id: 'sessions', label: 'سجل الحصص', icon: 'calendar', path: 'sessions.html', visible: !isSubAdmin || perms.manageSessions !== false },
          { id: 'payments', label: 'المدفوعات والمستحقات', icon: 'wallet', path: 'payments.html', visible: !isSubAdmin || perms.managePayments === true },
          { id: 'subscriptions', label: 'الاشتراكات النشطة', icon: 'credit-card', path: 'subscriptions.html', visible: !isSubAdmin || perms.manageSubscriptions === true || perms.viewStudents !== false },
          { id: 'salary-archive', label: 'أرشيف الرواتب', icon: 'banknote', path: 'salary-archive.html', visible: !isSubAdmin || perms.manageSalaryArchive === true || perms.managePayroll === true },
          { id: 'payroll-reconciliation', label: 'مطابقة الرواتب', icon: 'scale', path: 'payroll-reconciliation.html', visible: !isSubAdmin || perms.managePayroll === true }
        ]
      },
      {
        title: 'التقارير والنظام',
        items: [
          { id: 'notifications', label: 'إدارة وتوجيه الإشعارات', icon: 'bell', path: 'notifications.html', visible: !isSubAdmin || perms.sendNotifications === true },
          { id: 'feedback', label: 'فيدباك المعلمين', icon: 'messages-square', path: 'feedback.html', visible: true },
          { id: 'investigation', label: 'مركز التحقيق وإدارة العمليات', icon: 'search-check', path: 'investigation.html', visible: !isSubAdmin || perms.viewInvestigation === true },
          { id: 'permissions', label: 'صلاحيات المشرفين', icon: 'shield-check', path: 'permissions.html', visible: !isSubAdmin }, // Forbidden to sub-admins
          { id: 'reports', label: 'التقارير المالية', icon: 'bar-chart-3', path: 'reports.html', visible: !isSubAdmin || perms.viewReports === true },
          { id: 'academy-reports', label: 'تقارير الأداء العام', icon: 'file-text', path: 'academy-reports.html', visible: !isSubAdmin || perms.viewReports === true },
          { id: 'version-history', label: 'التغييرات والتعديلات', icon: 'history', path: 'version-history.html', visible: !isSubAdmin || perms.viewReports === true },
          { id: 'trash', label: 'سلة المحذوفات', icon: 'trash-2', path: 'trash.html', visible: !isSubAdmin },
          { id: 'settings', label: 'الإعدادات العامة', icon: 'settings', path: 'settings.html', visible: !isSubAdmin || perms.editSettings === true },
          { id: 'blackbox', label: 'سجل النظام المحمي', icon: 'box', path: 'blackbox.html', visible: !isSubAdmin || perms.viewInvestigation === true }
        ]
      }
    ];

    menuSections = allSections.map(sec => ({
      title: sec.title,
      items: sec.items.filter(it => it.visible)
    })).filter(sec => sec.items.length > 0);
  } else if (role === 'teacher') {
    menuSections = [
      {
        title: 'الأنشطة والحصص',
        items: [
          { id: 'dashboard', label: 'لوحة التحكم', icon: 'layout-dashboard', path: 'dashboard.html' },
          { id: 'community', label: 'مجتمع الأكاديمية والملتقى', icon: 'messages-square', path: 'community.html' },
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
              <span class="sidebar-badge-count" id="sidebar-badge-${item.id}" style="display: none;">0</span>
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
  
  let isAdminSub = false;
  let supervisorTitle = '';
  try {
    const rawSession = sessionStorage.getItem('sabeel_user_session');
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      isAdminSub = Boolean(parsed.isSubAdmin);
      supervisorTitle = parsed.supervisorTitle || '';
    }
  } catch (e) {}

  const roleBadge = role === 'admin' 
    ? (isAdminSub 
        ? `<span class="sidebar-role-badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); font-size: 0.72rem; padding: 2px 8px; border-radius: 6px; font-weight: 700;">${supervisorTitle || 'مشرف مساعد'}</span>`
        : '<span class="sidebar-role-badge admin">الإدارة المركزية</span>')
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

  // Initialize Dynamic Section Notification Badges (Feature 1: 1-2-3 badge count on section icons)
  try {
    initSidebarBadgeCounts(role);
  } catch (err) {
    console.warn("Sidebar badges init warning:", err);
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

let unsubscribeBadgesList = [];

/**
 * Maps an incoming notification to a specific navigation section ID.
 * @param {Object} n - The notification document
 * @param {string} role - 'admin' or 'teacher'
 * @returns {string|null} - Section ID (e.g. 'teachers', 'permissions', 'sessions')
 */
export function mapNotificationToSection(n, role) {
  if (!n) return null;
  
  // 1. Explicit section / targetSection / category property
  if (n.section) return n.section;
  if (n.targetSection) return n.targetSection;
  if (n.category && ['teachers', 'permissions', 'sessions', 'today-sessions', 'students', 'groups', 'payments', 'subscriptions', 'salary-archive', 'current-salary', 'weekly-schedule', 'feedback', 'community', 'investigation', 'transfer-students', 'earnings'].includes(n.category)) {
    return n.category;
  }

  const link = String(n.deepLink || n.url || '').toLowerCase();
  const type = String(n.type || n.eventType || '').toLowerCase();
  const title = String(n.title || '').toLowerCase();
  const body = String(n.body || n.message || '').toLowerCase();

  // 2. Route / DeepLink inspection
  if (link.includes('teacher-schedules')) return 'teacher-schedules';
  if (link.includes('teachers') || link.includes('teacher-details')) return 'teachers';
  if (link.includes('permissions')) return 'permissions';
  if (link.includes('today-sessions')) return 'today-sessions';
  if (link.includes('weekly-schedule')) return 'weekly-schedule';
  if (link.includes('sessions')) return 'sessions';
  if (link.includes('payments')) return 'payments';
  if (link.includes('subscriptions')) return 'subscriptions';
  if (link.includes('salary-archive')) return role === 'admin' ? 'salary-archive' : 'current-salary';
  if (link.includes('current-salary')) return 'current-salary';
  if (link.includes('payroll-reconciliation')) return 'payroll-reconciliation';
  if (link.includes('groups')) return 'groups';
  if (link.includes('transfer-students')) return 'transfer-students';
  if (link.includes('students') || link.includes('student-archive')) return 'students';
  if (link.includes('feedback')) return 'feedback';
  if (link.includes('community')) return 'community';
  if (link.includes('investigation')) return 'investigation';
  if (link.includes('earnings')) return 'earnings';

  // 3. Type inspection
  if (type.includes('supervisor')) return 'permissions';
  if (type.includes('teacher')) return 'teachers';
  if (type.includes('session')) return 'sessions';
  if (type.includes('payment') || type.includes('receipt')) return 'payments';
  if (type.includes('salary') || type.includes('payroll') || type.includes('payout')) {
    return role === 'admin' ? 'salary-archive' : 'current-salary';
  }
  if (type.includes('schedule')) return role === 'admin' ? 'teacher-schedules' : 'weekly-schedule';
  if (type.includes('group')) return 'groups';
  if (type.includes('student')) return 'students';
  if (type.includes('feedback')) return 'feedback';
  if (type.includes('community') || type.includes('post') || type.includes('comment')) return 'community';

  // 4. Keyword inspection in title / body
  if (title.includes('مشرف') || body.includes('مشرف')) return 'permissions';
  if (title.includes('معلم') || body.includes('معلم جديد') || title.includes('انضمام')) return 'teachers';
  if (title.includes('حصة') || body.includes('حصة')) return 'sessions';
  if (title.includes('إيصال') || title.includes('سند') || title.includes('تحويل') || title.includes('دفع')) {
    if (title.includes('راتب') || title.includes('مرتب')) {
      return role === 'admin' ? 'salary-archive' : 'current-salary';
    }
    return 'payments';
  }
  if (title.includes('اشتراك') || body.includes('اشتراك')) return 'subscriptions';
  if (title.includes('مجموعة') || body.includes('مجموعة')) return 'groups';
  if (title.includes('طالب') || body.includes('طالب جديد')) return 'students';
  if (title.includes('فيدباك') || body.includes('فيدباك')) return 'feedback';
  if (title.includes('ملتقى') || body.includes('ملتقى')) return 'community';

  return null;
}

/**
 * Sets or updates the numerical notification badge on a sidebar/bottom-nav item icon.
 * Displays count as 1, 2, 3... or 99+ when positive, hides when 0.
 * @param {string} itemId - The ID of the menu item (e.g. 'teachers', 'permissions', 'sessions')
 * @param {number} count - The active notification / pending count
 */
export function setSidebarBadge(itemId, count) {
  const badgeEl = document.getElementById(`sidebar-badge-${itemId}`);
  const bottomBadgeEl = document.getElementById(`bottomNav-${itemId}-badge`) || 
                        (itemId === 'today-sessions' ? document.getElementById('bottomNavTodayBadge') : null) || 
                        document.getElementById(`bottom-badge-${itemId}`);
  
  const num = parseInt(count, 10) || 0;
  const label = num > 99 ? '99+' : String(num);

  if (badgeEl) {
    if (num > 0) {
      badgeEl.textContent = label;
      badgeEl.style.display = 'inline-flex';
      badgeEl.title = `${num} إشعار / تنبيه معلق`;
    } else {
      badgeEl.style.display = 'none';
    }
  }

  if (bottomBadgeEl) {
    if (num > 0) {
      bottomBadgeEl.textContent = label;
      bottomBadgeEl.style.display = 'inline-flex';
    } else {
      bottomBadgeEl.style.display = 'none';
    }
  }
}

/**
 * Listens in real-time to Firestore collections via CentralDataStore and updates
 * badge counters (1, 2, 3...) on section icons in the sidebar and bottom nav bar.
 * @param {string} role - 'admin' or 'teacher'
 */
function initSidebarBadgeCounts(role) {
  unsubscribeBadgesList.forEach(unsub => {
    try { if (typeof unsub === 'function') unsub(); } catch (e) {}
  });
  unsubscribeBadgesList = [];

  const sectionNotifCounts = {};
  const sectionEntityCounts = {};

  const allKnownSections = role === 'admin' 
    ? ['dashboard', 'community', 'today-sessions', 'teachers', 'teacher-schedules', 'students', 'groups', 'transfer-students', 'earnings', 'sessions', 'payments', 'subscriptions', 'salary-archive', 'payroll-reconciliation', 'notifications', 'feedback', 'investigation', 'permissions', 'reports', 'academy-reports', 'version-history', 'trash', 'settings', 'blackbox']
    : ['dashboard', 'community', 'weekly-schedule', 'today-sessions', 'sessions', 'students', 'groups', 'calendar', 'current-salary', 'salary-archive', 'profile', 'notifications'];

  let refreshTimer = null;
  const refreshAllBadges = () => {
    if (refreshTimer) cancelAnimationFrame(refreshTimer);
    refreshTimer = requestAnimationFrame(() => {
      allKnownSections.forEach(secId => {
        const notifCount = sectionNotifCounts[secId] || 0;
        const entityCount = sectionEntityCounts[secId] || 0;
        // Total badge count: show notifications count if available, or entity pending items, or max
        const finalCount = Math.max(notifCount, entityCount);
        setSidebarBadge(secId, finalCount);
      });
    });
  };

  if (role === 'admin') {
    // 1. Users: Pending teachers & supervisors
    const unsubUsers = dataStore.subscribe('users', (users) => {
      let pendingTeachers = 0;
      let pendingSupervisors = 0;
      (users || []).forEach(u => {
        if (u.role === 'teacher' && (u.status === 'pending' || u.status === 'pending_approval' || u.approved === false)) {
          pendingTeachers++;
        }
        if (u.role === 'supervisor' && (u.status === 'pending' || u.status === 'pending_approval' || u.approved === false)) {
          pendingSupervisors++;
        }
      });
      sectionEntityCounts['teachers'] = pendingTeachers;
      sectionEntityCounts['permissions'] = pendingSupervisors;
      refreshAllBadges();
    });
    unsubscribeBadgesList.push(unsubUsers);

    // 2. Sessions: unapproved completed sessions & today's pending
    const unsubSessions = dataStore.subscribe('sessions', (sessions) => {
      let unapprovedCompleted = 0;
      const todayStr = new Date().toISOString().split('T')[0];
      let todayPending = 0;
      (sessions || []).forEach(s => {
        if (s.status === 'completed' && s.approved !== true && s.archived !== true) {
          unapprovedCompleted++;
        }
        if (s.date === todayStr && s.approved !== true && s.status === 'completed') {
          todayPending++;
        }
      });
      sectionEntityCounts['sessions'] = unapprovedCompleted;
      sectionEntityCounts['today-sessions'] = todayPending;
      refreshAllBadges();
    });
    unsubscribeBadgesList.push(unsubSessions);

    // 3. Notifications: unread notifications grouped by section
    const unsubNotifs = dataStore.subscribe('notifications', (notifs) => {
      // Reset notification counts
      Object.keys(sectionNotifCounts).forEach(k => { sectionNotifCounts[k] = 0; });
      let totalUnread = 0;
      const currentUid = auth?.currentUser?.uid;

      (notifs || []).forEach(n => {
        const isRead = n.read === true || (Array.isArray(n.readBy) && currentUid && n.readBy.includes(currentUid));
        if (!isRead) {
          const isForMe = !n.recipientId || n.recipientId === 'admin' || n.recipientId === 'all' || n.recipientId === 'admins' || n.recipientId === currentUid;
          if (isForMe) {
            totalUnread++;
            const sec = mapNotificationToSection(n, 'admin');
            if (sec) {
              sectionNotifCounts[sec] = (sectionNotifCounts[sec] || 0) + 1;
            }
          }
        }
      });

      sectionNotifCounts['notifications'] = totalUnread;
      refreshAllBadges();
    });
    unsubscribeBadgesList.push(unsubNotifs);

    // 4. Salary Archive: pending admin transfers
    const unsubSalary = dataStore.subscribe('salaryArchive', (archives) => {
      let pendingTransfers = 0;
      (archives || []).forEach(a => {
        if (a.status === 'pending_admin_transfer' || a.status === 'pending') {
          pendingTransfers++;
        }
      });
      sectionEntityCounts['salary-archive'] = pendingTransfers;
      refreshAllBadges();
    });
    unsubscribeBadgesList.push(unsubSalary);

    // 5. Payments: pending approvals
    const unsubPayments = dataStore.subscribe('payments', (payments) => {
      let pendingPayments = 0;
      (payments || []).forEach(p => {
        if (p.status === 'pending' || p.confirmed === false) {
          pendingPayments++;
        }
      });
      sectionEntityCounts['payments'] = pendingPayments;
      refreshAllBadges();
    });
    unsubscribeBadgesList.push(unsubPayments);

  } else if (role === 'teacher') {
    const currentUid = auth?.currentUser?.uid;
    if (!currentUid) return;

    // 1. Sessions: teacher unapproved completed sessions
    const unsubSessions = dataStore.subscribe('sessions', (sessions) => {
      let pendingTeacherSess = 0;
      (sessions || []).forEach(s => {
        if (s.teacherId === currentUid && s.status === 'completed' && s.approved !== true && s.archived !== true) {
          pendingTeacherSess++;
        }
      });
      sectionEntityCounts['sessions'] = pendingTeacherSess;
      refreshAllBadges();
    });
    unsubscribeBadgesList.push(unsubSessions);

    // 2. Notifications: teacher unread notifications mapped to sections
    const unsubNotifs = dataStore.subscribe('notifications', (notifs) => {
      Object.keys(sectionNotifCounts).forEach(k => { sectionNotifCounts[k] = 0; });
      let totalTeacherUnread = 0;

      (notifs || []).forEach(n => {
        const isRead = n.read === true || (Array.isArray(n.readBy) && currentUid && n.readBy.includes(currentUid));
        if (!isRead) {
          const isForTeacher = n.recipientId === currentUid || n.targetTeacherId === currentUid || n.teacherId === currentUid || n.recipientId === 'teachers' || n.recipientId === 'all';
          if (isForTeacher) {
            totalTeacherUnread++;
            const sec = mapNotificationToSection(n, 'teacher');
            if (sec) {
              sectionNotifCounts[sec] = (sectionNotifCounts[sec] || 0) + 1;
            }
          }
        }
      });

      sectionNotifCounts['notifications'] = totalTeacherUnread;
      refreshAllBadges();
    });
    unsubscribeBadgesList.push(unsubNotifs);

    // 3. User document: check unconfirmed payouts
    const unsubUsers = dataStore.subscribe('users', (users) => {
      const myUser = (users || []).find(u => u.uid === currentUid || u.id === currentUid);
      if (myUser && myUser.paymentProofs) {
        const proofs = myUser.paymentProofs || {};
        const unconfirmed = Object.values(proofs).filter(p => !p.confirmedByTeacher).length;
        sectionEntityCounts['current-salary'] = unconfirmed;
        refreshAllBadges();
      }
    });
    unsubscribeBadgesList.push(unsubUsers);
  }
}


