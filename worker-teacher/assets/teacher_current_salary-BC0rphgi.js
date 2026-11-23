import{a as z,d as f,m as D,s as L,T as H}from"./rbacService-D2RrsA9d.js";import{p as R}from"./authService-CtWWGArP.js";import{r as j,a as q,c as V}from"./navbar-BWutcREu.js";import{getDoc as W,doc as N,query as F,collection as B,where as A,getDocs as M,writeBatch as K,updateDoc as U,addDoc as _,serverTimestamp as J,onSnapshot as Q}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./activityLogger-BK9d5021.js";R("teacher");let e=null;z.onAuthStateChanged(async r=>{r&&await P(r.uid)});async function P(r){const n=await W(N(f,"users",r));n.exists()&&(e={uid:r,...n.data()},j("current-salary","teacher"),q("تفاصيل المرتب الحالي",{name:e.name,roleName:"معلم"}),await V(e),Y(),X(),Z())}function X(){const r=document.getElementById("pendingConfirmationsContainer");if(!r||!e)return;const n=e.paymentProofs||{},c=Object.keys(n).filter(h=>!n[h].confirmedByTeacher);if(c.length===0){r.style.display="none",r.innerHTML="";return}const t=c[c.length-1],o=n[t],x=t.split("-"),S=x[0],w=parseInt(x[1])-1,$=`${["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][w]||""} ${S}`,I=F(B(f,"sessions"),A("teacherId","==",e.uid));M(I).then(h=>{const v=[];h.forEach(l=>{const i=l.data();i.date&&i.date.startsWith(t)&&v.push(i)});const b=D(v,e,"all"),C=b.salary>0?b.salary:parseFloat(o.amount)||0;r.innerHTML=`
          <div class="card" style="border: 2px dashed var(--success); background: rgba(16, 185, 129, 0.04); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; position: relative; overflow: hidden;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
              <div>
                <h3 style="font-weight: 800; font-size: 1.15rem; color: var(--success); display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.5rem 0;">
                  <i data-lucide="badge-dollar-sign"></i> دفعة مرتب واردة بانتظار تأكيدك!
                </h3>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">قامت الإدارة بتحويل مستحقاتك المالية لشهر <strong style="color: var(--text-primary);">${$}</strong>. يرجى مراجعة المبلغ وتأكيد الاستلام لتصفير الدورة المالية للطلاب ونقلها للأرشيف المالي.</p>
              </div>
              <div style="background: var(--success-light); color: var(--success); padding: 0.5rem 1rem; border-radius: var(--border-radius-sm); font-weight: 800; font-size: 1.25rem;">
                ${C.toFixed(2)} ج.م
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem; font-size: 0.85rem;">
              <div>
                <span style="color: var(--text-secondary);">طريقة التحويل المفضلة:</span>
                <strong style="color: var(--text-primary); display: block;">${e.paymentPreferred||"حوالة إلكترونية"}</strong>
              </div>
              <div>
                <span style="color: var(--text-secondary);">رقم المعاملة (المرجع):</span>
                <strong style="color: var(--text-primary); display: block;">${o.transactionNumber||"مرفق ومثبت"}</strong>
              </div>
              <div>
                <span style="color: var(--text-secondary);">تاريخ التحويل والصرف:</span>
                <strong style="color: var(--text-primary); display: block;">${o.transferDate||"-"} في تمام الساعة ${o.transferTime||"-"}</strong>
              </div>
            </div>
            
            <div style="display: flex; justify-content: flex-end; margin-top: 0.5rem;">
              <button class="btn btn-primary" id="confirmReceiptBtn" data-month="${t}" data-amount="${C}" style="background: var(--success); border-color: var(--success); font-weight: 800; display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.5rem; border-radius: 8px; cursor: pointer;">
                <i data-lucide="check-circle-2"></i> تأكيد استلام الراتب وصرفه للأرشيف
              </button>
            </div>
          </div>
        `,r.style.display="block",window.lucide&&window.lucide.createIcons();const s=document.getElementById("confirmReceiptBtn");s&&s.addEventListener("click",()=>{const l=s.dataset.month,i=parseFloat(s.dataset.amount);L(`هل تأكدت بالفعل من وصول مبلغ (${i.toFixed(2)} ج.م) إلى حسابك؟ بعد التأكيد، سيتم تصفير المستحقات ونقل الدورة بالكامل إلى أرشيف الرواتب الخاص بك.`,async()=>{s.disabled=!0,s.textContent="جاري التأكيد والأرشفة...";try{const p=await M(F(B(f,"sessions"),A("teacherId","==",e.uid))),y=K(f);let d=0,a=0;p.forEach(k=>{const g=k.data();if(g.date&&g.date.startsWith(l)){y.update(k.ref,{archived:!0,paid:!0});const G=g.status==="completed",O=g.status==="student_absent"&&g.absenceType==="unexcused";g.approved===!0&&(G||O)&&(d++,a+=(parseInt(g.duration)||0)/60)}}),await y.commit();const m=N(f,"users",e.uid),u={...e.paymentProofs};u[l]={...u[l],confirmedByTeacher:!0,confirmationDate:new Date().toISOString()},await U(m,{paymentProofs:u,salaryStatus:"approved",currentSalaryStatus:"paid"}),await _(B(f,"salaryArchive"),{teacherId:e.uid,teacherName:e.name,month:l,amount:i,method:e.paymentPreferred||"حوالة إلكترونية",notes:o.transactionNumber?`تم التأكيد من المعلم. رقم المعاملة: ${o.transactionNumber}`:"تم التأكيد والموافقة من المعلم",sessionsCount:d||1,totalHours:a||1,adminName:o.adminName||"مشرف الإدارة",createdAt:J()}),H.success("تم تأكيد استلام الراتب وتصفير مستحقات الشهر الجاري بنجاح! تم نقل المعاملة للأرشيف المالي. ✅"),await P(e.uid)}catch(p){console.error("Error confirming salary:",p),H.danger("حدث خطأ أثناء معالجة تأكيد الراتب: "+p.message),s.disabled=!1,s.innerHTML='<i data-lucide="check-circle-2"></i> تأكيد استلام الراتب وصرفه للأرشيف'}})})})}function Y(){if(!e)return;const r=document.getElementById("currentSalaryStatusBadge"),n=document.getElementById("currentSalaryPaymentDate"),c=document.getElementById("currentSalaryPaymentMethod"),t=document.getElementById("currentSalaryAdminNotes"),o=e.currentSalaryStatus||e.salaryStatus||"معلق";o==="تم التحويل"||o==="paid"||o==="transferred"?(r.textContent="تم التحويل والصرف بنجاح ✅",r.style.backgroundColor="var(--success-light)",r.style.color="var(--success)"):(r.textContent="قيد المراجعة والاعتماد ⏳",r.style.backgroundColor="var(--warning-light)",r.style.color="var(--warning)"),e.currentSalaryPaymentDate?n.textContent=e.currentSalaryPaymentDate:n.textContent="تلقائي بين 1 و 5 من الشهر",c&&(c.textContent=e.paymentPreferred||e.paymentVodafone||e.paymentInstapay||"فودافون كاش / انستاباي"),e.currentSalaryAdminNotes?t.textContent=e.currentSalaryAdminNotes:t.textContent="لم يدرج المشرف أي ملاحظات إدارية خاصة براتب الشهر الحالي حتى الآن."}let T=null;function Z(){if(!e)return;if(T)try{T()}catch{}const r=F(B(f,"sessions"),A("teacherId","==",e.uid));T=Q(r,n=>{const c=[];n.forEach(d=>{c.push({id:d.id,...d.data()})});const t=D(c,e,"month"),o=document.getElementById("currentMonthSalaryAmount"),x=document.getElementById("currentMonthApprovedSessionsCount"),S=document.getElementById("currentMonthTotalHours");o&&(o.textContent=`${t.netSalary.toFixed(2)} ج.م`),x&&(x.textContent=`${t.totalSessionsCount} حصة`),S&&(S.textContent=`${t.totalHours.toFixed(2)} ساعة`);const w=document.getElementById("calcIndHours"),E=document.getElementById("calcIndRate"),$=document.getElementById("calcIndGross"),I=document.getElementById("calcGrpHours"),h=document.getElementById("calcGrpRate"),v=document.getElementById("calcGrpGross"),b=document.getElementById("calcTotalGross"),C=document.getElementById("calcBonuses"),s=document.getElementById("calcDeductions"),l=document.getElementById("calcFinalNet");w&&(w.textContent=t.individualHours.toFixed(2)),E&&(E.textContent=t.rateInd),$&&($.textContent=`${t.individualSalary.toFixed(2)} ج.م`),I&&(I.textContent=t.groupHours.toFixed(2)),h&&(h.textContent=t.rateGrp),v&&(v.textContent=`${t.groupSalary.toFixed(2)} ج.م`),b&&(b.textContent=`${t.grossSalary.toFixed(2)} ج.م`),C&&(C.textContent=`+${t.bonuses.toFixed(2)} ج.م`),s&&(s.textContent=`-${t.deductions.toFixed(2)} ج.م`),l&&(l.textContent=`${t.netSalary.toFixed(2)} ج.م`);const i=document.getElementById("currentMonthSessionsTableBody"),p=document.getElementById("sessionsListSummaryBadge"),y=document.getElementById("carriedOverNoticeContainer");if(y&&(t.carriedOverSessionsCount>0?(y.style.display="block",y.innerHTML=`
              <div style="background: rgba(234, 88, 12, 0.08); border: 1px solid rgba(234, 88, 12, 0.3); border-radius: 10px; padding: 0.85rem 1.15rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 0.6rem; color: #c2410c; font-weight: 700; font-size: 0.9rem;">
                  <i data-lucide="info" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
                  <span>يتضمن كشف هذا الشهر <strong>(${t.carriedOverSessionsCount}) حصة مرحّلة</strong> من دورات سابقة مسجلة بعد إغلاق الأرشيف بقيمة <strong>(${t.carriedOverSalary.toFixed(2)} ج.م)</strong> مضافة لراتبك الحالي لضمان عدم ضياع أي مستحقات لك.</span>
                </div>
                <span class="badge" style="background: #ea580c; color: #ffffff; font-weight: 800; font-size: 0.8rem; padding: 0.35rem 0.75rem;">مضمونة ومضافة للراتب ✅</span>
              </div>
            `):y.style.display="none"),p){let d=`${t.approvedSessions.length} حصة معتمدة للشهر الجاري (${t.totalHours.toFixed(2)} ساعة عمل)`;t.carriedOverSessionsCount>0&&(d+=` | من ضمنها ${t.carriedOverSessionsCount} مرحّلة 🔄`),p.textContent=d}if(i){if(!t.approvedSessions||t.approvedSessions.length===0)i.innerHTML=`
              <tr>
                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2.5rem 1rem;">
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <i data-lucide="calendar-x" style="width: 36px; height: 36px; color: var(--text-muted);"></i>
                    <p style="margin: 0; font-weight: 700; color: var(--text-secondary);">لا توجد حصص معتمدة مسجلة لشهر الجاري حتى الآن.</p>
                    <small style="color: var(--text-muted);">الحصص تدخل في حساب الراتب فور اكتمالها واعتمادها من الإدارة أو تسجيل غياب طالب غير مبرر.</small>
                  </div>
                </td>
              </tr>
            `;else{const d=[...t.approvedSessions].sort((a,m)=>{const u=`${a.date||""} ${a.time||""}`;return`${m.date||""} ${m.time||""}`.localeCompare(u)});i.innerHTML=d.map(a=>{let m="";a.type==="group"?m='<span class="badge" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.2); font-weight: 700;">جماعي 👥</span>':a.type==="trial"?m='<span class="badge" style="background: rgba(245, 158, 11, 0.1); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.2); font-weight: 700;">تجريبي 🧪</span>':m='<span class="badge" style="background: rgba(13, 148, 136, 0.1); color: var(--primary-color); border: 1px solid rgba(13, 148, 136, 0.2); font-weight: 700;">فردي 👤</span>';let u="";return a.isCarriedOver&&(u=`
                  <div style="margin-top: 0.25rem;">
                    <span class="badge" style="background: rgba(234, 88, 12, 0.12); color: #c2410c; border: 1px solid rgba(234, 88, 12, 0.3); font-weight: 800; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                      <i data-lucide="rotate-ccw" style="width: 11px; height: 11px;"></i> ${a.carriedOverNote||"مرحّلة من شهر سابق"}
                    </span>
                  </div>
                `),`
                <tr style="${a.isCarriedOver?"background: rgba(234, 88, 12, 0.02);":""}">
                  <td>
                    <strong style="color: var(--text-primary); font-size: 0.92rem;">${a.studentName}</strong>
                    ${u}
                  </td>
                  <td class="font-mono" style="font-size: 0.85rem;">
                    <div>${a.date||"-"}</div>
                    <small style="color: var(--text-secondary);">${a.time||""}</small>
                  </td>
                  <td>${m}</td>
                  <td class="font-mono"><strong>${a.duration} دقيقة</strong> <small style="color: var(--text-secondary);">(${a.hours.toFixed(2)} س)</small></td>
                  <td class="font-mono" style="font-size: 0.88rem;">${a.rate.toFixed(2)} ج.م/س</td>
                  <td class="font-mono"><strong style="color: var(--success); font-size: 0.95rem; font-weight: 800;">${a.cost.toFixed(2)} ج.م</strong></td>
                  <td><span class="badge" style="background: var(--bg-primary); border: 1px solid var(--border-color); font-weight: 700;">${a.statusLabel}</span></td>
                </tr>
              `}).join("")}window.lucide&&window.lucide.createIcons()}},n=>{console.warn("Current month salary listener error:",n)})}
