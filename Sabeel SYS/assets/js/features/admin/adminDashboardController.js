import '../../shared/utils/jsonShield.js';
import { protectRoute } from '../auth/authService.js';
import { renderSidebar } from '../../shared/components/sidebar.js';
import { renderNavbar } from '../../shared/components/navbar.js';
import { dataStore } from '../../shared/data/dataStore.js';
import { db, auth } from '../../config/firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { Toast } from '../../shared/utils/toast.js';
import { initCommunityDashboardWidget } from '../community/communityWidget.js';
import { backfillOperationalProjectionsIfNeeded } from '../supervisor/supervisorDomainService.js';
import { reconcileTeacherCurrentSalary } from '../payroll/payrollReconciliationEngine.js';

protectRoute('admin');

const $ = (id) => document.getElementById(id);
const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };
const fmt = (n) => Number(n || 0).toLocaleString('ar-EG');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

let teachers = [], students = [], sessions = [], payments = [], groups = [];
let selectedMonth = new Date().toISOString().slice(0, 7);
let charts = {};
let renderQueued = false;
function scheduleRender(){
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; renderAll(); });
}

auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    const me = snap.exists() ? snap.data() : {};
    renderSidebar('dashboard', 'admin');
    renderNavbar('لوحة التحكم الإدارية', { name: me.name || 'الإدارة', roleName: 'مدير الأكاديمية' });
    setText('welcomeAdminMessage', me.name ? `مرحباً ${me.name}` : 'مرحباً بك');
  } catch {
    renderSidebar('dashboard', 'admin');
    renderNavbar('لوحة التحكم الإدارية', { name: 'الإدارة', roleName: 'مدير الأكاديمية' });
  }
  initMonthPicker();
  bindUI();
  try { initCommunityDashboardWidget('adminCommunityWidgetContainer', 'admin'); } catch {}
  try { await backfillOperationalProjectionsIfNeeded(); } catch {}
  subscribeData();
});

function initMonthPicker() {
  const sel = $('monthSelectDropdown');
  if (!sel) return;
  const now = new Date();
  sel.innerHTML = '';
  for (let i = -6; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
    if (val === selectedMonth) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', (e) => { selectedMonth = e.target.value; scheduleRender(); });
  $('btnPrevMonth')?.addEventListener('click', () => shiftMonth(-1));
  $('btnNextMonth')?.addEventListener('click', () => shiftMonth(1));
}

function shiftMonth(delta) {
  const [y, m] = selectedMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  selectedMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const sel = $('monthSelectDropdown');
  if (sel) sel.value = selectedMonth;
  scheduleRender();
}

function bindUI() {
  $('exportBackupQuickBtn')?.addEventListener('click', () => Toast.info('استخدم صفحة الإعدادات/التقارير لتصدير نسخة كاملة.'));
  const modal = $('zeroSessionsModal');
  const openZero = () => { if (modal) modal.style.display = 'flex'; };
  const closeZero = () => { if (modal) modal.style.display = 'none'; };
  $('cardZeroSessionsTeachers')?.addEventListener('click', openZero);
  $('closeZeroSessionsModalBtn')?.addEventListener('click', closeZero);
  $('closeZeroSessionsModalBtn2')?.addEventListener('click', closeZero);
  modal?.addEventListener('click', (e) => { if (e.target.id === 'zeroSessionsModal') closeZero(); });

  document.querySelectorAll('#studentStatusFilterTabs .filter-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#studentStatusFilterTabs .filter-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderStudentFollowUp(btn.dataset.filter || 'all');
    });
  });

  const search = $('universalSearchInput');
  const drop = $('searchResultsDropdown');
  if (search && drop) {
    search.addEventListener('input', () => {
      const qv = search.value.trim().toLowerCase();
      if (!qv) { drop.style.display = 'none'; drop.innerHTML = ''; return; }
      const sHits = students.filter(s => [s.name, s.phone, s.parentPhone, s.id].some(v => String(v||'').toLowerCase().includes(qv))).slice(0,4);
      const tHits = teachers.filter(t => [t.name, t.phone, t.email].some(v => String(v||'').toLowerCase().includes(qv))).slice(0,3);
      if (!sHits.length && !tHits.length) { drop.style.display='none'; drop.innerHTML=''; return; }
      drop.style.display='block';
      drop.innerHTML = [
        ...sHits.map(s => `<a href="students.html?search=${encodeURIComponent(s.name||'')}" style="display:block;padding:.5rem .75rem;border-bottom:1px solid var(--border-color);text-decoration:none;color:inherit;"><strong>طالب:</strong> ${esc(s.name||'-')}</a>`),
        ...tHits.map(t => `<a href="teachers.html?search=${encodeURIComponent(t.name||'')}" style="display:block;padding:.5rem .75rem;border-bottom:1px solid var(--border-color);text-decoration:none;color:inherit;"><strong>معلم:</strong> ${esc(t.name||'-')}</a>`)
      ].join('');
    });
    document.addEventListener('click', (e) => { if (!search.contains(e.target) && !drop.contains(e.target)) drop.style.display='none'; });
  }
}

