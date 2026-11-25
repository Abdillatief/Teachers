import { db } from '../../config/firebase.js';
import { collection, doc, getDoc, getDocs, query, where, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/**
 * Returns current month key in format "YYYY-MM" (e.g. "2026-08")
 */
export function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Formats a month key "YYYY-MM" to Arabic string (e.g. "أغسطس 2026")
 */
export function formatMonthKeyArabic(monthKey) {
  if (!monthKey || !monthKey.includes('-')) return monthKey || '';
  const monthsArabic = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  const [yearStr, monthStr] = monthKey.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${monthsArabic[monthIdx]} ${yearStr}`;
  }
  return monthKey;
}

/**
 * Generates array of recent months (e.g. last 12 months + current month)
 */
export function getRecentMonthsOptions(count = 12) {
  const monthsArabic = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  const list = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mIdx = d.getMonth();
    const year = d.getFullYear();
    const monthFormatted = String(mIdx + 1).padStart(2, '0');
    const key = `${year}-${monthFormatted}`;
    const label = `${monthsArabic[mIdx]} ${year}`;
    list.push({ key, label, year, month: mIdx });
  }
  return list;
}

/**
 * Converts Firestore Timestamp / Date / string date into a month key "YYYY-MM".
 * @param {*} value
 * @returns {string}
 */
function toMonthKey(value) {
  if (!value) return '';
  let d = null;
  try {
    if (typeof value.toDate === 'function') d = value.toDate();
    else if (value.seconds !== undefined) d = new Date(value.seconds * 1000);
    else if (value instanceof Date) d = value;
    else d = new Date(value);
  } catch (_) {
    return '';
  }
  if (!d || isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Recalculates total paid, remaining amount, and payment status for a subscription.
 * @param {string} subscriptionId 
 * @param {number} [manualTotalAmount] - Optional override if totalAmount changed
 */
export async function syncSubscriptionPayments(subscriptionId, manualTotalAmount = null) {
  if (!subscriptionId) return;

  try {
    const subRef = doc(db, "subscriptions", subscriptionId);
    
    // Fetch all payments for this subscription
    const qPayments = query(collection(db, "payments"), where("subscriptionId", "==", subscriptionId));
    const paymentsSnap = await getDocs(qPayments);
    
    let totalPaid = 0;
    const nonSettlingStatuses = ['refunded', 'failed', 'cancelled'];
    paymentsSnap.forEach(p => {
      const data = p.data();
      const paymentStatus = String(data.status || data.paymentStatus || '').toLowerCase();
      if (nonSettlingStatuses.includes(paymentStatus)) return;
      if (data.refunded === true || data.isRefunded === true) return;
      totalPaid += (parseFloat(data.amount) || 0);
    });

    // Get current subscription document to read totalAmount and current status
    const subDoc = await getDoc(subRef);
    if (!subDoc.exists()) return;

    const subData = subDoc.data();
    const price = parseFloat(subData.price) || 0;
    const discount = parseFloat(subData.discount) || 0;
    
    let totalAmount = manualTotalAmount !== null ? manualTotalAmount : parseFloat(subData.totalAmount);
    if (isNaN(totalAmount) || totalAmount === undefined) {
      totalAmount = Math.max(0, price - discount);
    }
    
    const remainingAmount = Math.max(0, totalAmount - totalPaid);

    let status = subData.status;
    // الأشتراكات الملغاة تبقى ملغاة ولا تُعاد إلى fully_paid حتى مع وجود مدفوعات
    if (status !== 'cancelled') {
      if (totalPaid >= totalAmount && totalAmount > 0) {
        status = 'fully_paid';
      } else if (totalPaid > 0) {
        status = 'partially_paid';
      } else {
        status = 'unpaid';
      }
    }

    await updateDoc(subRef, {
      totalPaid,
      remainingAmount,
      totalAmount,
      status,
      updatedAt: serverTimestamp()
    });

    return { totalPaid, remainingAmount, totalAmount, status };
  } catch (err) {
    console.error("Error syncing subscription payments:", err);
  }
}

/**
 * Calculates used sessions and remaining sessions for a student in a specific month.
 * @param {Array} sessionsList - Array of all session objects
 * @param {string} studentId - Student ID
 * @param {string} monthKey - Format "YYYY-MM" (e.g. "2026-08")
 * @param {number} totalSessions - Total allowed sessions in subscription
 */
export function calculateStudentSessionsForMonth(sessionsList, studentId, monthKey, totalSessions = 0) {
  if (!sessionsList || !studentId || !monthKey) {
    return { usedSessions: 0, remainingSessions: totalSessions };
  }

  const usedSessions = sessionsList.filter(s => {
    if (s.studentId !== studentId) return false;
    
    const sessMonth = toMonthKey(s.date || s.createdAt);

    const isMatchMonth = sessMonth === monthKey;
    const isCompleted = s.status === "completed";

    return isMatchMonth && isCompleted;
  }).length;

  const remainingSessions = Math.max(0, (totalSessions || 0) - usedSessions);

  return { usedSessions, remainingSessions };
}
