import { auth, db } from '../../config/firebase.js';
import { getDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from '../../shared/utils/toast.js';

let activeUserSnapshotUnsub = null;

/**
 * Protects a route by ensuring the user is authenticated and has the correct role.
 * Uses Instant Session Cache to eliminate navigation delays, with background revalidation.
 * @param {string} requiredRole - 'admin' or 'teacher'
 */
export function protectRoute(requiredRole) {
  const currentPath = window.location.pathname;

  // Store current valid protected page for session restoration
  if (currentPath.includes('/admin/') || currentPath.includes('/teacher/')) {
    if (!currentPath.endsWith('maintenance.html') && !currentPath.endsWith('index.html')) {
      localStorage.setItem('sabeel_last_page', currentPath);
    }
  }

  // 1. Instant Fast-Path via Session Storage (0ms delay)
  const cachedSessionStr = sessionStorage.getItem('sabeel_user_session');
  if (cachedSessionStr) {
    try {
      const cached = JSON.parse(cachedSessionStr);
      if (cached.role && cached.role !== requiredRole) {
        if (cached.role === 'admin') {
          window.location.href = '/admin/dashboard.html';
        } else if (cached.role === 'teacher') {
          window.location.href = '/teacher/dashboard.html';
        }
        return;
      }
    } catch (e) {}
  }

  // 2. Asynchronous background state validation
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
      
      // Fast check if we already have valid session cache for current UID
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
        sessionStorage.setItem('sabeel_user_session', JSON.stringify({
          uid: user.uid,
          role: userData.role,
          status: userData.status,
          name: userData.name || '',
          email: userData.email || user.email
        }));
      }

      const userRole = userData.role;
      const userStatus = userData.status;

      // Validate role permissions
      if (userRole !== requiredRole) {
        if (userRole === 'admin') {
          window.location.href = '/admin/dashboard.html';
        } else if (userRole === 'teacher') {
          if (userStatus !== 'approved') {
            sessionStorage.removeItem('sabeel_user_session');
            await auth.signOut();
            Toast.warning("حساب المعلم الخاص بك بانتظار مراجعة وتفعيل المسؤول.");
            redirectToLogin();
            return;
          }
          window.location.href = '/teacher/dashboard.html';
        } else {
          sessionStorage.removeItem('sabeel_user_session');
          await auth.signOut();
          redirectToLogin();
        }
        return;
      }

      // If teacher and status not approved
      if (userRole === 'teacher' && userStatus !== 'approved') {
        sessionStorage.removeItem('sabeel_user_session');
        await auth.signOut();
        Toast.warning("حساب المعلم الخاص بك بانتظار مراجعة وتفعيل المسؤول.");
        redirectToLogin();
        return;
      }

      // Non-blocking Maintenance Mode Check for Teachers (Admin is never affected)
      if (userRole === 'teacher') {
        const maintCache = sessionStorage.getItem('sabeel_maint_status');
        const isMaintenancePage = currentPath.includes('maintenance.html');

        if (maintCache === 'active' && !isMaintenancePage) {
          window.location.href = '/teacher/maintenance.html';
          return;
        }

        // Verify in background
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

      // Single Real-time listener for account revocation/disabling by admin
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
          sessionStorage.setItem('sabeel_user_session', JSON.stringify({
            uid: user.uid,
            role: liveData.role,
            status: liveData.status,
            name: liveData.name || '',
            email: liveData.email || user.email
          }));

          if (liveData.role === 'teacher' && liveData.status !== 'approved') {
            sessionStorage.removeItem('sabeel_user_session');
            auth.signOut();
            Toast.error("تم تعطيل الحساب أو إيقافه مؤقتاً من قبل الإدارة.");
            setTimeout(redirectToLogin, 1000);
          }
        }, (err) => {
          console.warn("User status live listener warning:", err);
        });
      }

    } catch (error) {
      console.error("Error protecting route:", error);
    }
  });
}

function redirectToLogin() {
  window.location.href = '/index.html';
}
