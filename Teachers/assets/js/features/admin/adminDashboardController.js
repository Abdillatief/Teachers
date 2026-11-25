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

let teachers = [], students = [], sessions = [], payments = [], expenses = [], groups = [], salaryArchive = [];
let balanceByStudent = new Map();
let reconByTeacher = new Map();
let selectedMonth = localMonthKey(new Date());
let charts = {};
let renderQueued = false;
let initialized = false;
let forcedRender = false;
let renderFallbackTimer = null;
const dataUnsubs = [];

// KPI cards must never be painted from a partially hydrated cache, otherwise
// the totals visibly jump (e.g. salaries 156 then 15,295).
const REQUIRED_COLLECTIONS = ['users', 'students', 'sessions', 'payments', 'groups', 'studentBalances', 'salaryArchive'];
function coreDataReady() {
  return REQUIRED_COLLECTIONS.every(key => dataStore.loadedCollections.has(key) || dataStore.getError(key));
}

function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function localMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function toYMD(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (typeof value === 'number' && Number.isFinite(value)) return localDate(new Date(value));
  if (typeof value.toDate === 'function') return localDate(value.toDate());
  if (typeof value.seconds === 'number') return localDate(new Date(value.seconds * 1000));
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : localDate(parsed);
}
// كل listener بينادي renderAll، وعند التحميل بيوصل 8 snapshots ورا بعض.
// التأخير القصير ده بيجمعهم في رسمة واحدة بدل 8 رسمات كاملة.
function scheduleRender(){
  if (renderQueued) return;
  renderQueued = true;
  setTimeout(() => { renderQueued = false; renderAll(); }, 120);
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
  if (initialized) return;
  initialized = true;
  initMonthPicker();
  bindUI();
  try { initCommunityDashboardWidget('adminCommunityWidgetContainer', 'admin'); } catch (e) { console.error('[Dashboard] community widget failed', e); }
  subscribeData();
  // الـbackfill بيعمل ٤ قراءات كاملة للمجموعات ويكتب الـprojections الناقصة،
  // فمينفعش يعطّل أول رسم للوحة التحكم. بيشتغل في الخلفية بعد بدء الاشتراكات.
  backfillOperationalProjectionsIfNeeded().catch((e) => console.warn('[Dashboard] projections backfill failed', e));
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
  // Supervisors are a separate role and are not teachers: they must not appear
  // in teacher counts, the payroll table or payroll totals.
  dataUnsubs.push(dataStore.subscribe('users', (list) => { teachers = (list||[]).filter(u => u.role === 'teacher').map(u => ({ ...u, uid: u.uid||u.id, id: u.id||u.uid })); scheduleRender(); }));
  dataUnsubs.push(dataStore.subscribe('students', (list) => { students = list || []; scheduleRender(); }));
  dataUnsubs.push(dataStore.subscribe('sessions', (list) => { sessions = list || []; scheduleRender(); }, { monthsBack: 8 }));
  dataUnsubs.push(dataStore.subscribe('payments', (list) => { payments = list || []; scheduleRender(); }));
  dataUnsubs.push(dataStore.subscribe('expenses', (list) => { expenses = list || []; scheduleRender(); }));
  // أرشيف الرواتب = الرواتب المصروفة فعليًا (بالشهر اللي اتحولت فيه)
  dataUnsubs.push(dataStore.subscribe('salaryArchive', (list) => { salaryArchive = list || []; scheduleRender(); }));
  dataUnsubs.push(dataStore.subscribe('groups', (list) => { groups = list || []; scheduleRender(); }));
  dataUnsubs.push(dataStore.subscribe('studentBalances', (list) => {
    balanceByStudent = new Map((list || []).filter(b => b && (b.id || b.studentId)).map(b => [b.id || b.studentId, b]));
    scheduleRender();
  }));
  window.addEventListener('pagehide', () => dataUnsubs.forEach(fn => { try { fn(); } catch {} }), { once: true });
}

const inMonth = (value, month = selectedMonth) => toYMD(value).startsWith(month);
// الرواتب المصروفة فعليًا خلال الشهر: بنعتمد على تاريخ الأرشفة/التحويل
// (salaryArchive.createdAt) لأن دورة الشهر الجديد بتتصرف بداية الشهر التالي.
const isPaidPayout = (a) => {
  const s = String(a?.status || '').toLowerCase();
  return !s || s === 'paid' || s === 'completed' || s === 'transferred';
};
const paidSalariesInMonth = (month) => (salaryArchive || [])
  .filter(a => isPaidPayout(a) && inMonth(a.createdAt || a.paidAt || a.transferDate || a.date, month))
  .reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
