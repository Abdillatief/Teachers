import { dataStore } from '../../shared/data/dataStore.js';
import { reconcileTeacherCurrentSalary } from '../payroll/payrollReconciliationEngine.js';

let sessionsCached = [];
let teachersCached = [];
let groupsCached = [];
let studentsCached = [];
let currentRange = 'month'; // 'month', 'week', 'day'

let trendChartInstance = null;
let attendanceChartInstance = null;
let reportUnsubs = [];
let renderQueued = false;

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Local (client/Egypt) YYYY-MM-DD. Avoids the UTC day shift of toISOString(). */
function localDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local (client/Egypt) YYYY-MM for the reconciliation engine month key. */
function localMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Normalizes a Firestore date value (string / Timestamp / Date) to local YYYY-MM-DD. */
function sessionDateKey(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (typeof value.toDate === 'function') return localDate(value.toDate());
  if (typeof value.seconds === 'number') return localDate(new Date(value.seconds * 1000));
  if (value instanceof Date) return localDate(value);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : localDate(parsed);
}

/** Returns a valid hourly rate or null (no fabricated default prices). */
function getHourlyRate(teacher, session) {
  const raw = session?.type === 'group'
    ? (teacher?.hourlyRateGroup ?? teacher?.hourlyRate)
    : (teacher?.hourlyRateIndividual ?? teacher?.hourlyRate);
  const rate = parseFloat(raw);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function initReportsRealtime() {
  cleanupReports();

  reportUnsubs.push(
    dataStore.subscribe('users', (users) => {
      teachersCached = (users || [])
        .filter(u => u.role === 'teacher')
        .map(u => ({ uid: u.uid || u.id, ...u }));
      queueRender();
    })
  );

  reportUnsubs.push(
    dataStore.subscribe('sessions', (sessions) => {
      sessionsCached = (sessions || []).map(s => ({ id: s.id, ...s }));
      queueRender();
    })
  );

  // Raw groups/students are required by the single source of truth payroll engine
  // to compute the expected salary from the master schedule.
  reportUnsubs.push(
    dataStore.subscribe('groups', (groups) => {
      groupsCached = (groups || []).map(g => ({ id: g.id, ...g }));
      queueRender();
    })
  );

  reportUnsubs.push(
    dataStore.subscribe('students', (students) => {
      studentsCached = (students || []).map(s => ({ id: s.id, ...s }));
      queueRender();
    })
  );
}

export function cleanupReports() {
  reportUnsubs.forEach(unsub => { try { unsub(); } catch (_) {} });
  reportUnsubs = [];
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    calculateAndRenderReports();
  });
}

export function setReportsRange(range) {
  currentRange = range;
  calculateAndRenderReports();
}

function calculateAndRenderReports() {
  const now = new Date();
  const todayStr = localDate(now);
  const currentMonthKey = localMonthKey(now);
  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const sevenDaysAgoStr = localDate(sevenDaysAgo);

  const filteredSessions = sessionsCached.filter(s => {
    if (!s.date) return false;
    const dateStr = sessionDateKey(s.date);
    if (currentRange === 'day') return dateStr === todayStr;
    if (currentRange === 'week') return dateStr >= sevenDaysAgoStr && dateStr <= todayStr;
    return dateStr.startsWith(currentMonthKey);
  });

  const completedSessions = filteredSessions.filter(s => s.status === 'completed');
  const absentExcusedSessions = filteredSessions.filter(s => s.status === 'student_absent' && s.absenceType === 'excused');
  const absentUnexcusedSessions = filteredSessions.filter(s => s.status === 'student_absent' && s.absenceType === 'unexcused');
  // مجموعة واحدة محسوبة تُستخدم للبطاقات والجدول معاً
  const billableSessions = filteredSessions.filter(s =>
    s.status === 'completed' || (s.status === 'student_absent' && s.absenceType === 'unexcused')
  );

  const completedCount = completedSessions.length;
  const absentExcusedCount = absentExcusedSessions.length;
  const absentUnexcusedCount = absentUnexcusedSessions.length;
  const totalSessionsCount = billableSessions.length;
  const totalHours = billableSessions.reduce((sum, s) => sum + (parseInt(s.duration) || 0) / 60, 0);

  // ALL payroll figures come from the same reconciliation engine used by the
  // dashboard and the payroll-reconciliation page. No private rate calculation.
  const reconByTeacher = new Map(teachersCached.map(t => {
    const teacherId = t.uid || t.id;
    return [teacherId, reconcileTeacherCurrentSalary(
      t, filteredSessions, groupsCached, studentsCached, currentMonthKey
    )];
  }));

  const payrollTeachers = teachersCached.filter(t => t.status === 'approved');
  let totalPayroll = 0;
  let hasUnpricedPayroll = false;
  payrollTeachers.forEach(t => {
    const recon = reconByTeacher.get(t.uid || t.id);
    totalPayroll += Number(recon?.netCalculatedSalary || 0);
    if (getHourlyRate(t, { type: 'individual' }) === null && getHourlyRate(t, { type: 'group' }) === null) {
      hasUnpricedPayroll = true;
    }
  });

  const elHours = document.getElementById('statTotalHours');
  const elSessions = document.getElementById('statTotalSessions');
  const elAttendance = document.getElementById('statAttendanceRate');
  const elPayroll = document.getElementById('statTotalPayroll');

  if (elHours) elHours.textContent = `${totalHours.toFixed(1)} ساعة`;
  if (elSessions) elSessions.textContent = `${totalSessionsCount} حصة`;

  const attendanceRate = totalSessionsCount > 0
    ? (completedCount / (completedCount + absentUnexcusedCount + absentExcusedCount)) * 100
    : 100;
  if (elAttendance) elAttendance.textContent = `${attendanceRate.toFixed(1)}%`;
  if (elPayroll) elPayroll.textContent = hasUnpricedPayroll
    ? `${totalPayroll.toFixed(2)} ج.م (سعر غير محدد)`
    : `${totalPayroll.toFixed(2)} ج.م`;

  renderPayrollTable(payrollTeachers, reconByTeacher, currentMonthKey);
  renderCharts(filteredSessions, completedCount, absentExcusedCount, absentUnexcusedCount);
}

