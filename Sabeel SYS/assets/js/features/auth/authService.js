import '../../shared/utils/jsonShield.js';
import { auth, db } from '../../config/firebase.js';
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { Toast } from '../../shared/utils/toast.js';
import {
  RBAC_COLLECTIONS,
  ROLES,
  resolveEffectiveRole,
  resolveEffectivePermissions,
  getFirstAllowedSupervisorPage as resolveFirstSupervisorPage,
  subscribeUserRbac
} from '../rbac/rbacService.js';

let activeRbacUnsub = null;

/**
 * Gets cached user session safely
 * @returns {Object|null}
 */
export function getCurrentUserSession() {
  try {
    const raw = sessionStorage.getItem('sabeel_user_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Checks if current user has a specific permission
 * @param {string} permKey
 * @returns {boolean}
 */
export function hasPermission(permKey) {
  if (!permKey) return true;
  const session = getCurrentUserSession();
  if (!session) return false;
  if (resolveEffectiveRole(session) === ROLES.ADMIN) return true;
  if (!session.permissions) return false;
  return Boolean(session.permissions[permKey] === true);
}

/**
 * Checks supervisor-specific permission
 * @param {string} permKey
 * @returns {boolean}
 */
export function hasSupervisorPermission(permKey) {
  return hasPermission(permKey);
}

/**
 * Returns the first accessible supervisor page based on active RBAC permissions.
 * @param {Object|null} [explicitPermissions]
 * @returns {string}
 */
export function getFirstAllowedSupervisorPage(explicitPermissions = null) {
  let perms = explicitPermissions;
  if (!perms || typeof perms !== 'object') {
    const session = getCurrentUserSession();
    perms = session?.permissions || {};
  }
  return resolveFirstSupervisorPage(perms).replace(/^\.\.\//, '/');
}

function checkPermissionMatch(requiredPermission, perms) {
  if (!requiredPermission) return true;
  if (!perms || typeof perms !== 'object') return false;
  if (Array.isArray(requiredPermission)) {
    return requiredPermission.some((p) => perms[p] === true);
  }
  return perms[requiredPermission] === true;
}

/**
 * Protects a route by ensuring the user is authenticated, has the exact required role,
 * and has the required permission for the current page.
 *
 * @param {'admin'|'supervisor'|'teacher'} requiredRole
 * @param {string|string[]|null} [requiredPermission]
 */
export function protectRoute(requiredRole, requiredPermission = null) {
  const currentPath = window.location.pathname;

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
      const cachedRole = resolveEffectiveRole(cached);

      if (requiredRole === ROLES.ADMIN && cachedRole !== ROLES.ADMIN) {
        if (cachedRole === ROLES.SUPERVISOR) {
          window.location.replace(getFirstAllowedSupervisorPage(cached.permissions));
        } else {
          window.location.replace('/teacher/dashboard.html');
        }
        return;
      }

      if (requiredRole === ROLES.SUPERVISOR) {
        if (cachedRole !== ROLES.SUPERVISOR) {
          window.location.replace(cachedRole === ROLES.ADMIN ? '/admin/dashboard.html' : '/teacher/dashboard.html');
          return;
        }
        if (requiredPermission && !checkPermissionMatch(requiredPermission, cached.permissions)) {
          const fallbackPage = getFirstAllowedSupervisorPage(cached.permissions);
          if (!currentPath.endsWith(fallbackPage) && currentPath !== fallbackPage) {
            window.location.replace(fallbackPage);
            return;
          }
        }
      }

      if (requiredRole === ROLES.TEACHER && cachedRole !== ROLES.TEACHER) {
        if (cachedRole === ROLES.ADMIN) {
          window.location.replace('/admin/dashboard.html');
        } else if (cachedRole === ROLES.SUPERVISOR) {
          window.location.replace(getFirstAllowedSupervisorPage(cached.permissions));
        } else {
          window.location.replace('/index.html');
        }
        return;
      }
    } catch {}
  }

  // 2. Authoritative Firebase Auth + Dual RBAC Realtime Listener
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      if (activeRbacUnsub) {
        activeRbacUnsub();
        activeRbacUnsub = null;
      }
      sessionStorage.removeItem('sabeel_user_session');
      redirectToLogin();
      return;
    }

    try {
      const [userSnap, roleSnap] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDoc(doc(db, RBAC_COLLECTIONS.USER_ROLES, user.uid))
      ]);

      if (!userSnap.exists()) {
        sessionStorage.removeItem('sabeel_user_session');
        await auth.signOut();
        Toast.error("لم يتم العثور على ملف تعريف المستخدم الخاص بك.");
        redirectToLogin();
        return;
      }

      const userData = userSnap.data();
      const userRoleDoc = roleSnap.exists() ? roleSnap.data() : null;
      const effectiveRole = resolveEffectiveRole(userData, userRoleDoc);
      if (typeof window !== 'undefined') window.__sabeelEffectiveRole = effectiveRole;
      const effectivePermissions = resolveEffectivePermissions(userData, userRoleDoc);
      const effectiveStatus = userRoleDoc?.status && userData.status === 'approved'
        ? userRoleDoc.status
        : (userData.status || userRoleDoc?.status || 'pending');

      updateStoredSession(user.uid, userData, effectiveRole, effectiveStatus, effectivePermissions);

      // Account status verification
      if (effectiveRole === ROLES.SUPERVISOR) {
        if (effectiveStatus === 'pending') {
          sessionStorage.removeItem('sabeel_user_session');
          await auth.signOut();
          Toast.warning("حساب المشرف بانتظار مراجعة وتفعيل الصلاحيات من قبل الإدارة العامة.");
          redirectToLogin();
          return;
        }
        if (effectiveStatus === 'suspended' || effectiveStatus === 'rejected') {
          sessionStorage.removeItem('sabeel_user_session');
          await auth.signOut();
          Toast.warning("تم إيقاف حساب المشرف، يرجى مراجعة إدارة الأكاديمية.");
          redirectToLogin();
          return;
        }
      }

      if (effectiveRole === ROLES.TEACHER && effectiveStatus !== 'approved') {
        sessionStorage.removeItem('sabeel_user_session');
        await auth.signOut();
        Toast.warning("حساب المعلم الخاص بك بانتظار مراجعة وتفعيل المسؤول.");
        redirectToLogin();
        return;
      }

      // Strict Independent Dashboard Role Separation
      if (requiredRole === ROLES.ADMIN && effectiveRole !== ROLES.ADMIN) {
        Toast.warning("غير مصرح بالوصول إلى لوحة الإدارة العامة.");
        window.location.replace(
          effectiveRole === ROLES.SUPERVISOR
            ? getFirstAllowedSupervisorPage(effectivePermissions)
            : '/teacher/dashboard.html'
        );
        return;
      }

      if (requiredRole === ROLES.SUPERVISOR) {
        if (effectiveRole !== ROLES.SUPERVISOR) {
          window.location.replace(effectiveRole === ROLES.ADMIN ? '/admin/dashboard.html' : '/teacher/dashboard.html');
          return;
        }
        if (requiredPermission && !checkPermissionMatch(requiredPermission, effectivePermissions)) {
          sessionStorage.setItem('sabeel_kick_reason', 'لا تمتلك صلاحية الوصول إلى الصفحة المطلوبة.');
          const fallbackPage = getFirstAllowedSupervisorPage(effectivePermissions);
          if (!currentPath.endsWith(fallbackPage) && currentPath !== fallbackPage) {
            window.location.replace(fallbackPage);
            return;
          }
        }
      }

      if (requiredRole === ROLES.TEACHER && effectiveRole !== ROLES.TEACHER) {
        window.location.replace(
          effectiveRole === ROLES.ADMIN
            ? '/admin/dashboard.html'
            : getFirstAllowedSupervisorPage(effectivePermissions)
        );
        return;
      }

      // Non-blocking Maintenance Mode Check for Teachers
      if (effectiveRole === ROLES.TEACHER) {
        const maintCache = sessionStorage.getItem('sabeel_maint_status');
        const isMaintenancePage = currentPath.includes('maintenance.html');

        if (maintCache === 'active' && !isMaintenancePage) {
          window.location.href = '/teacher/maintenance.html';
          return;
        }

        getDoc(doc(db, 'settings', 'maintenance')).then((maintSnap) => {
          const maintData = maintSnap.exists() ? (maintSnap.data() || {}) : {};
          const isMaint = maintData.enabled === true || maintData.maintenanceMode === true;
          sessionStorage.setItem('sabeel_maint_status', isMaint ? 'active' : 'inactive');

          if (isMaint && !isMaintenancePage) {
            window.location.href = '/teacher/maintenance.html';
          } else if (!isMaint && isMaintenancePage) {
            window.location.href = '/teacher/dashboard.html';
          }
        }).catch((err) => console.warn("Background maint check warning:", err));
      }

      // Real-time dual RBAC listener for live permission updates & instant kick-out
      if (!activeRbacUnsub) {
        activeRbacUnsub = subscribeUserRbac(user.uid, (rbacState) => {
          if (!rbacState.exists) {
            sessionStorage.removeItem('sabeel_user_session');
            auth.signOut();
            Toast.error("تم إغلاق الحساب أو حذفه من قبل إدارة الأكاديمية.");
            setTimeout(redirectToLogin, 800);
            return;
          }

          updateStoredSession(
            user.uid,
            rbacState.userData,
            rbacState.role,
            rbacState.status,
            rbacState.permissions
          );

          window.dispatchEvent(new CustomEvent('sabeel-permissions-updated', {
            detail: {
              ...rbacState.userData,
              role: rbacState.role,
              status: rbacState.status,
              permissions: rbacState.permissions
            }
          }));

          if (rbacState.status === 'suspended' || rbacState.status === 'rejected') {
            sessionStorage.removeItem('sabeel_user_session');
            auth.signOut();
            Toast.error("تم إيقاف حسابك أو تعليقه من قبل الإدارة.");
            setTimeout(redirectToLogin, 800);
            return;
          }

          if (requiredRole === ROLES.SUPERVISOR && rbacState.role !== ROLES.SUPERVISOR) {
            window.location.replace(rbacState.role === ROLES.ADMIN ? '/admin/dashboard.html' : '/teacher/dashboard.html');
            return;
          }

          if (requiredRole === ROLES.SUPERVISOR && requiredPermission) {
            if (!checkPermissionMatch(requiredPermission, rbacState.permissions)) {
              sessionStorage.setItem('sabeel_kick_reason', 'تم تحديث صلاحياتك من قبل الإدارة، وتم توجيهك إلى الصفحة المتاحة.');
              const fallbackPage = getFirstAllowedSupervisorPage(rbacState.permissions);
              if (!currentPath.endsWith(fallbackPage) && currentPath !== fallbackPage) {
                window.location.replace(fallbackPage);
                return;
              }
            }
          }
        });
      }

      // OneSignal sync for Admin & Teacher only (Notification center removed for Supervisor)
      if (effectiveRole !== ROLES.SUPERVISOR) {
        import('../../shared/services/oneSignalManager.js')
          .then(({ ensureActivePushSubscription, loginAndSyncOneSignal }) => {
            loginAndSyncOneSignal(user, effectiveRole).catch(() => {});
            ensureActivePushSubscription(user).catch(() => {});
          })
          .catch((err) => console.warn('[AuthService] OneSignal registration warning:', err));
      }
    } catch (error) {
      console.error("Error protecting route:", error);
    }
  });
}

function updateStoredSession(uid, userData, role, status, permissions) {
  try {
    sessionStorage.setItem('sabeel_user_session', JSON.stringify({
      uid: String(uid || ''),
      role: String(role || userData?.role || ''),
      status: String(status || userData?.status || ''),
      name: String(userData?.name || ''),
      email: String(userData?.email || ''),
      supervisorTitle: String(userData?.supervisorTitle || userData?.department || ''),
      permissions: permissions || {}
    }));
  } catch (sErr) {
    console.warn('[AuthService] Could not update stored session:', sErr);
  }
}

function redirectToLogin() {
  window.location.href = '/index.html';
}