// نفس تعريف صفحة المالية: أي إيصال ملغي/مسترد لا يدخل في الإيرادات.
const isCancelledPayment = (p) => {
  const s = String(p?.paymentStatus || p?.status || '').toLowerCase();
  return p?.isRefunded === true || p?.refunded === true || ['cancelled', 'canceled', 'refunded', 'void', 'failed', 'rejected'].includes(s);
};
const todayStr = () => localDate();

function renderAll() {
  if (!forcedRender && !coreDataReady()) {
    if (!renderFallbackTimer) {
      renderFallbackTimer = setTimeout(() => { forcedRender = true; renderAll(); }, 15000);
    }
    return;
  }
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

// Single source of truth for a student's lesson credit: the consolidated
// studentBalances/{studentId} document written by creditManager. The student
// document fields are only a fallback for legacy records.
function getStudentCredit(s) {
  const id = s.id || s.uid;
  const doc = id ? balanceByStudent.get(id) : null;
  const raw = doc
    ? (doc.remainingLessons ?? doc.remainingSessions)
    : (s.remainingLessons ?? s.remainingSessions ?? s.balance);
  const remaining = Number(raw);
  const known = raw !== undefined && raw !== null && raw !== '' && Number.isFinite(remaining);
  return { known, remaining: known ? remaining : null, doc };
}

function creditStatus(s) {
  const { known, remaining } = getStudentCredit(s);
  if (!known) return { status: 'unknown', label: 'رصيد غير محدد', color: 'var(--text-muted)' };
  if (remaining < 0) return { status: 'negative', label: 'دين حصص', color: '#ef4444' };
  if (remaining === 0) return { status: 'zero', label: 'يستحق الدفع', color: '#f59e0b' };
  if (remaining === 1) return { status: 'low', label: 'قارب على الانتهاء', color: '#f59e0b' };
  return { status: 'active', label: 'نشط', color: '#10b981' };
}

function isNeedRenewal(s) {
  const st = creditStatus(s).status;
  return st === 'negative' || st === 'zero' || st === 'low';
}

const AR_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
const toArabicDigits = (v) => String(v).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);

// Stored session times are a mix of "17:30", "05:30 مساءً" and "6:03 م".
function parseClock(raw) {
  const str = String(raw || '').trim();
  const m = str.match(/^(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  let h = Number(m[1]);
  const mins = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mins) || h > 23 || mins > 59) return null;
  const isPm = /(مساء|pm)/i.test(str);
  const isAm = /(صباح|am)/i.test(str);
  if (isPm && h < 12) h += 12;
  if (isAm && h === 12) h = 0;
  return { h: h % 24, m: mins };
}

function formatTimeAr(raw) {
  const c = parseClock(raw);
  if (!c) return String(raw || '');
  const h12 = c.h % 12 === 0 ? 12 : c.h % 12;
  return `${toArabicDigits(String(h12).padStart(2, '0'))}:${toArabicDigits(String(c.m).padStart(2, '0'))} ${c.h < 12 ? 'ص' : 'م'}`;
}

function formatDateAr(value) {
  const s = String(value || '').slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
}

