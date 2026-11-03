/**
 * Sabeel Academy - Central Warning & Alert Management System
 * Handles duplicate session detection, warning logs, review status, and extensible alert types.
 */
import { db, auth } from '../../config/firebase.js';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Checks if a session is already recorded for this teacher, student and date.
 * @param {Object} params
 * @param {string} params.teacherId
 * @param {string} params.studentId
 * @param {string} params.date - YYYY-MM-DD
 * @param {Array} [params.localSessionsCache] - optional memory cache
 * @returns {Promise<{isDuplicate: boolean, existingSession: Object|null}>}
 */
export async function checkDuplicateSession({ teacherId, studentId, date, localSessionsCache = [] }) {
  if (!studentId || !date) {
    return { isDuplicate: false, existingSession: null };
  }

  // 1. Check local cache first for instant response
  if (localSessionsCache && localSessionsCache.length > 0) {
    const foundLocal = localSessionsCache.find(s => 
      s.studentId === studentId && 
      (s.date === date || (s.date && s.date.startsWith(date))) &&
      (s.teacherId === teacherId || !teacherId) &&
      s.status !== 'delayed'
    );
    if (foundLocal) {
      return { isDuplicate: true, existingSession: foundLocal };
    }
  }

  // 2. Query Firestore if not found in local cache
  try {
    const q = query(
      collection(db, "sessions"),
      where("studentId", "==", studentId),
      where("date", "==", date)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      let matched = null;
      snap.forEach(docSnap => {
        const d = docSnap.data();
        if ((!teacherId || d.teacherId === teacherId) && d.status !== 'delayed') {
          matched = { id: docSnap.id, ...d };
        }
      });
      if (matched) {
        return { isDuplicate: true, existingSession: matched };
      }
    }
  } catch (err) {
    console.warn("[WarningService] Error verifying duplicate session in Firestore:", err);
  }

  return { isDuplicate: false, existingSession: null };
}

/**
 * Records a new system warning in Firestore
 * @param {Object} warningData
 */
export async function logSystemWarning(warningData) {
  try {
    const warningsCol = collection(db, "warnings");
    const payload = {
      type: warningData.type || "duplicate_session",
      title: warningData.title || "تكرار تسجيل حصة في نفس اليوم",
      teacherId: warningData.teacherId || "",
      teacherName: warningData.teacherName || "غير محدد",
      studentId: warningData.studentId || "",
      studentName: warningData.studentName || "غير محدد",
      firstTime: warningData.firstTime || "--:--",
      secondTime: warningData.secondTime || "--:--",
      date: warningData.date || new Date().toISOString().split('T')[0],
      status: "pending", // 'pending' | 'reviewed'
      metadata: warningData.metadata || {},
      createdAt: serverTimestamp()
    };
    const ref = await addDoc(warningsCol, payload);
    return { success: true, id: ref.id };
  } catch (err) {
    console.error("[WarningService] Failed to record warning:", err);
    return { success: false, error: err };
  }
}

/**
 * Marks a warning as reviewed by administrator
 * @param {string} warningId 
 * @param {Object} reviewerInfo 
 */
export async function markWarningReviewed(warningId, reviewerInfo = {}) {
  try {
    const warningRef = doc(db, "warnings", warningId);
    await updateDoc(warningRef, {
      status: "reviewed",
      reviewedAt: serverTimestamp(),
      reviewedByUid: reviewerInfo.uid || auth?.currentUser?.uid || "",
      reviewedByName: reviewerInfo.name || "الإدارة"
    });
    return { success: true };
  } catch (err) {
    console.error("[WarningService] Failed to mark warning reviewed:", err);
    return { success: false, error: err };
  }
}

/**
 * Displays a clean confirmation dialog for duplicate session confirmation
 * @param {Object} options
 * @returns {Promise<boolean>} Resolves true if user clicks 'تسجيل رغم ذلك', false if 'إلغاء'
 */
export function showDuplicateSessionConfirmModal({ studentName, existingTime, sessionDate }) {
  return new Promise((resolve) => {
    // Remove any existing duplicate modal
    const existingModal = document.getElementById('duplicateSessionConfirmModal');
    if (existingModal) existingModal.remove();

    const overlay = document.createElement('div');
    overlay.id = 'duplicateSessionConfirmModal';
    overlay.style.cssText = `
      position: fixed; inset: 0; background-color: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
      z-index: 99999; display: flex; align-items: center; justify-content: center;
      padding: 1.5rem; animation: fadeIn 0.2s ease-out;
    `;

    overlay.innerHTML = `
      <div style="background: var(--bg-card, #ffffff); border-radius: 12px; border: 1px solid var(--border-color, #e2e8f0); max-width: 480px; width: 100%; padding: 1.75rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);">
        <div style="display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.25rem;">
          <div style="width: 44px; height: 44px; border-radius: 10px; background-color: rgba(234, 88, 12, 0.1); color: #ea580c; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary, #0f172a); margin: 0 0 0.25rem 0;">تنبيه: الحصة مسجلة مسبقاً</h3>
            <p style="font-size: 0.9rem; color: var(--text-secondary, #475569); margin: 0; line-height: 1.5;">
              تم تسجيل هذه الحصة بالفعل اليوم، هل تريد تسجيلها مرة أخرى؟
            </p>
          </div>
        </div>

        <div style="background-color: var(--bg-primary, #f8fafc); border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1.5rem; font-size: 0.85rem; border: 1px solid var(--border-color, #e2e8f0);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
            <span style="color: var(--text-muted, #64748b);">اسم الدارس:</span>
            <span style="font-weight: 700; color: var(--text-primary, #0f172a);">${studentName || 'الدارس'}</span>
          </div>
          ${existingTime ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
            <span style="color: var(--text-muted, #64748b);">وقت الحصة السابقة اليوم:</span>
            <span style="font-weight: 700; color: var(--text-primary, #0f172a);">${existingTime}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted, #64748b);">تاريخ الحصة:</span>
            <span style="font-weight: 700; color: var(--text-primary, #0f172a);">${sessionDate || 'اليوم'}</span>
          </div>
        </div>

        <div style="font-size: 0.78rem; color: #ea580c; background-color: rgba(234, 88, 12, 0.08); padding: 0.6rem 0.85rem; border-radius: 6px; margin-bottom: 1.5rem; line-height: 1.4;">
          ملاحظة: في حال التأكيد، سيتم حفظ الحصة وإرسال إشعار تحذيري لإدارة الأكاديمية للمراجعة.
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button id="btnDuplicateCancel" type="button" class="btn btn-secondary" style="padding: 0.6rem 1.25rem; font-weight: 700;">
            إلغاء
          </button>
          <button id="btnDuplicateConfirm" type="button" class="btn btn-warning" style="padding: 0.6rem 1.25rem; font-weight: 800; background-color: #ea580c; color: #ffffff; border: none;">
            تسجيل رغم ذلك
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = () => {
      overlay.remove();
    };

    document.getElementById('btnDuplicateCancel').addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    document.getElementById('btnDuplicateConfirm').addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
  });
}
