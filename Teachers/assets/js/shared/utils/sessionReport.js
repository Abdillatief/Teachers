import { Toast } from './toast.js';
import { openExternalUrl } from './medianBridge.js';

/**
 * تقارير الحصص على واتساب — أكاديمية سبيل
 *
 * - كل طالب له جروبه الخاص، ورابط الدعوة محفوظ في مستنده: students.whatsappGroupLink
 * - بعد تسجيل الحصة يُبنى التقرير من قالب الأكاديمية، ويُنسخ ثم يُفتح جروب الطالب
 * - حصة المجموعة تنتج تقريراً مستقلاً لكل طالب حاضر، كل واحد إلى جروبه
 */

const REPORT_FOOTER = `🪷🪷🪷🪷🪷🪷
رزقنا الله واياكم الإخلاص والثبات وجعلنا الله واياكم من أهل القرآن ورزقنا العلم والعمل به✨✨
🪷🪷🪷🪷🪷🪷`;

const valueOrDash = (value) => {
  const text = value === undefined || value === null ? '' : String(value).trim();
  return text || '—';
};

const escapeHtml = (value) => String(value === undefined || value === null ? '' : value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

/** نص تقرير حصة واحدة بقالب الأكاديمية. */
export function buildSessionReportText({ studentName = '', circleNumber = '', date = '', memorization = '', review = '' } = {}) {
  return `🎗️ *اسم الطالب/ة* : ${valueOrDash(studentName)}

🌀 *رقم الحلقة* : ${valueOrDash(circleNumber)}

🗓 *التاريخ* : ${valueOrDash(date)}

☘️ *الحفظ*: 
${valueOrDash(memorization)}

☘️ *الماضي* : 
${valueOrDash(review)}

${REPORT_FOOTER}`;
}

/** تاريخ عربي مقروء من YYYY-MM-DD أو ISO. */
export function formatSessionReportDate(rawDate) {
  if (!rawDate) return '';
  const parsed = new Date(`${String(rawDate).split('T')[0]}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? String(rawDate)
    : parsed.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** يوحّد رابط جروب واتساب أو كود الدعوة إلى رابط صالح. */
export function normalizeWhatsAppGroupLink(rawLink) {
  const raw = String(rawLink || '').trim();
  if (!raw) return '';
  if (/^[A-Za-z0-9]{10,}$/.test(raw)) return `https://chat.whatsapp.com/${raw}`;
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, '');
  return `https://${raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '')}`.replace(/\/+$/, '');
}

/**
 * رقم الحلقة داخل الباقة الحالية (وليس إجمالي حصص الطالب):
 * (إجمالي حصص الباقة - المتبقي) + 1، فالحلقة الثالثة في الباقة تُكتب 3.
 * ولو تجاوز الطالب رصيد الباقة تُكتب مثل «4 -1» (رقم الحلقة ثم عدد الحصص المدينة بعدها).
 */
export function buildCircleNumberLabel(student = {}) {
  const totalLessons = parseInt(student.totalLessons ?? student.totalPackageLessons ?? student.totalSessions ?? 0, 10) || 0;
  const remainingRaw = parseInt(student.remainingLessons ?? student.remainingSessions, 10);
  const hasRemaining = Number.isFinite(remainingRaw);
  const usedRaw = parseInt(student.usedLessons ?? student.usedPackageLessons, 10);

  // الباقة الحالية هي المرجع: المستخدم = إجمالي الباقة - المتبقي،
  // وأرقام الطالب المباشرة احتياطي لو كانت بيانات الباقة غير متسقة
  let usedLessons = Number.isFinite(usedRaw) ? Math.max(0, usedRaw) : null;
  if (hasRemaining && totalLessons > 0 && (remainingRaw <= totalLessons || remainingRaw < 0)) {
    usedLessons = Math.max(0, totalLessons - remainingRaw);
  }

  if (totalLessons > 0 && usedLessons !== null) {
    const sessionNumber = usedLessons + 1;
    const remainingAfterSession = hasRemaining ? remainingRaw - 1 : totalLessons - sessionNumber;
    const debt = remainingAfterSession < 0 ? Math.abs(remainingAfterSession) : 0;
    return debt > 0 ? `${sessionNumber} -${debt}` : String(sessionNumber);
  }

  return String(student.circleNumber || student.groupName || '').trim();
}

/** نسخ النص للحافظة مع بديل يعمل داخل WebView التطبيق. */
export async function copyReportText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard API unavailable, falling back:', err);
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', 'readonly');
    area.style.cssText = 'position:fixed;top:-1000px;opacity:0;';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch (err) {
    console.error('Copy fallback failed:', err);
    return false;
  }
}

