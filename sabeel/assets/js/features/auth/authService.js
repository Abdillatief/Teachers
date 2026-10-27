import '../../shared/utils/jsonShield.js';
import { auth, db } from '../../config/firebase.js';
import { getDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from '../../shared/utils/toast.js';

let activeUserSnapshotUnsub = null;

/**
 * Returns the currently active cached user session, or null.
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
 * Protects a route by ensuring the user is authenticated, has the correct role,
 * and has the required permission if specified.
 * 
 * Strict Role Separation:
 * - 'admin': General administrator only. Supervisors are strictly rejected.
 * - 'supervisor': Supervisors (with optional requiredPermission check) and Admin.
 * - 'teacher': Teachers and Admin.
 * 
 * @param {'admin' | 'supervisor' | 'teacher'} requiredRole 
 * @param {string|null} requiredPermission - Optional specific permission key for supervisors (e.g. 'viewStudents')
 */
export function protectRoute(requiredRole, requiredPermission = null) {
  const currentPath = window.location.pathname;

  // Store valid page for session restoration (excluding maintenance/login)
  if (currentPath.includes('/admin/') || currentPath.includes('/supervisor/') || currentPath.includes('/teacher/')) {
    if (!currentPath.endsWith('maintenance.html') && !currentPath.endsWith('index.html')) {
      localStorage.setItem('sabeel_last_page', currentPath);
    }
  }

  // 1. Instant Fast-Path validation from cached session (0ms delay)
  const cached = getCurrentUserSession();
  if (cached && cached.role) {
    const cachedRole = cached.role;

    // Strict Admin check: Supervisors can NEVER enter /admin/
    if (requiredRole === 'admin' && cachedRole !== 'admin') {
      if (cachedRole === 'supervisor') {
        window.location.href = '/supervisor/dashboard.html';
      } else if (cachedRole === 'teacher') {
        window.location.href = '/teacher/dashboard.html';
      } else {
        redirectToLogin();
      }
      return;
    }

    // Strict Supervisor check
    if (requiredRole === 'supervisor') {
      if (cachedRole !== 'supervisor' && cachedRole !== 'admin') {
        if (cachedRole === 'teacher') {
          window.location.href = '/teacher/dashboard.html';
        } else {
          redirectToLogin();
        }
        return;
      }

      // Check specific permission if user is a supervisor
      if (cachedRole === 'supervisor' && requiredPermission) {
        const perms = cached.permissions || {};
        if (perms[requiredPermission] !== true) {
          window.location.href = '/supervisor/dashboard.html';
          return;
        }
      }
    }

    // Strict Teacher check
    if (requiredRole === 'teacher') {
      if (cachedRole !== 'teacher' && cachedRole !== 'admin') {
        if (cachedRole === 'supervisor') {
          window.location.href = '/supervisor/dashboard.html';
        } else {
          redirectToLogin();
        }
        return;
      }
    }
  }

  // 2. Asynchronous authoritative validation from Firebase Auth & Firestore
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
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        sessionStorage.removeItem('sabeel_user_session');
        await auth.signOut();
        Toast.error("لم يتم العثور على ملف تعريف المستخدم الخاص بك.");
        redirectToLogin();
        return;
      }

      const userData = userDoc.data();
      const userRole = userData.role;
      const userStatus = userData.status;
      const permissions = userData.permissions || {};

      // Cache fresh session
      const sessionPayload = {
        uid: String(user.uid || ''),
        role: String(userRole || ''),
        status: String(userStatus || ''),
        name: String(userData.name || ''),
        email: String(userData.email || user.email || ''),
        phone: String(userData.phone || ''),
        supervisorTitle: String(userData.supervisorTitle || userData.department || ''),
        department: String(userData.department || userData.supervisorTitle || ''),
        permissions: permissions
      };
      sessionStorage.setItem('sabeel_user_session', JSON.stringify(sessionPayload));

      // Validate status for non-admin accounts
      if (userRole === 'supervisor') {
        if (userStatus === 'pending') {
          sessionStorage.removeItem('sabeel_user_session');
          await auth.signOut();
          Toast.warning("حساب المشرف قيد المراجعة وتحديد الصلاحيات من قبل الإدارة العامة.");
          redirectToLogin();
          return;
        }
        if (userStatus === 'suspended' || userStatus === 'rejected') {
          sessionStorage.removeItem('sabeel_user_session');
          await auth.signOut();
          Toast.error(userStatus === 'suspended' ? "تم إيقاف حساب المشرف مؤقتاً، يرجى مراجعة الإدارة." : "تم رفض طلب الحساب.");
          redirectToLogin();
          return;
        }
      }

      if (userRole === 'teacher' && userStatus !== 'approved') {
        sessionStorage.removeItem('sabeel_user_session');
        await auth.signOut();
        Toast.warning("حساب المعلم الخاص بك بانتظار مراجعة وتفعيل المسؤول.");
        redirectToLogin();
        return;
      }

      // Check Role Isolation
      if (requiredRole === 'admin') {
        if (userRole !== 'admin') {
          Toast.error("غير مصرح لك بالوصول إلى لوحة الإدارة المركزية.");
          if (userRole === 'supervisor') {
            window.location.href = '/supervisor/dashboard.html';
          } else {
            window.location.href = '/teacher/dashboard.html';
          }
          return;
        }
      } else if (requiredRole === 'supervisor') {
        if (userRole !== 'supervisor' && userRole !== 'admin') {
          Toast.error("هذا القسم مخصص للمشرفين الإداريين فقط.");
          window.location.href = '/teacher/dashboard.html';
          return;
        }

        // Enforce specific permission if user is supervisor
        if (userRole === 'supervisor' && requiredPermission) {
          if (permissions[requiredPermission] !== true) {
            Toast.error("لا تملك الصلاحية اللازمة للوصول إلى هذه الصفحة.");
            window.location.href = '/supervisor/dashboard.html';
            return;
          }
        }
      } else if (requiredRole === 'teacher') {
        if (userRole !== 'teacher' && userRole !== 'admin') {
          window.location.href = userRole === 'supervisor' ? '/supervisor/dashboard.html' : '/index.html';
          return;
        }

        // Non-blocking Maintenance Mode Check for Teachers
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

      // 3. Real-time Live Listener for immediate permission synchronization without relogging
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
          const livePerms = liveData.permissions || {};

          sessionStorage.setItem('sabeel_user_session', JSON.stringify({
            uid: String(user.uid || ''),
            role: String(liveData.role || ''),
            status: String(liveData.status || ''),
            name: String(liveData.name || ''),
            email: String(liveData.email || user.email || ''),
            phone: String(liveData.phone || ''),
            supervisorTitle: String(liveData.supervisorTitle || liveData.department || ''),
            department: String(liveData.department || liveData.supervisorTitle || ''),
            permissions: livePerms
          }));

          // Notify page components in real time
          window.dispatchEvent(new CustomEvent('sabeel_permissions_updated', {
            detail: {
              role: liveData.role,
              status: liveData.status,
              permissions: livePerms
            }
          }));

          // If suspended or revoked
          if (liveData.status === 'suspended' || liveData.status === 'rejected') {
            sessionStorage.removeItem('sabeel_user_session');
            auth.signOut();
            Toast.error("تم إيقاف الحساب أو إلغاء تفعيله من قبل الإدارة.");
            setTimeout(redirectToLogin, 1000);
            return;
          }

          // If supervisor's permission for current page was revoked live
          if (liveData.role === 'supervisor' && requiredPermission) {
            if (livePerms[requiredPermission] !== true) {
              Toast.warning("تم تحديث صلاحياتك بواسطة الإدارة: تم سحب الوصول لهذه الصفحة.");
              setTimeout(() => {
                window.location.href = '/supervisor/dashboard.html';
              }, 1200);
            }
          }
        }, (err) => {
          console.warn("User status live listener warning:", err);
        });
      }

      // Sync OneSignal if available
      try {
        import('../../shared/services/oneSignalManager.js').then(({ ensureActivePushSubscription, loginAndSyncOneSignal }) => {
          loginAndSyncOneSignal(user, userRole).catch(() => {});
          ensureActivePushSubscription(user).catch(() => {});
        }).catch(() => {});
      } catch (e) {}

    } catch (error) {
      console.error("Error protecting route:", error);
    }
  });
}


export function hasSupervisorPermission(permissionKey) {
  const session = getCurrentUserSession();
  if (!session) return true; // Let authoritative protectRoute verify if session not hydrated
  if (session.role === 'admin') return true;
  if (session.role !== 'supervisor') return false;
  if (!permissionKey) return true;
  return session.permissions && session.permissions[permissionKey] === true;
}

function redirectToLogin() {
  window.location.href = '/index.html';
}
