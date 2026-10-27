import { db, auth } from '../../config/firebase.js';
import { 
  collection, 
  query, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  orderBy, 
  limit, 
  where, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from '../../shared/utils/toast.js';
import { showCustomConfirm, safeStringify } from '../../shared/utils/helpers.js';
import { logAuditLog } from '../../shared/utils/activityLogger.js';

// Global Data Caches
let sessionsCache = [];
let financialCache = [];
let activityCache = [];
let studentsCache = [];
let teachersCache = [];
let trialSessionsCache = [];

let activeTab = 'lessons';
let currentDrawerData = null;

/**
 * Initializes the Investigation Center (مركز التحقيق وإدارة العمليات)
 */
export async function initInvestigationCenter() {
  setupTabNavigation();
  setupGlobalSearch();
  setupFilterListeners();
  setupDrawerCloseEvents();

  // Load initial data
  await loadAllSystemData();

  // Initial render for active tab
  renderActiveTab();
}

/**
 * Attaches instant input and change listeners for filtering tabs
 */
function setupFilterListeners() {
  const filterElementIds = [
    'lessonsSearchInput',
    'lessonsFilterStatus',
    'finSearchInput',
    'finFilterType',
    'actSearchInput',
    'actFilterCategory'
  ];

  const handleFilter = () => {
    renderActiveTab();
    if (window.lucide) window.lucide.createIcons();
  };

  filterElementIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', handleFilter);
      el.addEventListener('change', handleFilter);
    }
  });

  window.addEventListener('invFilterChanged', handleFilter);
}

/**
 * Sets up tab switching logic
 */
function setupTabNavigation() {
  const tabs = document.querySelectorAll('.investigation-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;

      document.querySelectorAll('.investigation-tab-pane').forEach(pane => {
        pane.classList.remove('active');
      });

      const activePane = document.getElementById(`pane-${activeTab}`);
      if (activePane) {
        activePane.classList.add('active');
      }

      renderActiveTab();
    });
  });
}

/**
 * Global drawer events
 */
function setupDrawerCloseEvents() {
  document.querySelectorAll('.close-drawer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllDrawers();
    });
  });

  const overlay = document.getElementById('investigationDrawerOverlay');
  if (overlay) {
    overlay.addEventListener('click', closeAllDrawers);
  }
}

