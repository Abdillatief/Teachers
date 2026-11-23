import{a as R,d as r,s as F,T as k}from"./rbacService-D2RrsA9d.js";import{p as Q}from"./authService-CtWWGArP.js";import{r as _,a as q}from"./navbar-BWutcREu.js";import{onSnapshot as S,query as E,collection as c,where as $,deleteDoc as b,doc as g,getDocs as x,updateDoc as H,arrayRemove as j}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./activityLogger-BK9d5021.js";Q("admin");let T=[],C=[],L=[],P=[],I=[];R.onAuthStateChanged(e=>{e&&(_("blackbox","admin"),q("📦 بلاك بوكس - السجل الشامل",{name:"الإدارة العامة",roleName:"مدير الأكاديمية"}),G(),U())});function G(){S(E(c(r,"users"),$("role","==","teacher")),e=>{P=[],e.forEach(t=>P.push({id:t.id,...t.data()})),w()},e=>console.warn("Blackbox teachers listener warning:",e)),S(c(r,"payments"),e=>{C=[],e.forEach(t=>C.push({id:t.id,...t.data()})),w()},e=>console.warn("Blackbox payments listener warning:",e)),S(c(r,"subscriptions"),e=>{L=[],e.forEach(t=>L.push({id:t.id,...t.data()})),w()},e=>console.warn("Blackbox subscriptions listener warning:",e)),S(c(r,"trash"),e=>{I=[],e.forEach(t=>I.push({id:t.id,...t.data()})),M()},e=>console.warn("Blackbox trash listener warning:",e)),S(c(r,"students"),e=>{T=[],e.forEach(t=>T.push({id:t.id,...t.data()})),M()},e=>console.warn("Blackbox students listener warning:",e))}let y=[];function M(){const e=new Map;T.forEach(t=>{e.set(t.id,{...t,source:"students",displayStatus:t.status||"active"})}),I.forEach(t=>{var s,n;if(t.originalCollection==="students"||(s=t.data)!=null&&s.studentName||(n=t.data)!=null&&n.name){const o=t.data||{},l=t.originalId||o.id||t.id;if(!e.has(l))e.set(l,{...o,id:l,trashDocId:t.id,source:"trash",displayStatus:"trash",deletedAt:t.deletedAt,deletionReason:t.deletionReason||"تم الحذف إلى سلة المهملات"});else{const a=e.get(l);a.trashDocId=t.id}}}),y=Array.from(e.values()),V(),w()}function V(){document.getElementById("statTotalStudents").textContent=y.length;const e=y.filter(n=>n.displayStatus==="active"||n.displayStatus==="active_subscription").length,t=y.filter(n=>n.displayStatus==="archived"||n.displayStatus==="Suspended").length,s=y.filter(n=>n.displayStatus==="trash"||n.source==="trash").length;document.getElementById("statActiveStudents").textContent=e,document.getElementById("statArchivedStudents").textContent=t,document.getElementById("statTrashStudents").textContent=s}function N(e){if(e.teacherName)return e.teacherName;if(e.teacherId){const t=P.find(s=>s.id===e.teacherId);if(t&&t.name)return t.name}return"غير معين"}function w(){var o,l;const e=document.getElementById("blackboxTableBody");if(!e)return;const t=((o=document.getElementById("searchInput"))==null?void 0:o.value.trim().toLowerCase())||"",s=((l=document.getElementById("statusFilter"))==null?void 0:l.value)||"all";let n=y.filter(a=>{if(s!=="all"&&(s==="active"&&!(a.displayStatus==="active"||a.displayStatus==="active_subscription")||s==="suspended"&&a.displayStatus!=="Suspended"||s==="archived"&&a.displayStatus!=="archived"||s==="pending"&&a.displayStatus!=="pending_approval"||s==="trash"&&!(a.displayStatus==="trash"||a.source==="trash")))return!1;if(t){const u=(a.name||a.studentName||"").toLowerCase(),p=(a.phone||a.parentPhone||"").toLowerCase(),m=N(a).toLowerCase(),d=(a.id||"").toLowerCase();return u.includes(t)||p.includes(t)||m.includes(t)||d.includes(t)}return!0});if(n.length===0){e.innerHTML='<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">لا توجد نتائج مطابقة لمحددات البحث في البلاك بوكس.</td></tr>';return}e.innerHTML=n.map(a=>{const u=N(a),p=a.parentPhone||a.phone||"غير مدون",m=a.packageName||a.planName||(a.subscriptionType==="group"?"مجموعة جماعية":"باقة فردية");let d="غير محدد";a.createdAt&&(d=new Date(a.createdAt.seconds?a.createdAt.seconds*1e3:a.createdAt).toLocaleDateString("ar-EG"));const f=C.filter(i=>i.studentId===a.id),A=f.reduce((i,h)=>i+(parseFloat(h.amount)||0),0),D=a.sessionsCount||f.length||0;let v='<span class="badge-status badge-active">نشط ✅</span>';return a.displayStatus==="Suspended"?v='<span class="badge-status badge-suspended">موقوف ⛔</span>':a.displayStatus==="archived"?v='<span class="badge-status badge-archived">مؤرشف 📦</span>':a.displayStatus==="pending_approval"?v='<span class="badge-status badge-pending">بانتظار الموافقة ⏳</span>':(a.displayStatus==="trash"||a.source==="trash")&&(v='<span class="badge-status badge-trash">في السلة 🗑️</span>'),`
          <tr>
            <td>
              <strong style="color: var(--text-primary); font-size: 0.95rem;">${a.name||a.studentName||"طالب مبهم"}</strong>
              <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.2rem; display: flex; align-items: center; gap: 0.25rem;">
                <i data-lucide="phone" style="width: 12px; height: 12px; color: var(--primary-color);"></i>
                <span>${p}</span>
              </div>
            </td>
            <td>
              <strong style="color: var(--text-primary); font-size: 0.88rem;">${u}</strong>
            </td>
            <td>
              <span class="badge" style="position:static; background-color: var(--primary-light); color: var(--primary-color); font-weight:700;">${m}</span>
            </td>
            <td>
              <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 600;">${d}</span>
            </td>
            <td>
              ${v}
            </td>
            <td>
              <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">
                📖 ${D} حصة مسجلة
              </div>
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--success); margin-top: 0.15rem;">
                💰 ${A} ج.م مسددة
              </div>
            </td>
            <td>
              <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                <button class="detail-btn open-detail-btn" data-id="${a.id}">
                  <i data-lucide="eye" style="width:14px;height:14px;"></i> تفاصيل
                </button>
                <button class="danger-action-btn purge-student-btn" data-id="${a.id}" data-name="${a.name||a.studentName||"الطالب"}">
                  <i data-lucide="trash-2" style="width:14px;height:14px;"></i> حذف نهائي
                </button>
              </div>
            </td>
          </tr>
        `}).join(""),window.lucide&&window.lucide.createIcons(),J()}function J(){document.querySelectorAll(".open-detail-btn").forEach(e=>{e.addEventListener("click",t=>{const s=t.currentTarget.dataset.id;K(s)})}),document.querySelectorAll(".purge-student-btn").forEach(e=>{e.addEventListener("click",t=>{const s=t.currentTarget.dataset.id,n=t.currentTarget.dataset.name;O(s,n)})})}function K(e){var p,m;const t=y.find(d=>d.id===e);if(!t)return;const s=document.getElementById("studentDetailModal"),n=document.getElementById("studentDetailModalBody"),o=N(t),a=C.filter(d=>d.studentId===e).reduce((d,f)=>d+(parseFloat(f.amount)||0),0),u=L.filter(d=>d.studentId===e);n.innerHTML=`
        <div style="background: rgba(13, 148, 136, 0.05); border-radius: 10px; padding: 1rem; margin-bottom: 1rem; border: 1px solid rgba(13, 148, 136, 0.15);">
          <h4 style="margin: 0 0 0.5rem 0; color: var(--primary-color); font-size: 1.1rem; font-weight: 800;">${t.name||t.studentName||"طالب مجهول"}</h4>
          <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">المعرف بالنظام (ID): <code>${t.id}</code></p>
        </div>

        <div class="detail-row"><span class="detail-label">عمر الطالب:</span><span class="detail-value">${t.age||"غير محدد"} سنة</span></div>
        <div class="detail-row"><span class="detail-label">رقم هاتف ولي الأمر:</span><span class="detail-value">${t.parentPhone||t.phone||"غير مدون"}</span></div>
        <div class="detail-row"><span class="detail-label">المعلم المشرف المعتمد:</span><span class="detail-value" style="color: var(--primary-color);">${o}</span></div>
        <div class="detail-row"><span class="detail-label">الباقة المسجلة:</span><span class="detail-value">${t.packageName||"باقة فردية"}</span></div>
        <div class="detail-row"><span class="detail-label">أيام الحصص المحددة:</span><span class="detail-value">${(((p=t.schedule)==null?void 0:p.days)||t.sessionDays||[]).join(" - ")||"غير محدد"}</span></div>
        <div class="detail-row"><span class="detail-label">موعد الحصة المعتمد:</span><span class="detail-value">${((m=t.schedule)==null?void 0:m.uniformTime)||t.sessionTime||t.time||"غير محدد"}</span></div>
        <div class="detail-row"><span class="detail-label">إجمالي المقبوضات والتحصيل:</span><span class="detail-value" style="color: var(--success);">${a} ج.م</span></div>
        <div class="detail-row"><span class="detail-label">عدد الاشتراكات التاريخية:</span><span class="detail-value">${u.length} اشتراكات</span></div>
        <div class="detail-row"><span class="detail-label">مصدر السجل والحالة:</span><span class="detail-value">${t.displayStatus} (${t.source})</span></div>
        ${t.notes?`<div style="margin-top: 1rem; padding: 0.75rem; background: var(--bg-body, #f8fafc); border-radius: 8px; font-size: 0.85rem; color: var(--text-secondary);"><strong>ملاحظات:</strong> ${t.notes}</div>`:""}
      `,s.style.display="flex"}async function O(e,t){F(`🚨 تحذير قطعي ونهائي:
هل أنت متأكد تماماً من حذف الطالب (${t}) حذفاً شاملاً ونهائياً؟

سيتم حذف كافة البيانات المتعلقة به للأبد من السيستيم:
1. سجل الطالب الرئيسي والأرشيفي
2. جميع اشتراكات الطالب المالية
3. كافة إيصالات وسجلات المدفوعات والتحصيل
4. سجلات الحصص المسجلة
5. السجلات المعلقة بسلة المحذوفات والمجموعات`,async()=>{try{k.info("جاري مسح كافة بيانات الطالب وسجلاته المالية والدراسية من النظام..."),await b(g(r,"students",e)).catch(i=>console.warn(i));const s=E(c(r,"subscriptions"),$("studentId","==",e)),o=(await x(s)).docs.map(i=>b(g(r,"subscriptions",i.id)));await Promise.all(o);const l=E(c(r,"payments"),$("studentId","==",e)),u=(await x(l)).docs.map(i=>b(g(r,"payments",i.id)));await Promise.all(u);const p=E(c(r,"sessions"),$("studentId","==",e)),d=(await x(p)).docs.map(i=>b(g(r,"sessions",i.id)));await Promise.all(d);const f=E(c(r,"trash"),$("originalId","==",e)),D=(await x(f)).docs.map(i=>b(g(r,"trash",i.id)));await Promise.all(D),I.forEach(async i=>{var h,B;(((h=i.data)==null?void 0:h.id)===e||((B=i.data)==null?void 0:B.studentId)===e)&&await b(g(r,"trash",i.id)).catch(z=>console.warn(z))}),(await x(c(r,"groups"))).forEach(async i=>{const h=i.data();h.studentIds&&h.studentIds.includes(e)&&await H(g(r,"groups",i.id),{studentIds:j(e)}).catch(B=>console.warn(B))}),k.success(`تم حذف الطالب (${t}) وكافة مستنداته وسجلاته من الأكاديمية والسيستيم بالكامل ✅`)}catch(s){console.error("Error purging student:",s),k.danger("حدث خطأ أثناء محاولة الحذف النهائي للطالب.")}})}function U(){var e,t,s;(e=document.getElementById("searchInput"))==null||e.addEventListener("input",w),(t=document.getElementById("statusFilter"))==null||t.addEventListener("change",w),(s=document.getElementById("closeDetailModalBtn"))==null||s.addEventListener("click",()=>{document.getElementById("studentDetailModal").style.display="none"}),window.addEventListener("click",n=>{const o=document.getElementById("studentDetailModal");n.target===o&&(o.style.display="none")})}