function subscribeData() {
  dataStore.subscribe('users', (list) => { teachers = (list||[]).filter(u => u.role === 'teacher').map(u => ({ ...u, uid: u.uid||u.id, id: u.id||u.uid })); scheduleRender(); });
  dataStore.subscribe('students', (list) => { students = list || []; scheduleRender(); });
  dataStore.subscribe('sessions', (list) => { sessions = list || []; scheduleRender(); }, { monthsBack: 8 });
  dataStore.subscribe('payments', (list) => { payments = list || []; scheduleRender(); });
  dataStore.subscribe('groups', (list) => { groups = list || []; scheduleRender(); });
}

const inMonth = (dateStr, month = selectedMonth) => typeof dateStr === 'string' && dateStr.startsWith(month);
const todayStr = () => new Date().toISOString().split('T')[0];

function renderAll() {
  renderKPIs();
  renderTodaySessions();
  renderStudentFollowUp(document.querySelector('#studentStatusFilterTabs .filter-tab-btn.active')?.dataset.filter || 'all');
  renderPayrollTable();
  renderCharts();
  renderZeroSessionsModal();
  if (window.lucide && !window.__adminDashboardIconsInit) { try { window.lucide.createIcons(); window.__adminDashboardIconsInit = true; } catch {} }
}

function getTopStudent(monthSessions) {
  const map = {};
  monthSessions.forEach(s => { if (s.status === 'completed' && s.studentId) map[s.studentId] = (map[s.studentId] || 0) + 1; });
  let best = null, count = 0;
  for (const [id, c] of Object.entries(map)) if (c > count) { count = c; best = id; }
  if (!best) return null;
  const st = students.find(s => (s.id || s.uid) === best);
  return { name: st?.name || 'طالب', count };
}

function isNeedRenewal(s) {
  const bal = parseInt(s.remainingSessions ?? s.balance ?? s.sessionsRemaining ?? 999);
  return !Number.isNaN(bal) && bal <= 1;
}

