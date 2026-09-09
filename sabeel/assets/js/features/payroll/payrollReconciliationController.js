// Payroll Reconciliation Controller - Sabeel Academy

import { auth, db } from '../../config/firebase.js';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  fetchReconciliationRawData, 
  reconcileTeacherCurrentSalary, 
  reconcileArchiveRecord, 
  logReconciliationAudit, 
  batchApproveSessions,
  EXCLUSION_REASONS 
} from './payrollReconciliationEngine.js';
import { carryOverPostArchiveSessions } from '../teachers/teachersController.js';
import { showCustomConfirm } from '../../shared/utils/helpers.js';
import { Toast } from '../../shared/utils/toast.js';

let rawData = null;
let currentMonthReconciliations = [];
let archiveReconciliations = [];
let activeSelectedTeacherRecon = null;
let activeSelectedArchiveRecon = null;

let filterCurrentSearch = '';
let filterCurrentStatus = 'all';
let filterArchiveSearch = '';
let filterArchiveStatus = 'all';
let filterArchiveMonth = 'all';

let selectedMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"

export async function initPayrollReconciliation() {
  setupTabs();
  setupMonthSelector();
  setupSearchAndFilters();
  setupExportButtons();
  setupModalEvents();

  await loadAndRunReconciliation();
  listenToAuditLogs();
}

/**
 * Setup navigation between Current Reconciliation, Archive Reconciliation, and Audit Logs
 */
function setupTabs() {
  const tabButtons = document.querySelectorAll('.recon-nav-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTabId = btn.getAttribute('data-tab-target');
      document.querySelectorAll('.recon-tab-pane').forEach(pane => {
        pane.style.display = pane.id === targetTabId ? 'block' : 'none';
      });

      if (targetTabId === 'tab-archive-reconciliation') {
        renderArchiveReconciliationTable();
      } else if (targetTabId === 'tab-audit-logs') {
        // audit logs pane
      } else {
        renderCurrentReconciliationTable();
      }
    });
  });
}

