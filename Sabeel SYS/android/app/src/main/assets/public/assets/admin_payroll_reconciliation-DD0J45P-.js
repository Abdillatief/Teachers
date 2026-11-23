import{d as N,j as $t,T as R,s as mt,a as dt}from"./rbacService-D2RrsA9d.js";import{p as Ct}from"./authService-CtWWGArP.js";import{i as Lt,r as Tt,a as Mt}from"./navbar-Bz3pjZSE.js";import{getDocs as W,collection as O,addDoc as Bt,serverTimestamp as St,writeBatch as It,doc as Nt,query as Rt,orderBy as Dt,onSnapshot as _t}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./activityLogger-BK9d5021.js";const I={NOT_APPROVED:{code:"NOT_APPROVED",title:"حصة بانتظار الاعتماد",desc:"الحصة مسجلة لكنها لم تعتمد بعد من قبل الإدارة المالية",severity:"warning",color:"#f59e0b",icon:"clock"},STATUS_CANCELLED:{code:"STATUS_CANCELLED",title:"حصة ملغاة",desc:"تم إلغاء الحصة بناءً على طلب الطالب أو المعلم",severity:"info",color:"#6b7280",icon:"x-circle"},STATUS_DELAYED:{code:"STATUS_DELAYED",title:"حصة مؤجلة",desc:"تم تأجيل الحصة إلى موعد لاحق",severity:"info",color:"#8b5cf6",icon:"calendar-clock"},STATUS_EXCUSED_ABSENCE:{code:"STATUS_EXCUSED_ABSENCE",title:"غياب دارس بعذر مسبق",desc:"تغيب الدارس بإذن مسبق مقبول (غير مستحقة للأجر وفقاً للائحة)",severity:"info",color:"#3b82f6",icon:"user-x"},STATUS_TEACHER_ABSENT:{code:"STATUS_TEACHER_ABSENT",title:"غياب المعلم",desc:"تغيب المعلم عن الحصة، لذلك لا يتم احتساب أي مقابل مالي",severity:"danger",color:"#ef4444",icon:"alert-triangle"},UNAPPROVED_TRIAL:{code:"UNAPPROVED_TRIAL",title:"حصة تجريبية غير معتمدة",desc:"حصة تجريبية لم يشترك الطالب بعدها أو لم تعتمدها الإدارة بعد",severity:"warning",color:"#d97706",icon:"flask-conical"},GROUP_STUDENT_DUPLICATE:{code:"GROUP_STUDENT_DUPLICATE",title:"سجل حضور طلابي مكرر بالمجموعة",desc:"الحصة الجماعية احتُسبت للمعلم مسبقاً، وهذا السجل إحصائي لحضور الدارس فقط",severity:"info",color:"#9ca3af",icon:"copy"},ALREADY_PAID_OR_ARCHIVED:{code:"ALREADY_PAID_OR_ARCHIVED",title:"مؤرشفة أو مدفوعة مسبقاً",desc:"الحصة تم صرفها أو أرشفتها رسمياً في دورة مالية سابقة",severity:"info",color:"#64748b",icon:"archive"},STUDENT_RECORD_ONLY:{code:"STUDENT_RECORD_ONLY",title:"سجل إحصائي للدارس فقط",desc:"سجل حضور خاص بملف الطالب ولا يرتبط باحتساب أجر المعلم",severity:"info",color:"#9ca3af",icon:"file-text"}};async function kt(){const[t,a,e,n,o]=await Promise.all([W(O(N,"users")),W(O(N,"sessions")),W(O(N,"groups")),W(O(N,"students")),W(O(N,"salaryArchive"))]),r=[];t.forEach(u=>{const g=u.data();(g.role==="teacher"||g.role==="supervisor")&&r.push({id:u.id,uid:u.id,...g})});const i=[];a.forEach(u=>{i.push({id:u.id,...u.data()})});const c=[];e.forEach(u=>{c.push({id:u.id,...u.data()})});const l=[];n.forEach(u=>{l.push({id:u.id,...u.data()})});const m=[];return o.forEach(u=>{m.push({id:u.id,...u.data()})}),{teachers:r,sessions:i,groups:c,students:l,salaryArchive:m}}function zt(t,a,e,n,o){const r=t.id||t.uid,i=o||new Date().toISOString().substring(0,7),c=parseFloat(t.hourlyRateIndividual||t.hourlyRate||100),l=parseFloat(t.hourlyRateGroup||t.hourlyRateIndividual||t.hourlyRate||120),m=parseFloat(t.salaryBonuses||0),u=parseFloat(t.salaryDeductions||0),p=(a||[]).filter(s=>s.teacherId===r||s.teacherUid===r||s.teacherName&&t.name&&s.teacherName.trim().toLowerCase()===t.name.trim().toLowerCase()||s.teacherEmail&&t.email&&s.teacherEmail.trim().toLowerCase()===t.email.trim().toLowerCase()).filter(s=>s.date&&s.date.startsWith(i)),y=[],f=[],A=new Set;let L=0,z=0,P=0,U=0,S=0;p.forEach(s=>{const v=parseInt(s.duration)||0;L+=v;const k=s.type==="group"||s.sessionType==="group",it=s.groupSessionId||s.groupBatchId;if(s.isStudentRecordOnly===!0||s.isSalaryRecord===!1){f.push({session:s,reason:I.STUDENT_RECORD_ONLY,estimatedLostValue:v/60*(k?l:c)});return}if(k&&it){if(A.has(it)){f.push({session:s,reason:I.GROUP_STUDENT_DUPLICATE,estimatedLostValue:0});return}A.add(it)}if(s.archived===!0||s.paid===!0){f.push({session:s,reason:I.ALREADY_PAID_OR_ARCHIVED,estimatedLostValue:v/60*(k?l:c)});return}if((s.type==="trial"||s.sessionType==="trial"||s.isTrial===!0)&&(s.approved!==!0||s.trialSubscribed!==!0)){f.push({session:s,reason:I.UNAPPROVED_TRIAL,estimatedLostValue:v/60*c});return}if(s.approved!==!0){f.push({session:s,reason:I.NOT_APPROVED,estimatedLostValue:v/60*(k?l:c)});return}const gt=s.status==="completed",At=s.status==="student_absent"&&s.absenceType==="unexcused";if(!gt&&!At){let et=I.STATUS_CANCELLED;s.status==="delayed"?et=I.STATUS_DELAYED:s.status==="student_absent"&&s.absenceType==="excused"?et=I.STATUS_EXCUSED_ABSENCE:s.status==="teacher_absent"&&(et=I.STATUS_TEACHER_ABSENT),f.push({session:s,reason:et,estimatedLostValue:v/60*(k?l:c)});return}const ft=v/60,ht=k?l:c,tt=ft*ht;z+=v,P+=tt,k?S+=tt:U+=tt,y.push({session:s,hours:ft,rate:ht,cost:tt,isGroup:k,statusLabel:gt?"حاضر ومكتمل":"غياب طالب غير مبرر"})});const D=Math.max(0,P+m-u),w=(n||[]).filter(s=>s.teacherId===r||s.requestedByTeacherId===r),_=(e||[]).filter(s=>s.teacherId===r),$=$t(t,w,_,i,p),T=$.expectedSalary||0,M=$.expectedTotalHours||0,d=$.expectedSessionsCount||0,b=Math.round(D-T),x=p.length,E=y.length,B=f.length,V=L/60,G=z/60,J=parseFloat((G-M).toFixed(1)),h={};let Q=0;f.forEach(s=>{const v=s.reason.code;h[v]||(h[v]={reason:s.reason,count:0,totalLostValue:0,sessions:[]}),h[v].count++,h[v].totalLostValue+=s.estimatedLostValue,h[v].sessions.push(s),Q+=s.estimatedLostValue});let H="balanced",j="متطابق ومكتمل 100%",q="var(--success)",Y="badge-success",Z="جميع الحصص مسجلة ومعتمدة وتتطابق مع القواعد المالية دون أي فروقات غير مبررة.";const yt=h.NOT_APPROVED?h.NOT_APPROVED.count:0;return h.UNAPPROVED_TRIAL&&h.UNAPPROVED_TRIAL.count,yt>0?(H="acceptable_discrepancy",j="فروقات مفسرة (حصص معلقة)",q="var(--warning)",Y="badge-warning",Z=`يوجد ${yt} حصة بانتظار اعتماد الإدارة بقيمة متوقعة (${h.NOT_APPROVED.totalLostValue.toFixed(0)} ج.م).`):Math.abs(b)>200&&B===0?(H="critical_discrepancy",j="يتطلب تدقيق ومراجعة 🔴",q="var(--danger)",Y="badge-danger",Z=`يوجد فرق مالي غير مفسر (${b>0?"+":""}${b} ج.م) بين الحصص المنجزة وجدول الطلاب المتوقع دون وجود حصص مستبعدة تفسره.`):(B>0||Math.abs(b)>0)&&(H="acceptable_discrepancy",j="فروقات مفسرة ومقبولة",q="var(--warning)",Y="badge-warning",Z=`الفروقات ناتجة عن ${B} حصة مستبعدة (إلغاءات/غياب/أرشفة) وتعديلات حوافز (${m} ج.م) وخصومات (${u} ج.م).`),{teacherId:r,teacherName:t.name||"معلم",teacherEmail:t.email||"",month:i,rateInd:c,rateGrp:l,bonuses:m,deductions:u,totalRecordedSessions:x,totalRecordedHours:V,includedSessionsCount:E,includedHours:G,includedSessions:y,excludedSessionsCount:B,excludedSessions:f,exclusionsSummary:h,totalExcludedValue:Q,rawCalculatedSalary:P,individualCalculatedSalary:U,groupCalculatedSalary:S,netCalculatedSalary:Math.round(D),expectedSalary:Math.round(T),expectedHours:M,expectedSessionsCount:d,discrepancyAmount:b,discrepancyHours:J,integrityStatus:H,integrityLabel:j,integrityColor:q,integrityBadgeClass:Y,integrityExplanation:Z}}function nt(t){if(!t)return 0;if(typeof t.toDate=="function")return t.toDate().getTime();if(typeof t.toMillis=="function")return t.toMillis();if(t.seconds)return t.seconds*1e3+(t.nanoseconds||0)/1e6;if(t instanceof Date)return t.getTime();const a=new Date(t).getTime();return isNaN(a)?0:a}function ot(t){if(!t)return"-";if(typeof t=="string"){const a=new Date(t);return isNaN(a.getTime())?t:a.toLocaleString("ar-EG",{dateStyle:"short",timeStyle:"short"})}return t.toDate&&typeof t.toDate=="function"?t.toDate().toLocaleString("ar-EG",{dateStyle:"short",timeStyle:"short"}):t.seconds?new Date(t.seconds*1e3).toLocaleString("ar-EG",{dateStyle:"short",timeStyle:"short"}):"-"}function Pt(t,a,e){const n=t.month,o=t.teacherId,r=e?parseFloat(e.hourlyRateIndividual||e.hourlyRate||100):100,i=e?parseFloat(e.hourlyRateGroup||e.hourlyRateIndividual||e.hourlyRate||120):120,c=(a||[]).filter(d=>{if(!(d.teacherId===o||d.teacherUid===o||e&&d.teacherName&&e.name&&d.teacherName.trim().toLowerCase()===e.name.trim().toLowerCase()))return!1;const x=d.salaryClaimId===t.id,E=d.date&&d.date.startsWith(n);return x||E}),l=nt(t.createdAt),m=new Set;let u=0,g=0,p=0;const y=[],f=[];c.forEach(d=>{if(d.isStudentRecordOnly===!0||d.isSalaryRecord===!1)return;const b=d.type==="group"||d.sessionType==="group",x=d.groupSessionId||d.groupBatchId;if(b&&x){if(m.has(x))return;m.add(x)}if(d.type==="trial"&&(d.approved!==!0||d.trialSubscribed!==!0)){f.push({session:d,reason:"حصة تجريبية لم تعتمد في الأرشيف"});return}const E=d.status==="completed",B=d.status==="student_absent"&&d.absenceType==="unexcused",V=d.approved===!0;if(V&&(E||B)){g++;const G=parseInt(d.duration)||0,J=G/60,h=b?i:r,Q=J*h;u+=G,p+=Q;const H=nt(d.createdAt||d.timestamp),j=nt(d.approvedAt),q=nt(d.updatedAt||d.lastModifiedAt),Y=l>0&&(H>l||j>l||q>l);y.push({session:d,hours:J,cost:Q,rate:h,isPostArchive:Y,createdMs:H,createdAtFormatted:ot(d.createdAt||d.timestamp),approvedAtFormatted:ot(d.approvedAt),recordedBy:d.createdBy||d.recordedBy||d.teacherName||"المعلم",approvedBy:d.approvedBy||(d.approved?"معتمدة":"غير معتمدة"),studentName:d.studentName||d.groupName||"دارس",date:d.date||"-",time:d.startTime||d.time||"-",duration:d.duration||60})}else f.push({session:d,reason:V?"الحالة غير مكتملة":"غير معتمدة"})});const A=parseFloat((u/60).toFixed(1)),L=Math.round(p),z=Math.round(parseFloat(t.amount||0)),P=parseFloat(t.totalHours||0),U=parseInt(t.sessionsCount||0),S=L-z,D=parseFloat((A-P).toFixed(1)),w=g-U;let _=y.filter(d=>d.isPostArchive);if(w>0&&_.length<w){const d=[...y].filter(E=>!E.isPostArchive).sort((E,B)=>{const V=E.createdMs||new Date(E.date).getTime()||0;return(B.createdMs||new Date(B.date).getTime()||0)-V}),b=w-_.length,x=d.slice(0,b);x.forEach(E=>{E.isPostArchive=!0}),_=[..._,...x]}let $="balanced",T="مطابق للأرشيف 100% 🟢",M="البيانات التاريخية لجلسات قاعدة البيانات تتطابق بالكامل مع المبلغ والمستند المؤرشف.";if(Math.abs(S)>10||Math.abs(w)>0)if(Math.abs(S)<=150&&t.notes&&(t.notes.includes("حافز")||t.notes.includes("خصم")||t.notes.includes("تعديل")))$="acceptable_discrepancy",T="فروقات مسواة بالأرشيف 🟡",M=`الفرق (${S>0?"+":""}${S} ج.م) يرجع إلى تسويات مسجلة بملاحظات الأرشيف.`;else if(w===0&&Math.abs(D)<.2&&S>0)$="acceptable_discrepancy",T="فروقات خصم/تسوية 🟡",M=`عدد الحصص (${U}) والساعات (${P} س) متطابق تماماً. الفارق (+${S} ج.م) يرجع لخصم إداري أو تسوية استقطاع تم تطبيقها عند تحويل الراتب في الأرشيف (${z} ج.م مقابل ${L} ج.م لإجمالي الجلسات).`;else if(w>0){const d=parseInt(n.split("-")[1],10),b=_.some(x=>x.session.isCarriedOver);$="acceptable_discrepancy",T=b?"مرحّلة للشهر الجديد بنجاح 🔄":"حصص مسجلة بعد الأرشفة (مرحّلة) 🔄",M=`يوجد ${w} حصة إضافية (${D>0?"+"+D:D} س) تم تسجيلها أو اعتمادها بعد تاريخ أرشفة الراتب (${ot(t.createdAt)}). وفق سياسة الأكاديمية بعدم ضياع أي حصة، تم ضمها وترحيلها تلقائياً لتضاف إلى راتب الشهر الجديد تحت ملاحظة "مرحّلة من شهر ${d}".`}else w<0?($="critical_discrepancy",T="جلسات معدلة/محذوفة 🔴",M=`عدد الجلسات الحالية أقل من الأرشيف بـ ${Math.abs(w)} حصة، مما يشير لحذف أو تعديل جلسات بعد الأرشفة.`):($="critical_discrepancy",T="عدم تطابق أرشيفي 🔴",M=`المبلغ المؤرشف (${z} ج.م) يختلف عن ناتج جلسات قاعدة البيانات (${L} ج.م) بفارق (${S>0?"+":""}${S} ج.م).`);return{archiveId:t.id,month:n,teacherId:o,teacherName:t.teacherName||(e==null?void 0:e.name)||"معلم",archivedAmount:z,archivedHours:P,archivedSessionsCount:U,archivedMethod:t.method||"غير محدد",archivedStatus:t.status||"completed",archivedAt:t.createdAt,archiveCreatedAtFormatted:ot(t.createdAt),adminName:t.adminName||"غير مسجل",notes:t.notes||"",recomputedSalary:L,recomputedHours:A,recomputedSessionsCount:g,amountDiff:S,hoursDiff:D,sessionsDiff:w,matchingSessionsCount:c.length,recomputedSessionsList:y,postArchiveSessions:_,excludedFromArchive:f,integrityStatus:$,integrityLabel:T,integrityExplanation:M}}async function Ht({teacherId:t,teacherName:a,month:e,status:n,calculatedSalary:o,targetSalary:r,discrepancyAmount:i,totalSessions:c,includedSessions:l,excludedSessions:m,adminName:u,adminId:g,notes:p=""}){try{return(await Bt(O(N,"payrollReconciliationLogs"),{teacherId:t||"all",teacherName:a||"فحص شامل لجميع المعلمين",month:e||new Date().toISOString().substring(0,7),status:n||"balanced",calculatedSalary:o||0,targetSalary:r||0,discrepancyAmount:i||0,totalSessions:c||0,includedSessions:l||0,excludedSessions:m||0,adminName:u||"مشرف الإدارة",adminId:g||"admin",notes:p||"",createdAt:St()})).id}catch(y){throw console.error("Error writing reconciliation log:",y),y}}async function Ot(t){if(!Array.isArray(t)||t.length===0)return 0;const a=It(N);return t.forEach(e=>{const n=Nt(N,"sessions",e);a.update(n,{approved:!0,approvedAt:St()})}),await a.commit(),t.length}let vt=null,F=[],wt=[],st=null,at="",ct="all",lt="",ut="all",pt="all",C=new Date().toISOString().substring(0,7);async function Ft(){Ut(),Vt(),Gt(),Zt(),Jt(),await X(),Yt()}function Ut(){const t=document.querySelectorAll(".recon-nav-btn");t.forEach(a=>{a.addEventListener("click",()=>{t.forEach(n=>n.classList.remove("active")),a.classList.add("active");const e=a.getAttribute("data-tab-target");document.querySelectorAll(".recon-tab-pane").forEach(n=>{n.style.display=n.id===e?"block":"none"}),e==="tab-archive-reconciliation"?K():e==="tab-audit-logs"||rt()})})}function Vt(){const t=document.getElementById("reconMonthSelect"),a=document.getElementById("btnPrevMonth"),e=document.getElementById("btnNextMonth"),n=document.getElementById("btnRefreshRecon");t&&(t.value=C,t.addEventListener("change",async o=>{C=o.target.value,await X()})),a&&a.addEventListener("click",async()=>{const o=new Date(C+"-01");o.setMonth(o.getMonth()-1),C=o.toISOString().substring(0,7),t&&(t.value=C),await X()}),e&&e.addEventListener("click",async()=>{const o=new Date(C+"-01");o.setMonth(o.getMonth()+1),C=o.toISOString().substring(0,7),t&&(t.value=C),await X()}),n&&n.addEventListener("click",async()=>{n.disabled=!0,n.innerHTML='<i data-lucide="loader-2" class="spin"></i> جاري الفحص...',window.lucide&&window.lucide.createIcons(),await X(),n.disabled=!1,n.innerHTML='<i data-lucide="refresh-cw"></i> تحديث وفحص مباشر',window.lucide&&window.lucide.createIcons()})}function Gt(){const t=document.getElementById("searchTeacherInput"),a=document.getElementById("filterIntegrityStatus");t&&t.addEventListener("input",r=>{at=r.target.value.trim().toLowerCase(),rt()}),a&&a.addEventListener("change",r=>{ct=r.target.value,rt()});const e=document.getElementById("searchArchiveTeacherInput"),n=document.getElementById("filterArchiveStatus"),o=document.getElementById("filterArchiveMonthSelect");e&&e.addEventListener("input",r=>{lt=r.target.value.trim().toLowerCase(),K()}),n&&n.addEventListener("change",r=>{ut=r.target.value,K()}),o&&o.addEventListener("change",r=>{pt=r.target.value,K()})}async function X(){const t=document.getElementById("reconLoadingState");t&&(t.style.display="flex");try{vt=await kt();const{teachers:a,sessions:e,groups:n,students:o,salaryArchive:r}=vt;F=a.map(i=>zt(i,e,n,o,C)),jt(r),wt=r.map(i=>{const c=a.find(l=>l.id===i.teacherId||l.uid===i.teacherId);return Pt(i,e,c)}),qt(),rt(),K()}catch(a){console.error("Error running reconciliation:",a),R.danger("حدث خطأ أثناء تحميل بيانات المطابقة: "+a.message)}finally{t&&(t.style.display="none")}}function jt(t){const a=document.getElementById("filterArchiveMonthSelect");if(!a)return;const e=Array.from(new Set(t.map(o=>o.month).filter(Boolean))).sort().reverse(),n=a.value;a.innerHTML=`<option value="all">جميع الشهور المؤرشفة (${e.length} دورة)</option>`+e.map(o=>`<option value="${o}">شهر (${o})</option>`).join(""),n&&e.includes(n)&&(a.value=n)}function qt(){const t=F.length;let a=0,e=0,n=0,o=0,r=0,i=0;F.forEach(y=>{y.integrityStatus==="balanced"?a++:y.integrityStatus==="acceptable_discrepancy"?e++:y.integrityStatus==="critical_discrepancy"&&n++,o+=Math.abs(y.discrepancyAmount),r+=y.totalRecordedSessions,i+=y.includedSessionsCount});const c=document.getElementById("kpiTotalTeachers"),l=document.getElementById("kpiBalancedCount"),m=document.getElementById("kpiAcceptableCount"),u=document.getElementById("kpiCriticalCount"),g=document.getElementById("kpiDiscrepancyVolume"),p=document.getElementById("kpiSessionsSummary");c&&(c.textContent=t),l&&(l.textContent=a),m&&(m.textContent=e),u&&(u.textContent=n),g&&(g.textContent=o.toLocaleString()+" ج.م"),p&&(p.textContent=`${i} معتمدة من إجمالي ${r}`),window.lucide&&window.lucide.createIcons()}function rt(){const t=document.getElementById("tblCurrentReconBody");if(!t)return;const a=F.filter(e=>{const n=!at||e.teacherName.toLowerCase().includes(at)||e.teacherEmail.toLowerCase().includes(at),o=ct==="all"||e.integrityStatus===ct;return n&&o});if(a.length===0){t.innerHTML=`
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          <i data-lucide="inbox" style="width: 32px; height: 32px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
          <div>لا توجد نتائج مطابقة لشروط البحث والتصفية المحددة.</div>
        </td>
      </tr>
    `,window.lucide&&window.lucide.createIcons();return}t.innerHTML=a.map((e,n)=>{const o=e.integrityStatus==="balanced",r=e.integrityStatus==="acceptable_discrepancy";e.integrityStatus;let i=o?"check-circle":r?"info":"alert-octagon",c=o?"rgba(34, 197, 94, 0.12)":r?"rgba(245, 158, 11, 0.12)":"rgba(239, 68, 68, 0.12)",l=o?"#15803d":r?"#b45309":"#b91c1c";const m=e.totalRecordedSessions>0?Math.round(e.includedSessionsCount/e.totalRecordedSessions*100):100,u=e.discrepancyAmount>0?"+":"",g=e.discrepancyAmount===0?"var(--text-secondary)":e.discrepancyAmount>0?"#16a34a":"#dc2626";return`
      <tr class="recon-row" data-teacher-id="${e.teacherId}">
        <td>
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary-light); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem;">
              ${e.teacherName.charAt(0)}
            </div>
            <div>
              <div style="font-weight: 800; color: var(--text-primary); font-size: 0.92rem;">${e.teacherName}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${e.rateInd} فردي / ${e.rateGrp} جماعي ج.م</div>
            </div>
          </div>
        </td>

        <td>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.88rem;">
            <span style="color: var(--success); font-weight: 800;">${e.includedSessionsCount}</span> / <span>${e.totalRecordedSessions}</span> حصة
          </div>
          <div style="width: 100%; height: 5px; background: var(--bg-primary); border-radius: 4px; overflow: hidden; margin-top: 0.25rem;">
            <div style="width: ${m}%; height: 100%; background: ${m===100?"var(--success)":"var(--warning)"};"></div>
          </div>
          ${e.excludedSessionsCount>0?`<div style="font-size: 0.72rem; color: var(--warning); font-weight: 700; margin-top: 0.15rem;">(${e.excludedSessionsCount} مستبعدة)</div>`:""}
        </td>

        <td>
          <div style="font-weight: 700; font-size: 0.88rem;">${e.includedHours.toFixed(1)} س</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">إجمالي المسجل: ${e.totalRecordedHours.toFixed(1)} س</div>
        </td>

        <td>
          <div style="font-weight: 900; color: var(--primary-color); font-size: 0.95rem;">
            ${e.netCalculatedSalary.toLocaleString()} ج.م
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">
            (أساس: ${Math.round(e.rawCalculatedSalary)} ${e.bonuses>0?`+${e.bonuses}`:""} ${e.deductions>0?`-${e.deductions}`:""})
          </div>
        </td>

        <td>
          <div style="font-weight: 800; color: var(--text-primary); font-size: 0.92rem;">
            ${e.expectedSalary.toLocaleString()} ج.م
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            متوقع: ${e.expectedHours.toFixed(1)} س (${e.expectedSessionsCount} حصة)
          </div>
        </td>

        <td>
          <div style="font-weight: 800; color: ${g}; font-size: 0.92rem;">
            ${u}${e.discrepancyAmount.toLocaleString()} ج.م
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">
            (${e.discrepancyHours>0?"+":""}${e.discrepancyHours} س)
          </div>
        </td>

        <td>
          <div style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.65rem; border-radius: 9999px; background: ${c}; color: ${l}; font-weight: 800; font-size: 0.78rem;">
            <i data-lucide="${i}" style="width: 14px; height: 14px;"></i>
            <span>${e.integrityLabel}</span>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem; max-width: 180px; line-height: 1.3;" title="${e.integrityExplanation}">
            ${e.integrityExplanation.length>50?e.integrityExplanation.substring(0,50)+"...":e.integrityExplanation}
          </div>
        </td>

        <td style="text-align: center;">
          <div style="display: flex; gap: 0.35rem; justify-content: center;">
            <button class="btn btn-secondary btn-sm btn-inspect-recon" data-index="${n}" title="فحص وتفسير الفروقات التفصيلي" style="padding: 0.4rem 0.65rem; font-size: 0.8rem; font-weight: 700;">
              <i data-lucide="search"></i> فحص وتفسير
            </button>
            <button class="btn btn-secondary btn-sm btn-quick-audit" data-index="${n}" title="تسجيل تدقيق فوري بسجل المطابقة" style="padding: 0.4rem 0.5rem; color: var(--primary-color);">
              <i data-lucide="file-check"></i>
            </button>
          </div>
        </td>
      </tr>
    `}).join(""),t.querySelectorAll(".btn-inspect-recon").forEach(e=>{e.addEventListener("click",n=>{const o=parseInt(e.getAttribute("data-index"),10),r=a[o];xt(r)})}),t.querySelectorAll(".btn-quick-audit").forEach(e=>{e.addEventListener("click",async n=>{const o=parseInt(e.getAttribute("data-index"),10),r=a[o];await Et(r)})}),window.lucide&&window.lucide.createIcons()}function K(){const t=document.getElementById("tblArchiveReconBody");if(!t)return;const a=wt.filter(e=>{const n=!lt||e.teacherName.toLowerCase().includes(lt),o=ut==="all"||e.integrityStatus===ut,r=pt==="all"||e.month===pt;return n&&o&&r});if(a.length===0){t.innerHTML=`
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          <i data-lucide="archive" style="width: 32px; height: 32px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
          <div>لا توجد سجلات أرشيف مطابقة لمعايير البحث.</div>
        </td>
      </tr>
    `,window.lucide&&window.lucide.createIcons();return}t.innerHTML=a.map((e,n)=>{const o=e.integrityStatus==="balanced",r=e.integrityStatus==="acceptable_discrepancy";e.integrityStatus;let i=o?"check-circle":r?"info":"alert-octagon",c=o?"rgba(34, 197, 94, 0.12)":r?"rgba(245, 158, 11, 0.12)":"rgba(239, 68, 68, 0.12)",l=o?"#15803d":r?"#b45309":"#b91c1c";const m=e.amountDiff===0?"var(--text-secondary)":e.amountDiff>0?"#16a34a":"#dc2626";return`
      <tr>
        <td>
          <div style="font-weight: 800; color: var(--text-primary); font-size: 0.92rem;">${e.teacherName}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">طريقة الدفع: ${e.archivedMethod}</div>
        </td>

        <td>
          <span class="badge badge-secondary" style="font-weight: 800; font-size: 0.82rem;">${e.month}</span>
        </td>

        <td>
          <div style="font-weight: 900; color: var(--text-primary); font-size: 0.95rem;">
            ${e.archivedAmount.toLocaleString()} ج.م
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            ${e.archivedHours} س (${e.archivedSessionsCount} حصة)
          </div>
        </td>

        <td>
          <div style="font-weight: 900; color: var(--primary-color); font-size: 0.95rem;">
            ${e.recomputedSalary.toLocaleString()} ج.م
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            ${e.recomputedHours} س (${e.recomputedSessionsCount} حصة)
          </div>
        </td>

        <td>
          <div style="font-weight: 800; color: ${m}; font-size: 0.92rem;">
            ${e.amountDiff>0?"+":""}${e.amountDiff.toLocaleString()} ج.م
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">
            فارق الساعات: ${e.hoursDiff>0?"+":""}${e.hoursDiff} س
          </div>
        </td>

        <td>
          <div style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.65rem; border-radius: 9999px; background: ${c}; color: ${l}; font-weight: 800; font-size: 0.78rem;">
            <i data-lucide="${i}" style="width: 14px; height: 14px;"></i>
            <span>${e.integrityLabel}</span>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem; max-width: 180px; line-height: 1.3;">
            ${e.integrityExplanation}
          </div>
        </td>

        <td>
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary);">${e.adminName}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${e.notes||"لا توجد ملاحظات"}</div>
        </td>

        <td style="text-align: center;">
          <button class="btn btn-secondary btn-sm btn-inspect-archive" data-index="${n}" style="padding: 0.4rem 0.75rem; font-size: 0.8rem; font-weight: 700;">
            <i data-lucide="search"></i> مراجعة الجلسات
          </button>
        </td>
      </tr>
    `}).join(""),t.querySelectorAll(".btn-inspect-archive").forEach(e=>{e.addEventListener("click",()=>{const n=parseInt(e.getAttribute("data-index"),10),o=a[n];Kt(o)})}),window.lucide&&window.lucide.createIcons()}function Yt(){const t=document.getElementById("tblAuditLogsBody");if(!t)return;const a=Rt(O(N,"payrollReconciliationLogs"),Dt("createdAt","desc"));_t(a,e=>{if(e.empty){t.innerHTML=`
        <tr>
          <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            <i data-lucide="history" style="width: 32px; height: 32px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
            <div>لم يتم تسجيل أي عمليات تدقيق ومطابقة رسمية بعد. يتم الحفظ هنا تلقائياً عند اعتماد المطابقة.</div>
          </td>
        </tr>
      `,window.lucide&&window.lucide.createIcons();return}t.innerHTML=e.docs.map(n=>{const o=n.data(),r=o.createdAt?new Date(o.createdAt.toDate?o.createdAt.toDate():o.createdAt).toLocaleString("ar-EG",{dateStyle:"medium",timeStyle:"short"}):"الآن",i=o.status==="balanced",c=o.status==="acceptable_discrepancy";let l=i?'<span class="badge badge-success" style="font-weight: 800;">متطابق 🟢</span>':c?'<span class="badge badge-warning" style="font-weight: 800;">فروقات مقبولة 🟡</span>':'<span class="badge badge-danger" style="font-weight: 800;">يتطلب مراجعة 🔴</span>';return`
        <tr>
          <td style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); direction: ltr; text-align: right;">${r}</td>
          <td style="font-weight: 800; color: var(--text-primary);">${o.teacherName||"فحص شامل"}</td>
          <td><span class="badge badge-secondary" style="font-weight: 800;">${o.month||"-"}</span></td>
          <td>${l}</td>
          <td style="font-weight: 800; color: var(--primary-color);">${(o.calculatedSalary||0).toLocaleString()} ج.م</td>
          <td style="font-weight: 800; color: ${o.discrepancyAmount===0?"var(--text-secondary)":"#dc2626"};">${(o.discrepancyAmount||0).toLocaleString()} ج.م</td>
          <td>
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">${o.adminName||"الأدمن"}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${o.notes||"تدقيق معتمد"}</div>
          </td>
        </tr>
      `}).join(""),window.lucide&&window.lucide.createIcons()},e=>console.error("Error listening to reconciliation logs:",e))}function xt(t){var o;st=t;const a=document.getElementById("reconDetailModal");if(!a)return;document.getElementById("modalTeacherName").textContent=t.teacherName,document.getElementById("modalMonthDisplay").textContent=t.month;const e=document.getElementById("modalStatusBadge");e.className=`badge ${t.integrityBadgeClass}`,e.textContent=t.integrityLabel,document.getElementById("modalStatusRationale").textContent=t.integrityExplanation,document.getElementById("modalMetricRecordedSessions").textContent=t.totalRecordedSessions,document.getElementById("modalMetricIncludedSessions").textContent=t.includedSessionsCount,document.getElementById("modalMetricExcludedSessions").textContent=t.excludedSessionsCount,document.getElementById("modalMetricIncludedHours").textContent=`${t.includedHours.toFixed(1)} س`,document.getElementById("modalMetricCalculatedSalary").textContent=`${t.netCalculatedSalary.toLocaleString()} ج.م`,document.getElementById("modalMetricExpectedSalary").textContent=`${t.expectedSalary.toLocaleString()} ج.م`,document.getElementById("modalMetricDiscrepancy").textContent=`${t.discrepancyAmount>0?"+":""}${t.discrepancyAmount.toLocaleString()} ج.م`,Xt(t.includedSessions),Qt(t.excludedSessions,t),Wt(t);const n=a.querySelector('.modal-tab-btn[data-target="modal-tab-excluded"]');n&&t.excludedSessionsCount>0?n.click():(o=a.querySelector('.modal-tab-btn[data-target="modal-tab-included"]'))==null||o.click(),a.style.display="flex",window.lucide&&window.lucide.createIcons()}function Xt(t){const a=document.getElementById("tblModalIncludedSessions");if(a){if(t.length===0){a.innerHTML='<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">لا توجد حصص محتسبة لهذا الشهر حتى الآن.</td></tr>';return}a.innerHTML=t.map(e=>{const n=e.session;return`
      <tr>
        <td style="font-weight: 700; color: var(--text-primary);">${n.date||"-"}</td>
        <td>
          <div style="font-weight: 800; color: var(--text-primary); font-size: 0.88rem;">${n.studentName||n.groupName||"دارس"}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${e.isGroup?"مجموعة جماعية":"حصة فردية"}</div>
        </td>
        <td style="font-weight: 700;">${n.duration||0} دقيقة (${e.hours.toFixed(2)} س)</td>
        <td style="font-weight: 800; color: var(--text-primary);">${e.rate} ج.م/س</td>
        <td style="font-weight: 900; color: var(--success); font-size: 0.95rem;">${Math.round(e.cost)} ج.م</td>
        <td><span class="badge badge-success" style="font-size: 0.75rem;">${e.statusLabel}</span></td>
      </tr>
    `}).join("")}}function Qt(t,a){var r;const e=document.getElementById("tblModalExcludedSessions"),n=document.getElementById("modalBatchApproveContainer");if(!e)return;if(t.length===0){e.innerHTML=`
      <tr>
        <td colspan="6" style="text-align:center; padding: 2.5rem; color: var(--success); font-weight: 800;">
          <i data-lucide="check-check" style="width: 32px; height: 32px; margin-bottom: 0.5rem;"></i>
          <div>ممتاز! لا توجد أي حصص مستبعدة لهذا المعلم. جميع الجلسات معتمدة ومحتسبة.</div>
        </td>
      </tr>
    `,n&&(n.innerHTML=""),window.lucide&&window.lucide.createIcons();return}const o=t.filter(i=>i.reason.code==="NOT_APPROVED").map(i=>i.session.id);n&&(o.length>0?(n.innerHTML=`
        <button id="btnBatchApproveAll" class="btn btn-primary" style="font-weight: 800; gap: 0.4rem; font-size: 0.85rem; background: var(--warning); border-color: var(--warning);">
          <i data-lucide="check-circle-2"></i> اعتماد جميع الحصص المعلقة (${o.length} حصة)
        </button>
      `,(r=document.getElementById("btnBatchApproveAll"))==null||r.addEventListener("click",async()=>{await bt(o,a.teacherName)})):n.innerHTML=""),e.innerHTML=t.map(i=>{const c=i.session,l=i.reason,m=l.code==="NOT_APPROVED";return`
      <tr>
        <td style="font-weight: 700; color: var(--text-primary);">${c.date||"-"}</td>
        <td>
          <div style="font-weight: 800; color: var(--text-primary); font-size: 0.88rem;">${c.studentName||c.groupName||"دارس"}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${c.startTime||""} - ${c.endTime||""}</div>
        </td>
        <td style="font-weight: 700;">${c.duration||0} دقيقة</td>
        <td>
          <div style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.5rem; border-radius: 6px; background: rgba(0,0,0,0.05); font-size: 0.78rem; font-weight: 800; color: ${l.color};">
            <i data-lucide="${l.icon}" style="width: 14px; height: 14px;"></i>
            <span>${l.title}</span>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;">${l.desc}</div>
        </td>
        <td style="font-weight: 800; color: var(--danger); font-size: 0.9rem;">
          ${i.estimatedLostValue>0?`-${Math.round(i.estimatedLostValue)} ج.م`:"0 ج.م"}
        </td>
        <td style="text-align: center;">
          ${m?`
            <button class="btn btn-secondary btn-sm btn-approve-single" data-session-id="${c.id}" style="padding: 0.3rem 0.6rem; font-size: 0.78rem; font-weight: 800; color: var(--success); border-color: var(--success);">
              <i data-lucide="check"></i> اعتماد الآن
            </button>
          `:'<span style="font-size: 0.75rem; color: var(--text-muted);">-</span>'}
        </td>
      </tr>
    `}).join(""),e.querySelectorAll(".btn-approve-single").forEach(i=>{i.addEventListener("click",async()=>{const c=i.getAttribute("data-session-id");await bt([c],a.teacherName)})}),window.lucide&&window.lucide.createIcons()}function Wt(t){const a=document.getElementById("modalFormulaContent");a&&(a.innerHTML=`
    <div style="background: var(--bg-primary); padding: 1.25rem; border-radius: 10px; border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
      <h4 style="font-weight: 800; font-size: 0.95rem; margin-bottom: 0.8rem; color: var(--primary-color);">
        🧮 معادلة الاحتساب المباشر من قاعدة البيانات (Raw Formula)
      </h4>
      <div style="display: flex; flex-direction: column; gap: 0.6rem; font-size: 0.88rem; line-height: 1.6;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.4rem;">
          <span>ساعات الحصص الفردية:</span>
          <strong>${t.includedSessions.filter(e=>!e.isGroup).reduce((e,n)=>e+n.hours,0).toFixed(2)} س × ${t.rateInd} ج.م = ${Math.round(t.individualCalculatedSalary)} ج.م</strong>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.4rem;">
          <span>ساعات الحصص الجماعية:</span>
          <strong>${t.includedSessions.filter(e=>e.isGroup).reduce((e,n)=>e+n.hours,0).toFixed(2)} س × ${t.rateGrp} ج.م = ${Math.round(t.groupCalculatedSalary)} ج.م</strong>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.4rem;">
          <span>إجمالي أجر الحصص الفعلي:</span>
          <strong style="color: var(--primary-color);">${Math.round(t.rawCalculatedSalary)} ج.م</strong>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.4rem;">
          <span>المكافآت والحوافز المعتمدة (+):</span>
          <strong style="color: var(--success);">+${t.bonuses} ج.م</strong>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.4rem;">
          <span>الخصومات والتسويات (-):</span>
          <strong style="color: var(--danger);">${t.deductions>0?`-${t.deductions}`:"0"} ج.م</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 1.05rem; padding-top: 0.5rem; color: var(--primary-color);">
          <span>المرتب الفعلي المستحق الحالي:</span>
          <span>${t.netCalculatedSalary.toLocaleString()} ج.م</span>
        </div>
      </div>
    </div>

    <div style="background: rgba(37, 99, 235, 0.04); padding: 1.25rem; border-radius: 10px; border: 1px solid rgba(37, 99, 235, 0.15);">
      <h4 style="font-weight: 800; font-size: 0.95rem; margin-bottom: 0.8rem; color: #1d4ed8;">
        🎯 المقارنة مع المرتب المتوقع من جدول الطلاب
      </h4>
      <div style="font-size: 0.88rem; line-height: 1.6; color: var(--text-primary);">
        المرتب المتوقع وفقاً للجدول الدراسي: <strong>${t.expectedSalary.toLocaleString()} ج.م</strong> (${t.expectedHours.toFixed(1)} ساعة متوقعة).
        <div style="margin-top: 0.5rem; padding: 0.75rem; background: var(--bg-surface); border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.84rem;">
          <strong>تفسير الفارق: </strong>
          ${t.integrityExplanation}
        </div>
      </div>
    </div>
  `)}async function bt(t,a){if(await mt(`هل أنت متأكد من اعتماد (${t.length}) حصة معلقة للأستاذ/ة (${a})؟`,"اعتماد الحصص المالية"))try{await Ot(t),R.success(`تم بنجاح اعتماد ${t.length} حصة. جاري إعادة مطابقة البيانات...`),await X();const n=F.find(o=>o.teacherName===a);n&&xt(n)}catch(n){console.error("Error approving sessions:",n),R.danger("حدث خطأ أثناء اعتماد الحصص: "+n.message)}}async function Et(t){var e,n;if(await mt(`هل تريد تسجيل وتوثيق عملية مطابقة وتدقيق مرتب شهر (${t.month}) للمعلم (${t.teacherName}) في سجل النظام الرسمي؟`,"توثيق التدقيق المالي"))try{await Ht({teacherId:t.teacherId,teacherName:t.teacherName,month:t.month,status:t.integrityStatus,calculatedSalary:t.netCalculatedSalary,targetSalary:t.expectedSalary,discrepancyAmount:t.discrepancyAmount,totalSessions:t.totalRecordedSessions,includedSessions:t.includedSessionsCount,excludedSessions:t.excludedSessionsCount,adminName:((e=dt.currentUser)==null?void 0:e.displayName)||"مشرف الإدارة",adminId:((n=dt.currentUser)==null?void 0:n.uid)||"admin",notes:t.integrityExplanation}),R.success("تم توثيق عملية المطابقة بنجاح في سجل التدقيق المالي 📑")}catch(o){console.error("Error saving audit:",o),R.danger("فشل حفظ سجل التدقيق: "+o.message)}}function Kt(t){const a=document.getElementById("archiveDetailModal");if(!a)return;document.getElementById("archiveModalTeacherName").textContent=t.teacherName,document.getElementById("archiveModalMonth").textContent=t.month,document.getElementById("archiveModalAmount").innerHTML=`${t.archivedAmount.toLocaleString()} ج.م <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); display:block;">${t.archivedSessionsCount} حصة (${t.archivedHours} س)</span>`,document.getElementById("archiveModalRecomputed").innerHTML=`${t.recomputedSalary.toLocaleString()} ج.م <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); display:block;">${t.recomputedSessionsCount} حصة (${t.recomputedHours} س)</span>`,document.getElementById("archiveModalDiff").innerHTML=`${t.amountDiff>0?"+":""}${t.amountDiff.toLocaleString()} ج.م <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); display:block;">فارق الحصص: ${t.sessionsDiff>0?"+":""}${t.sessionsDiff}</span>`,document.getElementById("archiveModalRationale").textContent=t.integrityExplanation;const e=document.getElementById("archiveModalPostArchiveSection"),n=document.getElementById("tblArchiveModalPostArchiveSessions"),o=t.postArchiveSessions||[];if(e&&n)if(o.length>0){e.style.display="block";const c=document.getElementById("archivePostArchiveCount");c&&(c.textContent=o.length);const l=document.getElementById("archiveModalCreatedAtDate");l&&(l.textContent=t.archiveCreatedAtFormatted||"تاريخ الأرشفة");const m=document.getElementById("archivePostArchiveDiffVal");m&&(m.textContent=t.amountDiff>0?t.amountDiff.toLocaleString():"0");const u=document.getElementById("archivePostArchiveSourceMonth");u&&(u.textContent=parseInt(t.month.split("-")[1],10));const g=document.getElementById("btnCarryOverSessionsAction");if(g){const p=g.cloneNode(!0);g.parentNode.replaceChild(p,g),p.addEventListener("click",async()=>{const y=parseInt(t.month.split("-")[1],10);if(await mt(`هل أنت متأكد من ترحيل هذه الحصص (${o.length} حصة) إلى راتب الشهر الجديد؟

