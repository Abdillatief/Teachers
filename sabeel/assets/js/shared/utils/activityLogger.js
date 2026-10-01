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
 * @param {Object|string} paramsOrAdminId
 */
export async function logAuditLog(paramsOrAdminId, adminNameArg, actionTypeArg, targetIdArg, detailsArg) {
  try {
    const user = auth.currentUser;
    let payload = {};

    if (typeof paramsOrAdminId === 'object' && paramsOrAdminId !== null) {
      const p = paramsOrAdminId;
      payload = {
        actionType: p.actionType || 'GENERIC_UPDATE',
        targetCollection: p.targetCollection || 'system',
        targetId: p.targetId || '',
        oldValue: p.oldValue !== undefined ? p.oldValue : null,
        newValue: p.newValue !== undefined ? p.newValue : null,
        studentId: p.studentId || null,
        studentName: p.studentName || null,
        teacherId: p.teacherId || null,
        teacherName: p.teacherName || null,
        sessionId: p.sessionId || null,
        previousCredits: p.previousCredits !== undefined ? p.previousCredits : null,
        newCredits: p.newCredits !== undefined ? p.newCredits : null,
        debtLessons: p.debtLessons !== undefined ? p.debtLessons : null,
        userId: p.adminId || p.userId || user?.uid || 'system',
        userName: p.adminName || p.userName || user?.displayName || 'المشرف المسؤول',
        reason: p.reason || 'تعديل وتوثيق حركة بالنظام',
        details: p.details || null,
        timestamp: serverTimestamp(),
        createdAtIso: new Date().toISOString()
      };
    } else {
      payload = {
        userId: paramsOrAdminId || user?.uid || 'system',
        userName: adminNameArg || user?.displayName || 'المشرف المسؤول',
        actionType: actionTypeArg || 'GENERIC_UPDATE',
        targetCollection: 'system',
        targetId: targetIdArg || '',
        details: detailsArg || null,
        reason: (typeof detailsArg === 'string' ? detailsArg : 'تعديل وتوثيق حركة بالنظام'),
        timestamp: serverTimestamp(),
        createdAtIso: new Date().toISOString()
      };
    }

    await addDoc(collection(db, "auditLogs"), payload);
  } catch (err) {
    console.error("خطأ سجل التدقيق الأمني:", err);
  }
}