function setupMonthSelector() {
  const monthInput = document.getElementById('reconMonthSelect');
  const prevMonthBtn = document.getElementById('btnPrevMonth');
  const nextMonthBtn = document.getElementById('btnNextMonth');
  const refreshBtn = document.getElementById('btnRefreshRecon');

  if (monthInput) {
    monthInput.value = selectedMonth;
    monthInput.addEventListener('change', async (e) => {
      selectedMonth = e.target.value;
      await loadAndRunReconciliation();
    });
  }

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', async () => {
      const d = new Date(selectedMonth + "-01");
      d.setMonth(d.getMonth() - 1);
      selectedMonth = d.toISOString().substring(0, 7);
      if (monthInput) monthInput.value = selectedMonth;
      await loadAndRunReconciliation();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', async () => {
      const d = new Date(selectedMonth + "-01");
      d.setMonth(d.getMonth() + 1);
      selectedMonth = d.toISOString().substring(0, 7);
      if (monthInput) monthInput.value = selectedMonth;
      await loadAndRunReconciliation();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> جاري الفحص...`;
      if (window.lucide) window.lucide.createIcons();
      await loadAndRunReconciliation();
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = `<i data-lucide="refresh-cw"></i> تحديث وفحص مباشر`;
      if (window.lucide) window.lucide.createIcons();
    });
  }
}

function setupSearchAndFilters() {
  const searchInput = document.getElementById('searchTeacherInput');
  const statusFilter = document.getElementById('filterIntegrityStatus');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterCurrentSearch = e.target.value.trim().toLowerCase();
      renderCurrentReconciliationTable();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      filterCurrentStatus = e.target.value;
      renderCurrentReconciliationTable();
    });
  }

  const archiveSearch = document.getElementById('searchArchiveTeacherInput');
  const archiveStatus = document.getElementById('filterArchiveStatus');
  const archiveMonthFilter = document.getElementById('filterArchiveMonthSelect');

  if (archiveSearch) {
    archiveSearch.addEventListener('input', (e) => {
      filterArchiveSearch = e.target.value.trim().toLowerCase();
      renderArchiveReconciliationTable();
    });
  }

  if (archiveStatus) {
    archiveStatus.addEventListener('change', (e) => {
      filterArchiveStatus = e.target.value;
      renderArchiveReconciliationTable();
    });
  }

  if (archiveMonthFilter) {
    archiveMonthFilter.addEventListener('change', (e) => {
      filterArchiveMonth = e.target.value;
      renderArchiveReconciliationTable();
    });
  }
}

/**
 * Loads raw data and recalculates both Current Month and Historical Archive
 */
export async function loadAndRunReconciliation() {
  const loadingOverlay = document.getElementById('reconLoadingState');
  if (loadingOverlay) loadingOverlay.style.display = 'flex';

  try {
    rawData = await fetchReconciliationRawData();
    const { teachers, sessions, groups, students, salaryArchive } = rawData;

    // 1. Process Current Month Reconciliations for each teacher
    currentMonthReconciliations = teachers.map(teacher => {
      return reconcileTeacherCurrentSalary(teacher, sessions, groups, students, selectedMonth);
    });

    // Populate Archive Month select dropdown with unique months
    populateArchiveMonthsDropdown(salaryArchive);

    // 2. Process Historical Archive Reconciliations
    archiveReconciliations = salaryArchive.map(archiveDoc => {
      const teacher = teachers.find(t => t.id === archiveDoc.teacherId || t.uid === archiveDoc.teacherId);
      return reconcileArchiveRecord(archiveDoc, sessions, teacher);
    });

    // 3. Render Views
    renderKPIHeaderCards();
    renderCurrentReconciliationTable();
    renderArchiveReconciliationTable();

  } catch (err) {
    console.error("Error running reconciliation:", err);
    Toast.danger("حدث خطأ أثناء تحميل بيانات المطابقة: " + err.message);
  } finally {
    if (loadingOverlay) loadingOverlay.style.display = 'none';
  }
}

function populateArchiveMonthsDropdown(salaryArchive) {
  const archiveMonthFilter = document.getElementById('filterArchiveMonthSelect');
  if (!archiveMonthFilter) return;

  const months = Array.from(new Set(salaryArchive.map(a => a.month).filter(Boolean))).sort().reverse();
  const currentVal = archiveMonthFilter.value;

  archiveMonthFilter.innerHTML = `<option value="all">جميع الشهور المؤرشفة (${months.length} دورة)</option>` +
    months.map(m => `<option value="${m}">شهر (${m})</option>`).join('');

  if (currentVal && months.includes(currentVal)) {
    archiveMonthFilter.value = currentVal;
  }
}

/**
 * Renders high-level KPI cards for current month
 */
function renderKPIHeaderCards() {
  const totalTeachers = currentMonthReconciliations.length;
  let balancedCount = 0;
  let acceptableCount = 0;
  let criticalCount = 0;
  let totalDiscrepancySum = 0;
  let totalRecordedSessions = 0;
  let totalBillableSessions = 0;

  currentMonthReconciliations.forEach(r => {
    if (r.integrityStatus === 'balanced') balancedCount++;
    else if (r.integrityStatus === 'acceptable_discrepancy') acceptableCount++;
    else if (r.integrityStatus === 'critical_discrepancy') criticalCount++;

    totalDiscrepancySum += Math.abs(r.discrepancyAmount);
    totalRecordedSessions += r.totalRecordedSessions;
    totalBillableSessions += r.includedSessionsCount;
  });

  const elTotal = document.getElementById('kpiTotalTeachers');
  const elBalanced = document.getElementById('kpiBalancedCount');
  const elAcceptable = document.getElementById('kpiAcceptableCount');
  const elCritical = document.getElementById('kpiCriticalCount');
  const elVolume = document.getElementById('kpiDiscrepancyVolume');
  const elSessionsSummary = document.getElementById('kpiSessionsSummary');

  if (elTotal) elTotal.textContent = totalTeachers;
  if (elBalanced) elBalanced.textContent = balancedCount;
  if (elAcceptable) elAcceptable.textContent = acceptableCount;
  if (elCritical) elCritical.textContent = criticalCount;
  if (elVolume) elVolume.textContent = totalDiscrepancySum.toLocaleString() + ' ج.م';
  if (elSessionsSummary) elSessionsSummary.textContent = `${totalBillableSessions} معتمدة من إجمالي ${totalRecordedSessions}`;

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Renders Tab 1: Current Month Payroll Reconciliation Table
 */
function renderCurrentReconciliationTable() {
  const tbody = document.getElementById('tblCurrentReconBody');
  if (!tbody) return;

  const filtered = currentMonthReconciliations.filter(r => {
    const matchesSearch = !filterCurrentSearch ||
      r.teacherName.toLowerCase().includes(filterCurrentSearch) ||
      r.teacherEmail.toLowerCase().includes(filterCurrentSearch);

    const matchesStatus = filterCurrentStatus === 'all' || r.integrityStatus === filterCurrentStatus;

    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          <i data-lucide="inbox" style="width: 32px; height: 32px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
          <div>لا توجد نتائج مطابقة لشروط البحث والتصفية المحددة.</div>
        </td>
      </tr>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  tbody.innerHTML = filtered.map((item, idx) => {
    const isBalanced = item.integrityStatus === 'balanced';
    const isAcceptable = item.integrityStatus === 'acceptable_discrepancy';
    const isCritical = item.integrityStatus === 'critical_discrepancy';

    let badgeIcon = isBalanced ? 'check-circle' : (isAcceptable ? 'info' : 'alert-octagon');
    let badgeBg = isBalanced ? 'rgba(34, 197, 94, 0.12)' : (isAcceptable ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)');
    let badgeColor = isBalanced ? '#15803d' : (isAcceptable ? '#b45309' : '#b91c1c');

    const sessionsRatio = item.totalRecordedSessions > 0 ? 
      Math.round((item.includedSessionsCount / item.totalRecordedSessions) * 100) : 100;

    const diffSign = item.discrepancyAmount > 0 ? '+' : '';
    const diffColor = item.discrepancyAmount === 0 ? 'var(--text-secondary)' : (item.discrepancyAmount > 0 ? '#16a34a' : '#dc2626');

    return `
      <tr class="recon-row" data-teacher-id="${item.teacherId}">
        <td>
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary-light); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem;">
              ${item.teacherName.charAt(0)}
            </div>
            <div>
              <div style="font-weight: 800; color: var(--text-primary); font-size: 0.92rem;">${item.teacherName}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${item.rateInd} فردي / ${item.rateGrp} جماعي ج.م</div>
            </div>
          </div>
        </td>

        <td>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.88rem;">
            <span style="color: var(--success); font-weight: 800;">${item.includedSessionsCount}</span> / <span>${item.totalRecordedSessions}</span> حصة
          </div>
          <div style="width: 100%; height: 5px; background: var(--bg-primary); border-radius: 4px; overflow: hidden; margin-top: 0.25rem;">
            <div style="width: ${sessionsRatio}%; height: 100%; background: ${sessionsRatio === 100 ? 'var(--success)' : 'var(--warning)'};"></div>
          </div>
          ${item.excludedSessionsCount > 0 ? `<div style="font-size: 0.72rem; color: var(--warning); font-weight: 700; margin-top: 0.15rem;">(${item.excludedSessionsCount} مستبعدة)</div>` : ''}
        </td>

        <td>
          <div style="font-weight: 700; font-size: 0.88rem;">${item.includedHours.toFixed(1)} س</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">إجمالي المسجل: ${item.totalRecordedHours.toFixed(1)} س</div>
        </td>

        <td>
          <div style="font-weight: 900; color: var(--primary-color); font-size: 0.95rem;">
            ${item.netCalculatedSalary.toLocaleString()} ج.م
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">
            (أساس: ${Math.round(item.rawCalculatedSalary)} ${item.bonuses > 0 ? `+${item.bonuses}` : ''} ${item.deductions > 0 ? `-${item.deductions}` : ''})
          </div>
        </td>

        <td>
          <div style="font-weight: 800; color: var(--text-primary); font-size: 0.92rem;">
            ${item.expectedSalary.toLocaleString()} ج.م
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            متوقع: ${item.expectedHours.toFixed(1)} س (${item.expectedSessionsCount} حصة)
          </div>
        </td>

        <td>
          <div style="font-weight: 800; color: ${diffColor}; font-size: 0.92rem;">
            ${diffSign}${item.discrepancyAmount.toLocaleString()} ج.م
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">
            (${item.discrepancyHours > 0 ? '+' : ''}${item.discrepancyHours} س)
          </div>
        </td>

        <td>
          <div style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.65rem; border-radius: 9999px; background: ${badgeBg}; color: ${badgeColor}; font-weight: 800; font-size: 0.78rem;">
            <i data-lucide="${badgeIcon}" style="width: 14px; height: 14px;"></i>
            <span>${item.integrityLabel}</span>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem; max-width: 180px; line-height: 1.3;" title="${item.integrityExplanation}">
            ${item.integrityExplanation.length > 50 ? item.integrityExplanation.substring(0, 50) + '...' : item.integrityExplanation}
          </div>
        </td>

        <td style="text-align: center;">
          <div style="display: flex; gap: 0.35rem; justify-content: center;">
            <button class="btn btn-secondary btn-sm btn-inspect-recon" data-index="${idx}" title="فحص وتفسير الفروقات التفصيلي" style="padding: 0.4rem 0.65rem; font-size: 0.8rem; font-weight: 700;">
              <i data-lucide="search"></i> فحص وتفسير
            </button>
            <button class="btn btn-secondary btn-sm btn-quick-audit" data-index="${idx}" title="تسجيل تدقيق فوري بسجل المطابقة" style="padding: 0.4rem 0.5rem; color: var(--primary-color);">
              <i data-lucide="file-check"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind inspector button clicks
  tbody.querySelectorAll('.btn-inspect-recon').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      const reconItem = filtered[idx];
      openCurrentReconInspectorModal(reconItem);
    });
  });

  tbody.querySelectorAll('.btn-quick-audit').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      const reconItem = filtered[idx];
      await promptQuickAudit(reconItem);
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Renders Tab 2: Archive Salary Reconciliation Table
 */
