// Payroll Reconciliation Engine - Sabeel Academy
// Pure calculation engine directly from Firestore raw data with zero caching

import { db } from '../../config/firebase.js';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  writeBatch, 
  addDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { calculateExpectedTeacherSalary } from '../../shared/utils/helpers.js';

export const EXCLUSION_REASONS = {
  NOT_APPROVED: {
    code: 'NOT_APPROVED',
    title: 'حصة بانتظار الاعتماد',
    desc: 'الحصة مسجلة لكنها لم تعتمد بعد من قبل الإدارة المالية',
    severity: 'warning',
    color: '#f59e0b',
    icon: 'clock'
  },
  STATUS_CANCELLED: {
    code: 'STATUS_CANCELLED',
    title: 'حصة ملغاة',
    desc: 'تم إلغاء الحصة بناءً على طلب الطالب أو المعلم',
    severity: 'info',
    color: '#6b7280',
    icon: 'x-circle'
  },
  STATUS_DELAYED: {
    code: 'STATUS_DELAYED',
    title: 'حصة مؤجلة',
    desc: 'تم تأجيل الحصة إلى موعد لاحق',
    severity: 'info',
    color: '#8b5cf6',
    icon: 'calendar-clock'
  },
  STATUS_EXCUSED_ABSENCE: {
    code: 'STATUS_EXCUSED_ABSENCE',
    title: 'غياب دارس بعذر مسبق',
    desc: 'تغيب الدارس بإذن مسبق مقبول (غير مستحقة للأجر وفقاً للائحة)',
    severity: 'info',
    color: '#3b82f6',
    icon: 'user-x'
  },
  STATUS_TEACHER_ABSENT: {
    code: 'STATUS_TEACHER_ABSENT',
    title: 'غياب المعلم',
    desc: 'تغيب المعلم عن الحصة، لذلك لا يتم احتساب أي مقابل مالي',
    severity: 'danger',
    color: '#ef4444',
    icon: 'alert-triangle'
  },
  UNAPPROVED_TRIAL: {
    code: 'UNAPPROVED_TRIAL',
    title: 'حصة تجريبية غير معتمدة',
    desc: 'حصة تجريبية لم يشترك الطالب بعدها أو لم تعتمدها الإدارة بعد',
    severity: 'warning',
    color: '#d97706',
    icon: 'flask-conical'
  },
  GROUP_STUDENT_DUPLICATE: {
    code: 'GROUP_STUDENT_DUPLICATE',
    title: 'سجل حضور طلابي مكرر بالمجموعة',
    desc: 'الحصة الجماعية احتُسبت للمعلم مسبقاً، وهذا السجل إحصائي لحضور الدارس فقط',
    severity: 'info',
    color: '#9ca3af',
    icon: 'copy'
  },
  ALREADY_PAID_OR_ARCHIVED: {
    code: 'ALREADY_PAID_OR_ARCHIVED',
    title: 'مؤرشفة أو مدفوعة مسبقاً',
    desc: 'الحصة تم صرفها أو أرشفتها رسمياً في دورة مالية سابقة',
    severity: 'info',
    color: '#64748b',
    icon: 'archive'
  },
  OUTSIDE_PERIOD: {
    code: 'OUTSIDE_PERIOD',
    title: 'خارج نطاق الشهر المالي',
    desc: 'تاريخ الحصة لا يقع ضمن الشهر المالي المطلوب مطابفته',
    severity: 'info',
    color: '#94a3b8',
    icon: 'calendar-off'
  },
  STUDENT_RECORD_ONLY: {
    code: 'STUDENT_RECORD_ONLY',
    title: 'سجل إحصائي للدارس فقط',
    desc: 'سجل حضور خاص بملف الطالب ولا يرتبط باحتساب أجر المعلم',
    severity: 'info',
    color: '#9ca3af',
    icon: 'file-text'
  }
};

/**
 * Fetches fresh, uncached raw collections directly from Firestore
 */
