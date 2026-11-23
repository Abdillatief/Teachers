/**
 * Sabeel Academy - Centralized Shared Data Store & Hydration Engine
 * Single Source of Truth for Firestore Collections, Multi-Subscriber Deduplication & Metrics Cache
 */
import { db, auth } from '../../config/firebase.js';
import { isNotificationPermittedForUser } from '../services/notificationService.js';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  getDocs, 
  getDoc, 
  doc 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

class CentralDataStore {
  constructor() {
    this.cache = {
      users: [],
      teachers: [],
      students: [],
      sessions: [],
      groups: [],
      packages: [],
      studentBalances: [],
      payments: [],
      expenses: [],
      subscriptions: [],
      notifications: [],
      feedbacks: [],
      supervisorRequests: [],
      warnings: [],
      parentInteractions: [],
      studentOperationalSummaries: [],
      teacherOperationalProfiles: [],
      absenceLogs: [],
      activityLogs: []
    };

    this.activeListeners = new Map(); // collectionName -> { unsubscribe, subscribers: Set }
    this.loadedCollections = new Set(); // tracks collections that delivered at least one snapshot
    this.collectionErrors = new Map(); // collectionName -> last stream/refresh error
    this.computedMetricsCache = new Map(); // key -> { timestamp, data }
    this.METRICS_TTL = 30 * 1000; // 30 seconds cache for heavy aggregations
    this.isHydrating = false;
  }

  /**
   * Subscribe to a collection with automatic listener deduplication.
   * If a listener already exists for this collection, the new callback is simply attached.
   */
  subscribe(collectionKey, callback, options = {}) {
    if (!this.cache[collectionKey]) {
      this.cache[collectionKey] = [];
    }

    // If we already have cached data or the initial snapshot already arrived (even if empty), fire immediately
    if (this.cache[collectionKey].length > 0 || this.loadedCollections.has(collectionKey)) {
      try {
        callback(this.cache[collectionKey]);
      } catch (err) {
        console.warn(`[DataStore] Immediate callback error for ${collectionKey}:`, err);
      }
    }

    let entry = this.activeListeners.get(collectionKey);
    if (!entry) {
      entry = {
        subscribers: new Set(),
        unsubscribe: null
      };
      this.activeListeners.set(collectionKey, entry);
      this._startFirestoreListener(collectionKey, options);
    }

    entry.subscribers.add(callback);

    // Return unsubscription token
    return () => {
      if (entry.subscribers.has(callback)) {
        entry.subscribers.delete(callback);
        if (entry.subscribers.size === 0) {
          // No more active UI components listening; keep data in cache but cleanup Firestore stream after idle
          setTimeout(() => {
            if (entry.subscribers.size === 0 && entry.unsubscribe) {
              entry.unsubscribe();
              this.activeListeners.delete(collectionKey);
            }
          }, 60000); // 1 minute grace period
        }
      }
    };
  }

