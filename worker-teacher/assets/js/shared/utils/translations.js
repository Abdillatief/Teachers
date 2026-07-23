// External dictionary for multi-language support (Arabic & English)

export const translations = {
  ar: {
    // Page Title
    pageTitleLogin: "أكاديمية سبيل - تسجيل الدخول",
    pageTitleRegister: "أكاديمية سبيل - تسجيل معلم جديد",

    // Branding & Header
    academyName: "سبيل",
    subTitleLogin: "منصة إدراة الحلقات القرآنية",
    languageSwitcher: "English",

    // Login Form Labels & Controls
    emailLabel: "البريد الإلكتروني للمعلم / المسؤول",
    emailPlaceholder: "اسم الحساب (مثال: teacher1)",
    passwordLabel: "كلمة المرور",
    passwordPlaceholder: "••••••••",
    rememberMe: "تذكرني",
    forgotPassword: "نسيت كلمة المرور؟",
    loginBtn: "تسجيل الدخول",
    noAccountPrompt: "ليس لديك حساب معلم؟",
    registerLink: "سجل كمعلم جديد",

    // Register Form Labels
    registerHeader: "تسجيل معلم جديد",
    registerSubHeader: "أدخل بياناتك للانضمام إلى كادر معلمي الأكاديمية",
    fullNameLabel: "الاسم الكامل",
    fullNamePlaceholder: "أدخل اسمك الثلاثي أو الرباعي",
    phoneLabel: "رقم الهاتف / الواتساب",
    phonePlaceholder: "05xxxxxxxx",
    emailTeacherLabel: "البريد الإلكتروني للمعلم",
    emailTeacherPlaceholder: "أدخل اسم الحساب فقط (مثال: ahmed123)",
    emailHelpText: "البريد الإلكتروني ينتهي تلقائياً بـ @gmail.com",
    confirmPasswordLabel: "تأكيد كلمة المرور",
    confirmPasswordPlaceholder: "أعد كتابة كلمة المرور",
    submitRegisterBtn: "تقديم طلب التسجيل",
    alreadyHaveAccount: "لديك حساب بالفعل؟",
    loginLink: "تسجيل الدخول",

    // Forgot Password Modal
    modalForgotTitle: "استعادة حساب المعلم",
    modalForgotSub: "يرجى تأكيد إثبات كود الإنسان وإدخال البريد الإلكتروني",
    captchaLabel: "كود التحقق البشري (Captcha)",
    captchaPlaceholder: "أدخل كود التحقق الأرقام أعلاه...",
    cancelBtn: "إلغاء",
    sendToAdminBtn: "إرسال للإدارة",

    // Notifications & Messages
    loginSuccess: "تم تسجيل الدخول بنجاح",
    loginError: "عذراً! البريد الإلكتروني أو كلمة المرور غير صحيحة",
    teacherPending: "حسابك قيد المراجعة والموافقة من قبل الإدارة",
    teacherInactive: "حساب المعلم غير نشط حالياً، تواصل مع الإدارة",
    accountNotFound: "لم يتم العثور على حساب بهذه البيانات",
    captchaInvalid: "رمز التحقق البشري غير صحيح، يرجى المحاولة مرة أخرى",
    resetRequestSent: "تم إرسال طلب استعادة كلمة المرور للمسؤول بنجاح",
    requiredFields: "يرجى ملء كافة الحقول المطلوبة",
    passwordsMismatch: "كلمتا المرور غير متطابقتين",
    passwordTooShort: "كلمة المرور يجب أن لا تقل عن 6 أحرف",
    registerSuccess: "تم تقديم طلب التسجيل بنجاح! بانتظار موافقة الإدارة.",
    generalError: "حدث خطأ غير متوقع، يرجى المحاولة لاحقاً"
  },
  en: {
    // Page Title
    pageTitleLogin: "Sabeel Academy - Login",
    pageTitleRegister: "Sabeel Academy - Teacher Registration",

    // Branding & Header
    academyName: "Sabeel",
    subTitleLogin: "Quranic Circles Management Platform",
    languageSwitcher: "العربية",

    // Login Form Labels & Controls
    emailLabel: "Teacher / Admin Email",
    emailPlaceholder: "Username (e.g. teacher1)",
    passwordLabel: "Password",
    passwordPlaceholder: "••••••••",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password?",
    loginBtn: "Sign In",
    noAccountPrompt: "Don't have a teacher account?",
    registerLink: "Register as new teacher",

    // Register Form Labels
    registerHeader: "New Teacher Registration",
    registerSubHeader: "Enter your details to join the academy teaching staff",
    fullNameLabel: "Full Name",
    fullNamePlaceholder: "Enter your full name",
    phoneLabel: "Phone / WhatsApp",
    phonePlaceholder: "05xxxxxxxx",
    emailTeacherLabel: "Teacher Email",
    emailTeacherPlaceholder: "Enter username only (e.g. ahmed123)",
    emailHelpText: "Email automatically ends with @gmail.com",
    confirmPasswordLabel: "Confirm Password",
    confirmPasswordPlaceholder: "Re-enter password",
    submitRegisterBtn: "Submit Application",
    alreadyHaveAccount: "Already have an account?",
    loginLink: "Sign In",

    // Forgot Password Modal
    modalForgotTitle: "Account Recovery",
    modalForgotSub: "Please verify captcha and enter your email",
    captchaLabel: "Human Verification (Captcha)",
    captchaPlaceholder: "Enter code digits above...",
    cancelBtn: "Cancel",
    sendToAdminBtn: "Send to Admin",

    // Notifications & Messages
    loginSuccess: "Logged in successfully",
    loginError: "Invalid email or password",
    teacherPending: "Your account is pending admin approval",
    teacherInactive: "Account is inactive, please contact admin",
    accountNotFound: "No account found with these details",
    captchaInvalid: "Invalid captcha code, please try again",
    resetRequestSent: "Password reset request sent to admin successfully",
    requiredFields: "Please fill in all required fields",
    passwordsMismatch: "Passwords do not match",
    passwordTooShort: "Password must be at least 6 characters",
    registerSuccess: "Application submitted successfully! Awaiting admin approval.",
    generalError: "An unexpected error occurred, please try again later"
  }
};

