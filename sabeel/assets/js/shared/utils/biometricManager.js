/**
 * Sabeel Academy - Biometric Authentication Manager (WebAuthn / Passkeys / Fingerprint / FaceID)
 * 
 * Supports:
 * 1. Hardware biometric / screen lock detection (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
 * 2. Mobile first-time setup prompt with options: "Set Up Biometrics", "Not Now", "Don't Ask Again".
 * 3. Fallback when device doesn't support biometrics: "Device not supported" modal with "No Problem (Got it)" to never bother user again.
 * 4. Fast Biometric Login on index.html: Auto-prompts biometric or provides quick biometric unlock button.
 * 5. Profile Biometrics Management (Enable/Disable/Reset).
 */

const STORAGE_KEYS = {
  PREFERENCE: 'sabeel_biometrics_pref', // 'enabled' | 'disabled' | 'declined' | 'unsupported_dismissed'
  CREDENTIAL_ID: 'sabeel_biometrics_cred_id',
  SAVED_USER: 'sabeel_biometrics_user_meta' // { email, uid, role, name }
};

export class BiometricManager {
  /**
   * Detailed check of current device biometric support
   */
  static async getDetailedStatus() {
    const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const hasWebAuthn = Boolean(window.PublicKeyCredential);
    let hasPlatformAuth = false;

    if (hasWebAuthn && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      try {
        hasPlatformAuth = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch (e) {
        console.warn('[BiometricManager] isUserVerifyingPlatformAuthenticatorAvailable error:', e);
      }
    }

    const isMobile = this.isMobileDevice();
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    return {
      supported: isHttps && hasWebAuthn && hasPlatformAuth,
      isHttps,
      hasWebAuthn,
      hasPlatformAuth,
      isMobile,
      isIOS,
      isStandalone,
      reason: !isHttps ? 'not_https' : !hasWebAuthn ? 'no_webauthn' : !hasPlatformAuth ? 'no_platform_sensor' : 'ready'
    };
  }

  /**
   * Check if current browser and hardware supports User-Verifying Platform Authenticator (Fingerprint / FaceID / TouchID / Windows Hello)
   */
  static async isSupported() {
    try {
      if (
        window.PublicKeyCredential &&
        typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
      ) {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return Boolean(available);
      }
      return false;
    } catch (e) {
      console.warn('[BiometricManager] Support check error:', e);
      return false;
    }
  }

  /**
   * Check if current client device is mobile / tablet
   */
  static isMobileDevice() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    const isMobileUA = /android|iphone|ipad|ipod|windows phone|mobile/i.test(ua);
    const isTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    const isSmallScreen = window.innerWidth <= 820;
    return isMobileUA || (isTouch && isSmallScreen);
  }

  /**
   * Get user's current biometric preference state
   */
  static getPreference() {
    return localStorage.getItem(STORAGE_KEYS.PREFERENCE);
  }

  /**
   * Set user's biometric preference
   */
  static setPreference(status) {
    localStorage.setItem(STORAGE_KEYS.PREFERENCE, status);
  }

  /**
   * Check if biometric login is active and ready for fast unlock
   */
  static isBiometricLoginActive() {
    return (
      localStorage.getItem(STORAGE_KEYS.PREFERENCE) === 'enabled' &&
      Boolean(localStorage.getItem(STORAGE_KEYS.CREDENTIAL_ID)) &&
      Boolean(localStorage.getItem(STORAGE_KEYS.SAVED_USER))
    );
  }

