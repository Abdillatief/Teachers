import{d as w}from"./rbacService-Daqk2lPi.js";import{query as q,collection as I,where as O,onSnapshot as T}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import{p as H}from"./authService-HszOwoL9.js";import{r as R,a as U}from"./navbar-Wj1PJKN1.js";import{o as V,a as J}from"./groupSessionModal-DY1Vaak5.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./activityLogger-CddtPFfY.js";import"./auditService-BYflZ_Pe.js";import"./creditManager-D9VZ-GJI.js";import"./supervisorDomainService-Cn9ebdzg.js";H("admin");document.addEventListener("DOMContentLoaded",()=>{var z,A;R("today-sessions","admin"),U("الحصص الجارية اليوم",{name:"المشرف العام",roleName:"مدير النظام"});function $(t){return t?String(t).trim().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه"):""}const _=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"],B=new Date,v=_[B.getDay()],d=B.toISOString().split("T")[0],D=document.getElementById("todayAdminDateLabel");D&&(D.textContent=`اليوم: ${v} (${d})`);let b=[],S=[],E=[],C=[];const x=[],G=q(I(w,"sessions"),O("date","==",d));x.push(T(G,t=>{const s=t.docs.map(a=>({id:a.id,...a.data()})),i=b.filter(a=>a.postponedFrom===d&&a.date!==d);b=[...s,...i],m()},t=>console.warn("Admin today sessions listener error:",t)));const P=q(I(w,"sessions"),O("postponedFrom","==",d));x.push(T(P,t=>{const s=t.docs.map(a=>({id:a.id,...a.data()})).filter(a=>a.date!==d);b=[...b.filter(a=>a.date===d),...s],m()},t=>console.warn("Admin today postponed sessions listener error:",t))),x.push(T(I(w,"students"),t=>{S=[],t.forEach(s=>{const i={id:s.id,...s.data()};S.push(i)}),m()},t=>console.warn("Admin today students listener error:",t))),x.push(T(I(w,"groups"),t=>{E=[],t.forEach(s=>{const i=s.data();i.status!=="archived"&&E.push({id:s.id,...i})}),m()},t=>console.warn("Admin today groups listener error:",t))),x.push(T(I(w,"group_sessions"),t=>{C=[],t.forEach(s=>{const i=s.data();i.date===d&&C.push({id:s.id,...i})}),m()},t=>console.warn("Admin today group_sessions listener error:",t))),(z=document.getElementById("adminSearchInput"))==null||z.addEventListener("input",m),(A=document.getElementById("adminStatusFilter"))==null||A.addEventListener("change",m);function k(t){if(!t||typeof t!="string")return 9999;const s=t.trim().toLowerCase();if(s==="غير محدد"||!s)return 9999;let i=!1,a=!1;s.includes("م")||s.includes("مساء")||s.includes("pm")?i=!0:(s.includes("ص")||s.includes("صباح")||s.includes("am"))&&(a=!0);const g=s.match(/(\d{1,2})(?::(\d{2}))?/);if(!g)return 9999;let y=parseInt(g[1],10),L=g[2]?parseInt(g[2],10):0;return i&&y<12?y+=12:a&&y===12&&(y=0),y*60+L}function m(){var y,L;const t=document.getElementById("adminTodaySessionsGrid");if(!t)return;const s=(((y=document.getElementById("adminSearchInput"))==null?void 0:y.value)||"").trim().toLowerCase(),i=((L=document.getElementById("adminStatusFilter"))==null?void 0:L.value)||"all",a=[];E.forEach(e=>{var h;const n=(e.day?[e.day]:e.days||[]).some(o=>$(o)===$(v)),r=C.find(o=>o.groupId===e.id&&o.date===d);if(!n)return;let p="pending",f="لم تتم بعد ⏳",c="background: rgba(99, 102, 241, 0.12); color: #6366f1;";r&&(p="completed",f="تمت بنجاح ✅",c="background: rgba(16, 185, 129, 0.12); color: var(--success);"),a.push({id:`grp_${e.id}`,isGroup:!0,groupId:e.id,groupObj:e,name:`📚 ${e.name||"مجموعة جماعية"}`,teacherName:e.teacherName||(r==null?void 0:r.teacherName)||"غير معين",time:e.time||(r==null?void 0:r.time)||"05:30 مساءً",studentCount:((h=e.studentIds)==null?void 0:h.length)||0,statusKey:p,statusLabel:f,badgeBg:c,recordedGroupSession:r})}),S.forEach(e=>{var F,K,M,j;if(e.status==="archived"||e.status==="Suspended"||e.status==="pending_approval"||e.subscriptionType==="group"||e.groupId||!(e.schedule&&e.schedule.days?e.schedule.days:e.sessionDays||[]).some(u=>$(u)===$(v)))return;const r=b.find(u=>u.studentId===e.id&&u.date===d),p=b.find(u=>u.studentId===e.id&&u.postponedFrom===d&&u.date!==d&&u.status==="delayed");let f="pending",c="لم تتم بعد ⏳",h="background: rgba(99, 102, 241, 0.12); color: #6366f1;";const o=r||p;o&&(o.status==="completed"?(f="completed",c="تمت بنجاح ✅",h="background: rgba(16, 185, 129, 0.12); color: var(--success);"):o.status==="student_absent"?(f="absent",c=o.absenceType==="unexcused"?"غياب بدون عذر 🔴":"غياب بعذر 🟢",h="background: rgba(239, 68, 68, 0.12); color: var(--danger);"):o.status==="delayed"?(f="delayed",o.postponedFrom===d&&o.date!==d?c=`مؤجلة إلى (${o.date}) ⏳`:o.postponedFrom&&o.postponedFrom!==d?c=`مؤجلة من (${o.postponedFrom}) 🔄`:c="مؤجلة 🔄",h="background: rgba(217, 119, 6, 0.12); color: #d97706;"):o.status==="cancelled"&&(f="absent",c="ملغاة ❌",h="background: rgba(239, 68, 68, 0.12); color: var(--danger);"));let N=((F=e.schedule)==null?void 0:F.uniformTime)||e.sessionTime||"غير محدد";(K=e.schedule)!=null&&K.differentTimes&&((j=(M=e.schedule)==null?void 0:M.times)!=null&&j[v])&&(N=e.schedule.times[v]),a.push({id:e.id,isGroup:!1,name:e.name||"طالب",teacherName:e.teacherName||(o==null?void 0:o.teacherName)||"غير معين",time:N,statusKey:f,statusLabel:c,badgeBg:h,recorded:o})}),document.getElementById("statTodayTotal").textContent=a.length,document.getElementById("statTodayCompleted").textContent=a.filter(e=>e.statusKey==="completed").length,document.getElementById("statTodayPending").textContent=a.filter(e=>e.statusKey==="pending").length,document.getElementById("statTodayDelayed").textContent=a.filter(e=>e.statusKey==="delayed").length,document.getElementById("statTodayAbsent").textContent=a.filter(e=>e.statusKey==="absent").length;const g=a.filter(e=>{const l=!s||e.name.toLowerCase().includes(s)||e.teacherName.toLowerCase().includes(s),n=i==="all"||e.statusKey===i;return l&&n});if(g.sort((e,l)=>k(e.time)-k(l.time)),g.length===0){t.innerHTML='<p style="text-align: center; color: var(--text-muted); padding: 2rem; grid-column: 1 / -1;">لا توجد حصص مطابقة لشروط البحث أو الفلترة المحددة اليوم.</p>';return}t.innerHTML=g.map(e=>{if(e.isGroup){const l=e.statusKey==="completed",n=e.recordedGroupSession;return`
              <div class="session-item-card" style="border-right: 4px solid ${l?"var(--success)":"var(--primary-color)"};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                      <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary); margin: 0;">${e.name}</h4>
                      <span class="badge" style="position: static; font-size: 0.7rem; background: rgba(14, 165, 233, 0.12); color: var(--primary-color); font-weight: 800;">حصة جماعية 👥</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.35rem; display: flex; align-items: center; gap: 0.35rem;">
                      <i data-lucide="clock" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
                      <span>موعد الحصة: <strong>${e.time}</strong></span>
                    </div>
                  </div>
                  <span class="badge" style="position: static; font-weight: 800; font-size: 0.75rem; padding: 0.3rem 0.65rem; border-radius: 6px; ${e.badgeBg}">
                    ${e.statusLabel}
                  </span>
                </div>

                ${l?`
                  <div style="font-size: 0.78rem; background: var(--bg-primary); padding: 0.55rem 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
                    <span>🕒 تسجلت: <strong>${(n==null?void 0:n.recordedAt)||""}</strong></span>
                    <span style="color: var(--success); font-weight: 800;">👥 حضور: ${(n==null?void 0:n.presentCount)||0}/${(n==null?void 0:n.totalCount)||0}</span>
                    <span style="color: var(--danger); font-weight: 800;">❌ غياب: ${(n==null?void 0:n.absentCount)||0}</span>
                  </div>
                `:`
                  <div style="font-size: 0.78rem; color: var(--text-secondary);">
                    <span>👥 عدد الطلاب بالمجموعة: <strong>${e.studentCount} طلاب</strong></span>
                  </div>
                `}

                <div style="padding-top: 0.5rem; border-top: 1px dashed var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 0.4rem; font-size: 0.85rem;">
                  <span style="color: var(--text-primary);">المعلم: <strong style="color: var(--primary-color); font-weight: 800;">${e.teacherName}</strong></span>
                  ${l?`
                    <button type="button" class="btn btn-secondary btn-admin-view-grp" data-grp-id="${e.groupId}" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; font-weight: 800; color: var(--primary-color); border-color: var(--primary-color);">
                      <i data-lucide="eye" style="width: 13px; height: 13px;"></i> عرض التفاصيل
                    </button>
                  `:`
                    <button type="button" class="btn btn-primary btn-admin-rec-grp" data-grp-id="${e.groupId}" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; font-weight: 800;">
                      <i data-lucide="edit-3" style="width: 13px; height: 13px;"></i> تسجيل الحصة
                    </button>
                  `}
                </div>
              </div>
            `}return`
            <div class="session-item-card">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                <div>
                  <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary); margin: 0;">${e.name}</h4>
                  <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem; display: flex; align-items: center; gap: 0.35rem;">
                    <i data-lucide="clock" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
                    <span>موعد الحصة: <strong>${e.time}</strong></span>
                  </div>
                </div>
                <span class="badge" style="position: static; font-weight: 800; font-size: 0.75rem; padding: 0.3rem 0.65rem; border-radius: 6px; ${e.badgeBg}">
                  ${e.statusLabel}
                </span>
              </div>

              <div style="padding-top: 0.5rem; border-top: 1px dashed var(--border-color); display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: var(--text-primary);">
                <i data-lucide="user-check" style="width: 16px; height: 16px; color: var(--primary-color);"></i>
                <span>المعلم التابع: <strong style="color: var(--primary-color); font-weight: 800;">${e.teacherName}</strong></span>
              </div>
            </div>
          `}).join(""),window.lucide&&window.lucide.createIcons(),t.querySelectorAll(".btn-admin-rec-grp").forEach(e=>{e.addEventListener("click",l=>{const n=l.currentTarget.dataset.grpId,r=E.find(p=>p.id===n);r&&V(r,r.teacherName||"المعلم",()=>m())})}),t.querySelectorAll(".btn-admin-view-grp").forEach(e=>{e.addEventListener("click",l=>{const n=l.currentTarget.dataset.grpId,r=C.find(p=>p.groupId===n&&p.date===d);r&&J(r)})})}});
