import { auth, db } from '../../config/firebase.js';
import { signInWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

  // Dark Mode Theme Controller for Login Page
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

  // Initial theme setup on page load
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

  // Load custom academy logo and name dynamically
  const renderLogoAndName = (logoUrl, name, desc) => {
    const loginLogoContainer = document.getElementById('loginLogoContainer');
    if (!loginLogoContainer) return;
    const academyName = name || 'سبيل';
    const descHtml = desc ? `<p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem; font-weight: 500; max-width: 280px; text-align: center; line-height: 1.4;">${desc}</p>` : '';
    
    if (logoUrl) {
      loginLogoContainer.innerHTML = `
        <img src="${logoUrl}" class="academy-logo-img" style="max-height: 85px; max-width: 260px; object-fit: contain; margin-bottom: 0.5rem; transition: transform 0.3s ease;" alt="Logo">
        <span style="font-weight:800; font-size: 2rem; color: var(--text-primary); display: block;">${academyName}</span>
        ${descHtml}
      `;
    } else {
      loginLogoContainer.innerHTML = `
        <i data-lucide="graduation-cap" style="width:72px;height:72px;color:var(--primary-color);"></i>
        <span style="font-weight:800; font-size: 2rem; color: var(--text-primary); display: block;">${academyName}</span>
        ${descHtml}
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  };

  // Initial load from cache
  const cachedLogoUrl = localStorage.getItem('academy_logo_url');
  const cachedAcademyName = localStorage.getItem('academy_name') || 'سبيل';
  const cachedAcademyDesc = localStorage.getItem('academy_desc') || '';
  renderLogoAndName(cachedLogoUrl, cachedAcademyName, cachedAcademyDesc);

  // Fetch fresh settings from Firestore to ensure PNG logo & branding is always up to date
  getDoc(doc(db, "settings", "academy")).then(snap => {
    if (snap.exists()) {
      const d = snap.data();
      if (d.logoURL) localStorage.setItem('academy_logo_url', d.logoURL);
      if (d.academyName) localStorage.setItem('academy_name', d.academyName);
      if (d.academyDesc) localStorage.setItem('academy_desc', d.academyDesc);
      renderLogoAndName(d.logoURL || cachedLogoUrl, d.academyName || cachedAcademyName, d.academyDesc || cachedAcademyDesc);
    }
  }).catch(err => {
    console.warn("Could not fetch logo settings for login page:", err);
  });

  // Load remembered login info
  const isRemembered = localStorage.getItem('sabeel_remember_me') === 'true';
  const rememberedEmail = localStorage.getItem('sabeel_remembered_email') || '';
  if (rememberMeCheckbox) {
    rememberMeCheckbox.checked = isRemembered;
    rememberMeCheckbox.addEventListener('change', () => {
      if (!rememberMeCheckbox.checked) {
        localStorage.setItem('sabeel_remember_me', 'false');
        localStorage.removeItem('sabeel_remembered_email');
      }
    });
  }
  if (isRemembered && rememberedEmail && emailInput) {
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
    // Generate random 4-digit code
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

      // Automatically construct Gmail address if user provided username without @
      const cleanUsername = rawEmailInput.replace(/@.*$/, '').trim();
      const targetEmail = rawEmailInput.includes('@') ? rawEmailInput : `${cleanUsername}@gmail.com`;

      // Verify Captcha
      if (userEnteredCaptcha !== currentCaptchaCode) {
        Toast.warning("كود التحقق البشري غير صحيح، يرجى المحاولة مرة أخرى.");
        generateCaptcha();
        return;
      }

      const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
      const origHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="animate-spin" data-lucide="loader-2"></i> جاري إرسال البريد...`;
      if (window.lucide) window.lucide.createIcons();

      try {
        // Send password reset email directly via Firebase Auth
        await sendPasswordResetEmail(auth, targetEmail);

        Toast.success(`تم إرسال رابط إعادة تعيين كلمة المرور بنجاح إلى Gmail (${targetEmail})! 📬\nيرجى فتح بريدك الإلكتروني ومراجعة صندوق الوارد (Inbox) أو مجلد الرسائل غير المرغوب فيها (Spam).`);
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

  // Login submit handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      let rawVal = emailInput.value.trim();
      const cleanUsername = rawVal.replace(/@.*$/, '').trim();
      const email = cleanUsername ? `${cleanUsername}@gmail.com` : rawVal;
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

        if (rememberMe) {
          localStorage.setItem('sabeel_remember_me', 'true');
          localStorage.setItem('sabeel_remembered_email', email);
        } else {
          localStorage.setItem('sabeel_remember_me', 'false');
          localStorage.removeItem('sabeel_remembered_email');
        }
        
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
