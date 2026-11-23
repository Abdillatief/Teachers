import{a as s,d as o,s as d,T as n}from"./rbacService-Daqk2lPi.js";import{p as c}from"./authService-HszOwoL9.js";import{r as l,a as m}from"./navbar-Wj1PJKN1.js";import{query as p,collection as u,where as h,onSnapshot as g,updateDoc as f,doc as w}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./activityLogger-CddtPFfY.js";c("admin");s.onAuthStateChanged(r=>{r&&(l("student-archive","admin"),m("📦 أرشيف الطلاب",{name:"الإدارة العامة",roleName:"مدير الأكاديمية"}),v())});function v(){const r=document.getElementById("archiveStudentsTableBody");if(!r)return;const i=p(u(o,"students"),h("status","in",["archived","Suspended"]));g(i,e=>{if(e.empty){r.innerHTML='<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">الأرشيف فارغ ولا توجد سجلات مؤرشفة.</td></tr>';return}const a=[];e.forEach(t=>{a.push({id:t.id,...t.data()})}),r.innerHTML=a.map(t=>`
          <tr>
            <td><strong>${t.name}</strong></td>
            <td>${t.age} سنة</td>
            <td>${t.teacherName||"غير مسجل"}</td>
            <td>${t.sessionsCount||0} حصة</td>
            <td style="max-width: 200px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${t.notes||""}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 0.25rem; color: var(--warning);">
                <i data-lucide="star" style="width: 14px; height: 14px; fill: var(--warning);"></i>
                <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">${t.averageRating||0}</span>
              </div>
            </td>
            <td><span class="badge" style="position:static; background-color: var(--danger-light); color: var(--danger); font-weight:700;">مؤرشف / منقطع 📦</span></td>
            <td>
              <button class="btn btn-secondary restore-student-btn" data-id="${t.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;"><i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> استعادة للنشط</button>
            </td>
          </tr>
        `).join(""),window.lucide&&window.lucide.createIcons(),y()},e=>console.warn("Student archive listener warning:",e))}function y(){document.querySelectorAll(".restore-student-btn").forEach(r=>{r.addEventListener("click",async i=>{const e=i.target.closest(".restore-student-btn"),a=e==null?void 0:e.dataset.id;d("هل تريد استعادة الطالب من الأرشيف وإرجاعه للقائمة النشطة بالدراسة؟",async()=>{try{await f(w(o,"students",a),{status:"active"}),n.success("تم استعادة الطالب بنجاح وتنشيط ملفه التعليمي.")}catch(t){console.error(t),n.danger("فشل استعادة الطالب.")}})})})}
