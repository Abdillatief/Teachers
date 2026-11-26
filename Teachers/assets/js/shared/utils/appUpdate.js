/**
 * Sabeel Academy - In-App Update Checker (Android / Capacitor)
 * ------------------------------------------------------------------
 * التطبيق محمّل داخل الـAPK (نسخة مجمّدة من الموقع)، فبدون هذا الملف
 * يفضل المستخدم على إصدار قديم للأبد بدون أي تنبيه.
 *
 * الطريقة:
 *  - ملف `version.json` على السيرفر يحمل رقم آخر إصدار منشور
 *    (يتم توليده تلقائياً من scripts/build-android-apk.mjs).
 *  - نسخة داخل الـAPK من نفس الملف تحمل رقم الإصدار الحالي المثبّت.
 *  - لو رقم السيرفر أكبر من رقم التطبيق يظهر شريط «تحديث جديد متاح»،
 *    وزر التحديث يفتح صفحة التحميل في متصفح النظام لتنزيل الـAPK الجديد.
 *
 * كل الأخطاء هنا صامتة: فحص التحديث لا يجب أن يعطّل التطبيق أبداً.
 */

import { isCapacitorNative, openExternalUrl } from './medianBridge.js';
import { Toast } from './toast.js';

const VERSION_FILE = '/version.json';
const LAST_CHECK_KEY = 'sabeel_update_last_check';
const DISMISSED_KEY = 'sabeel_update_dismissed';

const CHECK_DELAY_MS = 3000;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

/**
 * دومين الموقع المنشور الوحيد الذي يُقرأ منه آخر إصدار (Cloudflare Worker).
 * ملاحظة: مشروع Firebase Hosting غير مستخدم للنشر، فلا نجرّب أي دومين آخر.
 */
const SITE_BASE = 'https://teachers.sabeelacademy8.workers.dev';

/** @param {number|string} currentCode @param {number|string} latestCode */
export function isNewerVersion(currentCode, latestCode) {
  const current = Number(currentCode) || 0;
  const latest = Number(latestCode) || 0;
  return latest > current;
}

function withCacheBust(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
}