const MODAL_ID = 'sessionReportModal';

function ensureModalDom() {
  if (document.getElementById(MODAL_ID)) return;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="${MODAL_ID}" class="modal-overlay" style="display:none; position:fixed; inset:0; z-index:10050; background:rgba(15,23,42,.6); align-items:center; justify-content:center; padding:1rem;">
      <div class="card" style="width:100%; max-width:620px; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; margin:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:.5rem; padding:.9rem 1.15rem; border-bottom:1px solid var(--border-color);">
          <div style="min-width:0;">
            <h3 style="margin:0; font-size:.95rem; font-weight:800; color:var(--text-primary);">تقرير الحصة — إرسال لجروب الطالب</h3>
            <span id="srSubtitle" style="font-size:.72rem; color:var(--text-muted);">—</span>
          </div>
          <button type="button" id="srClose" style="background:transparent; border:none; cursor:pointer; color:var(--text-muted); display:flex;">
            <i data-lucide="x" style="width:20px; height:20px;"></i>
          </button>
        </div>

        <div id="srList" style="padding:1rem 1.15rem; overflow-y:auto; display:flex; flex-direction:column; gap:.85rem;"></div>

        <div style="display:flex; justify-content:space-between; align-items:center; gap:.5rem; padding:.8rem 1.15rem; border-top:1px solid var(--border-color); flex-wrap:wrap;">
          <span style="font-size:.72rem; color:var(--text-muted);">يُنسخ التقرير ويُفتح جروب الطالب — الصقه وأرسله.</span>
          <button type="button" id="srDismiss" class="btn btn-secondary" style="font-size:.82rem;">إغلاق</button>
        </div>
      </div>
    </div>
  `);
}

/**
 * يعرض تقرير كل طالب مع زر «نسخ وفتح جروب الطالب».
 *
 * @param {Object} options
 * @param {Array} options.items - [{ studentId, studentName, circleNumber, date, memorization, review, groupLink }]
 * @param {Function} [options.onSaveLink] - async (item, normalizedLink) => void
 * @param {string} [options.title]
 */
export function showStudentReportsModal({ items = [], onSaveLink = null, title = '' } = {}) {
  if (!items.length) {
    Toast.warning('لا يوجد تقرير لإنشائه.');
    return;
  }

  ensureModalDom();

  const modal = document.getElementById(MODAL_ID);
  const list = document.getElementById('srList');
  const subtitle = document.getElementById('srSubtitle');

  subtitle.textContent = title || (items.length > 1 ? `${items.length} طلاب — تقرير لكل طالب في جروبه` : 'الحلقة');
  list.innerHTML = '';

  items.forEach((item, index) => {
    const link = normalizeWhatsAppGroupLink(item.groupLink);
    const studentName = item.studentName || 'طالب';

    const card = document.createElement('div');
    card.style.cssText = 'border:1px solid var(--border-color); border-radius:10px; overflow:hidden;';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:.5rem; padding:.6rem .85rem; background:var(--bg-primary); border-bottom:1px solid var(--border-color);">
        <strong style="font-size:.85rem; color:var(--text-primary);">${index + 1}. ${escapeHtml(studentName)}</strong>
        <span class="sr-status" style="font-size:.7rem; font-weight:700; padding:.15rem .5rem; border-radius:999px;"></span>
      </div>
      <div style="padding:.7rem .85rem;">
        <textarea class="sr-text form-control" rows="8" style="width:100%; font-family:inherit; font-size:.8rem; line-height:1.55; resize:vertical;"></textarea>

        <div class="sr-link-box" style="margin-top:.5rem; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:.6rem;">
          <div style="font-size:.72rem; font-weight:700; color:#92400e; margin-bottom:.35rem;">الصق رابط دعوة جروب واتساب الخاص بهذا الطالب:</div>
          <div style="display:flex; gap:.4rem;">
            <input type="text" class="sr-link form-control" placeholder="https://chat.whatsapp.com/XXXXXXXX" style="direction:ltr; text-align:left; font-size:.78rem;">
            <button type="button" class="sr-save btn btn-secondary" style="font-size:.75rem; white-space:nowrap;">حفظ</button>
          </div>
        </div>

        <button type="button" class="sr-send btn btn-primary" style="margin-top:.55rem; width:100%; justify-content:center; background:#25D366; border-color:#25D366; color:#fff; font-weight:800; font-size:.82rem; display:flex; align-items:center; gap:.35rem;">
          <i data-lucide="send" style="width:14px; height:14px;"></i>
          <span>نسخ وفتح جروب الطالب</span>
        </button>
      </div>
    `;

    list.appendChild(card);

    const textarea = card.querySelector('.sr-text');
    const linkBox = card.querySelector('.sr-link-box');
    const linkInput = card.querySelector('.sr-link');
    const saveBtn = card.querySelector('.sr-save');
    const sendBtn = card.querySelector('.sr-send');
    const statusBadge = card.querySelector('.sr-status');

    textarea.value = buildSessionReportText(item);
    linkInput.value = link;

    const renderLinkState = (hasLink) => {
      linkBox.style.display = hasLink ? 'none' : 'block';
      statusBadge.textContent = hasLink ? 'جروب مربوط ✅' : 'بدون رابط جروب ⚠️';
      statusBadge.style.background = hasLink ? 'rgba(37,211,102,.15)' : 'rgba(245,158,11,.15)';
      statusBadge.style.color = hasLink ? '#15803d' : '#b45309';
    };

    let currentLink = link;
    renderLinkState(Boolean(link));

    saveBtn.addEventListener('click', async () => {
      const normalized = normalizeWhatsAppGroupLink(linkInput.value);
      if (!/^https?:\/\/[^\s]+\.[^\s]+/.test(normalized)) {
        Toast.warning('رابط الجروب غير صحيح — انسخ رابط الدعوة من واتساب (chat.whatsapp.com).');
        return;
      }
      saveBtn.disabled = true;
      try {
        if (typeof onSaveLink === 'function') await onSaveLink(item, normalized);
        currentLink = normalized;
        linkInput.value = normalized;
        renderLinkState(true);
        Toast.success(`تم حفظ جروب واتساب للطالب (${studentName}) ✅`);
      } catch (err) {
        console.error('Error saving student WhatsApp group link:', err);
        Toast.danger('تعذر حفظ رابط الجروب، حاول مرة أخرى.');
      } finally {
        saveBtn.disabled = false;
      }
    });

    sendBtn.addEventListener('click', async () => {
      const message = textarea.value.trim();
      if (!message) {
        Toast.warning('نص التقرير فارغ.');
        return;
      }
      if (!currentLink) {
        Toast.warning('أضف رابط جروب واتساب لهذا الطالب أولاً.');
        linkInput.focus();
        return;
      }
      const copied = await copyReportText(message);
      openExternalUrl(currentLink);
      Toast.success(copied
        ? `تم نسخ تقرير ${studentName} وفتح جروبه — الصقه وأرسله ✅`
        : 'تم فتح جروب الطالب. انسخ النص قبل الإغلاق.');
    });
  });

  modal.style.display = 'flex';
  if (window.lucide) window.lucide.createIcons();

  const close = () => { modal.style.display = 'none'; };
  document.getElementById('srClose').onclick = close;
  document.getElementById('srDismiss').onclick = close;
}
