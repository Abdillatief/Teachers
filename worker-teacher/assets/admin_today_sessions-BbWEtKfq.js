import{d as E}from"./rbacService-D2RrsA9d.js";import{onSnapshot as C,collection as L}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import{p as G}from"./authService-CtWWGArP.js";import{r as O,a as q}from"./navbar-BWutcREu.js";import{o as H,a as P}from"./groupSessionModal-B02MYQUu.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./activityLogger-BK9d5021.js";import"./auditService-D31EusTs.js";import"./creditManager-CewcMcqw.js";import"./supervisorDomainService-BW5mzJbW.js";G("admin");document.addEventListener("DOMContentLoaded",()=>{var z,A;O("today-sessions","admin"),q("الحصص الجارية اليوم",{name:"المشرف العام",roleName:"مدير النظام"});function v(t){return t?String(t).trim().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه"):""}const _=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"],B=new Date,b=_[B.getDay()],d=B.toISOString().split("T")[0],D=document.getElementById("todayAdminDateLabel");D&&(D.textContent=`اليوم: ${b} (${d})`);let x=[],S=[],w=[],I=[];const T=[];T.push(C(L(E,"sessions"),t=>{x=[],t.forEach(a=>{const r=a.data();(r.date===d||r.postponedFrom===d)&&x.push({id:a.id,...r})}),h()},t=>console.warn("Admin today sessions listener error:",t))),T.push(C(L(E,"students"),t=>{S=[],t.forEach(a=>{const r={id:a.id,...a.data()};S.push(r)}),h()},t=>console.warn("Admin today students listener error:",t))),T.push(C(L(E,"groups"),t=>{w=[],t.forEach(a=>{const r=a.data();r.status!=="archived"&&w.push({id:a.id,...r})}),h()},t=>console.warn("Admin today groups listener error:",t))),T.push(C(L(E,"group_sessions"),t=>{I=[],t.forEach(a=>{const r=a.data();r.date===d&&I.push({id:a.id,...r})}),h()},t=>console.warn("Admin today group_sessions listener error:",t))),(z=document.getElementById("adminSearchInput"))==null||z.addEventListener("input",h),(A=document.getElementById("adminStatusFilter"))==null||A.addEventListener("change",h);function k(t){if(!t||typeof t!="string")return 9999;const a=t.trim().toLowerCase();if(a==="غير محدد"||!a)return 9999;let r=!1,l=!1;a.includes("م")||a.includes("مساء")||a.includes("pm")?r=!0:(a.includes("ص")||a.includes("صباح")||a.includes("am"))&&(l=!0);const m=a.match(/(\d{1,2})(?::(\d{2}))?/);if(!m)return 9999;let g=parseInt(m[1],10),$=m[2]?parseInt(m[2],10):0;return r&&g<12?g+=12:l&&g===12&&(g=0),g*60+$}function h(){var g,$;const t=document.getElementById("adminTodaySessionsGrid");if(!t)return;const a=(((g=document.getElementById("adminSearchInput"))==null?void 0:g.value)||"").trim().toLowerCase(),r=(($=document.getElementById("adminStatusFilter"))==null?void 0:$.value)||"all",l=[];w.forEach(e=>{var f;const s=(e.day?[e.day]:e.days||[]).some(n=>v(n)===v(b)),o=I.find(n=>n.groupId===e.id&&n.date===d);if(!s)return;let p="pending",y="لم تتم بعد ⏳",c="background: rgba(99, 102, 241, 0.12); color: #6366f1;";o&&(p="completed",y="تمت بنجاح ✅",c="background: rgba(16, 185, 129, 0.12); color: var(--success);"),l.push({id:`grp_${e.id}`,isGroup:!0,groupId:e.id,groupObj:e,name:`📚 ${e.name||"مجموعة جماعية"}`,teacherName:e.teacherName||(o==null?void 0:o.teacherName)||"غير معين",time:e.time||(o==null?void 0:o.time)||"05:30 مساءً",studentCount:((f=e.studentIds)==null?void 0:f.length)||0,statusKey:p,statusLabel:y,badgeBg:c,recordedGroupSession:o})}),S.forEach(e=>{var F,K,M,j;if(e.status==="archived"||e.status==="Suspended"||e.status==="pending_approval"||e.subscriptionType==="group"||e.groupId||!(e.schedule&&e.schedule.days?e.schedule.days:e.sessionDays||[]).some(u=>v(u)===v(b)))return;const o=x.find(u=>u.studentId===e.id&&u.date===d),p=x.find(u=>u.studentId===e.id&&u.postponedFrom===d&&u.date!==d&&u.status==="delayed");let y="pending",c="لم تتم بعد ⏳",f="background: rgba(99, 102, 241, 0.12); color: #6366f1;";const n=o||p;n&&(n.status==="completed"?(y="completed",c="تمت بنجاح ✅",f="background: rgba(16, 185, 129, 0.12); color: var(--success);"):n.status==="student_absent"?(y="absent",c=n.absenceType==="unexcused"?"غياب بدون عذر 🔴":"غياب بعذر 🟢",f="background: rgba(239, 68, 68, 0.12); color: var(--danger);"):n.status==="delayed"?(y="delayed",n.postponedFrom===d&&n.date!==d?c=`مؤجلة إلى (${n.date}) ⏳`:n.postponedFrom&&n.postponedFrom!==d?c=`مؤجلة من (${n.postponedFrom}) 🔄`:c="مؤجلة 🔄",f="background: rgba(217, 119, 6, 0.12); color: #d97706;"):n.status==="cancelled"&&(y="absent",c="ملغاة ❌",f="background: rgba(239, 68, 68, 0.12); color: var(--danger);"));let N=((F=e.schedule)==null?void 0:F.uniformTime)||e.sessionTime||"غير محدد";(K=e.schedule)!=null&&K.differentTimes&&((j=(M=e.schedule)==null?void 0:M.times)!=null&&j[b])&&(N=e.schedule.times[b]),l.push({id:e.id,isGroup:!1,name:e.name||"طالب",teacherName:e.teacherName||(n==null?void 0:n.teacherName)||"غير معين",time:N,statusKey:y,statusLabel:c,badgeBg:f,recorded:n})}),document.getElementById("statTodayTotal").textContent=l.length,document.getElementById("statTodayCompleted").textContent=l.filter(e=>e.statusKey==="completed").length,document.getElementById("statTodayPending").textContent=l.filter(e=>e.statusKey==="pending").length,document.getElementById("statTodayDelayed").textContent=l.filter(e=>e.statusKey==="delayed").length,document.getElementById("statTodayAbsent").textContent=l.filter(e=>e.statusKey==="absent").length;const m=l.filter(e=>{const i=!a||e.name.toLowerCase().includes(a)||e.teacherName.toLowerCase().includes(a),s=r==="all"||e.statusKey===r;return i&&s});if(m.sort((e,i)=>k(e.time)-k(i.time)),m.length===0){t.innerHTML='<p style="text-align: center; color: var(--text-muted); padding: 2rem; grid-column: 1 / -1;">لا توجد حصص مطابقة لشروط البحث أو الفلترة المحددة اليوم.</p>';return}t.innerHTML=m.map(e=>{if(e.isGroup){const i=e.statusKey==="completed",s=e.recordedGroupSession;return`
              <div class="session-item-card" style="border-right: 4px solid ${i?"var(--success)":"var(--primary-color)"};">
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

                ${i?`
                  <div style="font-size: 0.78rem; background: var(--bg-primary); padding: 0.55rem 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
                    <span>🕒 تسجلت: <strong>${(s==null?void 0:s.recordedAt)||""}</strong></span>
                    <span style="color: var(--success); font-weight: 800;">👥 حضور: ${(s==null?void 0:s.presentCount)||0}/${(s==null?void 0:s.totalCount)||0}</span>
                    <span style="color: var(--danger); font-weight: 800;">❌ غياب: ${(s==null?void 0:s.absentCount)||0}</span>
                  </div>
                `:`
                  <div style="font-size: 0.78rem; color: var(--text-secondary);">
                    <span>👥 عدد الطلاب بالمجموعة: <strong>${e.studentCount} طلاب</strong></span>
                  </div>
                `}

                <div style="padding-top: 0.5rem; border-top: 1px dashed var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 0.4rem; font-size: 0.85rem;">
                  <span style="color: var(--text-primary);">المعلم: <strong style="color: var(--primary-color); font-weight: 800;">${e.teacherName}</strong></span>
                  ${i?`
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
          `}).join(""),window.lucide&&window.lucide.createIcons(),t.querySelectorAll(".btn-admin-rec-grp").forEach(e=>{e.addEventListener("click",i=>{const s=i.currentTarget.dataset.grpId,o=w.find(p=>p.id===s);o&&H(o,o.teacherName||"المعلم",()=>h())})}),t.querySelectorAll(".btn-admin-view-grp").forEach(e=>{e.addEventListener("click",i=>{const s=i.currentTarget.dataset.grpId,o=I.find(p=>p.groupId===s&&p.date===d);o&&P(o)})})}});
