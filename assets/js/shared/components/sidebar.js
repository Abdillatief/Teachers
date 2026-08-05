import { auth, db } from '../../config/firebase.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showCustomConfirm } from '../utils/helpers.js';
import { removeFCMTokenOnLogout } from '../utils/fcmManager.js';

let unsubscribeSidebarSessions = null;
let unsubscribeSidebarStudents = null;

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
          { id: 'students', label: 'الطلاب والدارسون', icon: 'graduation-cap', path: 'students.html' },
          { id: 'student-archive', label: 'الطلاب المؤرشفين 📦', icon: 'archive', path: 'student-archive.html' },
          { id: 'transfer-students', label: 'نقل الطلاب', icon: 'arrow-left-right', path: 'transfer-students.html' }
        ]
      },
      {
        title: 'إدارة المجموعات التعليمية',
        items: [
          { id: 'groups', label: 'المجموعات الجماعية 👥', icon: 'users-round', path: 'groups.html' }
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
          { id: 'investigation', label: 'مركز التحقيق وإدارة العمليات 🔍', icon: 'search-check', path: 'investigation.html' },
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
        title: 'الطلاب والمجموعات',
        items: [
          { id: 'students', label: 'الطلاب والدارسون', icon: 'users', path: 'students.html' },
          { id: 'groups', label: 'مجموعاتي الجماعية 👥', icon: 'users-round', path: 'groups.html' },
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

  // Trigger Lucide icons creation
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function initSidebarAdminTodaySessions() {
  const container = document.getElementById('sidebarTodaySessionsList');
  if (!container) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const todayArabic = arabicDays[new Date().getDay()];

  if (unsubscribeSidebarSessions) unsubscribeSidebarSessions();
  if (unsubscribeSidebarStudents) unsubscribeSidebarStudents();

  unsubscribeSidebarSessions = onSnapshot(collection(db, "sessions"), (sessSnap) => {
    const sessionsToday = [];
    sessSnap.forEach(d => {
      const data = d.data();
      if (data.date === todayStr) {
        sessionsToday.push({ id: d.id, ...data });
      }
    });

    unsubscribeSidebarStudents = onSnapshot(collection(db, "students"), (studSnap) => {
      const studentsToday = [];
      studSnap.forEach(d => {
        const student = { id: d.id, ...d.data() };
        if (student.status !== "archived" && student.status !== "Suspended" && student.status !== "pending_approval") {
          const scheduleDays = student.schedule?.days || student.sessionDays || [];
          if (scheduleDays.includes(todayArabic)) {
            studentsToday.push(student);
          }
        }
      });

      const itemsMap = new Map();

      // Add scheduled students
      studentsToday.forEach(st => {
        const recorded = sessionsToday.find(s => s.studentId === st.id);
        const isCompleted = recorded ? (recorded.status === 'completed' || recorded.status === 'student_absent') : false;
        
        let statusBadge = '';
        if (recorded) {
          if (recorded.status === 'completed') {
            statusBadge = '<span style="font-size:0.65rem; font-weight:800; color:var(--success); background:rgba(16,185,129,0.15); padding:2px 6px; border-radius:4px;">تمت ✅</span>';
          } else if (recorded.status === 'student_absent') {
            statusBadge = '<span style="font-size:0.65rem; font-weight:800; color:var(--warning); background:rgba(245,158,11,0.15); padding:2px 6px; border-radius:4px;">غياب 🔴</span>';
          } else if (recorded.status === 'delayed') {
            statusBadge = '<span style="font-size:0.65rem; font-weight:800; color:#d97706; background:rgba(217,119,6,0.15); padding:2px 6px; border-radius:4px;">مؤجلة ⏳</span>';
          } else {
            statusBadge = '<span style="font-size:0.65rem; font-weight:800; color:var(--danger); background:rgba(239,68,68,0.15); padding:2px 6px; border-radius:4px;">ملغاة ❌</span>';
          }
        } else {
          statusBadge = '<span style="font-size:0.65rem; font-weight:800; color:#6366f1; background:rgba(99,102,241,0.15); padding:2px 6px; border-radius:4px;">لم تتم ⏳</span>';
        }

        itemsMap.set(st.id, {
          title: st.name || 'طالب',
          teacherName: st.teacherName || recorded?.teacherName || 'غير معين',
          time: st.schedule?.uniformTime || st.sessionTime || 'غير محدد',
          statusBadge
        });
      });

      // Add any logged sessions today that weren't in scheduled students
      sessionsToday.forEach(s => {
        if (!itemsMap.has(s.studentId || s.id)) {
          let statusBadge = '';
          if (s.status === 'completed') {
            statusBadge = '<span style="font-size:0.65rem; font-weight:800; color:var(--success); background:rgba(16,185,129,0.15); padding:2px 6px; border-radius:4px;">تمت ✅</span>';
          } else if (s.status === 'student_absent') {
            statusBadge = '<span style="font-size:0.65rem; font-weight:800; color:var(--warning); background:rgba(245,158,11,0.15); padding:2px 6px; border-radius:4px;">غياب 🔴</span>';
          } else if (s.status === 'delayed') {
            statusBadge = '<span style="font-size:0.65rem; font-weight:800; color:#d97706; background:rgba(217,119,6,0.15); padding:2px 6px; border-radius:4px;">مؤجلة ⏳</span>';
          } else {
            statusBadge = '<span style="font-size:0.65rem; font-weight:800; color:var(--danger); background:rgba(239,68,68,0.15); padding:2px 6px; border-radius:4px;">ملغاة ❌</span>';
          }

          itemsMap.set(s.studentId || s.id, {
            title: s.studentName || 'حصة اليوم',
            teacherName: s.teacherName || 'غير محدد',
            time: s.time || 'غير محدد',
            statusBadge
          });
        }
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

      if (window.lucide) window.lucide.createIcons();
    }, (err) => console.warn("Error fetching students for sidebar:", err));
  }, (err) => console.warn("Error fetching sessions for sidebar:", err));
}

