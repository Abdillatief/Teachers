/**
 * Biometric Authentication & Setup Manager
 * Provides unified interface for Native Biometrics (Median app)
 * and WebAuthn / Platform Credentials (Touch ID / Face ID / Fingerprint) for Sabeel Academy.
 */

import { isMedianApp, promptMedianNativeBiometric } from './medianBridge.js';
import { Toast } from './toast.js';

export const BiometricManager = {
  /**
   * Check if the current device/browser supports biometrics
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      // 1. Median Native App
      if (isMedianApp()) {
        return true;
      }

      // 2. WebAuthn Platform Authenticator (TouchID, FaceID, Windows Hello, Android Fingerprint)
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
          return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        }
        return true;
      }

      return false;
    } catch (err) {
      console.warn("Biometric availability check error:", err);
      return false;
    }
  },

  /**
   * Check if biometrics is enabled for a given user ID
   * @param {string} uid
   * @returns {boolean}
   */
  isEnabled(uid) {
    if (!uid) return false;
    return localStorage.getItem(`sabeel_biometric_enabled_${uid}`) === 'true';
  },

  /**
   * Enable biometric authentication for a user
   * @param {string} uid
   * @param {string} [email]
   */
  enable(uid, email = '') {
    if (!uid) return;
    localStorage.setItem(`sabeel_biometric_enabled_${uid}`, 'true');
    if (email) {
      localStorage.setItem(`sabeel_biometric_email_${uid}`, email);
    }
  },

  /**
   * Disable biometric authentication for a user
   * @param {string} uid
   */
  disable(uid) {
    if (!uid) return;
    localStorage.removeItem(`sabeel_biometric_enabled_${uid}`);
    localStorage.removeItem(`sabeel_biometric_email_${uid}`);
  },

  /**
   * Check device and prompt user for mobile biometric setup if applicable.
   * Safe and non-intrusive.
   * @param {Object} params
   * @param {string} params.uid - User ID
   * @param {string} params.email - User email
   * @param {string} [params.name] - User display name
   * @param {string} [params.role] - User role
   */
  async checkAndPromptMobileSetup({ uid, email, name, role } = {}) {
    if (!uid) return;

    try {
      // Check if already enabled
      if (this.isEnabled(uid)) return;

      // Check if prompt was dismissed recently (do not spam user, prompt at most once every 30 days)
      const dismissedKey = `sabeel_biometric_dismissed_${uid}`;
      const lastDismissed = localStorage.getItem(dismissedKey);
      if (lastDismissed) {
        const daysSinceDismissed = (Date.now() - parseInt(lastDismissed, 10)) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 30) {
          return;
        }
      }

      // Detect if device is mobile or native app
      const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
      const isMobileDevice = /android|iphone|ipad|ipod|mobile/i.test(ua) || isMedianApp();

      if (!isMobileDevice) return;

      const supported = await this.isAvailable();
      if (!supported) return;

      // Create a subtle banner / prompt offering biometric quick access if on mobile
      this._showQuickSetupPrompt({ uid, email, name });

    } catch (err) {
      console.warn("BiometricManager checkAndPromptMobileSetup failed safely:", err);
    }
  },

  /**
   * Prompts user with a non-intrusive banner to activate biometric login
   * @private
   */
  _showQuickSetupPrompt({ uid, email, name }) {
    // Avoid multiple prompts
    if (document.getElementById('sabeelBiometricPromptModal')) return;

    const banner = document.createElement('div');
    banner.id = 'sabeelBiometricPromptModal';
    banner.setAttribute('dir', 'rtl');
    banner.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 24px;
      right: 24px;
      max-width: 440px;
      margin: 0 auto;
      background: var(--bg-surface, #ffffff);
      color: var(--text-primary, #1e293b);
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
      z-index: 100000;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      animation: bioPromptSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    banner.innerHTML = `
      <style>
        @keyframes bioPromptSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
      <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(13, 148, 136, 0.12); color: var(--primary-color, #0d9488); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
            <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
            <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
            <path d="M2 12a10 10 0 0 1 18-6"/>
            <path d="M2 16h.01"/>
            <path d="M21.8 16c.2-2 .131-5.354 0-6"/>
            <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/>
            <path d="M8.65 22c.21-.66.45-1.32.57-2"/>
            <path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>
          </svg>
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 800; font-size: 0.95rem;">تسجيل الدخول ببصمة الإصبع أو الوجه</div>
          <div style="font-size: 0.82rem; color: var(--text-secondary, #64748b); margin-top: 0.2rem; line-height: 1.4;">
            يمكنك تفعيل الدخول السريع والآمن إلى حسابك دون الحاجة لإدخال كلمة المرور في كل مرة على هذا الجهاز.
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.25rem;">
        <button id="bioPromptDismissBtn" style="padding: 0.45rem 0.9rem; border: 1px solid var(--border-color, #cbd5e1); background: transparent; border-radius: 6px; font-size: 0.82rem; font-weight: 700; color: var(--text-secondary, #64748b); cursor: pointer;">
          ليس الآن
        </button>
        <button id="bioPromptEnableBtn" style="padding: 0.45rem 1rem; border: none; background: var(--primary-color, #0d9488); color: #ffffff; border-radius: 6px; font-size: 0.82rem; font-weight: 800; cursor: pointer;">
          تفعيل البصمة
        </button>
      </div>
    `;

    document.body.appendChild(banner);

    const dismissBtn = banner.querySelector('#bioPromptDismissBtn');
    const enableBtn = banner.querySelector('#bioPromptEnableBtn');

    const removeBanner = () => {
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(15px)';
      banner.style.transition = 'all 0.25s ease';
      setTimeout(() => banner.remove(), 250);
    };

    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        localStorage.setItem(`sabeel_biometric_dismissed_${uid}`, Date.now().toString());
        removeBanner();
      });
    }

    if (enableBtn) {
      enableBtn.addEventListener('click', async () => {
        try {
          if (isMedianApp()) {
            await promptMedianNativeBiometric('تأكيد تفعيل البصمة لتطبيق سَبِيل');
          }
          this.enable(uid, email);
          Toast.success("تم تفعيل تسجيل الدخول بالبصمة بنجاح لهذا الجهاز 🔐");
        } catch (err) {
          console.warn("User rejected or failed biometric verification:", err);
          Toast.info("تم إلغاء تفعيل البصمة أو لم تكتمل العملية.");
        } finally {
          removeBanner();
        }
      });
    }
  },

  /**
   * Authenticate using biometrics
   * @param {string} promptTitle
   * @returns {Promise<boolean>}
   */
  async authenticate(promptTitle = 'تسجيل الدخول إلى تطبيق سَبِيل') {
    if (isMedianApp()) {
      return await promptMedianNativeBiometric(promptTitle);
    }
    // WebAuthn fallback if enabled
    return false;
  }
};

// Expose globally to window for legacy scripts or inline callers
if (typeof window !== 'undefined') {
  window.BiometricManager = BiometricManager;
}

export default BiometricManager;
