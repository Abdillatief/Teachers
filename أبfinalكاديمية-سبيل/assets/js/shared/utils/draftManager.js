/**
 * Auto Draft Recovery System (نظام الحفظ والاستعادة التلقائي للمسودات)
 * Sabeel Academy - Auto-saves form input progress and offers instant recovery.
 */

import { Toast } from './toast.js';

class DraftManagerEngine {
  constructor() {
    this.debounceTimers = new Map();
    this.isRestoring = false;
  }

  /**
   * Initializes global form observation & draft recovery
   */
  init() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const runScan = () => {
      this.scanAndAttachForms();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runScan);
    } else {
      runScan();
    }

    // Observe dynamically added modals or forms
    const observer = new MutationObserver(() => {
      this.scanAndAttachForms();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Generates a unique draft key for a form element or modal container
   */
  getFormKey(formEl) {
    if (!formEl) return null;
    if (formEl.dataset.draftKey) return formEl.dataset.draftKey;

    const pagePath = window.location.pathname.replace(/[^a-zA-Z0-9_-]/g, '_');
    const formId = formEl.id || formEl.name || formEl.className?.toString().replace(/\s+/g, '_');
    
    // If inside a modal, include modal ID
    const modalParent = formEl.closest('.modal, .modal-overlay, .drawer, [id*="Modal"], [id*="modal"]');
    const modalId = modalParent ? modalParent.id : '';

    const keyPart = formId || modalId || 'form_' + Array.from(document.forms).indexOf(formEl);
    const fullKey = `sabeel_draft_${pagePath}_${keyPart}`;
    formEl.dataset.draftKey = fullKey;
    return fullKey;
  }

  /**
   * Scans document for forms and attaches auto-save listeners and recovery banners
   */
  scanAndAttachForms() {
    const containers = document.querySelectorAll('form, .modal-body, .modal-content, [data-draft-form="true"]');
    
    containers.forEach(container => {
      if (container.dataset.draftAttached === 'true') return;
      
      const inputs = container.querySelectorAll('input:not([type="hidden"]):not([type="password"]):not([type="submit"]):not([type="button"]):not(.search-input), textarea, select');
      if (inputs.length === 0) return;

      container.dataset.draftAttached = 'true';
      const key = this.getFormKey(container);

      // Check if draft exists and offer recovery
      this.checkAndShowRecoveryBanner(container, key);

      // Attach debounced auto-save listener on input/change
      const handleInput = (e) => {
        if (this.isRestoring) return;
        const target = e.target;
        if (!target) return;
        
        // Ignore search fields
        if (target.type === 'search' || target.classList.contains('search-input') || target.id?.toLowerCase().includes('search')) return;

        this.scheduleAutoSave(container, key);
      };

      container.addEventListener('input', handleInput);
      container.addEventListener('change', handleInput);

      // Clear draft on form submit or reset
      if (container.tagName === 'FORM') {
        container.addEventListener('submit', () => {
          this.clearDraft(key);
        });
        container.addEventListener('reset', () => {
          this.clearDraft(key);
        });
      }

      // Intercept submit buttons inside non-form containers
      const submitBtns = container.querySelectorAll('button[type="submit"], .btn-save, .btn-submit, [id*="save"], [id*="Save"], [id*="submit"]');
      submitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          setTimeout(() => {
            // Clear if form was saved
            this.clearDraft(key);
          }, 400);
        });
      });
    });
  }

  /**
   * Schedules debounced saving of draft data
   */
  scheduleAutoSave(container, key) {
    if (!key) return;

    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    const timer = setTimeout(() => {
      this.saveDraft(container, key);
    }, 600);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Extracts data from form container and saves to localStorage
   */
  saveDraft(container, customKey = null) {
    const key = customKey || this.getFormKey(container);
    if (!key) return;

    const data = {};
    let hasValue = false;

    const fields = container.querySelectorAll('input, textarea, select');
    fields.forEach(field => {
      const name = field.name || field.id;
      if (!name) return;

      // Ignore search, password, tokens
      if (field.type === 'password' || field.type === 'hidden' || field.type === 'search' || field.classList.contains('search-input') || name.toLowerCase().includes('search')) return;

      if (field.type === 'checkbox' || field.type === 'radio') {
        if (field.checked) {
          data[name] = field.value;
          hasValue = true;
        }
      } else {
        const val = field.value;
        if (val !== null && val !== undefined && val.trim() !== '') {
          data[name] = val;
          hasValue = true;
        }
      }
    });

    if (hasValue) {
      const payload = {
        timestamp: Date.now(),
        path: window.location.pathname,
        data: data
      };
      try {
        localStorage.setItem(key, JSON.stringify(payload));
      } catch (e) {
        console.warn('DraftManager: Failed to save draft to localStorage', e);
      }
    } else {
      this.clearDraft(key);
    }
  }

  /**
   * Checks for existing draft and displays recovery banner if found
   */
  checkAndShowRecoveryBanner(container, customKey = null) {
    const key = customKey || this.getFormKey(container);
    if (!key) return;

    const existingBanner = container.querySelector('.draft-recovery-alert');
    if (existingBanner) return;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;

      const payload = JSON.parse(raw);
      if (!payload || !payload.data || Object.keys(payload.data).length === 0) return;

      // Create banner
      const banner = document.createElement('div');
      banner.className = 'draft-recovery-alert mb-3 p-3 rounded';
      banner.style.cssText = `
        background: var(--warning-light, #fef3c7);
        border: 1px solid var(--warning, #f59e0b);
        color: var(--text-primary, #1e293b);
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
        border-radius: 8px;
        margin-bottom: 1rem;
        animation: fadeIn 0.3s ease;
      `;

      banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600;">
          <i data-lucide="file-edit" style="width: 18px; height: 18px; color: #d97706; flex-shrink: 0;"></i>
          <span>تم العثور على مسودة غير محفوظة لهذه البيانات.</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <button type="button" class="btn btn-sm btn-primary btn-restore-draft-action" style="padding: 0.3rem 0.75rem; font-size: 0.8rem; font-weight: 700; background-color: var(--primary-color, #2563eb); color: white; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i> استعادة المسودة
          </button>
          <button type="button" class="btn btn-sm btn-secondary btn-discard-draft-action" style="padding: 0.3rem 0.75rem; font-size: 0.8rem; color: var(--danger, #ef4444); background: transparent; border: 1px solid var(--border-color, #cbd5e1); border-radius: 6px; cursor: pointer;">
            تجاهل المسودة
          </button>
        </div>
      `;

      // Insert at top of container
      if (container.firstChild) {
        container.insertBefore(banner, container.firstChild);
      } else {
        container.appendChild(banner);
      }

      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Attach event listeners
      const restoreBtn = banner.querySelector('.btn-restore-draft-action');
      const discardBtn = banner.querySelector('.btn-discard-draft-action');

      restoreBtn.addEventListener('click', () => {
        this.restoreDraft(container, key);
        banner.remove();
      });

      discardBtn.addEventListener('click', () => {
        this.clearDraft(key);
        banner.remove();
        Toast.info('تم تجاهل المسودة وحذفها.');
      });
    } catch (e) {
      console.warn('DraftManager error reading draft:', e);
    }
  }

  /**
   * Restores draft values into container fields
   */
  restoreDraft(container, customKey = null) {
    const key = customKey || this.getFormKey(container);
    if (!key) return;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;

      const payload = JSON.parse(raw);
      if (!payload || !payload.data) return;

      this.isRestoring = true;

      const data = payload.data;
      Object.keys(data).forEach(fieldName => {
        const val = data[fieldName];
        const field = container.querySelector(`[id="${fieldName}"], [name="${fieldName}"]`);
        
        if (field) {
          if (field.type === 'checkbox' || field.type === 'radio') {
            field.checked = (field.value === val || val === 'on' || val === true);
          } else {
            field.value = val;
          }

          // Trigger input and change events for reactive JS bindings
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      this.isRestoring = false;
      Toast.success('تم استعادة بيانات المسودة بنجاح.');
    } catch (e) {
      this.isRestoring = false;
      console.error('DraftManager restore error:', e);
      Toast.error('حدث خطأ أثناء استعادة المسودة.');
    }
  }

  /**
   * Clears saved draft for a container or key
   */
  clearDraft(customKeyOrContainer) {
    let key = customKeyOrContainer;
    if (typeof customKeyOrContainer === 'object' && customKeyOrContainer !== null) {
      key = this.getFormKey(customKeyOrContainer);
      const banner = customKeyOrContainer.querySelector('.draft-recovery-alert');
      if (banner) banner.remove();
    }
    if (!key) return;

    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }
}

export const DraftManager = new DraftManagerEngine();
DraftManager.init();

if (typeof window !== 'undefined') {
  window.DraftManager = DraftManager;
}
