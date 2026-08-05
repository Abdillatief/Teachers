import { db, auth } from '../../config/firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Utility to log every action performed by a teacher or admin in the system (Black Box).
 */

/**
 * Log a generic activity event
 * @param {Object} params
 * @param {string} params.teacherId
 * @param {string} params.teacherName
 * @param {string} params.actionCategory - 'auth' | 'session' | 'profile' | 'report' | 'homework' | 'trial' | 'salary' | 'notification' | 'system'
 * @param {string} params.actionTitle - Human readable description (e.g. "تسجيل الدخول إلى النظام", "تعديل تقرير الحصة")
 * @param {Object} [params.details] - Detailed metadata
 */
export async function logTeacherActivity({ teacherId, teacherName, actionCategory, actionTitle, details = {} }) {
  try {
    const user = auth.currentUser;
    const finalTeacherId = teacherId || user?.uid || 'unknown';
    const finalTeacherName = teacherName || user?.displayName || user?.email || 'معلم غير معروف';

    await addDoc(collection(db, "teacher_activity_logs"), {
      teacherId: finalTeacherId,
      teacherName: finalTeacherName,
      actionCategory,
      actionTitle,
      details,
      timestamp: serverTimestamp(),
      createdAtIso: new Date().toISOString()
    });
  } catch (err) {
    console.error("خطأ تسجيل نشاط المعلم:", err);
  }
}

/**
 * Log a teacher mistake or violation
 * @param {Object} params
 * @param {string} params.teacherId
 * @param {string} params.teacherName
 * @param {string} params.mistakeType - e.g. 'missed_session' | 'late_arrival' | 'missing_report' | 'late_report' | 'unauthorized_deletion' | 'trial_missed' | 'excessive_cancellation'
 * @param {string} params.title - Human description
 * @param {string} params.severity - 'high' | 'medium' | 'low'
 * @param {Object} [params.details]
 */
export async function logTeacherMistake({ teacherId, teacherName, mistakeType, title, severity = 'medium', details = {} }) {
  try {
    const user = auth.currentUser;
    const finalTeacherId = teacherId || user?.uid || 'unknown';
    const finalTeacherName = teacherName || user?.displayName || user?.email || 'معلم غير معروف';

    await addDoc(collection(db, "teacher_mistakes"), {
      teacherId: finalTeacherId,
      teacherName: finalTeacherName,
      mistakeType,
      title,
      severity, // 'high' | 'medium' | 'low'
      status: 'pending', // 'pending' (معلق/قيد المراجعة) | 'resolved' (تم الحل) | 'acknowledged'
      details,
      timestamp: serverTimestamp(),
      createdAtIso: new Date().toISOString()
    });
  } catch (err) {
    console.error("خطأ تسجيل مخالفة/خطأ المعلم:", err);
  }
}

/**
 * Log login / logout / attendance event
 * @param {Object} params
 * @param {string} params.teacherId
 * @param {string} params.teacherName
 * @param {string} params.eventType - 'login' | 'logout' | 'disconnect' | 'idle'
 * @param {number} [params.activeDurationMinutes]
 * @param {number} [params.idleMinutes]
 */
export async function logTeacherAttendance({ teacherId, teacherName, eventType, activeDurationMinutes = 0, idleMinutes = 0 }) {
  try {
    const user = auth.currentUser;
    const finalTeacherId = teacherId || user?.uid || 'unknown';
    const finalTeacherName = teacherName || user?.displayName || user?.email || 'معلم غير معروف';

    await addDoc(collection(db, "teacher_attendance_logs"), {
      teacherId: finalTeacherId,
      teacherName: finalTeacherName,
      eventType,
      activeDurationMinutes,
      idleMinutes,
      timestamp: serverTimestamp(),
      createdAtIso: new Date().toISOString()
    });
  } catch (err) {
    console.error("خطأ تسجيل حضور المعلم:", err);
  }
}

/**
 * Log non-destructive Audit Log for Admin updates or system alterations
 * @param {Object} params
 */
export async function logAuditLog({ actionType, targetCollection, targetId, oldValue, newValue, adminName, adminId, reason }) {
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, "auditLogs"), {
      actionType,
      targetCollection,
      targetId,
      oldValue: oldValue || null,
      newValue: newValue || null,
      userId: adminId || user?.uid || 'system',
      userName: adminName || user?.displayName || 'المشرف المسؤول',
      reason: reason || 'تعديل إداري',
      timestamp: serverTimestamp(),
      createdAtIso: new Date().toISOString()
    });
  } catch (err) {
    console.error("خطأ سجل التدقيق الأمني:", err);
  }
}