  /**
   * Register a new biometric credential for the logged-in user
   */
  static async registerBiometrics(userMeta) {
    const isAvailable = await this.isSupported();
    if (!isAvailable) {
      throw new Error('جهازك الحالي لا يدعم مستشعر البصمة أو خاصية المقاييس الحيوية (Biometrics).');
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new TextEncoder().encode(userMeta.uid || 'sabeel_user');
    const userName = userMeta.email || 'user@sabeel.com';
    const displayName = userMeta.name || 'مستخدم سبيل';

    const createCredentialOptions = {
      publicKey: {
        challenge: challenge,
        rp: {
          name: 'أكاديمية سَبِيل',
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: userName,
          displayName: displayName
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Hardware device fingerprint / TouchID / FaceID / Screen Lock
          userVerification: 'preferred',
          residentKey: 'preferred'
        },
        timeout: 60000,
        attestation: 'none'
      }
    };

    const credential = await navigator.credentials.create(createCredentialOptions);
    if (!credential) {
      throw new Error('تم إلغاء عملية قراءة البصمة.');
    }

    // Convert credential ID to base64
    const credIdBase64 = this.bufferToBase64(credential.rawId);

    // Save configuration locally
    localStorage.setItem(STORAGE_KEYS.PREFERENCE, 'enabled');
    localStorage.setItem(STORAGE_KEYS.CREDENTIAL_ID, credIdBase64);
    localStorage.setItem(STORAGE_KEYS.SAVED_USER, JSON.stringify({
      uid: userMeta.uid,
      email: userMeta.email,
      name: userMeta.name || '',
      role: userMeta.role || 'teacher',
      savedAt: new Date().toISOString()
    }));

    return true;
  }

  /**
   * Authenticate user with their registered biometric credential
   */
  static async verifyBiometrics() {
    if (!this.isBiometricLoginActive()) {
      throw new Error('لم يتم تفعيل البصمة بعد.');
    }

    const savedUserRaw = localStorage.getItem(STORAGE_KEYS.SAVED_USER);
    const savedUser = savedUserRaw ? JSON.parse(savedUserRaw) : null;
    const credIdBase64 = localStorage.getItem(STORAGE_KEYS.CREDENTIAL_ID);

    if (!savedUser || !credIdBase64) {
      throw new Error('بيانات البصمة غير مكتملة.');
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const rawIdBuffer = this.base64ToBuffer(credIdBase64);

    const getCredentialOptions = {
      publicKey: {
        challenge: challenge,
        allowCredentials: [
          {
            id: rawIdBuffer,
            type: 'public-key',
            transports: ['internal', 'hybrid']
          }
        ],
        userVerification: 'preferred',
        timeout: 60000
      }
    };

    const assertion = await navigator.credentials.get(getCredentialOptions);
    if (!assertion) {
      throw new Error('فشلت مطابقة البصمة.');
    }

    return savedUser;
  }

  /**
   * Disable and reset biometrics
   */
  static disableBiometrics() {
    localStorage.setItem(STORAGE_KEYS.PREFERENCE, 'disabled');
    localStorage.removeItem(STORAGE_KEYS.CREDENTIAL_ID);
    localStorage.removeItem(STORAGE_KEYS.SAVED_USER);
  }

  /**
   * Helper: ArrayBuffer to Base64 string
   */
  static bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Helper: Base64 string to ArrayBuffer
   */
  static base64ToBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Check & show first-time mobile prompt if needed (after user logs in)
   */
  static async checkAndPromptMobileSetup(userMeta) {
    // Only prompt on mobile / touch devices
    if (!this.isMobileDevice()) return;

    const currentPref = this.getPreference();
    // If already enabled or user explicitly declined / dismissed, don't prompt
    if (currentPref === 'enabled' || currentPref === 'declined' || currentPref === 'unsupported_dismissed') {
      return;
    }

    const supported = await this.isSupported();

    if (!supported) {
      // If unsupported and hasn't been dismissed yet, show the "Device not supported" modal
      this.showUnsupportedModal();
    } else {
      // Device supports biometrics: show the "Setup Fingerprint" modal
      this.showSetupPromptModal(userMeta);
    }
  }

  /**
   * Modal 1: Device does NOT support biometrics -> "لا يدعم" + "لا مشكلة (Got it)"
   */
  static showUnsupportedModal() {
    const existing = document.getElementById('sabeelBiometricsModal');
    if (existing) existing.remove();

    const modalHtml = `
      <div id="sabeelBiometricsModal" class="sabeel-bio-modal-overlay">
        <div class="sabeel-bio-modal-card">
          <div class="sabeel-bio-icon-box unsupported">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 14a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm1-5a1 1 0 0 1-2 0V7a1 1 0 0 1 2 0Z"/>
            </svg>
          </div>
          
          <h3 class="sabeel-bio-modal-title">خاصية البصمة غير مدعومة</h3>
          <p class="sabeel-bio-modal-desc">
            يبدو أن هذا المتصفح أو جهازك الحالي لا يدعم مستشعر البصمة والمقاييس الحيوية (Biometric Passkeys). يمكنك متابعة الدخول المباشر دائماً بكلمة المرور بكل سلاسة.
          </p>

          <div class="sabeel-bio-modal-actions">
            <button type="button" id="btnBioNoProblem" class="btn btn-primary" style="width: 100%; height: 46px; font-weight: 800; font-size: 0.95rem; border-radius: 10px;">
              لا مشكلة (فهمت ذلك)
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.injectStyles();

    document.getElementById('btnBioNoProblem')?.addEventListener('click', () => {
      this.setPreference('unsupported_dismissed');
      const m = document.getElementById('sabeelBiometricsModal');
      if (m) m.remove();
    });
  }

  /**
   * Modal 2: Device SUPPORTS biometrics -> First-time Setup Prompt + "لا أريد تفعيل البصمة"
   */
  static showSetupPromptModal(userMeta) {
    const existing = document.getElementById('sabeelBiometricsModal');
    if (existing) existing.remove();

    const modalHtml = `
      <div id="sabeelBiometricsModal" class="sabeel-bio-modal-overlay">
        <div class="sabeel-bio-modal-card">
          <div class="sabeel-bio-icon-box supported">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
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
          
          <span class="sabeel-bio-badge">✨ أمان وسرعة فائقة</span>
          <h3 class="sabeel-bio-modal-title">تفعيل الدخول ببصمة الإصبع / الوجه</h3>
          <p class="sabeel-bio-modal-desc">
            يدعم هاتفك ميزة البصمة! هل ترغب في تعيين بصمتك لتسجيل الدخول الفوري بلمسة واحدة دون الحاجة لكتابة كلمة المرور في كل مرة؟
          </p>

          <div class="sabeel-bio-modal-actions">
            <button type="button" id="btnBioActivateNow" class="btn btn-primary" style="width: 100%; height: 48px; font-weight: 800; font-size: 0.95rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
                <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
                <path d="M2 12a10 10 0 0 1 18-6"/>
              </svg>
              <span>تعيين البصمة الآن</span>
            </button>

            <button type="button" id="btnBioDecline" class="btn btn-secondary" style="width: 100%; height: 44px; font-weight: 700; font-size: 0.88rem; border-radius: 10px; color: var(--text-secondary);">
              لا أريد تفعيل البصمة (استمرار عادي)
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.injectStyles();

    // Event: Activate
    document.getElementById('btnBioActivateNow')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnBioActivateNow');
      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `جاري مسح البصمة... ⏳`;

      try {
        await this.registerBiometrics(userMeta);
        const m = document.getElementById('sabeelBiometricsModal');
        if (m) m.remove();
        if (window.Toast) {
          window.Toast.success('تم تفعيل وتعيين بصمة الهاتف بنجاح! يمكنك الدخول بلمسة واحدة من الآن 🔒✨');
        }
      } catch (err) {
        console.warn('Biometrics setup cancelled or failed:', err);
        btn.disabled = false;
        btn.innerHTML = origText;
        if (window.Toast) {
          window.Toast.warning(err.message || 'تم إلغاء تعيين البصمة.');
        }
      }
    });

    // Event: Decline
    document.getElementById('btnBioDecline')?.addEventListener('click', () => {
      this.setPreference('declined');
      const m = document.getElementById('sabeelBiometricsModal');
      if (m) m.remove();
      if (window.Toast) {
        window.Toast.info('تم حفظ اختيارك، يمكنك تفعيل البصمة لاحقاً من صفحة الملف الشخصي.');
      }
    });
  }

