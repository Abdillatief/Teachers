import{a as P,d as G,T as B}from"./rbacService-Daqk2lPi.js";import{doc as k,serverTimestamp as T,setDoc as D,getDoc as R,updateDoc as X}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import{w as Y}from"./auditService-BYflZ_Pe.js";import{d as Z}from"./creditManager-D9VZ-GJI.js";async function ee({groupId:e,groupName:n,teacherId:d,teacherName:i,duration:y=60,date:S,time:p,attendees:l=[],generalNotes:a="",rating:x=5}){if(!e||!l||l.length===0)throw new Error("لا يوجد طلاب محددون لتسجيل الجلسة الجماعية.");const b=S||new Date().toISOString().split("T")[0],c=parseInt(y)||60,h=P.currentUser?P.currentUser.uid:d,M=new Date().toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"});let v=0,o=0;l.forEach(r=>{r.status==="completed"||r.isPresent===!0?(v++,r.status="completed"):(o++,r.status="student_absent")});const t=`gsess_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,s=k(G,"group_sessions",t),m={id:t,groupId:e,groupName:n,teacherId:d,teacherName:i||"المعلم المعتمد",duration:c,date:b,time:p||"05:30 مساءً",status:"completed",totalCount:l.length,presentCount:v,absentCount:o,generalNotes:a||"",attendees:l.map(r=>({studentId:r.studentId,studentName:r.studentName,status:r.status,absenceType:r.status==="student_absent"?r.absenceType||"unexcused":"",note:r.note||r.notes||""})),recordedBy:h,recordedAt:M,createdAt:T()};await D(s,m);let u=120;try{const r=await R(k(G,"users",d));if(r.exists()){const f=r.data();u=parseFloat(f.hourlyRateGroup||f.hourlyRateIndividual||f.hourlyRate||120)}}catch{}const g=c/60*u,w=k(G,"sessions",t),A={id:t,groupSessionId:t,groupBatchId:t,studentId:e,studentName:`مجموعة: ${n}`,teacherId:d,teacherName:i||"المعلم المعتمد",groupId:e,groupName:n,type:"group",sessionType:"group",duration:c,date:b,time:p||"05:30 مساءً",status:"completed",notes:a||`حصة جماعية لمجموعة (${n})`,hourlyRateUsed:u,teacherEarnings:g,approved:!0,salaryCalculated:!0,isCalculated:!0,isFinancialRecord:!0,isSalaryRecord:!0,isStudentRecordOnly:!1,recordedBy:h,createdAt:T(),updatedAt:T()};await D(w,A);const $=l.map(async r=>{const f=r.status==="completed",E=r.status==="student_absent",z=`gsess_std_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,F=k(G,"sessions",z),U={id:z,groupSessionId:t,groupBatchId:t,studentId:r.studentId,studentName:r.studentName,teacherId:d,teacherName:i||"المعلم المعتمد",groupId:e,groupName:n,type:"group",sessionType:"group",duration:c,date:b,time:p||"05:30 مساءً",status:r.status||"completed",absenceType:E?r.absenceType||"unexcused":"",rating:parseFloat(r.rating||x)||5,notes:r.note?`${a?a+" | ":""}ملاحظة الطالب: ${r.note}`:a||`حضور طالب في مجموعة (${n})`,hourlyRateUsed:u,teacherEarnings:0,approved:!0,salaryCalculated:!1,isCalculated:!1,isStudentRecordOnly:!0,isSalaryRecord:!1,recordedBy:h,createdAt:T(),updatedAt:T()};if(await D(F,U),f)try{const I=k(G,"students",r.studentId),L=await R(I);if(L.exists()){const N=L.data(),H=parseInt(N.sessionsCount)||0,Q=parseFloat(N.hoursCount)||0,W=parseFloat(N.averageRating)||5,V=c/60,_=H+1,J=Math.round((Q+V)*100)/100,K=Math.round((W*H+(parseFloat(r.rating||x)||5))/_*10)/10;await X(I,{sessionsCount:_,hoursCount:J,averageRating:K,lastSessionDate:b})}}catch(I){console.warn(`Error updating stats for student ${r.studentId}:`,I)}if(f||E&&r.absenceType==="unexcused")try{await Z({sessionId:z,studentId:r.studentId,studentName:r.studentName,teacherId:d,teacherName:i||"المعلم المعتمد",status:r.status||"completed",absenceType:E?r.absenceType||"unexcused":"",actor:{uid:h,name:i||"المعلم"}})}catch(I){console.warn(`Error deducting credit for student ${r.studentId}:`,I)}return z});await Promise.all($);try{await Y(h,i||"المعلم","RECORD_GROUP_SESSION",e,{groupName:n,count:l.length,presentCount:v,absentCount:o,date:b})}catch{}return{groupSessionId:t,presentCount:v,absentCount:o,totalCount:l.length}}function O(){var n,d,i,y;if(document.getElementById("groupSessionModalWrapper"))return;const e=document.createElement("div");e.id="groupSessionModalWrapper",e.innerHTML=`
    <!-- Modal 1: Record Group Session Modal -->
    <div id="recordGroupSessionModal" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.6); z-index: var(--z-modal); align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(4px);">
      <div class="modal-card" style="background-color: var(--bg-secondary); border-radius: 12px; border: 1px solid var(--border-color); width: 100%; max-width: 680px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: var(--shadow-lg); overflow: hidden;">
        
        <!-- Header -->
        <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-primary);">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
              <i data-lucide="users-round" style="color: var(--primary-color); width: 22px; height: 22px;"></i>
              تسجيل الحصة الجماعية
            </h3>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.2rem 0 0 0;">إثبات الحضور والغياب وكتابة الملاحظات لطلاب المجموعة.</p>
          </div>
          <button type="button" id="btnCloseRecordGroupModal" style="background: transparent; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted); padding: 0.25rem; display: flex; align-items: center;">
            <i data-lucide="x"></i>
          </button>
        </div>

        <!-- Body Scrollable -->
        <div style="padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 1.25rem;">
          
          <!-- Group Info Card -->
          <div style="background: rgba(var(--primary-rgb, 14, 165, 233), 0.08); border: 1px solid rgba(var(--primary-rgb, 14, 165, 233), 0.25); border-radius: 10px; padding: 1rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; font-size: 0.85rem;">
            <div>
              <span style="color: var(--text-secondary); display: block; font-size: 0.75rem;">اسم المجموعة:</span>
              <strong id="recGrpName" style="color: var(--primary-color); font-size: 1rem;">-</strong>
            </div>
            <div>
              <span style="color: var(--text-secondary); display: block; font-size: 0.75rem;">المعلم المشرف:</span>
              <strong id="recGrpTeacher" style="color: var(--text-primary);">-</strong>
            </div>
            <div>
              <span style="color: var(--text-secondary); display: block; font-size: 0.75rem;">موعد الحصة:</span>
              <strong id="recGrpTime" style="color: var(--text-primary);">-</strong>
            </div>
            <div>
              <span style="color: var(--text-secondary); display: block; font-size: 0.75rem;">إجمالي الطلاب:</span>
              <strong id="recGrpCount" style="color: var(--text-primary);">-</strong>
            </div>
          </div>

          <!-- Quick Actions & Controls -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; background: var(--bg-primary); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.35rem;">
              <i data-lucide="check-square" style="width: 18px; height: 18px; color: var(--success);"></i>
              كشف حضور وغياب الطلاب
            </div>
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
              <button type="button" id="btnRecGrpAllPresent" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.3rem 0.65rem; color: var(--success); font-weight: 700; border-color: var(--success);">
                ✅ تحديد الكل حاضر
              </button>
              <button type="button" id="btnRecGrpAllAbsent" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.3rem 0.65rem; color: var(--danger); font-weight: 700; border-color: var(--danger);">
                🔴 تحديد الكل غائب
              </button>
            </div>
          </div>

          <!-- Students Attendance List Container -->
          <div id="recGrpStudentsList" style="display: flex; flex-direction: column; gap: 0.75rem;">
            <!-- Rendered dynamically -->
          </div>

          <!-- General Notes & Duration -->
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; margin-top: 0.5rem;">
            <div class="form-group" style="margin: 0;">
              <label style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.35rem; display: block;">ملاحظات عامة تخص الحصة الجماعية (اختياري)</label>
              <input type="text" id="recGrpGeneralNotes" class="form-control" placeholder="اكتب ملاحظة عامة للحصة..." style="font-size: 0.88rem;">
            </div>
            <div class="form-group" style="margin: 0;">
              <label style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.35rem; display: block;">مدة الحصة (بالدقائق)</label>
              <select id="recGrpDuration" class="form-control" style="font-size: 0.88rem; font-weight: 700;">
                <option value="30">30 دقيقة</option>
                <option value="45">45 دقيقة</option>
                <option value="60" selected>60 دقيقة (ساعة)</option>
                <option value="90">90 دقيقة</option>
                <option value="120">120 دقيقة (ساعتان)</option>
              </select>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 0.75rem; background: var(--bg-primary);">
          <button type="button" id="btnCancelRecordGroupModal" class="btn btn-secondary" style="font-weight: 700;">إلغاء</button>
          <button type="button" id="btnSaveRecordGroupModal" class="btn btn-primary" style="font-weight: 800; gap: 0.4rem;">
            <i data-lucide="check-circle-2"></i> حفظ الحصة الجماعية
          </button>
        </div>

      </div>
    </div>

    <!-- Modal 2: View Group Session Details Modal -->
    <div id="detailsGroupSessionModal" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.6); z-index: var(--z-modal); align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(4px);">
      <div class="modal-card" style="background-color: var(--bg-secondary); border-radius: 12px; border: 1px solid var(--border-color); width: 100%; max-width: 650px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: var(--shadow-lg); overflow: hidden;">
        
        <!-- Header -->
        <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-primary);">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
              <i data-lucide="clipboard-check" style="color: var(--success); width: 22px; height: 22px;"></i>
              تفاصيل الحصة الجماعية المسجلة
            </h3>
            <span id="detGrpRecordedTime" style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.2rem; display: inline-block;">-</span>
          </div>
          <button type="button" id="btnCloseDetailsGroupModal" style="background: transparent; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted); padding: 0.25rem; display: flex; align-items: center;">
            <i data-lucide="x"></i>
          </button>
        </div>

        <!-- Body Scrollable -->
        <div style="padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 1.25rem;">
          
          <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; font-size: 0.85rem;">
            <div>
              <span style="color: var(--text-secondary); display: block; font-size: 0.75rem;">المجموعة:</span>
              <strong id="detGrpName" style="color: var(--primary-color); font-size: 1rem;">-</strong>
            </div>
            <div>
              <span style="color: var(--text-secondary); display: block; font-size: 0.75rem;">المعلم:</span>
              <strong id="detGrpTeacher" style="color: var(--text-primary);">-</strong>
            </div>
            <div>
              <span style="color: var(--text-secondary); display: block; font-size: 0.75rem;">الحضور:</span>
              <strong id="detGrpPresent" style="color: var(--success);">-</strong>
            </div>
            <div>
              <span style="color: var(--text-secondary); display: block; font-size: 0.75rem;">الغياب:</span>
              <strong id="detGrpAbsent" style="color: var(--danger);">-</strong>
            </div>
          </div>

          <div id="detGrpGeneralNotesBox" style="display: none; background: rgba(0,0,0,0.02); border: 1px dashed var(--border-color); border-radius: 8px; padding: 0.85rem; font-size: 0.85rem; color: var(--text-primary);">
            <strong style="color: var(--primary-color); display: block; margin-bottom: 0.25rem;">📝 ملاحظات الحصة العامة:</strong>
            <span id="detGrpGeneralNotesText"></span>
          </div>

          <div>
            <h4 style="font-size: 0.9rem; font-weight: 800; color: var(--text-primary); margin: 0 0 0.75rem 0;">سجل حضور الطلاب والملاحظات:</h4>
            <div id="detGrpStudentsTable" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
          </div>

        </div>

        <!-- Footer -->
        <div style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; background: var(--bg-primary);">
          <button type="button" id="btnOkDetailsGroupModal" class="btn btn-primary" style="font-weight: 700;">إغلاق</button>
        </div>

      </div>
    </div>
  `,document.body.appendChild(e),window.lucide&&window.lucide.createIcons(),(n=document.getElementById("btnCloseRecordGroupModal"))==null||n.addEventListener("click",q),(d=document.getElementById("btnCancelRecordGroupModal"))==null||d.addEventListener("click",q),(i=document.getElementById("btnCloseDetailsGroupModal"))==null||i.addEventListener("click",j),(y=document.getElementById("btnOkDetailsGroupModal"))==null||y.addEventListener("click",j)}function q(){const e=document.getElementById("recordGroupSessionModal");e&&(e.style.display="none")}function j(){const e=document.getElementById("detailsGroupSessionModal");e&&(e.style.display="none")}async function ne(e,n="المعلم المشرف",d=null){O();const i=document.getElementById("recordGroupSessionModal"),y=document.getElementById("recGrpName"),S=document.getElementById("recGrpTeacher"),p=document.getElementById("recGrpTime"),l=document.getElementById("recGrpCount"),a=document.getElementById("recGrpStudentsList"),x=document.getElementById("recGrpGeneralNotes");if(!e||!i||!a)return;y.textContent=e.name||"مجموعة جماعية",S.textContent=e.teacherName||n||"المعلم",p.textContent=e.time||"05:30 مساءً";const b=e.studentIds||[];l.textContent=`${b.length} طلاب`,x&&(x.value=""),a.innerHTML='<p style="text-align: center; color: var(--text-muted); padding: 1rem;">جاري تحميل قائمة الطلاب...</p>',i.style.display="flex";const c=[];for(const o of b)try{const t=await R(k(G,"students",o));if(t.exists())c.push({id:t.id,...t.data()});else{const s=await R(k(G,"users",o));s.exists()?c.push({id:s.id,name:s.data().name||"طالب"}):c.push({id:o,name:"طالب"})}}catch{c.push({id:o,name:"طالب"})}if(c.length===0){a.innerHTML=`
      <div style="background: rgba(239, 68, 68, 0.08); border: 1px dashed var(--danger); border-radius: 8px; padding: 1.25rem; text-align: center;">
        <p style="color: var(--danger); font-weight: 800; margin: 0;">⚠️ لا يوجد طلاب مسجلون داخل هذه المجموعة حالياً.</p>
      </div>
    `;return}a.innerHTML=c.map(o=>`
    <div class="grp-st-record-row" data-id="${o.id}" data-name="${o.name}" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.65rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <span style="font-weight: 800; font-size: 0.92rem; color: var(--text-primary);">${o.name}</span>
        
        <!-- Toggle Button for Present / Absent -->
        <button type="button" class="btn-toggle-attendance btn" data-status="completed" style="font-size: 0.82rem; font-weight: 800; padding: 0.35rem 0.85rem; border-radius: 20px; background: rgba(16, 185, 129, 0.12); color: var(--success); border: 1px solid var(--success); cursor: pointer; transition: all 0.2s;">
          <span class="status-text">حاضر ✅</span>
        </button>
      </div>

      <!-- Absence Details Drawer (Shown when absent) -->
      <div class="absence-details-drawer" style="display: none; background: rgba(239, 68, 68, 0.05); padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px dashed var(--danger);">
        <label style="font-size: 0.75rem; font-weight: 700; color: var(--danger); display: block; margin-bottom: 0.25rem;">تفاصيل ومبرر الغياب:</label>
        <select class="absence-type-select form-control" style="font-size: 0.8rem; padding: 0.35rem;">
          <option value="unexcused" selected>بدون عذر (يُحسب في الأجر) 🔴</option>
          <option value="excused">بعذر مقبول (لا يُحسب) 🟢</option>
        </select>
      </div>

      <!-- Student Notes & Quick Chips -->
      <div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <input type="text" class="student-note-input form-control" placeholder="ملاحظة خاصة بالطالب (مثال: راجع جيداً، متأخر...)..." style="font-size: 0.8rem; padding: 0.35rem 0.65rem;">
        </div>
        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.4rem;">
          <span class="chip-note" style="font-size: 0.7rem; background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.15rem 0.5rem; border-radius: 12px; cursor: pointer; user-select: none;">+ راجع جيداً</span>
          <span class="chip-note" style="font-size: 0.7rem; background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.15rem 0.5rem; border-radius: 12px; cursor: pointer; user-select: none;">+ لم يسمع</span>
          <span class="chip-note" style="font-size: 0.7rem; background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.15rem 0.5rem; border-radius: 12px; cursor: pointer; user-select: none;">+ متأخر</span>
          <span class="chip-note" style="font-size: 0.7rem; background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.15rem 0.5rem; border-radius: 12px; cursor: pointer; user-select: none;">+ يحتاج متابعة</span>
        </div>
      </div>
    </div>
  `).join(""),a.querySelectorAll(".grp-st-record-row").forEach(o=>{const t=o.querySelector(".btn-toggle-attendance"),s=o.querySelector(".status-text"),m=o.querySelector(".absence-details-drawer"),u=o.querySelector(".student-note-input");t.addEventListener("click",()=>{t.dataset.status==="completed"?(t.dataset.status="student_absent",t.style.background="rgba(239, 68, 68, 0.12)",t.style.color="var(--danger)",t.style.borderColor="var(--danger)",s.textContent="غائب 🔴",m.style.display="block"):(t.dataset.status="completed",t.style.background="rgba(16, 185, 129, 0.12)",t.style.color="var(--success)",t.style.borderColor="var(--success)",s.textContent="حاضر ✅",m.style.display="none")}),o.querySelectorAll(".chip-note").forEach(C=>{C.addEventListener("click",()=>{const g=C.textContent.replace("+","").trim();u.value?u.value.includes(g)||(u.value+=` • ${g}`):u.value=g})})});const h=document.getElementById("btnRecGrpAllPresent"),M=document.getElementById("btnRecGrpAllAbsent");h.onclick=()=>{a.querySelectorAll(".grp-st-record-row").forEach(o=>{const t=o.querySelector(".btn-toggle-attendance"),s=o.querySelector(".status-text"),m=o.querySelector(".absence-details-drawer");t.dataset.status="completed",t.style.background="rgba(16, 185, 129, 0.12)",t.style.color="var(--success)",t.style.borderColor="var(--success)",s.textContent="حاضر ✅",m.style.display="none"}),B.success("تم تحديد كافة الطلاب كحاضرين ✅")},M.onclick=()=>{a.querySelectorAll(".grp-st-record-row").forEach(o=>{const t=o.querySelector(".btn-toggle-attendance"),s=o.querySelector(".status-text"),m=o.querySelector(".absence-details-drawer");t.dataset.status="student_absent",t.style.background="rgba(239, 68, 68, 0.12)",t.style.color="var(--danger)",t.style.borderColor="var(--danger)",s.textContent="غائب 🔴",m.style.display="block"}),B.success("تم تحديد كافة الطلاب كغائبين 🔴")};const v=document.getElementById("btnSaveRecordGroupModal");v.onclick=async()=>{var o,t;v.disabled=!0;try{const s=[];a.querySelectorAll(".grp-st-record-row").forEach(w=>{const A=w.dataset.id,$=w.dataset.name,r=w.querySelector(".btn-toggle-attendance").dataset.status,f=w.querySelector(".absence-type-select").value,E=w.querySelector(".student-note-input").value.trim();s.push({studentId:A,studentName:$,status:r,absenceType:f,note:E})});const m=((o=document.getElementById("recGrpGeneralNotes"))==null?void 0:o.value.trim())||"",u=parseInt((t=document.getElementById("recGrpDuration"))==null?void 0:t.value)||60,C=new Date().toISOString().split("T")[0],g=await ee({groupId:e.id,groupName:e.name,teacherId:e.teacherId,teacherName:e.teacherName||n,duration:u,date:C,time:e.time||"05:30 مساءً",attendees:s,generalNotes:m});B.success(`تم حفظ الحصة الجماعية بنجاح! ✅ (حضر: ${g.presentCount} - غاب: ${g.absentCount})`),q(),d&&d(g)}catch(s){console.error("Error saving group session:",s),B.error("حدث خطأ أثناء حفظ الحصة: "+s.message)}finally{v.disabled=!1}}}function ae(e){O();const n=document.getElementById("detailsGroupSessionModal");if(!n||!e)return;document.getElementById("detGrpName").textContent=e.groupName||"مجموعة جماعية",document.getElementById("detGrpTeacher").textContent=e.teacherName||"المعلم",document.getElementById("detGrpPresent").textContent=`${e.presentCount||0} طلاب`,document.getElementById("detGrpAbsent").textContent=`${e.absentCount||0} طلاب`,document.getElementById("detGrpRecordedTime").textContent=`🕒 تاريخ التسجيل: ${e.date||""} (الساعة ${e.recordedAt||"غير محدد"})`;const d=document.getElementById("detGrpGeneralNotesBox"),i=document.getElementById("detGrpGeneralNotesText");e.generalNotes?(d.style.display="block",i.textContent=e.generalNotes):d.style.display="none";const y=document.getElementById("detGrpStudentsTable"),S=e.attendees||[];S.length===0?y.innerHTML='<p style="color: var(--text-muted); text-align: center;">لا تتوفّر تفاصيل طلاب لهذه الجلسة.</p>':y.innerHTML=S.map(p=>{const l=p.status==="completed",a=l?"background: rgba(16, 185, 129, 0.12); color: var(--success);":"background: rgba(239, 68, 68, 0.12); color: var(--danger);",x=l?"حاضر ✅":p.absenceType==="excused"?"غائب بعذر 🟢":"غائب بدون عذر 🔴";return`
        <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <strong style="font-size: 0.9rem; color: var(--text-primary); display: block;">${p.studentName}</strong>
            ${p.note?`<span style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.15rem; display: block;">📝 ملاحظة: ${p.note}</span>`:""}
          </div>
          <span class="badge" style="position: static; font-size: 0.78rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 6px; ${a}">
            ${x}
          </span>
        </div>
      `}).join(""),n.style.display="flex"}export{ae as a,ne as o};