function renderKPIs() {
  const monthSessions = sessions.filter(s => inMonth(s.date));
  const monthPayments = payments.filter(p => inMonth(p.paymentDate || p.createdAt || p.date));
  const today = todayStr();
  const todayRevenue = payments.filter(p => String(p.paymentDate || p.createdAt || p.date || '').startsWith(today)).reduce((a,p)=>a+(parseFloat(p.amount)||0),0);
  const revenue = monthPayments.reduce((a,p)=>a+(parseFloat(p.amount)||0),0);

  let salaries = 0, executedHours = 0, scheduledHours = 0;
  const reconByTeacher = new Map();
  const teacherRows = teachers.map(t => {
    const tid = t.uid || t.id;
    const ts = sessions.filter(s => s.teacherId === tid);
    const recon = reconcileTeacherCurrentSalary(t, ts, groups, students, selectedMonth);
    reconByTeacher.set(tid, recon);
    const execH = (recon.includedMinutes || 0) / 60;
    const schedH = Number(recon.expectedHours || recon.expectedAnalytics?.expectedTotalHours || 0);
    const due = Number(recon.netCalculatedSalary || 0); // net = raw + bonuses - deductions, consistent with payroll reconciliation
    executedHours += execH; scheduledHours += schedH; salaries += due;
    return { t, execH, schedH, due, recon };
  });

  const net = revenue - salaries;
  setText('statTodayRevenue', `${fmt(todayRevenue)} ج.م`);
  setText('statNetProfitExecutive', `${fmt(net)} ج.م`);
  setText('statFinancialRevenue', `${fmt(revenue)} ج.م`);
  setText('statFinancialSalaries', `${fmt(salaries)} ج.م`);
  setText('statFinancialScheduledHours', `${scheduledHours.toFixed(1)} س`);
  setText('statFinancialCurrentDue', `${fmt(salaries)} ج.م`);
  setText('statFinancialExecutedHours', `${executedHours.toFixed(1)} س`);
  setText('statFinancialCompletionRate', `${(scheduledHours>0?executedHours/scheduledHours*100:0).toFixed(0)}%`);
  setText('statFinancialNetProfitFooter', `صافي الربح المتوقع: ${fmt(net)} ج.م`);
  setText('badgeFinancialMonth', selectedMonth);

  const top = [...teacherRows].sort((a,b)=>b.execH-a.execH)[0];
  if (top && top.execH > 0) { setText('statTopTeacherName', top.t.name || 'معلم'); setText('statTopTeacherDetails', `${top.execH.toFixed(1)} ساعة منجزة`); }
  else { setText('statTopTeacherName', teachers[0]?.name || '-'); setText('statTopTeacherDetails', 'بانتظار تسجيل الحصص'); }

  const topStudent = getTopStudent(monthSessions);
  setText('statTopStudentName', topStudent?.name || '-');
  setText('statTopStudentDetails', topStudent ? `${topStudent.count} حصة مكتملة` : 'بانتظار اعتماد الحصص');

  const activeStudents = students.filter(s => (s.status || 'active') === 'active').length;
  const needRenewal = students.filter(isNeedRenewal).length;
  setText('badgeTotalStudents', `${students.length} طالب`);
  setText('statTotalStudentsCount', fmt(students.length));
  setText('statActiveStudentsCount', fmt(activeStudents));
  setText('statInactiveStudentsCount', fmt(students.length - activeStudents));
  setText('statRenewalNeededCount', fmt(needRenewal));

  const approvedTeachers = teachers.filter(t => t.status === 'approved');
  const pendingTeachers = teachers.filter(t => t.status === 'pending').length;
  const todaySessions = sessions.filter(s => s.date === today);
  const zeroTeachers = approvedTeachers.filter(t => !todaySessions.some(s => s.teacherId === (t.uid||t.id)));
  setText('badgeOnlineTeachers', `${approvedTeachers.length} نشط`);
  setText('statTeachersTotalCount', fmt(teachers.length));
  setText('statTeachersPendingFooter', `${pendingTeachers} بانتظار الاعتماد`);
  setText('statTeachersActiveCount', fmt(approvedTeachers.length));
  setText('statTodaySessionsCount', fmt(todaySessions.length));
  setText('statZeroSessionsCount', fmt(zeroTeachers.length));

  const alerts = [];
  if (pendingTeachers > 0) alerts.push({c:'#f59e0b', t:`يوجد ${pendingTeachers} معلم بانتظار الاعتماد.`, h:'teachers.html'});
  if (needRenewal > 0) alerts.push({c:'#ef4444', t:`${needRenewal} طالب يحتاج تجديد/متابعة.`, h:'subscriptions.html'});
  if (todaySessions.length === 0) alerts.push({c:'#3b82f6', t:'لا توجد حصص مسجلة لليوم حتى الآن.', h:'today-sessions.html'});
  if (net < 0) alerts.push({c:'#ef4444', t:'صافي ربح الشهر سالب، راجع المصاريف/الرواتب.', h:'reports.html'});
  const alertsEl = $('smartAlertsContainer');
  if (alertsEl) alertsEl.innerHTML = alerts.length ? alerts.map(a=>`<a href="${a.h}" style="display:flex;align-items:center;gap:.5rem;padding:.6rem .75rem;border-radius:10px;background:var(--bg-card);border:1px solid var(--border-color);text-decoration:none;color:inherit;font-size:.85rem;"><span style="width:8px;height:8px;border-radius:50%;background:${a.c}"></span>${esc(a.t)}</a>`).join('') : '<div style="color:var(--text-muted);font-size:.85rem;">لا توجد تنبيهات حالياً.</div>';
}