  /**
   * Starts single dedicated listener on Firestore collection
   */
  _startFirestoreListener(collectionKey, options = {}) {
    const entry = this.activeListeners.get(collectionKey);
    if (!entry) return;

    let targetCollection = collectionKey;
    if (collectionKey === 'teachers') targetCollection = 'users';
    if (collectionKey === 'studentBalances') targetCollection = 'studentBalances';
    if (collectionKey === 'packages') targetCollection = 'studentPackages';

    let q = collection(db, targetCollection);

    let sessionRole = '';
    try {
      const rawSession = sessionStorage.getItem('sabeel_user_session') || sessionStorage.getItem('sabeel_user');
      if (rawSession) {
        sessionRole = JSON.parse(rawSession)?.role || '';
      }
    } catch (e) {}
    if (!sessionRole && typeof window !== 'undefined') {
      const p = window.location.pathname || '';
      if (p.includes('/teacher/')) sessionRole = 'teacher';
      else if (p.includes('/supervisor/')) sessionRole = 'supervisor';
      else if (p.includes('/admin/')) sessionRole = 'admin';
    }
    const currentUid = auth?.currentUser?.uid || '';

    // Prevent non-permitted roles from opening blocked collection listeners
    if (sessionRole === 'supervisor' && ['users', 'students', 'studentBalances', 'packages', 'payments', 'expenses', 'subscriptions', 'salaryArchive', 'notifications', 'warnings', 'feedbacks'].includes(collectionKey)) {
      this.activeListeners.delete(collectionKey);
      return;
    }
    if (sessionRole === 'teacher' && ['users', 'payments', 'expenses', 'subscriptions', 'supervisorRequests', 'warnings', 'activityLogs', 'studentOperationalSummaries'].includes(collectionKey)) {
      this.activeListeners.delete(collectionKey);
      return;
    }

    // Apply smart query bounds
    if (sessionRole === 'teacher' && ['students', 'sessions', 'groups', 'salaryArchive', 'feedbacks'].includes(collectionKey)) {
      if (!currentUid) {
        this.activeListeners.delete(collectionKey);
        return;
      }
      if (collectionKey === 'sessions' && options.currentMonthOnly) {
        const startOfMonth = options.startOfMonth || new Date().toISOString().substring(0, 7) + '-01';
        q = query(collection(db, "sessions"), where("teacherId", "==", currentUid), where("date", ">=", startOfMonth));
      } else {
        q = query(collection(db, targetCollection), where("teacherId", "==", currentUid));
      }
    } else if (collectionKey === 'sessions' && options.currentMonthOnly) {
      const startOfMonth = options.startOfMonth || new Date().toISOString().substring(0, 7) + '-01';
      q = query(collection(db, "sessions"), where("date", ">=", startOfMonth));
    } else if (collectionKey === 'supervisorRequests' && (options.supervisorId || sessionRole === 'supervisor')) {
      const targetSupervisorUid = options.supervisorId || currentUid;
      if (!targetSupervisorUid) {
        this.activeListeners.delete(collectionKey);
        return;
      }
      q = query(collection(db, "supervisorRequests"), where("supervisorId", "==", targetSupervisorUid));
    } else if (collectionKey === 'notifications') {
      try {
        q = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(50));
      } catch (e) {
        q = query(collection(db, "notifications"), limit(50));
      }
    }

