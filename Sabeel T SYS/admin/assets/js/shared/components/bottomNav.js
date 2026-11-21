/**
 * Sabeel Academy - Native Mobile Bottom Navigation Bar
 * Provides an iOS / Android native app bottom bar experience on mobile viewports.
 */

import { auth, db } from '../../config/firebase.js';
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { updateTargetIcons } from '../utils/perfUtils.js';
import { hasPermissionFromSession, PERMISSIONS } from '../../features/rbac/rbacService.js';

let bottomNavUnsub = null;

/**
 * Renders the native bottom navigation bar for mobile devices.
 * @param {string} activePage - e.g. 'dashboard', 'today-sessions', 'students', 'lessons'
 * @param {string} role - 'admin', 'supervisor', or 'teacher'
 */
export function renderBottomNav(activePage, role) {
  let navEl = document.getElementById('appBottomNav');
  if (!navEl) {
    navEl = document.createElement('nav');
    navEl.id = 'appBottomNav';
    navEl.className = 'native-bottom-nav';
    document.body.appendChild(navEl);
  }

  const prefix = role === 'admin' ? '../admin/' : (role === 'supervisor' ? '../supervisor/' : '../teacher/');
  let parsedSession = null;
  try {
    const raw = sessionStorage.getItem('sabeel_user_session');
    if (raw) parsedSession = JSON.parse(raw);
  } catch {}

  let items = [];
  if (role === 'admin') {
    items = [
      { id: 'dashboard', label: 'الرئيسية', icon: 'layout-dashboard', path: 'dashboard.html' },
      { id: 'today-sessions', label: 'حصص اليوم', icon: 'play-circle', path: 'today-sessions.html', badgeId: 'bottomNavTodayBadge' },
      { id: 'students', label: 'الطلاب', icon: 'graduation-cap', path: 'students.html' },
      { id: 'teachers', label: 'المعلمون', icon: 'users', path: 'teachers.html' },
      { id: 'earnings', label: 'المالية', icon: 'trending-up', path: 'earnings.html' }
    ];
  } else if (role === 'supervisor') {
    const candidates = [
      { id: 'dashboard', label: 'الرئيسية', icon: 'layout-dashboard', path: 'dashboard.html', perm: PERMISSIONS.VIEW_SUPERVISOR_DASHBOARD },
      { id: 'lessons', label: 'الحصص', icon: 'book-open', path: 'lessons.html', perm: PERMISSIONS.VIEW_LESSONS },
      { id: 'students', label: 'الطلاب', icon: 'users', path: 'students.html', perm: PERMISSIONS.VIEW_STUDENTS },
      { id: 'schedules', label: 'الجداول', icon: 'calendar-clock', path: 'schedules.html', perm: PERMISSIONS.VIEW_SCHEDULES },
      { id: 'requests', label: 'الطلبات', icon: 'send', path: 'requests.html', perm: PERMISSIONS.CREATE_REQUESTS },
      { id: 'profile', label: 'حسابي', icon: 'user-circle', path: 'profile.html', perm: null }
    ];
    items = candidates.filter((it) => !it.perm || hasPermissionFromSession(it.perm, parsedSession)).slice(0, 5);
  } else if (role === 'teacher') {
    items = [
      { id: 'dashboard', label: 'الرئيسية', icon: 'layout-dashboard', path: 'dashboard.html' },
      { id: 'today-sessions', label: 'حصص اليوم', icon: 'play-circle', path: 'today-sessions.html', badgeId: 'bottomNavTodayBadge' },
      { id: 'weekly-schedule', label: 'الجدول', icon: 'calendar-range', path: 'weekly-schedule.html' },
      { id: 'students', label: 'الطلاب', icon: 'users', path: 'students.html' },
      { id: 'current-salary', label: 'المرتب', icon: 'wallet', path: 'current-salary.html' }
    ];
  }

  const normalizedActive = String(activePage || '').replace(/^supervisor-/, '');
  const itemsHtml = items.map(item => {
    const isActive = item.id === normalizedActive ? 'active' : '';
    const badgeId = item.badgeId || `bottomNav-${item.id}-badge`;
    const badgeHtml = `<span id="${badgeId}" class="bottom-nav-badge" style="display: none;">0</span>`;

    return `
      <a href="${prefix}${item.path}" class="bottom-nav-item ${isActive}" data-nav-id="${item.id}">
        <div class="bottom-nav-icon-box">
          <i data-lucide="${item.icon}"></i>
          ${badgeHtml}
        </div>
        <span class="bottom-nav-label">${item.label}</span>
      </a>
    `;
  }).join('');

  navEl.innerHTML = `
    <div class="bottom-nav-container">
      ${itemsHtml}
    </div>
  `;

  updateTargetIcons(navEl);

  navEl.querySelectorAll('.bottom-nav-item').forEach(link => {
    link.addEventListener('click', () => {
      if (typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(12); } catch {}
      }
    });
  });

  if (role !== 'supervisor') {
    attachTodayBadgeListener(role);
  }
}

function attachTodayBadgeListener(role) {
  if (bottomNavUnsub) {
    bottomNavUnsub();
    bottomNavUnsub = null;
  }

  auth.onAuthStateChanged((user) => {
    if (!user) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const badgeEl = document.getElementById('bottomNavTodayBadge');
    if (!badgeEl) return;

    let q;
    if (role === 'admin') {
      q = query(collection(db, "sessions"), where("date", "==", todayStr));
    } else {
      q = query(collection(db, "sessions"), where("teacherId", "==", user.uid), where("date", "==", todayStr));
    }

    bottomNavUnsub = onSnapshot(q, (snapshot) => {
      const count = snapshot.size;
      if (count > 0) {
        badgeEl.textContent = count > 99 ? '99+' : count;
        badgeEl.style.display = 'inline-flex';
      } else {
        badgeEl.style.display = 'none';
      }
    }, (err) => {
      console.warn("Bottom nav today badge warning:", err);
    });
  });
}
