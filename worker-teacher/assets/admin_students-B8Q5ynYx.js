import{a as A,d as D,r as Pe,R as Se,T as L,s as Be}from"./rbacService-D2RrsA9d.js";import{getDoc as qe,doc as oe,onSnapshot as Y,collection as q,updateDoc as pe,addDoc as ne,serverTimestamp as ce,where as xe}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import{p as ze}from"./authService-CtWWGArP.js";import{r as Ge,a as je,L as He,p as Re,j as _e,k as we,l as Fe,T as Ee}from"./navbar-BWutcREu.js";import{s as Oe}from"./trashService-17CPxIjU.js";import{w as W}from"./auditService-D31EusTs.js";import{o as Ue}from"./studentReportCard-D3YWKqS6.js";import{a as me,r as Ie}from"./newGroupsService-nXFU0cvk.js";import{a as Ce,g as Ve}from"./creditManager-CewcMcqw.js";import{r as $e,o as Qe}from"./whatsappWidget-BgZo_pma.js";import{backfillOperationalProjectionsIfNeeded as We,syncStudentOperationalSummary as ie}from"./supervisorDomainService-BW5mzJbW.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./activityLogger-BK9d5021.js";import"./quranData-BxaWbcIK.js";ze("admin");const V=new He,Ke=`
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
`;function Je(t,n,r={},o="05:30 مساءً"){const a=document.getElementById(t);if(a){if(!n||n.length===0){a.innerHTML='<div style="grid-column: 1/-1; color: var(--text-muted); font-size: 0.8rem;">يرجى اختيار الأيام أولاً لتحديد موعد الحصة لكل يوم.</div>';return}a.innerHTML=n.map(i=>`
      <div class="form-group" style="margin: 0;">
        <label style="font-size: 0.78rem; font-weight: 700; color: var(--primary-color); display: block; margin-bottom: 0.25rem;">موعد يوم ${i}:</label>
        <select class="form-control admin-day-time-select" data-day="${i}" style="border: 1px solid var(--border-color); width: 100%; font-size: 0.85rem;">
          <option value="">-- اختر موعد ${i} --</option>
          ${Ke}
        </select>
      </div>
    `).join(""),a.querySelectorAll(".admin-day-time-select").forEach(i=>{const s=i.dataset.day;r&&r[s]?i.value=r[s]:o&&(i.value=o)})}}let M=[],j=[],P=[],F=[],Q=[],S=null,N=null,C=null;A.onAuthStateChanged(async t=>{if(t)try{const n=await qe(oe(D,"users",t.uid));if(n.exists()){S=n.data();const r=Pe(S),o=r===Se.SUPERVISOR?"مشرف الأكاديمية":r===Se.TEACHER?"معلم":"مدير الأكاديمية";Ge("students","admin"),je("إدارة شؤون الطلاب والدارسين",{name:S.name||"الإدارة العامة",roleName:o}),Ze()}}catch(n){console.error("Error loading admin data:",n)}});function Ze(){V.unsubscribeAll(),We().catch(a=>console.warn("Backfill operational summaries warning:",a));const t=Y(q(D,"packages"),a=>{F=[],a.forEach(i=>{F.push({id:i.id,...i.data()})}),De()},a=>console.warn("Error fetching packages:",a));V.register("packages",t);const n=Y(q(D,"groups"),a=>{Q=[],a.forEach(i=>{Q.push({id:i.id,...i.data()})}),ae(),H()},a=>console.warn("Error fetching groups:",a));V.register("groups",n);const r=Y(q(D,"users"),a=>{P=[],a.forEach(i=>{const s=i.data();s.role==="teacher"&&s.status==="approved"&&P.push({uid:i.id,...s})}),ge(),H()},a=>console.warn("Error fetching teachers:",a));V.register("users",r);const o=Y(q(D,"students"),a=>{M=[],j=[],a.forEach(i=>{const s={id:i.id,...i.data()};s.status==="pending_approval"?j.push(s):M.push(s)}),Xe(),H()},a=>console.warn("Error fetching students:",a));V.register("students",o),dt(),nt()}function ge(){const t=P.map(a=>`<option value="${a.uid}">${a.name}</option>`).join(""),n=document.getElementById("editStudentTeacher");if(n){const a=n.value;n.innerHTML='<option value="">اختر معلماً مشرفاً...</option>'+t,a&&(n.value=a)}const r=document.getElementById("approveTeacherSelect");if(r){const a=r.value;r.innerHTML='<option value="">اختر المعلم المشرف...</option>'+t,a&&(r.value=a)}const o=document.getElementById("addStudentTeacher");if(o){const a=o.value;o.innerHTML='<option value="">اختر معلماً مشرفاً معتمداً...</option>'+t,a&&(o.value=a)}}function ae(){const t=document.getElementById("editStudentGroupSelect"),n=document.getElementById("addStudentGroupSelect"),r=Q.filter(a=>(a.status||"active")==="active"),o=r.length>0?r.map(a=>{const i=(a.studentIds||[]).length,s=parseInt(a.maxStudents)||10,e=i>=s,l=a.day||a.time?` - [${a.day||""} ${a.time||""}]`:"";return`<option value="${a.id}" data-teacherid="${a.teacherId||""}" data-day="${a.day||"السبت"}" data-time="${a.time||"05:30 مساءً"}" ${e?"disabled":""}>${a.name} (${a.teacherName||"معلم"})${l} - (${i}/${s} طالب) ${e?"⚠️ مكتملة":""}</option>`}).join(""):'<option value="" disabled>لا توجد مجموعات نشطة حالياً</option>';if(t){const a=t.value;t.innerHTML='<option value="">-- اختر المجموعة --</option>'+o,a&&(t.value=a)}if(n){const a=n.value;n.innerHTML='<option value="">-- اختر المجموعة --</option>'+o,a&&(n.value=a)}}function Le(t){if(!t)return 4;const n=t.totalSessions??t.sessionsCount??t.sessions??t.totalLessons??t.lessonsCount,r=parseInt(n,10);return!isNaN(r)&&r>0?r:4}function De(){const t=document.getElementById("approvePackageSelect");t&&(F.length>0?t.innerHTML='<option value="">-- اختر الباقة التعليمية المناسبة للطالب --</option>'+F.map(n=>{const r=Le(n),o=n.duration||n.sessionDuration||n.lessonDuration||60;return`<option value="${n.id}" data-price="${n.price}" data-name="${n.name}" data-sessions="${r}" data-duration="${o}">${n.name} (${n.price} ج.م - ${r} حصص)</option>`}).join(""):t.innerHTML=`
      <option value="">-- اختر الباقة التعليمية المناسبة للطالب --</option>
      <option value="pkg_4" data-price="300" data-name="باقة 4 حصص شهرياً" data-sessions="4" data-duration="60">باقة 4 حصص شهرياً (300 ج.م - 4 حصص)</option>
      <option value="pkg_8" data-price="500" data-name="باقة 8 حصص شهرياً" data-sessions="8" data-duration="60">باقة 8 حصص شهرياً (500 ج.م - 8 حصص)</option>
      <option value="pkg_12" data-price="700" data-name="باقة 12 حصة شهرياً" data-sessions="12" data-duration="60">باقة 12 حصة شهرياً (700 ج.م - 12 حصة)</option>
      <option value="pkg_custom" data-price="600" data-name="باقة تعليمية مخصصة" data-sessions="8" data-duration="60">باقة تعليمية مخصصة (600 ج.م)</option>
    `)}function Xe(){const t=document.getElementById("pendingStudentRequestsCard"),n=document.getElementById("pendingStudentsTableBody"),r=document.getElementById("pendingBadgeCount");if(!(!t||!n)){if(j.length===0){t.style.display="none";return}t.style.display="block",r&&(r.textContent=`${j.length} طلبات معلقة`),n.innerHTML=j.map(o=>{var l;const a=o.schedule&&o.schedule.days?o.schedule.days.join(" • "):o.sessionDays?o.sessionDays.join(" • "):"غير محدد",i=((l=o.schedule)==null?void 0:l.uniformTime)||o.sessionTime||o.time||"مرن",s=o.phone?o.phone:"لا يوجد هاتف",e=o.subscriptionType==="group"||o.groupId||o.requestedGroupId?`<span class="badge badge-info" style="position: static;">مجموعة ${o.requestedGroupName?`: ${o.requestedGroupName}`:""}</span>`:'<span class="badge badge-success" style="position: static;">فردية</span>';return`
      <tr>
        <td>
          <strong style="color: var(--text-primary); font-size: 0.92rem;">${o.name}</strong>
          ${o.email?`<div style="font-size: 0.75rem; color: var(--text-muted);">${o.email}</div>`:""}
          <div style="margin-top: 0.25rem;">${e}</div>
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
    `}).join(""),window.lucide&&window.lucide.createIcons(),n.querySelectorAll(".btn-approve-student").forEach(o=>{o.addEventListener("click",()=>{const a=o.getAttribute("data-id")||o.dataset.id;a&&tt(a)})}),n.querySelectorAll(".btn-reject-student").forEach(o=>{o.addEventListener("click",()=>{const a=o.getAttribute("data-id")||o.dataset.id;a&&at(a)})})}}let ue=localStorage.getItem("admin_students_view_mode")||"table";function Ye(){const t=document.getElementById("btnListView"),n=document.getElementById("btnGridView"),r=document.getElementById("studentsTableContainer"),o=document.getElementById("studentsGridContainer");!t||!n||(ue==="grid"?(n.style.backgroundColor="var(--primary-color)",n.style.color="#ffffff",t.style.backgroundColor="transparent",t.style.color="var(--text-secondary)",r&&(r.style.display="none"),o&&(o.style.display="grid")):(t.style.backgroundColor="var(--primary-color)",t.style.color="#ffffff",n.style.backgroundColor="transparent",n.style.color="var(--text-secondary)",r&&(r.style.display="block"),o&&(o.style.display="none")))}let ee=1;const et=20;function H(t=""){const n=document.getElementById("studentsTableBody"),r=document.getElementById("studentsGridContainer");if(!n||!r)return;Ye();const o=M.filter(e=>e.name&&e.name.toLowerCase().includes(t.toLowerCase()));if(o.length===0){n.innerHTML='<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">لا يوجد طلاب مطابقين للبحث.</td></tr>',r.innerHTML='<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">لا يوجد طلاب مطابقين للبحث.</div>';const e=document.getElementById("studentsPaginationContainer");e&&(e.innerHTML="");return}const{items:a,totalPages:i}=Re(o,ee,et);n.innerHTML=a.map(e=>{const l=P.find(d=>d.uid===e.teacherId),y=l?l.name:e.teacherName||'<span style="color:var(--danger); font-weight:600;">غير معين</span>';let g="";e.status==="active"||e.status==="Active"?g='<span class="badge badge-success">نشط</span>':e.status==="Suspended"?g='<span class="badge badge-warning">موقوف</span>':g='<span class="badge badge-neutral">مؤرشف</span>';const x=e.days&&Array.isArray(e.days)&&e.days.length>0?e.days.join("، "):e.sessionDays?e.sessionDays.join("، "):"غير محدد",T=e.time||e.sessionTime||"غير محدد",$=e.packageName?`<span class="badge badge-primary student-pkg-badge-trigger" data-id="${e.id}" style="position:static; margin-top:0.25rem; cursor:pointer;" title="انقر لعرض تفاصيل الباقة والأرشيف"><i data-lucide="layers" style="width:10px;height:10px;display:inline;"></i> ${e.packageName}</span>`:"",v=e.subscriptionType==="group"||e.groupId?`<span class="badge badge-info" style="position:static; margin-top:0.25rem;">مجموعة (${e.groupName||"دراسي"})</span>`:'<span class="badge badge-neutral" style="position:static; margin-top:0.25rem;">فردي</span>';let u="";if(e.remainingLessons!==void 0){const d=parseInt(e.remainingLessons)||0;d<0?u=`<span class="badge badge-danger student-pkg-badge-trigger" data-id="${e.id}" style="position:static; margin-top:0.25rem; cursor:pointer;" title="انقر لإدارة الباقة والتجديد">عجز حصص: ${d}</span>`:d===0?u=`<span class="badge badge-danger student-pkg-badge-trigger" data-id="${e.id}" style="position:static; margin-top:0.25rem; cursor:pointer;" title="انقر لتجديد الباقة">0 حصة (منتهي)</span>`:d<=3?u=`<span class="badge badge-warning student-pkg-badge-trigger" data-id="${e.id}" style="position:static; margin-top:0.25rem; cursor:pointer;" title="انقر لعرض رصيد الباقة">${d} حصص متبقية</span>`:u=`<span class="badge badge-success student-pkg-badge-trigger" data-id="${e.id}" style="position:static; margin-top:0.25rem; cursor:pointer;" title="انقر لعرض رصيد الباقة">${d} حصة متبقية</span>`}return`
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.92rem;">${e.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">مواعيد: ${x} • ${T}</div>
          <div style="display:flex; gap:0.3rem; flex-wrap:wrap; margin-top:0.25rem;">${v} ${$} ${u}</div>
        </td>
        <td>${e.age||"غير مسجل"} سنة</td>
        <td><strong>${y}</strong></td>
        <td>${e.sessionsCount||0} حصة</td>
        <td><div style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size:0.8rem; color:var(--text-secondary);" title="${e.notes||""}">${e.notes||"لا يوجد ملاحظات"}</div></td>
        <td><strong style="color: var(--primary-color);">${(parseFloat(e.averageRating)||5).toFixed(1)} / 5.0</strong></td>
        <td>${g}</td>
        <td>
          <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center;">
            <button class="btn btn-sm btn-secondary btn-view-packages" data-id="${e.id}" title="عرض تفاصيل الباقة الحالية وأرشيف الباقات السابقة" style="color: #4f46e5; border-color: #c7d2fe; display: flex; align-items: center; gap: 0.25rem; font-weight: 600;">
              <i data-lucide="layers" style="width:14px;height:14px;"></i> الباقات والأرشيف
            </button>
            <button class="btn btn-sm btn-secondary btn-wa-student" data-id="${e.id}" title="إرسال رسالة أو تذكير واتساب لولي الأمر" style="color: #16a34a; border-color: #86efac; display: flex; align-items: center; gap: 0.25rem;">
              <i data-lucide="message-square" style="width:14px;height:14px;"></i> واتساب
            </button>
            ${$e(e.waWarningCount||0)}
            <button class="btn btn-sm btn-secondary btn-report-student" data-id="${e.id}" style="color: var(--primary-color);">
              <i data-lucide="file-text" style="width:14px;height:14px;"></i> تقرير
            </button>
            <button class="btn btn-sm btn-secondary btn-edit-student" data-id="${e.id}">
              <i data-lucide="edit-3" style="width:14px;height:14px;"></i> تعديل
            </button>
            <button class="btn btn-sm btn-danger btn-delete-student" data-id="${e.id}">
              <i data-lucide="archive" style="width:14px;height:14px;"></i> أرشيف
            </button>
          </div>
        </td>
      </tr>
    `}).join(""),r.innerHTML=a.map(e=>{const l=P.find(d=>d.uid===e.teacherId),y=l?l.name:e.teacherName||'<span style="color:var(--danger); font-weight:600;">غير معين</span>';let g="";e.status==="active"||e.status==="Active"?g='<span class="badge badge-success">نشط</span>':e.status==="Suspended"?g='<span class="badge badge-warning">موقوف</span>':g='<span class="badge badge-neutral">مؤرشف</span>';const x=e.days&&Array.isArray(e.days)&&e.days.length>0?e.days.join("، "):e.sessionDays?e.sessionDays.join("، "):"غير محدد",T=e.time||e.sessionTime||"غير محدد",$=e.packageName?`<span class="badge badge-primary student-pkg-badge-trigger" data-id="${e.id}" style="position:static; cursor:pointer;" title="انقر لعرض تفاصيل الباقة والأرشيف"><i data-lucide="layers" style="width:10px;height:10px;display:inline;"></i> ${e.packageName}</span>`:"",v=e.subscriptionType==="group"||e.groupId?`<span class="badge badge-info" style="position:static;">مجموعة (${e.groupName||"دراسي"})</span>`:'<span class="badge badge-neutral" style="position:static;">فردي</span>';let u="";if(e.remainingLessons!==void 0){const d=parseInt(e.remainingLessons)||0;d<0?u=`<span class="badge badge-danger student-pkg-badge-trigger" data-id="${e.id}" style="position:static; cursor:pointer;" title="انقر لإدارة الباقة وتسوية الدين">دين: ${d}</span>`:d===0?u=`<span class="badge badge-danger student-pkg-badge-trigger" data-id="${e.id}" style="position:static; cursor:pointer;" title="انقر لتجديد الباقة وسداد الاشتراك">0 حصة (يستحق الدفع)</span>`:d===1?u=`<span class="badge badge-warning student-pkg-badge-trigger" data-id="${e.id}" style="position:static; cursor:pointer;" title="انقر لعرض رصيد الباقة">حصة واحدة (قارب على الانتهاء)</span>`:u=`<span class="badge badge-success student-pkg-badge-trigger" data-id="${e.id}" style="position:static; cursor:pointer;" title="انقر لعرض رصيد الباقة">${d} متبقية</span>`}return`
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 0.85rem;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.75rem;">
            <div>
              <strong style="font-size: 1rem; color: var(--text-primary); display: block;">${e.name}</strong>
              <span style="font-size: 0.78rem; color: var(--text-muted);">${e.age||"غير مسجل"} سنة</span>
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
              <span>${e.sessionsCount||0} حصة • تقييم: <strong style="color:var(--primary-color);">${(parseFloat(e.averageRating)||5).toFixed(1)}/5.0</strong></span>
            </div>
          </div>

          <div style="margin-bottom: 0.5rem; display:flex; gap:0.35rem; flex-wrap:wrap;">${v} ${$} ${u}</div>
          ${e.notes?`<p style="font-size: 0.75rem; color: var(--text-muted); margin: 0; background: var(--bg-primary); padding: 0.4rem 0.6rem; border-radius: var(--border-radius-sm); line-height: 1.4; border: 1px solid var(--border-color);">${e.notes}</p>`:""}
        </div>

        <div style="display: flex; gap: 0.35rem; border-top: 1px solid var(--border-color); padding-top: 0.65rem; flex-wrap: wrap;">
          <button class="btn btn-sm btn-secondary btn-view-packages" data-id="${e.id}" style="flex: 1 1 100%; justify-content: center; color: #4f46e5; border-color: #c7d2fe; display: flex; align-items: center; gap: 0.35rem; font-weight: 600;">
            <i data-lucide="layers" style="width: 14px; height: 14px;"></i> الباقات الحالية والأرشيف
          </button>
          <button class="btn btn-sm btn-secondary btn-wa-student" data-id="${e.id}" style="flex: 1 1 100%; justify-content: center; color: #16a34a; border-color: #86efac; display: flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="message-square" style="width: 14px; height: 14px;"></i> واتساب ولي الأمر ${$e(e.waWarningCount||0)}
          </button>
          <button class="btn btn-sm btn-secondary btn-report-student" data-id="${e.id}" style="flex: 1 1 100%; justify-content: center; color: var(--primary-color);">
            <i data-lucide="file-text" style="width: 14px; height: 14px;"></i> بطاقة تقرير شهري
          </button>
          <button class="btn btn-sm btn-secondary btn-edit-student" data-id="${e.id}" style="flex: 1; justify-content: center;">
            <i data-lucide="edit-3" style="width: 13px; height: 13px;"></i> تعديل
          </button>
          <button class="btn btn-sm btn-danger btn-delete-student" data-id="${e.id}" style="flex: 1; justify-content: center;">
            <i data-lucide="archive" style="width: 13px; height: 13px;"></i> أرشيف
          </button>
        </div>
      </div>
    `}).join("");let s=document.getElementById("studentsPaginationContainer");if(!s){s=document.createElement("div"),s.id="studentsPaginationContainer",s.style.marginTop="1rem";const e=n.closest(".card")||n.parentElement;e&&e.appendChild(s)}s&&(s.innerHTML=_e(ee,i),s.querySelectorAll(".btn-page").forEach(e=>{e.addEventListener("click",l=>{ee=parseInt(l.currentTarget.dataset.page),H(t)})})),we(n),we(r)}function tt(t){const n=j.find(e=>e.id===t);if(!n)return;C=n,document.getElementById("approveStudentId").value=n.id,document.getElementById("approveStudentNameDisplay").textContent=n.name,document.getElementById("approveStudentTeacherDisplay").textContent=n.requestedByTeacherName||n.teacherName||"غير محدد",ge(),De();const r=document.getElementById("approveTeacherSelect"),o=n.requestedByTeacherId||n.teacherId;r&&o&&(r.value=o);const a=new Date().toISOString().split("T")[0],i=new Date(Date.now()+720*60*60*1e3).toISOString().split("T")[0];document.getElementById("approveStartDate").value=a,document.getElementById("approveEndDate").value=i;const s=document.getElementById("approveStudentModal");s&&(s.style.display="flex")}function de(){const t=document.getElementById("approveStudentModal");t&&(t.style.display="none"),C=null}function nt(){var r,o;(r=document.getElementById("btnCloseApproveModalBtn"))==null||r.addEventListener("click",de),(o=document.getElementById("btnCancelApproveStudent"))==null||o.addEventListener("click",de);const t=document.getElementById("approvePackageSelect");t&&t.addEventListener("change",a=>{const i=a.target.options[a.target.selectedIndex];if(i&&i.dataset.price&&(document.getElementById("approvePackagePrice").value=i.dataset.price),i&&i.dataset.duration){const s=document.getElementById("approveSessionDuration");s&&(s.value=i.dataset.duration)}});const n=document.getElementById("approveStudentForm");n&&n.addEventListener("submit",async a=>{var E,c,p;if(a.preventDefault(),!C)return;const i=document.getElementById("approveStudentId").value,s=document.getElementById("approvePackageSelect"),e=s.options[s.selectedIndex],l=e?e.dataset.name||e.text:"باقة تعليمية معتمدة",y=parseFloat(document.getElementById("approvePackagePrice").value)||0,g=parseInt((E=document.getElementById("approveSessionDuration"))==null?void 0:E.value)||60,x=document.getElementById("approveTeacherSelect").value,T=P.find(m=>m.uid===x),$=T?T.name:C.teacherName,v=document.getElementById("approveStartDate").value,u=document.getElementById("approveEndDate").value,d=document.getElementById("btnSubmitApproveStudent");d&&(d.disabled=!0);try{const m=C.requestedGroupId||C.groupId||"",f=C.subscriptionType||(m?"group":"individual");if(await pe(oe(D,"students",i),{status:"active",teacherId:x,teacherName:$,packageName:l,packagePrice:y,sessionDuration:g,packageDuration:g,duration:g,subscriptionType:f,groupId:f==="group"?m:"",approvedAt:new Date().toISOString()}),await ie(i),f==="group"&&m)try{await me(m,i)}catch(b){console.warn("إضافة الطالب للمجموعة أثناء الاعتماد:",b)}const h=new Date().toISOString().substring(0,7),k=parseInt((c=e==null?void 0:e.dataset)==null?void 0:c.sessions)||8;await Ce({studentId:i,studentName:C.name,packageId:s.value||null,packageName:l,totalLessons:k,lessonDuration:g,price:y,discount:0,startDate:v,expiryDate:u,notes:"تم التفعيل عند اعتماد الطالب بواسطة الإدارة",actor:{uid:((p=A.currentUser)==null?void 0:p.uid)||"admin",name:(S==null?void 0:S.name)||"مدير الأكاديمية"}}),await ne(q(D,"subscriptions"),{studentId:i,studentName:C.name,month:h,packageName:l,planName:l,totalSessions:k,sessionDuration:g,price:y,discount:0,totalAmount:y,totalPaid:0,remainingAmount:y,status:"unpaid",startDate:v,endDate:u,createdAt:ce()}),x&&await ne(q(D,"notifications"),{title:"تمت الموافقة على إضافة الطالب وتفعيل باقته 🎉",body:`وافقت إدارة الأكاديمية على إضافة الطالب (${C.name})، وتم تعيينك معلماً له وتفعيل باقته (${l}) بمدة حصة (${g} دقيقة).`,recipientId:x,readBy:[],createdAt:ce()}),await W(A.currentUser.uid,(S==null?void 0:S.name)||"المشرف","APPROVE_STUDENT",i,{studentName:C.name,packageName:l}),L.success(`تمت الموافقة على الطالب (${C.name}) واعتماد باقته بنجاح 🎉`),de()}catch(m){console.error("خطأ اعتماد الطالب:",m),L.error("عذرًا، حدث خطأ أثناء تفعيل واعتماد الطالب.")}finally{d&&(d.disabled=!1)}})}async function at(t){const n=j.find(r=>r.id===t);n&&Be(`هل أنت متأكد من رفض طلب إضافة الطالب (${n.name}) المقدم من المعلم؟`,async()=>{try{await pe(oe(D,"students",t),{status:"rejected",rejectedAt:new Date().toISOString()}),await ie(t),n.teacherId&&await ne(q(D,"notifications"),{title:"إشعار بشأن طلب إضافة طالب ⚠️",body:`تعذر قبول طلب إضافة الطالب (${n.name}). يرجى التواصل مع إدارة الأكاديمية للتفاصيل.`,recipientId:n.teacherId,readBy:[],createdAt:ce()}),await W(A.currentUser.uid,(S==null?void 0:S.name)||"المشرف","REJECT_STUDENT_REQUEST",t,{studentName:n.name}),L.success("تم رفض طلب إضافة الطالب بنجاح.")}catch(r){console.error(r),L.error("حدث خطأ أثناء رفض الطلب.")}})}function ot(t){var T,$,v;const n=M.find(u=>u.id===t);if(!n)return;N=t,document.getElementById("editStudentName").value=n.name||"",document.getElementById("editStudentAge").value=n.age||"";const r=document.getElementById("editStudentPhone");r&&(r.value=n.phone||n.whatsapp||n.parentPhone||""),document.getElementById("editStudentStatus").value=n.status||"active",document.getElementById("editStudentTeacher").value=n.teacherId||"",document.getElementById("editStudentTime").value=((T=n.schedule)==null?void 0:T.uniformTime)||n.time||n.sessionTime||"",document.getElementById("editStudentSessionsCount").value=n.sessionsCount||0,document.getElementById("editStudentHoursCount").value=n.hoursCount||0,document.getElementById("editStudentAverageRating").value=n.averageRating||5,document.getElementById("editStudentNotes").value=n.notes||"";const o=document.getElementById("editSubscriptionType"),a=document.getElementById("editGroupSelectContainer"),i=document.getElementById("editStudentGroupSelect");if(ae(),o){const u=n.subscriptionType==="group"||!!n.groupId;o.value=u?"group":"individual",a&&(a.style.display=u?"block":"none"),i&&n.groupId&&(i.value=n.groupId),o.onchange=()=>{const d=o.value==="group";a&&(a.style.display=d?"block":"none")},i&&(i.onchange=()=>{const d=i.options[i.selectedIndex];if(d&&d.value){const E=d.dataset.teacherid,c=d.dataset.day,p=d.dataset.time;if(E&&(document.getElementById("editStudentTeacher").value=E),p&&(document.getElementById("editStudentTime").value=p),c){const m=s==null?void 0:s.querySelector(`input[value="${c}"]`);m&&(m.checked=!0)}}})}const s=document.getElementById("editStudentDaysContainer"),e=(($=n.schedule)==null?void 0:$.days)||n.days||n.sessionDays||[];s&&s.querySelectorAll('input[type="checkbox"]').forEach(d=>{d.checked=e.includes(d.value)});const l=document.getElementById("editStudentDifferentTimesToggle"),y=document.getElementById("editStudentDifferentTimesContainer");l&&(l.checked=((v=n.schedule)==null?void 0:v.differentTimes)||!1);function g(){var u,d;if(!(!l||!y))if(l.checked){y.style.display="block";const E=[];s==null||s.querySelectorAll('input[type="checkbox"]').forEach(p=>{p.checked&&E.push(p.value)});const c=((u=document.getElementById("editStudentTime"))==null?void 0:u.value)||"05:30 مساءً";Je("editStudentPerDayTimesList",E,((d=n.schedule)==null?void 0:d.times)||{},c)}else y.style.display="none"}l&&(l.onchange=g),s&&s.querySelectorAll('input[type="checkbox"]').forEach(u=>{u.onchange=g}),g();const x=document.getElementById("editStudentModal");x&&(x.style.display="flex")}function se(){const t=document.getElementById("editStudentModal");t&&(t.style.display="none"),N=null}async function it(t){const n=M.find(r=>r.id===t);n&&Be(`هل أنت متأكد من ترحيل الدارس (${n.name}) إلى سلة المحذوفات والأرشيف؟`,async()=>{try{await Oe("students",t,n,"أرشفة وحذف الطالب من قبل المشرف العام"),await W(A.currentUser.uid,(S==null?void 0:S.name)||"المشرف","ARCHIVE_STUDENT",t,{studentName:n.name}),L.success("تم ترحيل الطالب إلى سلة المحذوفات والأرشيف بنجاح.")}catch(r){console.error(r),L.error("فشل ترحيل الطالب إلى سلة المحذوفات.")}})}function rt(){let t=document.getElementById("addStudentModal");if(!t){t=document.createElement("div"),t.id="addStudentModal",t.className="modal-overlay";const n=P.map(i=>`<option value="${i.uid}">${i.name}</option>`).join("");t.innerHTML=`
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
    `,document.body.appendChild(t),t.querySelector("#btnCloseAddModalBtn").addEventListener("click",()=>t.style.display="none"),t.querySelector("#btnCancelAddStudent").addEventListener("click",()=>t.style.display="none");const r=t.querySelector("#addSubscriptionType"),o=t.querySelector("#addGroupSelectContainer"),a=t.querySelector("#addStudentGroupSelect");r&&r.addEventListener("change",()=>{const i=r.value==="group";o&&(o.style.display=i?"block":"none"),i&&ae()}),a&&a.addEventListener("change",()=>{const i=a.options[a.selectedIndex];if(i&&i.value){const s=i.dataset.teacherid,e=i.dataset.day,l=i.dataset.time;if(s&&(t.querySelector("#addStudentTeacher").value=s),l&&(t.querySelector("#addStudentTime").value=l),e){const y=t.querySelector(`#addStudentDaysContainer input[value="${e}"]`);y&&(y.checked=!0)}}}),t.querySelector("#addStudentForm").addEventListener("submit",async i=>{var d,E;i.preventDefault();const s=i.target.querySelector('button[type="submit"]'),e=t.querySelector("#addStudentName").value.trim(),l=parseInt(t.querySelector("#addStudentAge").value)||0,y=((d=t.querySelector("#addSubscriptionType"))==null?void 0:d.value)||"individual",g=((E=t.querySelector("#addStudentGroupSelect"))==null?void 0:E.value)||"",x=t.querySelector("#addStudentTeacher").value,T=t.querySelector("#addStudentTime").value.trim(),$=t.querySelector("#addStudentNotes").value.trim();let v="";if(y==="group"&&g){const c=Q.find(p=>p.id===g);if(c&&(v=c.name,(c.studentIds||[]).length>=parseInt(c.maxStudents||10))){L.error(`المجموعة (${c.name}) وصلت للحد الأقصى للطلاب!`);return}}const u=[];t.querySelectorAll('#addStudentDaysContainer input[type="checkbox"]').forEach(c=>{c.checked&&u.push(c.value)}),await Ee.executeProtected({opName:"ADD_STUDENT",button:s,lockKey:`add_student_${e.toLowerCase()}`,idempotencyKey:`idem_add_student_${e.toLowerCase()}_${x}`,duplicateCheck:async()=>await Ee.checkDuplicate("students",[xe("name","==",e),xe("status","==","active")],`الطالب (${e}) موجود مسبقاً بالنظام`),actionFn:async()=>{const c=P.find(h=>h.uid===x),p=c?c.name:"المعلم المعتمد",m={name:e,age:l,teacherId:x,teacherName:p,subscriptionType:y,groupId:y==="group"?g:null,groupName:y==="group"?v:"",time:T,notes:$,days:u,sessionsCount:0,hoursCount:0,averageRating:5,status:"active",createdAt:new Date().toISOString()},f=await ne(q(D,"students"),m);return y==="group"&&g&&await me(g,f.id),await ie(f.id,m),await W(A.currentUser.uid,(S==null?void 0:S.name)||"المشرف","ADD_STUDENT",f.id,{studentName:e}),t.style.display="none",t.querySelector("#addStudentForm").reset(),{id:f.id}},successMsg:`تم تسجيل الطالب (${e}) بنجاح وتعيينه للمشرف.`})})}ge(),ae(),t.style.display="flex",window.lucide&&window.lucide.createIcons()}function dt(){var T,$,v,u,d,E;const t=document.getElementById("adminStudentSearchInput");t&&t.addEventListener("input",Fe(c=>{ee=1,H(c.target.value)},250));const n=c=>{const p=c.target.closest(".btn-view-packages")||c.target.closest(".student-pkg-badge-trigger");if(p){const b=p.dataset.id;b&&Te(b);return}const m=c.target.closest(".btn-wa-student");if(m){const b=m.dataset.id,w=M.find(B=>B.id===b);w&&Qe({student:w,templateType:w.remainingLessons!==void 0&&parseInt(w.remainingLessons)<=0?"overdraft":"statement"});return}const f=c.target.closest(".btn-report-student");if(f){const b=f.dataset.id,w=M.find(B=>B.id===b);w&&Ue(b,w);return}const h=c.target.closest(".btn-edit-student");if(h){const b=h.dataset.id;ot(b);return}const k=c.target.closest(".btn-delete-student");if(k){const b=k.dataset.id;it(b);return}},r=document.getElementById("studentsTableBody");r&&!r.dataset.listenerAttached&&(r.addEventListener("click",n),r.dataset.listenerAttached="true");const o=document.getElementById("studentsGridContainer");o&&!o.dataset.listenerAttached&&(o.addEventListener("click",n),o.dataset.listenerAttached="true");const a=document.getElementById("btnListView"),i=document.getElementById("btnGridView");a&&i&&(a.addEventListener("click",()=>{ue="table",localStorage.setItem("admin_students_view_mode","table");const c=t?t.value:"";H(c)}),i.addEventListener("click",()=>{ue="grid",localStorage.setItem("admin_students_view_mode","grid");const c=t?t.value:"";H(c)}));const s=document.getElementById("openAddStudentModal");s&&s.addEventListener("click",()=>{rt()});const e=document.getElementById("btnCloseEditModalBtn");e&&e.addEventListener("click",se);const l=document.getElementById("btnCancelEditStudent");l&&l.addEventListener("click",se);const y=document.getElementById("editStudentForm");y&&y.addEventListener("submit",async c=>{var fe,be,he;if(c.preventDefault(),!N)return;const p=document.getElementById("editStudentName").value.trim(),m=parseInt(document.getElementById("editStudentAge").value)||0,f=((fe=document.getElementById("editStudentPhone"))==null?void 0:fe.value.trim())||"",h=document.getElementById("editStudentStatus").value,k=document.getElementById("editStudentTeacher").value,b=document.getElementById("editStudentTime").value.trim(),w=parseInt(document.getElementById("editStudentSessionsCount").value)||0,B=parseFloat(document.getElementById("editStudentHoursCount").value)||0,re=parseFloat(document.getElementById("editStudentAverageRating").value)||5,K=document.getElementById("editStudentNotes").value.trim(),z=[];document.querySelectorAll('#editStudentDaysContainer input[type="checkbox"]').forEach(I=>{I.checked&&z.push(I.value)});const J=document.getElementById("editStudentDifferentTimesToggle"),Z=J?J.checked:!1,O={};Z&&document.querySelectorAll("#editStudentPerDayTimesList select.admin-day-time-select").forEach(I=>{I.dataset.day&&I.value&&(O[I.dataset.day]=I.value)});const U=b||Object.values(O)[0]||"غير محدد",R=((be=document.getElementById("editSubscriptionType"))==null?void 0:be.value)||"individual",G=((he=document.getElementById("editStudentGroupSelect"))==null?void 0:he.value)||"",ye=M.find(I=>I.id===N),_=ye?ye.groupId:null;let ve="";if(R==="group"&&G){const I=Q.find(X=>X.id===G);if(I&&(ve=I.name,_!==G&&(I.studentIds||[]).length>=parseInt(I.maxStudents||10))){L.error(`المجموعة (${I.name}) وصلت للحد الأقصى للطلاب!`);return}}try{const I=P.find(Ae=>Ae.uid===k),X=I?I.name:"";await pe(oe(D,"students",N),{name:p,age:m,phone:f,whatsapp:f,parentPhone:f,status:h,teacherId:k,...X?{teacherName:X}:{},subscriptionType:R,groupId:R==="group"?G:null,groupName:R==="group"?ve:"",time:U,sessionTime:U,sessionsCount:w,hoursCount:B,averageRating:re,notes:K,days:z,sessionDays:z,schedule:{days:z,uniformTime:U,differentTimes:Z,times:O}}),R==="group"&&G?(_&&_!==G&&await Ie(_,N),await me(G,N)):R==="individual"&&_&&await Ie(_,N),await ie(N),await W(A.currentUser.uid,S.name||"المشرف","EDIT_STUDENT",N,{studentName:p}),L.success("تم تحديث كافة حقول الدارس بنجاح."),se()}catch(I){console.error(I),L.error("فشل تحديث بيانات الدارس.")}}),(T=document.getElementById("btnCloseStudentPackagesModal"))==null||T.addEventListener("click",ke),($=document.getElementById("btnClosePackagesModalBtn"))==null||$.addEventListener("click",ke),(v=document.getElementById("btnQuickRenewFromModal"))==null||v.addEventListener("click",()=>{te&&Ne(te)}),(u=document.getElementById("btnToggleArchiveSection"))==null||u.addEventListener("click",st),(d=document.getElementById("btnCloseQuickRenewModal"))==null||d.addEventListener("click",le),(E=document.getElementById("btnCancelQuickRenew"))==null||E.addEventListener("click",le);const g=document.getElementById("renewPackageTemplateSelect");g&&g.addEventListener("change",c=>{const p=c.target.options[c.target.selectedIndex];if(p&&p.dataset.sessions){const m=document.getElementById("renewPackageTotalLessons");m&&(m.value=p.dataset.sessions)}if(p&&p.dataset.price){const m=document.getElementById("renewPackagePrice");m&&(m.value=p.dataset.price)}if(p&&p.dataset.duration){const m=document.getElementById("renewPackageDuration");m&&(m.value=p.dataset.duration)}});const x=document.getElementById("quickRenewStudentForm");x&&x.addEventListener("submit",async c=>{var m,f;c.preventDefault();const p=document.getElementById("btnSubmitQuickRenew");p&&(p.disabled=!0);try{const h=document.getElementById("renewModalStudentId").value,k=M.find(U=>U.id===h),b=k?k.name:"طالب",w=document.getElementById("renewPackageTemplateSelect"),B=w?w.options[w.selectedIndex]:null,re=B&&B.value?B.dataset.name||B.text:"باقة حصص مجددة",K=parseInt(document.getElementById("renewPackageTotalLessons").value,10)||8,z=parseFloat(document.getElementById("renewPackagePrice").value)||0,J=parseInt(document.getElementById("renewPackageDuration").value,10)||60,Z=document.getElementById("renewPackageStartDate").value||new Date().toISOString().split("T")[0],O=document.getElementById("renewPackageNotes").value.trim();await Ce({studentId:h,studentName:b,packageId:(w==null?void 0:w.value)||"pkg_renew",packageName:re,totalLessons:K,lessonDuration:J,price:z,totalAmount:z,totalPaid:0,startDate:Z,notes:O,reason:"تجديد باقة وأرشفة الباقة السابقة",actor:{uid:((m=A.currentUser)==null?void 0:m.uid)||"admin",name:(S==null?void 0:S.name)||((f=A.currentUser)==null?void 0:f.displayName)||"مدير الأكاديمية"}}),L.success(`تم تجديد باقة (${b}) وتفعيل ${K} حصص وأرشفة الباقة السابقة بنجاح! 🔄`),le(),te===h&&await Te(h)}catch(h){console.error(h),L.error(h.message||"حدث خطأ أثناء تجديد باقة الدارس.")}finally{p&&(p.disabled=!1)}})}let te=null,Me=0;function st(){const t=document.getElementById("studentArchiveCollapsibleContainer"),n=document.getElementById("btnToggleArchiveSection"),r=document.getElementById("archiveToggleText"),o=document.getElementById("archiveToggleIcon");if(!t)return;t.style.display==="none"||!t.style.display?(t.style.display="block",r&&(r.textContent="إخفاء أرشيف الاشتراكات 🔼"),n&&(n.classList.remove("btn-secondary"),n.classList.add("btn-primary")),o&&o.setAttribute("data-lucide","eye-off")):(t.style.display="none",r&&(r.textContent=`عرض أرشيف الاشتراكات (${Me}) 📦`),n&&(n.classList.remove("btn-primary"),n.classList.add("btn-secondary")),o&&o.setAttribute("data-lucide","eye")),window.lucide&&window.lucide.createIcons()}async function Te(t){var T;te=t;const n=M.find($=>$.id===t),r=n?n.name:"طالب",o=document.getElementById("packagesModalStudentSubtitle");o&&(o.innerHTML=`الدارس: <strong style="color: var(--text-primary);">${r}</strong> (معرف: ${t})`);const a=document.getElementById("activePackageContainer"),i=document.getElementById("studentArchiveTableBody"),s=document.getElementById("archiveCountBadge"),e=document.getElementById("studentArchiveCollapsibleContainer"),l=document.getElementById("btnToggleArchiveSection"),y=document.getElementById("archiveToggleText"),g=document.getElementById("archiveToggleIcon");e&&(e.style.display="none"),l&&(l.classList.remove("btn-primary"),l.classList.add("btn-secondary")),g&&g.setAttribute("data-lucide","eye"),y&&(y.textContent="عرض أرشيف الاشتراكات (0) 📦"),a&&(a.innerHTML='<div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">جاري تحميل تفاصيل الباقة الحالية...</div>'),i&&(i.innerHTML='<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">جاري تحميل أرشيف الاشتراكات...</td></tr>');const x=document.getElementById("studentPackagesModal");x&&(x.style.display="flex");try{const $=await Ve(t),{activePackage:v,archivedPackages:u}=$;if(Me=u.length,a)if(!v)a.innerHTML=`
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
        `,(T=a.querySelector(".btn-open-renew-from-empty"))==null||T.addEventListener("click",()=>{Ne(t)});else{const d=parseInt(v.totalLessons)||0,E=parseInt(v.usedLessons)||0,c=parseInt(v.remainingLessons)||0,p=d>0?Math.min(100,Math.round(E/d*100)):0,m=c<0;let f='<span class="badge" style="background: rgba(16,185,129,0.12); color: var(--success); font-weight: 800;">نشط 🟢</span>';m?f=`<span class="badge" style="background: rgba(239,68,68,0.15); color: var(--danger); font-weight: 800;">دين حصص (${c}) ⚠️</span>`:c===0?f='<span class="badge" style="background: rgba(245,158,11,0.15); color: #d97706; font-weight: 800;">يستحق الدفع (0 متبقي) 💳</span>':c===1&&(f='<span class="badge" style="background: rgba(234,179,8,0.15); color: #b45309; font-weight: 800;">قارب على الانتهاء (حصة واحدة) ⏳</span>');const h=v.renewalCount&&v.renewalCount>1?`<span class="badge" style="background: rgba(99, 102, 241, 0.12); color: var(--primary-color); font-weight: 700; display: inline-flex; align-items: center; gap: 0.2rem;">
              <i data-lucide="refresh-cw" style="width: 10px; height: 10px;"></i> دورة تجديد #${v.renewalCount}
            </span>`:'<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success); font-weight: 700;">الباقة الحالية</span>',k=parseFloat(v.price)||0,b=parseFloat(v.totalAmount)||k,w=parseFloat(v.totalPaid)||0,B=Math.max(0,b-w);a.innerHTML=`
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
                <div style="font-size: 1.25rem; font-weight: 800; color: #d97706; margin-top: 0.2rem;">${E}</div>
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
                <span style="color: var(--text-primary); font-weight: 800;">${p}% (${E}/${d} حصة)</span>
              </div>
              <div style="width: 100%; height: 8px; background: rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden;">
                <div style="width: ${p}%; height: 100%; background: ${m?"var(--danger)":c===0?"#ea580c":c===1?"#d97706":"var(--success)"}; transition: width 0.3s ease;"></div>
              </div>
            </div>
          </div>
        `}s&&(s.textContent=`${u.length} باقة سابقة`),y&&(y.textContent=`عرض أرشيف الاشتراكات (${u.length}) 📦`),i&&(u.length===0?i.innerHTML='<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">لا توجد باقات سابقة في الأرشيف (هذه هي الباقة الأولى للدارس).</td></tr>':i.innerHTML=u.map((d,E)=>{var w;const c=parseInt(d.usedLessons)||0,p=parseInt(d.totalLessons)||0,m=parseInt(d.remainingLessons)||0,f=parseFloat(d.price)||0,h=parseFloat(d.totalAmount)||f,k=parseFloat(d.totalPaid)||h,b=Math.max(0,h-k);return`
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
              <td><span class="badge" style="background: rgba(99, 102, 241, 0.1); color: var(--primary-color); font-weight: 700;">دورة #${d.renewalCount||u.length-E}</span></td>
              <td>
                <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-primary);">${d.lastReceiptId||d.receiptNumber||"محفوظ محاسبياً"}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.1rem;">${d.lastPaymentDate||(w=d.archivedAt)!=null&&w.toDate?d.archivedAt.toDate().toLocaleDateString("ar-EG"):d.paymentMethod||"مسجل"}</div>
              </td>
            </tr>
          `}).join("")),window.lucide&&window.lucide.createIcons()}catch($){console.error("Failed to load student packages archive:",$),a&&(a.innerHTML='<div style="color: var(--danger); padding: 1rem; text-align: center;">حدث خطأ أثناء تحميل باقات الطالب.</div>')}}function ke(){const t=document.getElementById("studentPackagesModal");t&&(t.style.display="none")}function Ne(t){const n=M.find(l=>l.id===t),r=n?n.name:"طالب";document.getElementById("renewModalStudentId").value=t;const o=document.getElementById("renewStudentNameDisplay");o&&(o.textContent=`الدارس: ${r}`);const a=document.getElementById("renewPackageTemplateSelect");a&&(F.length>0?a.innerHTML='<option value="">-- اختر باقة للتجديد --</option>'+F.map(l=>{const y=Le(l),g=l.duration||l.sessionDuration||l.lessonDuration||60;return`<option value="${l.id}" data-name="${l.name}" data-price="${l.price}" data-sessions="${y}" data-duration="${g}">${l.name} (${l.price} ج.م - ${y} حصص)</option>`}).join(""):a.innerHTML=`
        <option value="">-- اختر باقة للتجديد --</option>
        <option value="pkg_4" data-name="باقة 4 حصص" data-price="300" data-sessions="4" data-duration="60">باقة 4 حصص (300 ج.م)</option>
        <option value="pkg_8" data-name="باقة 8 حصص" data-price="500" data-sessions="8" data-duration="60">باقة 8 حصص (500 ج.م)</option>
        <option value="pkg_12" data-name="باقة 12 حصة" data-price="700" data-sessions="12" data-duration="60">باقة 12 حصة (700 ج.م)</option>
      `);const i=new Date().toISOString().split("T")[0],s=document.getElementById("renewPackageStartDate");s&&(s.value=i);const e=document.getElementById("quickRenewStudentModal");e&&(e.style.display="flex")}function le(){const t=document.getElementById("quickRenewStudentModal");t&&(t.style.display="none")}
