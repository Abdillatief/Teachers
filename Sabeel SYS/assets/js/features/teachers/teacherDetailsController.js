import '../../shared/utils/jsonShield.js';
import { protectRoute } from '../auth/authService.js';
import { renderSidebar } from '../../shared/components/sidebar.js';
import { renderNavbar } from '../../shared/components/navbar.js';
import { db } from '../../config/firebase.js';
import { doc, getDoc, getDocs, collection, query, where, orderBy, limit, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { reconcileTeacherCurrentSalary } from '../payroll/payrollReconciliationEngine.js';
import { Toast } from '../../shared/utils/toast.js';

protectRoute('admin');
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Number(n||0).toLocaleString('ar-EG');
const teacherId = new URLSearchParams(location.search).get('id') || new URLSearchParams(location.search).get('teacherId');
let teacher = null, sessions = [], students = [], payouts = [], groups = [];

init();

async function init(){
  renderSidebar('teachers','admin');
  renderNavbar('تفاصيل المعلم', {name:'الإدارة', roleName:'مدير الأكاديمية'});
  bindUI();
  if(!teacherId){ Toast.error('لم يتم تحديد المعلم.'); setText('headerName','معلم غير محدد'); return; }
  await loadTeacher();
  await Promise.all([loadStudents(), loadSessions(), loadPayouts(), loadGroups()]);
  renderAll();
  if(window.lucide) try{window.lucide.createIcons();}catch{}
}

function getTabBtns(){ return [...document.querySelectorAll('.nav-tab, .tab-item-btn, [data-tab], [data-tab-id]')]; }
function getTabId(btn){ return btn?.dataset?.tab || btn?.dataset?.tabId || ''; }
function getTabPanes(){ return [...document.querySelectorAll('.tab-content, .tab-pane, .tab-section, [id^="tab-"]')].filter(el=>el.id && /^tab-/.test(el.id)); }

function bindUI(){
  getTabBtns().forEach(btn=>btn.addEventListener('click',()=>switchTab(getTabId(btn))));
  $('btnToggleStatus')?.addEventListener('click', toggleStatus);
  $('btnDeleteTeacher')?.addEventListener('click', deleteTeacher);
  $('btnResetPassword')?.addEventListener('click', ()=>Toast.info('إعادة تعيين كلمة المرور تتم من إعدادات المصادقة حسب صلاحيات النظام.'));
  $('editProfileForm')?.addEventListener('submit', saveProfile);
  $('formUpdateRates')?.addEventListener('submit', saveRates);
  $('formUploadPayoutProof')?.addEventListener('submit', uploadPayoutProof);
  $('formAdminChannels')?.addEventListener('submit', saveChannels);
  $('filterSessionMonth')?.addEventListener('change', renderSessions);
  $('btnClearSessionMonth')?.addEventListener('click', ()=>{ const m=$('filterSessionMonth'); if(m) m.value=''; renderSessions(); });
  $('searchAuditInput')?.addEventListener('input', renderAuditPlaceholder);
  $('filterAuditCategory')?.addEventListener('change', renderAuditPlaceholder);
  window.closeImgModal = ()=>{ const m=$('imgPreviewModal'); if(m) m.classList.remove('active'); };
  const initialTab = new URLSearchParams(location.search).get('tab');
  if (initialTab) switchTab(initialTab);
}

function switchTab(tab){
  if(!tab) return;
  const normalized = tab.startsWith('tab-') ? tab : 'tab-' + tab;
  getTabBtns().forEach(b=>{
    const id=getTabId(b);
    b.classList.toggle('active', id===tab || id===normalized || id===tab.replace(/^tab-/, ''));
  });
  getTabPanes().forEach(c=>{
    const match = c.id===tab || c.id===normalized;
    c.classList.toggle('active', match);
    c.style.display = match ? '' : 'none';
  });
  if(window.lucide) try{window.lucide.createIcons();}catch{}
}

function setText(id,v){ const el=$(id); if(el) el.textContent = v ?? '-'; }
function val(id,v){ const el=$(id); if(el) el.value = v ?? ''; }

async function loadTeacher(){
  const snap = await getDoc(doc(db,'users',teacherId));
  if(!snap.exists()){ Toast.error('المعلم غير موجود.'); return; }
  teacher = { id:snap.id, uid:snap.id, ...snap.data() };
}

async function loadStudents(){
  try {
    const snap = await getDocs(query(collection(db,'students'), where('teacherId','==',teacherId)));
    students = snap.docs.map(d=>({id:d.id,...d.data()}));
  } catch {
    try{ const snap=await getDocs(collection(db,'students')); students=snap.docs.map(d=>({id:d.id,...d.data()})).filter(s=>s.teacherId===teacherId); }catch{ students=[]; }
  }
}

async function loadSessions(){
  try {
    const snap = await getDocs(query(collection(db,'sessions'), where('teacherId','==',teacherId), orderBy('date','desc'), limit(200)));
    sessions = snap.docs.map(d=>({id:d.id,...d.data()}));
  } catch {
    try{ const snap=await getDocs(query(collection(db,'sessions'), where('teacherId','==',teacherId), limit(200))); sessions=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))); }catch{ sessions=[]; }
  }
}


