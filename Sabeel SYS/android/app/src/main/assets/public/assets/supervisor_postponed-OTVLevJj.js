import{q as p,T as v}from"./rbacService-D2RrsA9d.js";import{i as k,b as i,e as s,g as E}from"./supervisorPageShell-CklIJ_wK.js";import{computeTeacherAvailableSlots as B,recordLessonWithWorkflow as T,LESSON_STATUSES as D}from"./supervisorDomainService-BW5mzJbW.js";import{d as c}from"./navbar-Bz3pjZSE.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./authService-CtWWGArP.js";import"./activityLogger-BK9d5021.js";let d=null,g="pending",u=[],b=[],S=[],h=[],t=null;k({pageId:"postponed",pageTitle:"المؤجلة والتعويض",requiredPermission:p.VIEW_POSTPONED_LESSONS,onReady:a=>{var o,r,l,e;d=a,c.subscribe("sessions",n=>{u=n||[],y()}),c.subscribe("studentOperationalSummaries",n=>{b=n||[]}),c.subscribe("teacherOperationalProfiles",n=>{S=n||[]}),c.subscribe("groups",n=>{h=n||[]}),document.querySelectorAll(".comp-filter-tab").forEach(n=>{n.addEventListener("click",()=>{g=n.dataset.filter,document.querySelectorAll(".comp-filter-tab").forEach(m=>{m.className=m===n?"btn btn-primary btn-sm comp-filter-tab":"btn btn-secondary btn-sm comp-filter-tab"}),y()})}),(o=document.getElementById("closeMakeupModalBtn"))==null||o.addEventListener("click",f),(r=document.getElementById("cancelMakeupModalBtn"))==null||r.addEventListener("click",f),(l=document.getElementById("makeupDateInput"))==null||l.addEventListener("change",I),(e=document.getElementById("makeupAssignForm"))==null||e.addEventListener("submit",N)},onPermissionsUpdated:({hasPerm:a})=>{d&&(d.hasPerm=a),y()}});function L(a){if(a.compensationStatus==="completed")return"completed";const o=u.find(r=>r.status==="compensatory"&&(r.originalLessonId===a.id||r.id===a.compensatedBySessionId));return o&&o.status==="completed"?"completed":a.makeupDate||a.compensationStatus==="scheduled"||o?"scheduled":"pending"}function y(){const a=document.getElementById("postponedTableBody");if(!a)return;const o=u.filter(e=>e.status==="delayed").map(e=>({...e,resolvedCompStatus:L(e)})).filter(e=>g==="all"||e.resolvedCompStatus===g).sort((e,n)=>(n.date||"").localeCompare(e.date||""));if(o.length===0){a.innerHTML='<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">لا توجد حصص مؤجلة مطابقة لهذا التصنيف.</td></tr>';return}const r=(d==null?void 0:d.hasPerm(p.MANAGE_LESSONS))||(d==null?void 0:d.hasPerm(p.EDIT_SCHEDULES)),l={student:"الطالب / ولي الأمر",teacher:"المعلم",academy:"الأكاديمية"};a.innerHTML=o.map(e=>{let n=i("بانتظار التعويض","warning");return e.resolvedCompStatus==="scheduled"?n=i("مجدولة للتعويض","info"):e.resolvedCompStatus==="completed"&&(n=i("تم التعويض","success")),`
          <tr>
            <td>
              <strong class="tabular-nums">${s(e.postponedFrom||e.date||"-")}</strong>
              <div style="font-size: 0.74rem; color: var(--text-muted);" class="tabular-nums">${s(e.time||"")}</div>
            </td>
            <td>
              <strong>${s(e.studentName||"طالب")}</strong>
              <div style="font-size: 0.76rem; color: var(--text-secondary);">${s(e.teacherName||"غير معين")}</div>
            </td>
            <td>
              <div style="font-size: 0.82rem; font-weight: 600;">${s(e.postponeReason||"لم يحدد سبب")}</div>
              <div style="font-size: 0.74rem; color: var(--text-muted);">المتسبب: ${s(l[e.responsibleParty]||"غير محدد")}</div>
            </td>
            <td>
              ${e.makeupDate?`<strong class="tabular-nums">${s(e.makeupDate)}</strong><div style="font-size: 0.74rem; color: var(--primary-color);" class="tabular-nums">${s(e.makeupTime||"")}</div>`:i("غير محدد بعد","neutral")}
            </td>
            <td style="max-width: 220px; font-size: 0.78rem; color: var(--text-secondary);">
              ${s([e.slotSelectionReason,e.teacherNotes].filter(Boolean).join(" — ")||"-")}
            </td>
            <td>${n}</td>
            <td>
              ${r&&e.resolvedCompStatus!=="completed"?`
                <button type="button" class="btn btn-secondary btn-sm btn-schedule-makeup" data-id="${s(e.id)}">
                  <i data-lucide="calendar-plus" style="width: 14px; height: 14px;"></i>
                  ${e.makeupDate?"تعديل الموعد":"تعيين موعد"}
                </button>
              `:i(e.resolvedCompStatus==="completed"?"مغلق":"عرض فقط","neutral")}
            </td>
          </tr>
        `}).join(""),a.querySelectorAll(".btn-schedule-makeup").forEach(e=>{e.addEventListener("click",()=>M(e.dataset.id))}),window.lucide&&window.lucide.createIcons({root:a})}function M(a){t=u.find(o=>o.id===a),t&&(document.getElementById("makeupDelayedSessionId").value=t.id,document.getElementById("makeupLessonSummary").innerHTML=`
        <strong>الطالب:</strong> ${s(t.studentName||"")} |
        <strong>المعلم:</strong> ${s(t.teacherName||"")} |
        <strong>التاريخ الأصلي:</strong> <span class="tabular-nums">${s(t.postponedFrom||t.date||"")}</span>
      `,document.getElementById("makeupDateInput").value=t.makeupDate||E(),document.getElementById("makeupTimeInput").value=t.makeupTime||"17:00",document.getElementById("makeupSelectionReason").value=t.slotSelectionReason||"",document.getElementById("makeupTeacherNotes").value=t.teacherNotes||"",I(),document.getElementById("makeupModal").style.display="flex")}function f(){document.getElementById("makeupModal").style.display="none",t=null}function I(){const a=document.getElementById("makeupAvailableSlotsBox");if(!a||!t)return;const o=document.getElementById("makeupDateInput").value;if(!o)return;const r=S.find(e=>(e.uid||e.id)===t.teacherId)||{uid:t.teacherId},l=B({teacherProfile:r,students:b,groups:h,sessions:u,targetDate:o,slotDurationMinutes:Number(t.duration||60)});if(l.slots.length===0){a.innerHTML='<p style="margin: 0; font-size: 0.78rem; color: var(--danger);">لا توجد فترات شاغرة في جدول المعلم لهذا اليوم.</p>';return}a.innerHTML=`
        <div style="font-size: 0.76rem; font-weight: 700; margin-bottom: 0.45rem; color: var(--text-secondary);">المواعيد الشاغرة للمعلم يوم ${s(l.targetDayName)}:</div>
        <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; max-height: 120px; overflow-y: auto;">
          ${l.slots.map(e=>`
            <button type="button" class="btn btn-outline btn-sm makeup-slot-pick" data-time="${s(e.time24)}">${s(e.startLabel)}</button>
          `).join("")}
        </div>
      `,a.querySelectorAll(".makeup-slot-pick").forEach(e=>{e.addEventListener("click",()=>{document.getElementById("makeupTimeInput").value=e.dataset.time})})}async function N(a){if(a.preventDefault(),!t)return;const o=document.getElementById("makeupDateInput").value,r=document.getElementById("makeupTimeInput").value,l=document.getElementById("makeupSelectionReason").value.trim(),e=document.getElementById("makeupTeacherNotes").value.trim(),n=document.getElementById("saveMakeupBtn");n.disabled=!0;try{await T({existingSessionId:t.id,studentId:t.studentId,studentName:t.studentName,teacherId:t.teacherId,teacherName:t.teacherName,date:t.postponedFrom||t.date,time:t.time,duration:t.duration,type:t.type||"individual",status:D.DELAYED,postponeReason:t.postponeReason||"",responsibleParty:t.responsibleParty||"student",makeupDate:o,makeupTime:r,teacherNotes:e,slotSelectionReason:l,createMakeupSession:!t.compensatedBySessionId},{uid:d.uid,name:d.name,role:"supervisor",canEditDuration:d.hasPerm(p.EDIT_LESSON_DURATION)}),v.success("تم تعيين موعد الحصة التعويضية وربطه بنجاح."),f()}catch(m){console.error(m),v.danger("تعذر حفظ موعد الحصة التعويضية.")}finally{n.disabled=!1}}