سيتم إدراجها ضمن استحقاق المعلم الحالي وتظهر بملاحظة "مرحّلة من شهر ${y}" لضمان حفظ الحقوق بدقة.`,"تثبيت ترحيل الحصص للشهر الجديد"))try{p.disabled=!0,p.innerHTML='<i data-lucide="loader-2" class="animate-spin"></i> جاري الترحيل...',window.lucide&&window.lucide.createIcons();const A=o.map(L=>L.session.id);await Lt(A,t.month),R.show(`تم بنجاح ترحيل ${A.length} حصة إلى راتب الشهر الجديد بملاحظة "مرحّلة من شهر ${y}".`,"success"),a.style.display="none",await refreshReconciliationData()}catch(A){console.error("Error carrying over sessions:",A),R.show("تعذر ترحيل الحصص: "+A.message,"error"),p.disabled=!1,p.innerHTML='<i data-lucide="forward"></i> تثبيت الترحيل للشهر الجديد فوراً',window.lucide&&window.lucide.createIcons()}})}n.innerHTML=o.map(p=>`
          <tr style="background: #fff5f5;">
            <td style="font-weight: 800; color: #1e293b;">
              ${p.date}
              <span style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted); display: block;">${p.time}</span>
            </td>
            <td style="font-weight: 800; color: var(--primary-color);">${p.studentName}</td>
            <td>
              ${p.duration} دقيقة
              <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${p.rate} ج.م/س (${p.hours.toFixed(2)} س)</span>
            </td>
            <td style="font-family: monospace; font-size: 0.8rem; font-weight: 800; color: #b91c1c;">
              ${p.createdAtFormatted}
            </td>
            <td style="font-weight: 700; color: #334155;">
              ${p.recordedBy}
            </td>
            <td>
              <span class="badge" style="background-color: #dcfce7; color: #15803d; font-weight: 700;">${p.approvedBy}</span>
              ${p.approvedAtFormatted&&p.approvedAtFormatted!=="-"?`<span style="font-size: 0.72rem; color: var(--text-muted); display: block;">${p.approvedAtFormatted}</span>`:""}
            </td>
            <td style="font-weight: 900; color: #be123c; font-size: 0.95rem;">
              +${Math.round(p.cost).toLocaleString()} ج.م
            </td>
          </tr>
        `).join("")}else e.style.display="none";const r=document.getElementById("archiveModalAllSessionsCount");r&&(r.textContent=t.recomputedSessionsList.length);const i=document.getElementById("tblArchiveModalSessions");i&&(t.recomputedSessionsList.length===0?i.innerHTML='<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">لا توجد جلسات مرتبطة مسجلة في قاعدة البيانات لهذه الدورة.</td></tr>':i.innerHTML=t.recomputedSessionsList.map(c=>{const l=c.session,m=c.isPostArchive;return`
          <tr style="${m?"background: #fff8f8;":""}">
            <td style="font-weight: 700;">${l.date||"-"}</td>
            <td style="font-weight: 800;">${c.studentName}</td>
            <td>${c.duration||0} دقيقة (${c.hours.toFixed(2)} س)</td>
            <td>
              <span style="font-weight: 700;">${c.rate} ج.م/س</span>
              <span style="font-weight: 900; color: var(--primary-color); display: block;">${Math.round(c.cost)} ج.م</span>
            </td>
            <td>
              <span style="font-size: 0.78rem; font-family: monospace; font-weight: 600; color: #475569;">${c.createdAtFormatted}</span>
              <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">بواسطة: ${c.recordedBy}</span>
            </td>
            <td>
              ${m?'<span class="badge" style="background-color: #fee2e2; color: #b91c1c; font-weight: 800; border: 1px solid #fca5a5;">⚠️ مضافة بعد الأرشفة</span>':'<span class="badge" style="background-color: #dcfce7; color: #15803d; font-weight: 700;">ضمن الأرشيف الأصلي ✅</span>'}
            </td>
          </tr>
        `}).join("")),a.style.display="flex",window.lucide&&window.lucide.createIcons()}function Jt(){const t=document.getElementById("reconDetailModal"),a=document.getElementById("archiveDetailModal");document.querySelectorAll(".close-recon-modal").forEach(n=>{n.addEventListener("click",()=>{t&&(t.style.display="none"),a&&(a.style.display="none")})}),document.querySelectorAll(".modal-tab-btn").forEach(n=>{n.addEventListener("click",()=>{document.querySelectorAll(".modal-tab-btn").forEach(r=>r.classList.remove("active")),n.classList.add("active");const o=n.getAttribute("data-target");document.querySelectorAll(".modal-tab-pane").forEach(r=>{r.style.display=r.id===o?"block":"none"})})});const e=document.getElementById("btnModalSaveAudit");e&&e.addEventListener("click",async()=>{st&&(await Et(st),t&&(t.style.display="none"))})}function Zt(){const t=document.getElementById("btnExportReconCsv"),a=document.getElementById("btnPrintRecon");t&&t.addEventListener("click",()=>{te()}),a&&a.addEventListener("click",()=>{window.print()})}function te(){if(F.length===0){R.warning("لا توجد بيانات لتصديرها");return}const t=["اسم المعلم","الشهر المالي","الحصص المسجلة","الحصص المعتمدة المحتسبة","الحصص المستبعدة","ساعات العمل المحتسبة","المرتب المحسوب (ج.م)","المرتب المتوقع (ج.م)","الفارق المالي (ج.م)","مؤشر سلامة الراتب","تفسير الفروقات"],a=F.map(i=>[`"${i.teacherName}"`,`"${i.month}"`,i.totalRecordedSessions,i.includedSessionsCount,i.excludedSessionsCount,i.includedHours.toFixed(1),i.netCalculatedSalary,i.expectedSalary,i.discrepancyAmount,`"${i.integrityLabel}"`,`"${(i.integrityExplanation||"").replace(/"/g,'""')}"`]),e="\uFEFF"+[t.join(","),...a.map(i=>i.join(","))].join(`
`),n=new Blob([e],{type:"text/csv;charset=utf-8;"}),o=URL.createObjectURL(n),r=document.createElement("a");r.setAttribute("href",o),r.setAttribute("download",`payroll_reconciliation_${C}.csv`),document.body.appendChild(r),r.click(),document.body.removeChild(r),R.success("تم تنزيل ملف كشف المطابقة بنجاح 📥")}Ct("admin");dt.onAuthStateChanged(async t=>{t&&(Tt("payroll-reconciliation","admin"),Mt("نظام مطابقة الرواتب والأجور",{name:"الإدارة العامة",roleName:"مدير الأكاديمية"}),await Ft(),window.lucide&&window.lucide.createIcons())});
