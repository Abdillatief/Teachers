import { auth, db } from '../../config/firebase.js';
import { collection, onSnapshot, doc, getDoc, updateDoc, arrayUnion, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showCustomConfirm } from '../utils/helpers.js';

/**
 * Renders the top navigation bar.
 * @param {string} title - The title of the page to display in the navbar.
 * @param {object} userData - Contains user information: { name: string, roleName: string }
 */
export function renderNavbar(title, userData = {}) {
  const navbarEl = document.getElementById('appNavbar');
  if (!navbarEl) return;

  const name = userData.name || 'المستخدم';
  const roleName = userData.roleName || '';
  const firstLetter = name.trim().charAt(0) || 'م';

  navbarEl.innerHTML = `
    <div style="display: flex; align-items: center; gap: 1rem;">
      <button id="toggleSidebarBtn" class="btn btn-secondary" style="display: none; padding: 0.5rem; border-radius: var(--border-radius-sm);">
        <i data-lucide="menu" style="width: 20px; height: 20px;"></i>
      </button>
      <div class="navbar-brand" style="color: var(--text-primary); font-weight: 800; font-size: 1.25rem;">
        ${title}
      </div>
    </div>
    
    <div class="navbar-actions" style="display: flex; align-items: center; gap: 0.75rem; position: relative;">
      <!-- Theme toggle button -->
      <button id="toggleThemeBtn" class="btn btn-secondary" style="padding: 0.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;" title="تبديل المظهر">
        <i data-lucide="moon" id="themeIcon" style="width: 20px; height: 20px; color: var(--text-secondary);"></i>
      </button>

      <!-- Quick notification button & dropdown -->
      <div style="position: relative; display: inline-block;" id="notifDropdownContainer">
        <button id="navbarNotificationsBtn" class="btn btn-secondary" style="position: relative; padding: 0.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;" title="الإشعارات">
          <i data-lucide="bell" style="width: 20px; height: 20px; color: var(--text-secondary);"></i>
          <span id="notifBadge" style="position: absolute; top: -2px; left: -2px; width: 18px; height: 18px; background-color: var(--danger); border-radius: 50%; display: none; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: bold; color: white;">0</span>
        </button>
        
        <!-- Dropdown menu -->
        <div id="notifDropdownMenu" style="display: none; position: absolute; left: 0; top: 125%; width: 320px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); z-index: 1000; padding: 1rem; direction: rtl;">
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
            <span style="font-weight: 800; font-size: 0.9rem; color: var(--text-primary); white-space: nowrap;">الإشعارات</span>
            <div style="display: flex; gap: 0.25rem;">
              <button id="markAllReadBtn" class="btn btn-secondary" style="font-size: 0.65rem; padding: 0.25rem 0.4rem; font-weight: 700;">قرأت الكل</button>
              <button id="clearAllNotifsBtn" class="btn btn-danger" style="font-size: 0.65rem; padding: 0.25rem 0.4rem; font-weight: 700; background: var(--danger); color: white; border: none; border-radius: var(--border-radius-sm);">مسح الكل</button>
            </div>
          </div>
          <div id="notifDropdownList" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 250px; overflow-y: auto; margin-bottom: 0.5rem; padding-left: 0.25rem;">
            <p style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 1rem 0;">جاري تحميل الإشعارات...</p>
          </div>
          <div id="adminNotifLinkContainer" style="text-align: center; border-top: 1px solid var(--border-color); padding-top: 0.5rem; display: none;">
            <a href="../admin/notifications.html" style="font-size: 0.78rem; color: var(--primary-color); font-weight: bold; text-decoration: none;">بث إشعار جديد للجميع</a>
          </div>
        </div>
      </div>
      
      <!-- User profile info -->
      <div class="navbar-user">
        <div style="text-align: left; display: flex; flex-direction: column;">
          <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">${name}</span>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${roleName}</span>
        </div>
        <div class="navbar-avatar">
          ${firstLetter}
        </div>
      </div>
    </div>
  `;

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

  // Handle Notifications Dropdown toggle and loading
  const notifBtn = navbarEl.querySelector('#navbarNotificationsBtn');
  const notifMenu = navbarEl.querySelector('#notifDropdownMenu');
  
  if (notifBtn && notifMenu) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = notifMenu.style.display === 'block';
      notifMenu.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (!notifMenu.contains(e.target) && !notifBtn.contains(e.target)) {
        notifMenu.style.display = 'none';
      }
    });
  }

  // Listen to notifications in Firestore
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    
    let userRole = null;

    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        userRole = userSnap.data().role;
      }
    } catch (err) {
      console.warn("Failed to read user role for navbar link:", err);
    }

    if (userRole === 'admin' || userRole === 'sub_admin') {
      const linkContainer = document.getElementById('adminNotifLinkContainer');
      if (linkContainer) linkContainer.style.display = 'block';
    }

    // Real-time notifications listener
    onSnapshot(collection(db, "notifications"), (snapshot) => {
      const items = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        let isRecipient = false;

        if (data.recipientId === user.uid) {
          isRecipient = true;
        } else if (data.recipientId === 'admin' && (userRole === 'admin' || userRole === 'sub_admin')) {
          isRecipient = true;
        } else if (data.recipientId === 'all') {
          isRecipient = true;
        }

        if (isRecipient) {
          // Check if user has deleted this notification
          const isDeleted = data.deletedBy && data.deletedBy.includes(user.uid);
          if (!isDeleted) {
            items.push({ id: docSnap.id, ...data });
          }
        }
      });

      // Sort: Newest first
      items.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      // Unread count (where user.uid is NOT in readBy)
      const unreadCount = items.filter(item => !item.readBy || !item.readBy.includes(user.uid)).length;

      const badge = document.getElementById('notifBadge');
      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = unreadCount;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }

      const listContainer = document.getElementById('notifDropdownList');
      if (listContainer) {
        if (items.length === 0) {
          listContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 1rem 0;">لا توجد إشعارات حالياً.</p>`;
          return;
        }

        listContainer.innerHTML = items.map(item => {
          const isRead = item.readBy && item.readBy.includes(user.uid);
          const bg = isRead ? 'transparent' : 'var(--bg-secondary)';
          const borderStyle = isRead ? '1px solid var(--border-color)' : '1px solid var(--primary-color)';
          const fontWeight = isRead ? 'normal' : 'bold';
          const indicator = isRead ? '' : '<span style="display:inline-block; width:6px; height:6px; background:var(--primary-color); border-radius:50%; margin-left:4px;"></span>';
          return `
            <div class="notif-item" data-id="${item.id}" style="background-color: ${bg}; padding: 0.6rem; border-radius: 6px; cursor: pointer; transition: background 0.2s; border: ${borderStyle}; display: flex; flex-direction: column; gap: 0.25rem; position: relative;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; direction: rtl; padding-left: 20px;">
                <span style="font-weight: ${fontWeight}; font-size: 0.8rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.25rem;">
                  ${indicator} ${item.title}
                </span>
                <span style="font-size: 0.65rem; color: var(--text-muted);">${item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('ar-EG') : 'الآن'}</span>
              </div>
              <p style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.3; margin: 0; text-align: right; padding-left: 20px;">${item.body}</p>
              <button class="delete-single-notif-btn" data-id="${item.id}" style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 0.25rem; display: flex; align-items: center; justify-content: center;" title="حذف الإشعار">
                <i data-lucide="x" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
              </button>
            </div>
          `;
        }).join('');

        if (window.lucide) {
          window.lucide.createIcons();
        }

        // Attach read listener to items
        listContainer.querySelectorAll('.notif-item').forEach(itemEl => {
          itemEl.addEventListener('click', async () => {
            const notifId = itemEl.dataset.id;
            const notification = items.find(n => n.id === notifId);
            if (notification && (!notification.readBy || !notification.readBy.includes(user.uid))) {
              try {
                await updateDoc(doc(db, "notifications", notifId), {
                  readBy: arrayUnion(user.uid)
                });
              } catch (err) {
                console.error("Error marking notification as read:", err);
              }
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
          for (const item of items) {
            const isRead = item.readBy && item.readBy.includes(user.uid);
            if (!isRead) {
              try {
                await updateDoc(doc(db, "notifications", item.id), {
                  readBy: arrayUnion(user.uid)
                });
              } catch (err) {
                console.error("Error marking all read:", err);
              }
            }
          }
        };
      }

      // Clear all button trigger
      const clearAllBtn = document.getElementById('clearAllNotifsBtn');
      if (clearAllBtn) {
        clearAllBtn.onclick = () => {
          showCustomConfirm('هل أنت متأكد من رغبتك في حذف جميع الإشعارات؟', async () => {
            for (const item of items) {
              try {
                await updateDoc(doc(db, "notifications", item.id), {
                  deletedBy: arrayUnion(user.uid)
                });
              } catch (err) {
                console.error("Error clearing notifications:", err);
              }
            }
          });
        };
      }
    }, (error) => {
      console.warn("Error listening to notifications:", error);
    });
  });

  // Trigger Lucide icons creation
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