async function loadGroups(){
  try {
    const snap = await getDocs(query(collection(db,'groups'), where('teacherId','==',teacherId)));
    groups = snap.docs.map(d=>({id:d.id,...d.data()}));
  } catch {
    try { const snap=await getDocs(collection(db,'groups')); groups=snap.docs.map(d=>({id:d.id,...d.data()})).filter(g=>g.teacherId===teacherId); } catch { groups=[]; }
  }
}
async function loadPayouts(){
  try {
    const snap = await getDocs(query(collection(db,'payouts'), where('teacherId','==',teacherId)));
    payouts = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.month||b.createdAt||'').localeCompare(String(a.month||a.createdAt||'')));
  } catch { payouts=[]; }
}

function renderAll(){
  if(!teacher) return;
  setText('breadcrumbTeacherName', teacher.name||'-');
  setText('headerName', teacher.name||'-');
  setText('headerEmail', teacher.email||'-');
  setText('headerPhone', teacher.phone||'-');
  setText('headerSubject', teacher.subject ? `المادة: ${teacher.subject}` : 'المادة: -');
  const target = teacher.targetMonthlyHours || teacher.monthlyTargetHours;
  setText('headerTargetHours', target ? `الهدف الشهري: ${target} ساعة` : 'الهدف الشهري: -');
  const last = teacher.lastLoginAt?.toDate ? teacher.lastLoginAt.toDate().toLocaleString('ar-EG') : (teacher.lastLogin || 'غير متوفر');
  setText('headerLastLogin', `آخر دخول: ${last}`);
  const status = teacher.status || 'pending';
  const badge = $('headerStatusBadge');
  if(badge){ badge.textContent = status==='approved'?'نشط':status==='suspended'?'موقوف':'قيد المراجعة'; badge.className = 'badge ' + (status==='approved'?'badge-success':status==='suspended'?'badge-danger':'badge-warning'); }
  const avatar = $('headerAvatar'); if(avatar) avatar.textContent = (teacher.name||'م').trim()[0] || 'م';
  setText('lblToggleStatus', status==='suspended'?'تفعيل الحساب':'تعطيل الحساب');
  setText('cardJoinDate', teacher.createdAt?.toDate ? teacher.createdAt.toDate().toLocaleDateString('ar-EG') : (String(teacher.createdAt||'').slice(0,10)||'-'));
  setText('cardUid', teacher.id);
  setText('cardStudentsCount', String(students.length));
  val('profName', teacher.name||''); val('profEmail', teacher.email||''); val('profPhone', teacher.phone||''); val('profSubject', teacher.subject||''); val('profNotes', teacher.notes||'');
  renderFinance(); renderChannels(); renderStudentsTable(); renderSessions(); renderPayouts(); renderAuditPlaceholder();
}

