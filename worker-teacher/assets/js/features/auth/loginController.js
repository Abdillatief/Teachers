import { auth, db } from '../../config/firebase.js';
import { signInWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from '../../shared/utils/toast.js';
import { initI18n, getCurrentLanguage, setLanguage, t } from '../../shared/utils/translations.js';

// Initialize translations
initI18n();

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const rememberMeCheckbox = document.getElementById('rememberMe');
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  const eyeIcon = document.getElementById('eyeIcon');
  const eyeOffIcon = document.getElementById('eyeOffIcon');
  const langToggleBtn = document.getElementById('langToggleBtn');

  // Handle Language Switcher Button
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      const current = getCurrentLanguage();
      const nextLang = current === 'ar' ? 'en' : 'ar';
      setLanguage(nextLang);
    });
  }

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
      const enteredEmail = forgotEmailInput.value.trim();

      // Verify Captcha
      if (userEnteredCaptcha !== currentCaptchaCode) {
        Toast.warning("كود التحقق البشري غير صحيح، يرجى المحاولة مرة أخرى.");
        generateCaptcha();
        return;
      }

      const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
      const origHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="animate-spin" data-lucide="loader-2"></i> جاري الإرسال...`;
      if (window.lucide) window.lucide.createIcons();

      try {
        let teacherData = {
          name: "غير محدد",
          email: enteredEmail,
          phone: "غير محدد",
          role: "معلم",
          status: "مجهول",
          passwordInfo: "كلمة المرور المسجلة أو رابط إعادة تعيين جديد"
        };

        // Query Firestore users collection
        const qUsers = query(collection(db, "users"), where("email", "==", enteredEmail));
        const userSnap = await getDocs(qUsers);

        if (!userSnap.empty) {
          const uDoc = userSnap.docs[0].data();
          teacherData.name = uDoc.name || uDoc.displayName || teacherData.name;
          teacherData.phone = uDoc.phone || uDoc.phoneNumber || teacherData.phone;
          teacherData.role = uDoc.role === 'admin' ? 'مدير أكاديمية' : 'معلم';
          teacherData.status = uDoc.status || 'معتمد';
          if (uDoc.plainPassword || uDoc.password) {
            teacherData.passwordInfo = uDoc.plainPassword || uDoc.password;
          }
        }

        // 1. Send notification to Admin with full account info and password
        await addDoc(collection(db, "notifications"), {
          title: `🔑 طلب استعادة كلمة المرور للمعلم: ${teacherData.name}`,
          body: `أرسل المعلم (${teacherData.name}) طلب استعادة كلمة المرور بعد إجتياز كود التحقق البشري.\nالبريد الإلكتروني: ${teacherData.email}\nرقم الهاتف: ${teacherData.phone}\nالصفة: ${teacherData.role}\nالحالة: ${teacherData.status}\nكلمة المرور المسجلة: ${teacherData.passwordInfo}`,
          recipientId: "admin",
          type: "password_reset_request",
          teacherName: teacherData.name,
          teacherEmail: teacherData.email,
          teacherPhone: teacherData.phone,
          teacherRole: teacherData.role,
          teacherStatus: teacherData.status,
          teacherPassword: teacherData.passwordInfo,
          createdAt: new Date().toISOString(),
          readBy: []
        });

        // 2. Save explicitly to passwordRequests collection for the new Administrative Panel (إداري)
        await addDoc(collection(db, "passwordRequests"), {
          teacherName: teacherData.name,
          teacherEmail: teacherData.email,
          teacherPhone: teacherData.phone,
          teacherRole: teacherData.role,
          teacherStatus: teacherData.status,
          teacherPassword: teacherData.passwordInfo,
          status: "pending",
          createdAt: new Date().toISOString()
        });

        // Send standard password reset email as well
        try {
          await sendPasswordResetEmail(auth, enteredEmail);
        } catch (mailErr) {
          console.log("Firebase reset email notice:", mailErr);
        }

        Toast.success("تم تأكيد كود الإنسان وإرسال طلب استعادة الحساب ببياناتك الكاملة إلى إدارة الأكاديمية بنجاح ✅");
        closeForgotModal();

      } catch (err) {
        console.error("Forgot password submission error:", err);
        Toast.error("حدث خطأ أثناء محاولة إرسال الطلب. يرجى التأكد من الاتصال بالشبكة.");
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