function renderPayrollTable(payrollTeachers, reconByTeacher, currentMonthKey) {
  const tbody = document.getElementById('payrollTableBody');
  if (!tbody) return;

  if (payrollTeachers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">لا يوجد معلمين معتمدين مسجلين في النظام.</td></tr>`;
    return;
  }

  const rangeLabels = { day: 'اليوم الجاري', week: 'الأسبوع الأخير', month: 'الشهر الحالي' };

  tbody.innerHTML = payrollTeachers.map(t => {
    const recon = reconByTeacher.get(t.uid || t.id) || {};
    const net = Number(recon.netCalculatedSalary || 0);
    const expected = Number(recon.expectedSalary || 0);
    const raw = Number(recon.rawCalculatedSalary || 0);
    const hours = Number(recon.includedHours || 0);
    const sessionsCount = Number(recon.includedSessionsCount || 0);

    const individualRate = getHourlyRate(t, { type: 'individual' });
    const groupRate = getHourlyRate(t, { type: 'group' });
    let hourlyRateLabel;
    if (individualRate === null && groupRate === null) {
      hourlyRateLabel = 'غير محدد';
    } else if (individualRate === null) {
      hourlyRateLabel = `جماعي ${groupRate} ج.م`;
    } else if (groupRate === null) {
      hourlyRateLabel = `فردي ${individualRate} ج.م`;
    } else {
      hourlyRateLabel = `${individualRate} فردي / ${groupRate} جماعي`;
    }

    return `
      <tr>
        <td><strong>${escapeHtml(t.name || '-')}</strong><div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(t.phone || '')}</div></td>
        <td>${escapeHtml(hourlyRateLabel)}</td>
        <td><strong>${escapeHtml(hours.toFixed(2))} ساعة</strong></td>
        <td>${escapeHtml(sessionsCount)} حصة</td>
        <td><span style="background-color: var(--primary-light); color: var(--primary-color); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">${escapeHtml(rangeLabels[currentRange] || currentRange)}</span><div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.25rem;">${escapeHtml(currentMonthKey)} · محرك المطابقة</div></td>
        <td><strong style="color: var(--success); font-size: 1rem;">${escapeHtml(net.toFixed(2))} ج.م</strong><div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.25rem;">المتوقع: ${escapeHtml(expected.toFixed(2))} ج.م · قبل التسويات: ${escapeHtml(raw.toFixed(2))} ج.م</div></td>
      </tr>
    `;
  }).join('');
}

function renderCharts(filteredSessions, completed, excused, unexcused) {
  const attendanceCanvas = document.getElementById('attendanceRateChart');
  if (attendanceCanvas && typeof Chart !== 'undefined') {
    if (attendanceChartInstance) attendanceChartInstance.destroy();
    attendanceChartInstance = new Chart(attendanceCanvas, {
      type: 'doughnut',
      data: {
        labels: ['تمت بنجاح', 'مؤجلة (بعذر)', 'غياب (بدون عذر)'],
        datasets: [{ data: [completed, excused, unexcused], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 1 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  const trendsCanvas = document.getElementById('sessionsTrendsChart');
  if (trendsCanvas && typeof Chart !== 'undefined') {
    if (trendChartInstance) trendChartInstance.destroy();

    const dailyMap = {};
    const dateLabels = [];
    const daysToGenerate = currentRange === 'day' ? 1 : (currentRange === 'week' ? 7 : 15);
    const now = new Date();

    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const str = localDate(d);
      dailyMap[str] = 0;
      dateLabels.push({ dateStr: str, label: d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) });
    }

    filteredSessions.forEach(s => {
      const key = sessionDateKey(s.date);
      if (key && dailyMap[key] !== undefined) dailyMap[key]++;
    });

    trendChartInstance = new Chart(trendsCanvas, {
      type: 'bar',
      data: {
        labels: dateLabels.map(i => i.label),
        datasets: [{
          label: 'عدد الحصص والدروس',
          data: dateLabels.map(i => dailyMap[i.dateStr]),
          backgroundColor: 'rgba(13, 148, 136, 0.7)',
          borderColor: '#0d9488',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
        plugins: { legend: { display: false } }
      }
    });
  }
}
