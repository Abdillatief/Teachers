import{T as h,s as T,d as $}from"./rbacService-Daqk2lPi.js";import{doc as C,updateDoc as I,serverTimestamp as P,increment as U}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";let t=null,L=null,B=null,E=!0;function z(i){if(!i)return"";let e=String(i).trim().replace(/\D/g,"");return e?(e.startsWith("00")?e=e.substring(2):e.startsWith("0")?e="20"+e.substring(1):e.length===10&&(e.startsWith("10")||e.startsWith("11")||e.startsWith("12")||e.startsWith("15"))&&(e="20"+e),e):""}function M(i,{studentName:e="الطالب",teacherName:n="المعلم المشرف",pkg:o=null,bal:a=null,customData:l={}}){const s=o&&o.remainingLessons!==void 0?o.remainingLessons:(a==null?void 0:a.balance)||0,m=o&&o.totalLessons||8,f=o?o.usedLessons||(m-s>=0?m-s:0):0,c=o?o.packageName||"باقة الحصص القرآنية":"الاشتراك الشهري",p=o?o.totalAmount||o.price||0:l.amount||0,r=o&&o.totalPaid!==void 0?o.totalPaid:l.paid||0,d=Math.max(0,p-r),b=`📲 *طرق التحويل والسداد المعتمدة للأكاديمية:*
📱 *فودافون كاش (Vodafone Cash):* 01094475649
⚡ *إنستاباي (InstaPay):* 01094475649`;switch(i){case"statement":return`السلام عليكم ورحمة الله وبركاته 🌸
تحية طيبة من إدارة *أكاديمية سَبِيل لعلوم القرآن الكريم* 📖

📊 *كشف حساب ومتابعة حصص الدارس:*
👤 *اسم الدارس:* *${e}*
👳‍♂️ *المعلم المشرف:* *${n}*
📦 *الباقة التعليمية:* *${c}*

━━━━━━━━━━━━━━━━━━━
📌 *موقف وسجل الحصص:*
• إجمالي حصص الباقة: *${m} حصة*
• الحصص المنفذة: *${f} حصة*
• رصيد الحصص المتبقي: *${s} حصة* ${s<0?"🔴 (دين حصص مستهلكة)":s===0?"💳 (0 حصة - يستحق الدفع والتجديد)":s===1?"⏳ (قارب على الانتهاء - حصة واحدة متبقية)":""}

💳 *الموقف المالي والاشتراك:*
• إجمالي قيمة الباقة: *${p} ج.م*
• المبلغ المسدد: *${r} ج.م*
• المبلغ المتبقي للسداد: *${d} ج.م*
━━━━━━━━━━━━━━━━━━━

${b}

💡 *ملاحظة:* يرجى إرسال صورة إشعار التحويل بعد إتمام الدفع لتوثيق السند واستمرار الحصص بانتظام.

شاكرين ومقدرين حسن تعاونكم وحرصكم الكريم 🌿`;case"reminder":return`السلام عليكم ورحمة الله وبركاته 🌸
تحية طيبة من إدارة *أكاديمية سَبِيل لعلوم القرآن الكريم* 📖

نود تذكير سيادتكم الكريمة بموعد تجديد وسداد اشتراك باقة القرآن الكريم:
👤 *اسم الدارس:* *${e}*
👳‍♂️ *المعلم المشرف:* *${n}*
📦 *الباقة:* *${c}* (${m} حصة)
📊 *رصيد الحصص المتبقي:* *${s} حصة*
💰 *المبلغ المطلوب سداده:* *${d>0?d:p} ج.م*

━━━━━━━━━━━━━━━━━━━
${b}
━━━━━━━━━━━━━━━━━━━

نرجو التكرم بالتحويل وإرسال صورة إشعار السداد لضمان استمرار جدول الحصص ومتابعة التسميع بانتظام.

