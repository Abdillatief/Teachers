import{a as A,d as N,r as ze,R as Ie,T as L,s as Le}from"./rbacService-Daqk2lPi.js";import{getDoc as Ge,doc as ne,onSnapshot as je,collection as U,addDoc as ee,where as we,updateDoc as ge,serverTimestamp as pe}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import{r as Re,a as _e,L as He,d as re,j as Fe,p as Oe,k as Ue,l as Ee,T as $e}from"./navbar-Wj1PJKN1.js";import{p as Ve}from"./authService-HszOwoL9.js";import{s as Qe}from"./trashService-b-xJF3OF.js";import{w as Q}from"./auditService-BYflZ_Pe.js";import{o as We}from"./studentReportCard-6RDuJHqo.js";import{a as ye,r as Te}from"./newGroupsService-jywzhoTO.js";import{a as De,g as Ke}from"./creditManager-D9VZ-GJI.js";import{o as Je,r as ke}from"./whatsappWidget-mHTFjoWW.js";import{backfillOperationalProjectionsIfNeeded as Ze,syncStudentOperationalSummary as ae}from"./supervisorDomainService-Cn9ebdzg.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./activityLogger-CddtPFfY.js";import"./quranData-BxaWbcIK.js";Ve("admin");const F=new He,Xe=`
  <option value="08:00 صباحاً">08:00 صباحاً</option>
  <option value="08:30 صباحاً">08:30 صباحاً</option>
  <option value="09:00 صباحاً">09:00 صباحاً</option>
  <option value="09:30 صباحاً">09:30 صباحاً</option>
  <option value="10:00 صباحاً">10:00 صباحاً</option>
  <option value="10:30 صباحاً">10:30 صباحاً</option>
  <option value="11:00 صباحاً">11:00 صباحاً</option>
  <option value="11:30 صباحاً">11:30 صباحاً</option>
  <option value="12:00 مساءً">12:00 مساءً</option>
  <option value="12:30 مساءً">12:30 مساءً</option>
  <option value="01:00 مساءً">01:00 مساءً</option>
  <option value="01:30 مساءً">01:30 مساءً</option>
  <option value="02:00 مساءً">02:00 مساءً</option>
  <option value="02:30 مساءً">02:30 مساءً</option>
  <option value="03:00 مساءً">03:00 مساءً</option>
  <option value="03:30 مساءً">03:30 مساءً</option>
  <option value="04:00 مساءً">04:00 مساءً</option>
  <option value="04:30 مساءً">04:30 مساءً</option>
  <option value="05:00 مساءً">05:00 مساءً</option>
  <option value="05:30 مساءً">05:30 مساءً</option>
  <option value="06:00 مساءً">06:00 مساءً</option>
  <option value="06:30 مساءً">06:30 مساءً</option>
  <option value="07:00 مساءً">07:00 مساءً</option>
  <option value="07:30 مساءً">07:30 مساءً</option>
  <option value="08:00 مساءً">08:00 مساءً</option>
  <option value="08:30 مساءً">08:30 مساءً</option>
  <option value="09:00 مساءً">09:00 مساءً</option>
  <option value="09:30 مساءً">09:30 مساءً</option>
  <option value="10:00 مساءً">10:00 مساءً</option>
  <option value="10:30 مساءً">10:30 مساءً</option>
  <option value="11:00 مساءً">11:00 مساءً</option>
  <option value="11:30 مساءً">11:30 مساءً</option>
`;function Ye(e,n,r={},o="05:30 مساءً"){const a=document.getElementById(e);if(a){if(!n||n.length===0){a.innerHTML='<div style="grid-column: 1/-1; color: var(--text-muted); font-size: 0.8rem;">يرجى اختيار الأيام أولاً لتحديد موعد الحصة لكل يوم.</div>';return}a.innerHTML=n.map(i=>`
      <div class="form-group" style="margin: 0;">
        <label style="font-size: 0.78rem; font-weight: 700; color: var(--primary-color); display: block; margin-bottom: 0.25rem;">موعد يوم ${i}:</label>
        <select class="form-control admin-day-time-select" data-day="${i}" style="border: 1px solid var(--border-color); width: 100%; font-size: 0.85rem;">
          <option value="">-- اختر موعد ${i} --</option>
          ${Xe}
        </select>
      </div>
    `).join(""),a.querySelectorAll(".admin-day-time-select").forEach(i=>{const s=i.dataset.day;r&&r[s]?i.value=r[s]:o&&(i.value=o)})}}let M=[],R=[],P=[],V=[],oe=[],S=null,D=null,C=null;A.onAuthStateChanged(async e=>{if(e)try{const n=await Ge(ne(N,"users",e.uid));if(n.exists()){S=n.data();const r=ze(S),o=r===Ie.SUPERVISOR?"مشرف الأكاديمية":r===Ie.TEACHER?"معلم":"مدير الأكاديمية";Re("students","admin"),_e("إدارة شؤون الطلاب والدارسين",{name:S.name||"الإدارة العامة",roleName:o}),et()}}catch(n){console.error("Error loading admin data:",n)}});let de=!1;function se(){de||(de=!0,requestAnimationFrame(()=>{var e;de=!1,tt(),O(((e=document.getElementById("adminStudentSearchInput"))==null?void 0:e.value)||"")}))}function et(){F.unsubscribeAll(),Ze().catch(a=>console.warn("Backfill operational summaries warning:",a));const e=je(U(N,"packages"),a=>{V=a.docs.map(i=>({id:i.id,...i.data()})),Ae()},a=>console.warn("Error fetching packages:",a));F.register("packages",e);const n=re.subscribe("groups",a=>{oe=(a||[]).map(i=>({...i,id:i.id})),te(),se()});F.register("groups",n);const r=re.subscribe("users",a=>{P=(a||[]).filter(i=>i.role==="teacher"&&i.status==="approved").map(i=>({uid:i.uid||i.id,...i})),ve(),se()});F.register("users",r);const o=re.subscribe("students",a=>{const i=(a||[]).map(s=>({...s,id:s.id}));R=i.filter(s=>s.status==="pending_approval"),M=i.filter(s=>s.status!=="pending_approval"),se()});F.register("students",o),ct(),it()}function ve(){const e=P.map(a=>`<option value="${a.uid}">${a.name}</option>`).join(""),n=document.getElementById("editStudentTeacher");if(n){const a=n.value;n.innerHTML='<option value="">اختر معلماً مشرفاً...</option>'+e,a&&(n.value=a)}const r=document.getElementById("approveTeacherSelect");if(r){const a=r.value;r.innerHTML='<option value="">اختر المعلم المشرف...</option>'+e,a&&(r.value=a)}const o=document.getElementById("addStudentTeacher");if(o){const a=o.value;o.innerHTML='<option value="">اختر معلماً مشرفاً معتمداً...</option>'+e,a&&(o.value=a)}}function te(){const e=document.getElementById("editStudentGroupSelect"),n=document.getElementById("addStudentGroupSelect"),r=oe.filter(a=>(a.status||"active")==="active"),o=r.length>0?r.map(a=>{const i=(a.studentIds||[]).length,s=parseInt(a.maxStudents)||10,t=i>=s,l=a.day||a.time?` - [${a.day||""} ${a.time||""}]`:"";return`<option value="${a.id}" data-teacherid="${a.teacherId||""}" data-day="${a.day||"السبت"}" data-time="${a.time||"05:30 مساءً"}" ${t?"disabled":""}>${a.name} (${a.teacherName||"معلم"})${l} - (${i}/${s} طالب) ${t?"⚠️ مكتملة":""}</option>`}).join(""):'<option value="" disabled>لا توجد مجموعات نشطة حالياً</option>';if(e){const a=e.value;e.innerHTML='<option value="">-- اختر المجموعة --</option>'+o,a&&(e.value=a)}if(n){const a=n.value;n.innerHTML='<option value="">-- اختر المجموعة --</option>'+o,a&&(n.value=a)}}function Me(e){if(!e)return 4;const n=e.totalSessions??e.sessionsCount??e.sessions??e.totalLessons??e.lessonsCount,r=parseInt(n,10);return!isNaN(r)&&r>0?r:4}function Ae(){const e=document.getElementById("approvePackageSelect");e&&(V.length>0?e.innerHTML='<option value="">-- اختر الباقة التعليمية المناسبة للطالب --</option>'+V.map(n=>{const r=Me(n),o=n.duration||n.sessionDuration||n.lessonDuration||60;return`<option value="${n.id}" data-price="${n.price}" data-name="${n.name}" data-sessions="${r}" data-duration="${o}">${n.name} (${n.price} ج.م - ${r} حصص)</option>`}).join(""):e.innerHTML=`
      <option value="">-- اختر الباقة التعليمية المناسبة للطالب --</option>
      <option value="pkg_4" data-price="300" data-name="باقة 4 حصص شهرياً" data-sessions="4" data-duration="60">باقة 4 حصص شهرياً (300 ج.م - 4 حصص)</option>
      <option value="pkg_8" data-price="500" data-name="باقة 8 حصص شهرياً" data-sessions="8" data-duration="60">باقة 8 حصص شهرياً (500 ج.م - 8 حصص)</option>
      <option value="pkg_12" data-price="700" data-name="باقة 12 حصة شهرياً" data-sessions="12" data-duration="60">باقة 12 حصة شهرياً (700 ج.م - 12 حصة)</option>
      <option value="pkg_custom" data-price="600" data-name="باقة تعليمية مخصصة" data-sessions="8" data-duration="60">باقة تعليمية مخصصة (600 ج.م)</option>
    `)}function tt(){const e=document.getElementById("pendingStudentRequestsCard"),n=document.getElementById("pendingStudentsTableBody"),r=document.getElementById("pendingBadgeCount");if(!(!e||!n)){if(R.length===0){e.style.display="none";return}e.style.display="block",r&&(r.textContent=`${R.length} طلبات معلقة`),n.innerHTML=R.map(o=>{var l;const a=o.schedule&&o.schedule.days?o.schedule.days.join(" • "):o.sessionDays?o.sessionDays.join(" • "):"غير محدد",i=((l=o.schedule)==null?void 0:l.uniformTime)||o.sessionTime||o.time||"مرن",s=o.phone?o.phone:"لا يوجد هاتف",t=o.subscriptionType==="group"||o.groupId||o.requestedGroupId?`<span class="badge badge-info" style="position: static;">مجموعة ${o.requestedGroupName?`: ${o.requestedGroupName}`:""}</span>`:'<span class="badge badge-success" style="position: static;">فردية</span>';return`
      <tr>
        <td>
          <strong style="color: var(--text-primary); font-size: 0.92rem;">${o.name}</strong>
          ${o.email?`<div style="font-size: 0.75rem; color: var(--text-muted);">${o.email}</div>`:""}
          <div style="margin-top: 0.25rem;">${t}</div>
        </td>
        <td>${o.age||"-"} سنة <br><span style="font-size: 0.75rem; color: var(--text-muted);">${s}</span></td>
        <td><strong style="color: var(--primary-color);">${o.teacherName||"المعلم المتقدم"}</strong></td>
        <td><span style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary);">${a}</span><br><span style="font-size: 0.75rem; color: var(--text-muted);">${i}</span></td>
        <td><div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem; color: var(--text-secondary);" title="${o.notes||""}">${o.notes||"لا يوجد"}</div></td>
        <td>
          <div style="display: flex; gap: 0.35rem; align-items: center;">
            <button class="btn btn-sm btn-primary btn-approve-student" data-id="${o.id}" style="display: flex; align-items: center; gap: 0.25rem;">
              <i data-lucide="check-circle-2" style="width: 14px; height: 14px;"></i> اعتماد وتحديد الباقة
            </button>
            <button class="btn btn-sm btn-secondary btn-reject-student" data-id="${o.id}" style="color: var(--danger); display: flex; align-items: center; gap: 0.2rem;">
              <i data-lucide="x-circle" style="width: 14px; height: 14px;"></i> رفض
            </button>
          </div>
        </td>
      </tr>
    `}).join(""),window.lucide&&window.lucide.createIcons(),n.querySelectorAll(".btn-approve-student").forEach(o=>{o.addEventListener("click",()=>{const a=o.getAttribute("data-id")||o.dataset.id;a&&ot(a)})}),n.querySelectorAll(".btn-reject-student").forEach(o=>{o.addEventListener("click",()=>{const a=o.getAttribute("data-id")||o.dataset.id;a&&rt(a)})})}}let me=localStorage.getItem("admin_students_view_mode")||"table";function nt(){const e=document.getElementById("btnListView"),n=document.getElementById("btnGridView"),r=document.getElementById("studentsTableContainer"),o=document.getElementById("studentsGridContainer");!e||!n||(me==="grid"?(n.style.backgroundColor="var(--primary-color)",n.style.color="#ffffff",e.style.backgroundColor="transparent",e.style.color="var(--text-secondary)",r&&(r.style.display="none"),o&&(o.style.display="grid")):(e.style.backgroundColor="var(--primary-color)",e.style.color="#ffffff",n.style.backgroundColor="transparent",n.style.color="var(--text-secondary)",r&&(r.style.display="block"),o&&(o.style.display="none")))}let X=1;const at=20;function O(e=""){const n=document.getElementById("studentsTableBody"),r=document.getElementById("studentsGridContainer");if(!n||!r)return;nt();const o=M.filter(t=>t.name&&t.name.toLowerCase().includes(e.toLowerCase()));if(o.length===0){n.innerHTML='<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">لا يوجد طلاب مطابقين للبحث.</td></tr>',r.innerHTML='<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">لا يوجد طلاب مطابقين للبحث.</div>';const t=document.getElementById("studentsPaginationContainer");t&&(t.innerHTML="");return}const{items:a,totalPages:i}=Oe(o,X,at);n.innerHTML=a.map(t=>{const l=P.find(d=>d.uid===t.teacherId),y=l?l.name:t.teacherName||'<span style="color:var(--danger); font-weight:600;">غير معين</span>';let g="";t.status==="active"||t.status==="Active"?g='<span class="badge badge-success">نشط</span>':t.status==="Suspended"?g='<span class="badge badge-warning">موقوف</span>':g='<span class="badge badge-neutral">مؤرشف</span>';const x=t.days&&Array.isArray(t.days)&&t.days.length>0?t.days.join("، "):t.sessionDays?t.sessionDays.join("، "):"غير محدد",T=t.time||t.sessionTime||"غير محدد",$=t.packageName?`<span class="badge badge-primary student-pkg-badge-trigger" data-id="${t.id}" style="position:static; margin-top:0.25rem; cursor:pointer;" title="انقر لعرض تفاصيل الباقة والأرشيف"><i data-lucide="layers" style="width:10px;height:10px;display:inline;"></i> ${t.packageName}</span>`:"",v=t.subscriptionType==="group"||t.groupId?`<span class="badge badge-info" style="position:static; margin-top:0.25rem;">مجموعة (${t.groupName||"دراسي"})</span>`:'<span class="badge badge-neutral" style="position:static; margin-top:0.25rem;">فردي</span>';let u="";if(t.remainingLessons!==void 0){const d=parseInt(t.remainingLessons)||0;d<0?u=`<span class="badge badge-danger student-pkg-badge-trigger" data-id="${t.id}" style="position:static; margin-top:0.25rem; cursor:pointer;" title="انقر لإدارة الباقة والتجديد">عجز حصص: ${d}</span>`:d===0?u=`<span class="badge badge-danger student-pkg-badge-trigger" data-id="${t.id}" style="position:static; margin-top:0.25rem; cursor:pointer;" title="انقر لتجديد الباقة">0 حصة (منتهي)</span>`:d<=3?u=`<span class="badge badge-warning student-pkg-badge-trigger" data-id="${t.id}" style="position:static; margin-top:0.25rem; cursor:pointer;" title="انقر لعرض رصيد الباقة">${d} حصص متبقية</span>`:u=`<span class="badge badge-success student-pkg-badge-trigger" data-id="${t.id}" style="position:static; margin-top:0.25rem; cursor:pointer;" title="انقر لعرض رصيد الباقة">${d} حصة متبقية</span>`}return`
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.92rem;">${t.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">مواعيد: ${x} • ${T}</div>
          <div style="display:flex; gap:0.3rem; flex-wrap:wrap; margin-top:0.25rem;">${v} ${$} ${u}</div>
        </td>
        <td>${t.age||"غير مسجل"} سنة</td>
        <td><strong>${y}</strong></td>
        <td>${t.sessionsCount||0} حصة</td>
        <td><div style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size:0.8rem; color:var(--text-secondary);" title="${t.notes||""}">${t.notes||"لا يوجد ملاحظات"}</div></td>
        <td><strong style="color: var(--primary-color);">${(parseFloat(t.averageRating)||5).toFixed(1)} / 5.0</strong></td>
        <td>${g}</td>
        <td>
          <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center;">
            <button class="btn btn-sm btn-secondary btn-view-packages" data-id="${t.id}" title="عرض تفاصيل الباقة الحالية وأرشيف الباقات السابقة" style="color: #4f46e5; border-color: #c7d2fe; display: flex; align-items: center; gap: 0.25rem; font-weight: 600;">
              <i data-lucide="layers" style="width:14px;height:14px;"></i> الباقات والأرشيف
            </button>
            <button class="btn btn-sm btn-secondary btn-wa-student" data-id="${t.id}" title="إرسال رسالة أو تذكير واتساب لولي الأمر" style="color: #16a34a; border-color: #86efac; display: flex; align-items: center; gap: 0.25rem;">
              <i data-lucide="message-square" style="width:14px;height:14px;"></i> واتساب
            </button>
            ${ke(t.waWarningCount||0)}
            <button class="btn btn-sm btn-secondary btn-report-student" data-id="${t.id}" style="color: var(--primary-color);">
              <i data-lucide="file-text" style="width:14px;height:14px;"></i> تقرير
            </button>
            <button class="btn btn-sm btn-secondary btn-edit-student" data-id="${t.id}">
              <i data-lucide="edit-3" style="width:14px;height:14px;"></i> تعديل
            </button>
            <button class="btn btn-sm btn-danger btn-delete-student" data-id="${t.id}">
              <i data-lucide="archive" style="width:14px;height:14px;"></i> أرشيف
            </button>
          </div>
        </td>
      </tr>
    `}).join(""),r.innerHTML=a.map(t=>{const l=P.find(d=>d.uid===t.teacherId),y=l?l.name:t.teacherName||'<span style="color:var(--danger); font-weight:600;">غير معين</span>';let g="";t.status==="active"||t.status==="Active"?g='<span class="badge badge-success">نشط</span>':t.status==="Suspended"?g='<span class="badge badge-warning">موقوف</span>':g='<span class="badge badge-neutral">مؤرشف</span>';const x=t.days&&Array.isArray(t.days)&&t.days.length>0?t.days.join("، "):t.sessionDays?t.sessionDays.join("، "):"غير محدد",T=t.time||t.sessionTime||"غير محدد",$=t.packageName?`<span class="badge badge-primary student-pkg-badge-trigger" data-id="${t.id}" style="position:static; cursor:pointer;" title="انقر لعرض تفاصيل الباقة والأرشيف"><i data-lucide="layers" style="width:10px;height:10px;display:inline;"></i> ${t.packageName}</span>`:"",v=t.subscriptionType==="group"||t.groupId?`<span class="badge badge-info" style="position:static;">مجموعة (${t.groupName||"دراسي"})</span>`:'<span class="badge badge-neutral" style="position:static;">فردي</span>';let u="";if(t.remainingLessons!==void 0){const d=parseInt(t.remainingLessons)||0;d<0?u=`<span class="badge badge-danger student-pkg-badge-trigger" data-id="${t.id}" style="position:static; cursor:pointer;" title="انقر لإدارة الباقة وتسوية الدين">دين: ${d}</span>`:d===0?u=`<span class="badge badge-danger student-pkg-badge-trigger" data-id="${t.id}" style="position:static; cursor:pointer;" title="انقر لتجديد الباقة وسداد الاشتراك">0 حصة (يستحق الدفع)</span>`:d===1?u=`<span class="badge badge-warning student-pkg-badge-trigger" data-id="${t.id}" style="position:static; cursor:pointer;" title="انقر لعرض رصيد الباقة">حصة واحدة (قارب على الانتهاء)</span>`:u=`<span class="badge badge-success student-pkg-badge-trigger" data-id="${t.id}" style="position:static; cursor:pointer;" title="انقر لعرض رصيد الباقة">${d} متبقية</span>`}return`
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 0.85rem;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.75rem;">
            <div>
              <strong style="font-size: 1rem; color: var(--text-primary); display: block;">${t.name}</strong>
              <span style="font-size: 0.78rem; color: var(--text-muted);">${t.age||"غير مسجل"} سنة</span>
            </div>
            ${g}
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.75rem; background: var(--bg-primary); padding: 0.65rem; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="user-check" style="width: 14px; height: 14px; color: var(--primary-color);"></i>
              <span>المعلم: <strong>${y}</strong></span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="calendar" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
              <span>${x} • ${T}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="star" style="width: 14px; height: 14px; color: var(--warning);"></i>
              <span>${t.sessionsCount||0} حصة • تقييم: <strong style="color:var(--primary-color);">${(parseFloat(t.averageRating)||5).toFixed(1)}/5.0</strong></span>
            </div>
          </div>

          <div style="margin-bottom: 0.5rem; display:flex; gap:0.35rem; flex-wrap:wrap;">${v} ${$} ${u}</div>
          ${t.notes?`<p style="font-size: 0.75rem; color: var(--text-muted); margin: 0; background: var(--bg-primary); padding: 0.4rem 0.6rem; border-radius: var(--border-radius-sm); line-height: 1.4; border: 1px solid var(--border-color);">${t.notes}</p>`:""}
        </div>

        <div style="display: flex; gap: 0.35rem; border-top: 1px solid var(--border-color); padding-top: 0.65rem; flex-wrap: wrap;">
          <button class="btn btn-sm btn-secondary btn-view-packages" data-id="${t.id}" style="flex: 1 1 100%; justify-content: center; color: #4f46e5; border-color: #c7d2fe; display: flex; align-items: center; gap: 0.35rem; font-weight: 600;">
            <i data-lucide="layers" style="width: 14px; height: 14px;"></i> الباقات الحالية والأرشيف
          </button>
          <button class="btn btn-sm btn-secondary btn-wa-student" data-id="${t.id}" style="flex: 1 1 100%; justify-content: center; color: #16a34a; border-color: #86efac; display: flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="message-square" style="width: 14px; height: 14px;"></i> واتساب ولي الأمر ${ke(t.waWarningCount||0)}
          </button>
          <button class="btn btn-sm btn-secondary btn-report-student" data-id="${t.id}" style="flex: 1 1 100%; justify-content: center; color: var(--primary-color);">
            <i data-lucide="file-text" style="width: 14px; height: 14px;"></i> بطاقة تقرير شهري
          </button>
          <button class="btn btn-sm btn-secondary btn-edit-student" data-id="${t.id}" style="flex: 1; justify-content: center;">
            <i data-lucide="edit-3" style="width: 13px; height: 13px;"></i> تعديل
          </button>
          <button class="btn btn-sm btn-danger btn-delete-student" data-id="${t.id}" style="flex: 1; justify-content: center;">
            <i data-lucide="archive" style="width: 13px; height: 13px;"></i> أرشيف
          </button>
        </div>
      </div>
    `}).join("");let s=document.getElementById("studentsPaginationContainer");if(!s){s=document.createElement("div"),s.id="studentsPaginationContainer",s.style.marginTop="1rem";const t=n.closest(".card")||n.parentElement;t&&t.appendChild(s)}s&&(s.innerHTML=Ue(X,i),s.querySelectorAll(".btn-page").forEach(t=>{t.addEventListener("click",l=>{X=parseInt(l.currentTarget.dataset.page),O(e)})})),Ee(n),Ee(r)}function ot(e){const n=R.find(t=>t.id===e);if(!n)return;C=n,document.getElementById("approveStudentId").value=n.id,document.getElementById("approveStudentNameDisplay").textContent=n.name,document.getElementById("approveStudentTeacherDisplay").textContent=n.requestedByTeacherName||n.teacherName||"غير محدد",ve(),Ae();const r=document.getElementById("approveTeacherSelect"),o=n.requestedByTeacherId||n.teacherId;r&&o&&(r.value=o);const a=new Date().toISOString().split("T")[0],i=new Date(Date.now()+720*60*60*1e3).toISOString().split("T")[0];document.getElementById("approveStartDate").value=a,document.getElementById("approveEndDate").value=i;const s=document.getElementById("approveStudentModal");s&&(s.style.display="flex")}function le(){const e=document.getElementById("approveStudentModal");e&&(e.style.display="none"),C=null}function it(){var r,o;(r=document.getElementById("btnCloseApproveModalBtn"))==null||r.addEventListener("click",le),(o=document.getElementById("btnCancelApproveStudent"))==null||o.addEventListener("click",le);const e=document.getElementById("approvePackageSelect");e&&e.addEventListener("change",a=>{const i=a.target.options[a.target.selectedIndex];if(i&&i.dataset.price&&(document.getElementById("approvePackagePrice").value=i.dataset.price),i&&i.dataset.duration){const s=document.getElementById("approveSessionDuration");s&&(s.value=i.dataset.duration)}});const n=document.getElementById("approveStudentForm");n&&n.addEventListener("submit",async a=>{var w,c,p;if(a.preventDefault(),!C)return;const i=document.getElementById("approveStudentId").value,s=document.getElementById("approvePackageSelect"),t=s.options[s.selectedIndex],l=t?t.dataset.name||t.text:"باقة تعليمية معتمدة",y=parseFloat(document.getElementById("approvePackagePrice").value)||0,g=parseInt((w=document.getElementById("approveSessionDuration"))==null?void 0:w.value)||60,x=document.getElementById("approveTeacherSelect").value,T=P.find(m=>m.uid===x),$=T?T.name:C.teacherName,v=document.getElementById("approveStartDate").value,u=document.getElementById("approveEndDate").value,d=document.getElementById("btnSubmitApproveStudent");d&&(d.disabled=!0);try{const m=C.requestedGroupId||C.groupId||"",f=C.subscriptionType||(m?"group":"individual");if(await ge(ne(N,"students",i),{status:"active",teacherId:x,teacherName:$,packageName:l,packagePrice:y,sessionDuration:g,packageDuration:g,duration:g,subscriptionType:f,groupId:f==="group"?m:"",approvedAt:new Date().toISOString()}),await ae(i),f==="group"&&m)try{await ye(m,i)}catch(b){console.warn("إضافة الطالب للمجموعة أثناء الاعتماد:",b)}const h=new Date().toISOString().substring(0,7),k=parseInt((c=t==null?void 0:t.dataset)==null?void 0:c.sessions)||8;await De({studentId:i,studentName:C.name,packageId:s.value||null,packageName:l,totalLessons:k,lessonDuration:g,price:y,discount:0,startDate:v,expiryDate:u,notes:"تم التفعيل عند اعتماد الطالب بواسطة الإدارة",actor:{uid:((p=A.currentUser)==null?void 0:p.uid)||"admin",name:(S==null?void 0:S.name)||"مدير الأكاديمية"}}),await ee(U(N,"subscriptions"),{studentId:i,studentName:C.name,month:h,packageName:l,planName:l,totalSessions:k,sessionDuration:g,price:y,discount:0,totalAmount:y,totalPaid:0,remainingAmount:y,status:"unpaid",startDate:v,endDate:u,createdAt:pe()}),x&&await ee(U(N,"notifications"),{title:"تمت الموافقة على إضافة الطالب وتفعيل باقته 🎉",body:`وافقت إدارة الأكاديمية على إضافة الطالب (${C.name})، وتم تعيينك معلماً له وتفعيل باقته (${l}) بمدة حصة (${g} دقيقة).`,recipientId:x,readBy:[],createdAt:pe()}),await Q(A.currentUser.uid,(S==null?void 0:S.name)||"المشرف","APPROVE_STUDENT",i,{studentName:C.name,packageName:l}),L.success(`تمت الموافقة على الطالب (${C.name}) واعتماد باقته بنجاح 🎉`),le()}catch(m){console.error("خطأ اعتماد الطالب:",m),L.error("عذرًا، حدث خطأ أثناء تفعيل واعتماد الطالب.")}finally{d&&(d.disabled=!1)}})}async function rt(e){const n=R.find(r=>r.id===e);n&&Le(`هل أنت متأكد من رفض طلب إضافة الطالب (${n.name}) المقدم من المعلم؟`,async()=>{try{await ge(ne(N,"students",e),{status:"rejected",rejectedAt:new Date().toISOString()}),await ae(e),n.teacherId&&await ee(U(N,"notifications"),{title:"إشعار بشأن طلب إضافة طالب ⚠️",body:`تعذر قبول طلب إضافة الطالب (${n.name}). يرجى التواصل مع إدارة الأكاديمية للتفاصيل.`,recipientId:n.teacherId,readBy:[],createdAt:pe()}),await Q(A.currentUser.uid,(S==null?void 0:S.name)||"المشرف","REJECT_STUDENT_REQUEST",e,{studentName:n.name}),L.success("تم رفض طلب إضافة الطالب بنجاح.")}catch(r){console.error(r),L.error("حدث خطأ أثناء رفض الطلب.")}})}function dt(e){var T,$,v;const n=M.find(u=>u.id===e);if(!n)return;D=e,document.getElementById("editStudentName").value=n.name||"",document.getElementById("editStudentAge").value=n.age||"";const r=document.getElementById("editStudentPhone");r&&(r.value=n.phone||n.whatsapp||n.parentPhone||""),document.getElementById("editStudentStatus").value=n.status||"active",document.getElementById("editStudentTeacher").value=n.teacherId||"",document.getElementById("editStudentTime").value=((T=n.schedule)==null?void 0:T.uniformTime)||n.time||n.sessionTime||"",document.getElementById("editStudentSessionsCount").value=n.sessionsCount||0,document.getElementById("editStudentHoursCount").value=n.hoursCount||0,document.getElementById("editStudentAverageRating").value=n.averageRating||5,document.getElementById("editStudentNotes").value=n.notes||"";const o=document.getElementById("editSubscriptionType"),a=document.getElementById("editGroupSelectContainer"),i=document.getElementById("editStudentGroupSelect");if(te(),o){const u=n.subscriptionType==="group"||!!n.groupId;o.value=u?"group":"individual",a&&(a.style.display=u?"block":"none"),i&&n.groupId&&(i.value=n.groupId),o.onchange=()=>{const d=o.value==="group";a&&(a.style.display=d?"block":"none")},i&&(i.onchange=()=>{const d=i.options[i.selectedIndex];if(d&&d.value){const w=d.dataset.teacherid,c=d.dataset.day,p=d.dataset.time;if(w&&(document.getElementById("editStudentTeacher").value=w),p&&(document.getElementById("editStudentTime").value=p),c){const m=s==null?void 0:s.querySelector(`input[value="${c}"]`);m&&(m.checked=!0)}}})}const s=document.getElementById("editStudentDaysContainer"),t=(($=n.schedule)==null?void 0:$.days)||n.days||n.sessionDays||[];s&&s.querySelectorAll('input[type="checkbox"]').forEach(d=>{d.checked=t.includes(d.value)});const l=document.getElementById("editStudentDifferentTimesToggle"),y=document.getElementById("editStudentDifferentTimesContainer");l&&(l.checked=((v=n.schedule)==null?void 0:v.differentTimes)||!1);function g(){var u,d;if(!(!l||!y))if(l.checked){y.style.display="block";const w=[];s==null||s.querySelectorAll('input[type="checkbox"]').forEach(p=>{p.checked&&w.push(p.value)});const c=((u=document.getElementById("editStudentTime"))==null?void 0:u.value)||"05:30 مساءً";Ye("editStudentPerDayTimesList",w,((d=n.schedule)==null?void 0:d.times)||{},c)}else y.style.display="none"}l&&(l.onchange=g),s&&s.querySelectorAll('input[type="checkbox"]').forEach(u=>{u.onchange=g}),g();const x=document.getElementById("editStudentModal");x&&(x.style.display="flex")}function ce(){const e=document.getElementById("editStudentModal");e&&(e.style.display="none"),D=null}async function st(e){const n=M.find(r=>r.id===e);n&&Le(`هل أنت متأكد من ترحيل الدارس (${n.name}) إلى سلة المحذوفات والأرشيف؟`,async()=>{try{await Qe("students",e,n,"أرشفة وحذف الطالب من قبل المشرف العام"),await Q(A.currentUser.uid,(S==null?void 0:S.name)||"المشرف","ARCHIVE_STUDENT",e,{studentName:n.name}),L.success("تم ترحيل الطالب إلى سلة المحذوفات والأرشيف بنجاح.")}catch(r){console.error(r),L.error("فشل ترحيل الطالب إلى سلة المحذوفات.")}})}function lt(){let e=document.getElementById("addStudentModal");if(!e){e=document.createElement("div"),e.id="addStudentModal",e.className="modal-overlay";const n=P.map(i=>`<option value="${i.uid}">${i.name}</option>`).join("");e.innerHTML=`
      <div class="modal-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
          <h3 style="font-weight: 800; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="user-plus" style="color: var(--primary-color);"></i> تسجيل طالب جديد بالأكاديمية
          </h3>
          <span id="btnCloseAddModalBtn" style="cursor: pointer; padding: 0.25rem; display: flex; align-items: center; justify-content: center;">
            <i data-lucide="x" style="color: var(--text-muted);"></i>
          </span>
        </div>
        <form id="addStudentForm">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label for="addStudentName">اسم الدارس الجديد بالكامل</label>
              <input type="text" id="addStudentName" class="form-control" required placeholder="اكتب الاسم بالكامل">
            </div>
            <div class="form-group">
              <label for="addStudentAge">العمر</label>
              <input type="number" id="addStudentAge" class="form-control" required placeholder="مثال: 12">
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
            <div class="form-group">
              <label for="addSubscriptionType" style="font-weight: 700;">نوع الاشتراك</label>
              <select id="addSubscriptionType" class="form-control" style="border: 1px solid var(--border-color); width: 100%; font-weight: 600;">
                <option value="individual" selected>فردي 👤</option>
                <option value="group">مجموعة 👥</option>
              </select>
            </div>
            <div class="form-group" id="addGroupSelectContainer" style="display: none;">
              <label for="addStudentGroupSelect" style="font-weight: 700;">اختر المجموعة التابع لها</label>
              <select id="addStudentGroupSelect" class="form-control" style="border: 1px solid var(--border-color); width: 100%; font-weight: 600;">
                <option value="">-- اختر المجموعة --</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
            <div class="form-group">
              <label for="addStudentTeacher">المعلم المشرف المعتمد</label>
              <select id="addStudentTeacher" class="form-control" required>
                <option value="">اختر معلماً...</option>
                ${n}
              </select>
            </div>
            <div class="form-group">
              <label for="addStudentTime">موعد الحصة الافتراضي</label>
              <select id="addStudentTime" class="form-control" style="border: 1px solid var(--border-color); width: 100%;">
                <option value="">-- اختر وقت الحصة --</option>
                <option value="08:00 صباحاً">08:00 صباحاً</option>
                <option value="08:30 صباحاً">08:30 صباحاً</option>
                <option value="09:00 صباحاً">09:00 صباحاً</option>
                <option value="09:30 صباحاً">09:30 صباحاً</option>
                <option value="10:00 صباحاً">10:00 صباحاً</option>
                <option value="10:30 صباحاً">10:30 صباحاً</option>
                <option value="11:00 صباحاً">11:00 صباحاً</option>
                <option value="11:30 صباحاً">11:30 صباحاً</option>
                <option value="12:00 مساءً">12:00 مساءً</option>
                <option value="12:30 مساءً">12:30 مساءً</option>
                <option value="01:00 مساءً">01:00 مساءً</option>
                <option value="01:30 مساءً">01:30 مساءً</option>
                <option value="02:00 مساءً">02:00 مساءً</option>
                <option value="02:30 مساءً">02:30 مساءً</option>
                <option value="03:00 مساءً">03:00 مساءً</option>
                <option value="03:30 مساءً">03:30 مساءً</option>
                <option value="04:00 مساءً">04:00 مساءً</option>
                <option value="04:30 مساءً">04:30 مساءً</option>
                <option value="05:00 مساءً">05:00 مساءً</option>
                <option value="05:30 مساءً" selected>05:30 مساءً</option>
                <option value="06:00 مساءً">06:00 مساءً</option>
                <option value="06:30 مساءً">06:30 مساءً</option>
                <option value="07:00 مساءً">07:00 مساءً</option>
                <option value="07:30 مساءً">07:30 مساءً</option>
                <option value="08:00 مساءً">08:00 مساءً</option>
                <option value="08:30 مساءً">08:30 مساءً</option>
                <option value="09:00 مساءً">09:00 مساءً</option>
                <option value="09:30 مساءً">09:30 مساءً</option>
                <option value="10:00 مساءً">10:00 مساءً</option>
                <option value="10:30 مساءً">10:30 مساءً</option>
                <option value="11:00 مساءً">11:00 مساءً</option>
                <option value="11:30 مساءً">11:30 مساءً</option>
              </select>
            </div>
          </div>
          
          <div class="form-group" style="margin-top: 1rem;">
            <label for="addStudentNotes">ملاحظات أولية أو أهداف الدراسة</label>
            <textarea id="addStudentNotes" class="form-control" rows="2" placeholder="اكتب مستوى الطالب التعليمي أو الأهداف التعليمية للمتابعة..."></textarea>
          </div>

          <h4 style="font-size: 0.85rem; font-weight: 800; color: var(--primary-color); margin-top: 1.5rem; margin-bottom: 1rem; border-right: 3px solid var(--primary-color); padding-right: 0.5rem; line-height: 1;">أيام الحصص المجدولة أسبوعيًا</h4>
          <div class="form-group">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;" id="addStudentDaysContainer">
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer;"><input type="checkbox" value="السبت"> السبت</label>
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer;"><input type="checkbox" value="الأحد"> الأحد</label>
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer;"><input type="checkbox" value="الاثنين"> الاثنين</label>
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer;"><input type="checkbox" value="الثلاثاء"> الثلاثاء</label>
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer;"><input type="checkbox" value="الأربعاء"> الأربعاء</label>
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer;"><input type="checkbox" value="الخميس"> الخميس</label>
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer;"><input type="checkbox" value="الجمعة"> الجمعة</label>
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
            <button type="submit" class="btn btn-primary">تسجيل وحفظ</button>
            <button type="button" class="btn btn-secondary" id="btnCancelAddStudent">إلغاء</button>
          </div>
        </form>
      </div>
    `,document.body.appendChild(e),e.querySelector("#btnCloseAddModalBtn").addEventListener("click",()=>e.style.display="none"),e.querySelector("#btnCancelAddStudent").addEventListener("click",()=>e.style.display="none");const r=e.querySelector("#addSubscriptionType"),o=e.querySelector("#addGroupSelectContainer"),a=e.querySelector("#addStudentGroupSelect");r&&r.addEventListener("change",()=>{const i=r.value==="group";o&&(o.style.display=i?"block":"none"),i&&te()}),a&&a.addEventListener("change",()=>{const i=a.options[a.selectedIndex];if(i&&i.value){const s=i.dataset.teacherid,t=i.dataset.day,l=i.dataset.time;if(s&&(e.querySelector("#addStudentTeacher").value=s),l&&(e.querySelector("#addStudentTime").value=l),t){const y=e.querySelector(`#addStudentDaysContainer input[value="${t}"]`);y&&(y.checked=!0)}}}),e.querySelector("#addStudentForm").addEventListener("submit",async i=>{var d,w;i.preventDefault();const s=i.target.querySelector('button[type="submit"]'),t=e.querySelector("#addStudentName").value.trim(),l=parseInt(e.querySelector("#addStudentAge").value)||0,y=((d=e.querySelector("#addSubscriptionType"))==null?void 0:d.value)||"individual",g=((w=e.querySelector("#addStudentGroupSelect"))==null?void 0:w.value)||"",x=e.querySelector("#addStudentTeacher").value,T=e.querySelector("#addStudentTime").value.trim(),$=e.querySelector("#addStudentNotes").value.trim();let v="";if(y==="group"&&g){const c=oe.find(p=>p.id===g);if(c&&(v=c.name,(c.studentIds||[]).length>=parseInt(c.maxStudents||10))){L.error(`المجموعة (${c.name}) وصلت للحد الأقصى للطلاب!`);return}}const u=[];e.querySelectorAll('#addStudentDaysContainer input[type="checkbox"]').forEach(c=>{c.checked&&u.push(c.value)}),await $e.executeProtected({opName:"ADD_STUDENT",button:s,lockKey:`add_student_${t.toLowerCase()}`,idempotencyKey:`idem_add_student_${t.toLowerCase()}_${x}`,duplicateCheck:async()=>await $e.checkDuplicate("students",[we("name","==",t),we("status","==","active")],`الطالب (${t}) موجود مسبقاً بالنظام`),actionFn:async()=>{const c=P.find(h=>h.uid===x),p=c?c.name:"المعلم المعتمد",m={name:t,age:l,teacherId:x,teacherName:p,subscriptionType:y,groupId:y==="group"?g:null,groupName:y==="group"?v:"",time:T,notes:$,days:u,sessionsCount:0,hoursCount:0,averageRating:5,status:"active",createdAt:new Date().toISOString()},f=await ee(U(N,"students"),m);return y==="group"&&g&&await ye(g,f.id),await ae(f.id,m),await Q(A.currentUser.uid,(S==null?void 0:S.name)||"المشرف","ADD_STUDENT",f.id,{studentName:t}),e.style.display="none",e.querySelector("#addStudentForm").reset(),{id:f.id}},successMsg:`تم تسجيل الطالب (${t}) بنجاح وتعيينه للمشرف.`})})}ve(),te(),e.style.display="flex",window.lucide&&window.lucide.createIcons()}function ct(){var T,$,v,u,d,w;const e=document.getElementById("adminStudentSearchInput");e&&e.addEventListener("input",Fe(c=>{X=1,O(c.target.value)},250));const n=c=>{const p=c.target.closest(".btn-view-packages")||c.target.closest(".student-pkg-badge-trigger");if(p){const b=p.dataset.id;b&&Be(b);return}const m=c.target.closest(".btn-wa-student");if(m){const b=m.dataset.id,I=M.find(B=>B.id===b);I&&Je({student:I,templateType:I.remainingLessons!==void 0&&parseInt(I.remainingLessons)<=0?"overdraft":"statement"});return}const f=c.target.closest(".btn-report-student");if(f){const b=f.dataset.id,I=M.find(B=>B.id===b);I&&We(b,I);return}const h=c.target.closest(".btn-edit-student");if(h){const b=h.dataset.id;dt(b);return}const k=c.target.closest(".btn-delete-student");if(k){const b=k.dataset.id;st(b);return}},r=document.getElementById("studentsTableBody");r&&!r.dataset.listenerAttached&&(r.addEventListener("click",n),r.dataset.listenerAttached="true");const o=document.getElementById("studentsGridContainer");o&&!o.dataset.listenerAttached&&(o.addEventListener("click",n),o.dataset.listenerAttached="true");const a=document.getElementById("btnListView"),i=document.getElementById("btnGridView");a&&i&&(a.addEventListener("click",()=>{me="table",localStorage.setItem("admin_students_view_mode","table");const c=e?e.value:"";O(c)}),i.addEventListener("click",()=>{me="grid",localStorage.setItem("admin_students_view_mode","grid");const c=e?e.value:"";O(c)}));const s=document.getElementById("openAddStudentModal");s&&s.addEventListener("click",()=>{lt()});const t=document.getElementById("btnCloseEditModalBtn");t&&t.addEventListener("click",ce);const l=document.getElementById("btnCancelEditStudent");l&&l.addEventListener("click",ce);const y=document.getElementById("editStudentForm");y&&y.addEventListener("submit",async c=>{var he,Se,xe;if(c.preventDefault(),!D)return;const p=document.getElementById("editStudentName").value.trim(),m=parseInt(document.getElementById("editStudentAge").value)||0,f=((he=document.getElementById("editStudentPhone"))==null?void 0:he.value.trim())||"",h=document.getElementById("editStudentStatus").value,k=document.getElementById("editStudentTeacher").value,b=document.getElementById("editStudentTime").value.trim(),I=parseInt(document.getElementById("editStudentSessionsCount").value)||0,B=parseFloat(document.getElementById("editStudentHoursCount").value)||0,ie=parseFloat(document.getElementById("editStudentAverageRating").value)||5,W=document.getElementById("editStudentNotes").value.trim(),q=[];document.querySelectorAll('#editStudentDaysContainer input[type="checkbox"]').forEach(E=>{E.checked&&q.push(E.value)});const K=document.getElementById("editStudentDifferentTimesToggle"),J=K?K.checked:!1,_={};J&&document.querySelectorAll("#editStudentPerDayTimesList select.admin-day-time-select").forEach(E=>{E.dataset.day&&E.value&&(_[E.dataset.day]=E.value)});const H=b||Object.values(_)[0]||"غير محدد",G=((Se=document.getElementById("editSubscriptionType"))==null?void 0:Se.value)||"individual",z=((xe=document.getElementById("editStudentGroupSelect"))==null?void 0:xe.value)||"",fe=M.find(E=>E.id===D),j=fe?fe.groupId:null;let be="";if(G==="group"&&z){const E=oe.find(Z=>Z.id===z);if(E&&(be=E.name,j!==z&&(E.studentIds||[]).length>=parseInt(E.maxStudents||10))){L.error(`المجموعة (${E.name}) وصلت للحد الأقصى للطلاب!`);return}}try{const E=P.find(qe=>qe.uid===k),Z=E?E.name:"";await ge(ne(N,"students",D),{name:p,age:m,phone:f,whatsapp:f,parentPhone:f,status:h,teacherId:k,...Z?{teacherName:Z}:{},subscriptionType:G,groupId:G==="group"?z:null,groupName:G==="group"?be:"",time:H,sessionTime:H,sessionsCount:I,hoursCount:B,averageRating:ie,notes:W,days:q,sessionDays:q,schedule:{days:q,uniformTime:H,differentTimes:J,times:_}}),G==="group"&&z?(j&&j!==z&&await Te(j,D),await ye(z,D)):G==="individual"&&j&&await Te(j,D),await ae(D),await Q(A.currentUser.uid,S.name||"المشرف","EDIT_STUDENT",D,{studentName:p}),L.success("تم تحديث كافة حقول الدارس بنجاح."),ce()}catch(E){console.error(E),L.error("فشل تحديث بيانات الدارس.")}}),(T=document.getElementById("btnCloseStudentPackagesModal"))==null||T.addEventListener("click",Ce),($=document.getElementById("btnClosePackagesModalBtn"))==null||$.addEventListener("click",Ce),(v=document.getElementById("btnQuickRenewFromModal"))==null||v.addEventListener("click",()=>{Y&&Pe(Y)}),(u=document.getElementById("btnToggleArchiveSection"))==null||u.addEventListener("click",ut),(d=document.getElementById("btnCloseQuickRenewModal"))==null||d.addEventListener("click",ue),(w=document.getElementById("btnCancelQuickRenew"))==null||w.addEventListener("click",ue);const g=document.getElementById("renewPackageTemplateSelect");g&&g.addEventListener("change",c=>{const p=c.target.options[c.target.selectedIndex];if(p&&p.dataset.sessions){const m=document.getElementById("renewPackageTotalLessons");m&&(m.value=p.dataset.sessions)}if(p&&p.dataset.price){const m=document.getElementById("renewPackagePrice");m&&(m.value=p.dataset.price)}if(p&&p.dataset.duration){const m=document.getElementById("renewPackageDuration");m&&(m.value=p.dataset.duration)}});const x=document.getElementById("quickRenewStudentForm");x&&x.addEventListener("submit",async c=>{var m,f;c.preventDefault();const p=document.getElementById("btnSubmitQuickRenew");p&&(p.disabled=!0);try{const h=document.getElementById("renewModalStudentId").value,k=M.find(H=>H.id===h),b=k?k.name:"طالب",I=document.getElementById("renewPackageTemplateSelect"),B=I?I.options[I.selectedIndex]:null,ie=B&&B.value?B.dataset.name||B.text:"باقة حصص مجددة",W=parseInt(document.getElementById("renewPackageTotalLessons").value,10)||8,q=parseFloat(document.getElementById("renewPackagePrice").value)||0,K=parseInt(document.getElementById("renewPackageDuration").value,10)||60,J=document.getElementById("renewPackageStartDate").value||new Date().toISOString().split("T")[0],_=document.getElementById("renewPackageNotes").value.trim();await De({studentId:h,studentName:b,packageId:(I==null?void 0:I.value)||"pkg_renew",packageName:ie,totalLessons:W,lessonDuration:K,price:q,totalAmount:q,totalPaid:0,startDate:J,notes:_,reason:"تجديد باقة وأرشفة الباقة السابقة",actor:{uid:((m=A.currentUser)==null?void 0:m.uid)||"admin",name:(S==null?void 0:S.name)||((f=A.currentUser)==null?void 0:f.displayName)||"مدير الأكاديمية"}}),L.success(`تم تجديد باقة (${b}) وتفعيل ${W} حصص وأرشفة الباقة السابقة بنجاح! 🔄`),ue(),Y===h&&await Be(h)}catch(h){console.error(h),L.error(h.message||"حدث خطأ أثناء تجديد باقة الدارس.")}finally{p&&(p.disabled=!1)}})}let Y=null,Ne=0;function ut(){const e=document.getElementById("studentArchiveCollapsibleContainer"),n=document.getElementById("btnToggleArchiveSection"),r=document.getElementById("archiveToggleText"),o=document.getElementById("archiveToggleIcon");if(!e)return;e.style.display==="none"||!e.style.display?(e.style.display="block",r&&(r.textContent="إخفاء أرشيف الاشتراكات 🔼"),n&&(n.classList.remove("btn-secondary"),n.classList.add("btn-primary")),o&&o.setAttribute("data-lucide","eye-off")):(e.style.display="none",r&&(r.textContent=`عرض أرشيف الاشتراكات (${Ne}) 📦`),n&&(n.classList.remove("btn-primary"),n.classList.add("btn-secondary")),o&&o.setAttribute("data-lucide","eye")),window.lucide&&window.lucide.createIcons()}async function Be(e){var T;Y=e;const n=M.find($=>$.id===e),r=n?n.name:"طالب",o=document.getElementById("packagesModalStudentSubtitle");o&&(o.innerHTML=`الدارس: <strong style="color: var(--text-primary);">${r}</strong> (معرف: ${e})`);const a=document.getElementById("activePackageContainer"),i=document.getElementById("studentArchiveTableBody"),s=document.getElementById("archiveCountBadge"),t=document.getElementById("studentArchiveCollapsibleContainer"),l=document.getElementById("btnToggleArchiveSection"),y=document.getElementById("archiveToggleText"),g=document.getElementById("archiveToggleIcon");t&&(t.style.display="none"),l&&(l.classList.remove("btn-primary"),l.classList.add("btn-secondary")),g&&g.setAttribute("data-lucide","eye"),y&&(y.textContent="عرض أرشيف الاشتراكات (0) 📦"),a&&(a.innerHTML='<div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">جاري تحميل تفاصيل الباقة الحالية...</div>'),i&&(i.innerHTML='<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">جاري تحميل أرشيف الاشتراكات...</td></tr>');const x=document.getElementById("studentPackagesModal");x&&(x.style.display="flex");try{const $=await Ke(e),{activePackage:v,archivedPackages:u}=$;if(Ne=u.length,a)if(!v)a.innerHTML=`
          <div style="background: rgba(239, 68, 68, 0.04); border: 1px dashed var(--danger); border-radius: 10px; padding: 1.25rem; text-align: center;">
            <div style="font-weight: 700; color: var(--danger); font-size: 0.95rem; margin-bottom: 0.5rem;">
              لا توجد باقة نشطة حالياً لهذا الدارس
            </div>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;">
              يمكنك تفعيل باقة جديدة وتعيين رصيد الحصص فوراً من خلال زر التجديد السريع.
            </p>
            <button type="button" class="btn btn-sm btn-primary btn-open-renew-from-empty" style="background: var(--primary-color); border-color: var(--primary-color);">
              <i data-lucide="plus-circle" style="width: 14px; height: 14px;"></i> تفعيل وإسناد باقة جديدة
            </button>
          </div>
        `,(T=a.querySelector(".btn-open-renew-from-empty"))==null||T.addEventListener("click",()=>{Pe(e)});else{const d=parseInt(v.totalLessons)||0,w=parseInt(v.usedLessons)||0,c=parseInt(v.remainingLessons)||0,p=d>0?Math.min(100,Math.round(w/d*100)):0,m=c<0;let f='<span class="badge" style="background: rgba(16,185,129,0.12); color: var(--success); font-weight: 800;">نشط 🟢</span>';m?f=`<span class="badge" style="background: rgba(239,68,68,0.15); color: var(--danger); font-weight: 800;">دين حصص (${c}) ⚠️</span>`:c===0?f='<span class="badge" style="background: rgba(245,158,11,0.15); color: #d97706; font-weight: 800;">يستحق الدفع (0 متبقي) 💳</span>':c===1&&(f='<span class="badge" style="background: rgba(234,179,8,0.15); color: #b45309; font-weight: 800;">قارب على الانتهاء (حصة واحدة) ⏳</span>');const h=v.renewalCount&&v.renewalCount>1?`<span class="badge" style="background: rgba(99, 102, 241, 0.12); color: var(--primary-color); font-weight: 700; display: inline-flex; align-items: center; gap: 0.2rem;">
              <i data-lucide="refresh-cw" style="width: 10px; height: 10px;"></i> دورة تجديد #${v.renewalCount}
            </span>`:'<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success); font-weight: 700;">الباقة الحالية</span>',k=parseFloat(v.price)||0,b=parseFloat(v.totalAmount)||k,I=parseFloat(v.totalPaid)||0,B=Math.max(0,b-I);a.innerHTML=`
          <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 10px; padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <strong style="font-size: 1.1rem; color: var(--text-primary);">${v.packageName||"باقة الحصص"}</strong>
                  ${h}
                </div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                  ⏱️ مدة الحصة: <strong>${v.lessonDuration||30} دقيقة</strong> | 💰 السعر: <strong>${b} ج.م</strong> (${B===0?"مسدد بالكامل":`متبقي: ${B} ج.م`})
                </div>
              </div>
              <div>${f}</div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
              <div style="background: var(--card-bg, #fff); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.65rem 0.85rem; text-align: center;">
                <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">إجمالي الحصص</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-top: 0.2rem;">${d}</div>
              </div>
              <div style="background: var(--card-bg, #fff); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.65rem 0.85rem; text-align: center;">
                <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">المستخدم (المستهلك)</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: #d97706; margin-top: 0.2rem;">${w}</div>
              </div>
              <div style="background: var(--card-bg, #fff); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.65rem 0.85rem; text-align: center;">
                <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">المتبقي</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: ${m?"var(--danger)":c===0?"#ea580c":c===1?"#d97706":"var(--success)"}; margin-top: 0.2rem;">${c}</div>
              </div>
              <div style="background: var(--card-bg, #fff); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.65rem 0.85rem; text-align: center;">
                <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">تاريخ البداية</div>
                <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-top: 0.35rem;">${v.startDate||"-"}</div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 0.35rem;">
                <span style="color: var(--text-secondary); font-weight: 600;">نسبة استهلاك رصيد الحصص:</span>
                <span style="color: var(--text-primary); font-weight: 800;">${p}% (${w}/${d} حصة)</span>
              </div>
              <div style="width: 100%; height: 8px; background: rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden;">
                <div style="width: ${p}%; height: 100%; background: ${m?"var(--danger)":c===0?"#ea580c":c===1?"#d97706":"var(--success)"}; transition: width 0.3s ease;"></div>
              </div>
            </div>
          </div>
        `}s&&(s.textContent=`${u.length} باقة سابقة`),y&&(y.textContent=`عرض أرشيف الاشتراكات (${u.length}) 📦`),i&&(u.length===0?i.innerHTML='<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">لا توجد باقات سابقة في الأرشيف (هذه هي الباقة الأولى للدارس).</td></tr>':i.innerHTML=u.map((d,w)=>{var I;const c=parseInt(d.usedLessons)||0,p=parseInt(d.totalLessons)||0,m=parseInt(d.remainingLessons)||0,f=parseFloat(d.price)||0,h=parseFloat(d.totalAmount)||f,k=parseFloat(d.totalPaid)||h,b=Math.max(0,h-k);return`
            <tr style="background: rgba(100, 116, 139, 0.02);">
              <td>
                <strong style="color: var(--text-primary); font-size: 0.88rem;">${d.packageName||"باقة حصص"}</strong>
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.1rem;">معرف: ${d.id?d.id.slice(0,8):"-"}</div>
              </td>
              <td>
                <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">من: ${d.startDate||"-"}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.1rem;">إلى: ${d.endDate||d.expiryDate||"تاريخ الأرشفة"}</div>
              </td>
              <td>
                <strong style="color: var(--primary-color); font-size: 0.88rem;">${c} / ${p}</strong>
                <div style="font-size: 0.7rem; color: var(--text-muted);">${m<=0?"مكتملة بالكامل ✅":`متبقي: ${m}`}</div>
              </td>
              <td>
                <strong style="color: var(--text-primary); font-size: 0.85rem;">${h} ج.م</strong>
                <div style="font-size: 0.72rem; color: ${b===0?"var(--success)":"var(--danger)"}; font-weight: 700; margin-top: 0.1rem;">
                  ${b===0?"مسدد بالكامل":`متبقي: ${b} ج.م`}
                </div>
              </td>
              <td><span class="badge" style="background: rgba(100,116,139,0.15); color: #475569; font-weight: 800; border: 1px solid rgba(100,116,139,0.3);">مؤرشفة 📦</span></td>
              <td><span class="badge" style="background: rgba(99, 102, 241, 0.1); color: var(--primary-color); font-weight: 700;">دورة #${d.renewalCount||u.length-w}</span></td>
              <td>
                <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-primary);">${d.lastReceiptId||d.receiptNumber||"محفوظ محاسبياً"}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.1rem;">${d.lastPaymentDate||(I=d.archivedAt)!=null&&I.toDate?d.archivedAt.toDate().toLocaleDateString("ar-EG"):d.paymentMethod||"مسجل"}</div>
              </td>
            </tr>
          `}).join("")),window.lucide&&window.lucide.createIcons()}catch($){console.error("Failed to load student packages archive:",$),a&&(a.innerHTML='<div style="color: var(--danger); padding: 1rem; text-align: center;">حدث خطأ أثناء تحميل باقات الطالب.</div>')}}function Ce(){const e=document.getElementById("studentPackagesModal");e&&(e.style.display="none")}function Pe(e){const n=M.find(l=>l.id===e),r=n?n.name:"طالب";document.getElementById("renewModalStudentId").value=e;const o=document.getElementById("renewStudentNameDisplay");o&&(o.textContent=`الدارس: ${r}`);const a=document.getElementById("renewPackageTemplateSelect");a&&(V.length>0?a.innerHTML='<option value="">-- اختر باقة للتجديد --</option>'+V.map(l=>{const y=Me(l),g=l.duration||l.sessionDuration||l.lessonDuration||60;return`<option value="${l.id}" data-name="${l.name}" data-price="${l.price}" data-sessions="${y}" data-duration="${g}">${l.name} (${l.price} ج.م - ${y} حصص)</option>`}).join(""):a.innerHTML=`
        <option value="">-- اختر باقة للتجديد --</option>
        <option value="pkg_4" data-name="باقة 4 حصص" data-price="300" data-sessions="4" data-duration="60">باقة 4 حصص (300 ج.م)</option>
        <option value="pkg_8" data-name="باقة 8 حصص" data-price="500" data-sessions="8" data-duration="60">باقة 8 حصص (500 ج.م)</option>
        <option value="pkg_12" data-name="باقة 12 حصة" data-price="700" data-sessions="12" data-duration="60">باقة 12 حصة (700 ج.م)</option>
      `);const i=new Date().toISOString().split("T")[0],s=document.getElementById("renewPackageStartDate");s&&(s.value=i);const t=document.getElementById("quickRenewStudentModal");t&&(t.style.display="flex")}function ue(){const e=document.getElementById("quickRenewStudentModal");e&&(e.style.display="none")}
