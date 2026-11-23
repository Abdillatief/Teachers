import{d as u,a as h,T as m}from"./rbacService-D2RrsA9d.js";import{p as b}from"./authService-CtWWGArP.js";import{r as x,a as B}from"./navbar-Bz3pjZSE.js";import{query as E,collection as L,orderBy as I,onSnapshot as z,updateDoc as T,doc as k,serverTimestamp as C}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./activityLogger-BK9d5021.js";b("admin");x("warnings","admin");B("مركز التحذيرات",{name:"إدارة النظام"});let d=[],c="unreviewed";const o=document.getElementById("warningsTableBody"),$=document.getElementById("statUnreviewedCount"),A=document.getElementById("statReviewedCount"),R=document.getElementById("statTotalCount"),N=document.getElementById("tabUnreviewedBadge"),v=document.getElementById("warningsSearchInput"),y=document.getElementById("warningTypeFilter"),p=document.getElementById("tabActiveBtn"),g=document.getElementById("tabArchivedBtn"),U=E(L(u,"warnings"),I("createdAt","desc"));z(U,t=>{d=[],t.forEach(n=>{d.push({id:n.id,...n.data()})}),f(),s()},t=>{console.error("Error fetching warnings:",t),o.innerHTML=`
        <tr>
          <td colspan="8" style="padding: 2rem; text-align: center; color: var(--danger); font-size: 0.88rem;">
            تعذر تحميل التحذيرات من قاعدة البيانات.
          </td>
        </tr>
      `});function f(){const t=d.filter(a=>a.status!=="reviewed").length,n=d.filter(a=>a.status==="reviewed").length;$.textContent=t,A.textContent=n,R.textContent=d.length,N.textContent=t}function s(){const t=(v.value||"").trim().toLowerCase(),n=y.value,a=d.filter(e=>{const i=e.status==="reviewed";if(c==="unreviewed"&&i||c==="reviewed"&&!i||n!=="all"&&e.type!==n)return!1;if(t){const r=(e.teacherName||"").toLowerCase(),l=(e.studentName||"").toLowerCase();if(!r.includes(t)&&!l.includes(t))return!1}return!0});if(a.length===0){o.innerHTML=`
          <tr>
            <td colspan="8" style="padding: 3rem 1rem; text-align: center;">
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; color: var(--text-muted);">
                <i data-lucide="check-circle-2" style="width: 32px; height: 32px; color: var(--success); opacity: 0.7;"></i>
                <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">لا توجد تحذيرات في هذا القسم</span>
                <span style="font-size: 0.8rem;">جميع العمليات المسجلة تمت مراجعتها أو لا توجد تنبيهات نشطة.</span>
              </div>
            </td>
          </tr>
        `,window.lucide&&window.lucide.createIcons();return}o.innerHTML=a.map(e=>{const i=e.status==="reviewed",r=e.type==="duplicate_session"?"تكرار تسجيل الحصة":e.type||"تحذير نظام",l=i?'<span class="badge" style="background: rgba(16, 185, 129, 0.12); color: #059669; font-size: 0.74rem; font-weight: 700; padding: 2px 8px; border-radius: 6px;">تمت المراجعة</span>':'<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #d97706; font-size: 0.74rem; font-weight: 700; padding: 2px 8px; border-radius: 6px;">بانتظار المراجعة</span>',w=i?'<span style="font-size: 0.75rem; color: var(--text-muted);">تم التدقيق</span>':`<button class="btn btn-secondary btn-mark-reviewed" data-id="${e.id}" style="font-size: 0.78rem; padding: 0.35rem 0.85rem; font-weight: 700; border-color: var(--success); color: var(--success); gap: 0.35rem; display: inline-flex; align-items: center;">
              <i data-lucide="check" style="width: 14px; height: 14px;"></i>
              تمت المراجعة
            </button>`;return`
          <tr class="warning-row" style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.85rem 1rem; font-size: 0.82rem; font-weight: 700; color: #b45309;">
              <span style="display: inline-flex; align-items: center; gap: 0.35rem;">
                <i data-lucide="copy" style="width: 14px; height: 14px; color: #d97706;"></i>
                ${r}
              </span>
            </td>
            <td style="padding: 0.85rem 1rem; font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">
              ${e.teacherName||"غير محدد"}
            </td>
            <td style="padding: 0.85rem 1rem; font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">
              ${e.studentName||"غير محدد"}
            </td>
            <td style="padding: 0.85rem 1rem; font-size: 0.82rem; color: var(--text-secondary); direction: ltr; text-align: right;">
              ${e.date||"اليوم"}
            </td>
            <td style="padding: 0.85rem 1rem; font-size: 0.82rem; color: var(--text-secondary);">
              ${e.firstRecordedAt||"غير متوفر"}
            </td>
            <td style="padding: 0.85rem 1rem; font-size: 0.82rem; font-weight: 700; color: #d97706;">
              ${e.secondRecordedAt||"غير متوفر"}
            </td>
            <td style="padding: 0.85rem 1rem;">
              ${l}
            </td>
            <td style="padding: 0.85rem 1rem; text-align: left;">
              ${w}
            </td>
          </tr>
        `}).join(""),window.lucide&&window.lucide.createIcons(),o.querySelectorAll(".btn-mark-reviewed").forEach(e=>{e.addEventListener("click",async()=>{const i=e.dataset.id;e.disabled=!0;try{const r=h.currentUser;await T(k(u,"warnings",i),{status:"reviewed",reviewedAt:C(),reviewedBy:(r==null?void 0:r.email)||"admin"}),m.success("تم تحديد التحذير كمُراجَع ونقله إلى الأرشيف.")}catch(r){console.error("Error reviewing warning:",r),m.danger("تعذر تحديث حالة التحذير."),e.disabled=!1}})})}p.addEventListener("click",()=>{c="unreviewed",p.classList.add("active"),g.classList.remove("active"),s()});g.addEventListener("click",()=>{c="reviewed",g.classList.add("active"),p.classList.remove("active"),s()});v.addEventListener("input",s);y.addEventListener("change",s);document.getElementById("btnRefreshWarnings").addEventListener("click",()=>{f(),s(),m.info("تم تحديث قائمة التحذيرات.")});
