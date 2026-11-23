import{d as y,s as I,b as $,a as u,R as S,T as c,c as M,P as x,e as z,f as P,r as j}from"./rbacService-Daqk2lPi.js";import{p as q}from"./authService-HszOwoL9.js";import{r as O,a as U}from"./navbar-Wj1PJKN1.js";import{collection as _,onSnapshot as D,updateDoc as C,doc as E,serverTimestamp as A,setDoc as H}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import{syncTeacherOperationalProfile as N,logActivity as K}from"./supervisorDomainService-Cn9ebdzg.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./activityLogger-CddtPFfY.js";q("admin");O("account-requests","admin");U("طلبات الحسابات",{name:"إدارة النظام"});let d=[],g="all",i=null;const m=document.getElementById("requestsTableBody"),G=document.getElementById("statPendingCount"),V=document.getElementById("statTeachersCount"),F=document.getElementById("statSupervisorsCount"),J=document.getElementById("tabBadgeAll"),k=document.getElementById("requestsSearchInput"),v=document.getElementById("tabAllBtn"),f=document.getElementById("tabTeachersBtn"),b=document.getElementById("tabSupervisorsBtn"),Q=_(y,"users");D(Q,a=>{d=[],a.forEach(o=>{const e={id:o.id,...o.data()};(e.status==="pending"||e.status==="pending_approval"||e.approved===!1&&e.status!=="rejected")&&d.push(e)}),T(),p()},a=>{console.error("Error fetching account requests:",a),m.innerHTML=`
        <tr>
          <td colspan="6" style="padding: 2rem; text-align: center; color: var(--danger); font-size: 0.88rem;">
            تعذر تحميل طلبات الحسابات من قاعدة البيانات.
          </td>
        </tr>
      `});function h(a){return j(a)===S.SUPERVISOR}function T(){const a=d.filter(e=>!h(e)).length,o=d.filter(e=>h(e)).length;G.textContent=d.length,V.textContent=a,W(o),J.textContent=d.length}function W(a){F.textContent=a}function p(){const a=(k.value||"").trim().toLowerCase(),o=d.filter(e=>{const n=h(e)?"supervisor":"teacher";if(g!=="all"&&n!==g)return!1;if(a){const t=(e.name||"").toLowerCase(),r=(e.phone||"").toLowerCase(),l=(e.email||"").toLowerCase();if(!t.includes(a)&&!r.includes(a)&&!l.includes(a))return!1}return!0});if(o.length===0){m.innerHTML=`
          <tr>
            <td colspan="6" style="padding: 3rem 1rem; text-align: center;">
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; color: var(--text-muted);">
                <i data-lucide="user-check" style="width: 32px; height: 32px; color: var(--primary-color); opacity: 0.7;"></i>
                <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">لا توجد طلبات حسابات معلقة</span>
                <span style="font-size: 0.8rem;">تمت معالجة جميع طلبات التسجيل أو لم يتم تقديم طلبات جديدة.</span>
              </div>
            </td>
          </tr>
        `,window.lucide&&window.lucide.createIcons();return}m.innerHTML=o.map(e=>{const s=h(e),n=s?"مشرف تشغيلي":"معلم",t=s?`<span class="badge" style="background: rgba(79, 163, 209, 0.14); color: var(--primary-color); font-size: 0.74rem; font-weight: 700; padding: 2px 8px; border-radius: 6px;">${n}</span>`:`<span class="badge" style="background: rgba(16, 185, 129, 0.12); color: #10b981; font-size: 0.74rem; font-weight: 700; padding: 2px 8px; border-radius: 6px;">${n}</span>`;let r="غير محدد";if(e.createdAt)try{r=(e.createdAt.toDate?e.createdAt.toDate():new Date(e.createdAt)).toLocaleDateString("ar-EG",{year:"numeric",month:"short",day:"numeric"})}catch{r=String(e.createdAt).substring(0,10)}return`
          <tr class="request-row" style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.85rem 1rem; font-size: 0.88rem; font-weight: 700; color: var(--text-primary);">
              ${e.name||"مستخدم جديد"}
            </td>
            <td style="padding: 0.85rem 1rem;">
              ${t}
            </td>
            <td style="padding: 0.85rem 1rem; font-size: 0.82rem; color: var(--text-secondary); direction: ltr; text-align: right;">
              ${e.phone||"غير مسجل"}
            </td>
            <td style="padding: 0.85rem 1rem; font-size: 0.82rem; color: var(--text-secondary);">
              ${e.email||"غير مسجل"}
            </td>
            <td style="padding: 0.85rem 1rem; font-size: 0.8rem; color: var(--text-muted);">
              ${r}
            </td>
            <td style="padding: 0.85rem 1rem; text-align: left;">
              <div style="display: inline-flex; gap: 0.5rem; align-items: center;">
                <button class="btn btn-primary btn-approve-user" data-id="${e.id}" data-role="${s?"supervisor":"teacher"}" style="font-size: 0.78rem; padding: 0.35rem 0.85rem; font-weight: 700; gap: 0.35rem; display: inline-flex; align-items: center;">
                  <i data-lucide="check" style="width: 14px; height: 14px;"></i>
                  قبول
                </button>
                <button class="btn btn-secondary btn-reject-user" data-id="${e.id}" data-name="${e.name||""}" style="font-size: 0.78rem; padding: 0.35rem 0.85rem; font-weight: 700; color: var(--danger); border-color: rgba(239, 68, 68, 0.3); gap: 0.35rem; display: inline-flex; align-items: center;">
                  <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                  رفض
                </button>
              </div>
            </td>
          </tr>
        `}).join(""),window.lucide&&window.lucide.createIcons(),m.querySelectorAll(".btn-approve-user").forEach(e=>{e.addEventListener("click",()=>{const s=e.dataset.id,n=e.dataset.role,t=d.find(r=>r.id===s);t&&(n==="supervisor"?(i=t,document.getElementById("modalSupervisorName").textContent=t.name||t.email||"",X(x.general_ops.permissions),document.getElementById("supervisorApprovalModal").style.display="flex"):I(`هل أنت متأكد من رغبتك في قبول حساب المعلم (${t.name})؟`,async()=>{var r;e.disabled=!0;try{await $(s,{roleId:S.TEACHER,permissions:{},status:"approved",approvedBy:((r=u.currentUser)==null?void 0:r.uid)||"admin"}),await C(E(y,"users",s),{approved:!0}),await N(s),c.success(`تم قبول وتفعيل حساب المعلم (${t.name}) بنجاح.`)}catch(l){console.error("Error approving teacher:",l),c.danger("حدث خطأ أثناء قبول الحساب."),e.disabled=!1}}))})}),m.querySelectorAll(".btn-reject-user").forEach(e=>{e.addEventListener("click",()=>{const s=e.dataset.id,n=e.dataset.name||"المستخدم";I(`هل أنت متأكد من رفض طلب حساب (${n})؟ سيتم تحديث حالة الحساب كـ مرفوض.`,async()=>{var t;e.disabled=!0;try{await C(E(y,"users",s),{status:"rejected",approved:!1,rejectedAt:A(),rejectedBy:((t=u.currentUser)==null?void 0:t.email)||"admin"}),await H(E(y,M.USER_ROLES,s),{status:"rejected",updatedAt:A()},{merge:!0}),c.info(`تم رفض طلب الحساب (${n}).`)}catch(r){console.error("Error rejecting account:",r),c.danger("تعذر رفض الحساب."),e.disabled=!1}})})})}v.addEventListener("click",()=>{g="all",v.classList.add("active"),f.classList.remove("active"),b.classList.remove("active"),p()});f.addEventListener("click",()=>{g="teacher",f.classList.add("active"),v.classList.remove("active"),b.classList.remove("active"),p()});b.addEventListener("click",()=>{g="supervisor",b.classList.add("active"),v.classList.remove("active"),f.classList.remove("active"),p()});k.addEventListener("input",p);document.getElementById("btnRefreshRequests").addEventListener("click",()=>{T(),p(),c.info("تم تحديث قائمة الطلبات.")});function X(a=[]){const o=document.getElementById("modalPresetButtonsContainer"),e=document.getElementById("supervisorModalPermsGrid");if(!e||!o)return;const s=new Set(a||[]);o.innerHTML=Object.values(x).map(t=>`
        <button type="button" class="btn btn-secondary btn-modal-preset" data-preset="${t.id}" style="font-size: 0.74rem; padding: 0.3rem 0.65rem;">
          ${t.label}
        </button>
      `).join("")+`
        <button type="button" class="btn btn-secondary btn-modal-preset" data-preset="none" style="font-size: 0.74rem; padding: 0.3rem 0.65rem; color: var(--danger);">
          إلغاء الكل
        </button>
      `;const n=new Map;z.forEach(t=>{n.has(t.group)||n.set(t.group,{label:t.groupLabel,items:[]}),n.get(t.group).items.push(t)}),e.innerHTML=Array.from(n.entries()).map(([,t])=>`
        <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem;">
          <div style="font-size: 0.82rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.65rem; padding-bottom: 0.45rem; border-bottom: 1px solid var(--border-color);">
            ${t.label}
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${t.items.map(r=>`
              <label style="display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; color: var(--text-primary);">
                <input type="checkbox" class="rbac-modal-perm-cb" data-perm-key="${r.key}" ${s.has(r.key)?"checked":""} style="accent-color: var(--primary-color); width: 15px; height: 15px; margin-top: 2px;">
                <span>
                  <span style="display: block;">${r.label}</span>
                  <span style="display: block; font-size: 0.7rem; color: var(--text-muted); font-weight: 400;">${r.description}</span>
                </span>
              </label>
            `).join("")}
          </div>
        </div>
      `).join(""),o.querySelectorAll(".btn-modal-preset").forEach(t=>{t.addEventListener("click",()=>{var L;const r=t.dataset.preset,l=r==="none"?[]:((L=x[r])==null?void 0:L.permissions)||[],R=new Set(l);e.querySelectorAll(".rbac-modal-perm-cb").forEach(B=>{B.checked=R.has(B.dataset.permKey)})})})}const Y=document.getElementById("supervisorApprovalModal"),w=()=>{Y.style.display="none",i=null};document.getElementById("btnCloseSupervisorModal").addEventListener("click",w);document.getElementById("btnCancelSupervisorModal").addEventListener("click",w);document.getElementById("btnConfirmSupervisorApproval").addEventListener("click",async()=>{var s,n,t;if(!i)return;const a=document.getElementById("btnConfirmSupervisorApproval");a.disabled=!0;const o=[];document.querySelectorAll("#supervisorModalPermsGrid .rbac-modal-perm-cb:checked").forEach(r=>{r.dataset.permKey&&o.push(r.dataset.permKey)});const e=P(o);try{await $(i.id,{roleId:S.SUPERVISOR,permissions:e,department:i.department||"",supervisorTitle:i.supervisorTitle||i.department||"مشرف تشغيلي",status:"approved",approvedBy:((s=u.currentUser)==null?void 0:s.uid)||"admin"}),await K({actorId:((n=u.currentUser)==null?void 0:n.uid)||"admin",actorName:((t=u.currentUser)==null?void 0:t.email)||"المدير العام",actorRole:"admin",actionType:"supervisor_approved",targetCollection:"user_roles",targetId:i.id,summary:`اعتماد المشرف (${i.name}) ومنحه ${o.length} صلاحية`,newValue:{enabledKeys:o}}),c.success(`تم قبول وتفعيل حساب المشرف (${i.name}) بنجاح مع الصلاحيات المحددة.`),w()}catch(r){console.error("Error approving supervisor:",r),c.danger("حدث خطأ أثناء قبول حساب المشرف.")}finally{a.disabled=!1}});