async function fetchJson(url) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : null;
  try {
    const response = await fetch(withCacheBust(url), {
      cache: 'no-store',
      signal: controller ? controller.signal : undefined,
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || typeof data !== 'object') return null;
    return Number(data.versionCode) > 0 ? data : null;
  } catch (_) {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** رقم الإصدار المضمّن مع هذه النسخة من التطبيق/الموقع */
async function readCurrentVersion() {
  return fetchJson(VERSION_FILE);
}

/**
 * بيانات الإصدار الحالي المثبّت (لعرضها في الملف الشخصي).
 * @returns {Promise<{versionCode: number, versionName: string}|null>}
 */
export async function getAppVersionInfo() {
  try {
    return await readCurrentVersion();
  } catch (_) {
    return null;
  }
}

/** أحدث إصدار منشور على دومين الموقع (أو null لو الشبكة/الملف غير متاح) */
async function readLatestVersion() {
  const data = await fetchJson(`${SITE_BASE}${VERSION_FILE}`);
  return data ? { ...data, base: SITE_BASE } : null;
}

function absoluteUrl(path, base) {
  const value = String(path || '').trim();
  if (/^https?:\/\//i.test(value)) return value;
  const cleanBase = String(base || '').replace(/\/$/, '');
  if (!cleanBase) return '';
  return `${cleanBase}/${value.replace(/^\//, '')}`;
}

function wasDismissed(versionCode) {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === String(versionCode);
  } catch (_) {
    return false;
  }
}

function markDismissed(versionCode) {
  try {
    sessionStorage.setItem(DISMISSED_KEY, String(versionCode));
  } catch (_) {}
}

function buildBanner(current, latest, downloadUrl) {
  const existing = document.getElementById('sabeelUpdateBanner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'sabeelUpdateBanner';
  banner.setAttribute('role', 'alertdialog');
  banner.setAttribute('dir', 'rtl');
  banner.style.cssText = [
    'position:fixed',
    'left:12px',
    'right:12px',
    'bottom:calc(12px + env(safe-area-inset-bottom, 0px))',
    'z-index:2147483000',
    'display:flex',
    'flex-wrap:wrap',
    'align-items:center',
    'gap:10px',
    'padding:14px 16px',
    'border-radius:16px',
    'background:linear-gradient(135deg,#0d9488,#0f766e)',
    'color:#ffffff',
    'box-shadow:0 16px 40px rgba(0,0,0,.35)',
    'font-family:"Segoe UI",Tahoma,Arial,sans-serif',
    'font-size:14px',
    'line-height:1.6',
  ].join(';');

  const text = document.createElement('div');
  text.style.cssText = 'flex:1 1 220px;min-width:180px;';
  const title = document.createElement('div');
  title.style.cssText = 'font-weight:800;font-size:15px;margin-bottom:2px;';
  title.textContent = 'تحديث جديد متاح';
  const details = document.createElement('div');
  details.style.cssText = 'opacity:.92;font-size:12.5px;';
  details.textContent = `الإصدار ${latest.versionName || latest.versionCode} جاهز للتحميل (لديك ${current.versionName || current.versionCode}). حدّث لتستفيد بكل الإصلاحات.`;
  text.appendChild(title);
  text.appendChild(details);

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

  const updateBtn = document.createElement('button');
  updateBtn.type = 'button';
  updateBtn.textContent = 'تحديث الآن';
  updateBtn.style.cssText = [
    'border:0',
    'cursor:pointer',
    'padding:10px 16px',
    'border-radius:11px',
    'font-weight:800',
    'font-size:13px',
    'font-family:inherit',
    'background:#ffffff',
    'color:#0f766e',
  ].join(';');
  updateBtn.addEventListener('click', () => {
    if (!downloadUrl) return;
    const opened = openExternalUrl(downloadUrl);
    if (!opened) return;
    updateBtn.textContent = 'جاري فتح صفحة التحميل...';
  });

  const laterBtn = document.createElement('button');
  laterBtn.type = 'button';
  laterBtn.textContent = 'لاحقاً';
  laterBtn.style.cssText = [
    'border:1px solid rgba(255,255,255,.6)',
    'cursor:pointer',
    'padding:10px 14px',
    'border-radius:11px',
    'font-weight:700',
    'font-size:13px',
    'font-family:inherit',
    'background:transparent',
    'color:#ffffff',
  ].join(';');
  laterBtn.addEventListener('click', () => {
    markDismissed(latest.versionCode);
    banner.remove();
  });

  actions.appendChild(updateBtn);
  actions.appendChild(laterBtn);
  banner.appendChild(text);
  banner.appendChild(actions);

  const mount = () => {
    if (!document.body) return;
    document.body.appendChild(banner);
  };
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });
}

/**
 * يفحص وجود إصدار أحدث ويعرض التنبيه.
 * @param {{ silent?: boolean }} [options]
 * @returns {Promise<{ updateAvailable: boolean, current?: object, latest?: object }>}
 */
export async function checkForAppUpdate(options = {}) {
  const result = { updateAvailable: false };
  try {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return result;

    const current = await readCurrentVersion();
    if (!current) return result;
    result.current = current;

    const latest = await readLatestVersion();
    if (!latest) return result;
    result.latest = latest;

    try {
      localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    } catch (_) {}

    if (!isNewerVersion(current.versionCode, latest.versionCode)) return result;
    // الفحص اليدوي من الملف الشخصي يتخطى «لاحقاً» لأن المستخدم طلبه بنفسه
    if (!options.manual && wasDismissed(latest.versionCode)) return result;

    const downloadUrl = absoluteUrl(
      latest.downloadPage || latest.downloadUrl || '/download.html',
      latest.base,
    );
    if (!downloadUrl) return result;

    result.updateAvailable = true;
    result.downloadUrl = downloadUrl;
    buildBanner(current, latest, downloadUrl);
    console.log('[AppUpdate] نسخة أحدث متاحة:', latest.versionName, '→', downloadUrl);
    return result;
  } catch (error) {
    if (!options.silent) console.warn('[AppUpdate] check failed:', error?.message || error);
    return result;
  }
}

/**
 * فحص فوري عند ضغط زر «تحقق من التحديثات»:
 * يعرض رسالة واضحة إما بتوفر تحديث أو بأن النسخة الحالية هي الأحدث.
 * @returns {Promise<{status: 'update'|'latest'|'error', current?: object, latest?: object}>}
 */
export async function checkForAppUpdateNow() {
  let result = { updateAvailable: false };
  try {
    result = await checkForAppUpdate({ silent: false, manual: true });
  } catch (_) {
    return { status: 'error' };
  }

  if (!result.current) {
    Toast.danger('تعذر قراءة إصدار التطبيق الحالي. أعد فتح التطبيق وحاول مرة أخرى.');
    return { status: 'error', current: result.current };
  }

  if (!result.latest) {
    Toast.danger('تعذر الوصول لسيرفر التحديثات. تأكد من اتصال الإنترنت وحاول مرة أخرى.');
    return { status: 'error', current: result.current };
  }

  if (result.updateAvailable) {
    const latestName = result.latest.versionName || result.latest.versionCode;
    Toast.info(`يتوفر تحديث جديد: الإصدار ${latestName}. اضغط «تحديث الآن» في الشريط بالأسفل.`);
    return { status: 'update', current: result.current, latest: result.latest };
  }

  Toast.success(`أنت على آخر إصدار (${result.current.versionName || result.current.versionCode}).`);
  return { status: 'latest', current: result.current, latest: result.latest };
}

function shouldCheckAgain() {
  try {
    const last = Number(localStorage.getItem(LAST_CHECK_KEY)) || 0;
    return Date.now() - last > CHECK_INTERVAL_MS;
  } catch (_) {
    return true;
  }
}

/**
 * يشغّل الفحص عند الإقلاع ثم عند رجوع التطبيق للمقدمة (بحد أدنى كل 6 ساعات).
 * يعمل داخل تطبيق الأندرويد فقط، ولا يرمي أي خطأ.
 */
export function initAppUpdateChecker() {
  if (typeof window === 'undefined' || window.__sabeelUpdateInit) return;
  window.__sabeelUpdateInit = true;

  if (!isCapacitorNative()) return;

  const runWhenReady = () => {
    setTimeout(() => {
      checkForAppUpdate().catch(() => {});
    }, CHECK_DELAY_MS);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runWhenReady, { once: true });
  } else {
    runWhenReady();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !shouldCheckAgain()) return;
    checkForAppUpdate().catch(() => {});
  });

  // للاستخدام اليدوي من الكونسول أو من صفحة الإعدادات
  window.__sabeelCheckUpdate = () => checkForAppUpdate({ silent: false });
}
