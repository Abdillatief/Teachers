import '../../shared/utils/jsonShield.js';
import { auth, db } from '../../config/firebase.js';
import { getDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from '../../shared/utils/toast.js';

let activeUserSnapshotUnsub = null;

/**
 * Gets cached user session safely
 * @returns {Object|null}
 */
export function getCurrentUserSession() {
  try {
    const raw = sessionStorage.getItem('sabeel_user_session');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Checks if current user has a specific permission
 * @param {string} permKey
 * @returns {boolean}
 */
export function hasPermission(permKey) {
  const session = getCurrentUserSession();
  if (!session) return false;
  // Super Admin has all permissions
  if (session.role === 'admin' && !session.isSubAdmin) return true;
  if (!session.permissions) return false;
  return Boolean(session.permissions[permKey]);
}

/**
 * Protects a route by ensuring the user is authenticated, has the correct role,
 * and has the required permission for the current page.
 * Uses Instant Session Cache for 0ms navigation, with background real-time synchronization.
 * 
 * @param {'admin'|'supervisor'|'teacher'} requiredRole - Required role
 * @param {string} [requiredPermission] - Specific permission key needed (e.g., 'viewStudents', 'manageSessions')
 */
export function protectRoute(requiredRole, requiredPermission = null) {
  const currentPath = window.location.pathname;

  // Store current valid protected page for session restoration
  if (currentPath.includes('/admin/') || currentPath.includes('/supervisor/') || currentPath.includes('/teacher/')) {
    if (!currentPath.endsWith('maintenance.html') && !currentPath.endsWith('index.html')) {
      localStorage.setItem('sabeel_last_page', currentPath);
    }
  }

  // 1. Instant Fast-Path via Session Storage (0ms delay)
  const cachedSessionStr = sessionStorage.getItem('sabeel_user_session');
  if (cachedSessionStr) {
    try {
      const cached = JSON.parse(cachedSessionStr);
      const isSuperAdmin = cached.role === 'admin' && !cached.isSubAdmin;
      const isSupervisor = cached.role === 'supervisor' || cached.isSubAdmin === true;

      // Handle Role mismatch
      if (requiredRole === 'admin' && !isSuperAdmin) {
        if (isSupervisor) {
          window.location.href = '/supervisor/dashboard.html';
        } else {
          window.location.href = '/teacher/dashboard.html';
        }
        return;
      }

      if (requiredRole === 'supervisor') {
        if (!isSupervisor && !isSuperAdmin) {
          window.location.href = '/teacher/dashboard.html';
          return;
        }
        // Permission check on fast-path
        if (requiredPermission && isSupervisor) {
          const hasFastPerm = Array.isArray(requiredPermission)
            ? requiredPermission.some(p => Boolean(cached.permissions && cached.permissions[p] === true))
            : Boolean(cached.permissions && cached.permissions[requiredPermission] === true);
          if (!hasFastPerm) {
            window.location.replace('/supervisor/dashboard.html');
            return;
          }
        }
      }

      if (requiredRole === 'teacher' && cached.role !== 'teacher') {
        if (isSuperAdmin) {
          window.location.href = '/admin/dashboard.html';
        } else {
          window.location.href = '/supervisor/dashboard.html';
        }
        return;
      }
    } catch (e) {}
  }

  // 2. Asynchronous state validation & real-time sync
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      if (activeUserSnapshotUnsub) {
        activeUserSnapshotUnsub();
        activeUserSnapshotUnsub = null;
      }
      sessionStorage.removeItem('sabeel_user_session');
      redirectToLogin();
      return;
    }

    try {
      const userDocRef = doc(db, "users", user.uid);
      
      // Fetch or revalidate user document
      let userData = null;
      if (cachedSessionStr) {
        try {
          const parsed = JSON.parse(cachedSessionStr);
          if (parsed.uid === user.uid && parsed.role) {
            userData = parsed;
          }
        } catch (e) {}
      }

      if (!userData) {
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          sessionStorage.removeItem('sabeel_user_session');
          await auth.signOut();
          Toast.error("لم يتم العثور على ملف تعريف المستخدم الخاص بك.");
          redirectToLogin();
          return;
        }
        userData = userDoc.data();
        updateStoredSession(user.uid, userData);
      }

      const role = userData.role;
      const status = userData.status;
      const isSubAdmin = Boolean(userData.isSubAdmin);
      const isSuperAdmin = (role === 'admin' && !isSubAdmin);
      const isSupervisor = (role === 'supervisor' || isSubAdmin === true);

      // Validate account approval status
      if (isSupervisor) {
        if (status === 'pending') {
          sessionStorage.removeItem('sabeel_user_session');
          await auth.signOut();
          Toast.warning("حساب المشرف بانتظار مراجعة وتفعيل الصلاحيات من قبل الإدارة العامة.");
          redirectToLogin();
          return;
        }
        if (status === 'suspended') {
          sessionStorage.removeItem('sabeel_user_session');
          await auth.signOut();
          Toast.warning("تم إيقاف حساب المشرف مؤقتاً، يرجى مراجعة إدارة الأكاديمية.");
          redirectToLogin();
          return;
        }
      }

      if (role === 'teacher' && status !== 'approved') {
        sessionStorage.removeItem('sabeel_user_session');
        await auth.signOut();
        Toast.warning("حساب المعلم الخاص بك بانتظار مراجعة وتفعيل المسؤول.");
        redirectToLogin();
        return;
      }

      // Route Guard Validation
      if (requiredRole === 'admin') {
        if (!isSuperAdmin) {
          Toast.warning("غير مصرح بالوصول إلى لوحة الإدارة العامة.");
          if (isSupervisor) {
            window.location.href = '/supervisor/dashboard.html';
          } else {
            window.location.href = '/teacher/dashboard.html';
          }
          return;
        }
      } else if (requiredRole === 'supervisor') {
        if (!isSupervisor && !isSuperAdmin) {
          Toast.warning("غير مصرح بالدخول إلى لوحة المشرفين.");
          window.location.href = '/teacher/dashboard.html';
          return;
        }

        // Granular Permission Check for Supervisor
        if (requiredPermission && isSupervisor) {
          const perms = userData.permissions || {};
          const hasPerm = Array.isArray(requiredPermission)
            ? requiredPermission.some(p => perms[p] === true)
            : (perms[requiredPermission] === true);
          if (!hasPerm) {
            Toast.warning("ليس لديك صلاحية الوصول إلى هذه الصفحة.");
            window.location.replace('/supervisor/dashboard.html');
            return;
          }
        }
      } else if (requiredRole === 'teacher') {
        if (role !== 'teacher') {
          if (isSuperAdmin) {
            window.location.href = '/admin/dashboard.html';
          } else {
            window.location.href = '/supervisor/dashboard.html';
          }
          return;
        }
      }

      // Non-blocking Maintenance Mode Check for Teachers
      if (role === 'teacher') {
        const maintCache = sessionStorage.getItem('sabeel_maint_status');
        const isMaintenancePage = currentPath.includes('maintenance.html');

        if (maintCache === 'active' && !isMaintenancePage) {
          window.location.href = '/teacher/maintenance.html';
          return;
        }

        getDoc(doc(db, "settings", "maintenance")).then(maintSnap => {
          let isMaint = false;
          if (maintSnap.exists()) {
            isMaint = maintSnap.data().maintenanceMode === true;
          }
          sessionStorage.setItem('sabeel_maint_status', isMaint ? 'active' : 'inactive');

          if (isMaint && !isMaintenancePage) {
            window.location.href = '/teacher/maintenance.html';
          } else if (!isMaint && isMaintenancePage) {
            window.location.href = '/teacher/dashboard.html';
          }
        }).catch(err => console.warn("Background maint check warning:", err));
      }

      // Real-time listener for live permission updates and revocation
      if (!activeUserSnapshotUnsub) {
        activeUserSnapshotUnsub = onSnapshot(userDocRef, (snap) => {
          if (!snap.exists()) {
            sessionStorage.removeItem('sabeel_user_session');
            auth.signOut();
            Toast.error("تم إغلاق الحساب أو حذفه من قبل إدارة الأكاديمية.");
            setTimeout(redirectToLogin, 1000);
            return;
          }

          const liveData = snap.data();
          const prevSession = getCurrentUserSession();
          updateStoredSession(user.uid, liveData);

          // Broadcast permission/profile update event to all components & sidebar
          window.dispatchEvent(new CustomEvent('sabeel-permissions-updated', { detail: liveData }));

          // Account revoked or suspended
          if (liveData.status === 'suspended' || liveData.status === 'rejected') {
            sessionStorage.removeItem('sabeel_user_session');
            auth.signOut();
            Toast.error("تم إيقاف حسابك أو تعليقه من قبل الإدارة.");
            setTimeout(redirectToLogin, 1000);
            return;
          }

          // If on supervisor page and permission was removed dynamically
          if (requiredRole === 'supervisor' && requiredPermission) {
            const livePerms = liveData.permissions || {};
            const isStillAllowed = Array.isArray(requiredPermission)
              ? requiredPermission.some(p => livePerms[p] === true)
              : (livePerms[requiredPermission] === true);
            if (!isStillAllowed) {
              sessionStorage.setItem('sabeel_kick_reason', 'تم تحديث صلاحيات حسابك من قبل الإدارة المركزية.');
              window.location.replace('/supervisor/dashboard.html');
              return;
            }
          }
        }, (err) => {
          console.warn("User status live listener warning:", err);
        });
      }

      // Sync OneSignal push tokens in background
      try {
        import('../../shared/services/oneSignalManager.js').then(({ ensureActivePushSubscription, loginAndSyncOneSignal }) => {
          loginAndSyncOneSignal(user, isSupervisor ? 'supervisor' : role).catch(() => {});
          ensureActivePushSubscription(user).catch(() => {});
        }).catch(err => console.warn('[AuthService] OneSignal registration warning:', err));
      } catch (e) {}

    } catch (error) {
      console.error("Error protecting route:", error);
    }
  });
}

/**
 * Updates session storage cleanly with all user metadata and permissions
 */
function updateStoredSession(uid, userData) {
  try {
    sessionStorage.setItem('sabeel_user_session', JSON.stringify({
      uid: String(uid || ''),
      role: String(userData.role || ''),
      status: String(userData.status || ''),
      name: String(userData.name || ''),
      email: String(userData.email || ''),
      isSubAdmin: Boolean(userData.isSubAdmin || userData.role === 'supervisor'),
      supervisorTitle: String(userData.supervisorTitle || userData.department || ''),
      permissions: userData.permissions || {}
    }));
  } catch (sErr) {
    console.warn('[AuthService] Could not update stored session:', sErr);
  }
}

function redirectToLogin() {
  window.location.href = '/index.html';
}
