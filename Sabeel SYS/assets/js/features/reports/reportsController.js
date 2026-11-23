import { dataStore } from '../../shared/data/dataStore.js';

let sessionsCached = [];
let teachersCached = [];
let currentRange = 'month'; // 'month', 'week', 'day'

let trendChartInstance = null;
let attendanceChartInstance = null;
let reportUnsubs = [];
let renderQueued = false;

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
  const todayStr = now.toISOString().split('T')[0];
  const currentYearMonth = todayStr.substring(0, 7); // "YYYY-MM"

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const filteredSessions = sessionsCached.filter(s => {
    if (!s.date) return false;
    if (currentRange === 'day') return s.date === todayStr;
    if (currentRange === 'week') return s.date >= sevenDaysAgoStr && s.date <= todayStr;
    return s.date.startsWith(currentYearMonth);
  });

  let totalHours = 0;
  let totalSessionsCount = 0;
  let completedCount = 0;
  let absentExcusedCount = 0;
  let absentUnexcusedCount = 0;
  let totalPayroll = 0;

  const teachersById = new Map(teachersCached.map(t => [t.uid, t]));

  filteredSessions.forEach(s => {
    const isCompleted = s.status === "completed";
    const isUnexcused = s.status === "student_absent" && s.absenceType === "unexcused";
    const isExcused = s.status === "student_absent" && s.absenceType === "excused";

    if (isCompleted) completedCount++;
    if (isUnexcused) absentUnexcusedCount++;
    if (isExcused) absentExcusedCount++;

    if (isCompleted || isUnexcused) {
      totalSessionsCount++;
      const duration = parseInt(s.duration) || 0;
      const hours = duration / 60;
      totalHours += hours;

      if (s.approved) {
        const teacher = teachersById.get(s.teacherId);
        if (teacher) {
          const rate = s.type === "group"
            ? (teacher.hourlyRateGroup || teacher.hourlyRate || 120)
            : (teacher.hourlyRateIndividual || teacher.hourlyRate || 100);
          totalPayroll += hours * rate;
        }
      }
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
  if (elPayroll) elPayroll.textContent = `${totalPayroll.toFixed(2)} ج.م`;

  renderPayrollTable(filteredSessions, teachersById);
  renderCharts(filteredSessions, completedCount, absentExcusedCount, absentUnexcusedCount);
}

function renderPayrollTable(filteredSessions, teachersById) {
  const tbody = document.getElementById('payrollTableBody');
  if (!tbody) return;

  const approvedTeachers = teachersCached.filter(t => t.status === "approved");

  if (approvedTeachers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">لا يوجد معلمين معتمدين مسجلين في النظام.</td></tr>`;
    return;
  }

  const rangeLabels = { day: 'اليوم الجاري', week: 'الأسبوع الأخير', month: 'الشهر الحالي' };

  tbody.innerHTML = approvedTeachers.map(t => {
    let teacherHours = 0;
    let teacherSessions = 0;
    let finalSalary = 0;

    filteredSessions.forEach(s => {
      if (s.teacherId !== t.uid) return;
      const isCompleted = s.status === "completed";
      const isUnexcused = s.status === "student_absent" && s.absenceType === "unexcused";
      if (!(isCompleted || isUnexcused)) return;

      teacherSessions++;
      const hours = (parseInt(s.duration) || 0) / 60;
      teacherHours += hours;

      if (s.approved) {
        const rate = s.type === "group"
          ? (t.hourlyRateGroup || t.hourlyRate || 120)
          : (t.hourlyRateIndividual || t.hourlyRate || 100);
        finalSalary += hours * rate;
      }
    });

    const hourlyRateLabel = `${t.hourlyRateIndividual || t.hourlyRate || 100} فردي / ${t.hourlyRateGroup || t.hourlyRate || 120} جماعي`;

    return `
      <tr>
        <td><strong>${t.name}</strong><div style="font-size:0.75rem; color:var(--text-muted);">${t.phone || ''}</div></td>
        <td>${hourlyRateLabel} ج.م</td>
        <td><strong>${teacherHours.toFixed(2)} ساعة</strong></td>
        <td>${teacherSessions} حصة</td>
        <td><span style="background-color: var(--primary-light); color: var(--primary-color); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">${rangeLabels[currentRange]}</span></td>
        <td><strong style="color: var(--success); font-size: 1rem;">${finalSalary.toFixed(2)} ج.م</strong></td>
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
      const d = new Date();
      d.setDate(now.getDate() - i);
      const str = d.toISOString().split('T')[0];
      dailyMap[str] = 0;
      dateLabels.push({ dateStr: str, label: d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) });
    }

    filteredSessions.forEach(s => {
      if (s.date && dailyMap[s.date] !== undefined) dailyMap[s.date]++;
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