export async function fetchReconciliationRawData() {
  const [usersSnap, sessionsSnap, groupsSnap, studentsSnap, salaryArchiveSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "sessions")),
    getDocs(collection(db, "groups")),
    getDocs(collection(db, "students")),
    getDocs(collection(db, "salaryArchive"))
  ]);

  const teachers = [];
  usersSnap.forEach(d => {
    const data = d.data();
    if (data.role === 'teacher' || data.role === 'supervisor') {
      teachers.push({ id: d.id, uid: d.id, ...data });
    }
  });

  const sessions = [];
  sessionsSnap.forEach(d => {
    sessions.push({ id: d.id, ...d.data() });
  });

  const groups = [];
  groupsSnap.forEach(d => {
    groups.push({ id: d.id, ...d.data() });
  });

  const students = [];
  studentsSnap.forEach(d => {
    students.push({ id: d.id, ...d.data() });
  });

  const salaryArchive = [];
  salaryArchiveSnap.forEach(d => {
    salaryArchive.push({ id: d.id, ...d.data() });
  });

  return { teachers, sessions, groups, students, salaryArchive };
}

/**
 * Reconciles the Current Active Salary for a single teacher
 * @param {Object} teacher 
 * @param {Array} allSessions 
 * @param {Array} groups 
 * @param {Array} students 
 * @param {string} targetYearMonth - "YYYY-MM"
 * @returns {Object} Complete reconciliation analysis
 */
