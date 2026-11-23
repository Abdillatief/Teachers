import{a as z,d as F,r as N,R as D,T as l,s as H}from"./rbacService-D2RrsA9d.js";import{onAuthStateChanged as P}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import{getDoc as j,doc as S,updateDoc as G,deleteDoc as O}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import{r as Q,a as U,d as $,s as _,b as V}from"./navbar-BWutcREu.js";import{p as J}from"./authService-CtWWGArP.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./activityLogger-BK9d5021.js";let k=null,u=[],C=[],T="all",A="",R="",f="";J("admin");P(z,async t=>{if(!t){window.location.href="../index.html";return}try{const a=await j(S(F,"users",t.uid));if(a.exists()){const e=a.data();if(N(e)!==D.ADMIN){l.error("غير مصرح لك بالدخول لهذه الصفحة"),window.location.href="../index.html";return}k={...t,...e},Q("feedback","admin"),U("فيدباك المعلمين",{name:e.name||"المدير",roleName:"إدارة الأكاديمية"}),K()}else window.location.href="../index.html"}catch(a){console.error("Auth guard error:",a)}});function K(){var e,r,n,c,s,o,m,p,g,M,q;$.subscribe("teachers",i=>{C=i||[],W()}),$.subscribe("feedbacks",i=>{u=i||[],Y(),X(),h()}),(e=document.getElementById("feedbackSearchInput"))==null||e.addEventListener("input",i=>{f=i.target.value.toLowerCase().trim(),h()}),(r=document.getElementById("ratingFilterSelect"))==null||r.addEventListener("change",i=>{A=i.target.value,h()}),(n=document.getElementById("topicFilterSelect"))==null||n.addEventListener("change",i=>{R=i.target.value,h()}),document.querySelectorAll(".filter-pill-btn").forEach(i=>{i.addEventListener("click",()=>{document.querySelectorAll(".filter-pill-btn").forEach(y=>y.classList.remove("active")),i.classList.add("active"),T=i.dataset.status||"all",h()})}),(c=document.getElementById("btnRefreshFeedbacks"))==null||c.addEventListener("click",()=>{l.info("جاري تحديث البيانات..."),$.refreshCollection&&$.refreshCollection("feedbacks"),h()});const t=document.getElementById("newFeedbackRequestModal");(s=document.getElementById("btnOpenNewFeedbackRequestModal"))==null||s.addEventListener("click",()=>{t&&(t.style.display="flex"),window.lucide&&window.lucide.createIcons()}),(o=document.getElementById("closeNewFeedbackModalBtn"))==null||o.addEventListener("click",()=>{t&&(t.style.display="none")}),(m=document.getElementById("cancelNewFeedbackModalBtn"))==null||m.addEventListener("click",()=>{t&&(t.style.display="none")}),(p=document.getElementById("newFeedbackRequestForm"))==null||p.addEventListener("submit",async i=>{var w,b,v,x;i.preventDefault();const y=(w=document.getElementById("reqTopicInput"))==null?void 0:w.value.trim(),I=(b=document.getElementById("reqQuestionInput"))==null?void 0:b.value.trim(),L=((v=document.getElementById("reqTargetSelect"))==null?void 0:v.value)||"teachers",B=((x=document.getElementById("reqIsPinnedCheckbox"))==null?void 0:x.checked)||!1;if(!y||!I){l.error("يرجى ملء كافة الحقول المطلوبة");return}const d=document.getElementById("btnSubmitFeedbackRequest");d&&(d.disabled=!0,d.innerHTML='<span class="loading-spinner" style="width: 14px; height: 14px; margin-left: 5px;"></span> جاري الإرسال...');try{await _({topic:y,question:I,target:L,isPinned:B,adminId:k.uid||"admin",adminName:k.name||"إدارة الأكاديمية"}),l.success("تم إرسال استطلاع الرأي للمعلمين بنجاح 🚀"),t&&(t.style.display="none"),document.getElementById("newFeedbackRequestForm").reset()}catch(E){console.error("Error sending feedback request:",E),l.error("حدث خطأ أثناء الإرسال: "+E.message)}finally{d&&(d.disabled=!1,d.innerHTML='<i data-lucide="send" style="width: 15px; height: 15px;"></i><span>إرسال الاستطلاع الآن</span>',window.lucide&&window.lucide.createIcons())}});const a=document.getElementById("replyFeedbackModal");(g=document.getElementById("closeReplyModalBtn"))==null||g.addEventListener("click",()=>{a&&(a.style.display="none")}),(M=document.getElementById("cancelReplyModalBtn"))==null||M.addEventListener("click",()=>{a&&(a.style.display="none")}),(q=document.getElementById("replyFeedbackForm"))==null||q.addEventListener("submit",async i=>{var w,b,v,x;i.preventDefault();const y=(w=document.getElementById("replyFeedbackId"))==null?void 0:w.value,I=(b=document.getElementById("replyTeacherId"))==null?void 0:b.value,L=(v=document.getElementById("replyTopic"))==null?void 0:v.value,B=(x=document.getElementById("replyTextInput"))==null?void 0:x.value.trim();if(!y||!B){l.error("يرجى كتابة نص الرد");return}const d=document.getElementById("btnSubmitReply");d&&(d.disabled=!0,d.innerHTML='<span class="loading-spinner" style="width: 14px; height: 14px; margin-left: 5px;"></span> جاري الإرسال...');try{await V({feedbackId:y,teacherId:I,topic:L,adminReply:B,adminId:k.uid||"admin",adminName:k.name||"إدارة الأكاديمية"}),l.success("تم إرسال الرد للمعلم بنجاح ✉️"),a&&(a.style.display="none"),document.getElementById("replyFeedbackForm").reset()}catch(E){console.error("Error replying to feedback:",E),l.error("حدث خطأ أثناء إرسال الرد: "+E.message)}finally{d&&(d.disabled=!1,d.innerHTML='<i data-lucide="send" style="width: 15px; height: 15px;"></i><span>إرسال الرد للمعلم 🚀</span>',window.lucide&&window.lucide.createIcons())}})}function W(){const t=document.getElementById("reqTargetSelect");if(!t)return;let a='<option value="teachers">📢 جميع المعلمين (تعميم عام)</option>';C.forEach(e=>{const r=e.id||e.uid,n=e.name||e.fullName||"معلم";a+=`<option value="${r}">👨‍🏫 المعلم: ${n}</option>`}),t.innerHTML=a}function X(){const t=document.getElementById("topicFilterSelect");if(!t)return;const a=t.value,e=Array.from(new Set(u.map(n=>n.topic).filter(Boolean)));let r=`<option value="">جميع الموضوعات والاستطلاعات (${e.length})</option>`;e.forEach(n=>{r+=`<option value="${n}" ${n===a?"selected":""}>${n}</option>`}),t.innerHTML=r}function Y(){const t=u.length,a=u.filter(n=>!n.status||n.status==="new").length,e=u.filter(n=>n.status==="addressed"||n.adminReplied).length,r=new Set(u.map(n=>n.teacherId).filter(Boolean)).size;document.getElementById("statTotalFeedback").textContent=t,document.getElementById("statPendingFeedback").textContent=a,document.getElementById("statAddressedFeedback").textContent=e,document.getElementById("statTeachersParticipated").textContent=r}function Z(t=""){return t.includes("ممتاز")||t.includes("راضي")?`<span class="rating-badge rating-excellent"><i data-lucide="star" style="width: 12px; height: 12px;"></i> ${t}</span>`:t.includes("اقتراح")?`<span class="rating-badge rating-suggestion"><i data-lucide="lightbulb" style="width: 12px; height: 12px;"></i> ${t}</span>`:t.includes("ملاحظات")?`<span class="rating-badge rating-notes"><i data-lucide="alert-circle" style="width: 12px; height: 12px;"></i> ${t}</span>`:t.includes("غير مناسب")?`<span class="rating-badge rating-negative"><i data-lucide="x-circle" style="width: 12px; height: 12px;"></i> ${t}</span>`:`<span class="rating-badge rating-suggestion">${t||"مشاركة رأي"}</span>`}function h(){const t=document.getElementById("feedbacksContainer");if(!t)return;let a=[...u];if(T==="new"?a=a.filter(e=>!e.status||e.status==="new"):T==="addressed"?a=a.filter(e=>e.status==="addressed"||e.adminReplied):T==="reviewed"&&(a=a.filter(e=>e.status==="reviewed")),A&&(a=a.filter(e=>(e.rating||"").includes(A))),R&&(a=a.filter(e=>e.topic===R)),f&&(a=a.filter(e=>{const r=(e.teacherName||"").toLowerCase(),n=(e.topic||"").toLowerCase(),c=(e.message||"").toLowerCase(),s=(e.teacherEmail||"").toLowerCase();return r.includes(f)||n.includes(f)||c.includes(f)||s.includes(f)})),a.sort((e,r)=>{var s,o;const n=(s=e.createdAt)!=null&&s.seconds?e.createdAt.seconds*1e3:new Date(e.createdAt||0).getTime();return((o=r.createdAt)!=null&&o.seconds?r.createdAt.seconds*1e3:new Date(r.createdAt||0).getTime())-n}),a.length===0){t.innerHTML=`
          <div class="card" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
            <div style="width: 56px; height: 56px; background: rgba(139, 92, 246, 0.1); color: #7c3aed; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto;">
              <i data-lucide="inbox" style="width: 28px; height: 28px;"></i>
            </div>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">لا توجد آراء مطابقة للفلاتر المحددة</h3>
            <p style="font-size: 0.85rem; margin-bottom: 1rem;">يمكنك إرسال استطلاع رأي جديد للمعلمين لبدء جمع آرائهم ومقترحاتهم.</p>
            <button type="button" class="btn btn-primary" onclick="document.getElementById('btnOpenNewFeedbackRequestModal').click()" style="background: #7c3aed; border-color: #7c3aed;">
              <i data-lucide="send" style="width: 14px; height: 14px;"></i>
              إرسال استطلاع رأي جديد
            </button>
          </div>
        `,window.lucide&&window.lucide.createIcons();return}t.innerHTML=a.map(e=>{var p,g;const r=e.status==="addressed"||e.adminReplied,n=e.status==="reviewed",c=r?"status-addressed":n?"status-reviewed":"status-new",s=(p=e.createdAt)!=null&&p.seconds?new Date(e.createdAt.seconds*1e3).toLocaleString("ar-EG"):e.createdAt?new Date(e.createdAt).toLocaleString("ar-EG"):"الآن",o=(e.teacherPhone||"").replace(/\D/g,""),m=o?`https://wa.me/${o}?text=${encodeURIComponent(`السلام عليكم أستاذ ${e.teacherName||""}، بخصوص رأيكم القيم وملاحظاتكم حول موضوع (${e.topic||""})...`)}`:"";return`
          <div class="feedback-card ${c}" id="card_${e.id}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 42px; height: 42px; background: rgba(139, 92, 246, 0.15); color: #7c3aed; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem;">
                  ${(e.teacherName||"م").trim().charAt(0)}
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <strong style="font-size: 0.95rem; color: var(--text-primary);">${e.teacherName||"معلم"}</strong>
                    ${Z(e.rating)}
                    ${r?'<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #059669; font-size: 0.7rem; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.3);">✅ تم الرد والتعامل</span>':n?'<span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #2563eb; font-size: 0.7rem; font-weight: 700; border: 1px solid rgba(59, 130, 246, 0.3);">👁️ تمت المراجعة</span>':'<span class="badge" style="background: rgba(139, 92, 246, 0.15); color: #7c3aed; font-size: 0.7rem; font-weight: 700; border: 1px solid rgba(139, 92, 246, 0.3);">✨ جديد</span>'}
                  </div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; margin-top: 0.15rem; flex-wrap: wrap;">
                    <span>🕒 ${s}</span>
                    ${e.teacherPhone?`<span>📱 ${e.teacherPhone}</span>`:""}
                    ${e.teacherEmail?`<span>✉️ ${e.teacherEmail}</span>`:""}
                  </div>
                </div>
              </div>

              <!-- Action buttons -->
              <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                ${m?`
                  <a href="${m}" target="_blank" class="btn btn-sm btn-secondary" style="color: #059669; border-color: rgba(16, 185, 129, 0.3); font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.25rem;" title="محادثة واتساب مباشرة">
                    <i data-lucide="phone" style="width: 13px; height: 13px;"></i>
                    <span>واتساب</span>
                  </a>
                `:""}

                <button type="button" class="btn btn-sm btn-primary btn-reply-feedback" data-id="${e.id}" data-teacher-id="${e.teacherId||""}" data-teacher-name="${e.teacherName||""}" data-topic="${e.topic||""}" data-message="${(e.message||"").replace(/"/g,"&quot;")}" style="background: #7c3aed; border-color: #7c3aed; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                  <i data-lucide="reply" style="width: 13px; height: 13px;"></i>
                  <span>${r?"تعديل الرد":"الرد على المعلم"}</span>
                </button>

                <button type="button" class="btn btn-sm btn-secondary btn-toggle-status" data-id="${e.id}" data-status="${e.status||"new"}" style="font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.25rem;" title="تغيير حالة الرأي">
                  <i data-lucide="${n?"rotate-ccw":"check"}" style="width: 13px; height: 13px;"></i>
                  <span>${n?"إعادة كجديد":"تمت المراجعة"}</span>
                </button>

                <button type="button" class="btn btn-sm btn-secondary btn-delete-feedback" data-id="${e.id}" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.2); font-size: 0.75rem; padding: 0.35rem 0.5rem;" title="حذف هذا الرأي">
                  <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
                </button>
              </div>
            </div>

            <!-- Subject & Question reference -->
            <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.55rem 0.75rem; font-size: 0.78rem;">
              <span style="color: #7c3aed; font-weight: 700;">الموضوع: </span>
              <strong style="color: var(--text-primary);">${e.topic||"استطلاع رأي عام"}</strong>
              ${e.question?`<div style="color: var(--text-muted); font-size: 0.74rem; margin-top: 0.15rem;">السؤال: ${e.question}</div>`:""}
            </div>

            <!-- Teacher Message Body -->
            <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.85rem; font-size: 0.88rem; color: var(--text-primary); line-height: 1.6; white-space: pre-line;">
              ${e.message||"لا يوجد نص"}
            </div>

            <!-- Admin Reply if exists -->
            ${e.adminReply?`
              <div class="reply-box">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: #7c3aed; display: flex; align-items: center; gap: 0.35rem;">
                    <i data-lucide="check-circle-2" style="width: 14px; height: 14px;"></i>
                    رد الإدارة (${e.adminName||"إدارة الأكاديمية"}):
                  </span>
                  <span style="font-size: 0.68rem; color: var(--text-muted);">${(g=e.repliedAt)!=null&&g.seconds?new Date(e.repliedAt.seconds*1e3).toLocaleString("ar-EG"):""}</span>
                </div>
                <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; margin: 0; white-space: pre-line;">${e.adminReply}</p>
              </div>
            `:""}
          </div>
        `}).join(""),window.lucide&&window.lucide.createIcons(),t.querySelectorAll(".btn-reply-feedback").forEach(e=>{e.addEventListener("click",()=>{const r=e.dataset.id,n=e.dataset.teacherId,c=e.dataset.teacherName,s=e.dataset.topic,o=e.dataset.message;document.getElementById("replyFeedbackId").value=r,document.getElementById("replyTeacherId").value=n,document.getElementById("replyTopic").value=s,document.getElementById("replyModalTeacherName").textContent=`المعلم: ${c}`,document.getElementById("replyModalTeacherMessage").textContent=o;const m=u.find(g=>g.id===r);document.getElementById("replyTextInput").value=(m==null?void 0:m.adminReply)||"";const p=document.getElementById("replyFeedbackModal");p&&(p.style.display="flex"),window.lucide&&window.lucide.createIcons()})}),t.querySelectorAll(".btn-toggle-status").forEach(e=>{e.addEventListener("click",async()=>{const r=e.dataset.id,c=e.dataset.status==="reviewed"?"new":"reviewed";try{await G(S(F,"feedbacks",r),{status:c}),l.success(c==="reviewed"?'تم تحديد الرأي كـ "تمت المراجعة"':"تمت إعادة تعيين حالة الرأي")}catch(s){console.error("Error updating status:",s),l.error("فشل تحديث الحالة: "+s.message)}})}),t.querySelectorAll(".btn-delete-feedback").forEach(e=>{e.addEventListener("click",()=>{const r=e.dataset.id;H("هل أنت متأكد من رغبتك في حذف هذا الرأي نهائياً؟",async()=>{try{await O(S(F,"feedbacks",r)),l.success("تم حذف الرأي بنجاح.")}catch(n){console.error("Error deleting feedback:",n),l.error("فشل حذف الرأي: "+n.message)}})})})}
