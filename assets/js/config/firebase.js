// استيراد وحدات Firebase الأساسية والحديثة من الـ CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// إعدادات الاتصال والتوثيق الحصرية لشبكة الأكاديمية
const firebaseConfig = {
  apiKey: "AIzaSyDnHh36qLmEIUo9Nu4osM09myctAUe2yrA",
  authDomain: "gen-lang-client-0752434152.firebaseapp.com",
  projectId: "gen-lang-client-0752434152",
  storageBucket: "gen-lang-client-0752434152.firebasestorage.app",
  messagingSenderId: "364212399683",
  appId: "1:364212399683:web:a16b52bc1ec74522a9eef6",
  measurementId: ""
};

// تهيئة تطبيق Firebase الأساسي
const app = initializeApp(firebaseConfig);

const FIRESTORE_DATABASE_ID = "ai-studio-47da20f1-fb86-4639-bc25-ea3c65761651";

// تهيئة Firestore مع تنشيط تكنولوجيا تخزين الكاش المحلي للعمل دون اتصال وتحديد قاعدة البيانات المخصصة
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, FIRESTORE_DATABASE_ID);

// تهيئة Firebase Auth وتعيين التخزين المحلي الآمن لحفظ الجلسات
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("خطأ تفعيل جلسة المتصفح المستدامة:", error);
  });

// تهيئة محرك التخزين وضبط أقصى وقت للمحاولة عند الفشل لـ ثانيتين فقط (2000ms) لمنع تعليق النظام
const storage = getStorage(app);
storage.maxUploadRetryTime = 2000; 

let analytics = null;

try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("تنبيه: تحليلات Google Analytics غير مدعومة في هذه البيئة الحالية.");
}

// مزامنة الألوان والشعار والدارك مود لحظياً لكل صفحات ومستخدمي المنصة (بما في ذلك شاشة تسجيل الدخول)
onSnapshot(doc(db, "settings", "academy"), (snapshot) => {
  if (snapshot.exists()) {
    const data = snapshot.data();
    if (data.brandColor) {
      localStorage.setItem('academy_brand_color', data.brandColor);
      document.documentElement.style.setProperty('--primary-color', data.brandColor);
    }
    if (data.logoURL) {
      localStorage.setItem('academy_logo_url', data.logoURL);
    } else {
      localStorage.removeItem('academy_logo_url');
    }
    if (data.academyName) {
      localStorage.setItem('academy_name', data.academyName);
    }
    if (data.academyDesc) {
      localStorage.setItem('academy_desc', data.academyDesc);
    } else {
      localStorage.removeItem('academy_desc');
    }
    const localMode = localStorage.getItem('academy_dark_mode');
    let useDark = false;
    if (localMode !== null) {
      useDark = localMode === 'true';
    } else {
      useDark = (data.darkMode === true || data.darkMode === 'true');
      localStorage.setItem('academy_dark_mode', useDark ? 'true' : 'false');
    }

    if (useDark) {
      document.body.classList.add('dark-theme');
      document.documentElement.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
      document.documentElement.classList.remove('dark-theme');
    }

    // تحديث شعار شاشة تسجيل الدخول أو التسجيل فورياً عند التواجد بها
    const loginLogoEl = document.getElementById('loginLogoContainer');
    if (loginLogoEl) {
      const descHtml = data.academyDesc ? `<p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.15rem; font-weight: 500; max-width: 280px; text-align: center; line-height: 1.4;">${data.academyDesc}</p>` : '';
      if (data.logoURL) {
        loginLogoEl.innerHTML = `
          <img src="${data.logoURL}" class="academy-logo-img" style="max-height: 85px; max-width: 260px; object-fit: contain; margin-bottom: 0.5rem;" alt="Logo">
          <span style="font-weight: 800; font-size: 1.6rem; display: block; color: var(--text-primary);">${data.academyName || 'سبيل'}</span>
          ${descHtml}
        `;
      } else {
        loginLogoEl.innerHTML = `
          <i data-lucide="graduation-cap" style="width: 72px; height: 72px; color: var(--primary-color);"></i>
          <span style="font-weight: 800; font-size: 1.6rem; display: block; color: var(--text-primary);">${data.academyName || 'سبيل'}</span>
          ${descHtml}
        `;
        if (window.lucide) window.lucide.createIcons();
      }
      const subtext = loginLogoEl.parentElement?.querySelector('p');
      if (subtext && data.academyName && !data.academyDesc) {
        subtext.textContent = data.academyName;
      }
    }
  }
}, (error) => {
  console.warn("تنبيه: تعذر الاتصال اللحظي بإعدادات الهوية البصرية:", error);
});

export { app, auth, db, storage, analytics };