export function closeAllDrawers() {
  const drawer = document.getElementById('investigationSideDrawer');
  const relatedDrawer = document.getElementById('relatedDataDrawer');
  const overlay = document.getElementById('investigationDrawerOverlay');
  if (drawer) drawer.classList.remove('open');
  if (relatedDrawer) relatedDrawer.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

/**
 * Loads all system collections required for investigation
 */
export async function loadAllSystemData() {
  showLoader(true);
  try {
    const [
      sessionsSnap, 
      financialSnap, 
      activitySnap, 
      auditSnap, 
      studentsSnap, 
      teachersSnap,
      trialsSnap
    ] = await Promise.all([
      getDocs(query(collection(db, "sessions"), orderBy("createdAt", "desc"), limit(300))).catch(e => ({ docs: [] })),
      getDocs(query(collection(db, "teacher_salary_transactions"), orderBy("createdAt", "desc"), limit(300))).catch(e => ({ docs: [] })),
      getDocs(query(collection(db, "teacher_activity_logs"), orderBy("timestamp", "desc"), limit(300))).catch(e => ({ docs: [] })),
      getDocs(query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(300))).catch(e => ({ docs: [] })),
      getDocs(collection(db, "students")).catch(e => ({ docs: [] })),
      getDocs(collection(db, "users")).catch(e => ({ docs: [] })),
      getDocs(collection(db, "trial_sessions")).catch(e => ({ docs: [] }))
    ]);

    sessionsCache = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    financialCache = financialSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Combine activity logs and audit logs
    const teacherLogs = activitySnap.docs.map(d => ({ id: d.id, ...d.data(), source: 'teacher' }));
    const systemAuditLogs = auditSnap.docs.map(d => ({ id: d.id, ...d.data(), source: 'audit' }));
    
    activityCache = [...teacherLogs, ...systemAuditLogs].sort((a, b) => {
      const timeA = new Date(a.createdAtIso || a.timestamp || 0).getTime();
      const timeB = new Date(b.createdAtIso || b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    studentsCache = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    teachersCache = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    trialSessionsCache = trialsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    updateStatsCounters();
  } catch (err) {
    console.error("Error loading investigation center data:", err);
    Toast.error("حدث خطأ أثناء تحميل بيانات مركز التحقيق.");
  } finally {
    showLoader(false);
  }
}

function showLoader(visible) {
  const loader = document.getElementById('investigationLoader');
  if (loader) loader.style.display = visible ? 'flex' : 'none';
}

function updateStatsCounters() {
  const totalLessonsEl = document.getElementById('statTotalLessons');
  const totalFinEl = document.getElementById('statTotalFinancial');
  const totalLogsEl = document.getElementById('statTotalLogs');
  const totalStudentsEl = document.getElementById('statTotalStudents');

  if (totalLessonsEl) totalLessonsEl.textContent = sessionsCache.length;
  if (totalFinEl) totalFinEl.textContent = financialCache.length;
  if (totalLogsEl) totalLogsEl.textContent = activityCache.length;
  if (totalStudentsEl) totalStudentsEl.textContent = studentsCache.length;
}

/**
 * Helper to get session salary status according to Academy rules:
 * 1. Completed (مكتملة) -> Calculated automatically
 * 2. Cancelled (ملغاة) -> Not calculated
 * 3. Postponed (مؤجلة) -> Not calculated
 * 4. Student absent excused (غياب بعذر) -> Not calculated
 * 5. Student absent unexcused (غياب بدون عذر) -> Calculated fully
 * 6. Teacher absent (غياب المعلم) -> Not calculated
 * Note: Reports are optional and not required for salary calculation.
 */
export function getAcademySalaryRuleStatus(session) {
  const status = (session.status || 'completed').toLowerCase();
  const absenceType = (session.absenceType || '').toLowerCase();
  const isCalculated = !!(session.calculatedInSalary || session.calculated || session.approved || session.paid);
  const isTrial = session.type === 'trial' || session.isTrial === true;
  const isTrialApproved = isTrial && (session.approved === true || session.trialSubscribed === true);

  if (isTrial && !isTrialApproved) {
    return {
      expectedSalary: false,
      isCalculated: isCalculated,
      statusLabel: isCalculated ? 'احتسبت بالخطأ (حصة تجريبية غير معتمدة)' : 'حصة تجريبية غير معتمدة (لا تُحتسب بالمرتب)',
      badgeClass: isCalculated ? 'badge-danger' : 'badge-info',
      icon: 'help-circle',
      hasMismatch: isCalculated
    };
  }

  const isCancelled = status === 'cancelled' || status === 'ملغاة';
  const isPostponed = status === 'postponed' || status === 'rescheduled' || status === 'مؤجلة';
  const isExcusedAbsent = status === 'student_absent_excused' || status === 'غياب بعذر' || status === 'excused_absence' || (status === 'student_absent' && absenceType === 'excused');
  const isTeacherAbsent = status === 'teacher_absent' || status === 'غياب المعلم';
  const isUnexcusedAbsent = status === 'student_absent_unexcused' || status === 'غياب بدون عذر' || status === 'unexcused_absence' || (status === 'student_absent' && absenceType === 'unexcused');

  if (isCancelled) {
    return {
      expectedSalary: false,
      isCalculated: isCalculated,
      statusLabel: isCalculated ? 'احتسبت بالخطأ رغم إلغاء الحصة' : 'لم تُحتسب بسبب إلغاء الحصة',
      badgeClass: isCalculated ? 'badge-danger' : 'badge-secondary',
      icon: 'x-circle',
      hasMismatch: isCalculated
    };
  }

  if (isPostponed) {
    return {
      expectedSalary: false,
      isCalculated: isCalculated,
      statusLabel: isCalculated ? 'احتسبت بالخطأ رغم تأجيل الحصة' : 'لم تُحتسب لأنها مؤجلة',
      badgeClass: isCalculated ? 'badge-danger' : 'badge-secondary',
      icon: 'clock',
      hasMismatch: isCalculated
    };
  }

  if (isExcusedAbsent) {
    return {
      expectedSalary: false,
      isCalculated: isCalculated,
      statusLabel: isCalculated ? 'احتسبت بالخطأ رغم غياب الطالب بعذر' : 'لم تُحتسب بسبب غياب الطالب بعذر',
      badgeClass: isCalculated ? 'badge-danger' : 'badge-warning',
      icon: 'user-x',
      hasMismatch: isCalculated
    };
  }

  if (isTeacherAbsent) {
    return {
      expectedSalary: false,
      isCalculated: isCalculated,
      statusLabel: isCalculated ? 'احتسبت بالخطأ رغم غياب المعلم' : 'لم تُحتسب بسبب غياب المعلم',
      badgeClass: isCalculated ? 'badge-danger' : 'badge-warning',
      icon: 'user-x',
      hasMismatch: isCalculated
    };
  }

  if (isUnexcusedAbsent) {
    if (isCalculated) {
      return {
        expectedSalary: true,
        isCalculated: true,
        statusLabel: isTrial ? 'احتُسبت بسبب غياب الطالب بدون عذر (حصة تجريبية معتمدة)' : 'احتُسبت بسبب غياب الطالب بدون عذر',
        badgeClass: 'badge-success',
        icon: 'check-circle',
        hasMismatch: false
      };
    } else {
      return {
        expectedSalary: true,
        isCalculated: false,
        statusLabel: 'غياب الطالب بدون عذر ولكن لم تُحتسب',
        badgeClass: 'badge-danger',
        icon: 'alert-triangle',
        hasMismatch: true
      };
    }
  }

  // Default: Completed session (مكتملة)
  if (isCalculated) {
    return {
      expectedSalary: true,
      isCalculated: true,
      statusLabel: isTrial ? 'تم احتسابها في المرتب (حصة تجريبية معتمدة)' : 'تم احتسابها في المرتب',
      badgeClass: 'badge-success',
      icon: 'check-circle',
      hasMismatch: false
    };
  } else {
    return {
      expectedSalary: true,
      isCalculated: false,
      statusLabel: 'الحصة مكتملة ولكن لم تدخل في المرتب',
      badgeClass: 'badge-danger',
      icon: 'alert-triangle',
      hasMismatch: true
    };
  }
}

/**
 * Renders currently active tab view
 */
function renderActiveTab() {
  switch (activeTab) {
    case 'lessons':
      renderLessonsTab();
      break;
    case 'financial':
      renderFinancialTab();
      break;
    case 'activity':
      renderActivityTab();
      break;
    case 'explorer':
      renderExplorerTab();
      break;
  }
}

/* ==========================================================================
   1️⃣ LESSONS TAB (الحصص)
   ========================================================================== */

function renderLessonsTab() {
  const container = document.getElementById('pane-lessons');
  if (!container) return;

  const searchInput = document.getElementById('lessonsSearchInput')?.value.trim().toLowerCase() || '';
  const filterStatus = document.getElementById('lessonsFilterStatus')?.value || 'all';

  let filtered = [...sessionsCache];

  if (searchInput) {
    filtered = filtered.filter(s => 
      (s.studentName && s.studentName.toLowerCase().includes(searchInput)) ||
      (s.teacherName && s.teacherName.toLowerCase().includes(searchInput)) ||
      (s.date && s.date.includes(searchInput)) ||
      (s.id && s.id.toLowerCase().includes(searchInput))
    );
  }

  if (filterStatus === 'trials') {
    filtered = filtered.filter(s => s.type === 'trial' || s.isTrial === true);
  } else if (filterStatus === 'uncalculated' || filterStatus === 'mismatch') {
    filtered = filtered.filter(s => getAcademySalaryRuleStatus(s).hasMismatch);
  } else if (filterStatus === 'missing_report') {
    filtered = filtered.filter(s => !s.report || !s.report.surah || s.report.surah === 'غير محدد');
  } else if (filterStatus === 'edited') {
    filtered = filtered.filter(s => s.lastModifiedBy || s.updatedBy || s.edited);
  } else if (filterStatus === 'completed') {
    filtered = filtered.filter(s => s.status === 'completed' || s.status === 'مكتملة' || !s.status);
  }

  const tableBody = document.getElementById('lessonsTableBody');
  if (!tableBody) return;

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-5 text-muted">
          <i data-lucide="inbox" style="width: 32px; height: 32px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
          <p>لا توجد حصص تطابق معايير البحث والفلترة الحالية.</p>
        </td>
      </tr>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  tableBody.innerHTML = filtered.map(s => {
    const recordedAtFormatted = formatTimestamp(s.createdAt || s.timestamp);
    const lastEditFormatted = formatTimestamp(s.updatedAt || s.lastModifiedAt);

    return `
      <tr class="inv-table-row" data-id="${s.id}">
        <td>
          <div class="font-bold text-primary">${s.studentName || 'طالب غير معروف'}</div>
          <div class="text-xs text-muted">ID: ${s.studentId || '-'}</div>
        </td>
        <td>
          <div class="font-semibold">${s.teacherName || 'معلم غير معروف'}</div>
        </td>
        <td>
          <div class="font-mono text-xs">${s.date || '-'}</div>
        </td>
        <td>
          <div class="text-xs font-mono">${s.startTime || s.time || '-'} -> ${s.endTime || '-'}</div>
          <div class="text-xs text-muted">${s.duration || 60} دقيقة</div>
        </td>
        <td>
          <div class="text-xs font-mono">${recordedAtFormatted}</div>
        </td>
        <td>
          <div class="text-xs">${s.createdBy || s.recordedBy || s.teacherName || 'المعلم'}</div>
        </td>
        <td>
          <div class="text-xs">${s.lastModifiedBy || s.updatedBy || '-'}</div>
          <div class="text-xs text-muted">${lastEditFormatted}</div>
        </td>
        <td class="text-left">
          <button class="btn btn-sm btn-secondary view-session-btn" data-id="${s.id}" title="عرض تفاصيل الحصة والفحص">
            <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
            <span>عرض</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();

  // Attach row click listeners
  tableBody.querySelectorAll('.view-session-btn, tr.inv-table-row').forEach(el => {
    el.addEventListener('click', (e) => {
      const id = el.dataset.id || el.closest('tr')?.dataset.id;
      if (id) {
        openSessionDetailDrawer(id);
      }
    });
  });
}

/**
 * Opens Side Drawer for Lesson Details & Summary
 */
export async function openSessionDetailDrawer(sessionId) {
  const session = sessionsCache.find(s => s.id === sessionId);
  if (!session) return;

  currentDrawerData = { type: 'session', data: session };

  const drawer = document.getElementById('investigationSideDrawer');
  const drawerContent = document.getElementById('drawerBodyContent');
  const drawerTitle = document.getElementById('drawerTitleText');
  const overlay = document.getElementById('investigationDrawerOverlay');

  if (!drawer || !drawerContent) return;

  drawerTitle.textContent = `فحص الحصة: ${session.studentName || ''} (${session.date || ''})`;

  const hasReport = !!(session.report && (session.report.surah || session.report.notes));
  const ruleStatus = getAcademySalaryRuleStatus(session);

  // Status text Arabic
  const statusMap = {
    'completed': 'مكتملة',
    'مكتملة': 'مكتملة',
    'cancelled': 'ملغاة',
    'ملغاة': 'ملغاة',
    'postponed': 'مؤجلة',
    'rescheduled': 'مؤجلة',
    'مؤجلة': 'مؤجلة',
    'student_absent_excused': 'غياب الطالب بعذر',
    'غياب بعذر': 'غياب الطالب بعذر',
    'student_absent_unexcused': 'غياب الطالب بدون عذر',
    'غياب بدون عذر': 'غياب الطالب بدون عذر',
    'teacher_absent': 'غياب المعلم',
    'غياب المعلم': 'غياب المعلم'
  };
  const sessionStatusText = statusMap[session.status] || session.status || 'مكتملة';
  
  // Find connected financial transaction
  const linkedFinancial = financialCache.find(f => f.sessionId === session.id || (f.teacherId === session.teacherId && f.description?.includes(session.studentName)));

  // Find connected activity logs
  const linkedLogs = activityCache.filter(l => l.targetId === session.id || l.details?.sessionId === session.id || (l.details?.studentName === session.studentName && l.details?.date === session.date));

  drawerContent.innerHTML = `
    <!-- LESSON STATUS SUMMARY PANEL -->
    <div class="inspector-panel mb-4" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem;">
      <div class="flex items-center justify-between mb-3 pb-2 border-b">
        <div class="flex items-center gap-2">
          <i data-lucide="info" style="color: var(--primary-color); width: 18px; height: 18px;"></i>
          <span class="font-bold text-sm">ملخص حالة الحصة والمرتب</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 text-xs mb-2">
        <div>
          <span class="text-muted block mb-1">حالة الحصة:</span>
          <span class="badge badge-info">${sessionStatusText}</span>
        </div>
        <div>
          <span class="text-muted block mb-1">التقرير الأكاديمي:</span>
          <span class="badge ${hasReport ? 'badge-success' : 'badge-secondary'}">${hasReport ? 'موجود' : 'غير موجود'}</span>
        </div>
        <div class="col-span-2">
          <span class="text-muted block mb-1">احتساب المرتب:</span>
          <span class="badge ${ruleStatus.badgeClass}">${ruleStatus.statusLabel}</span>
        </div>
        <div class="col-span-2 text-muted">
          <span>آخر تعديل:</span> ${session.lastModifiedBy || session.updatedBy || 'لا يوجد'} (${formatTimestamp(session.updatedAt || session.lastModifiedAt)})
        </div>
      </div>

      ${ruleStatus.hasMismatch ? `
        <div class="p-3 border border-danger rounded bg-danger-subtle text-xs mt-3 flex justify-between items-center" style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3);">
          <div>
            <strong class="text-danger">⚠️ توجد مشكلة في الاحتساب:</strong>
            <p class="margin-0 text-muted mt-0.5">${ruleStatus.statusLabel}</p>
          </div>
          <button class="btn btn-warning btn-xs" id="btnQuickRecalculate">
            <i data-lucide="calculator" style="width: 12px; height: 12px;"></i> Recalculate
          </button>
        </div>
      ` : ''}
    </div>

    <!-- MAIN LESSON DETAILS -->
    <div class="drawer-card mb-4">
      <h4 class="drawer-section-title">
        <i data-lucide="file-text"></i> بيانات الحصة الأساسية (Lesson Details)
      </h4>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">اسم الطالب:</span>
          <span class="detail-val font-bold text-primary">${session.studentName || '-'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">اسم المعلم:</span>
          <span class="detail-val font-semibold">${session.teacherName || '-'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">تاريخ الحصة:</span>
          <span class="detail-val font-mono">${session.date || '-'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">الوقت والمدة:</span>
          <span class="detail-val font-mono">${session.startTime || session.time || '-'} (${session.duration || 60} دقيقة)</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">قيمة الحصة:</span>
          <span class="detail-val font-bold text-success">${session.price || session.sessionPrice || 0} ج.م</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">تاريخ وقت التسجيل:</span>
          <span class="detail-val font-mono text-xs">${formatTimestamp(session.createdAt || session.timestamp)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">حالة الحصة من المرتب:</span>
          <span class="detail-val">
            <span class="badge ${ruleStatus.badgeClass}">${ruleStatus.statusLabel}</span>
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">التقرير الأكاديمي:</span>
          <span class="detail-val">
            <span class="badge ${hasReport ? 'badge-success' : 'badge-secondary'}">${hasReport ? 'موجود' : 'غير موجود'}</span>
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">من سجل الحصة:</span>
          <span class="detail-val">${session.createdBy || session.recordedBy || session.teacherName || 'المعلم'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">آخر تعديل بواسطة:</span>
          <span class="detail-val">${session.lastModifiedBy || session.updatedBy || 'لا يوجد'}</span>
        </div>
      </div>
    </div>

    <!-- REPORT DETAILS -->
    <div class="drawer-card mb-4">
      <h4 class="drawer-section-title">
        <i data-lucide="book-open"></i> التقرير الأكاديمي والدرجات (Lesson Report)
      </h4>
      ${hasReport ? `
        <div class="report-box p-3 border rounded">
          <div class="grid grid-cols-2 gap-2 text-xs mb-2">
            <div><strong>السورة / المفهوم:</strong> ${session.report.surah || '-'}</div>
            <div><strong>الآيات:</strong> ${session.report.verses || '-'}</div>
            <div><strong>تقييم الحفظ:</strong> <span class="badge badge-info">${session.report.memorizationGrade || session.report.grade || '-'}</span></div>
            <div><strong>تقييم المراجعة:</strong> <span class="badge badge-info">${session.report.revisionGrade || '-'}</span></div>
          </div>
          <div class="text-xs text-muted"><strong>ملاحظات المعلم:</strong> ${session.report.notes || session.report.teacherNotes || 'لا توجد ملاحظات مدونة'}</div>
        </div>
      ` : `
        <p class="text-xs text-muted">التقرير غير موجود لهذه الحصة (اختياري).</p>
      `}
    </div>

    <!-- CONNECTED FINANCIAL MOVEMENT -->
    <div class="drawer-card mb-4">
      <h4 class="drawer-section-title">
        <i data-lucide="wallet"></i> الحركة المالية الناتجة (Financial Impact)
      </h4>
      ${linkedFinancial ? `
        <div class="p-2 border rounded text-xs flex justify-between items-center bg-card">
          <div>
            <div class="font-bold">${linkedFinancial.type === 'session_earnings' ? 'مستحقات حصة' : linkedFinancial.type}</div>
            <div class="text-muted">${linkedFinancial.description || '-'}</div>
          </div>
          <div class="text-left font-mono">
            <div class="text-success font-bold">+${linkedFinancial.amount || 0} ج.م</div>
            <div class="text-muted">الرصيد بعد: ${linkedFinancial.balanceAfter || 0} ج.م</div>
          </div>
        </div>
      ` : `
        <p class="text-xs text-muted">لا توجد حركة مالية مباشرة مسجلة لهذه الحصة في الأرشيف الفوري.</p>
      `}
    </div>

    <!-- LOGS & MODIFICATION HISTORY -->
    <div class="drawer-card mb-4">
      <h4 class="drawer-section-title">
        <i data-lucide="history"></i> سجل التعديلات والحركات الخاصة بالحصة (Logs)
      </h4>
      ${linkedLogs.length > 0 ? `
        <div class="space-y-2">
          ${linkedLogs.map(l => `
            <div class="p-2 border-b text-xs flex justify-between">
              <div>
                <span class="font-bold">${l.userName || l.teacherName || 'المستخدم'}:</span>
                <span>${l.actionTitle || l.action || l.description || 'تعديل'}</span>
              </div>
              <span class="font-mono text-muted">${formatTimestamp(l.timestamp || l.createdAtIso)}</span>
            </div>
          `).join('')}
        </div>
      ` : `
        <p class="text-xs text-muted">لا توجد سجلات تعديل سابقة مدونة لهذه الحصة.</p>
      `}
    </div>

    <!-- ACTION BUTTONS TOOLBAR -->
    <div class="drawer-actions-toolbar">
      <button class="btn btn-primary btn-sm flex-1" id="btnEditSession">
        <i data-lucide="edit-3"></i> تعديل الحصة (Edit)
      </button>
      <button class="btn btn-warning btn-sm flex-1" id="btnRecalculateSalary">
        <i data-lucide="calculator"></i> إعاده احتساب المرتب
      </button>
      <button class="btn btn-secondary btn-sm" id="btnViewRelatedData">
        <i data-lucide="network"></i> Related Data (البيانات المرتبطة)
      </button>
      <button class="btn btn-danger btn-sm" id="btnDeleteSession">
        <i data-lucide="trash-2"></i> حذف
      </button>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Attach action listeners
  document.getElementById('btnEditSession')?.addEventListener('click', () => openEditSessionModal(session));
  document.getElementById('btnRecalculateSalary')?.addEventListener('click', () => recalculateSessionSalary(session));
  document.getElementById('btnQuickRecalculate')?.addEventListener('click', () => recalculateSessionSalary(session));
  document.getElementById('btnViewRelatedData')?.addEventListener('click', () => openRelatedDataDrawer(session, 'session'));
  document.getElementById('btnDeleteSession')?.addEventListener('click', () => deleteSessionRecord(session));

  drawer.classList.add('open');
  if (overlay) overlay.classList.add('active');
}


/**
 * Edit Session Modal & Action
 */
function openEditSessionModal(session) {
  const modal = document.getElementById('editSessionModal');
  if (!modal) return;

  document.getElementById('editSessionId').value = session.id;
  document.getElementById('editSessionDate').value = session.date || '';
  document.getElementById('editSessionStartTime').value = session.startTime || session.time || '';
  document.getElementById('editSessionDuration').value = session.duration || 60;
  document.getElementById('editSessionPrice').value = session.price || session.sessionPrice || 0;
  document.getElementById('editSessionSurah').value = session.report?.surah || '';
  document.getElementById('editSessionNotes').value = session.report?.notes || '';
  document.getElementById('editSessionCalculated').checked = !!(session.calculatedInSalary || session.calculated);

  modal.classList.add('active');
}

export async function handleSaveSessionEdit(e) {
  e.preventDefault();
  const id = document.getElementById('editSessionId').value;
  if (!id) return;

  const user = auth.currentUser;
  const adminName = user?.displayName || user?.email || 'المشرف المسؤول';

  const date = document.getElementById('editSessionDate').value;
  const startTime = document.getElementById('editSessionStartTime').value;
  const duration = parseInt(document.getElementById('editSessionDuration').value, 10) || 60;
  const price = parseFloat(document.getElementById('editSessionPrice').value) || 0;
  const surah = document.getElementById('editSessionSurah').value.trim();
  const notes = document.getElementById('editSessionNotes').value.trim();
  const calculated = document.getElementById('editSessionCalculated').checked;

  try {
    const sessionRef = doc(db, "sessions", id);
    const oldSnap = await getDoc(sessionRef);
    const oldData = oldSnap.data() || {};

    const updatedData = {
      date: date,
      startTime: startTime,
      duration: duration,
      price: price,
      calculatedInSalary: calculated,
      calculated: calculated,
      'report.surah': surah,
      'report.notes': notes,
      lastModifiedBy: adminName,
      updatedBy: adminName,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(sessionRef, updatedData);

    // Write Audit Log
    await logAuditLog({
      actionType: 'EDIT_SESSION',
      targetCollection: 'sessions',
      targetId: id,
      oldValue: oldData,
      newValue: updatedData,
      adminName: adminName,
      adminId: user?.uid,
      reason: 'تعديل بيانات الحصة عبر مركز التحقيق'
    });

    Toast.success("تم تعديل بيانات الحصة بنجاح في قاعدة البيانات.");
    document.getElementById('editSessionModal').classList.remove('active');

    // Reload cache & refresh drawer
    await loadAllSystemData();
    renderActiveTab();
    openSessionDetailDrawer(id);
  } catch (err) {
    console.error("Error saving session edit:", err);
    Toast.error("فشل تعديل بيانات الحصة.");
  }
}

/**
 * Recalculate Session Salary
 */
async function recalculateSessionSalary(session) {
  showCustomConfirm(`هل أنت متأكد من إعادة احتساب المرتب للحصة الخاصة بـ (${session.studentName}) وتضمين مبلغ (${session.price || 0} ج.م) لحساب المعلم؟`, async () => {
    try {
      const user = auth.currentUser;
      const adminName = user?.displayName || user?.email || 'المشرف الإداري';

      const sessionRef = doc(db, "sessions", session.id);
      await updateDoc(sessionRef, {
        calculatedInSalary: true,
        calculated: true,
        lastModifiedBy: adminName,
        updatedAt: new Date().toISOString()
      });

      // Add financial ledger transaction for teacher
      if (session.teacherId) {
        const teacherRef = doc(db, "users", session.teacherId);
        const teacherSnap = await getDoc(teacherRef);
        const currentBalance = teacherSnap.exists() ? (teacherSnap.data().currentMonthEarnings || 0) : 0;
        const addAmount = session.price || session.sessionPrice || 0;
        const newBalance = currentBalance + addAmount;

        if (teacherSnap.exists()) {
          await updateDoc(teacherRef, {
            currentMonthEarnings: newBalance
          });
        }

        await addDoc(collection(db, "teacher_salary_transactions"), {
          teacherId: session.teacherId,
          teacherName: session.teacherName || 'معلم',
          studentId: session.studentId,
          studentName: session.studentName,
          sessionId: session.id,
          type: 'session_earnings',
          amount: addAmount,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          description: `إعادة احتساب مستحقات الحصة مع الطالب (${session.studentName}) بتاريخ (${session.date})`,
          createdBy: adminName,
          createdAt: serverTimestamp(),
          createdAtIso: new Date().toISOString()
        });
      }

      Toast.success("تمت إعادة احتساب الحصة وإيداع مستحقاتها في حساب المعلم بنجاح! 💰");
      await loadAllSystemData();
      renderActiveTab();
      openSessionDetailDrawer(session.id);
    } catch (err) {
      console.error("Recalculate error:", err);
      Toast.error("حدث خطأ أثناء إعادة احتساب المرتب.");
    }
  });
}

/**
 * Delete Session
 */
async function deleteSessionRecord(session) {
  showCustomConfirm(`تحذير عاجل: هل أنت متأكد من حذف هذه الحصة نهائياً؟ ستستعيد أي أرصدة مالية وتؤرشف العملية.`, async () => {
    try {
      const user = auth.currentUser;
      await deleteDoc(doc(db, "sessions", session.id));

      await logAuditLog({
        actionType: 'DELETE_SESSION',
        targetCollection: 'sessions',
        targetId: session.id,
        oldValue: session,
        newValue: null,
        adminName: user?.displayName || 'الأدمن',
        adminId: user?.uid,
        reason: 'حذف حاسم عبر مركز التحقيق'
      });

      Toast.success("تم حذف الحصة بنجاح.");
      closeAllDrawers();
      await loadAllSystemData();
      renderActiveTab();
    } catch (err) {
      console.error("Delete session error:", err);
      Toast.error("فشل حذف الحصة.");
    }
  });
}

/* ==========================================================================
   2️⃣ FINANCIAL RECORDS TAB (الحركات المالية)
   ========================================================================== */

function renderFinancialTab() {
  const container = document.getElementById('pane-financial');
  if (!container) return;

  const searchInput = document.getElementById('finSearchInput')?.value.trim().toLowerCase() || '';
  const filterType = document.getElementById('finFilterType')?.value || 'all';

  let filtered = [...financialCache];

  if (searchInput) {
    filtered = filtered.filter(f => 
      (f.teacherName && f.teacherName.toLowerCase().includes(searchInput)) ||
      (f.description && f.description.toLowerCase().includes(searchInput)) ||
      (f.createdBy && f.createdBy.toLowerCase().includes(searchInput))
    );
  }

  if (filterType !== 'all') {
    filtered = filtered.filter(f => f.type === filterType);
  }

  const tableBody = document.getElementById('financialTableBody');
  if (!tableBody) return;

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-5 text-muted">
          <i data-lucide="receipt" style="width: 32px; height: 32px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
          <p>لا توجد حركات مالية مطابقة للبحث.</p>
        </td>
      </tr>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  tableBody.innerHTML = filtered.map(f => {
    const typeMap = {
      'session_earnings': { label: 'حصة دراسية', class: 'badge-success' },
      'bonus': { label: 'مكافأة 🎁', class: 'badge-info' },
      'deduction': { label: 'خصم ⚠️', class: 'badge-danger' },
      'manual_adjustment': { label: 'تعديل يدوي ⚙️', class: 'badge-warning' },
      'payout': { label: 'صرف راتب 🏦', class: 'badge-secondary' }
    };

    const typeObj = typeMap[f.type] || { label: f.type || 'حركة مالية', class: 'badge-secondary' };
    const dateFormatted = formatTimestamp(f.createdAt || f.createdAtIso);

    return `
      <tr class="inv-table-row" data-id="${f.id}">
        <td>
          <div class="font-bold text-primary">${f.teacherName || 'معلم غير محدد'}</div>
        </td>
        <td>
          <span class="badge ${typeObj.class}">${typeObj.label}</span>
        </td>
        <td>
          <div class="font-bold font-mono text-success">${f.amount > 0 ? '+' : ''}${f.amount || 0} ج.م</div>
        </td>
        <td>
          <div class="font-mono text-xs text-muted">${f.balanceBefore || 0} ج.م</div>
        </td>
        <td>
          <div class="font-mono text-xs font-semibold">${f.balanceAfter || 0} ج.م</div>
        </td>
        <td>
          <div class="text-xs max-w-xs truncate" title="${f.description || ''}">${f.description || '-'}</div>
        </td>
        <td>
          <div class="text-xs font-mono">${dateFormatted}</div>
        </td>
        <td>
          <div class="text-xs">${f.createdBy || 'النظام'}</div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();

  // Attach click listener for financial item
  tableBody.querySelectorAll('tr.inv-table-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.id;
      if (id) openFinancialDetailDrawer(id);
    });
  });
}

function openFinancialDetailDrawer(finId) {
  const item = financialCache.find(f => f.id === finId);
  if (!item) return;

  const drawer = document.getElementById('investigationSideDrawer');
  const drawerContent = document.getElementById('drawerBodyContent');
  const drawerTitle = document.getElementById('drawerTitleText');
  const overlay = document.getElementById('investigationDrawerOverlay');

  if (!drawer || !drawerContent) return;

  drawerTitle.textContent = `الحركة المالية: ${item.teacherName || ''} (${item.amount || 0} ج.م)`;

  const linkedSession = sessionsCache.find(s => s.id === item.sessionId);

  drawerContent.innerHTML = `
    <div class="drawer-card mb-4">
      <h4 class="drawer-section-title"><i data-lucide="wallet"></i> تفاصيل الحركة المالية</h4>
      <div class="detail-grid">
        <div class="detail-item"><span class="detail-label">المعلم:</span> <span class="detail-val font-bold">${item.teacherName || '-'}</span></div>
        <div class="detail-item"><span class="detail-label">القيمة:</span> <span class="detail-val font-bold text-success">${item.amount || 0} ج.م</span></div>
        <div class="detail-item"><span class="detail-label">نوع الحركة:</span> <span class="detail-val">${item.type || '-'}</span></div>
        <div class="detail-item"><span class="detail-label">الرصيد قبل:</span> <span class="detail-val font-mono">${item.balanceBefore || 0} ج.م</span></div>
        <div class="detail-item"><span class="detail-label">الرصيد بعد:</span> <span class="detail-val font-mono font-bold">${item.balanceAfter || 0} ج.م</span></div>
        <div class="detail-item"><span class="detail-label">تاريخ الحركة:</span> <span class="detail-val font-mono text-xs">${formatTimestamp(item.createdAt || item.createdAtIso)}</span></div>
        <div class="detail-item"><span class="detail-label">من قام بالعملية:</span> <span class="detail-val">${item.createdBy || 'النظام'}</span></div>
      </div>
      <div class="mt-3 p-2 border rounded bg-card text-xs">
        <strong>سبب الحركة والأصل:</strong>
        <p class="mt-1 text-muted">${item.description || 'لا يوجد سبب مفصل مدون'}</p>
      </div>
    </div>

    ${linkedSession ? `
      <div class="drawer-card mb-4">
        <h4 class="drawer-section-title"><i data-lucide="link"></i> الحصة المصدرية المرتبطة</h4>
        <div class="p-2 border rounded text-xs flex justify-between items-center">
          <div>
            <div class="font-bold text-primary">${linkedSession.studentName}</div>
            <div class="text-muted">${linkedSession.date} (${linkedSession.startTime || ''})</div>
          </div>
          <button class="btn btn-xs btn-secondary btn-inspect-linked-session" data-id="${linkedSession.id}">
            فحص الحصة 👁️
          </button>
        </div>
      </div>
    ` : ''}

    <div class="drawer-actions-toolbar">
      <button class="btn btn-secondary btn-sm flex-1" id="btnViewRelatedDataFin">
        <i data-lucide="network"></i> Related Data (البيانات المرتبطة)
      </button>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  document.querySelector('.btn-inspect-linked-session')?.addEventListener('click', (e) => {
    const sId = e.currentTarget.dataset.id;
    if (sId) openSessionDetailDrawer(sId);
  });

  document.getElementById('btnViewRelatedDataFin')?.addEventListener('click', () => {
    openRelatedDataDrawer(item, 'financial');
  });

  drawer.classList.add('open');
  if (overlay) overlay.classList.add('active');
}

/* ==========================================================================
   3️⃣ ACTIVITY TAB (النشاط والسجل - The Black Box)
   ========================================================================== */

function renderActivityTab() {
  const container = document.getElementById('pane-activity');
  if (!container) return;

  const searchInput = document.getElementById('actSearchInput')?.value.trim().toLowerCase() || '';
  const filterCat = document.getElementById('actFilterCategory')?.value || 'all';

  let filtered = [...activityCache];

  if (searchInput) {
    filtered = filtered.filter(a => 
      (a.userName && a.userName.toLowerCase().includes(searchInput)) ||
      (a.teacherName && a.teacherName.toLowerCase().includes(searchInput)) ||
      (a.actionTitle && a.actionTitle.toLowerCase().includes(searchInput)) ||
      (a.action && a.action.toLowerCase().includes(searchInput)) ||
      (a.actionType && a.actionType.toLowerCase().includes(searchInput))
    );
  }

  if (filterCat !== 'all') {
    filtered = filtered.filter(a => a.actionCategory === filterCat || a.actionType === filterCat || a.action === filterCat);
  }

  const tableBody = document.getElementById('activityTableBody');
  if (!tableBody) return;

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5 text-muted">
          <i data-lucide="history" style="width: 32px; height: 32px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
          <p>لا توجد سجلات نشاط مطابقة للبحث.</p>
        </td>
      </tr>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  tableBody.innerHTML = filtered.map(a => {
    const timeFormatted = formatTimestamp(a.timestamp || a.createdAtIso);
    const user = a.userName || a.teacherName || a.userId || 'مستخدم';
    const actionText = a.actionTitle || a.actionType || a.action || 'عملية في النظام';
    const entity = a.targetCollection || a.actionCategory || a.details?.entityName || 'نظام';

    return `
      <tr class="inv-table-row" data-id="${a.id}">
        <td>
          <div class="text-xs font-mono">${timeFormatted}</div>
        </td>
        <td>
          <div class="font-bold text-primary">${user}</div>
        </td>
        <td>
          <span class="badge badge-info">${a.source === 'audit' ? 'تعديل تدقيقي' : 'نشاط مستخدم'}</span>
        </td>
        <td>
          <div class="font-semibold text-xs">${actionText}</div>
        </td>
        <td>
          <div class="text-xs text-muted">${entity}</div>
        </td>
        <td class="text-left">
          <button class="btn btn-xs btn-secondary view-act-btn" data-id="${a.id}">
            التفاصيل
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();

  tableBody.querySelectorAll('tr.inv-table-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.id;
      if (id) openActivityDetailDrawer(id);
    });
  });
}

function openActivityDetailDrawer(actId) {
  const item = activityCache.find(a => a.id === actId);
  if (!item) return;

  const drawer = document.getElementById('investigationSideDrawer');
  const drawerContent = document.getElementById('drawerBodyContent');
  const drawerTitle = document.getElementById('drawerTitleText');
  const overlay = document.getElementById('investigationDrawerOverlay');

  if (!drawer || !drawerContent) return;

  drawerTitle.textContent = `تفاصيل السجل: ${item.actionTitle || item.actionType || 'عملية'}`;

  const oldValJson = item.oldValue ? safeStringify(item.oldValue, 2) : null;
  const newValJson = item.newValue ? safeStringify(item.newValue, 2) : null;

  drawerContent.innerHTML = `
    <div class="drawer-card mb-4">
      <h4 class="drawer-section-title"><i data-lucide="shield"></i> بيانات السجل والعملية (Black Box Log)</h4>
      <div class="detail-grid">
        <div class="detail-item"><span class="detail-label">المستخدم:</span> <span class="detail-val font-bold">${item.userName || item.teacherName || '-'}</span></div>
        <div class="detail-item"><span class="detail-label">نوع العملية:</span> <span class="detail-val font-mono">${item.actionType || item.actionCategory || '-'}</span></div>
        <div class="detail-item"><span class="detail-label">الوقت والتاريخ:</span> <span class="detail-val font-mono text-xs">${formatTimestamp(item.timestamp || item.createdAtIso)}</span></div>
        <div class="detail-item"><span class="detail-label">الكيان المستهدف:</span> <span class="detail-val">${item.targetCollection || item.targetId || '-'}</span></div>
      </div>
      <div class="mt-3 p-2 border rounded text-xs bg-card">
        <strong>وصف الحركة:</strong>
        <p class="mt-1">${item.actionTitle || item.reason || 'لا يوجد وصف مخصص'}</p>
      </div>
    </div>

    ${oldValJson || newValJson ? `
      <div class="drawer-card mb-4">
        <h4 class="drawer-section-title"><i data-lucide="git-compare"></i> مقارنة البيانات قبل وبعد التعديل (Diff View)</h4>
        <div class="grid grid-cols-2 gap-2 text-xs font-mono">
          <div class="p-2 border rounded bg-danger-subtle">
            <div class="font-bold text-danger mb-1">البيانات السابقة (Before):</div>
            <pre style="white-space: pre-wrap; font-size: 0.7rem;">${oldValJson || 'لا تتوفر بيانات سابقة'}</pre>
          </div>
          <div class="p-2 border rounded bg-success-subtle">
            <div class="font-bold text-success mb-1">البيانات الجديدة (After):</div>
            <pre style="white-space: pre-wrap; font-size: 0.7rem;">${newValJson || 'لا تتوفر بيانات جديدة'}</pre>
          </div>
        </div>
      </div>
    ` : ''}

    <div class="drawer-actions-toolbar">
      <button class="btn btn-secondary btn-sm flex-1" id="btnViewRelatedDataAct">
        <i data-lucide="network"></i> Related Data (البيانات المرتبطة)
      </button>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  document.getElementById('btnViewRelatedDataAct')?.addEventListener('click', () => {
    openRelatedDataDrawer(item, 'activity');
  });

  drawer.classList.add('open');
  if (overlay) overlay.classList.add('active');
}

/* ==========================================================================
   4️⃣ EXPLORER TAB (المستكشف الشامل للبيانات)
   ========================================================================== */

function setupGlobalSearch() {
  const searchInput = document.getElementById('explorerSearchInput');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    renderExplorerResults(val);
  });
}

function renderExplorerTab() {
  const searchVal = document.getElementById('explorerSearchInput')?.value.trim().toLowerCase() || '';
  renderExplorerResults(searchVal);
}

function renderExplorerResults(queryStr) {
  const container = document.getElementById('explorerResultsContainer');
  if (!container) return;

  if (!queryStr) {
    container.innerHTML = `
      <div class="text-center py-10 text-muted">
        <i data-lucide="search" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.4;"></i>
        <h3 class="font-bold text-lg mb-1">المستكشف الشامل للبيانات (Comprehensive Explorer)</h3>
        <p class="text-xs">اكتب اسم طالب، اسم معلم، ولي أمر، رقم حصة، أو رقم معاملة لرؤية شجرة البيانات الموحدة الكاملة.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // Search Students & Teachers
  const matchedStudents = studentsCache.filter(st => 
    (st.name && st.name.toLowerCase().includes(queryStr)) ||
    (st.parentPhone && st.parentPhone.includes(queryStr)) ||
    (st.id && st.id.toLowerCase().includes(queryStr))
  );

  const matchedTeachers = teachersCache.filter(t => 
    (t.name && t.name.toLowerCase().includes(queryStr)) ||
    (t.email && t.email.toLowerCase().includes(queryStr)) ||
    (t.id && t.id.toLowerCase().includes(queryStr))
  );

  if (matchedStudents.length === 0 && matchedTeachers.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-muted">
        <i data-lucide="alert-circle" style="width: 36px; height: 36px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
        <p>لم يتم العثور على أي نتائج مطابقة لـ "${queryStr}".</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  let html = '';

  // 1. Matched Students Dashboard
  matchedStudents.forEach(student => {
    const stSessions = sessionsCache.filter(s => s.studentId === student.id || s.studentName === student.name);
    const stFin = financialCache.filter(f => f.studentId === student.id || f.description?.includes(student.name));
    const stLogs = activityCache.filter(a => a.targetId === student.id || a.details?.studentName === student.name || a.actionTitle?.includes(student.name));

    html += `
      <div class="drawer-card mb-6 p-4 border rounded shadow-sm bg-card">
        <div class="flex justify-between items-center border-b pb-3 mb-3">
          <div>
            <span class="badge badge-info mb-1">ملف طالب 🎓</span>
            <h3 class="font-bold text-xl text-primary">${student.name}</h3>
            <div class="text-xs text-muted">الهاتف: ${student.parentPhone || student.phone || 'غير مدون'} | المعلم: ${student.teacherName || '-'}</div>
          </div>
          <div class="text-left">
            <span class="badge ${student.status === 'active' || student.status === 'مستمر' ? 'badge-success' : 'badge-warning'}">
              ${student.status || 'نشط'}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
          <div class="p-3 border rounded bg-card">
            <div class="font-bold mb-2 text-primary">📚 سجل الحصص (${stSessions.length})</div>
            ${stSessions.slice(0, 5).map(s => `
              <div class="py-1 border-b flex justify-between cursor-pointer hover:bg-hover" onclick="window.openSessionDetail('${s.id}')">
                <span>${s.date}</span>
                <span class="font-bold">${s.price || 0} ج.م</span>
              </div>
            `).join('') || '<div class="text-muted">لا توجد حصص مسجلة</div>'}
          </div>

          <div class="p-3 border rounded bg-card">
            <div class="font-bold mb-2 text-success">💳 المعاملات المترتبة (${stFin.length})</div>
            ${stFin.slice(0, 5).map(f => `
              <div class="py-1 border-b flex justify-between">
                <span>${f.type || 'حركة'}</span>
                <span class="font-bold text-success">+${f.amount || 0} ج.م</span>
              </div>
            `).join('') || '<div class="text-muted">لا توجد حركات مالية</div>'}
          </div>

          <div class="p-3 border rounded bg-card">
            <div class="font-bold mb-2 text-info">📋 الأنشطة والتعديلات (${stLogs.length})</div>
            ${stLogs.slice(0, 5).map(l => `
              <div class="py-1 border-b text-xs truncate">
                ${l.actionTitle || l.action || 'تعديل'}
              </div>
            `).join('') || '<div class="text-muted">لا توجد سجلات نشاط</div>'}
          </div>
        </div>
      </div>
    `;
  });

  // 2. Matched Teachers Dashboard
  matchedTeachers.forEach(teacher => {
    const tSessions = sessionsCache.filter(s => s.teacherId === teacher.id || s.teacherName === teacher.name);
    const tFin = financialCache.filter(f => f.teacherId === teacher.id);
    const tStudents = studentsCache.filter(st => st.teacherId === teacher.id);
    const tLogs = activityCache.filter(a => a.teacherId === teacher.id || a.userId === teacher.id);

    html += `
      <div class="drawer-card mb-6 p-4 border rounded shadow-sm bg-card">
        <div class="flex justify-between items-center border-b pb-3 mb-3">
          <div>
            <span class="badge badge-primary mb-1">ملف معلم 👨‍🏫</span>
            <h3 class="font-bold text-xl text-primary">${teacher.name}</h3>
            <div class="text-xs text-muted">البريد: ${teacher.email || '-'} | الرصيد الحالي: ${teacher.currentMonthEarnings || 0} ج.م</div>
          </div>
          <div class="text-left">
            <span class="badge badge-success">معلم معتمد</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
          <div class="p-3 border rounded bg-card">
            <div class="font-bold mb-2 text-primary">👨‍🎓 الطلاب التابعون (${tStudents.length})</div>
            ${tStudents.slice(0, 5).map(st => `
              <div class="py-1 border-b flex justify-between">
                <span>${st.name}</span>
                <span class="text-muted">${st.status || 'مستمر'}</span>
              </div>
            `).join('') || '<div class="text-muted">لا يوجد طلاب مسجلون</div>'}
          </div>

          <div class="p-3 border rounded bg-card">
            <div class="font-bold mb-2 text-success">💰 الحركات المالية (${tFin.length})</div>
            ${tFin.slice(0, 5).map(f => `
              <div class="py-1 border-b flex justify-between">
                <span>${f.type}</span>
                <span class="font-bold text-success">+${f.amount} ج.م</span>
              </div>
            `).join('') || '<div class="text-muted">لا توجد معاملات</div>'}
          </div>

          <div class="p-3 border rounded bg-card">
            <div class="font-bold mb-2 text-info">📚 إجمالي الحصص (${tSessions.length})</div>
            ${tSessions.slice(0, 5).map(s => `
              <div class="py-1 border-b flex justify-between cursor-pointer hover:bg-hover" onclick="window.openSessionDetail('${s.id}')">
                <span>${s.studentName} (${s.date})</span>
                <span class="font-bold">${s.price || 0} ج.م</span>
              </div>
            `).join('') || '<div class="text-muted">لا توجد حصص</div>'}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

// Global window helper for drawer inline clicks
window.openSessionDetail = (id) => {
  openSessionDetailDrawer(id);
};

/* ==========================================================================
   5️⃣ RELATED DATA MODAL (البيانات المرتبطة)
   ========================================================================== */

export function openRelatedDataDrawer(item, type) {
  const drawer = document.getElementById('relatedDataDrawer');
  const content = document.getElementById('relatedDataBodyContent');
  const overlay = document.getElementById('investigationDrawerOverlay');

  if (!drawer || !content) return;

  let student = null;
  let teacher = null;
  let session = null;
  let finLogs = [];
  let actLogs = [];

  if (type === 'session') {
    session = item;
    student = studentsCache.find(st => st.id === item.studentId || st.name === item.studentName);
    teacher = teachersCache.find(t => t.id === item.teacherId || t.name === item.teacherName);
    finLogs = financialCache.filter(f => f.sessionId === item.id || (f.teacherId === item.teacherId && f.description?.includes(item.studentName)));
    actLogs = activityCache.filter(a => a.targetId === item.id || a.details?.sessionId === item.id || (a.details?.studentName === item.studentName && a.details?.date === item.date));
  } else if (type === 'financial') {
    teacher = teachersCache.find(t => t.id === item.teacherId || t.name === item.teacherName);
    student = studentsCache.find(st => st.id === item.studentId || st.name === item.studentName);
    session = sessionsCache.find(s => s.id === item.sessionId);
    finLogs = financialCache.filter(f => f.teacherId === item.teacherId);
    actLogs = activityCache.filter(a => a.targetId === item.id || a.details?.teacherId === item.teacherId);
  } else if (type === 'activity') {
    student = studentsCache.find(st => st.id === item.targetId || st.name === item.details?.studentName);
    teacher = teachersCache.find(t => t.id === item.teacherId || t.id === item.userId || t.name === item.userName);
    session = sessionsCache.find(s => s.id === item.targetId || s.id === item.details?.sessionId);
    finLogs = financialCache.filter(f => f.teacherId === item.teacherId);
    actLogs = activityCache.filter(a => a.targetId === item.targetId);
  }

  content.innerHTML = `
    <div class="mb-4">
      <h3 class="font-bold text-lg mb-1 flex items-center gap-2 text-primary">
        <i data-lucide="network"></i> شجرة البيانات المرتبطة بالعنصر (Connected Entities)
      </h3>
      <p class="text-xs text-muted">عرض جميع الكيانات، التقرير، حركة الراتب، وسجل النشاط المرتبطين بنفس العملية دون مغادرة الصفحة.</p>
    </div>

    <!-- STUDENT CARD -->
    <div class="drawer-card mb-3 p-3 border rounded">
      <div class="font-bold text-sm text-primary mb-1 flex items-center gap-1">
        🎓 الطالب المرتبط: ${student ? student.name : (session?.studentName || 'غير محدد')}
      </div>
      ${student ? `
        <div class="text-xs text-muted">رقم الهاتف: ${student.parentPhone || '-'} | الاشتراك: ${student.status || 'مستمر'}</div>
      ` : `<div class="text-xs text-muted">لا يتوفر ملف طالب مستقل مأرشف</div>`}
    </div>

    <!-- TEACHER CARD -->
    <div class="drawer-card mb-3 p-3 border rounded">
      <div class="font-bold text-sm text-primary mb-1 flex items-center gap-1">
        👨‍🏫 المعلم المرتبط: ${teacher ? teacher.name : (session?.teacherName || 'غير محدد')}
      </div>
      ${teacher ? `
        <div class="text-xs text-muted">البريد: ${teacher.email || '-'} | الرصيد الحالي: ${teacher.currentMonthEarnings || 0} ج.م</div>
      ` : `<div class="text-xs text-muted">لا يتوفر ملف معلم مستقل</div>`}
    </div>

    <!-- SESSION / REPORT CARD -->
    ${session ? `
      <div class="drawer-card mb-3 p-3 border rounded bg-card">
        <div class="font-bold text-sm mb-1">📖 الحصة والتقرير المرتبط:</div>
        <div class="text-xs">التاريخ: ${session.date} | الوقت: ${session.startTime || ''} (${session.duration || 60} دقيقة)</div>
        <div class="text-xs text-muted mt-1">السورة والتقييم: ${session.report?.surah || 'غير محدد'} (${session.report?.grade || 'لا يوجد درجات'})</div>
      </div>
    ` : ''}

    <!-- FINANCIAL LOGS -->
    <div class="drawer-card mb-3 p-3 border rounded">
      <div class="font-bold text-sm mb-2 text-success">💰 الحركات المالية المرتبطة (${finLogs.length}):</div>
      ${finLogs.map(f => `
        <div class="py-1 border-b text-xs flex justify-between">
          <span>${f.type} (${f.description || '-'})</span>
          <span class="font-bold text-success">+${f.amount} ج.م</span>
        </div>
      `).join('') || '<div class="text-xs text-muted">لا توجد حركات مالية مرتبطة</div>'}
    </div>

    <!-- ACTIVITY LOGS -->
    <div class="drawer-card mb-3 p-3 border rounded">
      <div class="font-bold text-sm mb-2 text-info">📋 سجل الأنشطة والتعديلات (${actLogs.length}):</div>
      ${actLogs.map(a => `
        <div class="py-1 border-b text-xs">
          <strong>${a.userName || 'المستخدم'}:</strong> ${a.actionTitle || a.action || 'تعديل'}
        </div>
      `).join('') || '<div class="text-xs text-muted">لا توجد تعديلات مأرشفة لهذا العنصر</div>'}
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  drawer.classList.add('open');
  if (overlay) overlay.classList.add('active');
}

/**
 * Utility helper to format timestamp
 */
function formatTimestamp(ts) {
  if (!ts) return '-';
  if (typeof ts === 'string') {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
    }
    return ts;
  }
  if (ts.toDate && typeof ts.toDate === 'function') {
    return ts.toDate().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
  }
  if (ts.seconds) {
    return new Date(ts.seconds * 1000).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
  }
  return '-';
}