  /**
   * Inject CSS styles for modal popup
   */
  static injectStyles() {
    if (document.getElementById('sabeelBioStyles')) return;
    const style = document.createElement('style');
    style.id = 'sabeelBioStyles';
    style.textContent = `
      .sabeel-bio-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999999;
        background: rgba(8, 17, 30, 0.78);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.25rem;
        animation: sabeelBioFadeIn 0.25s ease-out;
      }
      .sabeel-bio-modal-card {
        background: var(--bg-card, #ffffff);
        color: var(--text-primary, #0f172a);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: 20px;
        max-width: 380px;
        width: 100%;
        padding: 1.75rem 1.5rem;
        text-align: center;
        box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.4);
        position: relative;
        animation: sabeelBioScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .dark-theme .sabeel-bio-modal-card {
        background: #131c2b;
        border-color: #1e293b;
        box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.7);
      }
      .sabeel-bio-icon-box {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.15rem auto;
      }
      .sabeel-bio-icon-box.supported {
        background: rgba(13, 148, 136, 0.12);
        color: var(--primary-color, #0d9488);
        border: 2px solid rgba(13, 148, 136, 0.25);
        box-shadow: 0 8px 24px -4px rgba(13, 148, 136, 0.3);
      }
      .sabeel-bio-icon-box.unsupported {
        background: rgba(245, 158, 11, 0.12);
        color: #f59e0b;
        border: 2px solid rgba(245, 158, 11, 0.25);
      }
      .sabeel-bio-badge {
        display: inline-block;
        font-size: 0.75rem;
        font-weight: 800;
        color: var(--primary-color, #0d9488);
        background: rgba(13, 148, 136, 0.1);
        padding: 0.25rem 0.65rem;
        border-radius: 9999px;
        margin-bottom: 0.65rem;
      }
      .sabeel-bio-modal-title {
        font-size: 1.25rem;
        font-weight: 800;
        margin: 0 0 0.5rem 0;
        line-height: 1.35;
      }
      .sabeel-bio-modal-desc {
        font-size: 0.88rem;
        color: var(--text-secondary, #64748b);
        line-height: 1.55;
        margin: 0 0 1.5rem 0;
      }
      .dark-theme .sabeel-bio-modal-desc {
        color: #94a3b8;
      }
      .sabeel-bio-modal-actions {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }
      @keyframes sabeelBioFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes sabeelBioScaleUp {
        from { transform: scale(0.92); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}
