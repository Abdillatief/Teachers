import '../shared/utils/jsonShield.js';
// استيراد وحدات Firebase الأساسية والحديثة من الـ CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { 
  initializeFirestore, 
  getFirestore,
  memoryLocalCache,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";

// إعدادات الاتصال والتوثيق الحصرية لشبكة الأكاديمية
const firebaseConfig = {
  apiKey: "AIzaSyCDQ7fVz00-BsITXg5qgIkh5KN9SkDJ3Lc",
  authDomain: "sabeelteacher.firebaseapp.com",
  projectId: "sabeelteacher",
  storageBucket: "sabeelteacher.firebasestorage.app",
  messagingSenderId: "1036327109252",
  appId: "1:1036327109252:web:e8077bca8d147b2a03f8d1",
  measurementId: "G-LXGEX120T3"
};

// تهيئة تطبيق Firebase الأساسي
const app = initializeApp(firebaseConfig);

// تهيئة Firestore بذاكرة محلية فقط (بدون كاش IndexedDB) حتى لا تبقى بيانات
// المستخدم محفوظة على أجهزة مشتركة. لا نفرض Long Polling: قناة WebChannel هي
// الوضع الأسرع، وFirestore بيرجع لـ Long Polling تلقائيًا لو الشبكة منعتها.
let db;
try {
  db = initializeFirestore(app, {
    localCache: memoryLocalCache()
  });
} catch (err) {
  console.warn("تنبيه: تعذر تهيئة إعدادات Firestore المتقدمة، جاري استخدام التهيئة البديلة:", err);
  try {
    db = getFirestore(app);
  } catch (e2) {
    console.error("خطأ حرج في تهيئة Firestore:", e2);
  }
}

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
    if (data.brandColor && /^#[0-9a-fA-F]{6}$/.test(data.brandColor)) {
      const raw = data.brandColor;
      const r = parseInt(raw.slice(1, 3), 16);
      const g = parseInt(raw.slice(3, 5), 16);
      const b = parseInt(raw.slice(5, 7), 16);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      // Keep the shared design system as the source of truth. A neon value
      // (e.g. #00ffff) would otherwise repaint every button in the product.
      if (max <= 200 || max - min <= 150) {
        localStorage.setItem('academy_brand_color', raw);
        document.documentElement.style.setProperty('--primary-color', raw);
      } else {
        console.warn('[Theme] Ignored an out-of-palette brand color:', raw);
      }
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
