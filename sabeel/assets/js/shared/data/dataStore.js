/**
 * Sabeel Academy - Centralized Shared Data Store & Hydration Engine
 * Single Source of Truth for Firestore Collections, Multi-Subscriber Deduplication & Metrics Cache
 */
import { db, auth } from '../../config/firebase.js';
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
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
      feedbacks: []
    };

    this.activeListeners = new Map(); // collectionName -> { unsubscribe, subscribers: Set }
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

    // If we already have cached data, fire immediately
    if (this.cache[collectionKey].length > 0) {
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

    // Apply smart query bounds
    if (collectionKey === 'sessions' && options.currentMonthOnly) {
      const startOfMonth = options.startOfMonth || new Date().toISOString().substring(0, 7) + '-01';
      q = query(collection(db, "sessions"), where("date", ">=", startOfMonth));
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
          } else {
            items.push({ ...data, id: docSnap.id });
          }
        });

        this.cache[collectionKey] = items;
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
        // Fallback for collections
        if (collectionKey === 'expenses' || collectionKey === 'notifications') {
          this.cache[collectionKey] = this.cache[collectionKey] || [];
          entry.subscribers.forEach(cb => cb(this.cache[collectionKey] || []));
        }
      });

      entry.unsubscribe = unsub;
    } catch (err) {
      console.warn(`[DataStore] Listener setup error for ${collectionKey}:`, err);
    }
  }

  /**
   * Get immediate in-memory copy without waiting for network
   */
  get(collectionKey) {
    return this.cache[collectionKey] || [];
  }

  /**
   * Pre-fetches essential data in staged order
   */
  async preloadEssentials(role) {
    if (this.isHydrating) return;
    this.isHydrating = true;

    try {
      // Stage 1: Basic user info and today's context
      const todayStr = new Date().toISOString().split('T')[0];
      const todayArabic = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"][new Date().getDay()];

      // Stage 2: Subscribe to essential core collections
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
