import{T as q,d as oe,g as ye,a as be,h as ve,i as S,j as Se}from"./rbacService-D2RrsA9d.js";import{getDocs as xe,collection as we,getDoc as Ce,doc as Ie}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import{p as Ee}from"./authService-CtWWGArP.js";import{r as de,a as ie,c as $e,d as I}from"./navbar-BWutcREu.js";import{i as Te}from"./communityWidget-CyNaW1fo.js";import{backfillOperationalProjectionsIfNeeded as Le}from"./supervisorDomainService-BW5mzJbW.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./activityLogger-BK9d5021.js";import"./communityService-Do06dC0A.js";async function Be(){q.info("جاري تحضير النسخة الاحتياطية لقاعدة البيانات...");try{const e=["users","students","sessions","studentRequests","settings","notifications","auditLogs"],n={};for(const d of e){const t=await xe(we(oe,d));n[d]=[],t.forEach(y=>{n[d].push({id:y.id,...y.data()})})}const a=ye(n,2),s=new Blob([a],{type:"application/json"}),i=URL.createObjectURL(s),o=document.createElement("a"),r=new Date().toISOString().split("T")[0];o.href=i,o.download=`sabeel_academy_backup_${r}.json`,document.body.appendChild(o),o.click(),setTimeout(()=>{document.body.removeChild(o),URL.revokeObjectURL(i)},0),q.success("تم تصدير النسخة الاحتياطية وتحميلها بنجاح.")}catch(e){console.error("Backup export failed:",e),q.error("فشل تصدير النسخة الاحتياطية لقاعدة البيانات.")}}Ee("admin");let z=[],$=[],le=[],k=[],j=[],J=[],ce=[],ue=[],O=[],P=null,w=De(),G="all",R=null,D=null,A=null,_=null;function De(){const e=new Date,n=e.getFullYear(),a=String(e.getMonth()+1).padStart(2,"0");return`${n}-${a}`}const ee=sessionStorage.getItem("sabeel_user_session");if(ee)try{P=JSON.parse(ee),de("dashboard","admin"),ie("لوحة التحكم والإدارة",{name:P.name||"الإدارة العامة",roleName:"مدير الأكاديمية"}),me()}catch{}be.onAuthStateChanged(async e=>{if(e)try{if(!P){const n=await Ce(Ie(oe,"users",e.uid));n.exists()&&(P=n.data(),de("dashboard","admin"),ie("لوحة التحكم والإدارة",{name:P.name||"الإدارة العامة",roleName:"مدير الأكاديمية"}),me())}ve(e.uid).catch(n=>console.warn("RBAC seed warning:",n)),Le().catch(n=>console.warn("Backfill projections warning:",n)),$e().catch(n=>console.warn("Monthly reset check error:",n)),ke(),Re(),Ae(),Te("adminCommunityWidgetContainer",{role:"admin",currentUserId:e.uid})}catch(n){console.error("خطأ جلب بيانات حساب الأدمن:",n)}});function me(){var a,s;const e=document.getElementById("monthSelectDropdown");if(!e)return;e.innerHTML="";const n=new Date;for(let i=-6;i<=3;i++){const o=new Date(n.getFullYear(),n.getMonth()+i,1),r=o.getFullYear(),d=String(o.getMonth()+1).padStart(2,"0"),t=`${r}-${d}`,y=o.toLocaleDateString("ar-EG",{month:"long",year:"numeric"}),m=document.createElement("option");m.value=t,m.textContent=y,t===w&&(m.selected=!0),e.appendChild(m)}e.addEventListener("change",i=>{w=i.target.value,Z()}),(a=document.getElementById("btnPrevMonth"))==null||a.addEventListener("click",()=>{const[i,o]=w.split("-").map(Number),r=new Date(i,o-2,1);w=`${r.getFullYear()}-${String(r.getMonth()+1).padStart(2,"0")}`,e.value=w,Z()}),(s=document.getElementById("btnNextMonth"))==null||s.addEventListener("click",()=>{const[i,o]=w.split("-").map(Number),r=new Date(i,o,1);w=`${r.getFullYear()}-${String(r.getMonth()+1).padStart(2,"0")}`,e.value=w,Z()})}let K=null;function E(){K&&cancelAnimationFrame(K),K=requestAnimationFrame(()=>{Z()})}function ke(){I.subscribe("teachers",e=>{z=e,E()}),I.subscribe("students",e=>{$=e,E()}),I.subscribe("packages",e=>{J=e,E()}),I.subscribe("studentBalances",e=>{ce=e,E()}),I.subscribe("groups",e=>{le=e,E()}),I.subscribe("sessions",e=>{k=e,E()}),setTimeout(()=>{I.subscribe("payments",e=>{j=e,E()}),I.subscribe("expenses",e=>{ue=e,E()}),I.subscribe("subscriptions",e=>{E()})},50)}function Z(){var N,M;const e=z.filter(l=>l.status==="approved"||l.status==="active"),n=z.filter(l=>l.status==="pending"),a=new Date().toISOString().split("T")[0],s=k.filter(l=>l.date===a),i=Date.now()-300*1e3,o=e.filter(l=>l.lastLogin?(l.lastLogin.seconds?l.lastLogin.seconds*1e3:new Date(l.lastLogin).getTime())>=i:!1);O=e.filter(l=>s.filter(T=>T.teacherId===l.uid||T.teacherUid===l.uid).length===0);const r=pe(),d=Me(w,e);S("statTotalStudentsCount",String($.length)),S("statActiveStudentsCount",String(r.activeCount)),S("statInactiveStudentsCount",String(r.inactiveCount)),S("statRenewalNeededCount",String(r.renewalNeededCount)),document.getElementById("badgeTotalStudents").textContent=`${$.length} طالب`,S("statTeachersTotalCount",String(z.length)),S("statTeachersActiveCount",String(e.length)),S("statTodaySessionsCount",String(s.length)),S("statZeroSessionsCount",String(O.length)),document.getElementById("statTeachersPendingFooter").textContent=`${n.length} بانتظار الاعتماد`,document.getElementById("badgeOnlineTeachers").textContent=`${o.length} متصل الآن`,S("statFinancialRevenue",`${d.revenue.toLocaleString("ar-EG")} ج.م`),S("statFinancialSalaries",`${d.expectedSalaries.toLocaleString("ar-EG")} ج.م`),S("statFinancialCurrentDue",`${d.currentDueSalaries.toLocaleString("ar-EG")} ج.م`),S("statFinancialCompletionRate",`${d.overallCompletionRate}%`);const y=j.filter(l=>{const f=l.paymentDate||l.createdAt||l.date;return f&&String(f).startsWith(a)}).reduce((l,f)=>l+(parseFloat(f.amount)||0),0);S("statTodayRevenue",`${y.toLocaleString("ar-EG")} ج.م`),S("statNetProfitExecutive",`${d.netProfit.toLocaleString("ar-EG")} ج.م`);let m=null;if(d.teachersBreakdown&&d.teachersBreakdown.length>0&&(m=[...d.teachersBreakdown].sort((l,f)=>(f.executedHours||0)-(l.executedHours||0))[0]),m&&m.executedHours>0){const l=document.getElementById("statTopTeacherName"),f=document.getElementById("statTopTeacherDetails");l&&(l.textContent=m.teacher.name||"معلم"),f&&(f.textContent=`${m.executedHours.toFixed(1)} ساعة منجزة (${m.executedSessionsCount} حصة)`)}else{const l=document.getElementById("statTopTeacherName"),f=document.getElementById("statTopTeacherDetails");l&&(l.textContent=((N=e[0])==null?void 0:N.name)||"لا يوجد نشاط مسجل"),f&&(f.textContent="بانتظار تسجيل الحصص")}const b={};k.forEach(l=>{l.date&&l.date.startsWith(w)&&l.status==="completed"&&l.studentId&&(b[l.studentId]=(b[l.studentId]||0)+1)});let v=null,x=0;for(const[l,f]of Object.entries(b))f>x&&(x=f,v=l);const g=$.find(l=>l.id===v),c=document.getElementById("statTopStudentName"),h=document.getElementById("statTopStudentDetails");g&&x>0?(c&&(c.textContent=g.name),h&&(h.textContent=`${x} حصة مكتملة هذا الشهر 🌟`)):(c&&(c.textContent=((M=$[0])==null?void 0:M.name)||"لا يوجد نشاط مسجل"),h&&(h.textContent="بانتظار اعتماد الحصص"));const p=document.getElementById("statFinancialScheduledHours");p&&(p.textContent=`إجمالي الجداول: ${d.totalScheduledHours.toFixed(1)} س (${d.totalScheduledSessions} حصة)`);const L=document.getElementById("statFinancialExecutedHours");L&&(L.textContent=`منفذ حتى الآن: ${d.totalExecutedHours.toFixed(1)} س (${d.totalExecutedSessions} حصة)`);const C=document.getElementById("statFinancialNetProfitFooter");C&&(C.textContent=`صافي الربح المتوقع: ${d.netProfit.toLocaleString("ar-EG")} ج.م`);const B=document.getElementById("badgeFinancialMonth");if(B){const[l,f]=w.split("-"),T=new Date(parseInt(l),parseInt(f)-1,1);B.textContent=T.toLocaleDateString("ar-EG",{month:"short",year:"numeric"})}ze({studentAnalysis:r,pendingTeachers:n,financialOverview:d,todaySessions:s}),Fe(s),ge(r.classifiedList),Ne(d.teachersBreakdown),He(),window.lucide&&window.lucide.createIcons()}function pe(){let e=0,n=0,a=0,s=0,i=0,o=0,r=0;const d=$.map(t=>{const y=J.find(g=>g.id===t.activePackageId||g.studentId===t.id&&g.status==="active")||J.filter(g=>g.studentId===t.id).sort((g,c)=>{var h,p;return(((h=c.createdAt)==null?void 0:h.seconds)||0)-(((p=g.createdAt)==null?void 0:p.seconds)||0)})[0],m=ce.find(g=>g.id===t.id||g.studentId===t.id);let b=0;m&&m.balance!==void 0?b=parseInt(m.balance)||0:y&&y.remainingLessons!==void 0?b=parseInt(y.remainingLessons)||0:t.remainingLessons!==void 0&&(b=parseInt(t.remainingLessons)||0);let v="active";b<0?(v="negative_balance",s++,a++):b===0?(v="needs_renewal",i++,a++):b===1?(v="low_balance",o++,a++,e++):(v="active",r++,e++),(t.status==="inactive"||t.status==="paused"||t.status==="stopped")&&n++;const x=z.find(g=>g.uid===t.teacherId||g.id===t.teacherId);return{id:t.id,name:t.name||"طالب",phone:t.phone||t.parentPhone||"",teacherName:x?x.name:t.teacherName||"غير مسند",packageName:y?y.packageName||"باقة حفظ وتجويد":t.packageName||"باقة قياسية",remainingLessons:b,statusCategory:v,rawStudent:t}});return document.getElementById("countTabAll").textContent=String(d.length),document.getElementById("countTabNegative").textContent=String(s),document.getElementById("countTabZero").textContent=String(i),document.getElementById("countTabLow").textContent=String(o),document.getElementById("countTabActive").textContent=String(r),{activeCount:e,inactiveCount:n,renewalNeededCount:a,classifiedList:d}}function Me(e,n){let a=0;j.forEach(c=>{const h=c.month||(c.paymentDate?String(c.paymentDate).substring(0,7):"");(h===e||!h&&c.createdAt&&new Date(c.createdAt.seconds*1e3).toISOString().substring(0,7)===e)&&(a+=parseFloat(c.amount)||0)});let s=0;ue.forEach(c=>{(c.month||(c.date?String(c.date).substring(0,7):""))===e&&(s+=parseFloat(c.amount)||0)});let i=0,o=0,r=0,d=0,t=0,y=0;const m=n.map(c=>{const h=c.uid||c.id,p=$.filter(u=>u.teacherId===h||u.teacherUid===h||u.teacherId===c.id),L=le.filter(u=>u.teacherId===h||u.teacherUid===h||u.teacherId===c.id),C=Se(c,p,L,e,k),B=C.expectedTotalHours||0,N=C.expectedSessionsCount||0,M=C.expectedSalary||0,l=C.rateInd,f=C.rateGrp;let T=0,H=0,U=0;const Q=new Set;k.forEach(u=>{if(!u.date||!u.date.startsWith(e)||!(u.teacherId===h||u.teacherUid===h||u.teacherName&&c.name&&u.teacherName.trim().toLowerCase()===c.name.trim().toLowerCase())||u.isStudentRecordOnly===!0||u.isSalaryRecord===!1)return;const Y=u.groupSessionId||u.groupBatchId,V=u.type==="group"||u.sessionType==="group";if(V&&Y){if(Q.has(Y))return;Q.add(Y)}if(u.archived===!0||u.paid===!0||u.type==="trial"&&(u.approved!==!0||u.trialSubscribed!==!0))return;const he=u.status==="completed",fe=u.status==="student_absent"&&u.absenceType==="unexcused";if(u.approved===!0&&(he||fe)){T++;const X=(parseInt(u.duration)||0)/60;H+=X,U+=X*(V?f:l)}});let W=0;return B>0?W=Math.min(100,Math.round(H/B*100)):H>0&&(W=100),i+=M,o+=U,r+=B,d+=H,t+=N,y+=T,{teacher:c,scheduledHours:B,scheduledSessionsCount:N,scheduledIndHours:C.expectedIndHours,scheduledGrpHours:C.expectedGrpHours,expectedSalary:M,executedHours:H,executedSessionsCount:T,currentDueSalary:U,completionRate:W,rateIndividual:l,rateGroup:f,status:U>0?"مستحق الدفع":M>0?"مجدول بالكامل":"لا توجد مستحقات"}}),b=r>0?Math.min(100,Math.round(d/r*100)):d>0?100:0,v=a-i-s,x=a-o-s,g=a>0?v/a*100:0;return{revenue:a,expectedSalaries:i,currentDueSalaries:o,totalScheduledHours:r,totalExecutedHours:d,totalScheduledSessions:t,totalExecutedSessions:y,overallCompletionRate:b,expenses:s,netProfit:v,netProfitRealized:x,profitMargin:g,teachersBreakdown:m}}function ze({studentAnalysis:e,pendingTeachers:n,financialOverview:a,todaySessions:s}){const i=document.getElementById("smartAlertsContainer");if(!i)return;const o=[],r=e.classifiedList.filter(t=>t.statusCategory==="negative_balance");r.length>0&&o.push(`
          <div class="alert-banner danger">
            <div class="alert-banner-content">
              <i data-lucide="alert-triangle" style="color: var(--danger); width: 18px; height: 18px;"></i>
              <span>يوجد <strong>${r.length} طلاب</strong> عليهم دين حصص (رصيد سالب) واستهلاك بدون تجديد.</span>
            </div>
            <a href="payments.html" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.3rem 0.6rem; color: var(--danger); border-color: var(--danger);">
              تسوية وتجديد الاشتراكات
            </a>
          </div>
        `);const d=e.classifiedList.filter(t=>t.statusCategory==="needs_renewal");d.length>0&&o.push(`
          <div class="alert-banner warning">
            <div class="alert-banner-content">
              <i data-lucide="bell" style="color: var(--warning); width: 18px; height: 18px;"></i>
              <span>يوجد <strong>${d.length} طلاب</strong> رصيدهم 0 حصص والاشتراك يستحق الدفع والتجديد الآن.</span>
            </div>
            <a href="students.html" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.3rem 0.6rem; color: var(--warning); border-color: var(--warning);">
              متابعة الطلاب
            </a>
          </div>
        `),n.length>0&&o.push(`
          <div class="alert-banner info">
            <div class="alert-banner-content">
              <i data-lucide="user-plus" style="color: var(--primary-color); width: 18px; height: 18px;"></i>
              <span>يوجد <strong>${n.length} طلبات انضمام لمعلمين</strong> بانتظار المراجعة والاعتماد وتحديد أجر الساعة.</span>
            </div>
            <a href="teachers.html" class="btn btn-primary" style="font-size: 0.78rem; padding: 0.3rem 0.6rem;">
              مراجعة طلبات المعلمين
            </a>
          </div>
        `),(a.expectedSalaries>0||a.currentDueSalaries>0)&&o.push(`
          <div class="alert-banner info">
            <div class="alert-banner-content">
              <i data-lucide="wallet" style="color: var(--primary-color); width: 18px; height: 18px;"></i>
              <span>
                الراتب المتوقع للشهر (حسب الجداول): <strong>${a.expectedSalaries.toLocaleString("ar-EG")} ج.م</strong>
                &nbsp;|&nbsp;
                المستحق الحالي (المنفذ فعلياً): <strong>${a.currentDueSalaries.toLocaleString("ar-EG")} ج.م</strong>
                &nbsp;|&nbsp;
                نسبة الإنجاز: <strong>${a.overallCompletionRate}%</strong>
              </span>
            </div>
            <a href="earnings.html" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.3rem 0.6rem;">
              عرض كشف الأرباح والرواتب
            </a>
          </div>
        `),i.innerHTML=o.join("")}function Fe(e){const n=document.getElementById("todaySessionsTableBody");if(!n)return;let a=0,s=0,i=0,o=0;if(e.forEach(r=>{r.status==="completed"?a++:r.status==="student_absent"&&r.absenceType==="excused"?s++:r.status==="student_absent"&&r.absenceType==="unexcused"?i++:(r.status==="delayed"||r.status==="cancelled"||r.status==="postponed")&&o++}),document.getElementById("dailyStatTotal").textContent=String(e.length),document.getElementById("dailyStatCompleted").textContent=String(a),document.getElementById("dailyStatExcused").textContent=String(s),document.getElementById("dailyStatUnexcused").textContent=String(i),document.getElementById("dailyStatDelayed").textContent=String(o),e.length===0){n.innerHTML='<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">لا توجد حصص مسجلة لليوم الحالي حتى الآن.</td></tr>';return}n.innerHTML=e.slice(0,6).map(r=>{let d='<span class="status-badge active">مكتملة</span>';r.status==="student_absent"?d=r.absenceType==="unexcused"?'<span class="status-badge needs_renewal">غياب بدون عذر</span>':'<span class="status-badge low_balance">غياب بعذر</span>':r.status==="delayed"||r.status==="postponed"?d='<span class="status-badge low_balance">مؤجلة</span>':r.status==="cancelled"&&(d='<span class="status-badge needs_renewal">ملغاة</span>');const t=r.approved?'<span style="color: var(--success); font-size: 0.78rem; font-weight: 700;">معتمدة</span>':'<span style="color: var(--warning); font-size: 0.78rem; font-weight: 700;">قيد المراجعة</span>',y=r.type==="group"?"جماعية":r.type==="trial"?"تجريبية":"فردية";return`
          <tr>
            <td><strong>${r.teacherName||"معلم"}</strong></td>
            <td><strong>${r.studentName||"طالب"}</strong></td>
            <td>${r.date} ${r.startTime?`(${r.startTime})`:""}</td>
            <td>${r.duration||60} دقيقة (${y})</td>
            <td>${d}</td>
            <td>${t}</td>
          </tr>
        `}).join("")}function ge(e){const n=document.getElementById("studentFollowUpTableBody");if(!n)return;let a=e;if(G==="negative"?a=e.filter(s=>s.statusCategory==="negative_balance"):G==="zero"?a=e.filter(s=>s.statusCategory==="needs_renewal"):G==="low"?a=e.filter(s=>s.statusCategory==="low_balance"):G==="active"&&(a=e.filter(s=>s.statusCategory==="active")),a.length===0){n.innerHTML='<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">لا توجد سجلات تطابق الفلتر المحدد.</td></tr>';return}n.innerHTML=a.slice(0,10).map(s=>{let i='<span class="status-badge active">نشط</span>';s.statusCategory==="negative_balance"?i='<span class="status-badge negative_balance">دين حصص</span>':s.statusCategory==="needs_renewal"?i='<span class="status-badge needs_renewal">يستحق الدفع</span>':s.statusCategory==="low_balance"&&(i='<span class="status-badge low_balance">قارب على الانتهاء</span>');let o="font-weight: 700;";return s.remainingLessons<0?o="color: var(--danger); font-weight: 800; font-family: monospace;":s.remainingLessons===0?o="color: #ea580c; font-weight: 700;":s.remainingLessons===1?o="color: #d97706; font-weight: 700;":o="color: var(--success); font-weight: 700;",`
          <tr>
            <td>
              <strong>${s.name}</strong>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${s.phone}</div>
            </td>
            <td>${s.teacherName}</td>
            <td><span style="font-size: 0.8rem; background: var(--bg-primary); padding: 0.2rem 0.4rem; border-radius: 4px; border: 1px solid var(--border-color);">${s.packageName}</span></td>
            <td><span style="${o}">${s.remainingLessons} حصة</span></td>
            <td>${i}</td>
            <td>
              <div style="display: flex; gap: 0.35rem;">
                <a href="students.html?id=${s.id}" class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                  عرض الطالب
                </a>
                <a href="payments.html?studentId=${s.id}" class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                  تجديد الاشتراك
                </a>
              </div>
            </td>
          </tr>
        `}).join("")}function Ne(e){const n=document.getElementById("teachersPayrollTableBody");if(n){if(!e||e.length===0){n.innerHTML='<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">لا توجد بيانات مسجلة للمعلمين لهذه الفترة.</td></tr>';return}n.innerHTML=e.map(a=>{const s=a.completionRate||0;let i="#0f766e",o="var(--primary-color)";s>=80?(i="#10b981",o="var(--success)"):s>=40?(i="#f59e0b",o="var(--warning)"):s>0?(i="#3b82f6",o="#2563eb"):(i="#94a3b8",o="var(--text-muted)");const r=a.teacher.uid||a.teacher.id;return`
          <tr>
            <td>
              <div style="font-weight: 700; color: var(--text-primary); font-size: 0.9rem;">${a.teacher.name||"معلم"}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${a.teacher.phone||a.teacher.email||""}</div>
              <div style="font-size: 0.7rem; color: var(--primary-color); font-weight: 600; margin-top: 0.15rem;">
                ${a.teacher.subject||"القرآن الكريم والتجويد"}
              </div>
            </td>
            <td>
              <div><strong>${a.scheduledHours.toFixed(1)} ساعة</strong></div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">
                ${a.scheduledSessionsCount} حصة (${a.scheduledIndHours.toFixed(1)} س فردي | ${a.scheduledGrpHours.toFixed(1)} س جماعي)
              </div>
            </td>
            <td>
              <div><strong style="color: var(--text-primary);">${a.executedHours.toFixed(1)} ساعة</strong></div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${a.executedSessionsCount} حصة معتمدة</div>
            </td>
            <td style="min-width: 130px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; font-weight: 700; margin-bottom: 0.25rem;">
                <span style="color: ${o};">${s}%</span>
                <span style="color: var(--text-muted); font-size: 0.7rem;">${a.executedHours.toFixed(1)} / ${a.scheduledHours.toFixed(1)} س</span>
              </div>
              <div style="height: 6px; width: 100%; background: var(--border-color); border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; width: ${Math.min(100,s)}%; background: ${i}; border-radius: 3px; transition: width 0.4s ease;"></div>
              </div>
            </td>
            <td>
              <div style="font-size: 0.8rem; font-weight: 600;">
                <span>${a.rateIndividual} ج.م <small style="color: var(--text-muted);">فردي</small></span>
                <br>
                <span>${a.rateGroup} ج.م <small style="color: var(--text-muted);">جماعي</small></span>
              </div>
            </td>
            <td>
              <strong style="color: #0f766e; font-size: 0.95rem; font-family: monospace;">
                ${a.currentDueSalary.toLocaleString("ar-EG")} ج.م
              </strong>
              <div style="font-size: 0.7rem; color: var(--text-muted);">حسب المنفذ فعلياً</div>
            </td>
            <td>
              <div style="background: rgba(14, 165, 233, 0.08); padding: 0.3rem 0.55rem; border-radius: 6px; border: 1px solid rgba(14, 165, 233, 0.2); display: inline-block;">
                <strong style="color: var(--primary-color); font-size: 0.95rem; font-family: monospace;">
                  ${a.expectedSalary.toLocaleString("ar-EG")} ج.م
                </strong>
                <div style="font-size: 0.68rem; color: var(--text-muted);">لو نُفّذ كامل الجدول</div>
              </div>
            </td>
            <td>
              <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                <a href="earnings.html?teacherId=${r}" class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" title="كشف الراتب">
                  <i data-lucide="wallet" style="width: 12px; height: 12px;"></i> كشف الراتب
                </a>
                <a href="teacher-schedules.html?teacherId=${r}" class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: var(--primary-color); border-color: rgba(14, 165, 233, 0.3);" title="عرض الجدول">
                  <i data-lucide="calendar" style="width: 12px; height: 12px;"></i> الجدول
                </a>
              </div>
            </td>
          </tr>
        `}).join("")}}function He(){const e=[],n=[],a=[],s=[],i=[],o=new Date;for(let m=5;m>=0;m--){const b=new Date(o.getFullYear(),o.getMonth()-m,1),v=`${b.getFullYear()}-${String(b.getMonth()+1).padStart(2,"0")}`,x=b.toLocaleDateString("ar-EG",{month:"short"});e.push(x);let g=0;j.forEach(p=>{(p.month||(p.paymentDate?String(p.paymentDate).substring(0,7):""))===v&&(g+=parseFloat(p.amount)||0)}),n.push(g);let c=0;k.forEach(p=>{p.date&&p.date.startsWith(v)&&c++}),a.push(c);let h=0;k.forEach(p=>{if(p.date&&p.date.startsWith(v)&&p.approved&&(p.status==="completed"||p.status==="student_absent"&&p.absenceType==="unexcused")){const L=parseInt(p.duration)||60;h+=L/60*100}}),s.push(h),i.push(g-h)}const r=document.getElementById("chartRevenue6Months");r&&window.Chart&&(R?(R.data.labels=e,R.data.datasets[0].data=n,R.update("none")):R=new Chart(r,{type:"line",data:{labels:e,datasets:[{label:"إجمالي الدخل (ج.م)",data:n,borderColor:"#0f766e",backgroundColor:"rgba(15, 118, 110, 0.1)",fill:!0,tension:.3,borderWidth:2}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{y:{beginAtZero:!0}}}}));const d=document.getElementById("chartFinancialBalance");d&&window.Chart&&(D?(D.data.labels=e,D.data.datasets[0].data=n,D.data.datasets[1].data=s,D.data.datasets[2].data=i,D.update("none")):D=new Chart(d,{type:"bar",data:{labels:e,datasets:[{label:"الدخل",data:n,backgroundColor:"#0f766e",borderRadius:4},{label:"المرتبات",data:s,backgroundColor:"#f59e0b",borderRadius:4},{label:"صافي الربح",data:i,backgroundColor:"#10b981",borderRadius:4}]},options:{responsive:!0,maintainAspectRatio:!1,scales:{y:{beginAtZero:!0}}}}));const t=document.getElementById("chartSessionsMonthly");t&&window.Chart&&(A?(A.data.labels=e,A.data.datasets[0].data=a,A.update("none")):A=new Chart(t,{type:"bar",data:{labels:e,datasets:[{label:"عدد الحصص",data:a,backgroundColor:"rgba(245, 158, 11, 0.85)",borderRadius:4}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{y:{beginAtZero:!0}}}}));const y=document.getElementById("chartStudentsGrowth");if(y&&window.Chart){const m=e.map((b,v)=>Math.max(1,Math.round($.length/6*(v+1))));_?(_.data.labels=e,_.data.datasets[0].data=m,_.update("none")):_=new Chart(y,{type:"line",data:{labels:e,datasets:[{label:"إجمالي الطلاب المسجلين",data:m,borderColor:"#8b5cf6",backgroundColor:"rgba(139, 92, 246, 0.1)",fill:!0,tension:.3,borderWidth:2}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{y:{beginAtZero:!0}}}})}}function Re(){const e=document.getElementById("universalSearchInput"),n=document.getElementById("searchResultsDropdown");!e||!n||(window.addEventListener("keydown",a=>{(a.ctrlKey||a.metaKey)&&a.key==="k"&&(a.preventDefault(),e.focus())}),e.addEventListener("input",a=>{const s=a.target.value.trim().toLowerCase();if(!s){n.style.display="none",n.innerHTML="";return}const i=$.filter(t=>t.name&&t.name.toLowerCase().includes(s)||t.phone&&t.phone.includes(s)||t.parentPhone&&t.parentPhone.includes(s)||t.id&&t.id.toLowerCase().includes(s)).slice(0,4),o=z.filter(t=>t.name&&t.name.toLowerCase().includes(s)||t.phone&&t.phone.includes(s)||t.email&&t.email.toLowerCase().includes(s)).slice(0,4),r=j.filter(t=>t.studentName&&t.studentName.toLowerCase().includes(s)||t.receiptNo&&t.receiptNo.toLowerCase().includes(s)||t.id&&t.id.toLowerCase().includes(s)).slice(0,3);if(i.length===0&&o.length===0&&r.length===0){n.innerHTML='<div style="padding: 0.75rem; text-align: center; color: var(--text-muted); font-size: 0.8rem;">لا توجد نتائج مطابقة لبحثك</div>',n.style.display="block";return}let d="";i.length>0&&(d+='<div class="search-result-category">الطلاب والدارسون</div>',i.forEach(t=>{d+=`
              <a href="students.html?id=${t.id}" class="search-result-item">
                <div>
                  <strong style="font-size: 0.85rem;">${t.name}</strong>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">${t.phone||t.parentPhone||""}</div>
                </div>
                <span class="badge badge-primary" style="font-size: 0.7rem;">طالب</span>
              </a>
            `})),o.length>0&&(d+='<div class="search-result-category">المعلمون والمشرفون</div>',o.forEach(t=>{d+=`
              <a href="teacher-details.html?id=${t.uid}" class="search-result-item">
                <div>
                  <strong style="font-size: 0.85rem;">${t.name}</strong>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">${t.phone||t.email||""}</div>
                </div>
                <span class="badge badge-success" style="font-size: 0.7rem;">معلم</span>
              </a>
            `})),r.length>0&&(d+='<div class="search-result-category">المدفوعات والإيصالات</div>',r.forEach(t=>{d+=`
              <a href="payments.html?search=${t.receiptNo||t.id}" class="search-result-item">
                <div>
                  <strong style="font-size: 0.85rem;">${t.studentName||"دفعة مالية"}</strong>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">إيصال #${t.receiptNo||t.id.substring(0,8)} • ${t.amount} ج.م</div>
                </div>
                <span class="badge badge-secondary" style="font-size: 0.7rem;">إيصال</span>
              </a>
            `})),n.innerHTML=d,n.style.display="block"}),document.addEventListener("click",a=>{!e.contains(a.target)&&!n.contains(a.target)&&(n.style.display="none")}))}function Ae(){const e=document.querySelectorAll("#studentStatusFilterTabs .filter-tab-btn");e.forEach(n=>{n.addEventListener("click",()=>{e.forEach(s=>s.classList.remove("active")),n.classList.add("active"),G=n.dataset.filter;const a=pe();ge(a.classifiedList)})})}const F=document.getElementById("zeroSessionsModal"),te=document.getElementById("cardZeroSessionsTeachers");te&&F&&te.addEventListener("click",()=>{const e=document.getElementById("zeroSessionsTeachersContainer");O.length===0?e.innerHTML='<p style="text-align: center; color: var(--text-muted); padding: 1rem;">جميع المعلمين المعتمدين قاموا بتسجيل حصص اليوم بالفعل.</p>':e.innerHTML=O.map(n=>`
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem; border-bottom: 1px solid var(--border-color); background: var(--bg-primary); border-radius: 6px;">
              <div>
                <strong style="font-size: 0.88rem; color: var(--text-primary);">${n.name}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${n.email||""} • ${n.phone||""}</div>
              </div>
              <a href="teacher-details.html?id=${n.uid}" class="btn btn-secondary" style="font-size: 0.72rem; padding: 0.25rem 0.5rem;">
                عرض المعلم
              </a>
            </div>
          `).join(""),F.style.display="flex"});var ae;(ae=document.getElementById("closeZeroSessionsModalBtn"))==null||ae.addEventListener("click",()=>{F&&(F.style.display="none")});var ne;(ne=document.getElementById("closeZeroSessionsModalBtn2"))==null||ne.addEventListener("click",()=>{F&&(F.style.display="none")});var se;(se=document.getElementById("cardStudentsNeedRenewal"))==null||se.addEventListener("click",()=>{var n;const e=document.querySelector('#studentStatusFilterTabs button[data-filter="zero"]');e&&e.click(),(n=document.getElementById("studentFollowUpTableBody"))==null||n.scrollIntoView({behavior:"smooth"})});var re;(re=document.getElementById("exportBackupQuickBtn"))==null||re.addEventListener("click",Be);
