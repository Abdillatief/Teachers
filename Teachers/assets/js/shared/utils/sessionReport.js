import { Toast } from './toast.js';
import { openExternalUrl } from './medianBridge.js';

/**
 * تقرير الحصة — قالب أكاديمية سبيل
 * كل طالب له جروب واتساب خاص به (students.whatsappGroupLink).
 * بعد تسجيل الحصة يُولَّد التقرير تلقائياً، ويُنسخ ويُفتح جروب الطالب نفسه.
 * حصة المجموعة تنتج تقريراً مستقلاً لكل طالب حاضر يُرسل لجروبه.
 */

const REPORT_FOOTER = `🪷🪷🪷🪷🪷🪷
رزقنا الله واياكم الإخلاص والثبات وجعلنا الله واياكم من أهل القرآن ورزقنا العلم والعمل به✨✨
🪷🪷🪷🪷🪷🪷`;

function cleanValue(value) {
  if (value === undefined || value === null) return '—';
  const text = String(value).trim();
  return text === '' ? '—' : text;
}

/**
 * يبني نص تقرير حصة واحدة بنفس قالب الأكاديمية المعتمد.
 */
export function buildSessionReportText({ studentName = '', circleNumber = '', date = '', memorization = '', review = '' } = {}) {
  return `🎗️ *اسم الطالب/ة* : ${cleanValue(studentName)}

🌀 *رقم الحلقة* : ${cleanValue(circleNumber)}

🗓 *التاريخ* : ${cleanValue(date)}

☘️ *الحفظ*: 
${cleanValue(memorization)}

☘️ *الماضي* : 
${cleanValue(review)}

${REPORT_FOOTER}`;
}

/**
 * يحول تاريخ (YYYY-MM-DD أو ISO) لصيغة عربية مقروءة.
 */
export function formatSessionReportDate(rawDate) {
  if (!rawDate) return '';
  const parsed = new Date(`${String(rawDate).split('T')[0]}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(rawDate);
  return parsed.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * يقبل رابط دعوة جروب أو كود الدعوة فقط ويوحّده لرابط صحيح.
 */
export function normalizeWhatsAppGroupLink(rawLink) {
  if (!rawLink) return '';
  const original = String(rawLink).trim();
  if (!original) return '';

  // كود الدعوة فقط
  if (/^[A-Za-z0-9]{10,}$/.test(original) && !/\s/.test(original)) {
    return `https://chat.whatsapp.com/${original}`;
  }
  if (/^https?:\/\//i.test(original)) {
    return original.replace(/\/+$/, '');
  }
  const withoutScheme = original.replace(/^https?:\/\//i, '');
  if (/^(www\.)?chat\.whatsapp\.com\//i.test(withoutScheme)) {
    return `https://${withoutScheme.replace(/^www\./i, '')}`.replace(/\/+$/, '');
  }
  return `https://${withoutScheme}`;
}

/**
 * ينسخ النص للحافظة مع بديل يعمل داخل تطبيق الأندرويد (WebView).
 */
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
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch (err) {
    console.error('Copy fallback failed:', err);
    return false;
  }
}

