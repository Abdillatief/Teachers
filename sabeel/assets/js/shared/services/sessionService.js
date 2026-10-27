import { db } from '../../config/firebase.js';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from '../utils/toast.js';

const todaySessionsCache = new Map();

/**
 * Check if a session already exists today for the given student, teacher, and date.
 */
export async function checkForDuplicateSession(studentId, teacherId, date) {
  if (!studentId || !teacherId || !date) return null;

  const cacheKey = `${studentId}_${teacherId}_${date}`;
  if (todaySessionsCache.has(cacheKey)) {
    return todaySessionsCache.get(cacheKey);
  }

  try {
    const q = query(
      collection(db, "sessions"),
      where("studentId", "==", studentId),
      where("teacherId", "==", teacherId),
      where("date", "==", date)
    );

    const snap = await getDocs(q);
    if (!snap.empty) {
      for (const d of snap.docs) {
        const data = d.data();
        if (data.status !== "delayed" && data.status !== "cancelled") {
          const result = { id: d.id, ...data };
          todaySessionsCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch (err) {
    console.warn("[SessionService] Duplicate check warning:", err);
  }

  return null;
}

/**
 * Show duplicate session confirmation dialog with SaaS styling and zero emojis.
 */
export function showDuplicateSessionModal({ studentName, teacherName, existingTime, newTime }) {
  return new Promise((resolve) => {
    const oldModal = document.getElementById('duplicateSessionModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'duplicateSessionModal';
    modal.style.cssText = 'position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.82); backdrop-filter: blur(4px); padding: 1rem;';

    modal.innerHTML = `
      <div style="background: var(--bg-card, #0f1013); border: 1px solid var(--border-color-strong, #2c2f38); border-radius: 14px; max-width: 480px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85); overflow: hidden;">
        <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color, #1c1d22); display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(217, 119, 6, 0.15); border: 1px solid rgba(217, 119, 6, 0.3); display: flex; align-items: center; justify-content: center; color: #f59e0b;">
            <i data-lucide="alert-triangle" style="width: 20px; height: 20px;"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--text-primary, #f8fafc);">تنبيه: حصة مكررة اليوم</h3>
            <p style="margin: 0.15rem 0 0 0; font-size: 0.82rem; color: var(--text-muted, #64748b);">رصد جلسة مسجلة مسبقاً لهذا الطالب اليوم</p>
          </div>
        </div>

        <div style="padding: 1.5rem;">
          <p style="margin: 0 0 1.25rem 0; font-size: 0.95rem; line-height: 1.6; color: var(--text-primary, #f8fafc);">
            تم تسجيل هذه الحصة بالفعل اليوم، هل تريد تسجيلها مرة أخرى؟
          </p>

          <div style="background: var(--bg-secondary, #09090b); border: 1px solid var(--border-color, #1c1d22); border-radius: 10px; padding: 1.1rem; font-size: 0.90rem; display: flex; flex-direction: column; gap: 0.6rem;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted, #64748b);">اسم الطالب:</span>
              <span style="font-weight: 600; color: var(--text-primary, #f8fafc);">${studentName || 'الطالب'}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted, #64748b);">المعلم:</span>
              <span style="font-weight: 600; color: var(--text-primary, #f8fafc);">${teacherName || 'المعلم'}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted, #64748b);">وقت الحصة السابقة:</span>
              <span style="color: #f59e0b; font-weight: 600;">${existingTime || 'مسجلة مسبقاً اليوم'}</span>
            </div>
          </div>

          <p style="margin: 1.25rem 0 0 0; font-size: 0.8rem; color: var(--text-muted, #64748b); line-height: 1.5;">
            عند المتابعة سيتم حفظ الحصة وإرسال إشعار تحذيري إلى مركز التحذيرات في لوحة الإدارة.
          </p>
        </div>

        <div style="padding: 1.1rem 1.5rem; background: var(--bg-secondary, #09090b); border-top: 1px solid var(--border-color, #1c1d22); display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button id="cancelDuplicateBtn" type="button" style="padding: 0.6rem 1.35rem; font-size: 0.92rem; font-weight: 600; border-radius: 8px; border: 1px solid var(--border-color-strong, #2c2f38); background: var(--bg-card, #0f1013); color: var(--text-secondary, #94a3b8); cursor: pointer;">
            إلغاء التراجع
          </button>
          <button id="confirmDuplicateBtn" type="button" style="padding: 0.6rem 1.35rem; font-size: 0.92rem; font-weight: 600; border-radius: 8px; border: none; background: #d97706; color: #ffffff; cursor: pointer;">
            تسجيل رغم ذلك
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();

    const cancelBtn = modal.querySelector('#cancelDuplicateBtn');
    const confirmBtn = modal.querySelector('#confirmDuplicateBtn');

    cancelBtn.addEventListener('click', () => {
      modal.remove();
      resolve(false);
    });

    confirmBtn.addEventListener('click', () => {
      modal.remove();
      resolve(true);
    });
  });
}

/**
 * Log a duplicate session warning to the /warnings collection.
 */
export async function logDuplicateWarning({ studentId, studentName, teacherId, teacherName, date, firstSessionTime, secondSessionTime }) {
  try {
    await addDoc(collection(db, "warnings"), {
      type: "duplicate_session",
      title: `تنبيه: تم تسجيل حصة مكررة للطالب (${studentName}) مع المعلم (${teacherName})`,
      teacherId: teacherId || '',
      teacherName: teacherName || '',
      studentId: studentId || '',
      studentName: studentName || '',
      date: date || new Date().toISOString().split('T')[0],
      firstSessionTime: firstSessionTime || '',
      secondSessionTime: secondSessionTime || '',
      status: "pending",
      createdAt: serverTimestamp(),
      isoDate: new Date().toISOString()
    });

    await addDoc(collection(db, "notifications"), {
      title: "تنبيه: تسجيل حصة مكررة",
      body: `قام المعلم ${teacherName} بتسجيل حصة إضافية مكررة اليوم للطالب ${studentName}.`,
      recipientId: "admin",
      type: "duplicate_warning",
      deepLink: "/admin/warnings.html",
      url: "/admin/warnings.html",
      createdAt: new Date().toISOString(),
      readBy: []
    });
  } catch (err) {
    console.error("[SessionService] Error logging duplicate warning:", err);
  }
}
