import { db, auth } from '../../config/firebase.js';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  runTransaction, 
  writeBatch, 
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from './toast.js';
import { logAuditLog } from './activityLogger.js';
import { safeStringify } from './helpers.js';

/**
 * Global Transaction Protection System (نظام الحماية والمعاملات الشامل)
 * Central protection layer enforcing:
 * 1. Lock Button (Prevents double clicks & disables button on submit/action)
 * 2. Concurrent Processing Lock (In-Memory + Session Storage key locks)
 * 3. Idempotency Key Tracking (Prevents repeating identical transactions within a time window)
 * 4. Duplicate Record Detection (Firestore queries before record creation)
 * 5. Database Protection (Firestore transactions and batches)
 * 6. Atomic Operations with Rollback support
 * 7. Security Audit Logging for blocked duplicate attempts
 * 8. Universal coverage & user-friendly Arabic messaging
 */

export class TransactionProtectorClass {
  constructor() {
    this.activeLocks = new Set();
    this.processedIdempotencyKeys = new Map(); // key -> { result, timestamp }
    this.initAutoListeners();
  }

  /**
   * Automatically intercepts form submissions and button clicks across the app
   */
  initAutoListeners() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Attach document click listener to capture button clicks globally
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button, input[type="submit"], .btn-protected, .btn-action');
      if (!btn) return;

      // Skip if explicitly opted-out or already disabled
      if (btn.dataset.noProtect === 'true' || btn.disabled) return;

      // If button is inside a form, submit event handler will deal with locking
      const form = btn.closest('form');
      if (form && (btn.type === 'submit' || btn.dataset.action === 'submit')) {
        return;
      }

