import{d as f}from"./rbacService-Daqk2lPi.js";import{query as C,collection as h,where as v,getDocs as T,getDoc as I,doc as x,serverTimestamp as z,setDoc as D,updateDoc as _,addDoc as R}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import{l as L}from"./activityLogger-CddtPFfY.js";import{d as M}from"./creditManager-D9VZ-GJI.js";import{d as N}from"./navbar-Wj1PJKN1.js";async function G(e,t){if(!e)return[];e.innerHTML='<option value="">-- اختر المجموعة الجماعية --</option>';let n;t?n=C(h(f,"groups"),v("teacherId","==",t)):n=C(h(f,"groups"));const r=await T(n),s=[];return r.forEach(a=>{const i=a.data();(i.status||"active")==="active"&&s.push({id:a.id,...i})}),s.forEach(a=>{const i=(a.studentIds||[]).length,d=document.createElement("option");d.value=a.id,d.textContent=`${a.name} (${i} طلاب)`,e.appendChild(d)}),s}async function F(e,t,n=new Map){if(!e)return{isValid:!1};e.innerHTML="";const r=t?t.studentIds||[]:[];if(!t||r.length===0)return e.innerHTML=`
      <div style="background: rgba(239, 68, 68, 0.08); border: 1px dashed var(--danger); border-radius: 8px; padding: 1.25rem; text-align: center; margin-top: 0.75rem;">
        <p style="color: var(--danger); font-weight: 800; font-size: 0.9rem; margin-bottom: 0.75rem;">
          ⚠️ لا يوجد طلاب داخل هذه المجموعة.
        </p>
        <p style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 1rem;">
          لا يمكن تسجيل حصة لمجموعة فارغة. يرجى إضافة طالب واحد على الأقل للمجموعة أولاً.
        </p>
        <a href="../teacher/groups.html" class="btn btn-primary" style="font-size: 0.82rem; padding: 0.45rem 1rem; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;">
          <i data-lucide="user-plus" style="width: 16px; height: 16px;"></i> إدارة المجموعة وإضافة طلاب 👥
        </a>
      </div>
    `,window.lucide&&window.lucide.createIcons(),{isValid:!1};const s=[];for(const o of r)if(n.has(o))s.push(n.get(o));else try{const u=await I(x(f,"users",o));if(u.exists()){const c={id:u.id,...u.data()};n.set(o,c),s.push(c)}else s.push({id:o,name:"طالب غير محدد"})}catch{s.push({id:o,name:"طالب"})}const a=`
    <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-top: 0.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <h4 style="font-size: 0.9rem; font-weight: 800; color: var(--primary-color); margin: 0; display: flex; align-items: center; gap: 0.35rem;">
          <i data-lucide="users" style="width: 18px; height: 18px;"></i> تحضير طلاب المجموعة (${s.length} طلاب)
        </h4>
      </div>

      <!-- Attendance Mode Radios -->
      <div style="display: flex; gap: 1.5rem; margin-bottom: 1rem; background: var(--bg-card); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color);">
        <label style="display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 0.88rem; cursor: pointer; color: var(--success);">
          <input type="radio" name="grpAttendanceMode_${t.id}" value="all_present" checked style="accent-color: var(--success); width: 18px; height: 18px;">
          <span>✅ الجميع حاضرون (${s.length})</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 0.88rem; cursor: pointer; color: var(--danger);">
          <input type="radio" name="grpAttendanceMode_${t.id}" value="some_absent" style="accent-color: var(--danger); width: 18px; height: 18px;">
          <span>🔴 يوجد غياب</span>
        </label>
      </div>

      <!-- Student Checklist Container -->
      <div id="grpStudentsChecklistContainer_${t.id}" style="display: none; flex-direction: column; gap: 0.65rem; max-height: 250px; overflow-y: auto; padding-left: 0.25rem;">
        ${s.map(o=>`
          <div class="grp-student-row" data-id="${o.id}" data-name="${o.name}" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.6rem 0.8rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
              <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${o.name}</span>
              <label style="display: flex; align-items: center; gap: 0.4rem; font-weight: 800; font-size: 0.82rem; cursor: pointer; user-select: none;">
                <input type="checkbox" class="grp-st-checkbox" checked style="width: 18px; height: 18px; accent-color: var(--success);">
                <span class="grp-st-label" style="color: var(--success);">حاضر ✅</span>
              </label>
            </div>

            <!-- Absence details drawer (hidden by default) -->
            <div class="grp-st-absence-box" style="display: none; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color); grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div>
                <label style="font-size: 0.72rem; color: var(--text-secondary); display: block; margin-bottom: 0.2rem;">مبرر الغياب</label>
                <select class="grp-st-absence-type form-control" style="font-size: 0.78rem; padding: 0.25rem 0.5rem;">
                  <option value="unexcused" selected>بدون عذر (يُحسب) 🔴</option>
                  <option value="excused">بعذر (لا يُحسب) 🟢</option>
                </select>
              </div>
              <div>
                <label style="font-size: 0.72rem; color: var(--text-secondary); display: block; margin-bottom: 0.2rem;">ملاحظة خاصة بالغياب</label>
                <input type="text" class="grp-st-note form-control" placeholder="سبب الغياب..." style="font-size: 0.78rem; padding: 0.25rem 0.5rem;">
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;e.innerHTML=a,window.lucide&&window.lucide.createIcons();const i=e.querySelector('input[value="all_present"]'),d=e.querySelector('input[value="some_absent"]'),m=e.querySelector(`#grpStudentsChecklistContainer_${t.id}`);return i.addEventListener("change",()=>{m.style.display="none"}),d.addEventListener("change",()=>{m.style.display="flex"}),e.querySelectorAll(".grp-student-row").forEach(o=>{const u=o.querySelector(".grp-st-checkbox"),c=o.querySelector(".grp-st-label"),g=o.querySelector(".grp-st-absence-box");u.addEventListener("change",()=>{u.checked?(c.textContent="حاضر ✅",c.style.color="var(--success)",g.style.display="none"):(c.textContent="غائب 🔴",c.style.color="var(--danger)",g.style.display="grid")})}),{isValid:!0,getAttendanceData:()=>{const o=i.checked,u=[];return e.querySelectorAll(".grp-student-row").forEach(c=>{const g=c.dataset.id,b=c.dataset.name,y=o?!0:c.querySelector(".grp-st-checkbox").checked,l=y?"":c.querySelector(".grp-st-absence-type").value,p=y?"":c.querySelector(".grp-st-note").value.trim();u.push({studentId:g,studentName:b,isPresent:y,absenceType:l,note:p})}),u}}}async function O({group:e,teacherId:t,teacherName:n,duration:r,date:s,time:a,attendanceRecords:i,groupNotes:d="",rating:m=5}){if(!e||!i||i.length===0)throw new Error("بيانات المجموعة والحضور غير مكتملة.");let o=120;try{const l=await I(x(f,"users",t));if(l.exists()){const p=l.data();o=parseFloat(p.hourlyRateGroup||p.hourlyRateIndividual||p.hourlyRate||120)}}catch(l){console.warn("Could not fetch teacher group rate, using default 120:",l)}const c=(parseInt(r)||60)/60*o,g=`gbatch_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;let b=0,y=0;for(const l of i){const p=l.isPresent;p?b++:y++;const S=p||l.absenceType==="unexcused",A=S?c:0,w=x(h(f,"sessions")),q={id:w.id,groupBatchId:g,groupId:e.id,groupName:e.name,studentId:l.studentId,studentName:l.studentName,teacherId:t,teacherName:n||"المعلم",date:s,time:a,duration:parseInt(r)||60,type:"group",sessionType:"group",status:p?"completed":"student_absent",absenceType:p?"":l.absenceType||"unexcused",rating:m,notes:l.note?`${d?d+" | ":""}ملاحظة الطالب: ${l.note}`:d||"حصة جماعية",hourlyRateUsed:o,teacherEarnings:A,approved:!0,salaryCalculated:S,isCalculated:S,createdAt:z(),updatedAt:z()};await D(w,q);try{const k=x(f,"students",l.studentId),$=await I(k);$.exists()&&await _(k,{lastSessionDate:s,sessionsCount:(parseInt($.data().sessionsCount)||0)+1})}catch{}await M({sessionId:w.id,studentId:l.studentId,studentName:l.studentName,teacherId:t,teacherName:n||"المعلم",status:p?"completed":"student_absent",absenceType:p?"":l.absenceType||"unexcused",actor:{uid:t,name:n||"المعلم"}})}return await L(t,n,"RECORD_GROUP_SESSION",null,{groupId:e.id,groupName:e.name,groupBatchId:g,presentCount:b,absentCount:y,duration:r}),{groupBatchId:g,presentCount:b,absentCount:y,totalStudents:i.length}}async function U({studentId:e,teacherId:t,date:n}){if(!e||!t||!n)return{isDuplicate:!1,existingSession:null};try{const r=N.get("sessions")||[];if(r.length>0){const s=r.find(a=>String(a.studentId)===String(e)&&String(a.teacherId)===String(t)&&String(a.date)===String(n)&&a.status!=="cancelled");if(s)return{isDuplicate:!0,existingSession:s}}}catch(r){console.warn("Cache check for duplicate session skipped:",r)}try{const r=C(h(f,"sessions"),v("studentId","==",e),v("teacherId","==",t),v("date","==",n)),s=await T(r);if(!s.empty){const i=s.docs.map(d=>({id:d.id,...d.data()})).find(d=>d.status!=="cancelled");if(i)return{isDuplicate:!0,existingSession:i}}}catch(r){console.warn("Firestore query for duplicate session check:",r)}return{isDuplicate:!1,existingSession:null}}function V(e={}){return new Promise(t=>{const n=document.getElementById("sabeelDuplicateSessionModal");n&&n.remove();const r=document.createElement("div");r.id="sabeelDuplicateSessionModal",r.style.cssText=`
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: var(--z-modal);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: sabeelFadeIn 0.2s ease-out;
    `;const s=e.studentName||"الطالب المحدد",a=e.firstTime?` (في تمام الساعة ${e.firstTime})`:"";r.innerHTML=`
      <div style="
        background: var(--bg-card, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: 10px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        max-width: 460px;
        width: 100%;
        overflow: hidden;
      " dir="rtl">
        <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; align-items: center; gap: 0.75rem;">
          <div style="
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: rgba(245, 158, 11, 0.12);
            color: #d97706;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-primary, #0f172a);">
              تنبيه تسجيل حصة مكررة
            </h3>
            <p style="margin: 0.15rem 0 0 0; font-size: 0.78rem; color: var(--text-muted, #64748b);">
              تأكيد حفظ الحصة للمرة الثانية
            </p>
          </div>
        </div>

        <div style="padding: 1.25rem 1.5rem;">
          <p style="margin: 0 0 0.85rem 0; font-size: 0.92rem; font-weight: 600; color: var(--text-primary, #0f172a); line-height: 1.6;">
            تم تسجيل هذه الحصة بالفعل اليوم، هل تريد تسجيلها مرة أخرى؟
          </p>
          <div style="
            background: var(--bg-primary, #f8fafc);
            border: 1px solid var(--border-color, #e2e8f0);
            border-radius: 6px;
            padding: 0.75rem;
            font-size: 0.8rem;
            color: var(--text-secondary, #475569);
            line-height: 1.5;
          ">
            <div><strong style="color: var(--text-primary, #0f172a);">الدارس:</strong> ${s}</div>
            <div><strong style="color: var(--text-primary, #0f172a);">التاريخ:</strong> ${e.date||"اليوم"} ${a}</div>
            <div style="margin-top: 0.4rem; font-size: 0.75rem; color: #b45309;">
              ملاحظة: في حال المتابعة سيتم حفظ الحصة وإرسال إشعار تحذيري لإدارة الأكاديمية للمراجعة والتدقيق.
            </div>
          </div>
        </div>

        <div style="
          padding: 0.85rem 1.5rem;
          background: var(--bg-primary, #f8fafc);
          border-top: 1px solid var(--border-color, #e2e8f0);
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        ">
          <button id="sabeelDupCancelBtn" style="
            padding: 0.55rem 1.15rem;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            border: 1px solid var(--border-color, #cbd5e1);
            background: var(--bg-card, #ffffff);
            color: var(--text-primary, #334155);
            transition: all 0.15s ease;
          ">
            إلغاء
          </button>
          <button id="sabeelDupConfirmBtn" style="
            padding: 0.55rem 1.15rem;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            border: none;
            background: #d97706;
            color: #ffffff;
            transition: all 0.15s ease;
          ">
            تسجيل رغم ذلك
          </button>
        </div>
      </div>
    `,document.body.appendChild(r);const i=()=>{r.remove()},d=r.querySelector("#sabeelDupCancelBtn"),m=r.querySelector("#sabeelDupConfirmBtn");d==null||d.addEventListener("click",()=>{i(),t(!1)}),m==null||m.addEventListener("click",()=>{i(),t(!0)})})}async function W(e){try{const t={type:e.type||"duplicate_session",teacherId:e.teacherId||"",teacherName:e.teacherName||"معلم غير محدد",studentId:e.studentId||"",studentName:e.studentName||"طالب غير محدد",date:e.date||new Date().toISOString().split("T")[0],firstRecordedAt:e.firstRecordedAt||"غير متوفر",secondRecordedAt:e.secondRecordedAt||new Date().toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"}),sessionId:e.sessionId||"",notes:e.notes||"تسجيل حصة مكررة لنفس الطالب والمعلم في نفس اليوم",status:"unreviewed",createdAt:z()};return(await R(h(f,"warnings"),t)).id}catch(t){return console.error("Failed to create system warning:",t),null}}export{V as a,W as b,U as c,O as e,G as p,F as r};
