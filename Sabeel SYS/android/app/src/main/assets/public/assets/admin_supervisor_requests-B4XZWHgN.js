import{d as S,T as c,a as L}from"./rbacService-Daqk2lPi.js";import{p as P}from"./authService-HszOwoL9.js";import{r as _,a as H}from"./navbar-Wj1PJKN1.js";import{query as F,collection as G,orderBy as U,onSnapshot as K}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import{getRequestTypeLabel as j,approveAndExecuteSupervisorRequest as J,keepPendingSupervisorRequest as Q,rejectSupervisorRequest as V}from"./supervisorDomainService-Cn9ebdzg.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./activityLogger-CddtPFfY.js";P("admin");_("supervisor-requests","admin");H("مركز طلبات المشرفين",{name:"المدير العام"});let r=[],u="pending",o=null,v="approve";const d=document.getElementById("requestsListContainer"),f=document.getElementById("requestsSearchInput"),I=document.getElementById("statPendingCount"),k=document.getElementById("statApprovedCount"),N=document.getElementById("statRejectedCount"),R=document.getElementById("statTotalCount"),D=document.getElementById("tabBadgePending"),w=document.getElementById("tabPendingBtn"),B=document.getElementById("tabApprovedBtn"),E=document.getElementById("tabRejectedBtn"),C=document.getElementById("tabAllBtn"),W=F(G(S,"supervisorRequests"),U("createdAt","desc"));K(W,t=>{r=[],t.forEach(n=>{r.push({id:n.id,...n.data()})}),X(),y()},t=>{console.error("Error fetching supervisor requests:",t),d.innerHTML=`
        <div class="card" style="padding: 2.5rem; text-align: center; color: var(--danger); font-size: 0.9rem;">
          تعذر تحميل طلبات المشرفين. يرجى التأكد من الاتصال.
        </div>
      `});function X(){const t=r.filter(i=>i.status==="pending").length,n=r.filter(i=>i.status==="approved").length,e=r.filter(i=>i.status==="rejected").length;I&&(I.textContent=t),k&&(k.textContent=n),N&&(N.textContent=e),R&&(R.textContent=r.length),D&&(D.textContent=t)}function Y(t){if(!t)return"--";try{const n=t!=null&&t.toDate?t.toDate():new Date(t);return Number.isNaN(n.getTime())?String(t):`${n.toLocaleDateString("ar-EG")} - ${n.toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})}`}catch{return String(t)}}function y(){if(!d)return;const t=((f==null?void 0:f.value)||"").trim().toLowerCase(),n=r.filter(e=>{if(u!=="all"&&e.status!==u)return!1;if(t){const i=(e.supervisorName||"").toLowerCase(),s=(e.targetName||"").toLowerCase(),l=(e.title||"").toLowerCase(),p=(e.details||e.reason||"").toLowerCase();if(!i.includes(t)&&!s.includes(t)&&!l.includes(t)&&!p.includes(t))return!1}return!0});if(n.length===0){d.innerHTML=`
          <div class="card" style="padding: 3.5rem 1rem; text-align: center;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6rem; color: var(--text-muted);">
              <i data-lucide="check-check" style="width: 34px; height: 34px; color: var(--primary-color); opacity: 0.7;"></i>
              <strong style="font-size: 1.02rem; color: var(--text-primary);">لا توجد طلبات في هذا القسم</strong>
              <span style="font-size: 0.82rem;">${u==="pending"?"لا توجد طلبات معلقة حالياً.":"لا توجد نتائج تطابق الفلتر والبحث."}</span>
            </div>
          </div>
        `,window.lucide&&window.lucide.createIcons({root:d});return}d.innerHTML=n.map(e=>{const i=e.status==="pending",s=e.status==="approved",l=e.status==="rejected",p=i&&e.adminDecision==="kept_pending";let m='<span class="badge badge-warning">قيد المراجعة</span>';p?m='<span class="badge badge-warning">معلق لمراجعة إضافية</span>':s?m='<span class="badge badge-success">تمت الموافقة والتنفيذ</span>':l&&(m='<span class="badge badge-danger">مرفوض</span>');const z=Y(e.createdAt),A=e.details||e.reason||"لا توجد تفاصيل إضافية.",g=e.adminNote||e.adminResponse||e.executionResult||"";return`
          <div class="request-item-card ${e.status||"pending"}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.75rem;">
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.45rem;">
                  <span class="badge badge-info">${j(e.type)}</span>
                  ${m}
                  <span style="font-size: 0.78rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 0.25rem;">
                    <i data-lucide="clock" style="width: 13px; height: 13px;"></i>
                    ${z}
                  </span>
                </div>
                <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary); margin: 0 0 0.35rem 0;">
                  ${e.title||"طلب إداري"}
                </h3>
                <div style="font-size: 0.82rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;">
                  <span><strong>مقدم الطلب:</strong> <span style="color: var(--primary-color); font-weight: 700;">${e.supervisorName||"مشرف"}</span></span>
                  ${e.targetName?`<span><strong>المعني بالطلب:</strong> <strong style="color: var(--text-primary);">${e.targetName}</strong></span>`:""}
                </div>
              </div>

              ${i?`
                <div style="display: flex; gap: 0.45rem; align-items: center; flex-wrap: wrap;">
                  <button class="btn btn-primary btn-decision-trigger" data-mode="approve" data-id="${e.id}" style="font-size: 0.8rem; padding: 0.42rem 0.9rem;">
                    <i data-lucide="check-check" style="width: 15px; height: 15px;"></i>
                    موافقة وتنفيذ
                  </button>
                  <button class="btn btn-secondary btn-decision-trigger" data-mode="keep_pending" data-id="${e.id}" style="font-size: 0.8rem; padding: 0.42rem 0.85rem; color: var(--warning); border-color: var(--warning-border);">
                    <i data-lucide="pause-circle" style="width: 15px; height: 15px;"></i>
                    إبقاء معلقاً
                  </button>
                  <button class="btn btn-secondary btn-decision-trigger" data-mode="reject" data-id="${e.id}" style="font-size: 0.8rem; padding: 0.42rem 0.85rem; color: var(--danger); border-color: var(--danger-border);">
                    <i data-lucide="x" style="width: 15px; height: 15px;"></i>
                    رفض
                  </button>
                </div>
              `:""}
            </div>

            <div class="reason-box">
              <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.25rem;">
                تفاصيل الطلب ومبرراته:
              </div>
              <div>${A}</div>
            </div>

            ${s?`
              <div class="response-box-approved">
                <div style="display: flex; align-items: center; gap: 0.4rem; font-weight: 700; margin-bottom: 0.15rem; color: var(--success);">
                  <i data-lucide="check-circle" style="width: 14px; height: 14px;"></i>
                  <span>تمت الموافقة والتنفيذ</span>
                </div>
                <div>${g||"تم اعتماد الطلب وتطبيقه في السجلات."}</div>
                ${e.reviewedByName||e.reviewedBy?`<div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.25rem;">بواسطة: ${e.reviewedByName||e.reviewedBy}</div>`:""}
              </div>
            `:""}

            ${l?`
              <div class="response-box-rejected">
                <div style="display: flex; align-items: center; gap: 0.4rem; font-weight: 700; margin-bottom: 0.15rem; color: var(--danger);">
                  <i data-lucide="alert-circle" style="width: 14px; height: 14px;"></i>
                  <span>سبب رفض الطلب:</span>
                </div>
                <div>${g||"تم رفض الطلب من الإدارة."}</div>
                ${e.reviewedByName||e.reviewedBy?`<div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.25rem;">بواسطة: ${e.reviewedByName||e.reviewedBy}</div>`:""}
              </div>
            `:""}

            ${p&&g?`
              <div class="response-box-pending-note">
                <div style="display: flex; align-items: center; gap: 0.4rem; font-weight: 700; margin-bottom: 0.15rem; color: var(--warning);">
                  <i data-lucide="clock" style="width: 14px; height: 14px;"></i>
                  <span>ملاحظة الإبقاء معلقاً:</span>
                </div>
                <div>${g}</div>
              </div>
            `:""}
          </div>
        `}).join(""),window.lucide&&window.lucide.createIcons({root:d}),d.querySelectorAll(".btn-decision-trigger").forEach(e=>{e.addEventListener("click",()=>{const i=r.find(s=>s.id===e.dataset.id);i&&Z(i,e.dataset.mode)})})}const T=document.getElementById("decisionModal"),x=document.getElementById("decisionModalTitle"),h=document.getElementById("decisionModalDesc"),M=document.getElementById("decisionNoteInput"),a=document.getElementById("btnConfirmDecision");function Z(t,n){o=t,v=n,M.value="",n==="approve"?(x.textContent="الموافقة وتنفيذ الطلب",h.textContent=`سيتم تنفيذ (${t.title||j(t.type)}) في قاعدة البيانات وتحديث السجلات المرتبطة فوراً.`,a.className="btn btn-primary",a.textContent="تأكيد الموافقة والتنفيذ"):n==="keep_pending"?(x.textContent="إبقاء الطلب معلقاً",h.textContent="سيبقى الطلب قيد الانتظار مع تسجيل ملاحظة للمشرف.",a.className="btn btn-secondary",a.textContent="حفظ الحالة كمعلق"):(x.textContent="رفض الطلب وتوضيح السبب",h.textContent="يرجى كتابة سبب رفض الطلب ليظهر في صفحة طلبات المشرف.",a.className="btn btn-danger",a.textContent="تأكيد الرفض"),T.style.display="flex"}function $(){T.style.display="none",o=null}document.getElementById("btnCloseDecisionModal").addEventListener("click",$);document.getElementById("btnCancelDecisionModal").addEventListener("click",$);a.addEventListener("click",async()=>{var e,i;if(!o)return;const t=M.value.trim();if(v==="reject"&&!t){c.warning("يرجى كتابة سبب الرفض.");return}a.disabled=!0;const n={uid:((e=L.currentUser)==null?void 0:e.uid)||"admin",name:((i=L.currentUser)==null?void 0:i.email)||"المدير العام"};try{v==="approve"?(await J(o,t,n),c.success("تمت الموافقة على الطلب وتنفيذه بنجاح.")):v==="keep_pending"?(await Q(o.id,o,t,n),c.info("تم إبقاء الطلب معلقاً مع حفظ الملاحظة.")):(await V(o.id,o,t,n),c.info("تم رفض الطلب وتسجيل السبب.")),$()}catch(s){console.error("Error processing supervisor request:",s),c.danger(`حدث خطأ أثناء معالجة الطلب: ${(s==null?void 0:s.message)||""}`)}finally{a.disabled=!1}});w.addEventListener("click",()=>b("pending"));B.addEventListener("click",()=>b("approved"));E.addEventListener("click",()=>b("rejected"));C.addEventListener("click",()=>b("all"));function b(t){u=t,[w,B,E,C].forEach(n=>n.classList.remove("active")),t==="pending"?w.classList.add("active"):t==="approved"?B.classList.add("active"):t==="rejected"?E.classList.add("active"):C.classList.add("active"),y()}f.addEventListener("input",y);document.getElementById("btnRefresh").addEventListener("click",()=>{y(),c.info("تم تحديث قائمة الطلبات.")});
