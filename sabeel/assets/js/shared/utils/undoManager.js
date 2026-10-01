/**
 * Undo Snackbar System (شريط التراجع بعد الحذف)
 * Sabeel Academy - Shows a 30-second floating snackbar allowing instant restoration after soft deletes.
 */

import { Toast } from './toast.js';

class UndoManagerEngine {
  constructor() {
    this.activeSnackbar = null;
    this.timer = null;
    this.progressInterval = null;
  }

  /**
   * Displays an Undo Snackbar at the bottom of the screen.
   * @param {Object} options
   * @param {string} options.message - e.g. 'تم حذف الطالب "محمد أحمد"'
   * @param {Function} options.restoreFn - Async function that restores the soft-deleted data
   * @param {number} [options.duration=30000] - Duration in ms (default 30 seconds)
   */
  showUndo({ message, restoreFn, duration = 30000 }) {
    if (typeof document === 'undefined') return;

    // Remove any existing active snackbar cleanly
    this.dismissCurrent();

    const snackbar = document.createElement('div');
    snackbar.id = 'undoSnackbarContainer';
    snackbar.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      z-index: 999999;
      min-width: 320px;
      max-width: 90vw;
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #334155;
      border-radius: 12px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
      padding: 0.85rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      direction: rtl;
      overflow: hidden;
    `;

    snackbar.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem; font-weight: 500;">
          <i data-lucide="trash-2" style="width: 18px; height: 18px; color: #ef4444; flex-shrink: 0;"></i>
          <span>${message || 'تم حذف عنصر'}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <button id="btnUndoAction" class="btn" style="background: #3b82f6; color: white; border: none; padding: 0.35rem 0.85rem; font-size: 0.85rem; font-weight: 700; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.35rem; transition: background 0.2s;">
            <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i>
            <span>تراجع (Undo)</span>
          </button>
          <button id="btnCloseUndoSnackbar" style="background: transparent; border: none; color: #94a3b8; font-size: 1.1rem; cursor: pointer; padding: 0.2rem 0.4rem; display: flex; align-items: center;" title="إغلاق">
            ✕
          </button>
        </div>
      </div>
      <div style="width: 100%; height: 3px; background: #334155; border-radius: 2px; overflow: hidden; margin-top: 0.2rem;">
        <div id="undoProgressBar" style="width: 100%; height: 100%; background: #3b82f6; transition: width 0.1s linear;"></div>
      </div>
    `;

    document.body.appendChild(snackbar);

    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Animate in
    requestAnimationFrame(() => {
      snackbar.style.transform = 'translateX(-50%) translateY(0)';
    });

    this.activeSnackbar = snackbar;

    const undoBtn = snackbar.querySelector('#btnUndoAction');
    const closeBtn = snackbar.querySelector('#btnCloseUndoSnackbar');
    const progressBar = snackbar.querySelector('#undoProgressBar');

    // Progress bar animation countdown
    const startTime = Date.now();
    this.progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPercent = Math.max(0, 100 - (elapsed / duration) * 100);
      if (progressBar) {
        progressBar.style.width = `${remainingPercent}%`;
      }
    }, 100);

    // Auto dismiss timer after duration
    this.timer = setTimeout(() => {
      this.dismissCurrent();
    }, duration);

    // Click handler for Undo
    if (undoBtn) {
      undoBtn.addEventListener('click', async () => {
        undoBtn.disabled = true;
        undoBtn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" style="width: 14px; height: 14px; animation: spin 0.8s linear infinite;"></i> <span>جاري الاستعادة...</span>`;
        if (window.lucide) window.lucide.createIcons();

        try {
          if (typeof restoreFn === 'function') {
            await restoreFn();
          }
          Toast.success('تم التراجع عن الحذف وإعادة البيانات بنجاح.');
          window.dispatchEvent(new CustomEvent('itemRestored'));
        } catch (err) {
          console.error('UndoManager: Restoration error', err);
          Toast.danger('حدث خطأ أثناء محاولة التراجع عن الحذف.');
        } finally {
          this.dismissCurrent();
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.dismissCurrent();
      });
    }
  }

  /**
   * Dismisses active snackbar
   */
  dismissCurrent() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    if (this.activeSnackbar) {
      const el = this.activeSnackbar;
      this.activeSnackbar = null;
      el.style.transform = 'translateX(-50%) translateY(100px)';
      el.style.opacity = '0';
      setTimeout(() => {
        el.remove();
      }, 350);
    }
  }
}

export const UndoManager = new UndoManagerEngine();

if (typeof window !== 'undefined') {
  window.UndoManager = UndoManager;
}
