import { auth, db } from '../../config/firebase.js';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from '../../shared/utils/toast.js';
import { logTeacherActivity, logTeacherAttendance } from '../../shared/utils/activityLogger.js';

document.addEventListener('DOMContentLoaded', () => {
  const skeletonScreen = document.getElementById('sabeelLoginSkeleton');
  const splashScreen = document.getElementById('appSplashScreen');
  const loginForm = document.getElementById('loginForm');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const rememberMeCheckbox = document.getElementById('rememberMe');
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  const eyeIcon = document.getElementById('eyeIcon');
  const eyeOffIcon = document.getElementById('eyeOffIcon');

  // Function to smoothly hide the Sabeel Skeleton / Splash Screen
  const hideSkeletonScreen = () => {
    if (skeletonScreen) {
      skeletonScreen.classList.add('sabeel-sk-hidden');
      setTimeout(() => {
        skeletonScreen.style.display = 'none';
      }, 500);
    }
    if (splashScreen) {
      splashScreen.classList.add('splash-hidden');
      setTimeout(() => {
        splashScreen.style.display = 'none';
      }, 500);
    }
  };

  // High-End Dedicated Teacher Loading & Welcome Screen Transition
  const triggerTeacherLoadingScreen = (teacherName, targetUrl) => {
    const welcomeOverlay = document.getElementById('teacherWelcomeOverlay');
    const nameEl = document.getElementById('teacherWelcomeName');
    const progressBar = document.getElementById('teacherProgressBar');
    const statusText = document.getElementById('teacherLoadingStatusText');

    if (skeletonScreen) {
      skeletonScreen.style.display = 'none';
    }

    if (!welcomeOverlay) {
      window.location.href = targetUrl;
      return;
    }

    if (nameEl && teacherName) {
      nameEl.textContent = teacherName.startsWith('أ.') || teacherName.startsWith('الشيخ') ? teacherName : `أ. ${teacherName}`;
    }

    welcomeOverlay.classList.add('active');

    // Progress animation sequence
    if (progressBar) progressBar.style.width = '25%';
    if (statusText) statusText.textContent = 'جاري التحقق من هوية المعلم والصلاحيات...';

    setTimeout(() => {
      if (progressBar) progressBar.style.width = '65%';
      if (statusText) statusText.textContent = 'جاري مزامنة جدول الحصص وقوائم الطلاب...';
    }, 350);

    setTimeout(() => {
      if (progressBar) progressBar.style.width = '100%';
      if (statusText) statusText.textContent = 'مرحباً بك! جاري فتح لوحة التحكم...';
    }, 700);

    setTimeout(() => {
      window.location.href = targetUrl;
    }, 950);
  };

  // Dark Mode Theme Controller
  const toggleThemeLoginBtn = document.getElementById('toggleThemeLoginBtn');
  const themeLoginIcon = document.getElementById('themeLoginIcon');

  const applyLoginTheme = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add('dark-theme');
      document.body.classList.add('dark-theme');
      if (themeLoginIcon) themeLoginIcon.setAttribute('data-lucide', 'sun');
    } else {
      document.documentElement.classList.remove('dark-theme');
      document.body.classList.remove('dark-theme');
      if (themeLoginIcon) themeLoginIcon.setAttribute('data-lucide', 'moon');
    }
    if (window.lucide) window.lucide.createIcons();
  };

  const isDarkInitial = localStorage.getItem('academy_dark_mode') === 'true';
  applyLoginTheme(isDarkInitial);

  if (toggleThemeLoginBtn) {
    toggleThemeLoginBtn.addEventListener('click', () => {
      const currentlyDark = document.documentElement.classList.contains('dark-theme') || document.body.classList.contains('dark-theme');
      const nextDark = !currentlyDark;
      localStorage.setItem('academy_dark_mode', nextDark ? 'true' : 'false');
      applyLoginTheme(nextDark);
    });
  }

  // Load custom academy logo and branding
  const renderBranding = (logoUrl, name, desc) => {
    const splashLogoImg = document.getElementById('splashLogoImg');
    const splashAcademyTitle = document.getElementById('splashAcademyTitle');
    const splashAcademySubtitle = document.getElementById('splashAcademySubtitle');
    const mainAcademyName = document.getElementById('mainAcademyName');
    const mainAcademyTagline = document.getElementById('mainAcademyTagline');
    const loginLogoContainer = document.getElementById('loginLogoContainer');

    const academyName = name || 'أكاديمية سَبِيل';
    const academyDesc = desc || 'بوابة تسجيل الدخول للنظام الأكاديمي';
    const logoSrc = logoUrl || '/icons/icon-192.png';

    if (splashLogoImg) splashLogoImg.src = logoSrc;
    if (splashAcademyTitle) splashAcademyTitle.textContent = academyName;
    if (splashAcademySubtitle) splashAcademySubtitle.textContent = 'منظومة الإدارة الأكاديمية والتعليمية';

    if (mainAcademyName) mainAcademyName.textContent = academyName;
    if (mainAcademyTagline) mainAcademyTagline.textContent = academyDesc;
    if (loginLogoContainer) {
      loginLogoContainer.innerHTML = `<img src="${logoSrc}" class="academy-logo-img" alt="${academyName}">`;
    }
  };

  const cachedLogoUrl = localStorage.getItem('academy_logo_url');
  const cachedAcademyName = localStorage.getItem('academy_name') || 'أكاديمية سَبِيل';
  const cachedAcademyDesc = localStorage.getItem('academy_desc') || 'بوابة تسجيل الدخول للنظام الأكاديمي';
  renderBranding(cachedLogoUrl, cachedAcademyName, cachedAcademyDesc);

  // Fetch fresh branding settings from Firestore
  getDoc(doc(db, "settings", "academy")).then(snap => {
    if (snap.exists()) {
      const d = snap.data();
      if (d.logoURL) localStorage.setItem('academy_logo_url', d.logoURL);
      if (d.academyName) localStorage.setItem('academy_name', d.academyName);
      if (d.academyDesc) localStorage.setItem('academy_desc', d.academyDesc);
      renderBranding(d.logoURL || cachedLogoUrl, d.academyName || cachedAcademyName, d.academyDesc || cachedAcademyDesc);
    }
  }).catch(err => {
    console.warn("Could not fetch logo settings for login page:", err);
  });

  // Safety fallback: ensure skeleton screen is never stuck
  setTimeout(hideSkeletonScreen, 1800);

  // Check persistent login session immediately
  let authHandled = false;
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      // Allow user to see Sabeel signature skeleton briefly then transition smoothly to form
      setTimeout(hideSkeletonScreen, 350);
      return;
    }

    if (authHandled) return;

    try {
      // Fetch user profile from Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        hideSkeletonScreen();
        return;
      }

      authHandled = true;
      const userData = userDoc.data();
      const role = userData.role;
      const status = userData.status;

      // Handle Admin Persistent Session
      if (role === 'admin') {
        const lastPage = localStorage.getItem('sabeel_last_page');
        if (lastPage && lastPage.includes('/admin/') && !lastPage.endsWith('login.html') && !lastPage.endsWith('index.html')) {
          window.location.href = lastPage;
        } else {
          window.location.href = '/admin/dashboard.html';
        }
        return;
      }

      // Handle Teacher Persistent Session
      if (role === 'teacher') {
        if (status !== 'approved') {
          await auth.signOut();
          Toast.warning("حساب المعلم بانتظار مراجعة وتفعيل المسؤول.");
          hideSkeletonScreen();
          authHandled = false;
          return;
        }

        // Check maintenance mode
        let isMaintenance = false;
        try {
          const maintSnap = await getDoc(doc(db, "settings", "maintenance"));
          if (maintSnap.exists()) {
            isMaintenance = maintSnap.data().maintenanceMode === true;
          }
        } catch (mErr) {
          console.warn("Could not check maintenance mode during auto-login:", mErr);
        }

        if (isMaintenance) {
          window.location.href = '/teacher/maintenance.html';
          return;
        }

        const lastPage = localStorage.getItem('sabeel_last_page');
        const targetDashboard = (lastPage && lastPage.includes('/teacher/') && !lastPage.endsWith('maintenance.html') && !lastPage.endsWith('index.html'))
          ? lastPage
          : '/teacher/dashboard.html';

        triggerTeacherLoadingScreen(userData.name || user.email, targetDashboard);
        return;
      }

      // Other roles fallback
      hideSkeletonScreen();

    } catch (error) {
      console.error("Auto-login error:", error);
      hideSkeletonScreen();
    }
  });

  // Load remembered credentials
  const isRemembered = localStorage.getItem('sabeel_remember_me') !== 'false';
  const rememberedEmail = localStorage.getItem('sabeel_remembered_email') || '';
  if (rememberMeCheckbox) {
    rememberMeCheckbox.checked = isRemembered;
    rememberMeCheckbox.addEventListener('change', () => {
      if (!rememberMeCheckbox.checked) {
        localStorage.setItem('sabeel_remember_me', 'false');
        localStorage.removeItem('sabeel_remembered_email');
      } else {
        localStorage.setItem('sabeel_remember_me', 'true');
      }
    });
  }

  if (rememberedEmail && emailInput) {
    const cleanDisplayEmail = rememberedEmail.replace(/@gmail\.com$/i, '');
    emailInput.value = cleanDisplayEmail;
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

  // Captcha & Forgot Password Modal Logic
  const forgotPasswordModal = document.getElementById('forgotPasswordModal');
  const closeForgotModalBtn = document.getElementById('closeForgotModalBtn');
  const cancelForgotBtn = document.getElementById('cancelForgotBtn');
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  const forgotEmailInput = document.getElementById('forgotEmail');
  const captchaCodeDisplay = document.getElementById('captchaCodeDisplay');
  const refreshCaptchaBtn = document.getElementById('refreshCaptchaBtn');
  const captchaInput = document.getElementById('captchaInput');

  let currentCaptchaCode = "";

  function generateCaptcha() {
    currentCaptchaCode = Math.floor(1000 + Math.random() * 9000).toString();
    if (captchaCodeDisplay) {
      captchaCodeDisplay.textContent = currentCaptchaCode;
    }
    if (captchaInput) {
      captchaInput.value = "";
    }
  }

  function openForgotModal() {
    if (!forgotPasswordModal) return;
    const initialEmail = emailInput ? emailInput.value.trim() : '';
    if (forgotEmailInput) forgotEmailInput.value = initialEmail;
    generateCaptcha();
    forgotPasswordModal.style.display = 'flex';
    if (window.lucide) window.lucide.createIcons();
  }

  function closeForgotModal() {
    if (forgotPasswordModal) forgotPasswordModal.style.display = 'none';
  }

  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openForgotModal();
    });
  }

  if (closeForgotModalBtn) closeForgotModalBtn.addEventListener('click', closeForgotModal);
  if (cancelForgotBtn) cancelForgotBtn.addEventListener('click', closeForgotModal);
  if (refreshCaptchaBtn) refreshCaptchaBtn.addEventListener('click', generateCaptcha);

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const userEnteredCaptcha = captchaInput.value.trim();
      let rawEmailInput = forgotEmailInput.value.trim();

      if (!rawEmailInput) {
        Toast.warning("يرجى إدخال البريد الإلكتروني أو اسم المستخدم.");
        return;
      }

      let targetEmail = rawEmailInput;
      if (!targetEmail.includes('@')) {
        targetEmail = `${targetEmail}@gmail.com`;
      }
      targetEmail = targetEmail.toLowerCase().trim();

      if (userEnteredCaptcha !== currentCaptchaCode) {
        Toast.warning("كود التحقق الأمني غير صحيح، يرجى المحاولة مرة أخرى.");
        generateCaptcha();
        return;
      }

      const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
      const origHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="animate-spin" data-lucide="loader-2"></i> جاري إرسال البريد...`;
      if (window.lucide) window.lucide.createIcons();

      try {
        await sendPasswordResetEmail(auth, targetEmail);
        Toast.success(`تم إرسال رابط إعادة تعيين كلمة المرور بنجاح إلى (${targetEmail}).`);
        closeForgotModal();
      } catch (err) {
        console.error("Forgot password email error:", err);
        if (err.code === 'auth/user-not-found') {
          Toast.error("لم يتم العثور على حساب مسجل بهذا البريد الإلكتروني.");
        } else if (err.code === 'auth/invalid-email') {
          Toast.error("صيغة البريد الإلكتروني المدخلة غير صحيحة.");
        } else {
          Toast.error("تعذر إرسال بريد استعادة كلمة المرور، يرجى التأكد من البريد والاتصال بالإنترنت.");
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHtml;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      let rawVal = emailInput.value.trim();
      if (!rawVal) {
        Toast.warning("يرجى إدخال اسم المستخدم أو البريد الإلكتروني.");
        return;
      }

      let email = rawVal;
      if (!email.includes('@')) {
        email = `${email}@gmail.com`;
      }
      email = email.toLowerCase().trim();

      const password = passwordInput.value;
      const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : true;

      if (!password) {
        Toast.warning("يرجى إدخال كلمة المرور.");
        return;
      }

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalBtnHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="animate-spin" data-lucide="loader-2"></i> جاري التحقق...`;
      if (window.lucide) window.lucide.createIcons();

      try {
        // Enforce browser local persistence for persistent login
        try {
          await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        } catch (pErr) {
          console.warn("Persistence set warning:", pErr);
        }

        if (rememberMe) {
          localStorage.setItem('sabeel_remember_me', 'true');
          localStorage.setItem('sabeel_remembered_email', email);
        } else {
          localStorage.setItem('sabeel_remember_me', 'false');
          localStorage.removeItem('sabeel_remembered_email');
        }
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Fetch user document from Firestore
        const userDocRef = doc(db, "users", user.uid);
        let userDoc = null;
        try {
          userDoc = await getDoc(userDocRef);
        } catch (docErr) {
          console.warn("Error fetching user document:", docErr);
        }

        if (!userDoc || !userDoc.exists()) {
          // If admin email convention or fallback
          if (email.includes('admin')) {
            localStorage.setItem('sabeel_last_page', '/admin/dashboard.html');
            Toast.success("تم تسجيل الدخول بنجاح! مرحباً بك في لوحة الإدارة.");
            setTimeout(() => {
              window.location.href = '/admin/dashboard.html';
            }, 300);
            return;
          }

          await auth.signOut();
          Toast.error("لم يتم العثور على ملف تعريف المستخدم الخاص بك في النظام.");
          resetSubmitBtn();
          return;
        }

        const userData = userDoc.data();
        const role = userData.role;
        const status = userData.status;

        if (role === 'admin') {
          // Non-blocking update of lastLogin
          updateDoc(userDocRef, {
            lastLogin: new Date()
          }).catch(err => console.warn("Could not update lastLogin:", err));

          localStorage.setItem('sabeel_last_page', '/admin/dashboard.html');
          Toast.success("تم تسجيل الدخول بنجاح! مرحباً بك في لوحة الإدارة.");
          setTimeout(() => {
            window.location.href = '/admin/dashboard.html';
          }, 300);

        } else if (role === 'teacher') {
          if (status !== 'approved') {
            await auth.signOut();
            Toast.warning("حساب المعلم بانتظار المراجعة والاعتماد من قبل الإدارة.");
            resetSubmitBtn();
            return;
          }

          // Non-blocking update and logging
          updateDoc(userDocRef, {
            lastLogin: new Date()
          }).catch(err => console.warn("Could not update lastLogin:", err));

          logTeacherActivity({
            teacherId: user.uid,
            teacherName: userData.name || user.email,
            actionCategory: 'auth',
            actionTitle: 'تسجيل الدخول إلى النظام',
            details: { email: user.email }
          }).catch(err => console.warn("Activity log failed:", err));

          logTeacherAttendance({
            teacherId: user.uid,
            teacherName: userData.name || user.email,
            eventType: 'login'
          }).catch(err => console.warn("Attendance log failed:", err));

          // Check maintenance mode
          let isTeacherMaintenance = false;
          try {
            const maintSnap = await getDoc(doc(db, "settings", "maintenance"));
            if (maintSnap.exists()) {
              isTeacherMaintenance = maintSnap.data().maintenanceMode === true;
            }
          } catch (mErr) {
            console.warn("Could not check maintenance mode during login:", mErr);
          }

          if (isTeacherMaintenance) {
            Toast.warning("تنبيه: النظام قيد الصيانة والتحديثات حالياً.");
            setTimeout(() => {
              window.location.href = '/teacher/maintenance.html';
            }, 300);
          } else {
            localStorage.setItem('sabeel_last_page', '/teacher/dashboard.html');
            triggerTeacherLoadingScreen(userData.name || user.email, '/teacher/dashboard.html');
          }
        } else {
          await auth.signOut();
          Toast.error("غير مصرح بالدخول لهذا النوع من الحسابات.");
          resetSubmitBtn();
        }

      } catch (error) {
        console.warn("Login failed with error:", error.code || error.message);
        let errorMsg = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
        if (error.code === 'auth/too-many-requests') {
          errorMsg = "تم حظر الحساب مؤقتاً لكثرة المحاولات الفاشلة. يرجى المحاولة لاحقاً.";
        } else if (error.code === 'auth/network-request-failed') {
          errorMsg = "فشل الاتصال، يرجى التحقق من اتصال الإنترنت.";
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
