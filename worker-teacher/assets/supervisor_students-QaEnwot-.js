import{q as y,T as E,d as O}from"./rbacService-D2RrsA9d.js";import{serverTimestamp as _,updateDoc as z,doc as R}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import{i as H,e as r,b as N}from"./supervisorPageShell-B-wFzxgu.js";import{STUDENT_STATUS_META as U,getStudentDefaultDuration as k,logActivity as F}from"./supervisorDomainService-BW5mzJbW.js";import{d as h}from"./navbar-BWutcREu.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./authService-CtWWGArP.js";import"./activityLogger-BK9d5021.js";let d=null,c=[],x=[],I=!1;H({pageId:"students",pageTitle:"متابعة الطلاب التشغيلية",requiredPermission:y.VIEW_STUDENTS,onReady:n=>{var a,s,i,l,v,p;d=n;const t=document.getElementById("searchStudentsInput");t&&(t.value="",setTimeout(()=>{!I&&t.value&&(t.value="",u())},300),t.addEventListener("input",()=>{I=!0,u()})),h.subscribe("studentOperationalSummaries",m=>{c=(m||[]).slice().sort((f,S)=>(f.name||"").localeCompare(S.name||"","ar")),u()}),h.subscribe("teacherOperationalProfiles",m=>{x=m||[],q()}),(a=document.getElementById("filterStatusSelect"))==null||a.addEventListener("change",u),(s=document.getElementById("filterTeacherSelect"))==null||s.addEventListener("change",u),(i=document.getElementById("refreshStudentsBtn"))==null||i.addEventListener("click",async()=>{await h.refreshCollection("studentOperationalSummaries"),E.info("تم تحديث بيانات الطلاب التشغيلية.")}),(l=document.getElementById("closeEditStudentBtn"))==null||l.addEventListener("click",B),(v=document.getElementById("cancelEditStudentBtn"))==null||v.addEventListener("click",B),(p=document.getElementById("editStudentForm"))==null||p.addEventListener("submit",V)},onPermissionsUpdated:({hasPerm:n})=>{d&&(d.hasPerm=n),u()}});function q(){const n=document.getElementById("filterTeacherSelect");if(!n)return;const t=n.value;n.innerHTML='<option value="all">جميع المعلمين</option>'+x.slice().sort((a,s)=>(a.name||"").localeCompare(s.name||"","ar")).map(a=>`<option value="${r(a.uid||a.id)}">${r(a.name||"معلم")}</option>`).join(""),t&&(n.value=t)}function u(){var f,S,T,b;const n=document.getElementById("studentsTableBody");if(!n)return;const t=(((f=document.getElementById("searchStudentsInput"))==null?void 0:f.value)||"").trim().toLowerCase(),a=((S=document.getElementById("filterStatusSelect"))==null?void 0:S.value)||"all",s=((T=document.getElementById("filterTeacherSelect"))==null?void 0:T.value)||"all",i=c.filter(e=>{const o=String(e.status||"active").toLowerCase();if(a!=="all"){if(a==="suspended"&&!["suspended","Suspended"].includes(e.status))return!1;if(a!=="suspended"&&o!==a)return!1}return!(s!=="all"&&e.teacherId!==s||t&&!`${e.name||""} ${e.parentName||""} ${e.parentPhone||""} ${e.whatsapp||""} ${e.teacherName||""}`.toLowerCase().includes(t))}),l=i.filter(e=>String(e.status||"active").toLowerCase()==="active").length,v=i.filter(e=>{const o=Number(e.remainingLessons??e.remainingSessions??0);return String(e.status||"active").toLowerCase()==="active"&&o<3}).length;if(document.getElementById("countFilteredStudents").textContent=String(i.length),document.getElementById("countActiveStudents").textContent=String(l),document.getElementById("countLowBalanceStudents").textContent=String(v),c.length===0){const e=h.getError("studentOperationalSummaries");e?n.innerHTML=`<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--danger);">تعذر تحميل بيانات الطلاب التشغيلية من قاعدة البيانات (${r(e.code||e.message||"permission-denied")}). تأكد من نشر قواعد Firestore الأخيرة واعتماد حساب المشرف.</td></tr>`:n.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">لا توجد بيانات طلاب تشغيلية مزامنة حتى الآن. يرجى فتح لوحة المدير أو صفحة الطلاب من حساب الإدارة لمزامنة الملخصات التشغيلية.</td></tr>';return}if(i.length===0){n.innerHTML=`
          <tr>
            <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">
              <div>لا توجد سجلات طلاب مطابقة لخيارات البحث (${c.length} طالب متاح).</div>
              <button type="button" id="resetStudentFiltersBtn" class="btn btn-secondary btn-sm" style="margin-top: 0.75rem;">
                إعادة ضبط البحث والفلاتر
              </button>
            </td>
          </tr>
        `,(b=document.getElementById("resetStudentFiltersBtn"))==null||b.addEventListener("click",()=>{I=!1;const e=document.getElementById("searchStudentsInput"),o=document.getElementById("filterStatusSelect"),g=document.getElementById("filterTeacherSelect");e&&(e.value=""),o&&(o.value="all"),g&&(g.value="all"),u()});return}const p=d==null?void 0:d.hasPerm(y.EDIT_STUDENT_OPERATIONAL),m=d==null?void 0:d.hasPerm(y.CREATE_REQUESTS);n.innerHTML=i.map(e=>{var L,P;const o=U[e.status]||{label:e.status||"نشط",tone:"neutral"},g=k(e),C=Number(e.totalLessons||0),$=Number(e.remainingLessons??e.remainingSessions??0),D=Number(e.usedLessons||0),w=Array.isArray((L=e.schedule)==null?void 0:L.days)&&e.schedule.days.length>0?e.schedule.days:e.days||[],A=((P=e.schedule)==null?void 0:P.uniformTime)||e.sessionTime||"غير محدد",M=e.whatsapp||e.parentPhone||"غير مسجل";return`
          <tr>
            <td>
              <strong style="color: var(--text-primary);">${r(e.name||"طالب")}</strong>
              <div style="font-size: 0.74rem; color: var(--text-muted);">${e.age?`العمر: ${r(e.age)}`:"العمر غير محدد"}</div>
            </td>
            <td>
              <div style="font-weight: 600;">${r(e.parentName||"غير مسجل")}</div>
              <div style="font-size: 0.76rem; color: var(--primary-color);" class="tabular-nums">${r(M)}</div>
            </td>
            <td>${r(e.teacherName||"غير معين")}</td>
            <td>
              <div style="font-weight: 600;">${r(e.packageName||"باقة قياسية")}</div>
              <div style="font-size: 0.74rem; color: var(--text-muted);" class="tabular-nums">${r(g)} دقيقة / حصة</div>
            </td>
            <td>
              <div style="font-weight: 700;" class="tabular-nums">المتبقي: <span style="color: ${$<3?"var(--danger)":"var(--success)"};">${$}</span></div>
              <div style="font-size: 0.74rem; color: var(--text-muted);" class="tabular-nums">المستهلك: ${D} من ${C}</div>
            </td>
            <td>
              <div style="font-size: 0.78rem; font-weight: 600;">${w.length>0?r(w.join("، ")):"بدون أيام مجدولة"}</div>
              <div style="font-size: 0.74rem; color: var(--text-muted);" class="tabular-nums">${r(A)}</div>
            </td>
            <td>${N(o.label,o.tone)}</td>
            <td>
              <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                ${p?`
                  <button type="button" class="btn btn-secondary btn-sm btn-edit-student" data-id="${r(e.id)}" title="تعديل البيانات التشغيلية">
                    <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                    تعديل
                  </button>
                `:""}
                ${m?`
                  <a href="./requests.html?type=teacher_replacement&targetId=${encodeURIComponent(e.id)}&targetName=${encodeURIComponent(e.name||"")}" class="btn btn-outline btn-sm" title="رفع طلب إداري">
                    <i data-lucide="send" style="width: 14px; height: 14px;"></i>
                    طلب إداري
                  </a>
                `:""}
                ${!p&&!m?N("عرض فقط","neutral"):""}
              </div>
            </td>
          </tr>
        `}).join(""),n.querySelectorAll(".btn-edit-student").forEach(e=>{e.addEventListener("click",()=>j(e.dataset.id))}),window.lucide&&window.lucide.createIcons({root:n})}function j(n){if(!(d!=null&&d.hasPerm(y.EDIT_STUDENT_OPERATIONAL))){E.warning("لا تمتلك صلاحية تعديل بيانات الطلاب التشغيلية.");return}const t=c.find(a=>a.id===n);t&&(document.getElementById("editStudentId").value=t.id,document.getElementById("editStudentNameHeader").textContent=t.name||"طالب",document.getElementById("editStudentPackageHeader").textContent=`الباقة: ${t.packageName||"غير محددة"} | المعلم: ${t.teacherName||"غير معين"}`,document.getElementById("editParentName").value=t.parentName||"",document.getElementById("editParentPhone").value=t.whatsapp||t.parentPhone||"",document.getElementById("editStudentStatus").value=["paused","frozen"].includes(String(t.status||"").toLowerCase())?String(t.status).toLowerCase():"active",document.getElementById("editMemorizationDir").value=t.memorizationDirection||"ascending",document.getElementById("editStudentNotes").value=t.notes||"",document.getElementById("editStudentModal").style.display="flex")}function B(){document.getElementById("editStudentModal").style.display="none"}async function V(n){if(n.preventDefault(),!(d!=null&&d.hasPerm(y.EDIT_STUDENT_OPERATIONAL)))return;const t=document.getElementById("editStudentId").value,a=c.find(l=>l.id===t);if(!a)return;const s=document.getElementById("saveEditStudentBtn");s.disabled=!0;const i={parentName:document.getElementById("editParentName").value.trim(),parentPhone:document.getElementById("editParentPhone").value.trim(),whatsapp:document.getElementById("editParentPhone").value.trim(),status:document.getElementById("editStudentStatus").value,memorizationDirection:document.getElementById("editMemorizationDir").value,notes:document.getElementById("editStudentNotes").value.trim(),updatedAt:_()};try{await z(R(O,"studentOperationalSummaries",t),i),await F({actorId:d.uid,actorName:d.name,actorRole:"supervisor",actionType:"student_operational_updated",targetCollection:"studentOperationalSummaries",targetId:t,summary:`تحديث البيانات التشغيلية للطالب (${a.name||t})`,oldValue:{status:a.status,parentPhone:a.parentPhone||""},newValue:{status:i.status,parentPhone:i.parentPhone}}),E.success("تم حفظ البيانات التشغيلية للطالب وتوثيق التعديل."),B()}catch(l){console.error(l),E.danger("تعذر حفظ التعديلات، يرجى التحقق من الصلاحيات.")}finally{s.disabled=!1}}