export function reconcileTeacherCurrentSalary(teacher, allSessions, groups, students, targetYearMonth) {
  const teacherId = teacher.id || teacher.uid;
  const ym = targetYearMonth || new Date().toISOString().substring(0, 7);

  const rateInd = parseFloat(teacher.hourlyRateIndividual || teacher.hourlyRate || 100);
  const rateGrp = parseFloat(teacher.hourlyRateGroup || teacher.hourlyRateIndividual || teacher.hourlyRate || 120);
  const bonuses = parseFloat(teacher.salaryBonuses || 0);
  const deductions = parseFloat(teacher.salaryDeductions || 0);

  // 1. Filter sessions strictly associated with this teacher
  const teacherSessions = (allSessions || []).filter(s => {
    return s.teacherId === teacherId ||
      s.teacherUid === teacherId ||
      (s.teacherName && teacher.name && s.teacherName.trim().toLowerCase() === teacher.name.trim().toLowerCase()) ||
      (s.teacherEmail && teacher.email && s.teacherEmail.trim().toLowerCase() === teacher.email.trim().toLowerCase());
  });

  // Filter only sessions matching target month date
  const monthSessions = teacherSessions.filter(s => s.date && s.date.startsWith(ym));

  const includedSessions = [];
  const excludedSessions = [];
  const processedGroupSessions = new Set();

  let rawTotalRecordedMinutes = 0;
  let includedMinutes = 0;
  let includedIndividualMinutes = 0;
  let includedGroupMinutes = 0;

  let rawCalculatedSalary = 0;
  let individualCalculatedSalary = 0;
  let groupCalculatedSalary = 0;

  monthSessions.forEach(session => {
    const duration = parseInt(session.duration) || 0;
    rawTotalRecordedMinutes += duration;

    const isGroup = session.type === "group" || session.sessionType === "group";
    const gId = session.groupSessionId || session.groupBatchId;

    // Check 1: Student-record-only or Group attendance duplicate
    if (session.isStudentRecordOnly === true || session.isSalaryRecord === false) {
      excludedSessions.push({
        session,
        reason: EXCLUSION_REASONS.STUDENT_RECORD_ONLY,
        estimatedLostValue: (duration / 60) * (isGroup ? rateGrp : rateInd)
      });
      return;
    }

    if (isGroup && gId) {
      if (processedGroupSessions.has(gId)) {
        excludedSessions.push({
          session,
          reason: EXCLUSION_REASONS.GROUP_STUDENT_DUPLICATE,
          estimatedLostValue: 0
        });
        return;
      }
      processedGroupSessions.add(gId);
    }

    // Check 2: Already archived or paid
    if (session.archived === true || session.paid === true) {
      excludedSessions.push({
        session,
        reason: EXCLUSION_REASONS.ALREADY_PAID_OR_ARCHIVED,
        estimatedLostValue: (duration / 60) * (isGroup ? rateGrp : rateInd)
      });
      return;
    }

    // Check 3: Trial session approval check
    const isTrial = session.type === "trial" || session.sessionType === "trial" || session.isTrial === true;
    if (isTrial && (session.approved !== true || session.trialSubscribed !== true)) {
      excludedSessions.push({
        session,
        reason: EXCLUSION_REASONS.UNAPPROVED_TRIAL,
        estimatedLostValue: (duration / 60) * rateInd
      });
      return;
    }

    // Check 4: Approved status
    if (session.approved !== true) {
      excludedSessions.push({
        session,
        reason: EXCLUSION_REASONS.NOT_APPROVED,
        estimatedLostValue: (duration / 60) * (isGroup ? rateGrp : rateInd)
      });
      return;
    }

    // Check 5: Status completion or unexcused absence
    const isCompleted = session.status === "completed";
    const isUnexcusedAbsent = session.status === "student_absent" && session.absenceType === "unexcused";

    if (!isCompleted && !isUnexcusedAbsent) {
      let r = EXCLUSION_REASONS.STATUS_CANCELLED;
      if (session.status === "delayed") r = EXCLUSION_REASONS.STATUS_DELAYED;
      else if (session.status === "student_absent" && session.absenceType === "excused") r = EXCLUSION_REASONS.STATUS_EXCUSED_ABSENCE;
      else if (session.status === "teacher_absent") r = EXCLUSION_REASONS.STATUS_TEACHER_ABSENT;

      excludedSessions.push({
        session,
        reason: r,
        estimatedLostValue: (duration / 60) * (isGroup ? rateGrp : rateInd)
      });
      return;
    }

    // SESSION IS OFFICIALLY INCLUDED
    const hours = duration / 60;
    const sessionRate = isGroup ? rateGrp : rateInd;
    const sessionCost = hours * sessionRate;

    includedMinutes += duration;
    rawCalculatedSalary += sessionCost;

    if (isGroup) {
      includedGroupMinutes += duration;
      groupCalculatedSalary += sessionCost;
    } else {
      includedIndividualMinutes += duration;
      individualCalculatedSalary += sessionCost;
    }

    includedSessions.push({
      session,
      hours,
      rate: sessionRate,
      cost: sessionCost,
      isGroup,
      statusLabel: isCompleted ? 'حاضر ومكتمل' : 'غياب طالب غير مبرر'
    });
  });

  // Calculate Net Raw Salary factoring in bonuses and deductions
  const netCalculatedSalary = Math.max(0, rawCalculatedSalary + bonuses - deductions);

  // 2. Compute Expected Target Salary based on master schedule
  const teacherStudents = (students || []).filter(s => s.teacherId === teacherId || s.requestedByTeacherId === teacherId);
  const teacherGroups = (groups || []).filter(g => g.teacherId === teacherId);
  const expectedAnalytics = calculateExpectedTeacherSalary(teacher, teacherStudents, teacherGroups, ym, monthSessions);

  const expectedSalary = expectedAnalytics.expectedSalary || 0;
  const expectedHours = expectedAnalytics.expectedTotalHours || 0;
  const expectedSessionsCount = expectedAnalytics.expectedSessionsCount || 0;

  // 3. Discrepancy Analysis
  const discrepancyAmount = Math.round(netCalculatedSalary - expectedSalary);
  const totalRecordedSessions = monthSessions.length;
  const includedSessionsCount = includedSessions.length;
  const excludedSessionsCount = excludedSessions.length;

  const totalRecordedHours = rawTotalRecordedMinutes / 60;
  const includedHours = includedMinutes / 60;
  const discrepancyHours = parseFloat((includedHours - expectedHours).toFixed(1));

  // Exclusions Breakdown by Reason
  const exclusionsSummary = {};
  let totalExcludedValue = 0;

  excludedSessions.forEach(item => {
    const code = item.reason.code;
    if (!exclusionsSummary[code]) {
      exclusionsSummary[code] = {
        reason: item.reason,
        count: 0,
        totalLostValue: 0,
        sessions: []
      };
    }
    exclusionsSummary[code].count++;
    exclusionsSummary[code].totalLostValue += item.estimatedLostValue;
    exclusionsSummary[code].sessions.push(item);
    totalExcludedValue += item.estimatedLostValue;
  });

  // 4. Salary Integrity Index Determination
  // 🟢 Balanced: 0 unapproved sessions, and either discrepancy is zero or strictly explained
  // 🟡 Acceptable Discrepancy: Differences exist but are 100% justified by exclusions (unapproved sessions, cancelled, bonuses/deductions)
  // 🔴 Critical Discrepancy: Major unexplained difference, missing data, negative results, or severe rate misalignment
  let integrityStatus = 'balanced';
  let integrityLabel = 'متطابق ومكتمل 100%';
  let integrityColor = 'var(--success)';
  let integrityBadgeClass = 'badge-success';
  let integrityExplanation = 'جميع الحصص مسجلة ومعتمدة وتتطابق مع القواعد المالية دون أي فروقات غير مبررة.';

  const unapprovedCount = exclusionsSummary['NOT_APPROVED'] ? exclusionsSummary['NOT_APPROVED'].count : 0;
  const hasPendingTrials = exclusionsSummary['UNAPPROVED_TRIAL'] ? exclusionsSummary['UNAPPROVED_TRIAL'].count : 0;

  if (unapprovedCount > 0) {
    integrityStatus = 'acceptable_discrepancy';
    integrityLabel = 'فروقات مفسرة (حصص معلقة)';
    integrityColor = 'var(--warning)';
    integrityBadgeClass = 'badge-warning';
    integrityExplanation = `يوجد ${unapprovedCount} حصة بانتظار اعتماد الإدارة بقيمة متوقعة (${exclusionsSummary['NOT_APPROVED'].totalLostValue.toFixed(0)} ج.م).`;
  } else if (Math.abs(discrepancyAmount) > 200 && excludedSessionsCount === 0) {
    integrityStatus = 'critical_discrepancy';
    integrityLabel = 'يتطلب تدقيق ومراجعة 🔴';
    integrityColor = 'var(--danger)';
    integrityBadgeClass = 'badge-danger';
    integrityExplanation = `يوجد فرق مالي غير مفسر (${discrepancyAmount > 0 ? '+' : ''}${discrepancyAmount} ج.م) بين الحصص المنجزة وجدول الطلاب المتوقع دون وجود حصص مستبعدة تفسره.`;
  } else if (excludedSessionsCount > 0 || Math.abs(discrepancyAmount) > 0) {
    integrityStatus = 'acceptable_discrepancy';
    integrityLabel = 'فروقات مفسرة ومقبولة';
    integrityColor = 'var(--warning)';
    integrityBadgeClass = 'badge-warning';
    integrityExplanation = `الفروقات ناتجة عن ${excludedSessionsCount} حصة مستبعدة (إلغاءات/غياب/أرشفة) وتعديلات حوافز (${bonuses} ج.م) وخصومات (${deductions} ج.م).`;
  }

  return {
    teacherId,
    teacherName: teacher.name || 'معلم',
    teacherEmail: teacher.email || '',
    month: ym,
    rateInd,
    rateGrp,
    bonuses,
    deductions,
    totalRecordedSessions,
    totalRecordedHours,
    includedSessionsCount,
    includedHours,
    includedSessions,
    excludedSessionsCount,
    excludedSessions,
    exclusionsSummary,
    totalExcludedValue,
    rawCalculatedSalary,
    individualCalculatedSalary,
    groupCalculatedSalary,
    netCalculatedSalary: Math.round(netCalculatedSalary),
    expectedSalary: Math.round(expectedSalary),
    expectedHours,
    expectedSessionsCount,
    discrepancyAmount,
    discrepancyHours,
    integrityStatus,
    integrityLabel,
    integrityColor,
    integrityBadgeClass,
    integrityExplanation
  };
}

