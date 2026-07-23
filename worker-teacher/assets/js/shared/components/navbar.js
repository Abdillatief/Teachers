import { auth, db } from '../../config/firebase.js';
import { collection, onSnapshot, doc, getDoc, updateDoc, arrayUnion, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showCustomConfirm } from '../utils/helpers.js';
import { initSessionReminderChecker } from '../utils/reminderService.js';

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

  // Initialize automatic 15-minute session reminders
  initSessionReminderChecker();

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
      const isAdmin = (userRole === 'admin' || userRole === 'sub_admin');

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        let isRecipient = false;

        if (isAdmin) {
          // Admin receives admin notifications, password requests, all broadcasts, or targeted to them
          if (data.recipientId === 'admin' || data.recipientId === 'sub_admin' || data.recipientId === user.uid || data.recipientId === 'all') {
            isRecipient = true;
          } else if (data.type === 'password_reset_request' || data.type === 'new_student_request' || data.teacherPassword) {
            isRecipient = true;
          }
        } else {
          // TEACHER / REGULAR USER:
          // Strictly only receive notifications related to THEIR OWN account!
          // Exclude any admin/administrative notifications, password requests, or other teachers' notifications.

          const isAdminOnlyType = (
            data.recipientId === 'admin' ||
            data.recipientId === 'sub_admin' ||
            data.type === 'password_reset_request' ||
            data.type === 'new_student_request' ||
            Boolean(data.teacherPassword) ||
            (data.title && (
              data.title.includes('طلب استعادة') ||
              data.title.includes('طلب إضافة طالب جديد من المعلم') ||
              data.title.includes('طلب انضمام')
            ))
          );

          if (!isAdminOnlyType) {
            const isDirectRecipient = data.recipientId === user.uid;
            const isTeacherRecipient = (data.recipientId === 'teachers' || data.recipientId === 'all');
            const isTeacherIdMatch = data.teacherId === user.uid;

            // Must match teacherId if present
            const matchesTeacherId = !data.teacherId || data.teacherId === user.uid;

            if ((isDirectRecipient || isTeacherIdMatch || isTeacherRecipient) && matchesTeacherId) {
              if (!data.recipientId || data.recipientId === user.uid || data.recipientId === 'teachers' || data.recipientId === 'all') {
                isRecipient = true;
              }
            }
          }
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

        // Attach read listener & modal details viewer to items
        listContainer.querySelectorAll('.notif-item').forEach(itemEl => {
          itemEl.addEventListener('click', async () => {
            const notifId = itemEl.dataset.id;
            const notification = items.find(n => n.id === notifId);
            if (notification) {
              showNotificationModalDetails(notification);
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

export function showNotificationModalDetails(notification) {
  if (!notification) return;
  let modalEl = document.getElementById('notifDetailsModal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'notifDetailsModal';
    modalEl.style.cssText = 'display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;';
    document.body.appendChild(modalEl);
  }

  const isPasswordRequest = notification.type === 'password_reset_request' || notification.teacherPassword || (notification.title && notification.title.includes('استعادة'));

  modalEl.innerHTML = `
    <div class="card modal-card" style="width: 100%; max-width: 480px; position: relative; border-top: 4px solid var(--primary-color); border: 1px solid var(--border-color); box-shadow: var(--shadow-lg);">
      <button type="button" id="closeNotifDetailsBtn" style="position: absolute; left: 1rem; top: 1rem; background: none; border: none; font-size: 1.4rem; cursor: pointer; color: var(--text-muted);">&times;</button>
      
      <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
        <div style="width: 44px; height: 44px; background: var(--primary-light); color: var(--primary-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;">
          ${isPasswordRequest ? '🔑' : '📢'}
        </div>
        <div>
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin: 0;">${notification.title || 'تفاصيل الإشعار'}</h3>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${notification.createdAt ? (notification.createdAt.seconds ? new Date(notification.createdAt.seconds * 1000).toLocaleString('ar-EG') : new Date(notification.createdAt).toLocaleString('ar-EG')) : 'الآن'}</span>
        </div>
      </div>

      ${isPasswordRequest ? `
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
          <h4 style="font-size: 0.92rem; font-weight: 800; color: var(--primary-color); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="user-check"></i> بيانات حساب المعلم المطلوبة
          </h4>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.85rem; margin-bottom: 0.75rem;">
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 0.75rem;">اسم المعلم:</span>
              <strong style="color: var(--text-primary);">${notification.teacherName || 'غير محدد'}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 0.75rem;">رقم الهاتف:</span>
              <strong style="color: var(--text-primary);">${notification.teacherPhone || 'غير محدد'}</strong>
            </div>
            <div style="grid-column: span 2;">
              <span style="color: var(--text-muted); display: block; font-size: 0.75rem;">البريد الإلكتروني:</span>
              <strong style="color: var(--primary-color); word-break: break-all;">${notification.teacherEmail || 'غير محدد'}</strong>
            </div>
          </div>

          <div style="margin-top: 0.75rem;">
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 0.35rem;">🔑 كلمة مرور الحساب السرية:</span>
            <div style="background: var(--bg-primary); border: 1px dashed var(--primary-color); padding: 0.6rem 0.8rem; border-radius: 6px; font-family: monospace; font-size: 1.15rem; font-weight: 900; color: var(--primary-color); display: flex; align-items: center; justify-content: space-between;">
              <span id="notifPasswordText">${notification.teacherPassword || 'غير مسجلة'}</span>
              <button type="button" class="btn btn-sm btn-primary" id="copyNotifPasswordBtn" style="font-size: 0.75rem; padding: 0.3rem 0.75rem; font-weight: 700;">
                نسخ 📋
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <div style="margin-bottom: 1.25rem;">
        <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">ملخص ونص الرسالة:</label>
        <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; white-space: pre-line; background: var(--bg-primary); border: 1px solid var(--border-color); padding: 0.75rem; border-radius: 6px; margin: 0;">${notification.body || 'لا توجد تفاصيل إضافية'}</p>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
        <button type="button" class="btn btn-secondary" id="closeNotifDetailsBtn2" style="font-weight: 700;">إغلاق</button>
      </div>
    </div>
  `;

  modalEl.style.display = 'flex';
  if (window.lucide) window.lucide.createIcons();

  const closeBtn1 = modalEl.querySelector('#closeNotifDetailsBtn');
  const closeBtn2 = modalEl.querySelector('#closeNotifDetailsBtn2');
  const copyBtn = modalEl.querySelector('#copyNotifPasswordBtn');

  const hideModal = () => { modalEl.style.display = 'none'; };

  if (closeBtn1) closeBtn1.addEventListener('click', hideModal);
  if (closeBtn2) closeBtn2.addEventListener('click', hideModal);

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const pwd = notification.teacherPassword || '';
      if (pwd) {
        try {
          await navigator.clipboard.writeText(pwd);
          const toastMod = await import('../utils/toast.js');
          toastMod.Toast.success('تم نسخ كلمة المرور إلى الحافظة بنجاح ✅');
        } catch(e) {
          console.error(e);
        }
      }
    });
  }
}
