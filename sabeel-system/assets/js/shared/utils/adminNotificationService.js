import { db } from '../../config/firebase.js';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { parseSessionTimeToTodayDate } from './reminderService.js';

/**
 * Formats a Date object to Arabic time string (e.g. "05:30 مساءً")
 */
export function formatArabicTime(date = new Date()) {
  return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Calculates delay in minutes between scheduled time string and actual recording Date
 */
export function calculateSessionDelay(scheduledTimeStr, actualDateObj = new Date()) {
  if (!scheduledTimeStr || typeof scheduledTimeStr !== 'string') {
    return { isLate: false, delayMinutes: 0 };
  }

  const scheduledDate = parseSessionTimeToTodayDate(scheduledTimeStr);
  if (!scheduledDate) return { isLate: false, delayMinutes: 0 };

  const diffMs = actualDateObj.getTime() - scheduledDate.getTime();
  const delayMinutes = Math.floor(diffMs / (1000 * 60));

  return {
    isLate: delayMinutes > 15,
    delayMinutes: delayMinutes > 0 ? delayMinutes : 0
  };
}

/**
 * Dispatches an Administrative Session Recorded Notification to Admin
 */
export async function notifyAdminSessionRecorded({
  teacherId,
  teacherName,
  targetName,
  sessionType = 'individual', // 'individual' or 'group'
  scheduledTime = '',
  recordedTime = formatArabicTime(),
  sessionId = '',
  groupId = '',
  studentId = ''
}) {
  const delayInfo = calculateSessionDelay(scheduledTime);
  const isLate = delayInfo.isLate;
  const delayMinutes = delayInfo.delayMinutes;

  const category = isLate ? 'late_session_recorded' : 'completed_session';

  const typeLabel = sessionType === 'group' ? 'حصة جماعية' : 'حصة فردية';
  const targetLabel = sessionType === 'group' ? `لالمجموعة "${targetName}"` : `للطالب "${targetName}"`;

  const title = isLate ? `⏱️ تسجيل حصة متأخرة` : `✅ تم تسجيل حصة جديدة`;
  
  let body = '';
  if (isLate) {
    body = `⏱️ قام المعلم (${teacherName || 'معلم'}) بتسجيل ${typeLabel} ${targetLabel}.\n📅 الموعد الأصلي: (${scheduledTime || 'مرن'}) | 🕒 وقت التسجيل الفعلي: (${recordedTime}) | ⌛ مدة التأخير: (${delayMinutes} دقيقة).`;
  } else {
    body = `✅ قام المعلم (${teacherName || 'معلم'}) بتسجيل ${typeLabel} ${targetLabel}.${scheduledTime ? ` (الموعد: ${scheduledTime})` : ''}`;
  }

  await addDoc(collection(db, "notifications"), {
    recipientId: "admin",
    recipientRole: "admin",
    targetRole: "admin",
    type: category,
    category: category,
    title,
    body,
    message: body,
    teacherId: teacherId || '',
    teacherName: teacherName || 'المعلم',
    targetName: targetName || '',
    studentName: sessionType === 'individual' ? targetName : '',
    groupName: sessionType === 'group' ? targetName : '',
    sessionType: sessionType,
    scheduledTime: scheduledTime || '',
    recordedTime: recordedTime,
    delayMinutes: delayMinutes,
    isLate: isLate,
    sessionId: sessionId || '',
    groupId: groupId || '',
    studentId: studentId || '',
    read: false,
    archived: false,
    readBy: [],
    createdAt: serverTimestamp()
  });
}

/**
 * Dispatches an Unrecorded / Overdue Session Warning Notification to Admin
 */
export async function notifyAdminUnrecordedSession({
  teacherId,
  teacherName,
  targetName,
  sessionType = 'individual',
  scheduledTime,
  dateStr = new Date().toISOString().substring(0, 10),
  studentId = '',
  groupId = ''
}) {
  const cleanTimeKey = (scheduledTime || '').replace(/[\s:-]/g, '_');
  const reminderKey = `unrecorded_admin_${sessionType}_${studentId || groupId}_${dateStr}_${cleanTimeKey}`;

  // Idempotency check to avoid duplicate alerts on the same day for the same scheduled session
  try {
    const existingQ = query(collection(db, "notifications"), where("reminderKey", "==", reminderKey));
    const snap = await getDocs(existingQ);
    if (!snap.empty) return;
  } catch (e) {
    console.warn("Check existing unrecorded notification error:", e);
  }

  const typeLabel = sessionType === 'group' ? `حصة المجموعة "${targetName}"` : `حصة الطالب "${targetName}"`;
  const title = `⚠️ تنبيه حصة غير مسجلة`;
  const body = `⚠️ لم يقم المعلم (${teacherName || 'معلم'}) بتسجيل ${typeLabel} المجدولة اليوم الساعة (${scheduledTime}) حتى الآن.`;

  await addDoc(collection(db, "notifications"), {
    recipientId: "admin",
    recipientRole: "admin",
    targetRole: "admin",
    type: "overdue_unrecorded_session",
    category: "overdue_unrecorded_session",
    title,
    body,
    message: body,
    teacherId: teacherId || '',
    teacherName: teacherName || 'المعلم',
    targetName: targetName || '',
    studentName: sessionType === 'individual' ? targetName : '',
    groupName: sessionType === 'group' ? targetName : '',
    sessionType: sessionType,
    scheduledTime: scheduledTime || '',
    reminderKey: reminderKey,
    studentId: studentId || '',
    groupId: groupId || '',
    dateStr: dateStr,
    read: false,
    archived: false,
    readBy: [],
    createdAt: serverTimestamp()
  });
}
