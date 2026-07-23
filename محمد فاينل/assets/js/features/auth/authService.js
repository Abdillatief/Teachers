import { auth, db } from '../../config/firebase.js';
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from '../../shared/utils/toast.js';

/**
 * Protects a route by ensuring the user is authenticated and has the correct role.
 * @param {string} requiredRole - 'admin' or 'teacher'
 */
export function protectRoute(requiredRole) {
  auth.onAuthStateChanged(async (user) => {
    const currentPath = window.location.pathname;
    
    if (!user) {
      // If not logged in, redirect to login page (index.html)
      // Check path to construct correct relative path to root index.html
      if (currentPath.includes('/admin/') || currentPath.includes('/teacher/')) {
        window.location.href = '/index.html';
      } else if (currentPath !== '/' && !currentPath.endsWith('index.html') && !currentPath.endsWith('register.html')) {
        window.location.href = '/index.html';
      }
      return;
    }

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // No user profile in DB, sign out and redirect
        await auth.signOut();
        Toast.error("لم يتم العثور على ملف تعريف المستخدم الخاص بك.");
        redirectToLogin(currentPath);
        return;
      }

      const userData = userDoc.data();
      const userRole = userData.role; // 'admin' or 'teacher'
      const userStatus = userData.status; // 'pending', 'approved', 'rejected'

      if (userRole !== requiredRole) {
        if (userRole === 'admin') {
          window.location.href = currentPath.includes('/teacher/') ? '../admin/dashboard.html' : 'admin/dashboard.html';
        } else if (userRole === 'teacher') {
          if (userStatus !== 'approved') {
            await auth.signOut();
            Toast.warning("حساب المعلم الخاص بك بانتظار مراجعة وتفعيل المسؤول.");
            redirectToLogin(currentPath);
            return;
          }
          window.location.href = currentPath.includes('/admin/') ? '../teacher/dashboard.html' : 'teacher/dashboard.html';
        } else {
          await auth.signOut();
          redirectToLogin(currentPath);
        }
        return;
      }

      // If teacher and not approved, log out and redirect
      if (userRole === 'teacher' && userStatus !== 'approved') {
        await auth.signOut();
        Toast.warning("حساب المعلم الخاص بك بانتظار مراجعة وتفعيل المسؤول.");
        redirectToLogin(currentPath);
        return;
      }

    } catch (error) {
      console.error("Error protecting route:", error);
      Toast.error("حدث خطأ أثناء التحقق من صلاحيات الدخول.");
    }
  });
}

function redirectToLogin(currentPath) {
  window.location.href = '/index.html';
}
