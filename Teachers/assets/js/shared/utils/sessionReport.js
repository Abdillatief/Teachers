import { Toast } from './toast.js';
import { openExternalUrl } from './medianBridge.js';

/**
 * تقرير الحصة الأسبوعي — قالب أكاديمية سبيل
 * يتم تعبئته تلقائياً من بيانات الحصة ثم يُنسخ ويُفتح به جروب واتساب الطالب/المجموعة.
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
 * يبني نص تقرير حصة واحدة بنفس القالب المعتمد.
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
 * يدمج عدة تقارير (حصة جماعية) في رسالة واحدة.
 */
export function buildBulkSessionReportText(items = []) {
  return items
    .map(item => buildSessionReportText(item))
    .filter(Boolean)
    .join('\n\n━━━━━━━━━━━━━━━━━━━━\n\n');
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
  let value = String(rawLink).trim();
  if (!value) return '';

  // كود الدعوة فقط
  if (/^[A-Za-z0-9]{10,}$/.test(value) && !/\s/.test(value)) {
    return `https://chat.whatsapp.com/${value}`;
  }

  value = value.replace(/^https?:\/\//i, '');
  if (/^(www\.)?chat\.whatsapp\.com\//i.test(value)) {
    return `https://${value.replace(/^www\./i, '')}`.replace(/\/+$/, '');
  }
  if (/^wa\.me\//i.test(value) || /^api\.whatsapp\.com\//i.test(value)) {
    return `https://${value}`;
  }
  if (/^https?:\/\//i.test(String(rawLink).trim())) {
    return String(rawLink).trim();
  }
  return `https://${value}`;
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

function ensureReportModalDom() {
  if (document.getElementById('sessionReportModal')) return;

  const html = `
    <div id="sessionReportModal" class="modal-overlay" style="display:none; position:fixed; inset:0; z-index:10050; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); align-items:center; justify-content:center; padding:1rem;">
      <div style="background:var(--bg-card,#fff); border:1px solid var(--border-color,#e2e8f0); border-radius:12px; width:100%; max-width:560px; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 25px -5px rgba(0,0,0,.2);">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:.5rem; padding:.9rem 1.15rem; background:var(--bg-primary,#f8fafc); border-bottom:1px solid var(--border-color,#e2e8f0);">
          <div style="display:flex; align-items:center; gap:.5rem; min-width:0;">
            <div style="width:32px; height:32px; border-radius:8px; background:rgba(37,211,102,.15); color:#16a34a; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="message-square" style="width:18px; height:18px;"></i>
            </div>
            <div style="min-width:0;">
              <h3 style="margin:0; font-size:.95rem; font-weight:800; color:var(--text-primary,#0f172a);">تقرير الحصة — إرسال لجروب واتساب</h3>
              <span id="srGroupName" style="font-size:.72rem; color:var(--text-muted,#64748b);">—</span>
            </div>
          </div>
          <button type="button" id="srClose" style="background:transparent; border:none; cursor:pointer; color:var(--text-muted,#64748b); padding:.3rem; display:flex;">
            <i data-lucide="x" style="width:20px; height:20px;"></i>
          </button>
        </div>

        <div style="padding:1rem 1.15rem; overflow-y:auto;">
          <div id="srMissingLinkBox" style="display:none; margin-bottom:.85rem; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:.7rem .85rem;">
            <div style="font-size:.78rem; font-weight:800; color:#92400e; margin-bottom:.4rem;">⚠️ لا يوجد رابط جروب واتساب لهذه الحلقة بعد — أضفه هنا ليُحفظ للمرات القادمة:</div>
            <div style="display:flex; gap:.4rem;">
              <input type="text" id="srLinkInput" class="form-control" placeholder="https://chat.whatsapp.com/XXXXXXXX" style="direction:ltr; text-align:left; font-size:.8rem;">
              <button type="button" id="srSaveLink" class="btn btn-secondary" style="font-size:.78rem; white-space:nowrap;">حفظ الرابط</button>
            </div>
          </div>

          <label style="display:block; font-size:.8rem; font-weight:700; color:var(--text-primary,#0f172a); margin-bottom:.35rem;">نص التقرير (يمكن التعديل قبل الإرسال):</label>
          <textarea id="srText" class="form-control" rows="14" style="width:100%; font-family:inherit; font-size:.85rem; line-height:1.6; resize:vertical;"></textarea>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; gap:.5rem; padding:.8rem 1.15rem; background:var(--bg-primary,#f8fafc); border-top:1px solid var(--border-color,#e2e8f0); flex-wrap:wrap;">
          <span style="font-size:.72rem; color:var(--text-muted,#64748b);">يُنسخ النص ويُفتح الجروب — الصقه وأرسله.</span>
          <div style="display:flex; gap:.5rem;">
            <button type="button" id="srCancel" class="btn btn-secondary" style="font-size:.82rem;">لاحقاً</button>
            <button type="button" id="srSend" class="btn btn-primary" style="background:#25D366; border-color:#25D366; color:#fff; font-weight:800; font-size:.85rem; display:flex; align-items:center; gap:.35rem;">
              <i data-lucide="send" style="width:15px; height:15px;"></i>
              <span>نسخ وفتح الجروب</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
  if (window.lucide) window.lucide.createIcons();
}

let activeReport = { groupLink: '', onSaveLink: null };

/**
 * يفتح نافذة معاينة التقرير مع إمكانية تعديل النص وحفظ رابط الجروب إن لم يكن موجوداً.
 */
export function showSessionReportModal({ text, groupLink = '', groupName = '', onSaveLink = null } = {}) {
  ensureReportModalDom();

  const modal = document.getElementById('sessionReportModal');
  const textarea = document.getElementById('srText');
  const linkBox = document.getElementById('srMissingLinkBox');
  const linkInput = document.getElementById('srLinkInput');
  const groupNameEl = document.getElementById('srGroupName');
  const sendBtn = document.getElementById('srSend');
  const saveLinkBtn = document.getElementById('srSaveLink');

  const link = normalizeWhatsAppGroupLink(groupLink);
  activeReport = { groupLink: link, onSaveLink };

  if (textarea) textarea.value = text || '';
  if (groupNameEl) groupNameEl.textContent = groupName || 'الحلقة';
  if (linkBox) linkBox.style.display = link ? 'none' : 'block';
  if (linkInput) linkInput.value = link || '';
  if (sendBtn) sendBtn.style.display = link ? 'flex' : 'none';

  modal.style.display = 'flex';
  if (window.lucide) window.lucide.createIcons();

  const close = () => {
    modal.style.display = 'none';
    activeReport = { groupLink: '', onSaveLink: null };
  };

  document.getElementById('srClose').onclick = close;
  document.getElementById('srCancel').onclick = close;

  if (saveLinkBtn) {
    saveLinkBtn.onclick = async () => {
      const normalized = normalizeWhatsAppGroupLink(linkInput?.value || '');
      if (!normalized || !/^https?:\/\/.+\..+/.test(normalized)) {
        Toast.warning('رابط الجروب غير صحيح — انسخ رابط الدعوة من واتساب (chat.whatsapp.com).');
        return;
      }
      saveLinkBtn.disabled = true;
      try {
        if (typeof activeReport.onSaveLink === 'function') {
          await activeReport.onSaveLink(normalized);
        }
        activeReport.groupLink = normalized;
        if (linkBox) linkBox.style.display = 'none';
        if (sendBtn) sendBtn.style.display = 'flex';
        Toast.success('تم حفظ رابط جروب واتساب بنجاح ✅');
      } catch (err) {
        console.error('Error saving WhatsApp group link:', err);
        Toast.danger('تعذر حفظ رابط الجروب، حاول مرة أخرى.');
      } finally {
        saveLinkBtn.disabled = false;
      }
    };
  }

  if (sendBtn) {
    sendBtn.onclick = async () => {
      const message = textarea ? textarea.value.trim() : '';
      if (!message) {
        Toast.warning('نص التقرير فارغ.');
        return;
      }
      if (!activeReport.groupLink) {
        Toast.warning('أضف رابط جروب واتساب أولاً.');
        return;
      }
      const copied = await copyReportText(message);
      openExternalUrl(activeReport.groupLink);
      close();
      if (copied) {
        Toast.success('تم نسخ التقرير وفتح جروب واتساب — الصقه وأرسله ✅');
      } else {
        Toast.info('تم فتح جروب واتساب. انسخ النص من النافذة قبل الإغلاق.');
      }
    };
  }
}
