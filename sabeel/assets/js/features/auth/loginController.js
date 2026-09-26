/**
 * Sabeel Academy - Login Controller
 * Integrates Firebase Authentication with OneSignal & Median Native App Push
 */

import { onesignalService } from '../notifications/onesignalService.js';
import { sanitizeExternalId } from '../../config/onesignalConfig.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize OneSignal on page load
  try {
    await onesignalService.init();
  } catch (err) {
    console.warn('[Login Controller] OneSignal initial startup notice:', err);
  }

  // Hide skeleton loading screen
  const skeleton = document.getElementById('sabeelLoginSkeleton');
  if (skeleton) {
    skeleton.style.display = 'none';
  }

  // Handle Captcha if present
  initCaptcha();

  // Attach login form handler
  const loginForm = document.getElementById('loginForm') || document.querySelector('form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
});

function initCaptcha() {
  const display = document.getElementById('captchaCodeDisplay');
  const refreshBtn = document.getElementById('refreshCaptchaBtn');
  if (!display) return;

  const generate = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    display.textContent = code;
    display.dataset.code = code;
  };

  generate();
  if (refreshBtn) {
    refreshBtn.addEventListener('click', (e) => {
      e.preventDefault();
      generate();
    });
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const emailInput = document.getElementById('email') || document.getElementById('username') || document.querySelector('input[type="email"]');
  const passwordInput = document.getElementById('password') || document.querySelector('input[type="password"]');
  const captchaInput = document.getElementById('captchaInput');
  const captchaDisplay = document.getElementById('captchaCodeDisplay');

  // Verify captcha if present
  if (captchaInput && captchaDisplay) {
    if (captchaInput.value.trim() !== captchaDisplay.dataset.code) {
      showToast('رمز التحقق غير صحيح، برجاء المحاولة مرة أخرى', 'error');
      return;
    }
  }

  const email = emailInput?.value?.trim() || '';
  const password = passwordInput?.value?.trim() || '';

  if (!email) {
    showToast('برجاء إدخال البريد الإلكتروني أو اسم المستخدم', 'warning');
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="inline-block animate-spin mr-2">⏳</span>
      <span>جاري تسجيل الدخول والربط بنظام الإشعارات...</span>
    `;
  }

  try {
    // 1. Simulate or perform Firebase Authentication
    // Derive role and simulate or fetch real user UID
    const isAdmin = email.toLowerCase().includes('admin');
    const role = isAdmin ? 'admin' : 'teacher';

    // In production, this would be signInWithEmailAndPassword(auth, email, password)
    // We derive a realistic Firebase UID (or read from session)
    let firebaseUID = localStorage.getItem(`sabeel_uid_${email}`);
    if (!firebaseUID) {
      // Deterministic or generated 28-char Firebase UID format
      firebaseUID = 't63ltWofLbSJylVZuecUaQC' + Math.abs(hashString(email)).toString(36).padEnd(6, 'w');
      localStorage.setItem(`sabeel_uid_${email}`, firebaseUID);
    }

    const cleanUid = sanitizeExternalId(firebaseUID);
    console.log(`[Login Controller] Authenticated user UID: "${cleanUid}" (Role: ${role})`);

    // Store user session
    const userData = {
      uid: cleanUid,
      email: email,
      role: role,
      name: isAdmin ? 'مدير النظام' : 'أ. محمد السعيد (معلم)',
      loginAt: new Date().toISOString()
    };
    localStorage.setItem('sabeel_current_user', JSON.stringify(userData));

    // 2. CRITICAL: Link User in OneSignal & Median Native App
    // Passing cleanUid (pure string, strictly NOT an object or JSON string)
    showToast('جاري تهيئة تصاريح الإشعارات وربط الحساب...', 'info');

    const oneSignalResult = await onesignalService.loginUser(cleanUid, {
      role: role,
      name: userData.name
    });

    console.log('[Login Controller] OneSignal mapping completed:', oneSignalResult);

    showToast('تم تسجيل الدخول وتفعيل الإشعارات بنجاح!', 'success');

    // Show teacher welcome overlay if element exists
    const teacherOverlay = document.getElementById('teacherWelcomeOverlay');
    if (!isAdmin && teacherOverlay) {
      teacherOverlay.style.display = 'flex';
      teacherOverlay.classList.add('active');
      const nameEl = document.getElementById('teacherWelcomeName');
      if (nameEl) nameEl.textContent = userData.name;
    }

    // 3. Redirect to corresponding portal
    setTimeout(() => {
      if (isAdmin) {
        window.location.href = '/admin/notifications.html';
      } else {
        window.location.href = '/teacher/notifications.html';
      }
    }, 1200);

  } catch (err) {
    console.error('[Login Controller] Login error:', err);
    showToast('فشل تسجيل الدخول: ' + (err.message || 'خطأ غير متوقع'), 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container') || document.body;
  const toast = document.createElement('div');
  toast.className = `sabeel-toast toast-${type}`;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#0ea5e9'};
    color: white;
    padding: 12px 20px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    font-size: 0.9rem;
    font-weight: 600;
    z-index: 99999;
    direction: rtl;
    animation: fadeIn 0.3s ease;
  `;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