      // Lock button temporarily to prevent rapid double-clicks (debounce 1200ms)
      this.lockButtonTemporary(btn, 1200);
    }, true);

    // Attach form reset listener globally to unlock buttons when form is reset
    document.addEventListener('reset', (e) => {
      const form = e.target;
      if (!form) return;
      const submitBtns = form.querySelectorAll('button[type="submit"], input[type="submit"], button:not([type="button"])');
      submitBtns.forEach(btn => this.unlockButton(btn));
    }, true);

    // Attach form submit listener globally
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (!form || form.dataset.noProtect === 'true') return;

      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type="button"])');
      if (submitBtn) {
        this.lockButton(submitBtn, 'جاري الحفظ...', 8000);
      }
    }, true);
  }

  /**
   * Protection 1: Lock Button
   * Locks button immediately, shows loading spinner & text with safety auto-unlock timeout
   */
  lockButton(btn, loadingText = 'جاري المعالجة...', autoUnlockMs = 8000) {
    if (!btn || !(btn instanceof HTMLElement)) return null;

    if (btn.dataset.lockTimer) {
      clearTimeout(parseInt(btn.dataset.lockTimer, 10));
      delete btn.dataset.lockTimer;
    }

    if (btn.dataset.locked === 'true') {
      // Re-arm timer if already locked
      const timer = setTimeout(() => {
        this.unlockButton(btn);
      }, autoUnlockMs);
      btn.dataset.lockTimer = timer.toString();
      return btn;
    }

    btn.dataset.locked = 'true';
    btn.dataset.origHtml = btn.innerHTML;
    btn.dataset.origDisabled = btn.disabled ? 'true' : 'false';
    btn.disabled = true;

    const spinnerHtml = `<i data-lucide="loader-2" class="animate-spin" style="width: 16px; height: 16px; display: inline-block; animation: spin 0.8s linear infinite; margin-left: 0.35rem; vertical-align: middle;"></i>`;
    btn.innerHTML = `${spinnerHtml} <span>${loadingText}</span>`;

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try { window.lucide.createIcons(); } catch (err) {}
    }

    // Safety fallback: Auto-unlock button after timeout if not manually unlocked
    if (autoUnlockMs > 0) {
      const timer = setTimeout(() => {
        this.unlockButton(btn);
      }, autoUnlockMs);
      btn.dataset.lockTimer = timer.toString();
    }

    return btn;
  }

  /**
   * Unlocks button back to original state
   */
  unlockButton(btn) {
    if (!btn || !(btn instanceof HTMLElement)) return;

    if (btn.dataset.lockTimer) {
      clearTimeout(parseInt(btn.dataset.lockTimer, 10));
      delete btn.dataset.lockTimer;
    }

    if (btn.dataset.locked !== 'true') return;

    if (btn.dataset.origHtml !== undefined) {
      btn.innerHTML = btn.dataset.origHtml;
    }
    btn.disabled = btn.dataset.origDisabled === 'true';
    delete btn.dataset.locked;
    delete btn.dataset.origHtml;
    delete btn.dataset.origDisabled;

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try { window.lucide.createIcons(); } catch (err) {}
    }
  }

  /**
   * Temporary lock button for a fixed duration (preventing double clicks)
   */
  lockButtonTemporary(btn, durationMs = 1500) {
    if (!btn || btn.dataset.locked === 'true') return;

    const origPointerEvents = btn.style.pointerEvents;
    btn.style.pointerEvents = 'none';
    btn.dataset.tempLocked = 'true';

    setTimeout(() => {
      btn.style.pointerEvents = origPointerEvents || '';
      delete btn.dataset.tempLocked;
    }, durationMs);
  }

  /**
   * Protection 2: Processing Lock
   * Checks and acquires a lock key to prevent concurrent processing
   */
  acquireLock(lockKey, ttlMs = 15000) {
    if (!lockKey) return true;

    const sessionKey = `gtp_lock_${lockKey}`;
    const now = Date.now();

    if (this.activeLocks.has(lockKey)) {
      return false;
    }

    // Check sessionStorage for multi-tab or page protection
    try {
      const storedLock = sessionStorage.getItem(sessionKey);
      if (storedLock && (now - parseInt(storedLock, 10)) < ttlMs) {
        return false;
      }
      sessionStorage.setItem(sessionKey, now.toString());
    } catch (e) {}

    this.activeLocks.add(lockKey);

    // Auto cleanup TTL timer
    setTimeout(() => {
      this.releaseLock(lockKey);
    }, ttlMs);

    return true;
  }

  /**
   * Releases a processing lock key
   */
  releaseLock(lockKey) {
    if (!lockKey) return;
    this.activeLocks.delete(lockKey);
    try {
      sessionStorage.removeItem(`gtp_lock_${lockKey}`);
    } catch (e) {}
  }

  /**
   * Protection 3: Idempotency Key Check
   * Checks if operation was already completed within a validity window (default 10 mins)
   */
  async checkIdempotency(idempotencyKey, ttlMs = 600000) {
    if (!idempotencyKey) return null;

    const sessionKey = `gtp_idem_${idempotencyKey}`;
    const now = Date.now();

    // 1. Check in-memory map
    if (this.processedIdempotencyKeys.has(idempotencyKey)) {
      const entry = this.processedIdempotencyKeys.get(idempotencyKey);
      if (now - entry.timestamp < ttlMs) {
        return entry.result || { status: 'already_processed' };
      }
    }

    // 2. Check sessionStorage
    try {
      const stored = sessionStorage.getItem(sessionKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (now - parsed.timestamp < ttlMs) {
          return parsed.result || { status: 'already_processed' };
        }
      }
    } catch (e) {}

    // 3. Optional Firestore check
    try {
      const idemDocRef = doc(db, "idempotency_keys", idempotencyKey);
      const docSnap = await getDoc(idemDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.createdAt) {
          const createdTime = new Date(data.createdAt).getTime();
          if (now - createdTime < ttlMs) {
            return data.result || { status: 'already_processed' };
          }
        }
      }
    } catch (e) {}

    return null;
  }

  /**
   * Record completed Idempotency Key
   */
  async saveIdempotency(idempotencyKey, result = { success: true }, opName = 'UNKNOWN_OP') {
    if (!idempotencyKey) return;

    const payload = {
      result,
      timestamp: Date.now(),
      opName,
      createdAtIso: new Date().toISOString()
    };

    this.processedIdempotencyKeys.set(idempotencyKey, payload);

    try {
      sessionStorage.setItem(`gtp_idem_${idempotencyKey}`, safeStringify(payload));
    } catch (e) {}

    // Write background record to Firestore
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "idempotency_keys"), {
        idempotencyKey,
        opName,
        userId: user?.uid || 'guest',
        userEmail: user?.email || '',
        createdAt: new Date().toISOString(),
        createdAtServer: serverTimestamp()
      });
    } catch (e) {}
  }

  /**
   * Protection 4: Firestore Duplicate Detection
   * Checks if a record matching constraints exists in collection
   */
  async checkDuplicate(collectionName, constraints = [], friendlyMsg = "هذه البيانات موجودة مسبقًا.") {
    try {
      if (!collectionName || !constraints || constraints.length === 0) return false;

      const q = query(collection(db, collectionName), ...constraints);
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        Toast.warning(friendlyMsg);
        return true;
      }
      return false;
    } catch (err) {
      console.warn("خطأ فحص التكرار:", err);
      return false;
    }
  }

  /**
   * Protection 7: Write Security Audit Log for Blocked Operations
   */
  async logBlockedAttempt(opName, reason, details = {}) {
    try {
      const user = auth.currentUser;
      await logAuditLog({
        actionType: 'BLOCKED_DUPLICATE_OR_LOCK_ATTEMPT',
        targetCollection: details.collectionName || 'system',
        targetId: details.targetId || null,
        oldValue: null,
        newValue: null,
        adminName: user?.displayName || user?.email || 'مستخدم النظام',
        adminId: user?.uid || 'anonymous',
        reason: `[حظر المعاملات] ${reason}: ${opName}`
      });
    } catch (err) {
      console.error("خطأ توثيق محاولة المحظورات:", err);
    }
  }

  /**
   * Main Protection Wrapper: Enforces all 8 rules in one unified flow!
   * @param {Object} options
   * @param {string} options.opName - Name of operation (e.g., 'CREATE_SESSION', 'RECORD_PAYMENT')
   * @param {HTMLElement} [options.button] - Button element triggering the action
   * @param {string} [options.lockKey] - Unique key for lock concurrency
   * @param {string} [options.idempotencyKey] - Unique key for idempotency
   * @param {Function} [options.duplicateCheck] - Async function returning boolean if duplicate exists
   * @param {Function} options.actionFn - Async main function to execute (receives transaction/batch if needed)
   * @param {string} [options.loadingText] - Text to show on button during processing
   * @param {string} [options.successMsg] - Optional toast on success
   */
  async executeProtected({
    opName = 'TRANSACTION_OP',
    button = null,
    lockKey = null,
    idempotencyKey = null,
    duplicateCheck = null,
    actionFn = null,
    loadingText = 'جاري المعالجة...',
    successMsg = null
  }) {
    if (typeof actionFn !== 'function') {
      throw new Error("actionFn strictly required for executeProtected");
    }

    const resolvedLockKey = lockKey || idempotencyKey || (button ? `btn_${button.id || opName}` : `op_${opName}_${Date.now()}`);

    // 1. Lock Button (Protection 1)
    if (button) {
      this.lockButton(button, loadingText);
    }

    // 2. Acquire Processing Lock (Protection 2)
    if (!this.acquireLock(resolvedLockKey)) {
      Toast.warning("العملية قيد التنفيذ، يرجى الانتظار...");
      await this.logBlockedAttempt(opName, "LOCKED_CONCURRENT_ATTEMPT", { lockKey: resolvedLockKey });
      if (button) this.unlockButton(button);
      return { success: false, reason: 'LOCKED' };
    }

    try {
      // 3. Check Idempotency (Protection 3)
      if (idempotencyKey) {
        const previousResult = await this.checkIdempotency(idempotencyKey);
        if (previousResult) {
          Toast.info("تم تنفيذ العملية بالفعل مسبقاً.");
          await this.logBlockedAttempt(opName, "IDEMPOTENT_REPLAY_BLOCKED", { idempotencyKey });
          return { success: true, result: previousResult, reused: true };
        }
      }

      // 4. Duplicate Record Check (Protection 4)
      if (typeof duplicateCheck === 'function') {
        const isDuplicate = await duplicateCheck();
        if (isDuplicate) {
          await this.logBlockedAttempt(opName, "DUPLICATE_RECORD_PREVENTED", { opName });
          return { success: false, reason: 'DUPLICATE' };
        }
      }

      // 5, 6. Execute Main Action (Protection 5 & 6: Database Protection & Atomic Operations)
      const result = await actionFn();

      // Save Idempotency
      if (idempotencyKey) {
        await this.saveIdempotency(idempotencyKey, result, opName);
      }

      if (successMsg) {
        Toast.success(successMsg);
      }

      return { success: true, result };

    } catch (error) {
      console.error(`[GTP Error in ${opName}]:`, error);
      const errMsg = error.message || "حدث خطأ أثناء تنفيذ العملية.";

      if (errMsg.includes("exist") || errMsg.includes("موجود")) {
        Toast.warning("هذه البيانات موجودة مسبقًا.");
      } else {
        Toast.danger(`فشلت العملية: ${errMsg}`);
      }

      throw error;
    } finally {
      // Release Lock and Unlock Button
      this.releaseLock(resolvedLockKey);
      if (button) {
        this.unlockButton(button);
      }
    }
  }

  /**
   * Protection 5 & 6: Execute Atomic Firestore Transaction
   */
  async runAtomicTransaction(transactionHandler) {
    return await runTransaction(db, async (transaction) => {
      return await transactionHandler(transaction);
    });
  }

  /**
   * Helper to create atomic write batch
   */
  createBatch() {
    return writeBatch(db);
  }
}

// Instantiate Singleton
export const TransactionProtector = new TransactionProtectorClass();

// Attach to Window for global availability across non-module scripts
if (typeof window !== 'undefined') {
  window.TransactionProtector = TransactionProtector;
  window.GTP = TransactionProtector;
}