function renderTodaySessions() {
  const today = todayStr();
  const list = sessions.filter(s => s.date === today).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
  let completed=0, exc=0, unexc=0, delayed=0;
  list.forEach(s => { if(s.status==='completed') completed++; else if(s.status==='student_absent'&&s.absenceType==='excused') exc++; else if(s.status==='student_absent'&&s.absenceType==='unexcused') unexc++; else if(['delayed','postponed','cancelled'].includes(s.status)) delayed++; });
  setText('dailyStatTotal', list.length); setText('dailyStatCompleted', completed); setText('dailyStatExcused', exc); setText('dailyStatUnexcused', unexc); setText('dailyStatDelayed', delayed);
  const tbody = $('todaySessionsTableBody'); if (!tbody) return;
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:1.25rem;">لا توجد حصص لليوم.</td></tr>'; return; }
  const tBy = Object.fromEntries(teachers.map(t=>[t.uid||t.id,t]));
  const sBy = Object.fromEntries(students.map(s=>[s.id||s.uid,s]));
  const statusMap = {completed:'مكتملة',student_absent:'غياب',delayed:'مؤجلة',postponed:'مؤجلة',cancelled:'ملغاة',scheduled:'مجدولة'};
  tbody.innerHTML = list.slice(0,20).map(s => {
    const t=tBy[s.teacherId], st=sBy[s.studentId];
    return `<tr><td>${esc(t?.name||'-')}</td><td>${esc(st?.name||s.groupName||'-')}</td><td>${esc(s.date||'-')} ${esc(s.time||'')}</td><td>${esc(String(s.duration||'-'))} د</td><td>${esc(statusMap[s.status]||s.status||'-')}</td><td>${s.approved?'<span style="color:#10b981">معتمدة</span>':'<span style="color:#f59e0b">قيد المراجعة</span>'}</td></tr>`;
  }).join('');
}

function renderStudentFollowUp(filter='all') {
  const tbody = $('studentFollowUpTableBody'); if (!tbody) return;
  const enriched = students.map(s => {
    const bal = parseInt(s.remainingSessions ?? s.balance ?? s.sessionsRemaining ?? 0);
    const teacher = teachers.find(t => (t.uid||t.id) === s.teacherId);
    let status='active', label='نشط', color='#10b981';
    if (bal < 0) { status='negative'; label='دين حصص'; color='#ef4444'; }
    else if (bal === 0) { status='zero'; label='يستحق الدفع'; color='#f59e0b'; }
    else if (bal <= 2) { status='low'; label='قارب على الانتهاء'; color='#f59e0b'; }
    return { s, bal, pkg: s.packageName||s.subscriptionType||'-', teacher, status, label, color };
  });
  const counts = {all:enriched.length, negative:enriched.filter(x=>x.status==='negative').length, zero:enriched.filter(x=>x.status==='zero').length, low:enriched.filter(x=>x.status==='low').length, active:enriched.filter(x=>x.status==='active').length};
  setText('countTabAll',counts.all); setText('countTabNegative',counts.negative); setText('countTabZero',counts.zero); setText('countTabLow',counts.low); setText('countTabActive',counts.active);
  const list = filter==='all' ? enriched : enriched.filter(x=>x.status===filter);
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:1rem;">لا توجد بيانات.</td></tr>'; return; }
  tbody.innerHTML = list.slice(0,30).map(x=>`<tr><td>${esc(x.s.name||'-')}</td><td>${esc(x.teacher?.name||'-')}</td><td>${esc(x.pkg)}</td><td>${Number.isNaN(x.bal)?'-':x.bal}</td><td><span style="color:${x.color};font-weight:700">${x.label}</span></td><td><a href="students.html?search=${encodeURIComponent(x.s.name||'')}" class="btn btn-sm btn-secondary">فتح</a></td></tr>`).join('');
}

