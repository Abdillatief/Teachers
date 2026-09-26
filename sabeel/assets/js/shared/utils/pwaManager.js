/**
 * PWA Service Worker & Install Prompt Manager
 */

export function initPWA() {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // In production, register service worker if present
    });
  }
}

initPWA();
export default initPWA;
