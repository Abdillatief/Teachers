import { db, auth } from '../../config/firebase.js';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from '../../shared/utils/toast.js';
import { writeAuditLog } from '../audit/auditService.js';
import { notifyAdminSessionRecorded, formatArabicTime } from '../../shared/utils/adminNotificationService.js';
import { deductSessionCredit } from '../../shared/utils/creditManager.js';

/**
 * Service to handle group session attendance recording for Teachers and Admins.
 * Stores primary record in 'group_sessions' collection and individual student records in 'sessions'.
 */

export async function recordGroupAttendance({
  groupId,
  groupName,
  teacherId,
  teacherName,
  duration = 60,
  date,
  time,
  attendees = [], // Array of { studentId, studentName, status ('completed'/'student_absent'), absenceType, rating, note }
  generalNotes = '',
  rating = 5
}) {
  if (!groupId || !attendees || attendees.length === 0) {
    throw new Error("لا يوجد طلاب محددون لتسجيل الجلسة الجماعية.");
  }

  const sessionDate = date || new Date().toISOString().split('T')[0];
  const sessionDuration = parseInt(duration) || 60;
  const currentUserId = auth.currentUser ? auth.currentUser.uid : teacherId;
  const recordedAtStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  let presentCount = 0;
  let absentCount = 0;

  attendees.forEach(att => {
    if (att.status === 'completed' || att.isPresent === true) {
      presentCount++;
      att.status = 'completed';
    } else {
      absentCount++;
      att.status = 'student_absent';
    }
  });

  const groupSessionId = `gsess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Create primary Group Session Record in 'group_sessions' collection
  const groupSessionDocRef = doc(db, "group_sessions", groupSessionId);
  const groupSessionPayload = {
    id: groupSessionId,
    groupId,
    groupName,
    teacherId,
    teacherName: teacherName || 'المعلم المعتمد',
    duration: sessionDuration,
    date: sessionDate,
    time: time || '05:30 مساءً',
    status: 'completed',
    totalCount: attendees.length,
    presentCount,
    absentCount,
    generalNotes: generalNotes || '',
    attendees: attendees.map(a => ({
      studentId: a.studentId,
      studentName: a.studentName,
      status: a.status,
      absenceType: a.status === 'student_absent' ? (a.absenceType || 'unexcused') : '',
      note: a.note || a.notes || ''
    })),
    recordedBy: currentUserId,
    recordedAt: recordedAtStr,
    createdAt: serverTimestamp()
  };

  await setDoc(groupSessionDocRef, groupSessionPayload);

  // إرسال إشعار فوري للأدمن بتسجيل الحصة الجماعية
  notifyAdminSessionRecorded({
    teacherId: teacherId,
    teacherName: teacherName || 'المعلم المعتمد',
    targetName: groupName,
    sessionType: 'group',
    scheduledTime: time || '05:30 مساءً',
    recordedTime: recordedAtStr || formatArabicTime(),
    groupId: groupId,
    sessionId: groupSessionId
  }).catch(err => console.warn("Error notifying admin group session recorded:", err));

  // 2. Fetch teacher group hourly rate for earnings calculation
  let groupHourlyRate = 120;
  try {
    const tSnap = await getDoc(doc(db, "users", teacherId));
    if (tSnap.exists()) {
      const tData = tSnap.data();
      groupHourlyRate = parseFloat(tData.hourlyRateGroup || tData.hourlyRateIndividual || tData.hourlyRate || 120);
    }
  } catch (e) {}

  const durationHours = sessionDuration / 60;
  const groupSessionEarnings = durationHours * groupHourlyRate;

  // 3. Create 1 Single Financial Record for the Group Session in 'sessions' collection (used for teacher salary calculation)
  const financialSessRef = doc(db, "sessions", groupSessionId);
  const financialSessionData = {
    id: groupSessionId,
    groupSessionId: groupSessionId,
    groupBatchId: groupSessionId,
    studentId: groupId,
    studentName: `مجموعة: ${groupName}`,
    teacherId: teacherId,
    teacherName: teacherName || 'المعلم المعتمد',
    groupId: groupId,
    groupName: groupName,
    type: 'group',
    sessionType: 'group',
    duration: sessionDuration,
    date: sessionDate,
    time: time || '05:30 مساءً',
    status: 'completed',
    notes: generalNotes || `حصة جماعية لمجموعة (${groupName})`,
    hourlyRateUsed: groupHourlyRate,
    teacherEarnings: groupSessionEarnings,
    approved: true,
    salaryCalculated: true,
    isCalculated: true,
    isFinancialRecord: true,
    isSalaryRecord: true,
    isStudentRecordOnly: false,
    recordedBy: currentUserId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(financialSessRef, financialSessionData);

  // 4. Create individual student session records in 'sessions' collection ONLY for student history, stats, and attendance reports
  // NOTE: teacherEarnings is set to 0 and isStudentRecordOnly is true so these do NOT count toward teacher salary or create duplicate salary lines.
  const sessionPromises = attendees.map(async (att) => {
    const isCompleted = att.status === 'completed';
    const isAbsent = att.status === 'student_absent';
    const studentSessId = `gsess_std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sessRef = doc(db, "sessions", studentSessId);

    const sessionData = {
      id: studentSessId,
      groupSessionId,
      groupBatchId: groupSessionId,
      studentId: att.studentId,
      studentName: att.studentName,
      teacherId: teacherId,
      teacherName: teacherName || 'المعلم المعتمد',
      groupId: groupId,
      groupName: groupName,
      type: 'group',
      sessionType: 'group',
      duration: sessionDuration,
      date: sessionDate,
      time: time || '05:30 مساءً',
      status: att.status || 'completed',
      absenceType: isAbsent ? (att.absenceType || 'unexcused') : '',
      rating: parseFloat(att.rating || rating) || 5.0,
      notes: att.note ? `${generalNotes ? generalNotes + ' | ' : ''}ملاحظة الطالب: ${att.note}` : (generalNotes || `حضور طالب في مجموعة (${groupName})`),
      hourlyRateUsed: groupHourlyRate,
      teacherEarnings: 0, // 0 for student attendance record to prevent salary multiplication
      approved: true,
      salaryCalculated: false,
      isCalculated: false,
      isStudentRecordOnly: true, // Marked as student attendance log only
      isSalaryRecord: false,
      recordedBy: currentUserId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(sessRef, sessionData);

    // Update student stats in 'students' collection if completed
    if (isCompleted) {
      try {
        const studentRef = doc(db, "students", att.studentId);
        const sSnap = await getDoc(studentRef);

        if (sSnap.exists()) {
          const sData = sSnap.data();
          const currentSessions = parseInt(sData.sessionsCount) || 0;
          const currentHours = parseFloat(sData.hoursCount) || 0.0;
          const currentRating = parseFloat(sData.averageRating) || 5.0;

          const addedHours = sessionDuration / 60;
          const newSessionsCount = currentSessions + 1;
          const newHoursCount = Math.round((currentHours + addedHours) * 100) / 100;
          const newRating = Math.round(((currentRating * currentSessions + (parseFloat(att.rating || rating) || 5.0)) / newSessionsCount) * 10) / 10;

          await updateDoc(studentRef, {
            sessionsCount: newSessionsCount,
            hoursCount: newHoursCount,
            averageRating: newRating,
            lastSessionDate: sessionDate
          });
        }
      } catch (err) {
        console.warn(`Error updating stats for student ${att.studentId}:`, err);
      }
    }

    // Deduct student package credit
    if (isCompleted || (isAbsent && att.absenceType === 'unexcused')) {
      try {
        await deductSessionCredit({
          sessionId: studentSessId,
          studentId: att.studentId,
          studentName: att.studentName,
          teacherId: teacherId,
          teacherName: teacherName || 'المعلم المعتمد',
          status: att.status || 'completed',
          absenceType: isAbsent ? (att.absenceType || 'unexcused') : '',
          actor: { uid: currentUserId, name: teacherName || 'المعلم' }
        });
      } catch (deductErr) {
        console.warn(`Error deducting credit for student ${att.studentId}:`, deductErr);
      }
    }

    return studentSessId;
  });

  await Promise.all(sessionPromises);

  // Audit Log
  try {
    await writeAuditLog(
      currentUserId,
      teacherName || "المعلم",
      "RECORD_GROUP_SESSION",
      groupId,
      { groupName, count: attendees.length, presentCount, absentCount, date: sessionDate }
    );
  } catch (e) {}

  return {
    groupSessionId,
    presentCount,
    absentCount,
    totalCount: attendees.length
  };
}