function renderFinance(){
  const month = new Date().toISOString().slice(0,7);
  const allSessions = sessions; // teacher sessions already loaded
  const recon = reconcileTeacherCurrentSalary(teacher || {}, allSessions, groups, students, month);
  const ms = allSessions.filter(s=>String(s.date||'').startsWith(month));
  const bonuses=parseFloat(teacher?.salaryBonuses||teacher?.bonuses||0);
  const deductions=parseFloat(teacher?.salaryDeductions||teacher?.deductions||0);
  const net = recon.netCalculatedSalary ?? 0;
  const execH = (recon.includedMinutes||0)/60;
  const schedH = (recon.expectedHours ?? recon.expectedAnalytics?.expectedTotalHours ?? 0);
  const totalSessions = recon.includedSessionsCount ?? 0;
  const due = recon.rawCalculatedSalary ?? 0;

  setText('kpiNetSalary', fmt(net)+' ج.م');
  setText('kpiTotalHours', execH.toFixed(1)+' س');
  setText('kpiSubHours', ((recon.excludedSessionsCount||0)) + ' مستبعدة');
  setText('kpiTotalSessions', String(ms.length));
  setText('kpiPreferredMethod', teacher?.paymentMethod||'-');
  setText('kpiLastUpdatedFinancial', teacher?.financialUpdatedAt ? String(teacher.financialUpdatedAt).slice(0,10) : '-');
  setText('kpiExpectedHours', Number(schedH).toFixed(1)+' س');
  setText('kpiExpectedSalary', fmt(recon.expectedSalary||0)+' ج.م');

  const indRate=parseFloat(teacher?.hourlyRateIndividual||teacher?.hourlyRate||100);
  const grpRate=parseFloat(teacher?.hourlyRateGroup||teacher?.hourlyRate||120);
  const indH=(recon.includedIndividualMinutes||0)/60;
  const grpH=(recon.includedGroupMinutes||0)/60;
  setText('tblRateInd', fmt(indRate)); setText('tblHoursInd', indH.toFixed(1)); setText('tblGrossInd', fmt(recon.individualCalculatedSalary||0));
  setText('tblRateGrp', fmt(grpRate)); setText('tblHoursGrp', grpH.toFixed(1)); setText('tblGrossGrp', fmt(recon.groupCalculatedSalary||0));
  setText('tblBonuses', fmt(bonuses)); setText('tblDeductions', fmt(deductions));
  setText('tblExpectedTotalHours', Number(schedH).toFixed(1)); setText('tblExpectedSalaryVal', fmt(recon.expectedSalary||0));
  val('inputRateInd', indRate); val('inputRateGrp', grpRate); val('inputTargetHours', teacher?.targetMonthlyHours||teacher?.monthlyTargetHours||''); val('inputBonuses', bonuses); val('inputDeductions', deductions);
}

function renderChannels(){
  val('chnVodafone', teacher.vodafoneCash||teacher.vodafone||''); val('chnInstapay', teacher.instapay||teacher.instaPay||''); val('chnBankAccount', teacher.bankAccount||''); val('chnPreferred', teacher.paymentMethod||''); setText('chnLastTeacherUpdate', teacher.channelsUpdatedAt?String(teacher.channelsUpdatedAt).slice(0,16):'--');
}

function renderStudentsTable(){
  const tb=$('tblAssignedStudents'); if(!tb) return;
  if(!students.length){ tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--text-muted)">لا يوجد طلاب.</td></tr>'; return; }
  tb.innerHTML = students.slice(0,100).map(s=>`<tr><td>${esc(s.name||'-')}</td><td>${esc(s.packageName||s.subscriptionType||'-')}</td><td>${esc(String(s.remainingSessions??s.balance??'-'))}</td><td>${esc(s.status||'active')}</td><td><a href="students.html?search=${encodeURIComponent(s.name||'')}" class="btn btn-sm btn-secondary">فتح</a></td></tr>`).join('');
}

function renderSessions(){
  const tb=$('tblTeacherSessions'); if(!tb) return;
  const month=$('filterSessionMonth')?.value||'';
  const list = month ? sessions.filter(s=>String(s.date||'').startsWith(month)) : sessions;
  if(!list.length){ tb.innerHTML='<tr><td colspan="6" style="text-align:center;padding:1rem;color:var(--text-muted)">لا توجد حصص.</td></tr>'; return; }
  const sBy=Object.fromEntries(students.map(s=>[s.id,s]));
  tb.innerHTML = list.slice(0,100).map(s=>`<tr><td>${esc(s.date||'-')}</td><td>${esc(sBy[s.studentId]?.name||s.groupName||'-')}</td><td>${esc(String(s.duration||'-'))} د</td><td>${esc(s.status||'-')}</td><td>${s.approved?'معتمدة':'قيد المراجعة'}</td><td>-</td></tr>`).join('');
}

function renderPayouts(){
  const tb=$('tblTeacherSalaryArchive'); if(!tb) return;
  if(!payouts.length){ tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--text-muted)">لا توجد عمليات صرف.</td></tr>'; return; }
  tb.innerHTML=payouts.map(p=>`<tr><td>${esc(p.month||'-')}</td><td>${fmt(p.amount)} ج.م</td><td>${esc(p.method||'-')}</td><td>${esc(p.note||p.notes||'-')}</td><td>${p.proofUrl?`<a href="${esc(p.proofUrl)}" target="_blank">عرض</a>`:'-'}</td></tr>`).join('');
}

