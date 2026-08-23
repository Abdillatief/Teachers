/**
 * Sabeel Academy - PWA Service Worker & Install Manager
 */

let deferredPrompt = null;
let pwaInitialized = false;

/**
 * Registers the main Service Worker and configures update listeners
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.info('[PWA] Service Worker not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('[PWA] Service Worker registered successfully with scope:', registration.scope);

    // Check for updates periodically or on page visibility change
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] A new update is available for Sabeel Academy.');
            // Dispatch custom event if UI wants to display update banner
            window.dispatchEvent(new CustomEvent('pwa-update-available'));
          }
        });
      }
    });

    // Auto reload when controller changes to activate new SW
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[PWA] Service Worker controller changed, refreshing to load new assets.');
      }
    });

    return registration;
  } catch (error) {
    console.warn('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Initializes PWA install prompt listeners and UI bindings
 */
export function initPWA() {
  if (pwaInitialized) return;
  pwaInitialized = true;

  // Register the service worker
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerServiceWorker();
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      registerServiceWorker();
    });
  }

  // Handle Before Install Prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] beforeinstallprompt event captured.');

    // Show custom install buttons if available
    const installButtons = document.querySelectorAll('.pwa-install-btn, #btnInstallPwa');
    installButtons.forEach(btn => {
      btn.style.display = 'inline-flex';
    });

    window.dispatchEvent(new CustomEvent('pwa-install-ready'));
  });

  // Handle App Installed
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Sabeel Academy was installed successfully!');
    deferredPrompt = null;
    const installButtons = document.querySelectorAll('.pwa-install-btn, #btnInstallPwa');
    installButtons.forEach(btn => {
      btn.style.display = 'none';
    });
  });
}

/**
 * Triggers the native install prompt
 */
export async function promptPWAInstall() {
  if (!deferredPrompt) {
    // If not directly promptable (e.g. iOS Safari), show instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      if (window.Toast) {
        window.Toast.info('لتثبيت التطبيق على iPhone: اضغط على زر المشاركة (Share) بالأسفل ثم اختر "إضافة إلى الشاشة الرئيسية (Add to Home Screen)" 📱');
      } else {
        alert('لتثبيت التطبيق على iPhone: اضغط على زر المشاركة (Share) ثم اختر "إضافة إلى الشاشة الرئيسية (Add to Home Screen)"');
      }
      return;
    }
    if (window.Toast) {
      window.Toast.info('التطبيق مثبت بالفعل أو أن متصفحك يدعم التثبيت من قائمة الخيارات (Install App) 📲');
    }
    return;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to install prompt: ${outcome}`);
    deferredPrompt = null;
  } catch (err) {
    console.warn('[PWA] Error showing install prompt:', err);
  }
}

// Auto-run on script import
if (typeof window !== 'undefined') {
  initPWA();
}
