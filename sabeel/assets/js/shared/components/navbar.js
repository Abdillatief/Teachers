import { auth, db } from '../../config/firebase.js';
import { collection, onSnapshot, doc, getDoc, updateDoc, arrayUnion, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showCustomConfirm } from '../utils/helpers.js';
import { initSessionReminderChecker, requestBrowserNotificationPermission } from '../utils/reminderService.js';
import { initAndSyncFCM } from '../utils/fcmManager.js';
import { checkAndAutoArchivePreviousMonth } from '../../features/teachers/teachersController.js';
import { TransactionProtector } from '../utils/transactionProtector.js';
import { DraftManager } from '../utils/draftManager.js';
import { UndoManager } from '../utils/undoManager.js';
import { 
  getNotificationEventMeta, 
  sendDirectReminderToTeacher, 
  buildTeacherWhatsAppReminder,
  playNotificationSound,
  submitTeacherFeedback
} from '../utils/adminNotificationService.js';
import { Toast } from '../utils/toast.js';
import { initPWA, promptPWAInstall } from '../utils/pwaManager.js';
import { dataStore } from '../data/dataStore.js';
import { BiometricManager } from '../utils/biometricManager.js';

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

      <!-- Quick notification button & dropdown -->
      <div style="position: relative; display: inline-block;" id="notifDropdownContainer">
        <button id="navbarNotificationsBtn" class="navbar-icon-btn" title="مركز الإشعارات">
          <i data-lucide="bell" style="width: 18px; height: 18px;"></i>
          <span id="notifBadge" style="position: absolute; top: -3px; left: -3px; min-width: 17px; height: 17px; padding: 0 4px; background-color: var(--danger); border-radius: 10px; display: none; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; color: #ffffff; border: 2px solid var(--bg-secondary);">0</span>
        </button>
        
        <!-- Dropdown menu -->
        <div id="notifDropdownMenu" style="display: none; position: absolute; left: 0; top: calc(100% + 8px); width: 330px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--border-radius); box-shadow: var(--shadow-xl); z-index: 1000; padding: 1rem; direction: rtl;">
          <style>
            #notifDropdownList::-webkit-scrollbar {
              width: 5px;
            }
            #notifDropdownList::-webkit-scrollbar-track {
              background: transparent;
            }
            #notifDropdownList::-webkit-scrollbar-thumb {
              background: var(--border-color, #cbd5e1);
              border-radius: 10px;
            }
            #notifDropdownList::-webkit-scrollbar-thumb:hover {
              background: var(--text-muted, #94a3b8);
            }
            .notif-item:hover {
              background-color: var(--bg-hover, rgba(14, 165, 233, 0.05)) !important;
              transform: translateX(-2px);
            }
            .notif-item {
              transition: all 0.2s ease-in-out !important;
            }
          </style>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; gap: 0.25rem;">
            <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary); white-space: nowrap;">مركز الإشعارات</span>
            <div style="display: flex; gap: 0.35rem;">
              <button id="markAllReadBtn" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 0.2rem 0.45rem;">قرأت الكل</button>
              <button id="clearAllNotifsBtn" class="btn btn-danger btn-sm" style="font-size: 0.72rem; padding: 0.2rem 0.45rem;">مسح</button>
            </div>
          </div>
          <div id="browserNotifBanner" style="background: var(--primary-subtle); border: 1px solid var(--primary-border); border-radius: var(--border-radius-sm); padding: 0.6rem; margin-bottom: 0.5rem; text-align: center;">
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.35rem; display: flex; align-items: center; justify-content: center; gap: 0.35rem;">
              <i data-lucide="bell-ring" style="width: 14px; height: 14px; color: var(--primary-color);"></i>
              إشعارات الحصص على المتصفح
            </div>
            <button id="btnEnableBrowserNotifs" class="btn btn-primary btn-sm" style="width: 100%; justify-content: center;">تفعيل التنبيهات</button>
          </div>
          <div id="notifDropdownList" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 250px; overflow-y: auto; margin-bottom: 0.5rem; padding-left: 0.25rem;">
            <p style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 1rem 0;">جاري تحميل الإشعارات...</p>
          </div>
          <div id="adminNotifLinkContainer" style="text-align: center; border-top: 1px solid var(--border-color); padding-top: 0.5rem; display: none;">
            <a href="../admin/notifications.html" style="font-size: 0.78rem; color: var(--primary-color); font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 0.3rem;">
              <i data-lucide="send" style="width: 13px; height: 13px;"></i>
              بث إشعار عام للمشتركين
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

  // Handle Notifications Dropdown toggle and loading
  const notifBtn = navbarEl.querySelector('#navbarNotificationsBtn');
  const notifMenu = navbarEl.querySelector('#notifDropdownMenu');
  
  if (notifBtn && notifMenu) {
    notifBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const isVisible = notifMenu.style.display === 'block';
      notifMenu.style.display = isVisible ? 'none' : 'block';

      // الاتصال بالمتصفح وطلب الإذن فوراً عند فتح قائمة الإشعارات إذا لم يتم حسمه
      if ('Notification' in window && Notification.permission === 'default') {
        const perm = await requestBrowserNotificationPermission();
        if (perm === 'granted') {
          const notifBanner = navbarEl.querySelector('#browserNotifBanner');
          if (notifBanner) notifBanner.style.display = 'none';
        }
      }
    });

    const btnEnableBrowserNotifs = navbarEl.querySelector('#btnEnableBrowserNotifs');
    if (btnEnableBrowserNotifs) {
      if ('Notification' in window && Notification.permission === 'granted') {
        const notifBanner = navbarEl.querySelector('#browserNotifBanner');
        if (notifBanner) notifBanner.style.display = 'none';
      }
      btnEnableBrowserNotifs.addEventListener('click', async (e) => {
        e.stopPropagation();
        const perm = await requestBrowserNotificationPermission();
        if (perm === 'granted') {
          const notifBanner = navbarEl.querySelector('#browserNotifBanner');
          if (notifBanner) notifBanner.style.display = 'none';
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (!notifMenu.contains(e.target) && !notifBtn.contains(e.target)) {
        notifMenu.style.display = 'none';
      }
    });
  }

  // Initialize automatic 15-minute session reminders
  initSessionReminderChecker();

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

    // Initialize and sync Push Notifications (OneSignal in Median / FCM Web Push in Browser)
    initAndSyncFCM(user, userRole).catch(err => console.warn("Push Sync error:", err));

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

    if (userRole === 'admin' || userRole === 'sub_admin') {
      const linkContainer = document.getElementById('adminNotifLinkContainer');
      if (linkContainer) linkContainer.style.display = 'block';
    }

    // Check & prompt biometric setup on mobile devices
    try {
      setTimeout(() => {
        BiometricManager.checkAndPromptMobileSetup({
          uid: user.uid,
          email: user.email,
          name: name || user.displayName || 'مستخدم سبيل',
          role: userRole || 'teacher'
        });
      }, 1200);
    } catch (bioErr) {
      console.warn("Biometrics setup check failed:", bioErr);
    }

    // Function to render items in dropdown
    const renderNotifications = (allNotifications) => {
      const items = [];
      const isAdmin = (userRole === 'admin' || userRole === 'sub_admin');
      const isParent = (userRole === 'parent');
      const isTeacher = (userRole === 'teacher');

      allNotifications.forEach(data => {
        let isRecipient = false;

        const isParentOnly = (
          data.recipientRole === 'parent' || 
          data.targetRole === 'parent' || 
          data.type === 'parent_update' || 
          data.type === 'parent_session_report' ||
          Boolean(data.parentPhone && !data.teacherId && data.recipientId !== user.uid)
        );

        const isAdminOnly = (
          data.recipientId === 'admin' ||
          data.recipientId === 'sub_admin' ||
          data.recipientRole === 'admin' ||
          data.targetRole === 'admin' ||
          data.type === 'completed_session' ||
          data.type === 'late_session_recorded' ||
          data.type === 'overdue_unrecorded_session' ||
          data.type === 'trial_session_submitted' ||
          data.type === 'password_reset_request' ||
          data.type === 'new_student_request' ||
          data.type === 'teacher_profile_update' ||
          (data.type === 'session_ongoing' && data.recipientId === 'admin') ||
          Boolean(data.teacherPassword)
        );

        if (isAdmin) {
          // Admin receives administrative notifications, broadcasts, and system-wide alerts
          if (!isParentOnly || data.recipientId === 'admin' || data.recipientId === user.uid) {
            isRecipient = true;
          }
        } else if (isParent) {
          // Parent receives only parent notifications
          if (data.recipientId === user.uid || (data.parentPhone && data.parentPhone === user.phoneNumber) || (isParentOnly && (data.recipientId === 'all' || data.recipientId === user.uid))) {
            isRecipient = true;
          }
        } else if (isTeacher) {
          // Teacher receives ONLY notifications intended for THIS teacher or broadcast to ALL teachers.
          // Note: Student package renewals, credit exhaustion, and payment balance notifications are strictly administrative and never shown to teachers.
          const isStudentCreditOrFinanceAlert = [
            'low_credits_alert',
            'credit_overdraft_alert',
            'credit_exhausted_alert',
            'credit_reminder',
            'package_expired',
            'package_exhausted',
            'payment_overdue',
            'student_debt_alert'
          ].includes(data.type);

          if (!isAdminOnly && !isParentOnly && !isStudentCreditOrFinanceAlert && data.recipientId !== 'admin' && data.recipientId !== 'sub_admin' && data.recipientRole !== 'admin' && data.targetRole !== 'admin') {
            const isDirectRecipient = (data.recipientId === user.uid || data.teacherId === user.uid);
            const isBroadcastToTeachers = (
              !data.recipientId || 
              data.recipientId === 'teachers' || 
              data.recipientId === 'all' || 
              data.targetRole === 'teacher' || 
              data.targetRole === 'teachers' ||
              data.type === 'broadcast' || 
              data.type === 'admin_broadcast'
            );

            // If recipientId is specified and points to another user UID (not 'all', 'teachers', user.uid), NEVER show it!
            const isForAnotherUser = Boolean(data.recipientId && !['all', 'teachers', user.uid].includes(data.recipientId));

            if (!isForAnotherUser && (isDirectRecipient || isBroadcastToTeachers)) {
              isRecipient = true;
            }
          }
        } else {
          // General fallback
          if (!isAdminOnly && !isParentOnly && (!data.recipientId || data.recipientId === user.uid || data.recipientId === 'all')) {
            isRecipient = true;
          }
        }

        if (isRecipient) {
          // Check if user has deleted this notification
          const isDeleted = data.deletedBy && data.deletedBy.includes(user.uid);
          if (!isDeleted) {
            items.push({ ...data, id: data.id || data.uid || ('notif_' + Math.random().toString(36).substring(2, 9)) });
          }
        }
      });

      // Sort: Pinned first (unless unpinned by this teacher/user), then Newest first
      items.sort((a, b) => {
        const isPinnedA = Boolean(a.isPinned) && (!a.unpinnedBy || !a.unpinnedBy.includes(user.uid));
        const isPinnedB = Boolean(b.isPinned) && (!b.unpinnedBy || !b.unpinnedBy.includes(user.uid));

        if (isPinnedA && !isPinnedB) return -1;
        if (!isPinnedA && isPinnedB) return 1;

        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (new Date(a.createdAt || 0).getTime());
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (new Date(b.createdAt || 0).getTime());
        return timeB - timeA;
      });

      // Unread count (where user.uid is NOT in readBy)
      const unreadCount = items.filter(item => !item.readBy || !item.readBy.includes(user.uid)).length;

      // Play alert chime if a new unread notification arrived
      if (window._sabeelPrevUnreadCount !== undefined && unreadCount > window._sabeelPrevUnreadCount) {
        playNotificationSound();
        const newestUnread = items.find(item => !item.readBy || !item.readBy.includes(user.uid));
        if (newestUnread) {
          Toast.info(`🔔 ${newestUnread.title || 'إشعار جديد'}: ${newestUnread.body || ''}`);
        }
      }
      window._sabeelPrevUnreadCount = unreadCount;

      const badge = document.getElementById('notifBadge');
      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }

      const listContainer = document.getElementById('notifDropdownList');
      if (listContainer) {
        if (items.length === 0) {
          listContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.82rem; padding: 1.5rem 0.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
            <i data-lucide="bell-off" style="width: 28px; height: 28px; opacity: 0.4;"></i>
            <span>لا توجد إشعارات حالياً</span>
          </div>`;
          if (window.lucide) window.lucide.createIcons();
          return;
        }

        listContainer.innerHTML = items.map(item => {
          const isRead = item.readBy && item.readBy.includes(user.uid);
          const isPinnedForUser = Boolean(item.isPinned) && (!item.unpinnedBy || !item.unpinnedBy.includes(user.uid));
          const meta = getNotificationEventMeta(item);
          
          let bg = isRead ? 'transparent' : (meta.bgSubtle || 'var(--bg-secondary)');
          let borderRight = `4px solid ${meta.borderColor || 'var(--primary-color)'}`;
          let borderStyle = isRead ? '1px solid var(--border-color)' : `1px solid ${meta.borderColor || 'var(--primary-color)'}`;
          
          if (isPinnedForUser) {
            bg = isRead ? 'rgba(234, 179, 8, 0.06)' : 'rgba(234, 179, 8, 0.12)';
            borderRight = `5px solid #eab308`;
            borderStyle = `1px solid rgba(234, 179, 8, 0.45)`;
          }

          const fontWeight = isRead ? 'normal' : 'bold';
          const indicator = isRead ? '' : `<span style="display:inline-block; width:7px; height:7px; background:${isPinnedForUser ? '#eab308' : (meta.color || 'var(--primary-color)')}; border-radius:50%; margin-left:4px;"></span>`;
          
          return `
            <div class="notif-item" data-id="${item.id}" style="background-color: ${bg}; padding: 0.7rem 0.75rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: ${borderStyle}; border-right: ${borderRight}; display: flex; flex-direction: column; gap: 0.35rem; position: relative;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; direction: rtl; padding-left: ${isPinnedForUser ? '80px' : '28px'};">
                <span style="font-weight: ${fontWeight}; font-size: 0.82rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                  <i data-lucide="${isPinnedForUser ? 'pin' : (meta.icon || 'bell')}" style="width: 15px; height: 15px; color: ${isPinnedForUser ? '#b45309' : (meta.color || 'var(--primary-color)')}; flex-shrink: 0;"></i>
                  ${indicator} ${item.title || 'إشعار جديد'}
                </span>
                <span style="font-size: 0.65rem; color: var(--text-muted); white-space: nowrap;">${item.createdAt ? (item.createdAt.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('ar-EG') : new Date(item.createdAt).toLocaleDateString('ar-EG')) : 'الآن'}</span>
              </div>
              <p style="font-size: 0.76rem; color: var(--text-secondary); line-height: 1.4; margin: 0; text-align: right; padding-left: 24px;">${item.body || item.message || ''}</p>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.15rem; padding-left: 24px; gap: 0.35rem; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                  ${isPinnedForUser ? `
                    <span class="badge" style="background: rgba(234, 179, 8, 0.2); color: #854d0e; font-size: 0.68rem; font-weight: 800; border: 1px solid rgba(234, 179, 8, 0.45); padding: 0.15rem 0.45rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.2rem;">
                      <i data-lucide="pin" style="width: 11px; height: 11px;"></i> مثبت في أول إشعار
                    </span>
                  ` : ''}
                  <span class="badge" style="background: ${meta.badgeBg}; color: ${meta.badgeColor}; font-size: 0.68rem; font-weight: 700; border: 1px solid ${meta.borderColor}33; padding: 0.15rem 0.45rem; border-radius: 4px;">
                    ${meta.label}
                  </span>
                </div>
                ${item.scheduledTime ? `<span style="font-size: 0.68rem; color: var(--text-muted);">🕒 ${item.scheduledTime}</span>` : ''}
              </div>

              <!-- Top-left action buttons (Unpin & Delete) -->
              <div style="position: absolute; left: 6px; top: 8px; display: flex; align-items: center; gap: 4px;">
                ${isPinnedForUser ? `
                  <button class="unpin-single-notif-btn" data-id="${item.id}" style="background: rgba(234, 179, 8, 0.2); border: 1px solid rgba(234, 179, 8, 0.45); cursor: pointer; padding: 0.15rem 0.4rem; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #854d0e; font-size: 0.65rem; font-weight: 800; gap: 2px;" title="إزالة التثبيت من الأعلى">
                    <i data-lucide="pin-off" style="width: 11px; height: 11px;"></i>
                    <span>فك التثبيت</span>
                  </button>
                ` : ''}
                <button class="delete-single-notif-btn" data-id="${item.id}" style="background: none; border: none; cursor: pointer; padding: 0.25rem; display: flex; align-items: center; justify-content: center; border-radius: 4px;" title="حذف الإشعار">
                  <i data-lucide="x" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
                </button>
              </div>
            </div>
          `;
        }).join('');

        if (window.lucide) {
          window.lucide.createIcons();
        }

        // Attach read listener & modal details viewer to items
        listContainer.querySelectorAll('.notif-item').forEach(itemEl => {
          itemEl.addEventListener('click', async () => {
            const notifId = itemEl.dataset.id;
            const notification = items.find(n => n.id === notifId);
            if (notification) {
              showNotificationModalDetails(notification, user);
              if (!notification.readBy || !notification.readBy.includes(user.uid)) {
                try {
                  await updateDoc(doc(db, "notifications", notifId), {
                    readBy: arrayUnion(user.uid)
                  });
                } catch (err) {
                  console.error("Error marking notification as read:", err);
                }
              }
            }
          });
        });

        // Attach unpin listener to unpin buttons
        listContainer.querySelectorAll('.unpin-single-notif-btn').forEach(unpinBtn => {
          unpinBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // prevent triggering the read-click on parent item
            const notifId = unpinBtn.dataset.id;
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

        // Attach delete listener to individual buttons
        listContainer.querySelectorAll('.delete-single-notif-btn').forEach(btnEl => {
          btnEl.addEventListener('click', async (e) => {
            e.stopPropagation(); // prevent triggering the read-click on parent item
            const notifId = btnEl.dataset.id;
            try {
              await updateDoc(doc(db, "notifications", notifId), {
                deletedBy: arrayUnion(user.uid)
              });
            } catch (err) {
              console.error("Error deleting notification:", err);
            }
          });
        });
      }

      // Mark all read button trigger
      const markAllBtn = document.getElementById('markAllReadBtn');
      if (markAllBtn) {
        markAllBtn.onclick = async () => {
          const unreadItems = items.filter(item => !(item.readBy && item.readBy.includes(user.uid)));
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
      const clearAllBtn = document.getElementById('clearAllNotifsBtn');
      if (clearAllBtn) {
        clearAllBtn.onclick = () => {
          if (items.length === 0) return;
          showCustomConfirm('هل أنت متأكد من رغبتك في مسح وحذف جميع الإشعارات الحالية من القائمة؟', async () => {
            try {
              await Promise.all(items.map(item =>
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
    };

    // Central DataStore notification subscription
    dataStore.subscribe('notifications', (allNotifications) => {
      renderNotifications(allNotifications);
    });
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
  if (window.lucide) window.lucide.createIcons();

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
            if (window.lucide) window.lucide.createIcons();
          }

          Toast.success("تم إرسال رأيك وملاحظاتك إلى الإدارة بنجاح.");
        } catch (err) {
          console.error("Error submitting feedback:", err);
          Toast.error("حدث خطأ أثناء إرسال الرأي: " + err.message);
          submitFeedbackBtn.disabled = false;
          submitFeedbackBtn.innerHTML = `<i data-lucide="send" style="width: 14px; height: 14px;"></i> إعادة المحاولة`;
          if (window.lucide) window.lucide.createIcons();
        }
      });
    }
  }
}

