import{a as M,d as y,s as B,T as u}from"./rbacService-Daqk2lPi.js";import{p as R}from"./authService-HszOwoL9.js";import{r as k,a as A,e as N}from"./navbar-Wj1PJKN1.js";import{query as q,collection as v,where as I,onSnapshot as G,deleteDoc as z,doc as C,addDoc as E,serverTimestamp as $}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import{d as H,u as j}from"./newGroupsService-jywzhoTO.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./activityLogger-CddtPFfY.js";R("teacher");let h=null,g=[],b=[],f=[],p=null;M.onAuthStateChanged(async e=>{e&&(h=e,k("groups","teacher"),A("المجموعات والجماعي",{name:e.displayName||"المعلم",roleName:"معلم بالأكاديمية"}),D(e.uid))});let w=[];async function D(e){w.forEach(r=>{try{typeof r=="function"&&r()}catch{}}),w=[];const n=q(v(y,"students"),I("teacherId","==",e));w.push(G(n,r=>{b=[],r.forEach(o=>{const t=o.data();t.status!=="archived"&&t.status!=="Suspended"&&b.push({id:o.id,...t})}),_(),p&&x(p)},r=>console.warn("Groups page students listener error:",r)));const a=q(v(y,"groups"),I("teacherId","==",e));w.push(G(a,r=>{g=[],r.forEach(o=>g.push({id:o.id,...o.data()})),_(),p&&g.find(t=>t.id===p)&&x(p)},r=>console.warn("Groups page groups listener error:",r)));const d=q(v(y,"group_requests"),I("teacherId","==",e),I("status","==","pending"));w.push(G(d,r=>{f=[],r.forEach(o=>f.push({id:o.id,...o.data()})),P(),p&&x(p)},r=>console.warn("Groups page group_requests listener error:",r))),Y()}function P(){const e=document.getElementById("teacherPendingGroupRequestsContainer");if(e){if(f.length===0){e.style.display="none",e.innerHTML="";return}e.style.display="block",e.innerHTML=`
        <div class="card" style="border: 1px solid rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.04); padding: 1rem; border-radius: var(--border-radius);">
          <h3 style="font-size: 0.95rem; font-weight: 800; color: var(--warning); margin: 0 0 0.75rem 0; display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="clock" style="width: 18px; height: 18px;"></i> طلبات المجموعات قيد المراجعة والاعتماد لدى الإدارة (${f.length})
          </h3>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${f.map(n=>`
                <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); padding: 0.6rem 0.85rem; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
                  <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    ${n.type==="remove_student_from_group"?'<span class="badge" style="background: rgba(239, 68, 68, 0.12); color: var(--danger); font-weight: 800; position: static;">➖ طلب إزالة طالب</span>':'<span class="badge" style="background: rgba(16, 185, 129, 0.12); color: var(--success); font-weight: 800; position: static;">➕ طلب إضافة طالب</span>'}
                    <span>الطالب: <strong style="color: var(--text-primary);">${n.studentName||"طالب"}</strong></span>
                    <span style="color: var(--text-secondary);">|</span>
                    <span>المجموعة: <strong style="color: var(--primary-color);">${n.groupName||"مجموعة"}</strong></span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: var(--warning); font-weight: 700; position: static;">بانتظار موافقة الإدارة ⏳</span>
                    <button class="btn btn-secondary btn-cancel-request" data-id="${n.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: var(--danger);" title="إلغاء وسحب الطلب">
                      إلغاء الطلب
                    </button>
                  </div>
                </div>
              `).join("")}
          </div>
        </div>
      `,window.lucide&&window.lucide.createIcons(),e.querySelectorAll(".btn-cancel-request").forEach(n=>{n.addEventListener("click",async a=>{const d=a.currentTarget.dataset.id;B("هل أنت متأكد من سحب وإلغاء هذا الطلب؟",async()=>{try{await z(C(y,"group_requests",d)),u.info("تم سحب الطلب بنجاح.")}catch(r){console.error(r),u.danger("حدث خطأ أثناء إلغاء الطلب.")}})})})}}function _(){const e=document.getElementById("teacherGroupsGrid");if(e){if(g.length===0){e.innerHTML=`
          <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1rem; background: var(--bg-secondary); border-radius: var(--border-radius); border: 1px dashed var(--border-color);">
            <i data-lucide="users" style="width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 1rem;"></i>
            <h3 style="font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem;">لا توجد لديك مجموعات جماعية حالياً</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0;">يتم إنشاء وتخصيص المجموعات وإدارتها من قبل إدارة الأكاديمية.</p>
          </div>
        `,window.lucide&&window.lucide.createIcons();return}e.innerHTML=g.map(n=>{const a=n.studentIds||[],d=a.length,r=parseInt(n.maxStudents)||10,o=`🕒 ${n.day||"السبت"} • ${n.time||"05:30 مساءً"}`;let t="";return d===0?t='<p style="font-size: 0.8rem; color: var(--danger); font-weight: 700; margin: 0.5rem 0;">⚠️ لا يوجد طلاب داخل هذه المجموعة.</p>':t='<div style="display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.75rem 0; max-height: 120px; overflow-y: auto;">'+a.map(i=>{const s=b.find(l=>l.id===i);return`
                <span class="student-tag">
                  <i data-lucide="user" style="width: 13px; height: 13px; color: var(--primary-color);"></i>
                  <span>${s?s.name:"طالب"}</span>
                </span>
              `}).join("")+"</div>",`
          <div class="group-card">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem;">
                <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin: 0;">${n.name}</h3>
                <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--success); font-weight: 700;">نشطة 🟢</span>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-primary); padding: 0.5rem 0.75rem; border-radius: 8px; margin-top: 0.5rem;">
                <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">${o}</span>
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary-color);">👥 ${d} / ${r} طلاب</span>
              </div>

              ${n.notes?`<p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.5rem 0 0 0; background: var(--bg-primary); padding: 0.35rem 0.6rem; border-radius: 6px;">📝 ${n.notes}</p>`:""}

              <div style="margin-top: 0.75rem;">
                <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.35rem;">الطلاب المسجلون:</div>
                ${t}
              </div>
            </div>

            <!-- Action Buttons: ONLY Edit or Delete -->
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; border-top: 1px dashed var(--border-color); padding-top: 0.75rem;">
              <button class="btn btn-primary edit-group-btn" data-id="${n.id}" style="flex: 1; padding: 0.45rem 0.75rem; font-size: 0.82rem; font-weight: 700; gap: 0.4rem;">
                <i data-lucide="edit-3" style="width: 15px; height: 15px;"></i> تعديل
              </button>
              <button class="btn btn-secondary delete-group-btn" data-id="${n.id}" style="padding: 0.45rem 0.75rem; font-size: 0.82rem; font-weight: 700; color: var(--danger); border-color: var(--border-color);" title="حذف المجموعة">
                <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i> حذف
              </button>
            </div>
          </div>
        `}).join(""),window.lucide&&window.lucide.createIcons(),O()}}function O(){document.querySelectorAll(".edit-group-btn").forEach(e=>{e.addEventListener("click",()=>{const n=e.dataset.id;F(n)})}),document.querySelectorAll(".delete-group-btn").forEach(e=>{e.addEventListener("click",()=>{const n=e.dataset.id,a=g.find(r=>r.id===n),d=a?a.name:"المجموعة";B(`هل أنت متأكد من حذف المجموعة (${d})؟ سيتم فك ارتباط الطلاب مع الحفاظ على ملفاتهم الشخصية.`,async()=>{try{await H(n),u.danger("تم حذف المجموعة بنجاح.")}catch(r){console.error(r),u.danger("حدث خطأ أثناء حذف المجموعة.")}})})})}function F(e){const n=g.find(a=>a.id===e);n&&(p=e,document.getElementById("editingGroupId").value=n.id,document.getElementById("editGroupModalTitle").innerHTML=`<i data-lucide="edit-3" style="color: var(--primary-color);"></i> تعديل المجموعة: ${n.name}`,document.getElementById("editGroupModalSubtitle").textContent="تعديل موعد الحصة وإرسال طلبات إضافة وإزالة الطلاب",document.getElementById("inputEditGroupDay").value=n.day||"السبت",document.getElementById("inputEditGroupTime").value=n.time||"05:30 مساءً",document.getElementById("inputEditGroupNotes").value=n.notes||"",x(e),document.getElementById("editGroupModal").style.display="flex",window.lucide&&window.lucide.createIcons())}function x(e){const n=g.find(t=>t.id===e);if(!n)return;const a=n.studentIds||[],d=document.getElementById("modalCurrentStudentsList"),r=document.getElementById("modalSelectStudentToAdd");a.length===0?d.innerHTML='<p style="font-size: 0.82rem; color: var(--text-muted); text-align: center; margin: 0.5rem 0;">لا يوجد طلاب داخل هذه المجموعة حالياً.</p>':d.innerHTML=a.map(t=>{const i=b.find(l=>l.id===t),s=i?i.name:"طالب";return f.find(l=>l.groupId===e&&l.studentId===t&&l.type==="remove_student_from_group")?`
              <div class="student-manage-item">
                <span style="font-weight: 700; color: var(--text-primary);">👤 ${s}</span>
                <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: var(--warning); font-size: 0.75rem; font-weight: 800; position: static;">طلب إزالة قيد المراجعة ⏳</span>
              </div>
            `:`
            <div class="student-manage-item">
              <span style="font-weight: 700; color: var(--text-primary);">👤 ${s}</span>
              <button type="button" class="btn btn-secondary btn-request-remove-student" data-groupid="${e}" data-studentid="${t}" data-studentname="${s}" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; font-weight: 700; color: var(--danger); border-color: rgba(239, 68, 68, 0.3);">
                <i data-lucide="user-x" style="width: 13px; height: 13px;"></i> طلب إزالة من المجموعة
              </button>
            </div>
          `}).join(""),r.innerHTML='<option value="">-- اختر الطالب المراد إضافته للمجموعة --</option>';const o=b.filter(t=>!a.includes(t.id));o.sort((t,i)=>(t.name||"").localeCompare(i.name||"")),o.forEach(t=>{const i=f.find(c=>c.groupId===e&&c.studentId===t.id&&c.type==="add_student_to_group"),s=document.createElement("option");s.value=t.id;const m=t.teacherName?`(المعلم: ${t.teacherName})`:"",l=i?" [طلب إضافة قيد المراجعة ⏳]":"";s.textContent=`${t.name||"طالب"} ${m}${l}`,i&&(s.disabled=!0),r.appendChild(s)}),window.lucide&&window.lucide.createIcons(),d.querySelectorAll(".btn-request-remove-student").forEach(t=>{t.addEventListener("click",()=>{const i=t.dataset.studentid,s=t.dataset.studentname,m=t.dataset.groupid;U(m,i,s)})})}async function U(e,n,a){const d=g.find(r=>r.id===e);d&&B(`هل أنت متأكد من إرسال طلب للإدارة لإزالة الطالب (${a}) من المجموعة (${d.name})؟`,async()=>{try{await E(v(y,"group_requests"),{type:"remove_student_from_group",groupId:e,groupName:d.name||"مجموعة",studentId:n,studentName:a||"طالب",teacherId:h.uid,teacherName:h.displayName||"المعلم",status:"pending",createdAt:$()});const r=`يرغب المعلم (${h.displayName||"المعلم"}) في إزالة الطالب (${a}) من المجموعة (${d.name}).`,o="طلب إزالة طالب من مجموعة 👥",t=await E(v(y,"notifications"),{title:o,body:r,message:r,type:"group_request",targetRole:"admin",recipientId:"admin",groupId:e,studentId:n,createdAt:$(),read:!1});N({title:o,body:r,recipientId:"admin",type:"group_request",url:"/admin/groups.html",data:{notifId:t.id,groupId:e,studentId:n}}).catch(i=>console.warn(i)),u.info(`تم إرسال طلب إزالة الطالب (${a}) للإدارة بانتظار الاعتماد ⏳`)}catch(r){console.error("Error submitting removal request:",r),u.danger("حدث خطأ أثناء إرسال طلب إزالة الطالب.")}})}function Y(){var e,n,a,d;(e=document.getElementById("btnCloseEditGroupModal"))==null||e.addEventListener("click",()=>{document.getElementById("editGroupModal").style.display="none",p=null}),(n=document.getElementById("btnCancelEditGroupModal"))==null||n.addEventListener("click",()=>{document.getElementById("editGroupModal").style.display="none",p=null}),(a=document.getElementById("editScheduleForm"))==null||a.addEventListener("submit",async r=>{r.preventDefault();const o=document.getElementById("editingGroupId").value,t=document.getElementById("inputEditGroupDay").value,i=document.getElementById("inputEditGroupTime").value,s=document.getElementById("inputEditGroupNotes").value.trim(),m=document.getElementById("btnSaveSchedule");m&&(m.disabled=!0);try{await j(o,{day:t,time:i,notes:s}),u.success("تم حفظ وتحديث موعد الحصة والملاحظات بنجاح ✅")}catch(l){console.error(l),u.danger("حدث خطأ أثناء حفظ موعد المجموعة.")}finally{m&&(m.disabled=!1)}}),(d=document.getElementById("modalAddStudentRequestForm"))==null||d.addEventListener("submit",async r=>{r.preventDefault();const o=document.getElementById("editingGroupId").value,t=document.getElementById("modalSelectStudentToAdd").value;if(!t||!o)return;const i=b.find(c=>c.id===t),s=g.find(c=>c.id===o);if(!i||!s){u.danger("عذراً، تعذر العثور على بيانات الطالب أو المجموعة.");return}if(f.find(c=>c.groupId===o&&c.studentId===t&&c.type==="add_student_to_group")){u.warning("يوجد طلب معلق بالفعل لإضافة هذا الطالب لنفس المجموعة بانتظار موافقة الإدارة.");return}const l=document.getElementById("btnSubmitAddStudentReq");l&&(l.disabled=!0);try{await E(v(y,"group_requests"),{type:"add_student_to_group",groupId:o,groupName:s.name||"مجموعة",studentId:t,studentName:i.name||"طالب",teacherId:h.uid,teacherName:h.displayName||"المعلم",status:"pending",createdAt:$()});const c=`يرغب المعلم (${h.displayName||"المعلم"}) في إضافة الطالب (${i.name}) إلى مجموعة (${s.name}).`,S="طلب إضافة طالب لمجموعة 👥",T=await E(v(y,"notifications"),{title:S,body:c,message:c,type:"group_request",targetRole:"admin",recipientId:"admin",groupId:o,studentId:t,createdAt:$(),read:!1});N({title:S,body:c,recipientId:"admin",type:"group_request",url:"/admin/groups.html",data:{notifId:T.id,groupId:o,studentId:t}}).catch(L=>console.warn(L)),u.info(`تم إرسال طلب إضافة الطالب (${i.name}) للإدارة بانتظار الاعتماد ⏳`),document.getElementById("modalSelectStudentToAdd").value=""}catch(c){console.error("Error submitting group request:",c),u.danger("حدث خطأ أثناء إرسال طلب إضافة الطالب.")}finally{l&&(l.disabled=!1)}})}