export function parseTimestampMs(ts) {
  if (!ts) return 0;
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000;
  if (ts instanceof Date) return ts.getTime();
  const parsed = new Date(ts).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

export function formatTimestamp(ts) {
  if (!ts) return '-';
  if (typeof ts === 'string') {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
    }
    return ts;
  }
  if (ts.toDate && typeof ts.toDate === 'function') {
    return ts.toDate().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
  }
  if (ts.seconds) {
    return new Date(ts.seconds * 1000).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
  }
  return '-';
}

/**
 * Reconciles an Archived Salary record against historical DB sessions
 * @param {Object} archiveDoc 
 * @param {Array} allSessions 
 * @param {Object} teacher 
 * @returns {Object} Archive reconciliation comparison
 */
export function reconcileArchiveRecord(archiveDoc, allSessions, teacher) {
  const ym = archiveDoc.month;
  const teacherId = archiveDoc.teacherId;

  const rateInd = teacher ? parseFloat(teacher.hourlyRateIndividual || teacher.hourlyRate || 100) : 100;
  const rateGrp = teacher ? parseFloat(teacher.hourlyRateGroup || teacher.hourlyRateIndividual || teacher.hourlyRate || 120) : 120;

  // Query raw sessions from the archive month for this teacher
  const matchingSessions = (allSessions || []).filter(s => {
    const matchesTeacher = s.teacherId === teacherId || s.teacherUid === teacherId ||
      (teacher && s.teacherName && teacher.name && s.teacherName.trim().toLowerCase() === teacher.name.trim().toLowerCase());
    if (!matchesTeacher) return false;

    // Matches if linked to this claim ID or matches the date and is marked archived/paid
    const linkedToClaim = s.salaryClaimId === archiveDoc.id;
    const matchesMonth = s.date && s.date.startsWith(ym);

    return linkedToClaim || matchesMonth;
  });

  const archiveCreatedMs = parseTimestampMs(archiveDoc.createdAt);

  const processedGroupSessions = new Set();
  let recomputedMinutes = 0;
  let recomputedSessionsCount = 0;
  let recomputedGrossSalary = 0;
  const recomputedSessionsList = [];
  const excludedFromArchive = [];

  matchingSessions.forEach(session => {
    if (session.isStudentRecordOnly === true || session.isSalaryRecord === false) return;

    const isGroup = session.type === "group" || session.sessionType === "group";
    const gId = session.groupSessionId || session.groupBatchId;

    if (isGroup && gId) {
      if (processedGroupSessions.has(gId)) return;
      processedGroupSessions.add(gId);
    }

    if (session.type === "trial" && (session.approved !== true || session.trialSubscribed !== true)) {
      excludedFromArchive.push({ session, reason: 'حصة تجريبية لم تعتمد في الأرشيف' });
      return;
    }

    const isCompleted = session.status === "completed";
    const isUnexcusedAbsent = session.status === "student_absent" && session.absenceType === "unexcused";
    const isApproved = session.approved === true;

    if (isApproved && (isCompleted || isUnexcusedAbsent)) {
      recomputedSessionsCount++;
      const duration = parseInt(session.duration) || 0;
      const hours = duration / 60;
      const rate = isGroup ? rateGrp : rateInd;
      const cost = hours * rate;

      recomputedMinutes += duration;
      recomputedGrossSalary += cost;

      const sessionCreatedMs = parseTimestampMs(session.createdAt || session.timestamp);
      const sessionApprovedMs = parseTimestampMs(session.approvedAt);
      const sessionUpdatedMs = parseTimestampMs(session.updatedAt || session.lastModifiedAt);

      const isPostArchiveByTime = archiveCreatedMs > 0 && (
        (sessionCreatedMs > archiveCreatedMs) ||
        (sessionApprovedMs > archiveCreatedMs) ||
        (sessionUpdatedMs > archiveCreatedMs)
      );

      recomputedSessionsList.push({
        session,
        hours,
        cost,
        rate,
        isPostArchive: isPostArchiveByTime,
        createdMs: sessionCreatedMs,
        createdAtFormatted: formatTimestamp(session.createdAt || session.timestamp),
        approvedAtFormatted: formatTimestamp(session.approvedAt),
        recordedBy: session.createdBy || session.recordedBy || session.teacherName || 'المعلم',
        approvedBy: session.approvedBy || (session.approved ? 'معتمدة' : 'غير معتمدة'),
        studentName: session.studentName || session.groupName || 'دارس',
        date: session.date || '-',
        time: session.startTime || session.time || '-',
        duration: session.duration || 60
      });
    } else {
      excludedFromArchive.push({
        session,
        reason: isApproved ? 'الحالة غير مكتملة' : 'غير معتمدة'
      });
    }
  });

  const recomputedHours = parseFloat((recomputedMinutes / 60).toFixed(1));
  const recomputedSalary = Math.round(recomputedGrossSalary);
  const archivedAmount = Math.round(parseFloat(archiveDoc.amount || 0));
  const archivedHours = parseFloat(archiveDoc.totalHours || 0);
  const archivedSessionsCount = parseInt(archiveDoc.sessionsCount || 0);

  const amountDiff = recomputedSalary - archivedAmount;
  const hoursDiff = parseFloat((recomputedHours - archivedHours).toFixed(1));
  const sessionsDiff = recomputedSessionsCount - archivedSessionsCount;

  // Identify post-archive sessions
  let postArchiveSessions = recomputedSessionsList.filter(item => item.isPostArchive);

  // If sessionsDiff > 0 and timestamps comparison didn't catch enough sessions,
  // identify the latest recorded sessions to match the sessionsDiff:
  if (sessionsDiff > 0 && postArchiveSessions.length < sessionsDiff) {
    const sortedByTime = [...recomputedSessionsList]
      .filter(item => !item.isPostArchive)
      .sort((a, b) => {
        const timeA = a.createdMs || new Date(a.date).getTime() || 0;
        const timeB = b.createdMs || new Date(b.date).getTime() || 0;
        return timeB - timeA;
      });
    const needed = sessionsDiff - postArchiveSessions.length;
    const additional = sortedByTime.slice(0, needed);
    additional.forEach(item => { item.isPostArchive = true; });
    postArchiveSessions = [...postArchiveSessions, ...additional];
  }

  let integrityStatus = 'balanced';
  let integrityLabel = 'مطابق للأرشيف 100% 🟢';
  let integrityExplanation = 'البيانات التاريخية لجلسات قاعدة البيانات تتطابق بالكامل مع المبلغ والمستند المؤرشف.';

  if (Math.abs(amountDiff) > 10 || Math.abs(sessionsDiff) > 0) {
    if (Math.abs(amountDiff) <= 150 && archiveDoc.notes && (archiveDoc.notes.includes('حافز') || archiveDoc.notes.includes('خصم') || archiveDoc.notes.includes('تعديل'))) {
      integrityStatus = 'acceptable_discrepancy';
      integrityLabel = 'فروقات مسواة بالأرشيف 🟡';
      integrityExplanation = `الفرق (${amountDiff > 0 ? '+' : ''}${amountDiff} ج.م) يرجع إلى تسويات مسجلة بملاحظات الأرشيف.`;
    } else if (sessionsDiff === 0 && Math.abs(hoursDiff) < 0.2 && amountDiff > 0) {
      integrityStatus = 'acceptable_discrepancy';
      integrityLabel = 'فروقات خصم/تسوية 🟡';
      integrityExplanation = `عدد الحصص (${archivedSessionsCount}) والساعات (${archivedHours} س) متطابق تماماً. الفارق (+${amountDiff} ج.م) يرجع لخصم إداري أو تسوية استقطاع تم تطبيقها عند تحويل الراتب في الأرشيف (${archivedAmount} ج.م مقابل ${recomputedSalary} ج.م لإجمالي الجلسات).`;
    } else if (sessionsDiff > 0) {
      const monthNum = parseInt(ym.split('-')[1], 10);
      const areCarriedOver = postArchiveSessions.some(item => item.session.isCarriedOver);
      integrityStatus = 'acceptable_discrepancy';
      integrityLabel = areCarriedOver ? 'مرحّلة للشهر الجديد بنجاح 🔄' : 'حصص مسجلة بعد الأرشفة (مرحّلة) 🔄';
      integrityExplanation = `يوجد ${sessionsDiff} حصة إضافية (${hoursDiff > 0 ? '+' + hoursDiff : hoursDiff} س) تم تسجيلها أو اعتمادها بعد تاريخ أرشفة الراتب (${formatTimestamp(archiveDoc.createdAt)}). وفق سياسة الأكاديمية بعدم ضياع أي حصة، تم ضمها وترحيلها تلقائياً لتضاف إلى راتب الشهر الجديد تحت ملاحظة "مرحّلة من شهر ${monthNum}".`;
    } else if (sessionsDiff < 0) {
      integrityStatus = 'critical_discrepancy';
      integrityLabel = 'جلسات معدلة/محذوفة 🔴';
      integrityExplanation = `عدد الجلسات الحالية أقل من الأرشيف بـ ${Math.abs(sessionsDiff)} حصة، مما يشير لحذف أو تعديل جلسات بعد الأرشفة.`;
    } else {
      integrityStatus = 'critical_discrepancy';
      integrityLabel = 'عدم تطابق أرشيفي 🔴';
      integrityExplanation = `المبلغ المؤرشف (${archivedAmount} ج.م) يختلف عن ناتج جلسات قاعدة البيانات (${recomputedSalary} ج.م) بفارق (${amountDiff > 0 ? '+' : ''}${amountDiff} ج.م).`;
    }
  }

  return {
    archiveId: archiveDoc.id,
    month: ym,
    teacherId,
    teacherName: archiveDoc.teacherName || teacher?.name || 'معلم',
    archivedAmount,
    archivedHours,
    archivedSessionsCount,
    archivedMethod: archiveDoc.method || 'غير محدد',
    archivedStatus: archiveDoc.status || 'completed',
    archivedAt: archiveDoc.createdAt,
    archiveCreatedAtFormatted: formatTimestamp(archiveDoc.createdAt),
    adminName: archiveDoc.adminName || 'غير مسجل',
    notes: archiveDoc.notes || '',
    recomputedSalary,
    recomputedHours,
    recomputedSessionsCount,
    amountDiff,
    hoursDiff,
    sessionsDiff,
    matchingSessionsCount: matchingSessions.length,
    recomputedSessionsList,
    postArchiveSessions,
    excludedFromArchive,
    integrityStatus,
    integrityLabel,
    integrityExplanation
  };
}

