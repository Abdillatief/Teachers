import { db } from '../../config/firebase.js';
import { doc, getDoc, updateDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from './toast.js';
import { showCustomConfirm } from './helpers.js';

let activeStudentData = null;
let activePackageData = null;
let activeBalanceData = null;
let isNumberLocked = true;

/**
 * Ensures phone number is formatted for WhatsApp (wa.me)
 * Defaults to Egypt (+20) if starting with 0 or standard Egyptian 10-digit formats
 */
export function formatWhatsAppPhone(rawPhone) {
  if (!rawPhone) return '';
  let clean = String(rawPhone).trim().replace(/\D/g, '');
  if (!clean) return '';

  if (clean.startsWith('00')) {
    clean = clean.substring(2);
  } else if (clean.startsWith('0')) {
    clean = '20' + clean.substring(1);
  } else if (clean.length === 10 && (clean.startsWith('10') || clean.startsWith('11') || clean.startsWith('12') || clean.startsWith('15'))) {
    clean = '20' + clean;
  }
  return clean;
}

/**
 * Builds standard automated message templates with verified financials, session balances, and fixed payment channels
 */
export function generateWhatsAppMessage(templateType, { studentName = 'الطالب', teacherName = 'المعلم المشرف', pkg = null, bal = null, customData = {} }) {
  const rem = pkg ? (pkg.remainingLessons !== undefined ? pkg.remainingLessons : (bal?.balance || 0)) : (bal?.balance || 0);
  const total = pkg ? (pkg.totalLessons || 8) : 8;
  const used = pkg ? (pkg.usedLessons || (total - rem >= 0 ? total - rem : 0)) : 0;
  const pkgName = pkg ? (pkg.packageName || 'باقة الحصص القرآنية') : 'الاشتراك الشهري';
  const totalAmount = pkg ? (pkg.totalAmount || pkg.price || 0) : (customData.amount || 0);
  const totalPaid = pkg ? (pkg.totalPaid !== undefined ? pkg.totalPaid : (customData.paid || 0)) : (customData.paid || 0);
  const remainingDebt = Math.max(0, totalAmount - totalPaid);
  
  // بيانات التحويل والدفع المعتمدة الرسمية لأكاديمية سبيل
  const vodafoneCashNumber = "01094475649";
  const instapayId = "01094475649";

  const paymentDetailsBlock = `📲 *طرق التحويل والسداد المعتمدة للأكاديمية:*
📱 *فودافون كاش (Vodafone Cash):* ${vodafoneCashNumber}
⚡ *إنستاباي (InstaPay):* ${instapayId}`;

  switch (templateType) {
    case 'statement':
      return `السلام عليكم ورحمة الله وبركاته 🌸
تحية طيبة من إدارة *أكاديمية سَبِيل لعلوم القرآن الكريم* 📖

📊 *كشف حساب ومتابعة حصص الدارس:*
👤 *اسم الدارس:* *${studentName}*
👳‍♂️ *المعلم المشرف:* *${teacherName}*
📦 *الباقة التعليمية:* *${pkgName}*

━━━━━━━━━━━━━━━━━━━
📌 *موقف وسجل الحصص:*
• إجمالي حصص الباقة: *${total} حصة*
• الحصص المنفذة: *${used} حصة*
• رصيد الحصص المتبقي: *${rem} حصة* ${rem <= 0 ? '⚠️ (الرصيد منتهٍ)' : ''}

💳 *الموقف المالي والاشتراك:*
• إجمالي قيمة الباقة: *${totalAmount} ج.م*
• المبلغ المسدد: *${totalPaid} ج.م*
• المبلغ المتبقي للسداد: *${remainingDebt} ج.م*
━━━━━━━━━━━━━━━━━━━

${paymentDetailsBlock}

💡 *ملاحظة:* يرجى إرسال صورة إشعار التحويل بعد إتمام الدفع لتوثيق السند واستمرار الحصص بانتظام.

شاكرين ومقدرين حسن تعاونكم وحرصكم الكريم 🌿`;

    case 'reminder':
      return `السلام عليكم ورحمة الله وبركاته 🌸
تحية طيبة من إدارة *أكاديمية سَبِيل لعلوم القرآن الكريم* 📖

نود تذكير سيادتكم الكريمة بموعد تجديد وسداد اشتراك باقة القرآن الكريم:
👤 *اسم الدارس:* *${studentName}*
👳‍♂️ *المعلم المشرف:* *${teacherName}*
📦 *الباقة:* *${pkgName}* (${total} حصة)
📊 *رصيد الحصص المتبقي:* *${rem} حصة*
💰 *المبلغ المطلوب سداده:* *${remainingDebt > 0 ? remainingDebt : totalAmount} ج.م*

━━━━━━━━━━━━━━━━━━━
${paymentDetailsBlock}
━━━━━━━━━━━━━━━━━━━

نرجو التكرم بالتحويل وإرسال صورة إشعار السداد لضمان استمرار جدول الحصص ومتابعة التسميع بانتظام.

شاكرين ومقدرين حسن تعاونكم وحرصكم الكريم 🌿`;

    case 'overdraft':
      return `السلام عليكم ورحمة الله وبركاته 🌸
تحية طيبة من إدارة *أكاديمية سَبِيل لعلوم القرآن الكريم* 📖

نحيط سيادتكم علماً بأن رصيد حصص القرآن الكريم للدارس:
👤 *اسم الدارس:* *${studentName}*
👳‍♂️ *المعلم المشرف:* *${teacherName}*
📦 *الباقة:* *${pkgName}*
⚠️ *رصيد الحصص الحالي:* (*${rem} حصة*) — نفد الرصيد بالكامل.
💰 *المبلغ المطلوب للتجديد والسداد:* *${totalAmount} ج.م*

━━━━━━━━━━━━━━━━━━━
${paymentDetailsBlock}
━━━━━━━━━━━━━━━━━━━

نرجو من سيادتكم سرعة تجديد الباقة وتحويل الرسوم لضمان استمرار الحصص ومتابعة التسميع دون انقطاع.

شاكرين ومقدرين حسن تفهمكم وتعاونكم الدائم 🌿`;

    case 'receipt':
      const receiptNo = customData.receiptNumber ? (String(customData.receiptNumber).startsWith('REC-') ? customData.receiptNumber : `REC-${customData.receiptNumber.substring ? customData.receiptNumber.substring(0, 8).toUpperCase() : customData.receiptNumber}`) : `REC-${Math.floor(1000 + Math.random() * 9000)}`;
      const paidAmt = customData.paidAmount || totalPaid || totalAmount;
      const todayDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
      return `السلام عليكم ورحمة الله وبركاته 🌸
تحية طيبة من إدارة *أكاديمية سَبِيل لعلوم القرآن الكريم* 📖

🧾 *إشعار استلام وسداد مالي معتمد*
تم بحمد الله وتوفيقه استلام وتوثيق دفعة مالية:
👤 *اسم الدارس:* *${studentName}*
👳‍♂️ *المعلم المشرف:* *${teacherName}*
📦 *الباقة:* *${pkgName}*
💵 *المبلغ المستلم:* *${paidAmt} ج.م*
${remainingDebt > 0 ? `⏳ *المبلغ المتبقي:* *${remainingDebt} ج.م*\n` : ''}📊 *رصيد الحصص المتاح:* *${rem} حصة*
🔢 *رقم السند المالي:* *#${receiptNo}*
📅 *تاريخ التوثيق:* ${todayDate}

تقبل الله منا ومنكم صالح الأعمال، وشاكرين ومقدرين حرصكم الكريم 🌿`;

    case 'custom':
    default:
      return `السلام عليكم ورحمة الله وبركاته 🌸
تحية طيبة من إدارة *أكاديمية سَبِيل لعلوم القرآن الكريم* 📖
بخصوص الدارس: *${studentName}*
المعلم المشرف: *${teacherName}*
الباقة: *${pkgName}* (رصيد الحصص: ${rem} حصة)

...

${paymentDetailsBlock}`;
  }
}

/**
 * Injects modal HTML if not already created
 */
function ensureModalDom() {
  if (document.getElementById('universalWhatsAppWidgetModal')) return;

  const modalHtml = `
    <div id="universalWhatsAppWidgetModal" class="modal-overlay" style="display: none; z-index: 10000; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); align-items: center; justify-content: center; padding: 1rem;">
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
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  attachModalEventListeners();
}

/**
 * Sets phone input lock state
 */
function setPhoneLockState(locked) {
  isNumberLocked = locked;
  const input = document.getElementById('uWaPhoneInput');
  const lockIcon = document.getElementById('uWaLockIcon');
  const lockText = document.getElementById('uWaLockText');
  const saveBtn = document.getElementById('btnUWaSavePhone');

  if (!input) return;

  if (locked) {
    input.setAttribute('readonly', 'true');
    input.style.backgroundColor = '#f8fafc';
    if (saveBtn) saveBtn.style.display = 'none';
    if (lockText) lockText.textContent = 'مقفل كرابط (انقر للتعديل)';
    if (lockIcon) lockIcon.setAttribute('data-lucide', 'lock');
  } else {
    input.removeAttribute('readonly');
    input.style.backgroundColor = '#ffffff';
    input.focus();
    if (saveBtn) saveBtn.style.display = 'inline-flex';
    if (lockText) lockText.textContent = 'متاح للتعديل (انقر للقفل والحفظ)';
    if (lockIcon) lockIcon.setAttribute('data-lucide', 'unlock');
  }

  updateDirectLinkPreview();
  if (window.lucide) window.lucide.createIcons();
}

/**
 * Updates direct wa.me link preview
 */
function updateDirectLinkPreview() {
  const input = document.getElementById('uWaPhoneInput');
  const anchor = document.getElementById('uWaDirectLinkAnchor');
  if (!input || !anchor) return;

  const raw = input.value.trim();
  const clean = formatWhatsAppPhone(raw);
  if (clean) {
    anchor.textContent = `wa.me/${clean}`;
    anchor.href = `https://wa.me/${clean}`;
    anchor.style.display = 'inline';
  } else {
    anchor.textContent = 'لا يوجد رقم مسجل';
    anchor.href = '#';
    anchor.style.display = 'inline';
  }
}

