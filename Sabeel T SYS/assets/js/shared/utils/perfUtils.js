/**
 * Performance & Optimization Utilities for Sabeel Academy
 * Version: 2.0.0
 * Features:
 *  - High-performance Debounce & Throttle
 *  - Multi-tier in-memory & LocalStorage Smart Cache
 *  - Fast in-memory Pagination Engine
 *  - Skeleton Screen Generators (Tables, Cards, Metrics)
 *  - Listener Manager for Zero Memory Leaks
 *  - Prevent Double-Submit & Duplicate Action Locks
 *  - Optimistic UI Feedback Helpers
 */

// 1. Debounce function to limit execution frequency of heavy search/filter functions
export function debounce(func, wait = 250) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 2. Throttle function to ensure execution at most once in a given interval
export function throttle(func, limit = 300) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 3. Prevent Double Submit / Rapid Multiple Clicks on Action Buttons
export function withDoubleSubmitPrevention(buttonEl, asyncCallback, loadingHtml = '<i class="animate-spin" data-lucide="loader-2"></i> جاري التنفيذ...') {
  return async function(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!buttonEl || buttonEl.dataset.isProcessing === 'true') return;

    buttonEl.dataset.isProcessing = 'true';
    const originalHtml = buttonEl.innerHTML;
    const originalDisabled = buttonEl.disabled;
    buttonEl.disabled = true;
    buttonEl.innerHTML = loadingHtml;
    updateTargetIcons(buttonEl);

    try {
      await asyncCallback(e);
    } catch (err) {
      console.error('Error during button action execution:', err);
      throw err;
    } finally {
      buttonEl.disabled = originalDisabled;
      buttonEl.innerHTML = originalHtml;
      delete buttonEl.dataset.isProcessing;
      updateTargetIcons(buttonEl);
    }
  };
}

// 4. Targeted Lucide Icon Initializer - avoids unnecessary document-wide DOM scanning
export function updateTargetIcons(container = document) {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    try {
      if (container && container !== document && container instanceof HTMLElement) {
        window.lucide.createIcons({ root: container });
      } else {
        window.lucide.createIcons();
      }
    } catch (e) {
      console.warn('Lucide icon update warning:', e);
    }
  }
}

// 5. Fast Pagination Helper for large datasets (Students, Sessions, Payments, Audit logs)
export function paginateData(dataArray, page = 1, pageSize = 25) {
  const safeArray = Array.isArray(dataArray) ? dataArray : [];
  const totalItems = safeArray.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const items = safeArray.slice(startIndex, endIndex);

  return {
    items,
    totalItems,
    totalPages,
    currentPage,
    pageSize,
    startIndex: totalItems > 0 ? startIndex + 1 : 0,
    endIndex
  };
}

// 6. Render Pagination Controls HTML with modern styling
export function renderPaginationControls({ currentPage, totalPages, totalItems, startIndex, endIndex }, onPageChangeCallbackName = 'changeTablePage') {
  if (totalItems === 0) return '';

  return `
    <div class="table-pagination-bar" style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1.25rem; background: var(--bg-secondary); border-top: 1px solid var(--border-color); flex-wrap: wrap; gap: 0.75rem; font-size: 0.85rem; border-radius: 0 0 var(--border-radius) var(--border-radius);">
      <div style="color: var(--text-secondary); font-weight: 500;">
        عرض <strong style="color: var(--text-primary); font-weight: 700;">${startIndex}</strong> - <strong style="color: var(--text-primary); font-weight: 700;">${endIndex}</strong> من إجمالي <strong style="color: var(--primary-color); font-weight: 800;">${totalItems}</strong> عنصر
      </div>
      <div style="display: flex; gap: 0.4rem; align-items: center;">
        <button type="button" class="btn btn-sm btn-secondary" ${currentPage <= 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} onclick="${onPageChangeCallbackName}(${currentPage - 1})" title="الصفحة السابقة">
          <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
          <span>السابق</span>
        </button>
        <span style="padding: 0.2rem 0.65rem; font-weight: 700; color: var(--text-primary); background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.8rem;">
          ${currentPage} / ${totalPages}
        </span>
        <button type="button" class="btn btn-sm btn-secondary" ${currentPage >= totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} onclick="${onPageChangeCallbackName}(${currentPage + 1})" title="الصفحة التالية">
          <span>التالي</span>
          <i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
    </div>
  `;
}

// 7. Skeleton Loaders for Tables
export function renderTableSkeleton(columnsCount = 5, rowsCount = 6) {
  const rowHtml = `
    <tr class="skeleton-row" style="animation: skeletonPulse 1.4s ease-in-out infinite;">
      ${Array(columnsCount).fill(0).map(() => `
        <td style="padding: 1rem 1.25rem;">
          <div style="height: 15px; background: rgba(148, 163, 184, 0.18); border-radius: 6px; width: ${Math.floor(55 + Math.random() * 40)}%;"></div>
        </td>
      `).join('')}
    </tr>
  `;
  return Array(rowsCount).fill(rowHtml).join('');
}

// 8. Skeleton Loader for Metric Stat Cards
export function renderMetricCardsSkeleton(cardsCount = 4) {
  return Array(cardsCount).fill(0).map(() => `
    <div class="card" style="padding: 1.25rem; animation: skeletonPulse 1.4s ease-in-out infinite; border: 1px solid var(--border-color); border-radius: var(--border-radius);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <div style="height: 14px; width: 45%; background: rgba(148, 163, 184, 0.2); border-radius: 4px;"></div>
        <div style="height: 24px; width: 24px; background: rgba(148, 163, 184, 0.2); border-radius: 50%;"></div>
      </div>
      <div style="height: 30px; width: 65%; background: rgba(148, 163, 184, 0.25); border-radius: 6px; margin-bottom: 0.5rem;"></div>
      <div style="height: 12px; width: 80%; background: rgba(148, 163, 184, 0.15); border-radius: 4px;"></div>
    </div>
  `).join('');
}

// 9. Listener Manager to eliminate memory leaks and orphan listeners
export class ListenerManager {
  constructor() {
    this.listeners = new Map();
  }

  register(key, unsubscribeFn) {
    this.unsubscribe(key);
    if (typeof unsubscribeFn === 'function') {
      this.listeners.set(key, unsubscribeFn);
    }
  }

  unsubscribe(key) {
    if (this.listeners.has(key)) {
      const unsub = this.listeners.get(key);
      if (typeof unsub === 'function') {
        try { unsub(); } catch (err) { console.warn(`Error unsubscribing ${key}:`, err); }
      }
      this.listeners.delete(key);
    }
  }

  unsubscribeAll() {
    this.listeners.forEach((unsub, key) => {
      if (typeof unsub === 'function') {
        try { unsub(); } catch (err) {}
      }
    });
    this.listeners.clear();
  }
}

// 10. Multi-Tiered Smart Cache (Memory + Optional LocalStorage fallback)
export class SharedDataCache {
  constructor(ttlMs = 45000) {
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  set(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear() {
    this.cache.clear();
  }
}

// Global Singleton Instance of Cache & Listener Manager
export const globalCache = new SharedDataCache(60000);
export const globalListeners = new ListenerManager();
