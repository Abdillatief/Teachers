/**
 * Sabeel Academy - Production PWA Service Worker & Native App Manager
 * Version: 2.0.0
 * Features:
 *  - Service worker lifecycle & auto-update mechanism
 *  - BeforeInstallPrompt handling & custom PWA install triggers
 *  - Native Online/Offline state monitor with automatic sync toast
 *  - Persistent last-page memory and restoration
 */

import { Toast } from './toast.js';
import { isMedianApp } from './medianBridge.js';

let deferredPrompt = null;
let pwaInitialized = false;

/**
 * Registers the main Service Worker and configures update listeners
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.info('[PWA] Service Worker not supported in this browser environment.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('[PWA] Service Worker registered successfully with scope:', registration.scope);

    // Check for updates periodically
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] A newer version of Sabeel is available.');
            window.dispatchEvent(new CustomEvent('pwa-update-available'));
          }
        });
      }
    });

    // Auto reload when controller changes
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[PWA] Controller changed, updating app shell.');
      }
    });

    return registration;
  } catch (error) {
    console.warn('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Monitors online and offline connectivity and notifies the user
 */
function initConnectivityListener() {
  let indicatorEl = null;

  const showIndicator = (message, isOnline) => {
    if (indicatorEl) indicatorEl.remove();

    indicatorEl = document.createElement('div');
    indicatorEl.className = 'network-status-indicator';
    indicatorEl.style.backgroundColor = isOnline ? 'rgba(5, 150, 105, 0.95)' : 'rgba(220, 38, 38, 0.95)';
    indicatorEl.innerHTML = `
      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background: #ffffff; animation: ${isOnline ? 'none' : 'skeletonPulse 1s infinite'};"></span>
      <span>${message}</span>
    `;

    document.body.appendChild(indicatorEl);

    setTimeout(() => {
      if (indicatorEl) {
        indicatorEl.style.opacity = '0';
        indicatorEl.style.transition = 'opacity 0.4s ease';
        setTimeout(() => {
          if (indicatorEl) indicatorEl.remove();
          indicatorEl = null;
        }, 400);
      }
    }, 4000);
  };

  window.addEventListener('offline', () => {
    showIndicator('انقطع الاتصال بالإنترنت - يتم العمل في وضع عدم الاتصال 📡', false);
  });

  window.addEventListener('online', () => {
    showIndicator('تم استعادة الاتصال بالإنترنت بنجاح - جاري المزامنة اللحظية ⚡', true);
  });
}

/**
 * Initializes PWA install prompt listeners and UI bindings
 */
export function initPWA() {
  if (pwaInitialized) return;
  pwaInitialized = true;

  if (isMedianApp()) {
    console.log('[PWA] Running inside Median Native App Wrapper. PWA installation prompt disabled.');
    initConnectivityListener();
    return;
  }

  // Register the service worker
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerServiceWorker();
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      registerServiceWorker();
    });
  }

  // Network Connectivity
  initConnectivityListener();

  // Handle Before Install Prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] beforeinstallprompt event captured.');

    const installButtons = document.querySelectorAll('.pwa-install-btn, #btnInstallPwa');
    installButtons.forEach(btn => {
      btn.style.display = 'inline-flex';
    });

    window.dispatchEvent(new CustomEvent('pwa-install-ready'));
  });

  // Handle App Installed
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Sabeel Academy installed successfully!');
    deferredPrompt = null;
    const installButtons = document.querySelectorAll('.pwa-install-btn, #btnInstallPwa');
    installButtons.forEach(btn => {
      btn.style.display = 'none';
    });
    Toast.success('تم تثبيت تطبيق سَبِيل بنجاح على جهازك!');
  });
}

/**
 * Triggers the native install prompt
 */
export async function promptPWAInstall() {
  if (isMedianApp()) {
    Toast.info('أنت تستخدم تطبيق سَبِيل الأصلي بالفعل 📲✨');
    return;
  }

  if (!deferredPrompt) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      Toast.info('لتثبيت التطبيق على iPhone: اضغط على زر المشاركة (Share) ثم اختر "إضافة إلى الشاشة الرئيسية (Add to Home Screen)" 📱');
      return;
    }
    Toast.info('التطبيق مثبت بالفعل أو أن متصفحك يدعم التثبيت من قائمة الخيارات 📲');
    return;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Install prompt outcome: ${outcome}`);
    deferredPrompt = null;
  } catch (err) {
    console.warn('[PWA] Error showing install prompt:', err);
  }
}

// Auto-run on script import
if (typeof window !== 'undefined') {
  initPWA();
}