/**
 * Persists phone number to Firestore for the student
 */
async function saveStudentPhone(newPhone) {
  if (!activeStudentData || !activeStudentData.id) return;
  const clean = newPhone.trim();

  try {
    const studentRef = doc(db, "students", activeStudentData.id);
    await updateDoc(studentRef, {
      parentPhone: clean,
      phone: clean,
      whatsapp: clean,
      updatedAt: serverTimestamp()
    });
    activeStudentData.parentPhone = clean;
    activeStudentData.phone = clean;
    activeStudentData.whatsapp = clean;
    Toast.success("تم تحديث وحفظ رقم ولي الأمر في بيانات الطالب بنجاح! 💾");
  } catch (err) {
    console.error("Error updating student phone:", err);
    Toast.error("حدث خطأ أثناء حفظ رقم الهاتف في قاعدة البيانات.");
  }
}

/**
 * Attach static listeners to modal elements once
 */
function attachModalEventListeners() {
  const modal = document.getElementById('universalWhatsAppWidgetModal');
  const phoneInput = document.getElementById('uWaPhoneInput');
  const templateSelect = document.getElementById('uWaTemplateSelect');
  const msgPreview = document.getElementById('uWaMessagePreview');
  const closeBtn = document.getElementById('btnUWaCloseModal');
  const cancelBtn = document.getElementById('btnUWaCancelModal');
  const toggleLockBtn = document.getElementById('btnUWaToggleLockPhone');
  const savePhoneBtn = document.getElementById('btnUWaSavePhone');
  const sendBtn = document.getElementById('btnUWaSendWhatsApp');
  const resetCountBtn = document.getElementById('btnUWaResetCount');

  const closeModal = async () => {
    // If phone was being edited, save and lock before closing
    if (!isNumberLocked && phoneInput) {
      const val = phoneInput.value.trim();
      const orig = activeStudentData?.parentPhone || activeStudentData?.phone || '';
      if (val !== orig && val !== '') {
        await saveStudentPhone(val);
      }
      setPhoneLockState(true);
    }
    modal.style.display = 'none';
  };

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  // Phone input changes
  phoneInput?.addEventListener('input', () => {
    updateDirectLinkPreview();
  });

  // Blur on phone input auto-saves if modified
  phoneInput?.addEventListener('blur', async () => {
    const val = phoneInput.value.trim();
    const orig = activeStudentData?.parentPhone || activeStudentData?.phone || '';
    if (val && val !== orig) {
      await saveStudentPhone(val);
    }
  });

  toggleLockBtn?.addEventListener('click', async () => {
    if (!isNumberLocked) {
      // Switching to locked: Save immediately
      const val = phoneInput.value.trim();
      const orig = activeStudentData?.parentPhone || activeStudentData?.phone || '';
      if (val && val !== orig) {
        await saveStudentPhone(val);
      }
      setPhoneLockState(true);
    } else {
      setPhoneLockState(false);
    }
  });

  savePhoneBtn?.addEventListener('click', async () => {
    const val = phoneInput.value.trim();
    if (!val) {
      Toast.warning("يرجى إدخال رقم الهاتف أولاً.");
      return;
    }
    await saveStudentPhone(val);
    setPhoneLockState(true);
  });

  templateSelect?.addEventListener('change', () => {
    if (!activeStudentData) return;
    const type = templateSelect.value;
    const teacherName = activeStudentData.teacherName || 'المعلم المشرف';
    const text = generateWhatsAppMessage(type, {
      studentName: activeStudentData.name || 'طالب الأكاديمية',
      teacherName: teacherName,
      pkg: activePackageData,
      bal: activeBalanceData,
      customData: activeStudentData.customData || {}
    });
    msgPreview.value = text;
  });

  resetCountBtn?.addEventListener('click', () => {
    if (!activeStudentData?.id) return;
    showCustomConfirm("هل تريد إعادة تصفير عداد التحذيرات لهذا الطالب؟", async () => {
      try {
        const studentRef = doc(db, "students", activeStudentData.id);
        await updateDoc(studentRef, {
          waWarningCount: 0,
          lastWaWarningAt: null
        });
        activeStudentData.waWarningCount = 0;
        updateWarningCounterUI(0);
        Toast.success("تم تصفير عداد التحذيرات بنجاح.");
      } catch (e) {
        console.error("Error resetting counter:", e);
        Toast.error("تعذر تصفير العداد.");
      }
    });
  });

  sendBtn?.addEventListener('click', async () => {
    const rawPhone = phoneInput.value.trim();
    const message = msgPreview.value.trim();

    if (!rawPhone) {
      Toast.warning("يرجى إدخال رقم هاتف ولي الأمر أولاً.");
      setPhoneLockState(false);
      return;
    }

    const cleanPhone = formatWhatsAppPhone(rawPhone);
    if (!cleanPhone || cleanPhone.length < 8) {
      Toast.warning("يرجى التأكد من صحة رقم الهاتف المكتوب.");
      return;
    }

    // Auto-save phone if changed
    const orig = activeStudentData?.parentPhone || activeStudentData?.phone || '';
    if (rawPhone !== orig) {
      await saveStudentPhone(rawPhone);
    }

    // Increment warning counter in Firestore
    if (activeStudentData?.id) {
      try {
        const studentRef = doc(db, "students", activeStudentData.id);
        await updateDoc(studentRef, {
          waWarningCount: increment(1),
          lastWaWarningAt: serverTimestamp(),
          lastWaWarningMessage: message.substring(0, 200)
        });
        activeStudentData.waWarningCount = (activeStudentData.waWarningCount || 0) + 1;
        updateWarningCounterUI(activeStudentData.waWarningCount);
      } catch (err) {
        console.warn("Could not increment warning count in Firestore:", err);
      }
    }

    // Open WhatsApp Chat
    const encodedMsg = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    
    // Attempt window.open with a fallback to anchor click
    const win = window.open(waUrl, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      const a = document.createElement('a');
      a.href = waUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    modal.style.display = 'none';
    Toast.success(`تم فتح محادثة واتساب بنجاح! 🚀 (إجمالي التحذيرات: ${activeStudentData?.waWarningCount || 1})`);
  });
}

function updateWarningCounterUI(count = 0) {
  const badge = document.getElementById('uWaCountBadge');
  const banner = document.getElementById('uWaCounterBanner');
  const details = document.getElementById('uWaWarningDetails');

  if (badge) badge.textContent = `${count}`;

  if (banner) {
    if (count === 0) {
      banner.style.background = '#f0fdf4';
      banner.style.borderColor = '#bbf7d0';
      if (details) details.innerHTML = `لم يتم إرسال أي تحذيرات سابقة <strong id="uWaCountBadge" style="background:#16a34a;color:#fff;padding:0.1rem 0.45rem;border-radius:9999px;font-size:0.75rem;">0</strong>`;
    } else if (count <= 2) {
      banner.style.background = '#fffbeb';
      banner.style.borderColor = '#fde68a';
      if (details) details.innerHTML = `تم إرسال <strong id="uWaCountBadge" style="background:#d97706;color:#fff;padding:0.1rem 0.45rem;border-radius:9999px;font-size:0.75rem;">${count}</strong> تنبيهات سابقة لولي الأمر`;
    } else {
      banner.style.background = '#fef2f2';
      banner.style.borderColor = '#fecaca';
      if (details) details.innerHTML = `⚠️ تنبيه: تم تحذير ولي الأمر <strong id="uWaCountBadge" style="background:#dc2626;color:#fff;padding:0.1rem 0.45rem;border-radius:9999px;font-size:0.75rem;">${count}</strong> مرات سابقة!`;
    }
  }
}

/**
 * Public method to open WhatsApp Reminder Widget for any student
 * 
 * @param {Object} options
 * @param {Object} options.student - Student object { id, name, phone, parentPhone, whatsapp, waWarningCount, teacherName, ... }
 * @param {Object} [options.pkg] - Package object { packageName, remainingLessons, totalLessons, price, ... }
 * @param {Object} [options.bal] - Balance object
 * @param {string} [options.templateType] - 'reminder' | 'overdraft' | 'statement' | 'receipt' | 'custom'
 * @param {Object} [options.customData] - Optional extra parameters (receiptNumber, paidAmount, etc.)
 */
export function openWhatsAppReminderWidget({ student, pkg = null, bal = null, templateType = null, customData = {} }) {
  ensureModalDom();

  activeStudentData = student ? { ...student, customData } : { id: null, name: 'طالب', customData };
  activePackageData = pkg;
  activeBalanceData = bal;

  const modal = document.getElementById('universalWhatsAppWidgetModal');
  const studentSubtitle = document.getElementById('uWaStudentSubtitle');
  const phoneInput = document.getElementById('uWaPhoneInput');
  const templateSelect = document.getElementById('uWaTemplateSelect');
  const msgPreview = document.getElementById('uWaMessagePreview');

  const studentName = activeStudentData.name || 'طالب الأكاديمية';
  const teacherName = activeStudentData.teacherName || 'المعلم المشرف';
  const phone = activeStudentData.parentPhone || activeStudentData.phone || activeStudentData.whatsapp || '';
  const warningCount = parseInt(activeStudentData.waWarningCount, 10) || 0;

  if (studentSubtitle) {
    studentSubtitle.textContent = `الدارس: ${studentName} • المعلم: ${teacherName}`;
  }

  if (phoneInput) {
    phoneInput.value = phone;
  }

  updateWarningCounterUI(warningCount);
  setPhoneLockState(true); // default locked as link

  // Decide best template automatically if not specified
  let chosenTemplate = templateType;
  if (!chosenTemplate) {
    const rem = pkg ? (pkg.remainingLessons !== undefined ? pkg.remainingLessons : (bal?.balance || 0)) : (bal?.balance || 0);
    if (rem <= 0) {
      chosenTemplate = 'overdraft';
    } else {
      chosenTemplate = 'reminder';
    }
  }

  if (templateSelect) {
    templateSelect.value = chosenTemplate;
  }

  const generatedMsg = generateWhatsAppMessage(chosenTemplate, {
    studentName,
    teacherName,
    pkg,
    bal,
    customData
  });

  if (msgPreview) {
    msgPreview.value = generatedMsg;
  }

  modal.style.display = 'flex';
  if (window.lucide) window.lucide.createIcons();
}

/**
 * Returns HTML for warning count badge to be displayed next to WhatsApp buttons in tables
 */
export function renderWarningCountBadge(count = 0) {
  const num = parseInt(count, 10) || 0;
  if (num === 0) {
    return `<span class="badge" style="background: rgba(148, 163, 184, 0.12); color: var(--text-muted, #64748b); font-size: 0.7rem; font-weight: 600;" title="لم يتم إرسال تحذيرات بعد">0 تنبيه</span>`;
  } else if (num <= 2) {
    return `<span class="badge" style="background: rgba(245, 158, 11, 0.12); color: #d97706; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.2rem;" title="تم إرسال ${num} تنبيهات سابقة"><i data-lucide="bell" style="width: 11px; height: 11px;"></i> ${num} تنبيه</span>`;
  } else {
    return `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.3); font-size: 0.72rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.2rem;" title="تنبيه: تم تحذير ولي الأمر ${num} مرات"><i data-lucide="bell-ring" style="width: 11px; height: 11px;"></i> ${num} تحذيرات ⚠️</span>`;
  }
}