function renderPayrollTable() {
  const tbody = $('teachersPayrollTableBody'); if (!tbody) return;
  const monthSessions = sessions.filter(s => inMonth(s.date));
  const approved = teachers.filter(t => t.status === 'approved');
  if (!approved.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:1.25rem;">لا توجد بيانات.</td></tr>'; return; }
  tbody.innerHTML = approved.slice(0,30).map(t => {
    const tid = t.uid||t.id;
    const recon = reconByTeacher.get(tid) || reconcileTeacherCurrentSalary(t, sessions.filter(s=>s.teacherId===tid), groups, students, selectedMonth);
    const exec = (recon.includedMinutes||0)/60;
    const sched = Number(recon.expectedHours || recon.expectedAnalytics?.expectedTotalHours || 0);
    const due = Number(recon.netCalculatedSalary||0);
    const expected = Number(recon.expectedSalary||0);
    const pct = sched>0 ? Math.round(exec/sched*100) : 0;
    return `<tr><td>${esc(t.name||'-')}</td><td>${sched.toFixed(1)}</td><td>${exec.toFixed(1)}</td><td>${pct}%</td><td>${fmt(t.hourlyRateIndividual||t.hourlyRate||100)}/س</td><td>${fmt(due)} ج.م</td><td>${fmt(expected)} ج.م</td><td><span style="color:${pct>=80?'#10b981':pct>=40?'#f59e0b':'#ef4444'}">${pct>=80?'منتظم':'يحتاج متابعة'}</span></td></tr>`;
  }).join('');
}

function renderZeroSessionsModal() {
  const c = $('zeroSessionsTeachersContainer'); if (!c) return;
  const today = todayStr();
  const todaySessions = sessions.filter(s => s.date === today);
  const zero = teachers.filter(t => t.status === 'approved' && !todaySessions.some(s => s.teacherId === (t.uid||t.id)));
  c.innerHTML = zero.length ? zero.map(t=>`<div style="display:flex;justify-content:space-between;padding:.5rem;border-bottom:1px solid var(--border-color)"><span>${esc(t.name||'-')}</span><span style="color:var(--text-muted);font-size:.8rem">${esc(t.phone||'')}</span></div>`).join('') : '<p style="text-align:center;color:var(--text-muted);padding:1rem;">جميع المعلمين سجلوا حصص اليوم.</p>';
}

function renderCharts() {
  if (typeof Chart === 'undefined') return;
  const months=[], rev=[], sal=[], netA=[], sessCounts=[], studCounts=[];
  for (let i=5; i>=0; i--) {
    const d = new Date(); d.setMonth(d.getMonth()-i);
    const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    months.push(d.toLocaleDateString('ar-EG',{month:'short'}));
    const ms = sessions.filter(s=>inMonth(s.date,m));
    const mp = payments.filter(p=>inMonth(p.paymentDate||p.createdAt||p.date,m));
    const r = mp.reduce((a,p)=>a+(parseFloat(p.amount)||0),0);
    const sals = teachers.filter(t=>t.status==='approved').reduce((acc,t)=>acc + Number(reconcileTeacherCurrentSalary(t, sessions.filter(x=>x.teacherId===(t.uid||t.id)), groups, students, m).netCalculatedSalary||0),0);
    rev.push(r); sal.push(sals); netA.push(r-sals); sessCounts.push(ms.length);
  }
  for (let i=5; i>=0; i--) { const d=new Date(); d.setMonth(d.getMonth()-i); const end=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-31`; const c=students.filter(s=>String(s.createdAt||s.created_at||'').slice(0,10)<=end).length; studCounts.push(c || (i===0?students.length:0)); }
  upsert('chartRevenue6Months','line',{labels:months,datasets:[{label:'الدخل',data:rev,borderColor:'#0f766e',backgroundColor:'rgba(15,118,110,.1)',fill:true,tension:.3}]},{plugins:{legend:{display:false}}});
  upsert('chartFinancialBalance','bar',{labels:months,datasets:[{label:'الدخل',data:rev,backgroundColor:'#0f766e'},{label:'المرتبات',data:sal,backgroundColor:'#f59e0b'},{label:'صافي الربح',data:netA,backgroundColor:'#3b82f6'}]},{});
  upsert('chartSessionsMonthly','bar',{labels:months,datasets:[{label:'الحصص',data:sessCounts,backgroundColor:'#8b5cf6'}]},{plugins:{legend:{display:false}}});
  upsert('chartStudentsGrowth','line',{labels:months,datasets:[{label:'الطلاب',data:studCounts,borderColor:'#10b981',backgroundColor:'rgba(16,185,129,.1)',fill:true,tension:.3}]},{plugins:{legend:{display:false}}});
}

function upsert(id,type,data,extra={}){
  const el=$(id); if(!el) return;
  const opts={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true}},scales:{y:{beginAtZero:true}},...extra};
  if(charts[id]){ charts[id].data=data; charts[id].options=opts; charts[id].update('none'); }
  else charts[id]=new Chart(el,{type,data,options:opts});
}
