import { db } from '../../config/firebase.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let sessionsCached = [];
let teachersCached = [];
let currentRange = 'month'; // 'month', 'week', 'day'

let trendChartInstance = null;
let attendanceChartInstance = null;

export function initReportsRealtime() {
  // Listen to approved teachers
  onSnapshot(collection(db, "users"), (userSnap) => {
    teachersCached = [];
    userSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.role === 'teacher') {
        teachersCached.push({ uid: docSnap.id, ...data });
      }
    });

    // Listen to sessions
    onSnapshot(collection(db, "sessions"), (sessSnap) => {
      sessionsCached = [];
      sessSnap.forEach(docSnap => {
        sessionsCached.push({ id: docSnap.id, ...docSnap.data() });
      });

      calculateAndRenderReports();
    });
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

  // Calculate 7 days ago timestamp for week range
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  // Filter sessions based on selected range
  const filteredSessions = sessionsCached.filter(s => {
    if (!s.date) return false;
    if (currentRange === 'day') {
      return s.date === todayStr;
    } else if (currentRange === 'week') {
      return s.date >= sevenDaysAgoStr && s.date <= todayStr;
    } else {
      // Month
      return s.date.startsWith(currentYearMonth);
    }
  });

  // 1. Calculate General Stats
  let totalHours = 0;
  let totalSessionsCount = 0;
  let completedCount = 0;
  let absentExcusedCount = 0;
  let absentUnexcusedCount = 0;
  let totalPayroll = 0;

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
        // Calculate payroll for approved sessions
        const teacher = teachersCached.find(t => t.uid === s.teacherId);
        if (teacher) {
          let rate = 0;
          if (s.type === "group") {
            rate = teacher.hourlyRateGroup || teacher.hourlyRate || 120;
          } else {
            rate = teacher.hourlyRateIndividual || teacher.hourlyRate || 100;
          }
          totalPayroll += hours * rate;
        }
      }
    }
  });

  // Render Stats Card Values
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

  // 2. Render Payroll Table
  renderPayrollTable(filteredSessions);

  // 3. Render Charts (Trends & Attendance Rate)
  renderCharts(filteredSessions, completedCount, absentExcusedCount, absentUnexcusedCount);
}

function renderPayrollTable(filteredSessions) {
  const tbody = document.getElementById('payrollTableBody');
  if (!tbody) return;

  const approvedTeachers = teachersCached.filter(t => t.status === "approved");

  if (approvedTeachers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">لا يوجد معلمين معتمدين مسجلين في النظام.</td></tr>`;
    return;
  }

  const rangeLabels = {
    day: 'اليوم الجاري',
    week: 'الأسبوع الأخير',
    month: 'الشهر الحالي'
  };

  tbody.innerHTML = approvedTeachers.map(t => {
    // Sum hours and sessions for this teacher
    let teacherHours = 0;
    let teacherSessions = 0;
    let finalSalary = 0;

    filteredSessions.forEach(s => {
      if (s.teacherId === t.uid) {
        const isCompleted = s.status === "completed";
        const isUnexcused = s.status === "student_absent" && s.absenceType === "unexcused";
        
        if (isCompleted || isUnexcused) {
          teacherSessions++;
          const hours = (parseInt(s.duration) || 0) / 60;
          teacherHours += hours;

          if (s.approved) {
            let rate = s.type === "group" 
              ? (t.hourlyRateGroup || t.hourlyRate || 120) 
              : (t.hourlyRateIndividual || t.hourlyRate || 100);
            finalSalary += hours * rate;
          }
        }
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
  // 1. Attendance Doughnut Chart
  const attendanceCanvas = document.getElementById('attendanceRateChart');
  if (attendanceCanvas) {
    if (attendanceChartInstance) {
      attendanceChartInstance.destroy();
    }
    
    attendanceChartInstance = new Chart(attendanceCanvas, {
      type: 'doughnut',
      data: {
        labels: ['تمت بنجاح', 'مؤجلة (بعذر)', 'غياب (بدون عذر)'],
        datasets: [{
          data: [completed, excused, unexcused],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  // 2. Sessions trends bar/line chart
  const trendsCanvas = document.getElementById('sessionsTrendsChart');
  if (trendsCanvas) {
    if (trendChartInstance) {
      trendChartInstance.destroy();
    }

    // Aggregate sessions by day for the trend chart
    const dailyMap = {};
    const dateLabels = [];
    
    // Create past 7 days / labels
    const daysToGenerate = currentRange === 'day' ? 1 : (currentRange === 'week' ? 7 : 15);
    const now = new Date();
    
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const str = d.toISOString().split('T')[0];
      dailyMap[str] = 0;
      
      // format label (e.g. "20 يوليو")
      const label = d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
      dateLabels.push({ dateStr: str, label });
    }

    // Sum sessions for generated labels
    filteredSessions.forEach(s => {
      if (s.date && dailyMap[s.date] !== undefined) {
        dailyMap[s.date]++;
      }
    });

    const dataValues = dateLabels.map(item => dailyMap[item.dateStr]);
    const labels = dateLabels.map(item => item.label);

    trendChartInstance = new Chart(trendsCanvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'عدد الحصص والدروس',
          data: dataValues,
          backgroundColor: 'rgba(13, 148, 136, 0.7)',
          borderColor: '#0d9488',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }
}
