import { auth, db } from '../../config/firebase.js';
import { collection, onSnapshot, doc, getDoc, updateDoc, query, where, getDocs, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showCustomConfirm } from '../utils/helpers.js';
import { checkAndAutoArchivePreviousMonth } from '../../features/teachers/teachersController.js';
import { TransactionProtector } from '../utils/transactionProtector.js';
import { DraftManager } from '../utils/draftManager.js';
import { UndoManager } from '../utils/undoManager.js';
import { Toast } from '../utils/toast.js';
import { initPWA, promptPWAInstall } from '../utils/pwaManager.js';
import { dataStore } from '../data/dataStore.js';
import { BiometricManager } from '../utils/biometricManager.js';
import { getNotificationEventMeta, playNotificationSound } from '../utils/adminNotificationService.js';
import { subscribeToUserNotifications, isNotificationPermittedForUser } from '../services/notificationService.js';
import { initSessionReminderChecker } from '../utils/reminderService.js';
import './maintenanceBanner.js';

/**
 * Renders the top navigation bar.
 * @param {string} title - The title of the page to display in the navbar.
 * @param {object} userData - Contains user information: { name: string, roleName: string }
 */
export function renderNavbar(title, userData = {}) {
  // Ensure DraftManager scans forms when page/navbar loads
  if (DraftManager && typeof DraftManager.scanAndAttachForms === 'function') {
    setTimeout(() => DraftManager.scanAndAttachForms(), 200);
  }
  const navbarEl = document.getElementById('appNavbar');
  if (!navbarEl) return;

  const name = userData.name || 'المستخدم';
  const roleName = userData.roleName || '';
  const photoURL = userData.photoURL || userData.photoUrl || userData.avatar || '';
  const firstLetter = name.trim().charAt(0) || 'م';

  const avatarContent = photoURL 
    ? `<img src="${photoURL}" alt="${name}" onerror="this.onerror=null; this.parentElement.innerHTML='<span>${firstLetter}</span>';">` 
    : `<span>${firstLetter}</span>`;

  navbarEl.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.85rem;">
      <button id="toggleSidebarBtn" class="navbar-icon-btn" style="display: none;" title="القائمة الجانبية">
        <i data-lucide="menu" style="width: 19px; height: 19px;"></i>
      </button>
      <div class="navbar-brand">
        ${title}
      </div>
    </div>
    
    <div class="navbar-actions">
      <!-- PWA Install Button -->
      <button id="btnInstallPwa" class="navbar-icon-btn pwa-install-btn" title="تثبيت تطبيق سبيل على جهازك" style="display: none; color: var(--primary-color);">
        <i data-lucide="download" style="width: 18px; height: 18px;"></i>
      </button>

      <!-- Theme toggle button -->
      <button id="toggleThemeBtn" class="navbar-icon-btn" title="تبديل المظهر (فاتح / داكن)">
        <i data-lucide="moon" id="themeIcon" style="width: 18px; height: 18px;"></i>
      </button>

      <!-- Notification Center Bell Button & Dropdown -->
      <div class="navbar-notif-wrapper" style="position: relative;">
        <button id="notifBellBtn" class="navbar-icon-btn" title="مركز الإشعارات والتنبيهات" style="position: relative;">
          <i data-lucide="bell" id="notifBellIcon" style="width: 18px; height: 18px;"></i>
          <span id="notifBadge" class="notif-badge" style="display: none; position: absolute; top: -3px; right: -3px; background: #ef4444; color: #fff; font-size: 0.65rem; font-weight: 800; border-radius: 9999px; min-width: 17px; height: 17px; padding: 0 4px; align-items: center; justify-content: center; border: 2px solid var(--bg-surface); line-height: 1;">0</span>
        </button>

        <!-- Dropdown Panel - Compact, Proportionate & Sleek -->
        <div id="notifDropdownPanel" class="notif-dropdown-panel" style="display: none; position: absolute; top: calc(100% + 6px); left: 0; width: 315px; max-width: calc(100vw - 20px); background-color: var(--bg-surface, #ffffff); border: 1px solid var(--border-color); border-radius: 11px; box-shadow: 0 14px 28px -6px rgba(10, 37, 64, 0.22), 0 4px 10px -2px rgba(10, 37, 64, 0.08); z-index: 99999; overflow: hidden; direction: rtl; font-family: inherit;">
          <!-- Header -->
          <div class="notif-dropdown-header" style="padding: 8px 11px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; background-color: var(--bg-secondary, #f0f7fe);">
            <div style="display: flex; align-items: center; gap: 6px;">
              <i data-lucide="bell" style="width: 15px; height: 15px; color: var(--primary-color);"></i>
              <span style="font-weight: 700; font-size: 0.82rem; color: var(--text-primary);">مركز الإشعارات</span>
              <span id="notifPanelUnreadBadge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; font-size: 0.62rem; font-weight: 800; padding: 1px 5px; border-radius: 4px; display: none;">0 جديد</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <button type="button" id="markAllReadBtn" class="btn btn-sm" title="تحديد الكل كمقروء" style="font-size: 0.67rem; padding: 3px 6px; border-radius: 5px; background-color: var(--bg-surface, #ffffff); color: var(--text-secondary); border: 1px solid var(--border-color); cursor: pointer; display: inline-flex; align-items: center; gap: 3px; font-weight: 600;">
                <i data-lucide="check-check" style="width: 12px; height: 12px;"></i>
                قراءة الكل
              </button>
              <button type="button" id="clearAllNotifsBtn" class="btn btn-sm" title="حذف الكل" style="font-size: 0.67rem; padding: 3px 5px; border-radius: 5px; background-color: var(--bg-surface, #ffffff); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); cursor: pointer; display: inline-flex; align-items: center;">
                <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
              </button>
            </div>
          </div>

          <!-- Filter Tabs: All vs Unread -->
          <div class="notif-dropdown-tabs" style="display: flex; border-bottom: 1px solid var(--border-color); background-color: var(--bg-primary, #e6f1fb); padding: 3px 5px; gap: 4px;">
            <button type="button" id="tabNotifAll" class="notif-filter-tab active" style="flex: 1; font-size: 0.7rem; font-weight: 700; border-radius: 5px; padding: 4px 6px; background-color: var(--bg-surface, #ffffff); color: var(--primary-color); border: 1px solid var(--border-color); cursor: pointer; transition: all 0.15s ease;">
              الكل (<span id="notifCountAll">0</span>)
            </button>
            <button type="button" id="tabNotifUnread" class="notif-filter-tab" style="flex: 1; font-size: 0.7rem; font-weight: 600; border-radius: 5px; padding: 4px 6px; background-color: transparent; color: var(--text-muted); border: 1px solid transparent; cursor: pointer; transition: all 0.15s ease;">
              غير المقروء (<span id="notifCountUnread">0</span>)
            </button>
          </div>

          <!-- Notification Items List -->
          <div id="notifDropdownList" style="max-height: 265px; min-height: 70px; overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 5px; background-color: var(--bg-surface, #ffffff);">
            <div style="text-align: center; color: var(--text-muted); font-size: 0.75rem; padding: 1.2rem 0.5rem;">جاري تحميل الإشعارات...</div>
          </div>

          <!-- Footer: 30 days notice & admin link -->
          <div class="notif-dropdown-footer" style="padding: 6px 11px; border-top: 1px solid var(--border-color); background-color: var(--bg-secondary, #f0f7fe); display: flex; align-items: center; justify-content: space-between; font-size: 0.67rem; color: var(--text-muted);">
            <span>الاحتفاظ بآخر 30 يوماً</span>
            <a id="notifAdminManageLink" href="../admin/notifications.html" style="color: var(--primary-color); font-weight: 700; text-decoration: none; display: none; align-items: center; gap: 3px;">
              <span>لوحة الإشعارات</span>
              <i data-lucide="arrow-left" style="width: 11px; height: 11px;"></i>
            </a>
          </div>
        </div>
      </div>
      
      <!-- User profile info (Clickable to profile) -->
      <div class="navbar-user" id="navbarUserBtn" title="الملف الشخصي - انقر للانتقال" style="cursor: pointer;">
        <div class="navbar-avatar" id="navbarUserAvatar">
          ${avatarContent}
        </div>
        <div class="navbar-user-info">
          <span class="navbar-user-name" id="navbarUserName">${name}</span>
          <span class="navbar-user-role" id="navbarUserRole">${roleName}</span>
        </div>
      </div>
    </div>
  `;

  // Inject persistent copyright footer at the bottom of main wrapper
  let copyrightFooter = document.getElementById('sabilixCopyrightFooter');
  if (!copyrightFooter) {
    copyrightFooter = document.createElement('footer');
    copyrightFooter.id = 'sabilixCopyrightFooter';
    copyrightFooter.style.cssText = `
      text-align: center;
      padding: 1.25rem;
      margin-top: 2.5rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      border-top: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      direction: ltr;
      font-family: inherit;
    `;
    copyrightFooter.innerHTML = `
      <span>Designed & Developed for</span>
      <span style="color: var(--primary-color); font-weight: 700;">Sabeel Academy</span>
    `;
    
    const mainWrapper = document.getElementById('mainWrapper') || document.querySelector('.main-wrapper') || document.body;
    mainWrapper.appendChild(copyrightFooter);
  }

  // Handle side bar toggle for mobile and desktop screens
  const toggleBtn = navbarEl.querySelector('#toggleSidebarBtn');
  const sidebar = document.getElementById('appSidebar');
  
  if (toggleBtn && sidebar) {
    // Show toggle button on all screens
    toggleBtn.style.display = 'inline-flex';
    
    const handleResize = () => {
      if (window.innerWidth <= 992) {
        document.body.classList.remove('sidebar-collapsed');
      } else {
        sidebar.classList.remove('active');
        if (localStorage.getItem('sidebar_collapsed') === 'true') {
          document.body.classList.add('sidebar-collapsed');
        } else {
          document.body.classList.remove('sidebar-collapsed');
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // run on load

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.innerWidth <= 992) {
        const isActive = sidebar.classList.toggle('active');
        toggleBackdrop(isActive);
      } else {
        const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
        localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
      }
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 992 && sidebar.classList.contains('active')) {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
          sidebar.classList.remove('active');
          toggleBackdrop(false);
        }
      }
    });

    function toggleBackdrop(show) {
      let backdrop = document.getElementById('sidebar-backdrop');
      if (show) {
        if (!backdrop) {
          backdrop = document.createElement('div');
          backdrop.id = 'sidebar-backdrop';
          backdrop.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 95; backdrop-filter: blur(2px); transition: opacity 0.3s ease; opacity: 0;';
          backdrop.addEventListener('click', () => {
            sidebar.classList.remove('active');
            toggleBackdrop(false);
          });
          document.body.appendChild(backdrop);
        }
        setTimeout(() => backdrop.style.opacity = '1', 10);
      } else {
        if (backdrop) {
          backdrop.style.opacity = '0';
          setTimeout(() => backdrop.remove(), 300);
        }
      }
    }
  }

  // Handle dark mode toggle
  const themeBtn = navbarEl.querySelector('#toggleThemeBtn');
  const themeIcon = navbarEl.querySelector('#themeIcon');
  if (themeBtn) {
    const applyThemeStyles = (isDark) => {
      if (isDark) {
        document.documentElement.classList.add('dark-theme');
        document.body.classList.add('dark-theme');
        if (themeIcon) themeIcon.setAttribute('data-lucide', 'sun');
      } else {
        document.documentElement.classList.remove('dark-theme');
        document.body.classList.remove('dark-theme');
        if (themeIcon) themeIcon.setAttribute('data-lucide', 'moon');
      }
      if (window.lucide) window.lucide.createIcons();
    };

    // Initial load
    const isDark = document.documentElement.classList.contains('dark-theme') || 
                   document.body.classList.contains('dark-theme') || 
                   localStorage.getItem('academy_dark_mode') === 'true';
    applyThemeStyles(isDark);

    themeBtn.addEventListener('click', () => {
      const currentlyDark = document.documentElement.classList.contains('dark-theme') || document.body.classList.contains('dark-theme');
      const nextDark = !currentlyDark;
      localStorage.setItem('academy_dark_mode', nextDark ? 'true' : 'false');
      applyThemeStyles(nextDark);
    });
  }

  // User profile click shortcut
  const userBox = navbarEl.querySelector('.navbar-user');
  if (userBox) {
    userBox.style.cursor = 'pointer';
    userBox.title = 'انقر لفتح الملف الشخصي';
    userBox.addEventListener('click', () => {
      const isTeacher = window.location.pathname.includes('/teacher/');
      const isAdmin = window.location.pathname.includes('/admin/');
      if (isTeacher) {
        window.location.href = '../teacher/profile.html';
      } else if (isAdmin) {
        window.location.href = '../admin/settings.html';
      }
    });
  }

  // Handle PWA Install Button
  const btnInstallPwa = navbarEl.querySelector('#btnInstallPwa');
  if (btnInstallPwa) {
    // Only display if not already running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (!isStandalone) {
      btnInstallPwa.addEventListener('click', () => {
        promptPWAInstall();
      });
    }
  }

  // Listen to notifications in Firestore
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;

    let userRole = null;
    const sessionCache = sessionStorage.getItem('sabeel_user_session');
    if (sessionCache) {
      try {
        const parsed = JSON.parse(sessionCache);
        if (parsed.uid === user.uid) userRole = parsed.role;
      } catch (e) {}
    }

    if (!userRole) {
      if (window.location.pathname.includes('/admin/')) userRole = 'admin';
      else if (window.location.pathname.includes('/teacher/')) userRole = 'teacher';
      else if (window.location.pathname.includes('/parent/')) userRole = 'parent';
      
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
          userRole = userSnap.data().role || userRole;
        }
      } catch (err) {
        console.warn("Failed to read user role for navbar link:", err);
      }
    }

    // Trigger automatic monthly salary reset & archiving check on day 1 / new month start
    checkAndAutoArchivePreviousMonth().catch(err => console.warn("Monthly reset check error:", err));

    // Real-time listener for user profile info (Avatar & Name sync)
    try {
      onSnapshot(doc(db, "users", user.uid), (userDoc) => {
        if (userDoc.exists()) {
          const uData = userDoc.data();
          const liveName = uData.name || user.displayName || name;
          const livePhoto = uData.photoURL || uData.photoUrl || uData.avatar || user.photoURL || '';
          const liveFirstLetter = (liveName || 'م').trim().charAt(0) || 'م';

          const nameEl = navbarEl.querySelector('#navbarUserName');
          const avatarEl = navbarEl.querySelector('#navbarUserAvatar');

          if (nameEl && liveName) {
            nameEl.textContent = liveName;
          }

          if (avatarEl) {
            if (livePhoto) {
              avatarEl.innerHTML = `<img src="${livePhoto}" alt="${liveName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" onerror="this.onerror=null; this.parentElement.innerHTML='<span>${liveFirstLetter}</span>';">`;
            } else {
              avatarEl.innerHTML = `<span>${liveFirstLetter}</span>`;
            }
          }
        }
      });
    } catch (err) {
      console.warn("Error setting up user profile live listener for navbar:", err);
    }

    // Check & prompt biometric setup on mobile devices
    setTimeout(() => {
      try {
        if (typeof BiometricManager !== 'undefined' && BiometricManager?.checkAndPromptMobileSetup) {
          BiometricManager.checkAndPromptMobileSetup({
            uid: user?.uid,
            email: user?.email,
            name: name || user?.displayName || 'مستخدم سبيل',
            role: userRole || 'teacher'
          });
        }
      } catch (bioErr) {
        console.warn("Biometrics setup check failed:", bioErr);
      }
    }, 1200);

    // Notification Center Dropdown Toggle & Filter State
    let activeNotifFilter = 'all'; // 'all' | 'unread'
    let cachedNotificationsList = [];

    const notifBellBtn = navbarEl.querySelector('#notifBellBtn');
    const notifDropdownPanel = navbarEl.querySelector('#notifDropdownPanel');
    const notifAdminManageLink = navbarEl.querySelector('#notifAdminManageLink');

    if (notifAdminManageLink) {
      if (userRole === 'admin' || userRole === 'sub_admin') {
        notifAdminManageLink.href = '../admin/notifications.html';
        const spanText = notifAdminManageLink.querySelector('span');
        if (spanText) spanText.textContent = 'لوحة الإشعارات';
        notifAdminManageLink.style.display = 'inline-flex';
      } else {
        notifAdminManageLink.href = '../teacher/notifications.html';
        const spanText = notifAdminManageLink.querySelector('span');
        if (spanText) spanText.textContent = 'عرض كل الإشعارات';
        notifAdminManageLink.style.display = 'inline-flex';
      }
    }

    if (notifBellBtn && notifDropdownPanel) {
      notifBellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = notifDropdownPanel.style.display === 'block';
        notifDropdownPanel.style.display = isOpen ? 'none' : 'block';
        if (!isOpen && window.lucide) {
          window.lucide.createIcons({ root: notifDropdownPanel });
        }
      });

      document.addEventListener('click', (e) => {
        if (!notifDropdownPanel.contains(e.target) && !notifBellBtn.contains(e.target)) {
          notifDropdownPanel.style.display = 'none';
        }
      });
    }

    // Tabs inside notification panel
    const tabAll = navbarEl.querySelector('#tabNotifAll');
    const tabUnread = navbarEl.querySelector('#tabNotifUnread');

    if (tabAll && tabUnread) {
      tabAll.addEventListener('click', () => {
        activeNotifFilter = 'all';
        tabAll.classList.add('active');
        tabAll.style.backgroundColor = 'var(--bg-surface, #ffffff)';
        tabAll.style.color = 'var(--primary-color)';
        tabAll.style.borderColor = 'var(--border-color)';
        tabUnread.classList.remove('active');
        tabUnread.style.backgroundColor = 'transparent';
        tabUnread.style.color = 'var(--text-muted)';
        tabUnread.style.borderColor = 'transparent';
        renderFilteredList();
      });

      tabUnread.addEventListener('click', () => {
        activeNotifFilter = 'unread';
        tabUnread.classList.add('active');
        tabUnread.style.backgroundColor = 'var(--bg-surface, #ffffff)';
        tabUnread.style.color = 'var(--primary-color)';
        tabUnread.style.borderColor = 'var(--border-color)';
        tabAll.classList.remove('active');
        tabAll.style.backgroundColor = 'transparent';
        tabAll.style.color = 'var(--text-muted)';
        tabAll.style.borderColor = 'transparent';
        renderFilteredList();
      });
    }

    let lastRenderSignature = '';
    const renderFilteredList = () => {
      const listContainer = document.getElementById('notifDropdownList');
      if (!listContainer) return;

      let displayItems = cachedNotificationsList;
      if (activeNotifFilter === 'unread') {
        displayItems = cachedNotificationsList.filter(item => !(item.readBy && item.readBy.includes(user.uid)));
      }

      const currentSignature = `${activeNotifFilter}:${displayItems.map(i => `${i.id}_${Boolean(i.readBy?.includes(user.uid))}_${Boolean(i.isPinned)}`).join('|')}`;
      if (currentSignature === lastRenderSignature && listContainer.children.length > 0) {
        return; // Avoid unnecessary re-rendering
      }
      lastRenderSignature = currentSignature;

      if (displayItems.length === 0) {
        listContainer.innerHTML = `
          <div style="text-align: center; color: var(--text-muted); font-size: 0.76rem; padding: 1.5rem 0.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.45rem; background-color: var(--bg-surface, #ffffff); border-radius: 6px;">
            <i data-lucide="bell-off" style="width: 24px; height: 24px; opacity: 0.45; color: var(--text-muted);"></i>
            <span style="font-weight: 600;">${activeNotifFilter === 'unread' ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات حالياً'}</span>
          </div>`;
        if (window.lucide) {
          window.lucide.createIcons({ root: listContainer });
        }
        return;
      }

      listContainer.innerHTML = displayItems.map(item => {
        const isRead = item.readBy && item.readBy.includes(user.uid);
        const isPinnedForUser = Boolean(item.isPinned) && (!item.unpinnedBy || !item.unpinnedBy.includes(user.uid));
        const meta = getNotificationEventMeta(item);
        
        // Fully SOLID OPAQUE backgrounds (Never transparent)
        let itemClass = 'notif-item';
        let bg = 'var(--bg-secondary, #f0f7fe)';
        let borderRight = `3px solid #94a3b8`;
        let borderStyle = `1px solid var(--border-color, #c7def4)`;
        
        if (isPinnedForUser) {
          itemClass += ' is-pinned';
          bg = '#fefce8';
          borderRight = `4px solid #eab308`;
          borderStyle = `1px solid #fde047`;
        } else if (!isRead) {
          itemClass += ' is-unread';
          bg = '#e0f2fe';
          borderRight = `3px solid ${meta.borderColor || 'var(--primary-color)'}`;
          borderStyle = `1px solid ${meta.borderColor ? meta.borderColor + '55' : '#7dd3fc'}`;
        } else {
          itemClass += ' is-read';
          bg = 'var(--bg-secondary, #f0f7fe)';
        }

        const fontWeight = isRead ? '500' : '700';
        const indicator = isRead ? '' : `<span style="display:inline-block; width:6px; height:6px; background:${isPinnedForUser ? '#eab308' : (meta.color || 'var(--primary-color)')}; border-radius:50%; margin-left:3px; flex-shrink:0;"></span>`;
        
        let timeLabel = 'الآن';
        if (item.createdAt) {
          const d = item.createdAt.seconds ? new Date(item.createdAt.seconds * 1000) : new Date(item.createdAt);
          const diffMinutes = Math.floor((Date.now() - d.getTime()) / 60000);
          if (diffMinutes < 1) timeLabel = 'الآن';
          else if (diffMinutes < 60) timeLabel = `منذ ${diffMinutes} د`;
          else if (diffMinutes < 1440) timeLabel = `منذ ${Math.floor(diffMinutes / 60)} س`;
          else timeLabel = d.toLocaleDateString('ar-EG');
        }

        return `
          <div class="${itemClass}" data-id="${item.id}" style="background-color: ${bg}; padding: 0.45rem 0.6rem; border-radius: 6px; cursor: pointer; border: ${borderStyle}; border-right: ${borderRight}; display: flex; flex-direction: column; gap: 0.2rem; position: relative;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; direction: rtl; padding-left: ${isPinnedForUser ? '56px' : '22px'};">
              <span style="font-weight: ${fontWeight}; font-size: 0.77rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap;">
                <i data-lucide="${isPinnedForUser ? 'pin' : (meta.icon || 'bell')}" style="width: 13px; height: 13px; color: ${isPinnedForUser ? '#b45309' : (meta.color || 'var(--primary-color)')}; flex-shrink: 0;"></i>
                ${indicator} ${item.title || 'إشعار جديد'}
              </span>
              <span style="font-size: 0.62rem; color: var(--text-muted); white-space: nowrap; font-weight: 500;">${timeLabel}</span>
            </div>
            <p style="font-size: 0.71rem; color: var(--text-secondary); line-height: 1.35; margin: 0; text-align: right; padding-left: 20px;">${item.body || item.message || ''}</p>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.15rem; padding-left: 20px; gap: 0.25rem; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 0.25rem; flex-wrap: wrap;">
                ${isPinnedForUser ? `
                  <span class="badge" style="background: rgba(234, 179, 8, 0.2); color: #854d0e; font-size: 0.6rem; font-weight: 800; border: 1px solid rgba(234, 179, 8, 0.45); padding: 0.05rem 0.35rem; border-radius: 3px; display: inline-flex; align-items: center; gap: 0.15rem;">
                    <i data-lucide="pin" style="width: 9px; height: 9px;"></i> مثبت
                  </span>
                ` : ''}
                <span class="badge" style="background: ${meta.badgeBg}; color: ${meta.badgeColor}; font-size: 0.6rem; font-weight: 700; border: 1px solid ${meta.borderColor}33; padding: 0.05rem 0.35rem; border-radius: 3px;">
                  ${meta.label}
                </span>
                ${item.priority === 'urgent' ? `
                  <span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #dc2626; font-size: 0.6rem; font-weight: 800; padding: 0.05rem 0.35rem; border-radius: 3px;">عاجل</span>
                ` : ''}
              </div>

              <!-- Action buttons -->
              <div style="position: absolute; left: 4px; top: 6px; display: flex; align-items: center; gap: 2px;" onclick="event.stopPropagation();">
                ${isPinnedForUser ? `
                  <button class="unpin-single-notif-btn" data-id="${item.id}" style="background: rgba(234, 179, 8, 0.2); border: 1px solid rgba(234, 179, 8, 0.45); cursor: pointer; padding: 0.1rem 0.3rem; display: flex; align-items: center; justify-content: center; border-radius: 3px; color: #854d0e; font-size: 0.6rem; font-weight: 800; gap: 2px;" title="إزالة التثبيت من الأعلى">
                    <i data-lucide="pin-off" style="width: 10px; height: 10px;"></i>
                  </button>
                ` : ''}
                <button class="delete-single-notif-btn" data-id="${item.id}" style="background: none; border: none; cursor: pointer; padding: 0.15rem; display: flex; align-items: center; justify-content: center; border-radius: 3px; color: var(--text-muted);" title="حذف الإشعار">
                  <i data-lucide="x" style="width: 12px; height: 12px;"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      if (window.lucide) {
        window.lucide.createIcons({ root: listContainer });
      }

      // Attach item click for Deep Link & Details
      listContainer.querySelectorAll('.notif-item').forEach(itemEl => {
        itemEl.addEventListener('click', async () => {
          const notifId = itemEl.dataset.id;
          const notification = cachedNotificationsList.find(n => n.id === notifId);
          if (notification) {
            // Mark as read and opened
            if (!notification.readBy || !notification.readBy.includes(user.uid)) {
              updateDoc(doc(db, "notifications", notifId), {
                readBy: arrayUnion(user.uid),
                openedBy: arrayUnion(user.uid)
              }).catch(err => console.error("Error updating read status:", err));
            }

            // Determine Deep Link Destination
            const deepLink = notification.deepLink || notification.url || notification.data?.deepLink || notification.data?.url;
            const type = notification.type || '';
            const isAdminUser = (userRole === 'admin' || userRole === 'sub_admin');

            if (deepLink && deepLink.startsWith('/')) {
              window.location.href = deepLink;
              return;
            }

            if (type.includes('session') || type === 'today-sessions' || type === 'completed_session' || type === 'late_session_recorded') {
              window.location.href = isAdminUser ? '../admin/today-sessions.html' : '../teacher/today-sessions.html';
              return;
            }

            if (type.includes('salary')) {
              window.location.href = isAdminUser ? '../admin/salary-archive.html' : '../teacher/current-salary.html';
              return;
            }

            if (type.includes('community') || notification.postId || notification.data?.postId) {
              const pId = notification.postId || notification.data?.postId;
              const target = isAdminUser ? '../admin/community.html' : '../teacher/community.html';
              window.location.href = pId ? `${target}?postId=${pId}` : target;
              return;
            }

            // Default fallback: show modal details
            showNotificationModalDetails(notification, user);
          }
        });
      });

      // Unpin listeners
      listContainer.querySelectorAll('.unpin-single-notif-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const notifId = btn.dataset.id;
          try {
            await updateDoc(doc(db, "notifications", notifId), {
              unpinnedBy: arrayUnion(user.uid)
            });
            Toast.success("تمت إزالة تثبيت الإشعار بنجاح.");
          } catch (err) {
            console.error("Error unpinning notification:", err);
          }
        });
      });

      // Delete listeners
      listContainer.querySelectorAll('.delete-single-notif-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const notifId = btn.dataset.id;
          try {
            await updateDoc(doc(db, "notifications", notifId), {
              deletedBy: arrayUnion(user.uid)
            });
            Toast.success("تم حذف الإشعار.");
          } catch (err) {
            console.error("Error deleting notification:", err);
          }
        });
      });
    };

    // Function to render items in dropdown
    const renderNotifications = (allNotifications) => {
      const items = [];
      const isAdmin = (userRole === 'admin' || userRole === 'sub_admin');
      const isParent = (userRole === 'parent');
      const isTeacher = (userRole === 'teacher');

      // 30 Days Retention Cutoff
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      allNotifications.forEach(data => {
        // Enforce 30-day retention
        const createdTime = data.createdAt?.seconds 
          ? data.createdAt.seconds * 1000 
          : (new Date(data.createdAt || data.createdAtIso || 0).getTime());

        if (createdTime && (now - createdTime > THIRTY_DAYS_MS)) {
          return; // Skip notifications older than 30 days
        }

        // Apply strict Zero-Leak Authorization Gate: guarantees teachers only see their own notifications
        const isPermitted = isNotificationPermittedForUser(data, user.uid, userRole);
        if (!isPermitted) return;

        // Check if user has soft-deleted this notification
        const isDeleted = data.deletedBy && data.deletedBy.includes(user.uid);
        if (!isDeleted) {
          items.push({ ...data, id: data.id || data.uid || ('notif_' + Math.random().toString(36).substring(2, 9)) });
        }
      });

      // Sort: Pinned first, then Newest first
      items.sort((a, b) => {
        const isPinnedA = Boolean(a.isPinned) && (!a.unpinnedBy || !a.unpinnedBy.includes(user.uid));
        const isPinnedB = Boolean(b.isPinned) && (!b.unpinnedBy || !b.unpinnedBy.includes(user.uid));

        if (isPinnedA && !isPinnedB) return -1;
        if (!isPinnedA && isPinnedB) return 1;

        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (new Date(a.createdAt || 0).getTime());
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (new Date(b.createdAt || 0).getTime());
        return timeB - timeA;
      });

      cachedNotificationsList = items;

      // Unread count
      const unreadCount = items.filter(item => !item.readBy || !item.readBy.includes(user.uid)).length;

      // Play chime if new unread notification arrived
      if (window._sabeelPrevUnreadCount !== undefined && unreadCount > window._sabeelPrevUnreadCount) {
        playNotificationSound();
        const newestUnread = items.find(item => !item.readBy || !item.readBy.includes(user.uid));
        if (newestUnread) {
          Toast.info(`🔔 ${newestUnread.title || 'إشعار جديد'}: ${newestUnread.body || ''}`);
        }
      }
      window._sabeelPrevUnreadCount = unreadCount;

      // Update counters in UI
      const badge = document.getElementById('notifBadge');
      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }

      const panelUnreadBadge = document.getElementById('notifPanelUnreadBadge');
      if (panelUnreadBadge) {
        if (unreadCount > 0) {
          panelUnreadBadge.textContent = `${unreadCount} جديد`;
          panelUnreadBadge.style.display = 'inline-block';
        } else {
          panelUnreadBadge.style.display = 'none';
        }
      }

      const notifCountAll = document.getElementById('notifCountAll');
      if (notifCountAll) notifCountAll.textContent = items.length;

      const notifCountUnread = document.getElementById('notifCountUnread');
      if (notifCountUnread) notifCountUnread.textContent = unreadCount;

      renderFilteredList();
    };

    // Mark all read button trigger
    const markAllBtn = navbarEl.querySelector('#markAllReadBtn');
    if (markAllBtn) {
      markAllBtn.onclick = async () => {
        const unreadItems = cachedNotificationsList.filter(item => !(item.readBy && item.readBy.includes(user.uid)));
        if (unreadItems.length === 0) return;
        try {
          await Promise.all(unreadItems.map(item => 
            updateDoc(doc(db, "notifications", item.id), {
              readBy: arrayUnion(user.uid)
            })
          ));
          Toast.success("تم تحديد جميع الإشعارات كمقروءة.");
        } catch (err) {
          console.error("Error marking all read:", err);
        }
      };
    }

    // Clear all button trigger
    const clearAllBtn = navbarEl.querySelector('#clearAllNotifsBtn');
    if (clearAllBtn) {
      clearAllBtn.onclick = () => {
        if (cachedNotificationsList.length === 0) return;
        showCustomConfirm('هل أنت متأكد من رغبتك في مسح وحذف جميع الإشعارات الحالية من القائمة؟', async () => {
          try {
            await Promise.all(cachedNotificationsList.map(item =>
              updateDoc(doc(db, "notifications", item.id), {
                deletedBy: arrayUnion(user.uid)
              })
            ));
            Toast.success("تم مسح وتنظيف الإشعارات بنجاح.");
          } catch (err) {
            console.error("Error clearing notifications:", err);
          }
        });
      };
    }

    // Per-user isolated notification subscription (Zero leak, reliable real-time updates)
    let notifUnsubscribe = null;
    try {
      notifUnsubscribe = subscribeToUserNotifications(user, userRole, (userNotifications) => {
        renderNotifications(userNotifications);
      });
    } catch (subErr) {
      console.warn("[Navbar] subscribeToUserNotifications error:", subErr);
      dataStore.subscribe('notifications', (allNotifications) => {
        renderNotifications(allNotifications);
      });
    }

    // Initialize session schedule reminder and exact start-time notification runner
    try {
      initSessionReminderChecker();
    } catch (schedErr) {
      console.warn("[Navbar] initSessionReminderChecker error:", schedErr);
    }
  });

  // Trigger Lucide icons creation
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

export function showNotificationModalDetails(notification, currentUser = null) {
  if (!notification) return;
  let modalEl = document.getElementById('notifDetailsModal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'notifDetailsModal';
    modalEl.style.cssText = 'display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;';
    document.body.appendChild(modalEl);
  }

  const isPasswordRequest = notification.type === 'password_reset_request' || notification.teacherPassword || (notification.title && notification.title.includes('استعادة'));
  const isFeedbackRequest = notification.type === 'feedback_request' || Boolean(notification.isFeedbackRequest);
  const isFeedbackSubmitted = notification.type === 'feedback_submitted';
  const isFeedbackReply = notification.type === 'feedback_reply';
  const isPinnedForUser = Boolean(notification.isPinned) && currentUser && (!notification.unpinnedBy || !notification.unpinnedBy.includes(currentUser.uid));

  modalEl.innerHTML = `
    <div class="card modal-card" style="width: 100%; max-width: 520px; position: relative; border-top: 4px solid ${isPinnedForUser ? '#eab308' : (isFeedbackRequest ? '#8b5cf6' : 'var(--primary-color)')}; border: 1px solid var(--border-color); box-shadow: var(--shadow-xl); max-height: 90vh; overflow-y: auto;">
      <button type="button" id="closeNotifDetailsBtn" style="position: absolute; left: 1rem; top: 1rem; background: none; border: none; font-size: 1.4rem; cursor: pointer; color: var(--text-muted);">&times;</button>
      
      <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
        <div style="width: 44px; height: 44px; background: ${isPinnedForUser ? 'rgba(234, 179, 8, 0.15)' : (isFeedbackRequest ? 'rgba(139, 92, 246, 0.15)' : 'var(--primary-light)')}; color: ${isPinnedForUser ? '#b45309' : (isFeedbackRequest ? '#7c3aed' : 'var(--primary-color)')}; border-radius: var(--border-radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i data-lucide="${isPinnedForUser ? 'pin' : (isFeedbackRequest ? 'message-square-plus' : (isPasswordRequest ? 'key-round' : (isFeedbackSubmitted ? 'messages-square' : 'bell')))}" style="width: 22px; height: 22px;"></i>
        </div>
        <div>
          <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin: 0;">${notification.title || 'تفاصيل الإشعار'}</h3>
            ${isPinnedForUser ? `<span class="badge" style="background: rgba(234, 179, 8, 0.2); color: #854d0e; font-size: 0.68rem; font-weight: 800; border: 1px solid rgba(234, 179, 8, 0.45); padding: 0.1rem 0.4rem; border-radius: 4px;">📌 مثبت في أول إشعار</span>` : ''}
            ${isFeedbackRequest ? `<span class="badge" style="background: rgba(139, 92, 246, 0.15); color: #7c3aed; font-size: 0.68rem; font-weight: 800; border: 1px solid rgba(139, 92, 246, 0.3); padding: 0.1rem 0.4rem; border-radius: 4px;">💡 استطلاع رأي</span>` : ''}
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${notification.createdAt ? (notification.createdAt.seconds ? new Date(notification.createdAt.seconds * 1000).toLocaleString('ar-EG') : new Date(notification.createdAt).toLocaleString('ar-EG')) : 'الآن'}</span>
        </div>
      </div>

      ${isPasswordRequest ? `
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: 1rem; margin-bottom: 1rem;">
          <h4 style="font-size: 0.88rem; font-weight: 700; color: var(--primary-color); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="user-check" style="width: 15px; height: 15px;"></i> بيانات حساب المعلم المطلوبة
          </h4>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.85rem; margin-bottom: 0.75rem;">
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 0.72rem;">اسم المعلم:</span>
              <strong style="color: var(--text-primary); font-size: 0.85rem;">${notification.teacherName || 'غير محدد'}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 0.72rem;">رقم الهاتف:</span>
              <strong style="color: var(--text-primary); font-size: 0.85rem;">${notification.teacherPhone || 'غير محدد'}</strong>
            </div>
            <div style="grid-column: span 2;">
              <span style="color: var(--text-muted); display: block; font-size: 0.72rem;">البريد الإلكتروني:</span>
              <strong style="color: var(--primary-color); word-break: break-all; font-size: 0.85rem;">${notification.teacherEmail || 'غير محدد'}</strong>
            </div>
          </div>

          <div style="margin-top: 0.75rem;">
            <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 0.35rem;">كلمة مرور الحساب:</span>
            <div style="background: var(--bg-primary); border: 1px solid var(--border-color); padding: 0.5rem 0.75rem; border-radius: var(--border-radius-sm); font-family: monospace; font-size: 1.05rem; font-weight: 700; color: var(--primary-color); display: flex; align-items: center; justify-content: space-between;">
              <span id="notifPasswordText">${notification.teacherPassword || 'غير مسجلة'}</span>
              <button type="button" class="btn btn-sm btn-secondary" id="copyNotifPasswordBtn">
                <i data-lucide="copy" style="width: 14px; height: 14px;"></i>
                نسخ
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Notification Body -->
      <div style="margin-bottom: 1.25rem;">
        <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">
          ${isFeedbackRequest ? '📝 موضوع وتفاصيل الاستطلاع:' : 'نص الرسالة:'}
        </label>
        <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6; white-space: pre-line; background: var(--bg-primary); border: 1px solid var(--border-color); padding: 0.75rem; border-radius: var(--border-radius-sm); margin: 0;">${notification.body || notification.message || 'لا توجد تفاصيل إضافية'}</p>
      </div>

      <!-- Feedback Interactive Box for Teachers -->
      ${isFeedbackRequest ? `
        <div id="teacherFeedbackInteractiveBox" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: 1rem; margin-bottom: 1rem;">
          <h4 style="font-size: 0.88rem; font-weight: 700; color: #7c3aed; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="message-square-heart" style="width: 16px; height: 16px;"></i>
            شاركنا رأيك ومقترحاتك (فيدباك للإدارة)
          </h4>
          <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.75rem;">
            رأيكم يهمنا ويسهم في تطوير وتحسين جودة العمل بالأكاديمية.
          </p>

          <div style="margin-bottom: 0.75rem;">
            <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 0.35rem;">
              طبيعة الرأي أو التقييم:
            </label>
            <div id="feedbackRatingPills" style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-sm feedback-pill active" data-rating="ممتاز وراضي جداً" style="font-size: 0.72rem; padding: 0.25rem 0.55rem; border-radius: 6px; border: 1px solid #7c3aed; background: rgba(139, 92, 246, 0.15); color: #7c3aed; font-weight: 700;">🌟 ممتاز ومؤيد</button>
              <button type="button" class="btn btn-sm feedback-pill" data-rating="اقتراح تطوير" style="font-size: 0.72rem; padding: 0.25rem 0.55rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-secondary);">💡 اقتراح تطوير</button>
              <button type="button" class="btn btn-sm feedback-pill" data-rating="لدي ملاحظات" style="font-size: 0.72rem; padding: 0.25rem 0.55rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-secondary);">⚠️ لدي ملاحظات</button>
              <button type="button" class="btn btn-sm feedback-pill" data-rating="غير مناسب" style="font-size: 0.72rem; padding: 0.25rem 0.55rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-secondary);">🔴 غير مناسب</button>
            </div>
          </div>

          <div style="margin-bottom: 0.75rem;">
            <label for="teacherFeedbackText" style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 0.35rem;">
              اكتب رأيك ومقترحاتك بالتفصيل:
            </label>
            <textarea id="teacherFeedbackText" rows="3" class="form-input" style="width: 100%; font-size: 0.85rem; line-height: 1.5; resize: vertical; border-radius: 6px; padding: 0.5rem 0.75rem; background: var(--bg-primary);" placeholder="يرجى كتابة رأيك أو استفسارك أو المقترحات التي تود إيصالها للإدارة..."></textarea>
          </div>

          <div style="display: flex; justify-content: flex-end;">
            <button type="button" id="btnSubmitTeacherFeedback" class="btn btn-primary" style="background: #7c3aed; border-color: #7c3aed; font-size: 0.82rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.85rem;">
              <i data-lucide="send" style="width: 14px; height: 14px;"></i>
              إرسال الرأي للإدارة
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Admin Quick Navigation for Feedback Submitted -->
      ${isFeedbackSubmitted ? `
        <div style="background: rgba(2, 132, 199, 0.08); border: 1px solid rgba(2, 132, 199, 0.25); border-radius: var(--border-radius-sm); padding: 0.85rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
          <div>
            <div style="font-size: 0.82rem; font-weight: 700; color: #0284c7;">تم تسجيل رأي جديد في قسم الفيدباك</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">يمكنك مراجعة جميع آراء المعلمين والرد المباشر عليهم من لوحة الفيدباك.</div>
          </div>
          <a href="../admin/feedback.html" class="btn btn-sm btn-primary" style="font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="external-link" style="width: 13px; height: 13px;"></i>
            فتح قسم الفيدباك
          </a>
        </div>
      ` : ''}

      <div style="display: flex; justify-content: flex-end; align-items: center; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.5rem;">
        ${isPinnedForUser ? `
          <button type="button" class="btn btn-secondary" id="modalUnpinBtn" style="color: #854d0e; background: rgba(234, 179, 8, 0.15); border-color: rgba(234, 179, 8, 0.4); font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="pin-off" style="width: 15px; height: 15px;"></i>
            إزالة التثبيت من الأعلى
          </button>
        ` : ''}
        <button type="button" class="btn btn-secondary" id="closeNotifDetailsBtn2">إغلاق</button>
      </div>
    </div>
  `;

  modalEl.style.display = 'flex';
  if (window.lucide) window.lucide.createIcons({ root: modalEl });

  const closeBtn1 = modalEl.querySelector('#closeNotifDetailsBtn');
  const closeBtn2 = modalEl.querySelector('#closeNotifDetailsBtn2');
  const copyBtn = modalEl.querySelector('#copyNotifPasswordBtn');
  const unpinBtn = modalEl.querySelector('#modalUnpinBtn');

  const hideModal = () => { modalEl.style.display = 'none'; };

  if (closeBtn1) closeBtn1.addEventListener('click', hideModal);
  if (closeBtn2) closeBtn2.addEventListener('click', hideModal);

  if (unpinBtn && currentUser) {
    unpinBtn.addEventListener('click', async () => {
      try {
        await updateDoc(doc(db, "notifications", notification.id), {
          unpinnedBy: arrayUnion(currentUser.uid)
        });
        Toast.success("تمت إزالة تثبيت الإشعار بنجاح.");
        hideModal();
      } catch (err) {
        console.error("Error unpinning from modal:", err);
      }
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const pwd = notification.teacherPassword || '';
      if (pwd) {
        try {
          await navigator.clipboard.writeText(pwd);
          Toast.success('تم نسخ كلمة المرور إلى الحافظة بنجاح');
        } catch(e) {
          console.error(e);
        }
      }
    });
  }

  // Handle Feedback Submission
  if (isFeedbackRequest && currentUser) {
    let selectedRating = 'ممتاز وراضي جداً';
    const pillButtons = modalEl.querySelectorAll('.feedback-pill');
    pillButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        pillButtons.forEach(b => {
          b.classList.remove('active');
          b.style.border = '1px solid var(--border-color)';
          b.style.background = 'var(--bg-primary)';
          b.style.color = 'var(--text-secondary)';
          b.style.fontWeight = 'normal';
        });
        btn.classList.add('active');
        btn.style.border = '1px solid #7c3aed';
        btn.style.background = 'rgba(139, 92, 246, 0.15)';
        btn.style.color = '#7c3aed';
        btn.style.fontWeight = '700';
        selectedRating = btn.dataset.rating || 'ممتاز';
      });
    });

    const submitFeedbackBtn = modalEl.querySelector('#btnSubmitTeacherFeedback');
    const feedbackTextInput = modalEl.querySelector('#teacherFeedbackText');

    if (submitFeedbackBtn && feedbackTextInput) {
      submitFeedbackBtn.addEventListener('click', async () => {
        const feedbackText = feedbackTextInput.value.trim();
        if (!feedbackText) {
          Toast.error('يرجى كتابة رأيك ومقترحاتك قبل الإرسال');
          feedbackTextInput.focus();
          return;
        }

        submitFeedbackBtn.disabled = true;
        submitFeedbackBtn.innerHTML = `<span class="loading-spinner" style="width: 14px; height: 14px; margin-left: 5px;"></span> جاري الإرسال...`;

        try {
          let teacherName = currentUser.displayName || '';
          let teacherEmail = currentUser.email || '';
          let teacherPhone = '';

          try {
            const userSnap = await getDoc(doc(db, "users", currentUser.uid));
            if (userSnap.exists()) {
              const uData = userSnap.data();
              teacherName = uData.name || teacherName || 'المعلم';
              teacherEmail = uData.email || teacherEmail;
              teacherPhone = uData.phone || '';
            }
          } catch(e) {}

          await submitTeacherFeedback({
            notificationId: notification.id || '',
            topic: notification.feedbackTopic || notification.title || 'استطلاع رأي',
            question: notification.feedbackQuestion || notification.body || '',
            teacherId: currentUser.uid,
            teacherName: teacherName || 'المعلم',
            teacherEmail: teacherEmail,
            teacherPhone: teacherPhone,
            message: feedbackText,
            rating: selectedRating
          });

          // Mark notification as read
          try {
            await updateDoc(doc(db, "notifications", notification.id), {
              readBy: arrayUnion(currentUser.uid)
            });
          } catch(e) {}

          const feedbackBox = modalEl.querySelector('#teacherFeedbackInteractiveBox');
          if (feedbackBox) {
            feedbackBox.innerHTML = `
              <div style="text-align: center; padding: 1.25rem 0.5rem;">
                <div style="width: 48px; height: 48px; background: rgba(16, 185, 129, 0.15); color: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem auto;">
                  <i data-lucide="check-circle-2" style="width: 26px; height: 26px;"></i>
                </div>
                <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">تم إرسال رأيك بنجاح إلى الإدارة!</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 0.5rem;">نشكرك أستاذنا الفاضل على تفاعلك ومشاركتك القيّمة 🌸</p>
                <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.5rem 0.75rem; text-align: right; font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4;">
                  <strong>رأيك المرسل:</strong> ${feedbackText}
                </div>
              </div>
            `;
            if (window.lucide) window.lucide.createIcons({ root: modalEl });
          }

          Toast.success("تم إرسال رأيك وملاحظاتك إلى الإدارة بنجاح.");
        } catch (err) {
          console.error("Error submitting feedback:", err);
          Toast.error("حدث خطأ أثناء إرسال الرأي: " + err.message);
          submitFeedbackBtn.disabled = false;
          submitFeedbackBtn.innerHTML = `<i data-lucide="send" style="width: 14px; height: 14px;"></i> إعادة المحاولة`;
          if (window.lucide) window.lucide.createIcons({ root: modalEl });
        }
      });
    }
  }
}