function renderKPIs() {
  const monthSessions = sessions.filter(s => inMonth(s.date));
  const monthPayments = payments.filter(p => inMonth(p.paymentDate || p.createdAt || p.date));
  const today = todayStr();
  const todayRevenue = payments.filter(p => !isCancelledPayment(p) && toYMD(p.paymentDate || p.createdAt || p.date) === today).reduce((a,p)=>a+(parseFloat(p.amount)||0),0);
  const revenue = monthPayments.filter(p => !isCancelledPayment(p)).reduce((a,p)=>a+(parseFloat(p.amount)||0),0);
  const monthExpenses = expenses.filter(e => inMonth(e.date || e.createdAt || e.paymentDate));
  const totalExpenses = monthExpenses.reduce((a,e)=>a+(parseFloat(e.amount)||0),0);

  let salaries = 0, expectedSalaries = 0, executedHours = 0, scheduledHours = 0;
  let net = 0;
  reconByTeacher = new Map();
  // Payroll aggregates must cover exactly the teachers shown in the payroll
  // table (approved only), otherwise the KPI totals never match the rows.
  const payrollTeachers = teachers.filter(t => t.status === 'approved');
  const teacherRows = payrollTeachers.map(t => {
    const tid = t.uid || t.id;
    // كل الحصص: المحرك نفسه بيفلترها للمعلم (teacherId/teacherUid/الاسم/الإيميل).
    // الفلترة المسبقة بـ teacherId كانت بتسقط حصص مسجلة باسم المعلم بس.
    const recon = reconcileTeacherCurrentSalary(t, sessions, groups, students, selectedMonth);
    reconByTeacher.set(tid, recon);
    const execH = Number(recon.includedHours || 0);
    const schedH = Number(recon.expectedHours || recon.expectedAnalytics?.expectedTotalHours || 0);
    const due = Number(recon.netCalculatedSalary || 0);
    executedHours += execH; scheduledHours += schedH; salaries += due;
    expectedSalaries += Number(recon.expectedSalary || 0);
    return { t, execH, schedH, due, recon };
  });
  // صافي ربح الشهر = التحصيل الفعلي − الرواتب المصروفة فعليًا في الشهر − المصاريف.
  // الرواتب المحسوبة (salaries) بتفضل معروضة كـ«المستحق الحالي» لحد ما تتصرف وتتأرشف.
  const paidSalaries = paidSalariesInMonth(selectedMonth);
  net = revenue - paidSalaries - totalExpenses;

  setText('statTodayRevenue', `${fmt(todayRevenue)} ج.م`);
  setText('statNetProfitExecutive', `${fmt(net)} ج.م`);
  setText('statFinancialRevenue', `${fmt(revenue)} ج.م`);
  setText('statFinancialSalaries', `${fmt(expectedSalaries)} ج.م`);
  setText('statFinancialScheduledHours', `${scheduledHours.toFixed(1)} س`);
  setText('statFinancialCurrentDue', `${fmt(salaries)} ج.م`);
  setText('statFinancialExecutedHours', `${executedHours.toFixed(1)} س`);
  setText('statFinancialCompletionRate', `${(scheduledHours>0?executedHours/scheduledHours*100:0).toFixed(0)}%`);
  setText('statFinancialNetProfitFooter', `صافي الربح الفعلي: ${fmt(net)} ج.م (رواتب مصروفة ${fmt(paidSalaries)})`);
  const [selY, selM] = selectedMonth.split('-').map(Number);
  setText('badgeFinancialMonth', new Date(selY, selM - 1, 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }));

  // Must use the same executed hours as the payroll table, otherwise the
  // headline figure contradicts the teacher's own row.
  const top = [...teacherRows].sort((a,b)=>(b.execH||0)-(a.execH||0))[0];
  if (top && (top.execH||0) > 0) { setText('statTopTeacherName', top.t.name || 'معلم'); setText('statTopTeacherDetails', `${(top.execH||0).toFixed(1)} ساعة منجزة`); }
  else { setText('statTopTeacherName', '-'); setText('statTopTeacherDetails', 'لا توجد حصص منفذة هذا الشهر'); }

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
  const clockKey = (s) => { const c = parseClock(s.time); return c ? c.h * 60 + c.m : 24 * 60; };
  const list = sessions.filter(s => toYMD(s.date) === today).sort((a,b)=>clockKey(a)-clockKey(b));
  let completed=0, exc=0, unexc=0, delayed=0;
  list.forEach(s => { if(s.status==='completed'||s.status==='compensatory') completed++; else if(s.status==='student_absent'&&s.absenceType==='excused') exc++; else if(s.status==='student_absent'&&s.absenceType==='unexcused') unexc++; else if(['delayed','postponed','cancelled'].includes(s.status)) delayed++; });
  setText('dailyStatTotal', list.length); setText('dailyStatCompleted', completed); setText('dailyStatExcused', exc); setText('dailyStatUnexcused', unexc); setText('dailyStatDelayed', delayed);
  const tbody = $('todaySessionsTableBody'); if (!tbody) return;
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:1.25rem;">لا توجد حصص لليوم.</td></tr>'; return; }
  const tBy = Object.fromEntries(teachers.map(t=>[t.uid||t.id,t]));
  const sBy = Object.fromEntries(students.map(s=>[s.id||s.uid,s]));
  const statusMap = {completed:'مكتملة',compensatory:'تعويضية',student_absent:'غياب طالب',teacher_absent:'غياب معلم',delayed:'مؤجلة',postponed:'مؤجلة',cancelled:'ملغاة',scheduled:'مجدولة'};
  const typeLabel = (s) => {
    const raw = String(s.sessionType || s.type || (s.groupId ? 'group' : 'individual')).toLowerCase();
    if (raw.includes('group') || raw.includes('جماع')) return 'جماعية';
    if (raw.includes('trial') || raw.includes('تجريب')) return 'تجريبية';
    if (raw.includes('compens') || raw.includes('تعويض')) return 'تعويضية';
    return 'فردية';
  };
  tbody.innerHTML = list.slice(0,20).map(s => {
    const t=tBy[s.teacherId], st=sBy[s.studentId];
    return `<tr><td>${esc(t?.name||'-')}</td><td>${esc(st?.name||s.groupName||'-')}</td><td>${esc(formatDateAr(s.date))} — ${esc(formatTimeAr(s.time))}</td><td>${esc(String(s.duration||'-'))} د · ${esc(typeLabel(s))}</td><td>${esc(statusMap[s.status]||s.status||'-')}</td><td>${s.approved?'<span style="color:#10b981">معتمدة</span>':'<span style="color:#f59e0b">قيد المراجعة</span>'}</td></tr>`;
  }).join('');
}