function renderAuditPlaceholder(){
  const tb=$('tblAuditLog'); if(!tb) return;
  tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--text-muted)">سجل التدقيق التفصيلي سيظهر هنا عند توفر بيانات audit logs.</td></tr>';
  setText('auditStatHoursChange','--'); setText('auditStatAbsenceChange','--'); setText('auditStatGroupsChange','--'); setText('auditStatMaxConsecAbsence','--');
}

async function toggleStatus(){
  if(!teacher) return;
  const next = teacher.status==='suspended' ? 'approved' : 'suspended';
  try{ await updateDoc(doc(db,'users',teacher.id), {status:next, updatedAt:serverTimestamp()}); teacher.status=next; Toast.success('تم تحديث الحالة.'); renderAll(); }catch(e){ console.error(e); Toast.error('تعذر تحديث الحالة.'); }
}

async function deleteTeacher(){
  if(!teacher || !confirm('هل أنت متأكد من أرشفة هذا المعلم؟')) return;
  try{ await updateDoc(doc(db,'users',teacher.id), {status:'deleted', deletedAt:serverTimestamp()}); Toast.success('تمت أرشفة المعلم.'); location.href='teachers.html'; }catch(e){ console.error(e); Toast.error('تعذر تنفيذ العملية.'); }
}

async function saveProfile(e){
  e.preventDefault(); if(!teacher) return;
  try{
    const payload={ name:$('profName').value.trim(), email:$('profEmail').value.trim(), phone:$('profPhone').value.trim(), subject:$('profSubject').value.trim(), notes:$('profNotes').value.trim(), updatedAt:serverTimestamp() };
    await updateDoc(doc(db,'users',teacher.id), payload); Object.assign(teacher,payload); Toast.success('تم حفظ بيانات المعلم.'); renderAll();
  }catch(e){ console.error(e); Toast.error('تعذر الحفظ.'); }
}

async function saveRates(e){
  e.preventDefault(); if(!teacher) return;
  try{
    const payload={ hourlyRateIndividual:parseFloat($('inputRateInd').value)||0, hourlyRateGroup:parseFloat($('inputRateGrp').value)||0, targetMonthlyHours:parseFloat($('inputTargetHours').value)||0, salaryBonuses:parseFloat($('inputBonuses').value)||0, salaryDeductions:parseFloat($('inputDeductions').value)||0, financialUpdatedAt:new Date().toISOString() };
    await updateDoc(doc(db,'users',teacher.id), payload); Object.assign(teacher,payload); Toast.success('تم تحديث الإعدادات المالية.'); renderFinance();
  }catch(e){ console.error(e); Toast.error('تعذر حفظ الإعدادات المالية.'); }
}

async function saveChannels(e){
  e.preventDefault(); if(!teacher) return;
  try{
    const payload={ vodafoneCash:$('chnVodafone').value.trim(), instapay:$('chnInstapay').value.trim(), bankAccount:$('chnBankAccount').value.trim(), paymentMethod:$('chnPreferred').value, channelsUpdatedAt:new Date().toISOString() };
    await updateDoc(doc(db,'users',teacher.id), payload); Object.assign(teacher,payload); Toast.success('تم حفظ قنوات الدفع.'); renderChannels();
  }catch(e){ console.error(e); Toast.error('تعذر حفظ القنوات.'); }
}

async function uploadPayoutProof(e){
  e.preventDefault(); if(!teacher) return;
  const file=$('payoutFile')?.files?.[0];
  try{
    let proofUrl='';
    if(file){ proofUrl = await fileToDataUrl(file); }
    await addDoc(collection(db,'payouts'), { teacherId:teacher.id, month:$('payoutMonth').value, amount:parseFloat($('payoutAmount').value)||0, proofUrl, notes:$('payoutNotes').value.trim(), createdAt:serverTimestamp(), status:'recorded' });
    Toast.success('تم تسجيل إثبات الصرف.'); e.target.reset(); await loadPayouts(); renderPayouts();
  }catch(err){ console.error(err); Toast.error('تعذر رفع الإثبات.'); }
}

function fileToDataUrl(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result||'')); r.onerror=rej; r.readAsDataURL(file); }); }
