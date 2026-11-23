import{s as J,a as R,d as b,T as E,g as U,r as W,R as X}from"./rbacService-D2RrsA9d.js";import{doc as C,updateDoc as F,getDoc as j,addDoc as Z,collection as w,serverTimestamp as ee,deleteDoc as te,getDocs as I,query as A,orderBy as M,limit as k}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import{p as ae}from"./authService-CtWWGArP.js";import{a as se,r as de}from"./navbar-Bz3pjZSE.js";import{l as Q}from"./activityLogger-BK9d5021.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";let x=[],g=[],f=[],$=[],T=[],ie=[],O="lessons";async function ne(){le(),xe(),ce(),re(),await N(),S()}function ce(){const a=["lessonsSearchInput","lessonsFilterStatus","finSearchInput","finFilterType","actSearchInput","actFilterCategory"],e=()=>{S(),window.lucide&&window.lucide.createIcons()};a.forEach(n=>{const d=document.getElementById(n);d&&(d.addEventListener("input",e),d.addEventListener("change",e))}),window.addEventListener("invFilterChanged",e)}function le(){const a=document.querySelectorAll(".investigation-tab-btn");a.forEach(e=>{e.addEventListener("click",()=>{a.forEach(d=>d.classList.remove("active")),e.classList.add("active"),O=e.dataset.tab,document.querySelectorAll(".investigation-tab-pane").forEach(d=>{d.classList.remove("active")});const n=document.getElementById(`pane-${O}`);n&&n.classList.add("active"),S()})})}function re(){document.querySelectorAll(".close-drawer-btn").forEach(e=>{e.addEventListener("click",()=>{_()})});const a=document.getElementById("investigationDrawerOverlay");a&&a.addEventListener("click",_)}function _(){const a=document.getElementById("investigationSideDrawer"),e=document.getElementById("relatedDataDrawer"),n=document.getElementById("investigationDrawerOverlay");a&&a.classList.remove("open"),e&&e.classList.remove("open"),n&&n.classList.remove("active")}async function N(){z(!0);try{const[a,e,n,d,r,i,l]=await Promise.all([I(A(w(b,"sessions"),M("createdAt","desc"),k(300))).catch(s=>({docs:[]})),I(A(w(b,"teacher_salary_transactions"),M("createdAt","desc"),k(300))).catch(s=>({docs:[]})),I(A(w(b,"teacher_activity_logs"),M("timestamp","desc"),k(300))).catch(s=>({docs:[]})),I(A(w(b,"auditLogs"),M("timestamp","desc"),k(300))).catch(s=>({docs:[]})),I(w(b,"students")).catch(s=>({docs:[]})),I(w(b,"users")).catch(s=>({docs:[]})),I(w(b,"trial_sessions")).catch(s=>({docs:[]}))]);x=a.docs.map(s=>({id:s.id,...s.data()})),g=e.docs.map(s=>({id:s.id,...s.data()}));const t=n.docs.map(s=>({id:s.id,...s.data(),source:"teacher"})),o=d.docs.map(s=>({id:s.id,...s.data(),source:"audit"}));f=[...t,...o].sort((s,u)=>{const v=new Date(s.createdAtIso||s.timestamp||0).getTime();return new Date(u.createdAtIso||u.timestamp||0).getTime()-v}),$=r.docs.map(s=>({id:s.id,...s.data()})),T=i.docs.map(s=>({id:s.id,...s.data()})),ie=l.docs.map(s=>({id:s.id,...s.data()})),oe()}catch(a){console.error("Error loading investigation center data:",a),E.error("حدث خطأ أثناء تحميل بيانات مركز التحقيق.")}finally{z(!1)}}function z(a){const e=document.getElementById("investigationLoader");e&&(e.style.display=a?"flex":"none")}function oe(){const a=document.getElementById("statTotalLessons"),e=document.getElementById("statTotalFinancial"),n=document.getElementById("statTotalLogs"),d=document.getElementById("statTotalStudents");a&&(a.textContent=x.length),e&&(e.textContent=g.length),n&&(n.textContent=f.length),d&&(d.textContent=$.length)}function q(a){const e=(a.status||"completed").toLowerCase(),n=(a.absenceType||"").toLowerCase(),d=!!(a.calculatedInSalary||a.calculated||a.approved||a.paid),r=a.type==="trial"||a.isTrial===!0,i=r&&(a.approved===!0||a.trialSubscribed===!0);if(r&&!i)return{expectedSalary:!1,isCalculated:d,statusLabel:d?"احتسبت بالخطأ (حصة تجريبية غير معتمدة)":"حصة تجريبية غير معتمدة (لا تُحتسب بالمرتب)",badgeClass:d?"badge-danger":"badge-info",icon:"help-circle",hasMismatch:d};const l=e==="cancelled"||e==="ملغاة",t=e==="postponed"||e==="rescheduled"||e==="مؤجلة",o=e==="student_absent_excused"||e==="غياب بعذر"||e==="excused_absence"||e==="student_absent"&&n==="excused",s=e==="teacher_absent"||e==="غياب المعلم",u=e==="student_absent_unexcused"||e==="غياب بدون عذر"||e==="unexcused_absence"||e==="student_absent"&&n==="unexcused";return l?{expectedSalary:!1,isCalculated:d,statusLabel:d?"احتسبت بالخطأ رغم إلغاء الحصة":"لم تُحتسب بسبب إلغاء الحصة",badgeClass:d?"badge-danger":"badge-secondary",icon:"x-circle",hasMismatch:d}:t?{expectedSalary:!1,isCalculated:d,statusLabel:d?"احتسبت بالخطأ رغم تأجيل الحصة":"لم تُحتسب لأنها مؤجلة",badgeClass:d?"badge-danger":"badge-secondary",icon:"clock",hasMismatch:d}:o?{expectedSalary:!1,isCalculated:d,statusLabel:d?"احتسبت بالخطأ رغم غياب الطالب بعذر":"لم تُحتسب بسبب غياب الطالب بعذر",badgeClass:d?"badge-danger":"badge-warning",icon:"user-x",hasMismatch:d}:s?{expectedSalary:!1,isCalculated:d,statusLabel:d?"احتسبت بالخطأ رغم غياب المعلم":"لم تُحتسب بسبب غياب المعلم",badgeClass:d?"badge-danger":"badge-warning",icon:"user-x",hasMismatch:d}:u?d?{expectedSalary:!0,isCalculated:!0,statusLabel:r?"احتُسبت بسبب غياب الطالب بدون عذر (حصة تجريبية معتمدة)":"احتُسبت بسبب غياب الطالب بدون عذر",badgeClass:"badge-success",icon:"check-circle",hasMismatch:!1}:{expectedSalary:!0,isCalculated:!1,statusLabel:"غياب الطالب بدون عذر ولكن لم تُحتسب",badgeClass:"badge-danger",icon:"alert-triangle",hasMismatch:!0}:d?{expectedSalary:!0,isCalculated:!0,statusLabel:r?"تم احتسابها في المرتب (حصة تجريبية معتمدة)":"تم احتسابها في المرتب",badgeClass:"badge-success",icon:"check-circle",hasMismatch:!1}:{expectedSalary:!0,isCalculated:!1,statusLabel:"الحصة مكتملة ولكن لم تدخل في المرتب",badgeClass:"badge-danger",icon:"alert-triangle",hasMismatch:!0}}function S(){switch(O){case"lessons":ue();break;case"financial":be();break;case"activity":fe();break;case"explorer":he();break}}function ue(){var i,l;if(!document.getElementById("pane-lessons"))return;const e=((i=document.getElementById("lessonsSearchInput"))==null?void 0:i.value.trim().toLowerCase())||"",n=((l=document.getElementById("lessonsFilterStatus"))==null?void 0:l.value)||"all";let d=[...x];e&&(d=d.filter(t=>t.studentName&&t.studentName.toLowerCase().includes(e)||t.teacherName&&t.teacherName.toLowerCase().includes(e)||t.date&&t.date.includes(e)||t.id&&t.id.toLowerCase().includes(e))),n==="trials"?d=d.filter(t=>t.type==="trial"||t.isTrial===!0):n==="uncalculated"||n==="mismatch"?d=d.filter(t=>q(t).hasMismatch):n==="missing_report"?d=d.filter(t=>!t.report||!t.report.surah||t.report.surah==="غير محدد"):n==="edited"?d=d.filter(t=>t.lastModifiedBy||t.updatedBy||t.edited):n==="completed"&&(d=d.filter(t=>t.status==="completed"||t.status==="مكتملة"||!t.status));const r=document.getElementById("lessonsTableBody");if(r){if(d.length===0){r.innerHTML=`
      <tr>
        <td colspan="8" class="text-center py-5 text-muted">
          <i data-lucide="inbox" style="width: 32px; height: 32px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
          <p>لا توجد حصص تطابق معايير البحث والفلترة الحالية.</p>
        </td>
      </tr>
    `,window.lucide&&window.lucide.createIcons();return}r.innerHTML=d.map(t=>{const o=y(t.createdAt||t.timestamp),s=y(t.updatedAt||t.lastModifiedAt);return`
      <tr class="inv-table-row" data-id="${t.id}">
        <td>
          <div class="font-bold text-primary">${t.studentName||"طالب غير معروف"}</div>
          <div class="text-xs text-muted">ID: ${t.studentId||"-"}</div>
        </td>
        <td>
          <div class="font-semibold">${t.teacherName||"معلم غير معروف"}</div>
        </td>
        <td>
          <div class="font-mono text-xs">${t.date||"-"}</div>
        </td>
        <td>
          <div class="text-xs font-mono">${t.startTime||t.time||"-"} -> ${t.endTime||"-"}</div>
          <div class="text-xs text-muted">${t.duration||60} دقيقة</div>
        </td>
        <td>
          <div class="text-xs font-mono">${o}</div>
        </td>
        <td>
          <div class="text-xs">${t.createdBy||t.recordedBy||t.teacherName||"المعلم"}</div>
        </td>
        <td>
          <div class="text-xs">${t.lastModifiedBy||t.updatedBy||"-"}</div>
          <div class="text-xs text-muted">${s}</div>
        </td>
        <td class="text-left">
          <button class="btn btn-sm btn-secondary view-session-btn" data-id="${t.id}" title="عرض تفاصيل الحصة والفحص">
            <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
            <span>عرض</span>
          </button>
        </td>
      </tr>
    `}).join(""),window.lucide&&window.lucide.createIcons(),r.querySelectorAll(".view-session-btn, tr.inv-table-row").forEach(t=>{t.addEventListener("click",o=>{var u;const s=t.dataset.id||((u=t.closest("tr"))==null?void 0:u.dataset.id);s&&D(s)})})}}async function D(a){var c,m,h,L,H;const e=x.find(p=>p.id===a);if(!e)return;const n=document.getElementById("investigationSideDrawer"),d=document.getElementById("drawerBodyContent"),r=document.getElementById("drawerTitleText"),i=document.getElementById("investigationDrawerOverlay");if(!n||!d)return;r.textContent=`فحص الحصة: ${e.studentName||""} (${e.date||""})`;const l=!!(e.report&&(e.report.surah||e.report.notes)),t=q(e),s={completed:"مكتملة",مكتملة:"مكتملة",cancelled:"ملغاة",ملغاة:"ملغاة",postponed:"مؤجلة",rescheduled:"مؤجلة",مؤجلة:"مؤجلة",student_absent_excused:"غياب الطالب بعذر","غياب بعذر":"غياب الطالب بعذر",student_absent_unexcused:"غياب الطالب بدون عذر","غياب بدون عذر":"غياب الطالب بدون عذر",teacher_absent:"غياب المعلم","غياب المعلم":"غياب المعلم"}[e.status]||e.status||"مكتملة",u=g.find(p=>{var B;return p.sessionId===e.id||p.teacherId===e.teacherId&&((B=p.description)==null?void 0:B.includes(e.studentName))}),v=f.filter(p=>{var B,P,G;return p.targetId===e.id||((B=p.details)==null?void 0:B.sessionId)===e.id||((P=p.details)==null?void 0:P.studentName)===e.studentName&&((G=p.details)==null?void 0:G.date)===e.date});d.innerHTML=`
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
          <span class="badge badge-info">${s}</span>
        </div>
        <div>
          <span class="text-muted block mb-1">التقرير الأكاديمي:</span>
          <span class="badge ${l?"badge-success":"badge-secondary"}">${l?"موجود":"غير موجود"}</span>
        </div>
        <div class="col-span-2">
          <span class="text-muted block mb-1">احتساب المرتب:</span>
          <span class="badge ${t.badgeClass}">${t.statusLabel}</span>
        </div>
        <div class="col-span-2 text-muted">
          <span>آخر تعديل:</span> ${e.lastModifiedBy||e.updatedBy||"لا يوجد"} (${y(e.updatedAt||e.lastModifiedAt)})
        </div>
      </div>

      ${t.hasMismatch?`
        <div class="p-3 border border-danger rounded bg-danger-subtle text-xs mt-3 flex justify-between items-center" style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3);">
          <div>
            <strong class="text-danger">⚠️ توجد مشكلة في الاحتساب:</strong>
            <p class="margin-0 text-muted mt-0.5">${t.statusLabel}</p>
          </div>
          <button class="btn btn-warning btn-xs" id="btnQuickRecalculate">
            <i data-lucide="calculator" style="width: 12px; height: 12px;"></i> Recalculate
          </button>
        </div>
      `:""}
    </div>

    <!-- MAIN LESSON DETAILS -->
    <div class="drawer-card mb-4">
      <h4 class="drawer-section-title">
        <i data-lucide="file-text"></i> بيانات الحصة الأساسية (Lesson Details)
      </h4>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">اسم الطالب:</span>
          <span class="detail-val font-bold text-primary">${e.studentName||"-"}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">اسم المعلم:</span>
          <span class="detail-val font-semibold">${e.teacherName||"-"}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">تاريخ الحصة:</span>
          <span class="detail-val font-mono">${e.date||"-"}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">الوقت والمدة:</span>
          <span class="detail-val font-mono">${e.startTime||e.time||"-"} (${e.duration||60} دقيقة)</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">قيمة الحصة:</span>
          <span class="detail-val font-bold text-success">${e.price||e.sessionPrice||0} ج.م</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">تاريخ وقت التسجيل:</span>
          <span class="detail-val font-mono text-xs">${y(e.createdAt||e.timestamp)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">حالة الحصة من المرتب:</span>
          <span class="detail-val">
            <span class="badge ${t.badgeClass}">${t.statusLabel}</span>
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">التقرير الأكاديمي:</span>
          <span class="detail-val">
            <span class="badge ${l?"badge-success":"badge-secondary"}">${l?"موجود":"غير موجود"}</span>
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">من سجل الحصة:</span>
          <span class="detail-val">${e.createdBy||e.recordedBy||e.teacherName||"المعلم"}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">آخر تعديل بواسطة:</span>
          <span class="detail-val">${e.lastModifiedBy||e.updatedBy||"لا يوجد"}</span>
        </div>
      </div>
    </div>

    <!-- REPORT DETAILS -->
    <div class="drawer-card mb-4">
      <h4 class="drawer-section-title">
        <i data-lucide="book-open"></i> التقرير الأكاديمي والدرجات (Lesson Report)
      </h4>
      ${l?`
        <div class="report-box p-3 border rounded">
          <div class="grid grid-cols-2 gap-2 text-xs mb-2">
            <div><strong>السورة / المفهوم:</strong> ${e.report.surah||"-"}</div>
            <div><strong>الآيات:</strong> ${e.report.verses||"-"}</div>
            <div><strong>تقييم الحفظ:</strong> <span class="badge badge-info">${e.report.memorizationGrade||e.report.grade||"-"}</span></div>
            <div><strong>تقييم المراجعة:</strong> <span class="badge badge-info">${e.report.revisionGrade||"-"}</span></div>
          </div>
          <div class="text-xs text-muted"><strong>ملاحظات المعلم:</strong> ${e.report.notes||e.report.teacherNotes||"لا توجد ملاحظات مدونة"}</div>
        </div>
      `:`
        <p class="text-xs text-muted">التقرير غير موجود لهذه الحصة (اختياري).</p>
      `}
    </div>

    <!-- CONNECTED FINANCIAL MOVEMENT -->
    <div class="drawer-card mb-4">
      <h4 class="drawer-section-title">
        <i data-lucide="wallet"></i> الحركة المالية الناتجة (Financial Impact)
      </h4>
      ${u?`
        <div class="p-2 border rounded text-xs flex justify-between items-center bg-card">
          <div>
            <div class="font-bold">${u.type==="session_earnings"?"مستحقات حصة":u.type}</div>
            <div class="text-muted">${u.description||"-"}</div>
          </div>
          <div class="text-left font-mono">
            <div class="text-success font-bold">+${u.amount||0} ج.م</div>
            <div class="text-muted">الرصيد بعد: ${u.balanceAfter||0} ج.م</div>
          </div>
        </div>
      `:`
        <p class="text-xs text-muted">لا توجد حركة مالية مباشرة مسجلة لهذه الحصة في الأرشيف الفوري.</p>
      `}
    </div>

    <!-- LOGS & MODIFICATION HISTORY -->
    <div class="drawer-card mb-4">
      <h4 class="drawer-section-title">
        <i data-lucide="history"></i> سجل التعديلات والحركات الخاصة بالحصة (Logs)
      </h4>
      ${v.length>0?`
        <div class="space-y-2">
          ${v.map(p=>`
            <div class="p-2 border-b text-xs flex justify-between">
              <div>
                <span class="font-bold">${p.userName||p.teacherName||"المستخدم"}:</span>
                <span>${p.actionTitle||p.action||p.description||"تعديل"}</span>
              </div>
              <span class="font-mono text-muted">${y(p.timestamp||p.createdAtIso)}</span>
            </div>
          `).join("")}
        </div>
      `:`
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
  `,window.lucide&&window.lucide.createIcons(),(c=document.getElementById("btnEditSession"))==null||c.addEventListener("click",()=>me(e)),(m=document.getElementById("btnRecalculateSalary"))==null||m.addEventListener("click",()=>Y(e)),(h=document.getElementById("btnQuickRecalculate"))==null||h.addEventListener("click",()=>Y(e)),(L=document.getElementById("btnViewRelatedData"))==null||L.addEventListener("click",()=>V(e,"session")),(H=document.getElementById("btnDeleteSession"))==null||H.addEventListener("click",()=>ve(e)),n.classList.add("open"),i&&i.classList.add("active")}function me(a){var n,d;const e=document.getElementById("editSessionModal");e&&(document.getElementById("editSessionId").value=a.id,document.getElementById("editSessionDate").value=a.date||"",document.getElementById("editSessionStartTime").value=a.startTime||a.time||"",document.getElementById("editSessionDuration").value=a.duration||60,document.getElementById("editSessionPrice").value=a.price||a.sessionPrice||0,document.getElementById("editSessionSurah").value=((n=a.report)==null?void 0:n.surah)||"",document.getElementById("editSessionNotes").value=((d=a.report)==null?void 0:d.notes)||"",document.getElementById("editSessionCalculated").checked=!!(a.calculatedInSalary||a.calculated),e.classList.add("active"))}async function pe(a){a.preventDefault();const e=document.getElementById("editSessionId").value;if(!e)return;const n=R.currentUser,d=(n==null?void 0:n.displayName)||(n==null?void 0:n.email)||"المشرف المسؤول",r=document.getElementById("editSessionDate").value,i=document.getElementById("editSessionStartTime").value,l=parseInt(document.getElementById("editSessionDuration").value,10)||60,t=parseFloat(document.getElementById("editSessionPrice").value)||0,o=document.getElementById("editSessionSurah").value.trim(),s=document.getElementById("editSessionNotes").value.trim(),u=document.getElementById("editSessionCalculated").checked;try{const v=C(b,"sessions",e),m=(await j(v)).data()||{},h={date:r,startTime:i,duration:l,price:t,calculatedInSalary:u,calculated:u,"report.surah":o,"report.notes":s,lastModifiedBy:d,updatedBy:d,updatedAt:new Date().toISOString()};await F(v,h),await Q({actionType:"EDIT_SESSION",targetCollection:"sessions",targetId:e,oldValue:m,newValue:h,adminName:d,adminId:n==null?void 0:n.uid,reason:"تعديل بيانات الحصة عبر مركز التحقيق"}),E.success("تم تعديل بيانات الحصة بنجاح في قاعدة البيانات."),document.getElementById("editSessionModal").classList.remove("active"),await N(),S(),D(e)}catch(v){console.error("Error saving session edit:",v),E.error("فشل تعديل بيانات الحصة.")}}async function Y(a){J(`هل أنت متأكد من إعادة احتساب المرتب للحصة الخاصة بـ (${a.studentName}) وتضمين مبلغ (${a.price||0} ج.م) لحساب المعلم؟`,async()=>{try{const e=R.currentUser,n=(e==null?void 0:e.displayName)||(e==null?void 0:e.email)||"المشرف الإداري",d=C(b,"sessions",a.id);if(await F(d,{calculatedInSalary:!0,calculated:!0,lastModifiedBy:n,updatedAt:new Date().toISOString()}),a.teacherId){const r=C(b,"users",a.teacherId),i=await j(r),l=i.exists()&&i.data().currentMonthEarnings||0,t=a.price||a.sessionPrice||0,o=l+t;i.exists()&&await F(r,{currentMonthEarnings:o}),await Z(w(b,"teacher_salary_transactions"),{teacherId:a.teacherId,teacherName:a.teacherName||"معلم",studentId:a.studentId,studentName:a.studentName,sessionId:a.id,type:"session_earnings",amount:t,balanceBefore:l,balanceAfter:o,description:`إعادة احتساب مستحقات الحصة مع الطالب (${a.studentName}) بتاريخ (${a.date})`,createdBy:n,createdAt:ee(),createdAtIso:new Date().toISOString()})}E.success("تمت إعادة احتساب الحصة وإيداع مستحقاتها في حساب المعلم بنجاح! 💰"),await N(),S(),D(a.id)}catch(e){console.error("Recalculate error:",e),E.error("حدث خطأ أثناء إعادة احتساب المرتب.")}})}async function ve(a){J("تحذير عاجل: هل أنت متأكد من حذف هذه الحصة نهائياً؟ ستستعيد أي أرصدة مالية وتؤرشف العملية.",async()=>{try{const e=R.currentUser;await te(C(b,"sessions",a.id)),await Q({actionType:"DELETE_SESSION",targetCollection:"sessions",targetId:a.id,oldValue:a,newValue:null,adminName:(e==null?void 0:e.displayName)||"الأدمن",adminId:e==null?void 0:e.uid,reason:"حذف حاسم عبر مركز التحقيق"}),E.success("تم حذف الحصة بنجاح."),_(),await N(),S()}catch(e){console.error("Delete session error:",e),E.error("فشل حذف الحصة.")}})}function be(){var i,l;if(!document.getElementById("pane-financial"))return;const e=((i=document.getElementById("finSearchInput"))==null?void 0:i.value.trim().toLowerCase())||"",n=((l=document.getElementById("finFilterType"))==null?void 0:l.value)||"all";let d=[...g];e&&(d=d.filter(t=>t.teacherName&&t.teacherName.toLowerCase().includes(e)||t.description&&t.description.toLowerCase().includes(e)||t.createdBy&&t.createdBy.toLowerCase().includes(e))),n!=="all"&&(d=d.filter(t=>t.type===n));const r=document.getElementById("financialTableBody");if(r){if(d.length===0){r.innerHTML=`
      <tr>
        <td colspan="8" class="text-center py-5 text-muted">
          <i data-lucide="receipt" style="width: 32px; height: 32px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
          <p>لا توجد حركات مالية مطابقة للبحث.</p>
        </td>
      </tr>
    `,window.lucide&&window.lucide.createIcons();return}r.innerHTML=d.map(t=>{const s={session_earnings:{label:"حصة دراسية",class:"badge-success"},bonus:{label:"مكافأة 🎁",class:"badge-info"},deduction:{label:"خصم ⚠️",class:"badge-danger"},manual_adjustment:{label:"تعديل يدوي ⚙️",class:"badge-warning"},payout:{label:"صرف راتب 🏦",class:"badge-secondary"}}[t.type]||{label:t.type||"حركة مالية",class:"badge-secondary"},u=y(t.createdAt||t.createdAtIso);return`
      <tr class="inv-table-row" data-id="${t.id}">
        <td>
          <div class="font-bold text-primary">${t.teacherName||"معلم غير محدد"}</div>
        </td>
        <td>
          <span class="badge ${s.class}">${s.label}</span>
        </td>
        <td>
          <div class="font-bold font-mono text-success">${t.amount>0?"+":""}${t.amount||0} ج.م</div>
        </td>
        <td>
          <div class="font-mono text-xs text-muted">${t.balanceBefore||0} ج.م</div>
        </td>
        <td>
          <div class="font-mono text-xs font-semibold">${t.balanceAfter||0} ج.م</div>
        </td>
        <td>
          <div class="text-xs max-w-xs truncate" title="${t.description||""}">${t.description||"-"}</div>
        </td>
        <td>
          <div class="text-xs font-mono">${u}</div>
        </td>
        <td>
          <div class="text-xs">${t.createdBy||"النظام"}</div>
        </td>
      </tr>
    `}).join(""),window.lucide&&window.lucide.createIcons(),r.querySelectorAll("tr.inv-table-row").forEach(t=>{t.addEventListener("click",()=>{const o=t.dataset.id;o&&ge(o)})})}}function ge(a){var t,o;const e=g.find(s=>s.id===a);if(!e)return;const n=document.getElementById("investigationSideDrawer"),d=document.getElementById("drawerBodyContent"),r=document.getElementById("drawerTitleText"),i=document.getElementById("investigationDrawerOverlay");if(!n||!d)return;r.textContent=`الحركة المالية: ${e.teacherName||""} (${e.amount||0} ج.م)`;const l=x.find(s=>s.id===e.sessionId);d.innerHTML=`
    <div class="drawer-card mb-4">
      <h4 class="drawer-section-title"><i data-lucide="wallet"></i> تفاصيل الحركة المالية</h4>
      <div class="detail-grid">
        <div class="detail-item"><span class="detail-label">المعلم:</span> <span class="detail-val font-bold">${e.teacherName||"-"}</span></div>
        <div class="detail-item"><span class="detail-label">القيمة:</span> <span class="detail-val font-bold text-success">${e.amount||0} ج.م</span></div>
        <div class="detail-item"><span class="detail-label">نوع الحركة:</span> <span class="detail-val">${e.type||"-"}</span></div>
        <div class="detail-item"><span class="detail-label">الرصيد قبل:</span> <span class="detail-val font-mono">${e.balanceBefore||0} ج.م</span></div>
        <div class="detail-item"><span class="detail-label">الرصيد بعد:</span> <span class="detail-val font-mono font-bold">${e.balanceAfter||0} ج.م</span></div>
        <div class="detail-item"><span class="detail-label">تاريخ الحركة:</span> <span class="detail-val font-mono text-xs">${y(e.createdAt||e.createdAtIso)}</span></div>
        <div class="detail-item"><span class="detail-label">من قام بالعملية:</span> <span class="detail-val">${e.createdBy||"النظام"}</span></div>
      </div>
      <div class="mt-3 p-2 border rounded bg-card text-xs">
        <strong>سبب الحركة والأصل:</strong>
        <p class="mt-1 text-muted">${e.description||"لا يوجد سبب مفصل مدون"}</p>
      </div>
    </div>

    ${l?`
      <div class="drawer-card mb-4">
        <h4 class="drawer-section-title"><i data-lucide="link"></i> الحصة المصدرية المرتبطة</h4>
        <div class="p-2 border rounded text-xs flex justify-between items-center">
          <div>
            <div class="font-bold text-primary">${l.studentName}</div>
            <div class="text-muted">${l.date} (${l.startTime||""})</div>
          </div>
          <button class="btn btn-xs btn-secondary btn-inspect-linked-session" data-id="${l.id}">
            فحص الحصة 👁️
          </button>
        </div>
      </div>
    `:""}

    <div class="drawer-actions-toolbar">
      <button class="btn btn-secondary btn-sm flex-1" id="btnViewRelatedDataFin">
        <i data-lucide="network"></i> Related Data (البيانات المرتبطة)
      </button>
    </div>
  `,window.lucide&&window.lucide.createIcons(),(t=document.querySelector(".btn-inspect-linked-session"))==null||t.addEventListener("click",s=>{const u=s.currentTarget.dataset.id;u&&D(u)}),(o=document.getElementById("btnViewRelatedDataFin"))==null||o.addEventListener("click",()=>{V(e,"financial")}),n.classList.add("open"),i&&i.classList.add("active")}function fe(){var i,l;if(!document.getElementById("pane-activity"))return;const e=((i=document.getElementById("actSearchInput"))==null?void 0:i.value.trim().toLowerCase())||"",n=((l=document.getElementById("actFilterCategory"))==null?void 0:l.value)||"all";let d=[...f];e&&(d=d.filter(t=>t.userName&&t.userName.toLowerCase().includes(e)||t.teacherName&&t.teacherName.toLowerCase().includes(e)||t.actionTitle&&t.actionTitle.toLowerCase().includes(e)||t.action&&t.action.toLowerCase().includes(e)||t.actionType&&t.actionType.toLowerCase().includes(e))),n!=="all"&&(d=d.filter(t=>t.actionCategory===n||t.actionType===n||t.action===n));const r=document.getElementById("activityTableBody");if(r){if(d.length===0){r.innerHTML=`
      <tr>
        <td colspan="6" class="text-center py-5 text-muted">
          <i data-lucide="history" style="width: 32px; height: 32px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
          <p>لا توجد سجلات نشاط مطابقة للبحث.</p>
        </td>
      </tr>
    `,window.lucide&&window.lucide.createIcons();return}r.innerHTML=d.map(t=>{var c;const o=y(t.timestamp||t.createdAtIso),s=t.userName||t.teacherName||t.userId||"مستخدم",u=t.actionTitle||t.actionType||t.action||"عملية في النظام",v=t.targetCollection||t.actionCategory||((c=t.details)==null?void 0:c.entityName)||"نظام";return`
      <tr class="inv-table-row" data-id="${t.id}">
        <td>
          <div class="text-xs font-mono">${o}</div>
        </td>
        <td>
          <div class="font-bold text-primary">${s}</div>
        </td>
        <td>
          <span class="badge badge-info">${t.source==="audit"?"تعديل تدقيقي":"نشاط مستخدم"}</span>
        </td>
        <td>
          <div class="font-semibold text-xs">${u}</div>
        </td>
        <td>
          <div class="text-xs text-muted">${v}</div>
        </td>
        <td class="text-left">
          <button class="btn btn-xs btn-secondary view-act-btn" data-id="${t.id}">
            التفاصيل
          </button>
        </td>
      </tr>
    `}).join(""),window.lucide&&window.lucide.createIcons(),r.querySelectorAll("tr.inv-table-row").forEach(t=>{t.addEventListener("click",()=>{const o=t.dataset.id;o&&ye(o)})})}}function ye(a){var o;const e=f.find(s=>s.id===a);if(!e)return;const n=document.getElementById("investigationSideDrawer"),d=document.getElementById("drawerBodyContent"),r=document.getElementById("drawerTitleText"),i=document.getElementById("investigationDrawerOverlay");if(!n||!d)return;r.textContent=`تفاصيل السجل: ${e.actionTitle||e.actionType||"عملية"}`;const l=e.oldValue?U(e.oldValue,2):null,t=e.newValue?U(e.newValue,2):null;d.innerHTML=`
    <div class="drawer-card mb-4">
      <h4 class="drawer-section-title"><i data-lucide="shield"></i> بيانات السجل والعملية (Black Box Log)</h4>
      <div class="detail-grid">
        <div class="detail-item"><span class="detail-label">المستخدم:</span> <span class="detail-val font-bold">${e.userName||e.teacherName||"-"}</span></div>
        <div class="detail-item"><span class="detail-label">نوع العملية:</span> <span class="detail-val font-mono">${e.actionType||e.actionCategory||"-"}</span></div>
        <div class="detail-item"><span class="detail-label">الوقت والتاريخ:</span> <span class="detail-val font-mono text-xs">${y(e.timestamp||e.createdAtIso)}</span></div>
        <div class="detail-item"><span class="detail-label">الكيان المستهدف:</span> <span class="detail-val">${e.targetCollection||e.targetId||"-"}</span></div>
      </div>
      <div class="mt-3 p-2 border rounded text-xs bg-card">
        <strong>وصف الحركة:</strong>
        <p class="mt-1">${e.actionTitle||e.reason||"لا يوجد وصف مخصص"}</p>
      </div>
    </div>

    ${l||t?`
      <div class="drawer-card mb-4">
        <h4 class="drawer-section-title"><i data-lucide="git-compare"></i> مقارنة البيانات قبل وبعد التعديل (Diff View)</h4>
        <div class="grid grid-cols-2 gap-2 text-xs font-mono">
          <div class="p-2 border rounded bg-danger-subtle">
            <div class="font-bold text-danger mb-1">البيانات السابقة (Before):</div>
            <pre style="white-space: pre-wrap; font-size: 0.7rem;">${l||"لا تتوفر بيانات سابقة"}</pre>
          </div>
          <div class="p-2 border rounded bg-success-subtle">
            <div class="font-bold text-success mb-1">البيانات الجديدة (After):</div>
            <pre style="white-space: pre-wrap; font-size: 0.7rem;">${t||"لا تتوفر بيانات جديدة"}</pre>
          </div>
        </div>
      </div>
    `:""}

    <div class="drawer-actions-toolbar">
      <button class="btn btn-secondary btn-sm flex-1" id="btnViewRelatedDataAct">
        <i data-lucide="network"></i> Related Data (البيانات المرتبطة)
      </button>
    </div>
  `,window.lucide&&window.lucide.createIcons(),(o=document.getElementById("btnViewRelatedDataAct"))==null||o.addEventListener("click",()=>{V(e,"activity")}),n.classList.add("open"),i&&i.classList.add("active")}function xe(){const a=document.getElementById("explorerSearchInput");a&&a.addEventListener("input",e=>{const n=e.target.value.trim().toLowerCase();K(n)})}function he(){var e;const a=((e=document.getElementById("explorerSearchInput"))==null?void 0:e.value.trim().toLowerCase())||"";K(a)}function K(a){const e=document.getElementById("explorerResultsContainer");if(!e)return;if(!a){e.innerHTML=`
      <div class="text-center py-10 text-muted">
        <i data-lucide="search" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.4;"></i>
        <h3 class="font-bold text-lg mb-1">المستكشف الشامل للبيانات (Comprehensive Explorer)</h3>
        <p class="text-xs">اكتب اسم طالب، اسم معلم، ولي أمر، رقم حصة، أو رقم معاملة لرؤية شجرة البيانات الموحدة الكاملة.</p>
      </div>
    `,window.lucide&&window.lucide.createIcons();return}const n=$.filter(i=>i.name&&i.name.toLowerCase().includes(a)||i.parentPhone&&i.parentPhone.includes(a)||i.id&&i.id.toLowerCase().includes(a)),d=T.filter(i=>i.name&&i.name.toLowerCase().includes(a)||i.email&&i.email.toLowerCase().includes(a)||i.id&&i.id.toLowerCase().includes(a));if(n.length===0&&d.length===0){e.innerHTML=`
      <div class="text-center py-8 text-muted">
        <i data-lucide="alert-circle" style="width: 36px; height: 36px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
        <p>لم يتم العثور على أي نتائج مطابقة لـ "${a}".</p>
      </div>
    `,window.lucide&&window.lucide.createIcons();return}let r="";n.forEach(i=>{const l=x.filter(s=>s.studentId===i.id||s.studentName===i.name),t=g.filter(s=>{var u;return s.studentId===i.id||((u=s.description)==null?void 0:u.includes(i.name))}),o=f.filter(s=>{var u,v;return s.targetId===i.id||((u=s.details)==null?void 0:u.studentName)===i.name||((v=s.actionTitle)==null?void 0:v.includes(i.name))});r+=`
      <div class="drawer-card mb-6 p-4 border rounded shadow-sm bg-card">
        <div class="flex justify-between items-center border-b pb-3 mb-3">
          <div>
            <span class="badge badge-info mb-1">ملف طالب 🎓</span>
            <h3 class="font-bold text-xl text-primary">${i.name}</h3>
            <div class="text-xs text-muted">الهاتف: ${i.parentPhone||i.phone||"غير مدون"} | المعلم: ${i.teacherName||"-"}</div>
          </div>
          <div class="text-left">
            <span class="badge ${i.status==="active"||i.status==="مستمر"?"badge-success":"badge-warning"}">
              ${i.status||"نشط"}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
          <div class="p-3 border rounded bg-card">
            <div class="font-bold mb-2 text-primary">📚 سجل الحصص (${l.length})</div>
            ${l.slice(0,5).map(s=>`
              <div class="py-1 border-b flex justify-between cursor-pointer hover:bg-hover" onclick="window.openSessionDetail('${s.id}')">
                <span>${s.date}</span>
                <span class="font-bold">${s.price||0} ج.م</span>
              </div>
            `).join("")||'<div class="text-muted">لا توجد حصص مسجلة</div>'}
          </div>

          <div class="p-3 border rounded bg-card">
            <div class="font-bold mb-2 text-success">💳 المعاملات المترتبة (${t.length})</div>
            ${t.slice(0,5).map(s=>`
              <div class="py-1 border-b flex justify-between">
                <span>${s.type||"حركة"}</span>
                <span class="font-bold text-success">+${s.amount||0} ج.م</span>
              </div>
            `).join("")||'<div class="text-muted">لا توجد حركات مالية</div>'}
          </div>

          <div class="p-3 border rounded bg-card">
            <div class="font-bold mb-2 text-info">📋 الأنشطة والتعديلات (${o.length})</div>
            ${o.slice(0,5).map(s=>`
              <div class="py-1 border-b text-xs truncate">
                ${s.actionTitle||s.action||"تعديل"}
              </div>
            `).join("")||'<div class="text-muted">لا توجد سجلات نشاط</div>'}
          </div>
        </div>
      </div>
    `}),d.forEach(i=>{const l=x.filter(s=>s.teacherId===i.id||s.teacherName===i.name),t=g.filter(s=>s.teacherId===i.id),o=$.filter(s=>s.teacherId===i.id);f.filter(s=>s.teacherId===i.id||s.userId===i.id),r+=`
      <div class="drawer-card mb-6 p-4 border rounded shadow-sm bg-card">
        <div class="flex justify-between items-center border-b pb-3 mb-3">
          <div>
            <span class="badge badge-primary mb-1">ملف معلم 👨‍🏫</span>
            <h3 class="font-bold text-xl text-primary">${i.name}</h3>
            <div class="text-xs text-muted">البريد: ${i.email||"-"} | الرصيد الحالي: ${i.currentMonthEarnings||0} ج.م</div>
          </div>
          <div class="text-left">
            <span class="badge badge-success">معلم معتمد</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
          <div class="p-3 border rounded bg-card">
            <div class="font-bold mb-2 text-primary">👨‍🎓 الطلاب التابعون (${o.length})</div>
            ${o.slice(0,5).map(s=>`
              <div class="py-1 border-b flex justify-between">
                <span>${s.name}</span>
                <span class="text-muted">${s.status||"مستمر"}</span>
              </div>
            `).join("")||'<div class="text-muted">لا يوجد طلاب مسجلون</div>'}
          </div>

          <div class="p-3 border rounded bg-card">
            <div class="font-bold mb-2 text-success">💰 الحركات المالية (${t.length})</div>
            ${t.slice(0,5).map(s=>`
              <div class="py-1 border-b flex justify-between">
                <span>${s.type}</span>
                <span class="font-bold text-success">+${s.amount} ج.م</span>
              </div>
            `).join("")||'<div class="text-muted">لا توجد معاملات</div>'}
          </div>

          <div class="p-3 border rounded bg-card">
            <div class="font-bold mb-2 text-info">📚 إجمالي الحصص (${l.length})</div>
            ${l.slice(0,5).map(s=>`
              <div class="py-1 border-b flex justify-between cursor-pointer hover:bg-hover" onclick="window.openSessionDetail('${s.id}')">
                <span>${s.studentName} (${s.date})</span>
                <span class="font-bold">${s.price||0} ج.م</span>
              </div>
            `).join("")||'<div class="text-muted">لا توجد حصص</div>'}
          </div>
        </div>
      </div>
    `}),e.innerHTML=r,window.lucide&&window.lucide.createIcons()}window.openSessionDetail=a=>{D(a)};function V(a,e){var u,v;const n=document.getElementById("relatedDataDrawer"),d=document.getElementById("relatedDataBodyContent"),r=document.getElementById("investigationDrawerOverlay");if(!n||!d)return;let i=null,l=null,t=null,o=[],s=[];e==="session"?(t=a,i=$.find(c=>c.id===a.studentId||c.name===a.studentName),l=T.find(c=>c.id===a.teacherId||c.name===a.teacherName),o=g.filter(c=>{var m;return c.sessionId===a.id||c.teacherId===a.teacherId&&((m=c.description)==null?void 0:m.includes(a.studentName))}),s=f.filter(c=>{var m,h,L;return c.targetId===a.id||((m=c.details)==null?void 0:m.sessionId)===a.id||((h=c.details)==null?void 0:h.studentName)===a.studentName&&((L=c.details)==null?void 0:L.date)===a.date})):e==="financial"?(l=T.find(c=>c.id===a.teacherId||c.name===a.teacherName),i=$.find(c=>c.id===a.studentId||c.name===a.studentName),t=x.find(c=>c.id===a.sessionId),o=g.filter(c=>c.teacherId===a.teacherId),s=f.filter(c=>{var m;return c.targetId===a.id||((m=c.details)==null?void 0:m.teacherId)===a.teacherId})):e==="activity"&&(i=$.find(c=>{var m;return c.id===a.targetId||c.name===((m=a.details)==null?void 0:m.studentName)}),l=T.find(c=>c.id===a.teacherId||c.id===a.userId||c.name===a.userName),t=x.find(c=>{var m;return c.id===a.targetId||c.id===((m=a.details)==null?void 0:m.sessionId)}),o=g.filter(c=>c.teacherId===a.teacherId),s=f.filter(c=>c.targetId===a.targetId)),d.innerHTML=`
    <div class="mb-4">
      <h3 class="font-bold text-lg mb-1 flex items-center gap-2 text-primary">
        <i data-lucide="network"></i> شجرة البيانات المرتبطة بالعنصر (Connected Entities)
      </h3>
      <p class="text-xs text-muted">عرض جميع الكيانات، التقرير، حركة الراتب، وسجل النشاط المرتبطين بنفس العملية دون مغادرة الصفحة.</p>
    </div>

    <!-- STUDENT CARD -->
    <div class="drawer-card mb-3 p-3 border rounded">
      <div class="font-bold text-sm text-primary mb-1 flex items-center gap-1">
        🎓 الطالب المرتبط: ${i?i.name:(t==null?void 0:t.studentName)||"غير محدد"}
      </div>
      ${i?`
        <div class="text-xs text-muted">رقم الهاتف: ${i.parentPhone||"-"} | الاشتراك: ${i.status||"مستمر"}</div>
      `:'<div class="text-xs text-muted">لا يتوفر ملف طالب مستقل مأرشف</div>'}
    </div>

    <!-- TEACHER CARD -->
    <div class="drawer-card mb-3 p-3 border rounded">
      <div class="font-bold text-sm text-primary mb-1 flex items-center gap-1">
        👨‍🏫 المعلم المرتبط: ${l?l.name:(t==null?void 0:t.teacherName)||"غير محدد"}
      </div>
      ${l?`
        <div class="text-xs text-muted">البريد: ${l.email||"-"} | الرصيد الحالي: ${l.currentMonthEarnings||0} ج.م</div>
      `:'<div class="text-xs text-muted">لا يتوفر ملف معلم مستقل</div>'}
    </div>

    <!-- SESSION / REPORT CARD -->
    ${t?`
      <div class="drawer-card mb-3 p-3 border rounded bg-card">
        <div class="font-bold text-sm mb-1">📖 الحصة والتقرير المرتبط:</div>
        <div class="text-xs">التاريخ: ${t.date} | الوقت: ${t.startTime||""} (${t.duration||60} دقيقة)</div>
        <div class="text-xs text-muted mt-1">السورة والتقييم: ${((u=t.report)==null?void 0:u.surah)||"غير محدد"} (${((v=t.report)==null?void 0:v.grade)||"لا يوجد درجات"})</div>
      </div>
    `:""}

    <!-- FINANCIAL LOGS -->
    <div class="drawer-card mb-3 p-3 border rounded">
      <div class="font-bold text-sm mb-2 text-success">💰 الحركات المالية المرتبطة (${o.length}):</div>
      ${o.map(c=>`
        <div class="py-1 border-b text-xs flex justify-between">
          <span>${c.type} (${c.description||"-"})</span>
          <span class="font-bold text-success">+${c.amount} ج.م</span>
        </div>
      `).join("")||'<div class="text-xs text-muted">لا توجد حركات مالية مرتبطة</div>'}
    </div>

    <!-- ACTIVITY LOGS -->
    <div class="drawer-card mb-3 p-3 border rounded">
      <div class="font-bold text-sm mb-2 text-info">📋 سجل الأنشطة والتعديلات (${s.length}):</div>
      ${s.map(c=>`
        <div class="py-1 border-b text-xs">
          <strong>${c.userName||"المستخدم"}:</strong> ${c.actionTitle||c.action||"تعديل"}
        </div>
      `).join("")||'<div class="text-xs text-muted">لا توجد تعديلات مأرشفة لهذا العنصر</div>'}
    </div>
  `,window.lucide&&window.lucide.createIcons(),n.classList.add("open"),r&&r.classList.add("active")}function y(a){if(!a)return"-";if(typeof a=="string"){const e=new Date(a);return isNaN(e.getTime())?a:e.toLocaleString("ar-EG",{dateStyle:"short",timeStyle:"short"})}return a.toDate&&typeof a.toDate=="function"?a.toDate().toLocaleString("ar-EG",{dateStyle:"short",timeStyle:"short"}):a.seconds?new Date(a.seconds*1e3).toLocaleString("ar-EG",{dateStyle:"short",timeStyle:"short"}):"-"}ae("admin");R.onAuthStateChanged(async a=>{var e,n;if(!a){window.location.href="../index.html";return}try{const d=await j(C(b,"users",a.uid)),r=d.exists()?d.data():{};if(W(r)!==X.ADMIN){window.location.href="../teacher/dashboard.html";return}se("مركز التحقيق وإدارة العمليات",{name:r.name||a.displayName,roleName:"مدير النظام"}),de("investigation","admin"),await ne(),(e=document.getElementById("btnRefreshAllInvData"))==null||e.addEventListener("click",async()=>{await N(),window.lucide&&window.lucide.createIcons()}),(n=document.getElementById("editSessionForm"))==null||n.addEventListener("submit",pe),["lessonsSearchInput","lessonsFilterStatus","finSearchInput","finFilterType","actSearchInput","actFilterCategory"].forEach(i=>{const l=document.getElementById(i);if(l){const t=()=>window.dispatchEvent(new CustomEvent("invFilterChanged"));l.addEventListener("input",t),l.addEventListener("change",t)}}),window.lucide&&window.lucide.createIcons()}catch(d){console.error("Auth check error in Investigation Center:",d)}});
