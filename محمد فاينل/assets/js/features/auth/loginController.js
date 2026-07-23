import { auth, db } from '../../config/firebase.js';
import { signInWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from '../../shared/utils/toast.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const rememberMeCheckbox = document.getElementById('rememberMe');
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  const eyeIcon = document.getElementById('eyeIcon');
  const eyeOffIcon = document.getElementById('eyeOffIcon');

  // Load custom academy logo and name dynamically
  const cachedLogoUrl = localStorage.getItem('academy_logo_url');
  const cachedAcademyName = localStorage.getItem('academy_name') || 'سبيل';
  
  const loginLogoContainer = document.getElementById('loginLogoContainer');
  if (loginLogoContainer) {
    if (cachedLogoUrl) {
      loginLogoContainer.innerHTML = `
        <img src="${cachedLogoUrl}" class="academy-logo-img" style="max-height: 80px; max-width: 100%; object-fit: contain; border-radius: 8px; margin-bottom: 0.5rem;" alt="Logo">
        <span style="font-weight:800; font-size: 2rem;">${cachedAcademyName}</span>
      `;
    } else {
      loginLogoContainer.innerHTML = `
        <i data-lucide="graduation-cap" style="width:72px;height:72px;color:var(--primary-color);"></i>
        <span style="font-weight:800;">${cachedAcademyName}</span>
      `;
    }
  }
  const academySub = document.querySelector('body > div > div > p');
  if (academySub) {
    academySub.textContent = `أكاديمية ${cachedAcademyName}`;
  }

  // Toggle password visibility
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      if (eyeIcon && eyeOffIcon) {
        eyeIcon.style.display = isPassword ? 'none' : 'block';
        eyeOffIcon.style.display = isPassword ? 'block' : 'none';
      }
    });
  }

  // Forgot password
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      if (!email) {
        Toast.warning("الرجاء إدخال البريد الإلكتروني أولاً لإرسال رابط استعادة كلمة المرور.");
        return;
      }
      try {
        await sendPasswordResetEmail(auth, email);
        Toast.success("تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح.");
      } catch (error) {
        console.error("Password reset error:", error);
        Toast.error("فشل إرسال رابط استعادة كلمة المرور. تأكد من صحة البريد الإلكتروني.");
      }
    });
  }

  // Login submit handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalBtnHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="animate-spin" data-lucide="loader-2"></i> جاري التحقق...`;
      if (window.lucide) window.lucide.createIcons();

      try {
        // Set persistence based on rememberMe checkbox
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Fetch user document from Firestore to check role
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          await auth.signOut();
          Toast.error("لم يتم العثور على ملف تعريف المستخدم الخاص بك في النظام.");
          resetSubmitBtn();
          return;
        }

        const userData = userDoc.data();
        const role = userData.role; // 'admin' or 'teacher'
        const status = userData.status; // 'pending', 'approved', 'rejected'

        if (role === 'admin') {
          // Log login timestamp
          await updateDoc(userDocRef, {
            lastLogin: new Date()
          });
          Toast.success("تم تسجيل الدخول بنجاح! مرحباً بك في لوحة تحكم الإدارة.");
          setTimeout(() => {
            window.location.href = 'admin/dashboard.html';
          }, 1000);
        } else if (role === 'teacher') {
          if (status !== 'approved') {
            await auth.signOut();
            Toast.warning("حساب المعلم بانتظار المراجعة والاعتماد من قبل الإدارة.");
            resetSubmitBtn();
            return;
          }

          // Log login timestamp
          await updateDoc(userDocRef, {
            lastLogin: new Date()
          });
          Toast.success("تم تسجيل الدخول بنجاح! مرحباً بك.");
          setTimeout(() => {
            window.location.href = 'teacher/dashboard.html';
          }, 1000);
        } else {
          await auth.signOut();
          Toast.error("غير مصرح بالدخول لهذا النوع من الحسابات.");
          resetSubmitBtn();
        }

      } catch (error) {
        console.error("Login failed:", error);
        let errorMsg = "فشل تسجيل الدخول. يرجى التحقق من البريد الإلكتروني وكلمة المرور.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          errorMsg = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
        } else if (error.code === 'auth/too-many-requests') {
          errorMsg = "تم حظر الحساب مؤقتاً لكثرة المحاولات الفاشلة. يرجى المحاولة لاحقاً.";
        }
        Toast.error(errorMsg);
        resetSubmitBtn();
      }

      function resetSubmitBtn() {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }
});