function ensureReportsModalDom() {
  if (document.getElementById('sessionReportModal')) return;

  const html = `
    <div id="sessionReportModal" class="modal-overlay" style="display:none; position:fixed; inset:0; z-index:10050; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); align-items:center; justify-content:center; padding:1rem;">
      <div style="background:var(--bg-card,#fff); border:1px solid var(--border-color,#e2e8f0); border-radius:12px; width:100%; max-width:620px; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 25px -5px rgba(0,0,0,.2);">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:.5rem; padding:.9rem 1.15rem; background:var(--bg-primary,#f8fafc); border-bottom:1px solid var(--border-color,#e2e8f0);">
          <div style="display:flex; align-items:center; gap:.5rem; min-width:0;">
            <div style="width:32px; height:32px; border-radius:8px; background:rgba(37,211,102,.15); color:#16a34a; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="message-square" style="width:18px; height:18px;"></i>
            </div>
            <div style="min-width:0;">
              <h3 style="margin:0; font-size:.95rem; font-weight:800; color:var(--text-primary,#0f172a);">تقرير الحصة — إرسال لجروب الطالب</h3>
              <span id="srGroupName" style="font-size:.72rem; color:var(--text-muted,#64748b);">—</span>
            </div>
          </div>
          <button type="button" id="srClose" style="background:transparent; border:none; cursor:pointer; color:var(--text-muted,#64748b); padding:.3rem; display:flex;">
            <i data-lucide="x" style="width:20px; height:20px;"></i>
          </button>
        </div>

        <div id="srList" style="padding:1rem 1.15rem; overflow-y:auto; display:flex; flex-direction:column; gap:.85rem;"></div>

        <div style="display:flex; justify-content:space-between; align-items:center; gap:.5rem; padding:.8rem 1.15rem; background:var(--bg-primary,#f8fafc); border-top:1px solid var(--border-color,#e2e8f0); flex-wrap:wrap;">
          <span style="font-size:.72rem; color:var(--text-muted,#64748b);">يُنسخ التقرير ويُفتح جروب الطالب — الصقه وأرسله.</span>
          <button type="button" id="srCancel" class="btn btn-secondary" style="font-size:.82rem;">إغلاق</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * يعرض تقارير الحصص لكل طالب مع زر «نسخ وفتح جروب الطالب».
 *
 * @param {Object} options
 * @param {Array} options.items - [{ studentId, studentName, circleNumber, date, memorization, review, groupLink }]
 * @param {Function} [options.onSaveLink] - async (item, normalizedLink) => void لحفظ رابط جروب الطالب
 * @param {string} [options.title] - عنوان فرعي للنافذة
 */
export function showStudentReportsModal({ items = [], onSaveLink = null, title = '' } = {}) {
  ensureReportsModalDom();

  const modal = document.getElementById('sessionReportModal');
  const list = document.getElementById('srList');
  const subtitle = document.getElementById('srGroupName');

  if (!items.length) {
    Toast.warning('لا يوجد تقرير لإنشائه.');
    return;
  }

  if (subtitle) {
    subtitle.textContent = title || (items.length > 1 ? `${items.length} طلاب — تقرير لكل طالب في جروبه` : 'الحلقة');
  }

  list.innerHTML = '';

  items.forEach((item, index) => {
    const card = document.createElement('div');
    card.style.cssText = 'border:1px solid var(--border-color,#e2e8f0); border-radius:10px; overflow:hidden; background:var(--bg-card,#fff);';

    const normalizedLink = normalizeWhatsAppGroupLink(item.groupLink || '');
    const hasLink = Boolean(normalizedLink);

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:.5rem; padding:.6rem .85rem; background:var(--bg-primary,#f8fafc); border-bottom:1px solid var(--border-color,#e2e8f0);">
        <strong style="font-size:.85rem; color:var(--text-primary,#0f172a);">${index + 1}. ${item.studentName || 'طالب'}</strong>
        <span class="sr-status" style="font-size:.7rem; font-weight:700; padding:.15rem .5rem; border-radius:999px; ${hasLink ? 'background:rgba(37,211,102,.15); color:#15803d;' : 'background:rgba(245,158,11,.15); color:#b45309;'}">
          ${hasLink ? 'جروب مربوط ✅' : 'بدون رابط جروب ⚠️'}
        </span>
      </div>
      <div style="padding:.7rem .85rem;">
        <textarea class="sr-text form-control" rows="8" style="width:100%; font-family:inherit; font-size:.8rem; line-height:1.55; resize:vertical;">${buildSessionReportText(item)}</textarea>

        <div class="sr-link-box" style="display:${hasLink ? 'none' : 'block'}; margin-top:.5rem; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:.6rem;">
          <div style="font-size:.72rem; font-weight:700; color:#92400e; margin-bottom:.35rem;">الصق رابط دعوة جروب واتساب الخاص بهذا الطالب:</div>
          <div style="display:flex; gap:.4rem;">
            <input type="text" class="sr-link form-control" value="${normalizedLink}" placeholder="https://chat.whatsapp.com/XXXXXXXX" style="direction:ltr; text-align:left; font-size:.78rem;">
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

    let currentLink = normalizedLink;

    const markLinked = () => {
      linkBox.style.display = 'none';
      statusBadge.textContent = 'جروب مربوط ✅';
      statusBadge.style.background = 'rgba(37,211,102,.15)';
      statusBadge.style.color = '#15803d';
    };

    saveBtn.addEventListener('click', async () => {
      const candidate = normalizeWhatsAppGroupLink(linkInput.value || '');
      if (!candidate || !/^https?:\/\/.+\..+/.test(candidate)) {
        Toast.warning('رابط الجروب غير صحيح — انسخ رابط الدعوة من واتساب (chat.whatsapp.com).');
        return;
      }
      saveBtn.disabled = true;
      try {
        if (typeof onSaveLink === 'function') {
          await onSaveLink(item, candidate);
        }
        currentLink = candidate;
        linkInput.value = candidate;
        markLinked();
        Toast.success(`تم حفظ جروب واتساب للطالب (${item.studentName || ''}) ✅`);
      } catch (err) {
        console.error('Error saving student WhatsApp group link:', err);
        Toast.danger('تعذر حفظ رابط الجروب، حاول مرة أخرى.');
      } finally {
        saveBtn.disabled = false;
      }
    });

    sendBtn.addEventListener('click', async () => {
      const message = (textarea.value || '').trim();
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
      if (copied) {
        Toast.success(`تم نسخ تقرير ${item.studentName || 'الطالب'} وفتح جروبه — الصقه وأرسله ✅`);
      } else {
        Toast.info('تم فتح جروب الطالب. انسخ النص قبل إغلاق النافذة.');
      }
    });
  });

  modal.style.display = 'flex';
  if (window.lucide) window.lucide.createIcons();

  const close = () => { modal.style.display = 'none'; };
  document.getElementById('srClose').onclick = close;
  document.getElementById('srCancel').onclick = close;
}
