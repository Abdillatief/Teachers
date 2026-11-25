import '../../shared/utils/jsonShield.js';
import { protectRoute } from '../auth/authService.js';
import { renderSidebar } from '../../shared/components/sidebar.js';
import { renderNavbar } from '../../shared/components/navbar.js';
import { db } from '../../config/firebase.js';
import { collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc, serverTimestamp, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { Toast } from '../../shared/utils/toast.js';

protectRoute('admin');

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let feedbacks = [], teachers = [];
let selectedReply = null;

init();

async function init() {
  renderSidebar('feedback', 'admin');
  renderNavbar('ملاحظات المعلمين', { name: 'الإدارة', roleName: 'مدير الأكاديمية' });
  bindUI();
  await Promise.all([loadTeachers(), loadFeedbacks()]);
  if (window.lucide) try { window.lucide.createIcons(); } catch {}
}

function bindUI() {
  $('btnRefreshFeedbacks')?.addEventListener('click', loadFeedbacks);
  $('btnOpenNewFeedbackRequestModal')?.addEventListener('click', openNewModal);
  $('closeNewFeedbackModalBtn')?.addEventListener('click', closeNewModal);
  $('cancelNewFeedbackModalBtn')?.addEventListener('click', closeNewModal);
  $('newFeedbackRequestModal')?.addEventListener('click', e => { if (e.target.id === 'newFeedbackRequestModal') closeNewModal(); });
  $('newFeedbackRequestForm')?.addEventListener('submit', submitNewRequest);
  $('closeReplyModalBtn')?.addEventListener('click', closeReplyModal);
  $('cancelReplyModalBtn')?.addEventListener('click', closeReplyModal);
  $('replyFeedbackModal')?.addEventListener('click', e => { if (e.target.id === 'replyFeedbackModal') closeReplyModal(); });
  $('replyFeedbackForm')?.addEventListener('submit', submitReply);
  ['feedbackSearchInput','ratingFilterSelect','topicFilterSelect'].forEach(id => $(id)?.addEventListener('input', renderFeedbacks));
  ['ratingFilterSelect','topicFilterSelect'].forEach(id => $(id)?.addEventListener('change', renderFeedbacks));
}

async function loadTeachers() {
  try {
    const snap = await getDocs(query(collection(db,'users'), where('role','==','teacher')));
    teachers = snap.docs.map(d => ({ id:d.id, uid:d.id, ...d.data() })).filter(t => t.status !== 'deleted');
    const sel = $('reqTargetSelect');
    if (sel) {
      const opts = teachers.map(t => `<option value="${esc(t.id)}">${esc(t.name||t.email||t.id)}</option>`).join('');
      sel.innerHTML = '<option value="all">جميع المعلمين النشطين</option>' + opts;
    }
  } catch(e){ console.warn('loadTeachers',e); }
}

async function loadFeedbacks() {
  const container = $('feedbacksContainer');
  if (container) container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">جاري تحميل الملاحظات...</p>';
  try {
    const snap = await getDocs(query(collection(db,'feedbacks'), orderBy('createdAt','desc'), limit(200)));
    feedbacks = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  } catch(e) {
    try {
      const snap = await getDocs(collection(db,'feedbacks'));
      feedbacks = snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    } catch(err){ console.error(err); feedbacks=[]; }
  }
  renderStats();
  renderFeedbacks();
}

function renderStats() {
  const total = feedbacks.length;
  const pending = feedbacks.filter(f => !f.adminReply && !f.addressed).length;
  const addressed = total - pending;
  const teacherIds = new Set(feedbacks.map(f=>f.teacherId||f.userId).filter(Boolean));
  setText('statTotalFeedback', total);
  setText('statPendingFeedback', pending);
  setText('statAddressedFeedback', addressed);
  setText('statTeachersParticipated', teacherIds.size);
}

function setText(id,v){ const el=$(id); if(el) el.textContent=String(v); }

function renderFeedbacks() {
  const container = $('feedbacksContainer'); if(!container) return;
  const qv = ($('feedbackSearchInput')?.value||'').trim().toLowerCase();
  const rating = $('ratingFilterSelect')?.value || '';
  const topic = $('topicFilterSelect')?.value || '';
  let list = feedbacks.filter(f => {
    const hay = [f.teacherName,f.teacherEmail,f.topic,f.message,f.text,f.feedback,f.adminReply].join(' ').toLowerCase();
    if (qv && !hay.includes(qv)) return false;
    if (rating && String(f.rating||'') !== rating) return false;
    if (topic && String(f.topic||f.category||'') !== topic) return false;
    return true;
  });
  if (!list.length) { container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:2rem;background:var(--bg-surface);border:1px dashed var(--border-color);border-radius:12px;">لا توجد ملاحظات مطابقة.</div>'; return; }
  container.innerHTML = list.map(f => {
    const teacher = f.teacherName || teachers.find(t=>t.id===(f.teacherId||f.userId))?.name || 'معلم';
    const msg = f.message || f.text || f.feedback || '-';
    const reply = f.adminReply || f.reply || '';
    const date = f.createdAt?.toDate ? f.createdAt.toDate().toLocaleDateString('ar-EG') : (String(f.createdAt||'').slice(0,10) || '-');
    const pending = !reply && !f.addressed;
    return `<div style="background:var(--bg-surface);border:1px solid var(--border-color);border-radius:14px;padding:1rem;">
      <div style="display:flex;justify-content:space-between;gap:.75rem;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <div style="font-weight:800;color:var(--text-primary);">${esc(teacher)}</div>
          <div style="font-size:.78rem;color:var(--text-muted);">${esc(f.topic||f.category||'ملاحظة')} • ${esc(date)} ${f.rating? '• ⭐'+esc(f.rating):''}</div>
        </div>
        <span style="font-size:.72rem;font-weight:700;padding:.2rem .55rem;border-radius:999px;background:${pending?'rgba(245,158,11,.12)':'rgba(16,185,129,.12)'};color:${pending?'#f59e0b':'#10b981'};">${pending?'بانتظار الرد':'تمت المعالجة'}</span>
      </div>
      <div style="margin-top:.75rem;color:var(--text-secondary);white-space:pre-wrap;line-height:1.7;">${esc(msg)}</div>
      ${reply ? `<div style="margin-top:.75rem;padding:.75rem;border-radius:10px;background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.2);"><div style="font-size:.75rem;font-weight:700;color:#10b981;margin-bottom:.25rem;">رد الإدارة</div><div style="white-space:pre-wrap;">${esc(reply)}</div></div>` : ''}
      <div style="margin-top:.75rem;display:flex;gap:.5rem;justify-content:flex-end;">
        <button class="btn btn-sm btn-secondary" data-reply="${esc(f.id)}">${reply?'تعديل الرد':'الرد'}</button>
      </div>
    </div>`;
  }).join('');
  container.querySelectorAll('[data-reply]').forEach(btn => btn.addEventListener('click', () => openReplyModal(btn.dataset.reply)));
  if (window.lucide) try { window.lucide.createIcons(); } catch {}
}

function openNewModal() { $('newFeedbackRequestModal')?.style && ($('newFeedbackRequestModal').style.display='flex'); $('newFeedbackRequestForm')?.reset(); }
function closeNewModal() { const m=$('newFeedbackRequestModal'); if(m) m.style.display='none'; }

async function submitNewRequest(e) {
  e.preventDefault();
  const btn=$('btnSubmitFeedbackRequest'); if(btn) btn.disabled=true;
  try {
    const target=$('reqTargetSelect')?.value||'all';
    const payload = {
      type:'admin_request',
      topic: $('reqTopicInput')?.value?.trim()||'',
      message: $('reqQuestionInput')?.value?.trim()||'',
      question: $('reqQuestionInput')?.value?.trim()||'',
      targetType: target==='all'?'all':'specific_teachers',
      targetIds: target==='all'?[]:[target],
      isPinned: !!$('reqIsPinnedCheckbox')?.checked,
      status:'pending',
      createdAt: serverTimestamp(),
      createdBy: 'admin'
    };
    await addDoc(collection(db,'feedback_requests'), payload);
    Toast.success('تم إرسال الطلب للمعلمين.');
    closeNewModal();
  } catch(err){ console.error(err); Toast.error('تعذر إرسال الطلب.'); }
  finally{ if(btn) btn.disabled=false; }
}

function openReplyModal(id) {
  const f = feedbacks.find(x=>x.id===id); if(!f) return;
  selectedReply = f;
  $('replyFeedbackId').value = f.id;
  $('replyTeacherId').value = f.teacherId || f.userId || '';
  $('replyTopic').value = f.topic || f.category || '';
  $('replyModalTeacherName').textContent = f.teacherName || teachers.find(t=>t.id===(f.teacherId||f.userId))?.name || '-';
  $('replyModalTeacherMessage').textContent = f.message || f.text || f.feedback || '-';
  $('replyTextInput').value = f.adminReply || f.reply || '';
  $('replyFeedbackModal').style.display = 'flex';
}
function closeReplyModal(){ const m=$('replyFeedbackModal'); if(m) m.style.display='none'; selectedReply=null; }

async function submitReply(e) {
  e.preventDefault();
  if(!selectedReply) return;
  const btn=$('btnSubmitReply'); if(btn) btn.disabled=true;
  try {
    const reply = $('replyTextInput')?.value?.trim();
    if(!reply) { Toast.warning('اكتب الرد أولاً.'); return; }
    await updateDoc(doc(db,'feedbacks', selectedReply.id), {
      adminReply: reply,
      reply,
      addressed: true,
      repliedAt: serverTimestamp(),
      status: 'addressed'
    });
    Toast.success('تم حفظ الرد.');
    closeReplyModal();
    await loadFeedbacks();
  } catch(err){ console.error(err); Toast.error('تعذر حفظ الرد.'); }
  finally{ if(btn) btn.disabled=false; }
}