شاكرين ومقدرين حسن تعاونكم وحرصكم الكريم 🌿`;case"overdraft":return`السلام عليكم ورحمة الله وبركاته 🌸
تحية طيبة من إدارة *أكاديمية سَبِيل لعلوم القرآن الكريم* 📖

نحيط سيادتكم علماً بأن رصيد حصص القرآن الكريم للدارس:
👤 *اسم الدارس:* *${e}*
👳‍♂️ *المعلم المشرف:* *${n}*
📦 *الباقة:* *${c}*
⚠️ *رصيد الحصص الحالي:* (*${s} حصة*) — ${s<0?"يوجد دين حصص مستهلكة ومطلوب سداد الدين وتجديد الباقة.":s===0?"نفد الرصيد بالكامل والاشتراك يستحق الدفع والتجديد الآن.":"قارب الرصيد على الانتهاء."}
💰 *المبلغ المطلوب للتجديد والسداد:* *${p} ج.م*

━━━━━━━━━━━━━━━━━━━
${b}
━━━━━━━━━━━━━━━━━━━

نرجو من سيادتكم سرعة تجديد الباقة وتحويل الرسوم لضمان استمرار الحصص ومتابعة التسميع دون انقطاع.

شاكرين ومقدرين حسن تفهمكم وتعاونكم الدائم 🌿`;case"receipt":const x=l.receiptNumber?String(l.receiptNumber).startsWith("REC-")?l.receiptNumber:`REC-${l.receiptNumber.substring?l.receiptNumber.substring(0,8).toUpperCase():l.receiptNumber}`:`REC-${Math.floor(1e3+Math.random()*9e3)}`,w=l.paidAmount||r||p,u=new Date().toLocaleDateString("ar-EG",{year:"numeric",month:"long",day:"numeric"});return`السلام عليكم ورحمة الله وبركاته 🌸
تحية طيبة من إدارة *أكاديمية سَبِيل لعلوم القرآن الكريم* 📖

🧾 *إشعار استلام وسداد مالي معتمد*
تم بحمد الله وتوفيقه استلام وتوثيق دفعة مالية:
👤 *اسم الدارس:* *${e}*
👳‍♂️ *المعلم المشرف:* *${n}*
📦 *الباقة:* *${c}*
💵 *المبلغ المستلم:* *${w} ج.م*
${d>0?`⏳ *المبلغ المتبقي:* *${d} ج.م*
`:""}📊 *رصيد الحصص المتاح:* *${s} حصة*
🔢 *رقم السند المالي:* *#${x}*
📅 *تاريخ التوثيق:* ${u}

تقبل الله منا ومنكم صالح الأعمال، وشاكرين ومقدرين حرصكم الكريم 🌿`;case"custom":default:return`السلام عليكم ورحمة الله وبركاته 🌸
تحية طيبة من إدارة *أكاديمية سَبِيل لعلوم القرآن الكريم* 📖
بخصوص الدارس: *${e}*
المعلم المشرف: *${n}*
الباقة: *${c}* (رصيد الحصص: ${s} حصة)

...