    try {
      const unsub = onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (collectionKey === 'teachers') {
            if (data.role === 'teacher') {
              items.push({ ...data, uid: docSnap.id, id: docSnap.id });
            }
          } else if (collectionKey === 'notifications') {
            const currentUid = auth?.currentUser?.uid;
            if (currentUid && isNotificationPermittedForUser(data, currentUid, 'teacher')) {
              items.push({ ...data, id: docSnap.id });
            }
          } else {
            items.push({ ...data, id: docSnap.id });
          }
        });

        this.cache[collectionKey] = items;
        this.collectionErrors.delete(collectionKey);
        this.loadedCollections.add(collectionKey);
        this.computedMetricsCache.clear(); // invalidate computed aggregations on new data

        // Notify all registered subscribers
        entry.subscribers.forEach(cb => {
          try {
            cb(items);
          } catch (e) {
            console.warn(`[DataStore] Subscriber notification error for ${collectionKey}:`, e);
          }
        });
      }, (error) => {
        console.warn(`[DataStore] Stream warning for ${collectionKey}:`, error);
        this.collectionErrors.set(collectionKey, error);
        this.loadedCollections.add(collectionKey);
        this.cache[collectionKey] = this.cache[collectionKey] || [];
        entry.subscribers.forEach(cb => {
          try { cb(this.cache[collectionKey]); } catch (e) {}
        });
      });

      entry.unsubscribe = unsub;
    } catch (err) {
      console.warn(`[DataStore] Listener setup error for ${collectionKey}:`, err);
    }
  }

  /**
   * Manually refreshes a collection from Firestore
   */
  async refreshCollection(collectionKey) {
    try {
      let targetCollection = collectionKey;
      if (collectionKey === 'teachers') targetCollection = 'users';
      if (collectionKey === 'studentBalances') targetCollection = 'studentBalances';
      if (collectionKey === 'packages') targetCollection = 'studentPackages';

      const snap = await getDocs(collection(db, targetCollection));
      const items = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (collectionKey === 'teachers') {
          if (data.role === 'teacher') {
            items.push({ ...data, uid: docSnap.id, id: docSnap.id });
          }
        } else {
          items.push({ ...data, id: docSnap.id });
        }
      });
      this.cache[collectionKey] = items;
      this.collectionErrors.delete(collectionKey);
      this.loadedCollections.add(collectionKey);
      const entry = this.activeListeners.get(collectionKey);
      if (entry) {
        entry.subscribers.forEach(cb => {
          try { cb(items); } catch (e) {}
        });
      }
      return items;
    } catch (e) {
      console.warn(`[DataStore] Refresh error for ${collectionKey}:`, e);
      this.collectionErrors.set(collectionKey, e);
      return this.cache[collectionKey] || [];
    }
  }

  /**
   * Get immediate in-memory copy without waiting for network
   */
  get(collectionKey) {
    return this.cache[collectionKey] || [];
  }

  /**
   * Get last error (if any) for a collection
   */
  getError(collectionKey) {
    return this.collectionErrors.get(collectionKey) || null;
  }

  /**
   * Pre-fetches essential data in staged order
   */
  async preloadEssentials(role, permissions = null) {
    if (this.isHydrating) return;
    this.isHydrating = true;

    try {
      if (role === 'supervisor') {
        // Strictly non-financial operational collections only — never subscribe to students, payments, balances, packages, or notifications
        const currentUid = auth?.currentUser?.uid || '';
        const p = permissions && typeof permissions === 'object' ? permissions : null;
        const canViewLessonCollections = !p ||
          p.view_lessons === true ||
          p.manage_lessons === true ||
          p.view_supervisor_dashboard === true ||
          p.view_absences === true ||
          p.view_postponed_lessons === true ||
          p.view_schedules === true ||
          p.view_operational_reports === true;
        const canViewActivity = !p ||
          p.view_supervisor_dashboard === true ||
          p.view_operational_reports === true ||
          p.view_lessons === true;

        this.subscribe('studentOperationalSummaries', () => {});
        this.subscribe('teacherOperationalProfiles', () => {});
        if (canViewLessonCollections) {
          this.subscribe('sessions', () => {});
        }
        this.subscribe('groups', () => {});
        if (currentUid && (!p || p.create_requests === true)) {
          this.subscribe('supervisorRequests', () => {}, { supervisorId: currentUid });
        }
        this.subscribe('absenceLogs', () => {});
        if (canViewActivity) {
          this.subscribe('activityLogs', () => {});
        }
        return;
      }

      if (role === 'teacher') {
        // Teacher-scoped collections only — never subscribe to admin financial collections or full users list
        this.subscribe('students', () => {});
        this.subscribe('sessions', () => {});
        this.subscribe('groups', () => {});
        setTimeout(() => {
          this.subscribe('notifications', () => {});
        }, 150);
        return;
      }

      // Stage 2: Subscribe to essential core collections for Admin
      this.subscribe('users', () => {});
      this.subscribe('teachers', () => {});
      this.subscribe('students', () => {});
      this.subscribe('sessions', () => {});
      this.subscribe('groups', () => {});
      this.subscribe('studentBalances', () => {});
      this.subscribe('packages', () => {});

      // Stage 3: Defer non-critical financial and notification data
      setTimeout(() => {
        this.subscribe('payments', () => {});
        this.subscribe('notifications', () => {});
        this.subscribe('subscriptions', () => {});
        this.subscribe('expenses', () => {});
      }, 150);

    } catch (e) {
      console.warn("[DataStore] Preload warning:", e);
    } finally {
      this.isHydrating = false;
    }
  }

  /**
   * Get cached or compute dashboard metrics
   */
  getDashboardMetrics(yearMonth, teachersList = null) {
    const cacheKey = `metrics_${yearMonth}`;
    const cached = this.computedMetricsCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp < this.METRICS_TTL)) {
      return cached.data;
    }

    const students = this.get('students');
    const teachers = teachersList || this.get('teachers');
    const sessions = this.get('sessions');
    const payments = this.get('payments');
    const expenses = this.get('expenses');
    const balances = this.get('studentBalances');

    const approvedTeachers = teachers.filter(t => t.status === "approved" || t.status === "active");
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => s.date === todayStr);

    // Active students
    const activeStudents = students.filter(s => s.status !== "archived" && s.status !== "Suspended" && s.status !== "pending_approval");
    
    // Revenue for month
    const monthPayments = payments.filter(p => {
      const pDate = p.paymentDate || p.createdAt || p.date;
      return pDate && String(pDate).startsWith(yearMonth);
    });
    const totalRevenue = monthPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    // Expenses
    const monthExpenses = expenses.filter(e => {
      const eDate = e.date || e.createdAt;
      return eDate && String(eDate).startsWith(yearMonth);
    });
    const totalExpenses = monthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    const metricsData = {
      totalStudents: students.length,
      activeStudentsCount: activeStudents.length,
      totalTeachers: teachers.length,
      approvedTeachersCount: approvedTeachers.length,
      todaySessionsCount: todaySessions.length,
      totalRevenue,
      totalExpenses,
      todayPaymentsCount: monthPayments.length
    };

    this.computedMetricsCache.set(cacheKey, {
      timestamp: now,
      data: metricsData
    });

    return metricsData;
  }
}

export const dataStore = new CentralDataStore();
