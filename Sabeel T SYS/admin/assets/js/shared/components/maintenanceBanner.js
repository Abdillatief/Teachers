/**
 * Sabeel Academy - Global Maintenance Banner Component
 * Real-time listener for settings/maintenance.
 * Renders an accessible, responsive warning banner across all active pages when maintenance mode is active.
 * Auto-hides immediately when maintenance mode is turned off by an administrator.
 */

import { db } from '../../config/firebase.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

class MaintenanceBannerManager {
  constructor() {
    this.bannerId = 'sabeelGlobalMaintenanceBanner';
    this.unsubscribe = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized || typeof document === 'undefined') return;
    this.initialized = true;

    // Listen to settings/maintenance in real-time
    this.unsubscribe = onSnapshot(doc(db, "settings", "maintenance"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const isEnabled = data.enabled === true || data.maintenanceMode === true;
        const message = data.message || data.maintenanceMessage || 'يقوم الفريق التقني للأكاديمية حالياً ببعض أعمال الصيانة والتحسينات المجدولة.';
        
        if (isEnabled) {
          this.renderBanner(message);
        } else {
          this.removeBanner();
        }
      } else {
        this.removeBanner();
      }
    }, (err) => {
      console.warn("[MaintenanceBanner] Listener warning:", err);
    });
  }

  renderBanner(message) {
    let banner = document.getElementById(this.bannerId);
    
    if (!banner) {
      banner = document.createElement('div');
      banner.id = this.bannerId;
      banner.className = 'maintenance-global-banner';
      banner.setAttribute('role', 'alert');
      banner.setAttribute('aria-live', 'assertive');
      
      // Inject at top of body or above main navbar
      const navbar = document.querySelector('.navbar');
      if (navbar && navbar.parentNode) {
        navbar.parentNode.insertBefore(banner, navbar);
      } else {
        document.body.prepend(banner);
      }
    }

    banner.innerHTML = `
      <div style="background: linear-gradient(90deg, #b45309 0%, #d97706 100%); color: #ffffff; padding: 0.65rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25); font-size: 0.88rem; font-weight: 700; flex-wrap: wrap; z-index: 9999; border-bottom: 2px solid rgba(255,255,255,0.2);">
        <div style="display: flex; align-items: center; gap: 0.6rem; flex: 1; min-width: 250px;">
          <span style="display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); flex-shrink: 0;">
            <i data-lucide="wrench" style="width: 15px; height: 15px; stroke-width: 2.5;"></i>
          </span>
          <span style="letter-spacing: -0.2px;">
            <strong style="color: #fef3c7;">تنبيه صيانة من الأكاديمية:</strong>
            <span style="margin-right: 0.35rem;">${message}</span>
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 0.75rem; background: rgba(0, 0, 0, 0.2); padding: 0.2rem 0.6rem; border-radius: 9999px; color: #fef3c7;">
            وضع الصيانة مفعل
          </span>
        </div>
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  removeBanner() {
    const banner = document.getElementById(this.bannerId);
    if (banner) {
      banner.remove();
    }
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.removeBanner();
    this.initialized = false;
  }
}

export const maintenanceBanner = new MaintenanceBannerManager();

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => maintenanceBanner.init());
  } else {
    maintenanceBanner.init();
  }
}