function renderArchiveReconciliationTable() {
  const tbody = document.getElementById('tblArchiveReconBody');
  if (!tbody) return;

  const filtered = archiveReconciliations.filter(r => {
    const matchesSearch = !filterArchiveSearch ||
      r.teacherName.toLowerCase().includes(filterArchiveSearch);

    const matchesStatus = filterArchiveStatus === 'all' || r.integrityStatus === filterArchiveStatus;
    const matchesMonth = filterArchiveMonth === 'all' || r.month === filterArchiveMonth;

    return matchesSearch && matchesStatus && matchesMonth;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          <i data-lucide="archive" style="width: 32px; height: 32px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
          <div>لا توجد سجلات أرشيف مطابقة لمعايير البحث.</div>
        </td>
      </tr>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  tbody.innerHTML = filtered.map((item, idx) => {
    const isBalanced = item.integrityStatus === 'balanced';
    const isAcceptable = item.integrityStatus === 'acceptable_discrepancy';
    const isCritical = item.integrityStatus === 'critical_discrepancy';

    let badgeIcon = isBalanced ? 'check-circle' : (isAcceptable ? 'info' : 'alert-octagon');
    let badgeBg = isBalanced ? 'rgba(34, 197, 94, 0.12)' : (isAcceptable ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)');
    let badgeColor = isBalanced ? '#15803d' : (isAcceptable ? '#b45309' : '#b91c1c');

    const diffColor = item.amountDiff === 0 ? 'var(--text-secondary)' : (item.amountDiff > 0 ? '#16a34a' : '#dc2626');

    return `
      <tr>
        <td>
          <div style="font-weight: 800; color: var(--text-primary); font-size: 0.92rem;">${item.teacherName}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">طريقة الدفع: ${item.archivedMethod}</div>
        </td>

        <td>
          <span class="badge badge-secondary" style="font-weight: 800; font-size: 0.82rem;">${item.month}</span>
        </td>

        <td>
          <div style="font-weight: 900; color: var(--text-primary); font-size: 0.95rem;">
            ${item.archivedAmount.toLocaleString()} ج.م
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            ${item.archivedHours} س (${item.archivedSessionsCount} حصة)
          </div>
        </td>

        <td>
          <div style="font-weight: 900; color: var(--primary-color); font-size: 0.95rem;">
            ${item.recomputedSalary.toLocaleString()} ج.م
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            ${item.recomputedHours} س (${item.recomputedSessionsCount} حصة)
          </div>
        </td>

        <td>
          <div style="font-weight: 800; color: ${diffColor}; font-size: 0.92rem;">
            ${item.amountDiff > 0 ? '+' : ''}${item.amountDiff.toLocaleString()} ج.م
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">
            فارق الساعات: ${item.hoursDiff > 0 ? '+' : ''}${item.hoursDiff} س
          </div>
        </td>

        <td>
          <div style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.65rem; border-radius: 9999px; background: ${badgeBg}; color: ${badgeColor}; font-weight: 800; font-size: 0.78rem;">
            <i data-lucide="${badgeIcon}" style="width: 14px; height: 14px;"></i>
            <span>${item.integrityLabel}</span>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem; max-width: 180px; line-height: 1.3;">
            ${item.integrityExplanation}
          </div>
        </td>

        <td>
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary);">${item.adminName}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${item.notes || 'لا توجد ملاحظات'}</div>
        </td>

        <td style="text-align: center;">
          <button class="btn btn-secondary btn-sm btn-inspect-archive" data-index="${idx}" style="padding: 0.4rem 0.75rem; font-size: 0.8rem; font-weight: 700;">
            <i data-lucide="search"></i> مراجعة الجلسات
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-inspect-archive').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      const item = filtered[idx];
      openArchiveReconInspectorModal(item);
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Real-time listener for the Audit Trail tab
 */
function listenToAuditLogs() {
  const tbody = document.getElementById('tblAuditLogsBody');
  if (!tbody) return;

  const q = query(collection(db, "payrollReconciliationLogs"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            <i data-lucide="history" style="width: 32px; height: 32px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
            <div>لم يتم تسجيل أي عمليات تدقيق ومطابقة رسمية بعد. يتم الحفظ هنا تلقائياً عند اعتماد المطابقة.</div>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    tbody.innerHTML = snapshot.docs.map(doc => {
      const d = doc.data();
      const dateStr = d.createdAt ? new Date(d.createdAt.toDate ? d.createdAt.toDate() : d.createdAt).toLocaleString('ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }) : 'الآن';

      const isBalanced = d.status === 'balanced';
      const isAcceptable = d.status === 'acceptable_discrepancy';
      let statusBadge = isBalanced ? 
        `<span class="badge badge-success" style="font-weight: 800;">متطابق 🟢</span>` :
        (isAcceptable ? `<span class="badge badge-warning" style="font-weight: 800;">فروقات مقبولة 🟡</span>` : `<span class="badge badge-danger" style="font-weight: 800;">يتطلب مراجعة 🔴</span>`);

      return `
        <tr>
          <td style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); direction: ltr; text-align: right;">${dateStr}</td>
          <td style="font-weight: 800; color: var(--text-primary);">${d.teacherName || 'فحص شامل'}</td>
          <td><span class="badge badge-secondary" style="font-weight: 800;">${d.month || '-'}</span></td>
          <td>${statusBadge}</td>
          <td style="font-weight: 800; color: var(--primary-color);">${(d.calculatedSalary || 0).toLocaleString()} ج.م</td>
          <td style="font-weight: 800; color: ${d.discrepancyAmount === 0 ? 'var(--text-secondary)' : '#dc2626'};">${(d.discrepancyAmount || 0).toLocaleString()} ج.م</td>
          <td>
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">${d.adminName || 'الأدمن'}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${d.notes || 'تدقيق معتمد'}</div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }, err => console.error("Error listening to reconciliation logs:", err));
}

/**
 * Open Inspector Modal for Current Month Teacher Reconciliation
 */
function openCurrentReconInspectorModal(reconItem) {
  activeSelectedTeacherRecon = reconItem;
  const modal = document.getElementById('reconDetailModal');
  if (!modal) return;

  // Header Details
  document.getElementById('modalTeacherName').textContent = reconItem.teacherName;
  document.getElementById('modalMonthDisplay').textContent = reconItem.month;
  
  const statusBadge = document.getElementById('modalStatusBadge');
  statusBadge.className = `badge ${reconItem.integrityBadgeClass}`;
  statusBadge.textContent = reconItem.integrityLabel;
  document.getElementById('modalStatusRationale').textContent = reconItem.integrityExplanation;

  // Comparison Metrics
  document.getElementById('modalMetricRecordedSessions').textContent = reconItem.totalRecordedSessions;
  document.getElementById('modalMetricIncludedSessions').textContent = reconItem.includedSessionsCount;
  document.getElementById('modalMetricExcludedSessions').textContent = reconItem.excludedSessionsCount;
  document.getElementById('modalMetricIncludedHours').textContent = `${reconItem.includedHours.toFixed(1)} س`;
  document.getElementById('modalMetricCalculatedSalary').textContent = `${reconItem.netCalculatedSalary.toLocaleString()} ج.م`;
  document.getElementById('modalMetricExpectedSalary').textContent = `${reconItem.expectedSalary.toLocaleString()} ج.م`;
  document.getElementById('modalMetricDiscrepancy').textContent = `${reconItem.discrepancyAmount > 0 ? '+' : ''}${reconItem.discrepancyAmount.toLocaleString()} ج.م`;

  // Render Tabs in Modal
  renderModalIncludedSessions(reconItem.includedSessions);
  renderModalExcludedSessions(reconItem.excludedSessions, reconItem);
  renderModalFormulaMath(reconItem);

  // Switch to first tab by default
  const defaultTab = modal.querySelector('.modal-tab-btn[data-target="modal-tab-excluded"]');
  if (defaultTab && reconItem.excludedSessionsCount > 0) {
    defaultTab.click();
  } else {
    modal.querySelector('.modal-tab-btn[data-target="modal-tab-included"]')?.click();
  }

  modal.style.display = 'flex';
  if (window.lucide) window.lucide.createIcons();
}

function renderModalIncludedSessions(sessions) {
  const tbody = document.getElementById('tblModalIncludedSessions');
  if (!tbody) return;

  if (sessions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">لا توجد حصص محتسبة لهذا الشهر حتى الآن.</td></tr>`;
    return;
  }

  tbody.innerHTML = sessions.map(item => {
    const s = item.session;
    return `
      <tr>
        <td style="font-weight: 700; color: var(--text-primary);">${s.date || '-'}</td>
        <td>
          <div style="font-weight: 800; color: var(--text-primary); font-size: 0.88rem;">${s.studentName || s.groupName || 'دارس'}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${item.isGroup ? 'مجموعة جماعية' : 'حصة فردية'}</div>
        </td>
        <td style="font-weight: 700;">${s.duration || 0} دقيقة (${item.hours.toFixed(2)} س)</td>
        <td style="font-weight: 800; color: var(--text-primary);">${item.rate} ج.م/س</td>
        <td style="font-weight: 900; color: var(--success); font-size: 0.95rem;">${Math.round(item.cost)} ج.م</td>
        <td><span class="badge badge-success" style="font-size: 0.75rem;">${item.statusLabel}</span></td>
      </tr>
    `;
  }).join('');
}

function renderModalExcludedSessions(excludedItems, reconItem) {
  const tbody = document.getElementById('tblModalExcludedSessions');
  const batchApproveBtnContainer = document.getElementById('modalBatchApproveContainer');
  if (!tbody) return;

  if (excludedItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 2.5rem; color: var(--success); font-weight: 800;">
          <i data-lucide="check-check" style="width: 32px; height: 32px; margin-bottom: 0.5rem;"></i>
          <div>ممتاز! لا توجد أي حصص مستبعدة لهذا المعلم. جميع الجلسات معتمدة ومحتسبة.</div>
        </td>
      </tr>
    `;
    if (batchApproveBtnContainer) batchApproveBtnContainer.innerHTML = '';
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const unapprovedSessionIds = excludedItems
    .filter(i => i.reason.code === 'NOT_APPROVED')
    .map(i => i.session.id);

  if (batchApproveBtnContainer) {
    if (unapprovedSessionIds.length > 0) {
      batchApproveBtnContainer.innerHTML = `
        <button id="btnBatchApproveAll" class="btn btn-primary" style="font-weight: 800; gap: 0.4rem; font-size: 0.85rem; background: var(--warning); border-color: var(--warning);">
          <i data-lucide="check-circle-2"></i> اعتماد جميع الحصص المعلقة (${unapprovedSessionIds.length} حصة)
        </button>
      `;
      document.getElementById('btnBatchApproveAll')?.addEventListener('click', async () => {
        await handleBatchApprovePending(unapprovedSessionIds, reconItem.teacherName);
      });
    } else {
      batchApproveBtnContainer.innerHTML = '';
    }
  }

  tbody.innerHTML = excludedItems.map(item => {
    const s = item.session;
    const r = item.reason;
    const canQuickApprove = r.code === 'NOT_APPROVED';

    return `
      <tr>
        <td style="font-weight: 700; color: var(--text-primary);">${s.date || '-'}</td>
        <td>
          <div style="font-weight: 800; color: var(--text-primary); font-size: 0.88rem;">${s.studentName || s.groupName || 'دارس'}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${s.startTime || ''} - ${s.endTime || ''}</div>
        </td>
        <td style="font-weight: 700;">${s.duration || 0} دقيقة</td>
        <td>
          <div style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.5rem; border-radius: 6px; background: rgba(0,0,0,0.05); font-size: 0.78rem; font-weight: 800; color: ${r.color};">
            <i data-lucide="${r.icon}" style="width: 14px; height: 14px;"></i>
            <span>${r.title}</span>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;">${r.desc}</div>
        </td>
        <td style="font-weight: 800; color: var(--danger); font-size: 0.9rem;">
          ${item.estimatedLostValue > 0 ? `-${Math.round(item.estimatedLostValue)} ج.م` : '0 ج.م'}
        </td>
        <td style="text-align: center;">
          ${canQuickApprove ? `
            <button class="btn btn-secondary btn-sm btn-approve-single" data-session-id="${s.id}" style="padding: 0.3rem 0.6rem; font-size: 0.78rem; font-weight: 800; color: var(--success); border-color: var(--success);">
              <i data-lucide="check"></i> اعتماد الآن
            </button>
          ` : `<span style="font-size: 0.75rem; color: var(--text-muted);">-</span>`}
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-approve-single').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sessionId = btn.getAttribute('data-session-id');
      await handleBatchApprovePending([sessionId], reconItem.teacherName);
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

function renderModalFormulaMath(reconItem) {
  const container = document.getElementById('modalFormulaContent');
  if (!container) return;

  container.innerHTML = `
    <div style="background: var(--bg-primary); padding: 1.25rem; border-radius: 10px; border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
      <h4 style="font-weight: 800; font-size: 0.95rem; margin-bottom: 0.8rem; color: var(--primary-color);">
        🧮 معادلة الاحتساب المباشر من قاعدة البيانات (Raw Formula)
      </h4>
      <div style="display: flex; flex-direction: column; gap: 0.6rem; font-size: 0.88rem; line-height: 1.6;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.4rem;">
          <span>ساعات الحصص الفردية:</span>
          <strong>${(reconItem.includedSessions.filter(s => !s.isGroup).reduce((acc, c) => acc + c.hours, 0)).toFixed(2)} س × ${reconItem.rateInd} ج.م = ${Math.round(reconItem.individualCalculatedSalary)} ج.م</strong>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.4rem;">
          <span>ساعات الحصص الجماعية:</span>
          <strong>${(reconItem.includedSessions.filter(s => s.isGroup).reduce((acc, c) => acc + c.hours, 0)).toFixed(2)} س × ${reconItem.rateGrp} ج.م = ${Math.round(reconItem.groupCalculatedSalary)} ج.م</strong>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.4rem;">
          <span>إجمالي أجر الحصص الفعلي:</span>
          <strong style="color: var(--primary-color);">${Math.round(reconItem.rawCalculatedSalary)} ج.م</strong>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.4rem;">
          <span>المكافآت والحوافز المعتمدة (+):</span>
          <strong style="color: var(--success);">+${reconItem.bonuses} ج.م</strong>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.4rem;">
          <span>الخصومات والتسويات (-):</span>
          <strong style="color: var(--danger);">${reconItem.deductions > 0 ? `-${reconItem.deductions}` : '0'} ج.م</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 1.05rem; padding-top: 0.5rem; color: var(--primary-color);">
          <span>المرتب الفعلي المستحق الحالي:</span>
          <span>${reconItem.netCalculatedSalary.toLocaleString()} ج.م</span>
        </div>
      </div>
    </div>

    <div style="background: rgba(37, 99, 235, 0.04); padding: 1.25rem; border-radius: 10px; border: 1px solid rgba(37, 99, 235, 0.15);">
      <h4 style="font-weight: 800; font-size: 0.95rem; margin-bottom: 0.8rem; color: #1d4ed8;">
        🎯 المقارنة مع المرتب المتوقع من جدول الطلاب
      </h4>
      <div style="font-size: 0.88rem; line-height: 1.6; color: var(--text-primary);">
        المرتب المتوقع وفقاً للجدول الدراسي: <strong>${reconItem.expectedSalary.toLocaleString()} ج.م</strong> (${reconItem.expectedHours.toFixed(1)} ساعة متوقعة).
        <div style="margin-top: 0.5rem; padding: 0.75rem; background: var(--bg-surface); border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.84rem;">
          <strong>تفسير الفارق: </strong>
          ${reconItem.integrityExplanation}
        </div>
      </div>
    </div>
  `;
}

/**
 * Handle Batch Approve of pending sessions with explicit confirmation
 */
async function handleBatchApprovePending(sessionIds, teacherName) {
  const confirmed = await showCustomConfirm(
    `هل أنت متأكد من اعتماد (${sessionIds.length}) حصة معلقة للأستاذ/ة (${teacherName})؟`,
    "اعتماد الحصص المالية"
  );
  if (!confirmed) return;

  try {
    await batchApproveSessions(sessionIds);
    Toast.success(`تم بنجاح اعتماد ${sessionIds.length} حصة. جاري إعادة مطابقة البيانات...`);

    // Re-run fresh calculation
    await loadAndRunReconciliation();

    // Re-open updated inspector modal if it was open
    const updated = currentMonthReconciliations.find(r => r.teacherName === teacherName);
    if (updated) {
      openCurrentReconInspectorModal(updated);
    }
  } catch (err) {
    console.error("Error approving sessions:", err);
    Toast.danger("حدث خطأ أثناء اعتماد الحصص: " + err.message);
  }
}

/**
 * Prompt to create an official reconciliation audit log entry
 */
async function promptQuickAudit(reconItem) {
  const confirmed = await showCustomConfirm(
    `هل تريد تسجيل وتوثيق عملية مطابقة وتدقيق مرتب شهر (${reconItem.month}) للمعلم (${reconItem.teacherName}) في سجل النظام الرسمي؟`,
    "توثيق التدقيق المالي"
  );
  if (!confirmed) return;

  try {
    await logReconciliationAudit({
      teacherId: reconItem.teacherId,
      teacherName: reconItem.teacherName,
      month: reconItem.month,
      status: reconItem.integrityStatus,
      calculatedSalary: reconItem.netCalculatedSalary,
      targetSalary: reconItem.expectedSalary,
      discrepancyAmount: reconItem.discrepancyAmount,
      totalSessions: reconItem.totalRecordedSessions,
      includedSessions: reconItem.includedSessionsCount,
      excludedSessions: reconItem.excludedSessionsCount,
      adminName: auth.currentUser?.displayName || 'مشرف الإدارة',
      adminId: auth.currentUser?.uid || 'admin',
      notes: reconItem.integrityExplanation
    });

    Toast.success("تم توثيق عملية المطابقة بنجاح في سجل التدقيق المالي 📑");
  } catch (err) {
    console.error("Error saving audit:", err);
    Toast.danger("فشل حفظ سجل التدقيق: " + err.message);
  }
}

/**
 * Open Inspector Modal for Archive Record
 */
function openArchiveReconInspectorModal(archiveRecon) {
  activeSelectedArchiveRecon = archiveRecon;
  const modal = document.getElementById('archiveDetailModal');
  if (!modal) return;

  document.getElementById('archiveModalTeacherName').textContent = archiveRecon.teacherName;
  document.getElementById('archiveModalMonth').textContent = archiveRecon.month;
  document.getElementById('archiveModalAmount').innerHTML = `${archiveRecon.archivedAmount.toLocaleString()} ج.م <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); display:block;">${archiveRecon.archivedSessionsCount} حصة (${archiveRecon.archivedHours} س)</span>`;
  document.getElementById('archiveModalRecomputed').innerHTML = `${archiveRecon.recomputedSalary.toLocaleString()} ج.م <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); display:block;">${archiveRecon.recomputedSessionsCount} حصة (${archiveRecon.recomputedHours} س)</span>`;
  document.getElementById('archiveModalDiff').innerHTML = `${archiveRecon.amountDiff > 0 ? '+' : ''}${archiveRecon.amountDiff.toLocaleString()} ج.م <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); display:block;">فارق الحصص: ${archiveRecon.sessionsDiff > 0 ? '+' : ''}${archiveRecon.sessionsDiff}</span>`;
  document.getElementById('archiveModalRationale').textContent = archiveRecon.integrityExplanation;

  // Render Post-Archive Sessions Alert Section if any exists
  const postArchiveSec = document.getElementById('archiveModalPostArchiveSection');
  const postArchiveTbody = document.getElementById('tblArchiveModalPostArchiveSessions');
  const postSessions = archiveRecon.postArchiveSessions || [];

  if (postArchiveSec && postArchiveTbody) {
    if (postSessions.length > 0) {
      postArchiveSec.style.display = 'block';
      const countEl = document.getElementById('archivePostArchiveCount');
      if (countEl) countEl.textContent = postSessions.length;
      const dateEl = document.getElementById('archiveModalCreatedAtDate');
      if (dateEl) dateEl.textContent = archiveRecon.archiveCreatedAtFormatted || 'تاريخ الأرشفة';
      const diffValEl = document.getElementById('archivePostArchiveDiffVal');
      if (diffValEl) diffValEl.textContent = archiveRecon.amountDiff > 0 ? archiveRecon.amountDiff.toLocaleString() : '0';
      const monthSrcEl = document.getElementById('archivePostArchiveSourceMonth');
      if (monthSrcEl) monthSrcEl.textContent = parseInt(archiveRecon.month.split('-')[1], 10);

      // Handle carry-over button click
      const btnCarryOver = document.getElementById('btnCarryOverSessionsAction');
      if (btnCarryOver) {
        // Clone button to remove previous listeners
        const newBtn = btnCarryOver.cloneNode(true);
        btnCarryOver.parentNode.replaceChild(newBtn, btnCarryOver);
        
        newBtn.addEventListener('click', async () => {
          const mNum = parseInt(archiveRecon.month.split('-')[1], 10);
          const confirmOk = await showCustomConfirm(
            `هل أنت متأكد من ترحيل هذه الحصص (${postSessions.length} حصة) إلى راتب الشهر الجديد؟\n\nسيتم إدراجها ضمن استحقاق المعلم الحالي وتظهر بملاحظة "مرحّلة من شهر ${mNum}" لضمان حفظ الحقوق بدقة.`,
            "تثبيت ترحيل الحصص للشهر الجديد"
          );
          if (!confirmOk) return;

          try {
            newBtn.disabled = true;
            newBtn.innerHTML = `<i data-lucide="loader-2" class="animate-spin"></i> جاري الترحيل...`;
            if (window.lucide) window.lucide.createIcons();

            const sessionIds = postSessions.map(p => p.session.id);
            await carryOverPostArchiveSessions(sessionIds, archiveRecon.month);

            Toast.show(`تم بنجاح ترحيل ${sessionIds.length} حصة إلى راتب الشهر الجديد بملاحظة "مرحّلة من شهر ${mNum}".`, 'success');
            modal.style.display = 'none';
            await refreshReconciliationData();
          } catch (err) {
            console.error("Error carrying over sessions:", err);
            Toast.show("تعذر ترحيل الحصص: " + err.message, "error");
            newBtn.disabled = false;
            newBtn.innerHTML = `<i data-lucide="forward"></i> تثبيت الترحيل للشهر الجديد فوراً`;
            if (window.lucide) window.lucide.createIcons();
          }
        });
      }

      postArchiveTbody.innerHTML = postSessions.map(item => {
        return `
          <tr style="background: #fff5f5;">
            <td style="font-weight: 800; color: #1e293b;">
              ${item.date}
              <span style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted); display: block;">${item.time}</span>
            </td>
            <td style="font-weight: 800; color: var(--primary-color);">${item.studentName}</td>
            <td>
              ${item.duration} دقيقة
              <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${item.rate} ج.م/س (${item.hours.toFixed(2)} س)</span>
            </td>
            <td style="font-family: monospace; font-size: 0.8rem; font-weight: 800; color: #b91c1c;">
              ${item.createdAtFormatted}
            </td>
            <td style="font-weight: 700; color: #334155;">
              ${item.recordedBy}
            </td>
            <td>
              <span class="badge" style="background-color: #dcfce7; color: #15803d; font-weight: 700;">${item.approvedBy}</span>
              ${item.approvedAtFormatted && item.approvedAtFormatted !== '-' ? `<span style="font-size: 0.72rem; color: var(--text-muted); display: block;">${item.approvedAtFormatted}</span>` : ''}
            </td>
            <td style="font-weight: 900; color: #be123c; font-size: 0.95rem;">
              +${Math.round(item.cost).toLocaleString()} ج.م
            </td>
          </tr>
        `;
      }).join('');
    } else {
      postArchiveSec.style.display = 'none';
    }
  }

  // Set total count
  const allCountEl = document.getElementById('archiveModalAllSessionsCount');
  if (allCountEl) allCountEl.textContent = archiveRecon.recomputedSessionsList.length;

  // Render Full Sessions Table
  const tbody = document.getElementById('tblArchiveModalSessions');
  if (tbody) {
    if (archiveRecon.recomputedSessionsList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">لا توجد جلسات مرتبطة مسجلة في قاعدة البيانات لهذه الدورة.</td></tr>`;
    } else {
      tbody.innerHTML = archiveRecon.recomputedSessionsList.map(item => {
        const s = item.session;
        const isPost = item.isPostArchive;
        return `
          <tr style="${isPost ? 'background: #fff8f8;' : ''}">
            <td style="font-weight: 700;">${s.date || '-'}</td>
            <td style="font-weight: 800;">${item.studentName}</td>
            <td>${item.duration || 0} دقيقة (${item.hours.toFixed(2)} س)</td>
            <td>
              <span style="font-weight: 700;">${item.rate} ج.م/س</span>
              <span style="font-weight: 900; color: var(--primary-color); display: block;">${Math.round(item.cost)} ج.م</span>
            </td>
            <td>
              <span style="font-size: 0.78rem; font-family: monospace; font-weight: 600; color: #475569;">${item.createdAtFormatted}</span>
              <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">بواسطة: ${item.recordedBy}</span>
            </td>
            <td>
              ${isPost ? 
                `<span class="badge" style="background-color: #fee2e2; color: #b91c1c; font-weight: 800; border: 1px solid #fca5a5;">⚠️ مضافة بعد الأرشفة</span>` : 
                `<span class="badge" style="background-color: #dcfce7; color: #15803d; font-weight: 700;">ضمن الأرشيف الأصلي ✅</span>`
              }
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  modal.style.display = 'flex';
  if (window.lucide) window.lucide.createIcons();
}

function setupModalEvents() {
  const reconModal = document.getElementById('reconDetailModal');
  const archiveModal = document.getElementById('archiveDetailModal');

  document.querySelectorAll('.close-recon-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      if (reconModal) reconModal.style.display = 'none';
      if (archiveModal) archiveModal.style.display = 'none';
    });
  });

  // Modal sub-tab navigation
  document.querySelectorAll('.modal-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetId = btn.getAttribute('data-target');
      document.querySelectorAll('.modal-tab-pane').forEach(p => {
        p.style.display = p.id === targetId ? 'block' : 'none';
      });
    });
  });

  // Record audit button from modal
  const btnModalSaveAudit = document.getElementById('btnModalSaveAudit');
  if (btnModalSaveAudit) {
    btnModalSaveAudit.addEventListener('click', async () => {
      if (!activeSelectedTeacherRecon) return;
      await promptQuickAudit(activeSelectedTeacherRecon);
      if (reconModal) reconModal.style.display = 'none';
    });
  }
}

/**
 * CSV and Print exports
 */
function setupExportButtons() {
  const exportCsvBtn = document.getElementById('btnExportReconCsv');
  const printBtn = document.getElementById('btnPrintRecon');

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      exportReconciliationToCsv();
    });
  }

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

function exportReconciliationToCsv() {
  if (currentMonthReconciliations.length === 0) {
    Toast.warning("لا توجد بيانات لتصديرها");
    return;
  }

  const headers = [
    "اسم المعلم",
    "الشهر المالي",
    "الحصص المسجلة",
    "الحصص المعتمدة المحتسبة",
    "الحصص المستبعدة",
    "ساعات العمل المحتسبة",
    "المرتب المحسوب (ج.م)",
    "المرتب المتوقع (ج.م)",
    "الفارق المالي (ج.م)",
    "مؤشر سلامة الراتب",
    "تفسير الفروقات"
  ];

  const rows = currentMonthReconciliations.map(r => [
    `"${r.teacherName}"`,
    `"${r.month}"`,
    r.totalRecordedSessions,
    r.includedSessionsCount,
    r.excludedSessionsCount,
    r.includedHours.toFixed(1),
    r.netCalculatedSalary,
    r.expectedSalary,
    r.discrepancyAmount,
    `"${r.integrityLabel}"`,
    `"${(r.integrityExplanation || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `payroll_reconciliation_${selectedMonth}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  Toast.success("تم تنزيل ملف كشف المطابقة بنجاح 📥");
}