function renderStudentFollowUp(filter='all') {
  const tbody = $('studentFollowUpTableBody'); if (!tbody) return;
  const teacherById = new Map(teachers.map(t => [t.uid || t.id, t]));
  const enriched = students.map(s => {
    const credit = getStudentCredit(s);
    const teacher = teacherById.get(s.teacherId);
    const { status, label, color } = creditStatus(s);
    const pkg = credit.doc?.activePackageName || s.packageName || s.subscriptionType || '-';
    return { s, bal: credit.remaining, pkg, teacher, status, label, color };
  });
  const counts = {
    all: enriched.length,
    negative: enriched.filter(x=>x.status==='negative').length,
    zero: enriched.filter(x=>x.status==='zero').length,
    low: enriched.filter(x=>x.status==='low').length,
    active: enriched.filter(x=>x.status==='active').length,
    unknown: enriched.filter(x=>x.status==='unknown').length
  };
  setText('countTabAll',counts.all); setText('countTabNegative',counts.negative); setText('countTabZero',counts.zero); setText('countTabLow',counts.low); setText('countTabActive',counts.active); setText('countTabUnknown',counts.unknown);
  const list = filter==='all' ? enriched : enriched.filter(x=>x.status===filter);
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:1rem;">لا توجد بيانات.</td></tr>'; return; }
  tbody.innerHTML = list.slice(0,30).map(x=>`<tr><td>${esc(x.s.name||'-')}</td><td>${esc(x.teacher?.name||'-')}</td><td>${esc(x.pkg)}</td><td>${x.bal === null ? '—' : toArabicDigits(x.bal)}</td><td><span style="color:${x.color};font-weight:700">${x.label}</span></td><td><a href="students.html?search=${encodeURIComponent(x.s.name||'')}" class="btn btn-sm btn-secondary">فتح</a></td></tr>`).join('');
}

function renderPayrollTable() {
  const tbody = $('teachersPayrollTableBody'); if (!tbody) return;
  const monthSessions = sessions.filter(s => inMonth(s.date));
  const approved = teachers.filter(t => t.status === 'approved');
  if (!approved.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:1.25rem;">لا توجد بيانات.</td></tr>'; return; }
  tbody.innerHTML = approved.slice(0,30).map(t => {
    const tid = t.uid||t.id;
    const recon = reconByTeacher.get(tid) || reconcileTeacherCurrentSalary(t, sessions, groups, students, selectedMonth);
    const exec = Number(recon.includedHours||0);
    const sched = Number(recon.expectedHours || recon.expectedAnalytics?.expectedTotalHours || 0);
    const due = Number(recon.netCalculatedSalary||0);
    const expected = Number(recon.expectedSalary||0);
    const pct = sched>0 ? Math.round(exec/sched*100) : 0;
    const rate = Number(t.hourlyRateIndividual || t.hourlyRate || 0);
    const groupRate = Number(t.hourlyRateGroup || t.hourlyRateIndividual || t.hourlyRate || 0);
    const rateLabel = rate > 0 && groupRate > 0 && groupRate !== rate
      ? `${fmt(rate)}/س · جماعية ${fmt(groupRate)}/س`
      : (rate > 0 ? `${fmt(rate)}/س` : 'غير محدد');
    const nameLabel = esc(t.name||'-');
    return `<tr><td>${nameLabel}</td><td>${sched.toFixed(1)}</td><td>${exec.toFixed(1)}</td><td>${pct}%</td><td>${rateLabel}</td><td>${fmt(due)} ج.م</td><td>${fmt(expected)} ج.م</td><td><span style="color:${pct>=80?'#10b981':pct>=40?'#f59e0b':'#ef4444'}">${pct>=80?'منتظم':'يحتاج متابعة'}</span></td></tr>`;
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
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = localMonthKey(d);
    months.push(d.toLocaleDateString('ar-EG',{month:'short'}));
    const ms = sessions.filter(s=>inMonth(s.date,m));
    const mp = payments.filter(p=>inMonth(p.paymentDate||p.createdAt||p.date,m));
    const r = mp.reduce((a,p)=>a+(parseFloat(p.amount)||0),0);
    const sals = paidSalariesInMonth(m);
    const exps = expenses.filter(e=>inMonth(e.date||e.createdAt||e.paymentDate,m)).reduce((a,e)=>a+(parseFloat(e.amount)||0),0);
    rev.push(r); sal.push(sals); netA.push(r-sals-exps); sessCounts.push(ms.length);
  }
  for (let i=5; i>=0; i--) {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-31`;
    const c = students.filter(s => { const ymd = toYMD(s.createdAt || s.created_at); return ymd && ymd <= end; }).length;
    studCounts.push(c);
  }
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
