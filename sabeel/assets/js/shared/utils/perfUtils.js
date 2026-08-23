/**
 * Performance & Optimization Utilities for Sabil System
 */

// 1. Debounce function to limit execution frequency of heavy search/filter functions
export function debounce(func, wait = 250) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 2. Targeted Lucide Icon Initializer - avoids document-wide DOM scanning
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

// 3. Fast Pagination Helper for large datasets (Students, Sessions, Payments, Audit logs)
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

// 4. Render Pagination Controls HTML
export function renderPaginationControls({ currentPage, totalPages, totalItems, startIndex, endIndex }, onPageChangeCallbackName = 'changeTablePage') {
  if (totalItems === 0) return '';

  return `
    <div class="table-pagination-bar" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: var(--bg-primary); border-top: 1px solid var(--border-color); flex-wrap: wrap; gap: 0.5rem; font-size: 0.85rem;">
      <div style="color: var(--text-secondary);">
        عرض <strong style="color: var(--text-primary);">${startIndex}</strong> - <strong style="color: var(--text-primary);">${endIndex}</strong> من إجمالي <strong style="color: var(--primary-color);">${totalItems}</strong> عنصر
      </div>
      <div style="display: flex; gap: 0.35rem; align-items: center;">
        <button type="button" class="btn btn-sm btn-secondary" ${currentPage <= 1 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="${onPageChangeCallbackName}(${currentPage - 1})">
          السابق
        </button>
        <span style="padding: 0 0.5rem; font-weight: 700; color: var(--text-primary);">صفحة ${currentPage} من ${totalPages}</span>
        <button type="button" class="btn btn-sm btn-secondary" ${currentPage >= totalPages ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="${onPageChangeCallbackName}(${currentPage + 1})">
          التالي
        </button>
      </div>
    </div>
  `;
}

// 5. Skeleton Loader for Tables
export function renderTableSkeleton(columnsCount = 5, rowsCount = 5) {
  const rowHtml = `
    <tr class="skeleton-row" style="animation: pulse 1.5s infinite;">
      ${Array(columnsCount).fill(0).map(() => `
        <td style="padding: 0.85rem 1rem;">
          <div style="height: 16px; background: rgba(150, 150, 150, 0.15); border-radius: 4px; width: 80%;"></div>
        </td>
      `).join('')}
    </tr>
  `;
  return Array(rowsCount).fill(rowHtml).join('');
}

// 6. Listener Manager to eliminate memory leaks and orphan listeners
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

// 7. In-Memory Lightweight Cache for computed values or Firestore collections
export class SharedDataCache {
  constructor(ttlMs = 30000) {
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
