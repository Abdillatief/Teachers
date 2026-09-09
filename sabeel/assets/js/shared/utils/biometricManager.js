/**
 * Biometric Manager (WebAuthn / TouchID / FaceID)
 */

export const BiometricManager = {
  isAvailable() {
    return typeof window !== 'undefined' && Boolean(window.PublicKeyCredential);
  },
  async checkAndPromptMobileSetup(options = {}) {
    return false;
  },
  async authenticate() {
    return false;
  }
};

export default BiometricManager;