${b}`}}function N(){if(document.getElementById("universalWhatsAppWidgetModal"))return;document.body.insertAdjacentHTML("beforeend",`
    <div id="universalWhatsAppWidgetModal" class="modal-overlay" style="display: none; z-index: var(--z-modal); position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); align-items: center; justify-content: center; padding: 1rem;">
      <div class="modal-card" style="background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; max-width: 540px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); overflow: hidden; animation: fadeIn 0.2s ease-out;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; background: var(--bg-primary, #f8fafc); border-bottom: 1px solid var(--border-color, #e2e8f0);">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(37, 211, 102, 0.15); display: flex; align-items: center; justify-content: center; color: #16a34a;">
              <i data-lucide="message-square" style="width: 18px; height: 18px;"></i>
            </div>
            <div>
              <h3 style="font-weight: 800; color: var(--text-primary, #0f172a); margin: 0; font-size: 1rem; line-height: 1.2;">
                تذكير ومراسلة ولي الأمر عبر واتساب
              </h3>
              <span id="uWaStudentSubtitle" style="font-size: 0.75rem; color: var(--text-muted, #64748b);">الطالب: -</span>
            </div>
          </div>
          <button type="button" id="btnUWaCloseModal" style="background: transparent; border: none; cursor: pointer; padding: 0.35rem; border-radius: 6px; color: var(--text-muted, #64748b); display: flex; align-items: center; justify-content: center;" title="إغلاق النافذة">
            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
          </button>
        </div>

        <!-- Body -->
        <div style="padding: 1.25rem; max-height: calc(85vh - 130px); overflow-y: auto;">
          
          <!-- Warning Counter & Status Banner -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem;" id="uWaCounterBanner">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.25rem;">⚠️</span>
              <div>
                <div style="font-size: 0.8rem; font-weight: 800; color: #166534;" id="uWaWarningTitle">
                  سجل التحذيرات والتنبيهات لولي الأمر
                </div>
                <div style="font-size: 0.75rem; color: #15803d;" id="uWaWarningDetails">
                  تم إرسال <strong id="uWaCountBadge" style="background: #16a34a; color: #fff; padding: 0.1rem 0.45rem; border-radius: 9999px; font-size: 0.75rem;">0</strong> تنبيهات سابقة
                </div>
              </div>
            </div>
            <button type="button" id="btnUWaResetCount" class="btn btn-secondary" style="font-size: 0.72rem; padding: 0.25rem 0.6rem; border-color: #86efac; color: #166534;" title="إعادة تصفير العداد لدورة شهرية جديدة">
              <i data-lucide="rotate-ccw" style="width: 12px; height: 12px;"></i> تصفير
            </button>
          </div>

          <!-- Phone Number Input & Lock / Auto-save -->
          <div class="form-group" style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label for="uWaPhoneInput" style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary, #0f172a); margin: 0;">
                رقم هاتف ولي الأمر (واتساب):
              </label>
              <button type="button" id="btnUWaToggleLockPhone" style="font-size: 0.75rem; font-weight: 700; background: transparent; border: none; color: var(--primary-color, #0d9488); cursor: pointer; display: flex; align-items: center; gap: 0.25rem;">
                <i data-lucide="lock" id="uWaLockIcon" style="width: 13px; height: 13px;"></i>
                <span id="uWaLockText">مقفل كرابط دائم (انقر لتعديل الرقم)</span>
              </button>
            </div>
            
            <div style="position: relative; display: flex; gap: 0.4rem;">
              <input type="tel" id="uWaPhoneInput" class="form-control" placeholder="مثال: 01012345678" style="direction: ltr; text-align: left; font-family: monospace; font-size: 0.95rem; font-weight: 700; background-color: #f8fafc;" readonly>
              <button type="button" id="btnUWaSavePhone" class="btn btn-secondary" style="display: none; padding: 0.4rem 0.75rem; font-size: 0.8rem; font-weight: 700; color: var(--primary-color, #0d9488); white-space: nowrap;">
                <i data-lucide="check" style="width: 14px; height: 14px;"></i> حفظ الرقم
              </button>
            </div>
            
            <div id="uWaDirectLinkRow" style="margin-top: 0.35rem; font-size: 0.75rem; color: var(--text-muted, #64748b); display: flex; justify-content: space-between; align-items: center;">
              <span>الرابط المباشر: <a href="#" id="uWaDirectLinkAnchor" target="_blank" style="color: #16a34a; font-weight: 700; text-decoration: underline;">wa.me/20...</a></span>
              <span style="color: var(--text-muted, #94a3b8);">يتم الحفظ تلقائياً في قاعدة البيانات</span>
            </div>
          </div>

          <!-- Template selection -->
          <div class="form-group" style="margin-bottom: 1rem;">
            <label for="uWaTemplateSelect" style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary, #0f172a); margin-bottom: 0.35rem; display: block;">
              نوع التذكير / القالب التلقائي:
            </label>
            <select id="uWaTemplateSelect" class="form-control" style="width: 100%; border: 1px solid var(--border-color, #cbd5e1); font-size: 0.85rem; font-weight: 600;">
              <option value="reminder">🔔 تذكير بموعد تجديد وسداد الاشتراك الشهري</option>
              <option value="overdraft">⚠️ إنذار عجز الرصيد ونفاد باقة الحصص (مطالبة بالسداد)</option>
              <option value="statement">📊 كشف حساب الموقف المالي ورصيد الحصص المتبقية</option>
              <option value="receipt">🧾 إشعار توثيق سداد دفعة مالية وسند قبض</option>
              <option value="custom">✍️ رسالة تذكير مخصصة (كتابة حرة)</option>
            </select>
          </div>

          <!-- Message Textarea -->
          <div class="form-group" style="margin-bottom: 0.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label for="uWaMessagePreview" style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary, #0f172a); margin: 0;">
                نص رسالة التذكير (مسموح بالتعديل والإضافة):
              </label>
              <span style="font-size: 0.72rem; color: var(--text-muted, #64748b);">جاهز للإرسال الفوري</span>
            </div>
            <textarea id="uWaMessagePreview" class="form-control" rows="6" style="width: 100%; resize: vertical; font-family: inherit; font-size: 0.85rem; line-height: 1.5; border: 1px solid var(--border-color, #cbd5e1);" placeholder="اكتب نص الرسالة هنا..."></textarea>
          </div>

        </div>

        <!-- Footer -->
        <div style="display: flex; gap: 0.5rem; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; background: var(--bg-primary, #f8fafc); border-top: 1px solid var(--border-color, #e2e8f0);">
          <div style="font-size: 0.75rem; color: var(--text-muted, #64748b); display: flex; align-items: center; gap: 0.25rem;">
            <i data-lucide="shield-check" style="width: 14px; height: 14px; color: #16a34a;"></i>
            <span>تحديث عداد التحذيرات تلقائياً</span>
          </div>

          <div style="display: flex; gap: 0.5rem;">
            <button type="button" id="btnUWaCancelModal" class="btn btn-secondary" style="font-size: 0.85rem; padding: 0.45rem 0.85rem;">
              إلغاء
            </button>
            <button type="button" id="btnUWaSendWhatsApp" class="btn btn-primary" style="background: #25D366; border-color: #25D366; color: #ffffff; font-weight: 800; font-size: 0.85rem; padding: 0.45rem 1rem; display: flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="send" style="width: 15px; height: 15px;"></i>
              <span>إرسال وفتح واتساب</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  `),R()}function v(i){E=i;const e=document.getElementById("uWaPhoneInput"),n=document.getElementById("uWaLockIcon"),o=document.getElementById("uWaLockText"),a=document.getElementById("btnUWaSavePhone");e&&(i?(e.setAttribute("readonly","true"),e.style.backgroundColor="#f8fafc",a&&(a.style.display="none"),o&&(o.textContent="مقفل كرابط (انقر للتعديل)"),n&&n.setAttribute("data-lucide","lock")):(e.removeAttribute("readonly"),e.style.backgroundColor="#ffffff",e.focus(),a&&(a.style.display="inline-flex"),o&&(o.textContent="متاح للتعديل (انقر للقفل والحفظ)"),n&&n.setAttribute("data-lucide","unlock")),A(),window.lucide&&window.lucide.createIcons())}function A(){const i=document.getElementById("uWaPhoneInput"),e=document.getElementById("uWaDirectLinkAnchor");if(!i||!e)return;const n=i.value.trim(),o=z(n);o?(e.textContent=`wa.me/${o}`,e.href=`https://wa.me/${o}`,e.style.display="inline"):(e.textContent="لا يوجد رقم مسجل",e.href="#",e.style.display="inline")}async function W(i){if(!t||!t.id)return;const e=i.trim();try{const n=C($,"students",t.id);await I(n,{parentPhone:e,phone:e,whatsapp:e,updatedAt:P()}),t.parentPhone=e,t.phone=e,t.whatsapp=e,h.success("تم تحديث وحفظ رقم ولي الأمر في بيانات الطالب بنجاح! 💾")}catch(n){console.error("Error updating student phone:",n),h.error("حدث خطأ أثناء حفظ رقم الهاتف في قاعدة البيانات.")}}function R(){const i=document.getElementById("universalWhatsAppWidgetModal"),e=document.getElementById("uWaPhoneInput"),n=document.getElementById("uWaTemplateSelect"),o=document.getElementById("uWaMessagePreview"),a=document.getElementById("btnUWaCloseModal"),l=document.getElementById("btnUWaCancelModal"),s=document.getElementById("btnUWaToggleLockPhone"),m=document.getElementById("btnUWaSavePhone"),f=document.getElementById("btnUWaSendWhatsApp"),c=document.getElementById("btnUWaResetCount"),p=async()=>{if(!E&&e){const r=e.value.trim(),d=(t==null?void 0:t.parentPhone)||(t==null?void 0:t.phone)||"";r!==d&&r!==""&&await W(r),v(!0)}i.style.display="none"};a==null||a.addEventListener("click",p),l==null||l.addEventListener("click",p),e==null||e.addEventListener("input",()=>{A()}),e==null||e.addEventListener("blur",async()=>{const r=e.value.trim(),d=(t==null?void 0:t.parentPhone)||(t==null?void 0:t.phone)||"";r&&r!==d&&await W(r)}),s==null||s.addEventListener("click",async()=>{if(E)v(!1);else{const r=e.value.trim(),d=(t==null?void 0:t.parentPhone)||(t==null?void 0:t.phone)||"";r&&r!==d&&await W(r),v(!0)}}),m==null||m.addEventListener("click",async()=>{const r=e.value.trim();if(!r){h.warning("يرجى إدخال رقم الهاتف أولاً.");return}await W(r),v(!0)}),n==null||n.addEventListener("change",()=>{if(!t)return;const r=n.value,d=t.teacherName||"المعلم المشرف",g=M(r,{studentName:t.name||"طالب الأكاديمية",teacherName:d,pkg:L,bal:B,customData:t.customData||{}});o.value=g}),c==null||c.addEventListener("click",()=>{t!=null&&t.id&&T("هل تريد إعادة تصفير عداد التحذيرات لهذا الطالب؟",async()=>{try{const r=C($,"students",t.id);await I(r,{waWarningCount:0,lastWaWarningAt:null}),t.waWarningCount=0,k(0),h.success("تم تصفير عداد التحذيرات بنجاح.")}catch(r){console.error("Error resetting counter:",r),h.error("تعذر تصفير العداد.")}})}),f==null||f.addEventListener("click",async()=>{const r=e.value.trim(),d=o.value.trim();if(!r){h.warning("يرجى إدخال رقم هاتف ولي الأمر أولاً."),v(!1);return}const g=z(r);if(!g||g.length<8){h.warning("يرجى التأكد من صحة رقم الهاتف المكتوب.");return}const y=(t==null?void 0:t.parentPhone)||(t==null?void 0:t.phone)||"";if(r!==y&&await W(r),t!=null&&t.id)try{const u=C($,"students",t.id);await I(u,{waWarningCount:U(1),lastWaWarningAt:P(),lastWaWarningMessage:d.substring(0,200)}),t.waWarningCount=(t.waWarningCount||0)+1,k(t.waWarningCount)}catch(u){console.warn("Could not increment warning count in Firestore:",u)}const b=encodeURIComponent(d),x=`https://wa.me/${g}?text=${b}`,w=window.open(x,"_blank");if(!w||w.closed||typeof w.closed>"u"){const u=document.createElement("a");u.href=x,u.target="_blank",u.rel="noopener noreferrer",document.body.appendChild(u),u.click(),document.body.removeChild(u)}i.style.display="none",h.success(`تم فتح محادثة واتساب بنجاح! 🚀 (إجمالي التحذيرات: ${(t==null?void 0:t.waWarningCount)||1})`)})}function k(i=0){const e=document.getElementById("uWaCountBadge"),n=document.getElementById("uWaCounterBanner"),o=document.getElementById("uWaWarningDetails");e&&(e.textContent=`${i}`),n&&(i===0?(n.style.background="#f0fdf4",n.style.borderColor="#bbf7d0",o&&(o.innerHTML='لم يتم إرسال أي تحذيرات سابقة <strong id="uWaCountBadge" style="background:#16a34a;color:#fff;padding:0.1rem 0.45rem;border-radius:9999px;font-size:0.75rem;">0</strong>')):i<=2?(n.style.background="#fffbeb",n.style.borderColor="#fde68a",o&&(o.innerHTML=`تم إرسال <strong id="uWaCountBadge" style="background:#d97706;color:#fff;padding:0.1rem 0.45rem;border-radius:9999px;font-size:0.75rem;">${i}</strong> تنبيهات سابقة لولي الأمر`)):(n.style.background="#fef2f2",n.style.borderColor="#fecaca",o&&(o.innerHTML=`⚠️ تنبيه: تم تحذير ولي الأمر <strong id="uWaCountBadge" style="background:#dc2626;color:#fff;padding:0.1rem 0.45rem;border-radius:9999px;font-size:0.75rem;">${i}</strong> مرات سابقة!`)))}function _({student:i,pkg:e=null,bal:n=null,templateType:o=null,customData:a={}}){N(),t=i?{...i,customData:a}:{id:null,name:"طالب",customData:a},L=e,B=n;const l=document.getElementById("universalWhatsAppWidgetModal"),s=document.getElementById("uWaStudentSubtitle"),m=document.getElementById("uWaPhoneInput"),f=document.getElementById("uWaTemplateSelect"),c=document.getElementById("uWaMessagePreview"),p=t.name||"طالب الأكاديمية",r=t.teacherName||"المعلم المشرف",d=t.parentPhone||t.phone||t.whatsapp||"",g=parseInt(t.waWarningCount,10)||0;s&&(s.textContent=`الدارس: ${p} • المعلم: ${r}`),m&&(m.value=d),k(g),v(!0);let y=o;y||((e&&e.remainingLessons!==void 0?e.remainingLessons:(n==null?void 0:n.balance)||0)<=0?y="overdraft":y="reminder"),f&&(f.value=y);const b=M(y,{studentName:p,teacherName:r,pkg:e,bal:n,customData:a});c&&(c.value=b),l.style.display="flex",window.lucide&&window.lucide.createIcons()}function F(i=0){const e=parseInt(i,10)||0;return e===0?'<span class="badge" style="background: rgba(148, 163, 184, 0.12); color: var(--text-muted, #64748b); font-size: 0.7rem; font-weight: 600;" title="لم يتم إرسال تحذيرات بعد">0 تنبيه</span>':e<=2?`<span class="badge" style="background: rgba(245, 158, 11, 0.12); color: #d97706; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.2rem;" title="تم إرسال ${e} تنبيهات سابقة"><i data-lucide="bell" style="width: 11px; height: 11px;"></i> ${e} تنبيه</span>`:`<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.3); font-size: 0.72rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.2rem;" title="تنبيه: تم تحذير ولي الأمر ${e} مرات"><i data-lucide="bell-ring" style="width: 11px; height: 11px;"></i> ${e} تحذيرات ⚠️</span>`}export{_ as o,F as r};