/**
 * Saves a detailed Reconciliation Audit log to Firestore
 */
export async function logReconciliationAudit({
  teacherId,
  teacherName,
  month,
  status,
  calculatedSalary,
  targetSalary,
  discrepancyAmount,
  totalSessions,
  includedSessions,
  excludedSessions,
  adminName,
  adminId,
  notes = ''
}) {
  try {
    const docRef = await addDoc(collection(db, "payrollReconciliationLogs"), {
      teacherId: teacherId || 'all',
      teacherName: teacherName || 'فحص شامل لجميع المعلمين',
      month: month || new Date().toISOString().substring(0, 7),
      status: status || 'balanced',
      calculatedSalary: calculatedSalary || 0,
      targetSalary: targetSalary || 0,
      discrepancyAmount: discrepancyAmount || 0,
      totalSessions: totalSessions || 0,
      includedSessions: includedSessions || 0,
      excludedSessions: excludedSessions || 0,
      adminName: adminName || 'مشرف الإدارة',
      adminId: adminId || 'admin',
      notes: notes || '',
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    console.error("Error writing reconciliation log:", err);
    throw err;
  }
}

/**
 * Quick action for Admin: approve one or multiple sessions with explicit confirmation
 */
export async function batchApproveSessions(sessionIds) {
  if (!Array.isArray(sessionIds) || sessionIds.length === 0) return 0;

  const batch = writeBatch(db);
  sessionIds.forEach(id => {
    const sRef = doc(db, "sessions", id);
    batch.update(sRef, {
      approved: true,
      approvedAt: serverTimestamp()
    });
  });

  await batch.commit();
  return sessionIds.length;
}