/**
 * Gets currently selected language code
 */
export function getCurrentLanguage() {
  return localStorage.getItem('sabeel_lang') || 'ar';
}

/**
 * Sets current language code ('ar' or 'en') and updates DOM
 */
export function setLanguage(lang) {
  const targetLang = (lang === 'en' || lang === 'ar') ? lang : 'ar';
  localStorage.setItem('sabeel_lang', targetLang);

  const htmlElem = document.documentElement;
  htmlElem.setAttribute('lang', targetLang);
  htmlElem.setAttribute('dir', targetLang === 'ar' ? 'rtl' : 'ltr');

  applyTranslationsToPage();
}

/**
 * Get translation string by key
 */
export function t(key) {
  const currentLang = getCurrentLanguage();
  return translations[currentLang]?.[key] || translations['ar']?.[key] || key;
}

/**
 * Scans page for data-i18n and data-i18n-placeholder attributes and updates text
 */
export function applyTranslationsToPage() {
  const currentLang = getCurrentLanguage();
  const langDict = translations[currentLang] || translations['ar'];

  // Text content elements
  document.querySelectorAll('[data-i18n]').forEach((elem) => {
    const key = elem.getAttribute('data-i18n');
    if (key && langDict[key]) {
      // Preserve child icons if present
      const icon = elem.querySelector('i[data-lucide], svg');
      if (icon) {
        const iconClone = icon.cloneNode(true);
        elem.textContent = ' ' + langDict[key];
        if (currentLang === 'ar') {
          elem.insertBefore(iconClone, elem.firstChild);
        } else {
          elem.appendChild(iconClone);
        }
      } else {
        elem.textContent = langDict[key];
      }
    }
  });

  // Placeholder elements
  document.querySelectorAll('[data-i18n-placeholder]').forEach((elem) => {
    const key = elem.getAttribute('data-i18n-placeholder');
    if (key && langDict[key]) {
      elem.setAttribute('placeholder', langDict[key]);
    }
  });

  // Page titles
  if (document.title.includes('تسجيل الدخول') || document.title.includes('Login')) {
    document.title = langDict['pageTitleLogin'];
  } else if (document.title.includes('تسجيل معلم') || document.title.includes('Registration')) {
    document.title = langDict['pageTitleRegister'];
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Initializes language support on DOM load
 */
export function initI18n() {
  const currentLang = getCurrentLanguage();
  const htmlElem = document.documentElement;
  htmlElem.setAttribute('lang', currentLang);
  htmlElem.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyTranslationsToPage());
  } else {
    applyTranslationsToPage();
  }
}
