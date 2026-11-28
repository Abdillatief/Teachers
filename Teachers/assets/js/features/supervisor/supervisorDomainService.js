import { db } from '../../config/firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export const LESSON_STATUSES = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  STUDENT_ABSENT: 'student_absent',
  TEACHER_ABSENT: 'teacher_absent',
  DELAYED: 'delayed',
  COMPENSATORY: 'compensatory',
  CANCELLED: 'cancelled'
};

export const LESSON_STATUS_META = {
  scheduled: { key: 'scheduled', label: 'مجدولة', tone: 'primary' },
  completed: { key: 'completed', label: 'مكتملة', tone: 'success' },
  student_absent: { key: 'student_absent', label: 'غياب طالب', tone: 'warning' },
  teacher_absent: { key: 'teacher_absent', label: 'غياب معلم', tone: 'danger' },
  delayed: { key: 'delayed', label: 'مؤجلة', tone: 'info' },
  compensatory: { key: 'compensatory', label: 'تعويضية', tone: 'primary' },
  cancelled: { key: 'cancelled', label: 'ملغاة', tone: 'neutral' }
};

export const STUDENT_STATUS_META = {
  active: { label: 'نشط ومنتظم', tone: 'success' },
  Active: { label: 'نشط ومنتظم', tone: 'success' },
  paused: { label: 'متوقف مؤقتاً', tone: 'warning' },
  frozen: { label: 'مجمد مؤقتاً', tone: 'warning' },
  Suspended: { label: 'موقوف', tone: 'danger' },
  suspended: { label: 'موقوف', tone: 'danger' },
  pending_approval: { label: 'بانتظار الاعتماد', tone: 'info' },
  completed: { label: 'أنهى الباقة', tone: 'neutral' },
  archived: { label: 'مؤرشف', tone: 'neutral' }
};

export const SUPERVISOR_REQUEST_TYPES = {
  student_schedule_change: 'طلب تعديل جدول طالب',
  teacher_replacement: 'طلب استبدال معلم لطالب',
  lesson_cancellation: 'طلب إلغاء حصة معتمدة',
  package_change: 'طلب تعديل أو تجديد باقة طالب',
  suspend_teacher: 'طلب إيقاف أو تجميد معلم',
  delete_student: 'طلب حذف أو أرشفة طالب',
  delete_session: 'طلب حذف سجل حصة',
  general_request: 'طلب أو تنبيه إداري عام'
};

export function getRequestTypeLabel(type) {
  return SUPERVISOR_REQUEST_TYPES[type] || 'طلب تشغيلي';
}

export function getLessonStatusMeta(status, data = {}) {
  const base = LESSON_STATUS_META[status] || { key: status || 'scheduled', label: status || 'غير محدد', tone: 'neutral' };
  if (status === LESSON_STATUSES.STUDENT_ABSENT) {
    return {
      ...base,
      label: data.absenceType === 'unexcused' ? 'غياب طالب (بدون عذر)' : 'غياب طالب (بعذر)'
    };
  }
  return base;
}

export function normalizeArabicDay(dayStr) {
  if (!dayStr) return '';
  return String(dayStr)
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه');
}

export function getArabicDayFromDate(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return '';
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const daysAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return daysAr[d.getDay()] || '';
}

export function parseTimeToMinutes(timeStr) {
  if (typeof timeStr === 'number' && !Number.isNaN(timeStr)) return timeStr;
  if (!timeStr || typeof timeStr !== 'string') return 9999;
  const str = timeStr.trim().toLowerCase();
  const isPM = str.includes('pm') || str.includes('مساءً') || str.includes('مساء') || /\bم\b/.test(str) || str.endsWith('م');
  const isAM = str.includes('am') || str.includes('صباحاً') || str.includes('صباح') || /\bص\b/.test(str) || str.endsWith('ص');

  let match = str.match(/(\d+):(\d+)/);
  if (!match) match = str.match(/(\d+)/);
  if (!match) return 9999;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;

  if (isPM && hours < 12) hours += 12;
  else if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function formatMinutesToTime(totalMinutes) {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = h24 >= 12 ? 'مساءً' : 'صباحاً';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatMinutesToInput24(totalMinutes) {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getStudentDefaultDuration(student) {
  if (!student) return '60';
  if (student.sessionDuration) return String(student.sessionDuration);
  if (student.packageDuration) return String(student.packageDuration);
  if (student.duration) return String(student.duration);

  const pkgStr = String(student.packageName || student.package || student.planName || '').toLowerCase();
  if (pkgStr.includes('30') || pkgStr.includes('نصف ساعة') || pkgStr.includes('ثلاثون')) return '30';
  if (pkgStr.includes('45') || pkgStr.includes('ساعة الا ربع') || pkgStr.includes('ساعة إلا ربع')) return '45';
  // "ساعة وربع" = 75 minutes (distinct from "ساعة إلا ربع" = 45). Check before the generic "ساعة" branch.
  if (pkgStr.includes('75') || pkgStr.includes('ساعة وربع') || pkgStr.includes('ساعة و ربع') || pkgStr.includes('ساعه وربع')) return '75';
  if (pkgStr.includes('90') || pkgStr.includes('ساعة ونصف') || pkgStr.includes('ساعة و نصف')) return '90';
  if (pkgStr.includes('120') || pkgStr.includes('ساعتان') || pkgStr.includes('ساعتين')) return '120';
  if (pkgStr.includes('60') || pkgStr.includes('ساعة')) return '60';

  const match = pkgStr.match(/(\d+)/);
  if (match) {
    const val = parseInt(match[1], 10);
    if ([30, 45, 60, 90, 120].includes(val)) return String(val);
  }
  return '60';
}

export function extractNonFinancialStudentSummary(studentId, s = {}) {
  const scheduleObj = s.schedule || null;
  const days = scheduleObj?.days || s.sessionDays || s.days || [];
  const uniformTime = scheduleObj?.uniformTime || s.sessionTime || s.time || '';
  const totalLessons = Number(s.totalLessons ?? s.totalPackageLessons ?? s.totalSessions ?? s.packageSessions ?? 0) || 0;
  // نفس ترتيب الحقول المستخدم في لوحة الأدمن وcreditManager (remainingLessons هو المصدر الرسمي)،
  // وإلا ممكن المتبقي يظهر عند المشرف بقيمة قديمة/مختلفة عن الأدمن.
  const remainingLessons = Number(s.remainingLessons ?? s.remainingSessions ?? 0) || 0;
  // "المستهلك" بيتحسب من الباقة الحالية نفسها: الإجمالي − المتبقي،
  // بدل العدّاد التراكمي usedLessons اللي بيطلع أرقام غلط بعد تجديد الباقة.
  const usedLessons = totalLessons > 0
    ? Math.max(0, totalLessons - remainingLessons)
    : (Number(s.usedLessons ?? s.usedPackageLessons ?? s.completedSessions ?? 0) || 0);

  return {
    studentId,
    name: s.name || '',
    age: s.age || '',
    gender: s.gender || '',
    parentName: s.parentName || '',
    parentPhone: s.parentPhone || s.phone || '',
    whatsapp: s.whatsapp || s.parentWhatsapp || s.parentPhone || s.phone || '',
    country: s.country || '',
    teacherId: s.teacherId || '',
    teacherName: s.teacherName || '',
    status: s.status || 'active',
    packageName: s.packageName || s.activePackageName || s.planName || '',
    sessionDuration: Number(getStudentDefaultDuration(s)) || 60,
    totalLessons,
    usedLessons,
    remainingLessons,
    remainingSessions: remainingLessons,
    subscriptionType: s.subscriptionType || (s.groupId ? 'group' : 'individual'),
    groupId: s.groupId || '',
    groupName: s.groupName || '',
    days: Array.isArray(days) ? days : [],
    sessionTime: uniformTime,
    schedule: scheduleObj || {
      days: Array.isArray(days) ? days : [],
      uniformTime,
      differentTimes: false,
      times: {}
    },
    memorizationDirection: s.memorizationDirection || 'ascending',
    lastMemorizedSurahId: s.lastMemorizedSurahId || null,
    lastMemorizedSurahName: s.lastMemorizedSurahName || '',
    lastMemorizedVerse: s.lastMemorizedVerse || null,
    notes: s.notes || '',
    updatedAt: serverTimestamp()
  };
}

export function extractNonFinancialTeacherProfile(teacherId, u = {}) {
  return {
    uid: teacherId,
    name: u.name || '',
    phone: u.phone || '',
    subject: u.subject || 'القرآن الكريم والعلوم الشرعية',
    status: u.status || 'pending',
    dailyWorkHours: Number(u.dailyWorkHours || u.workHoursPerDay || 0) || 0,
    workWindowHours: u.workWindowHours || '',
    weeklySchedule: u.weeklySchedule && typeof u.weeklySchedule === 'object' ? u.weeklySchedule : {},
    notes: u.notes || '',
    updatedAt: serverTimestamp()
  };
}

export async function syncStudentOperationalSummary(studentId, studentOverride = null) {
  if (!studentId) return;
  try {
    let studentData = studentOverride;
    if (!studentData) {
      const snap = await getDoc(doc(db, 'students', studentId));
      if (!snap.exists()) return;
      studentData = snap.data();
    }
    const payload = extractNonFinancialStudentSummary(studentId, studentData);
    await setDoc(doc(db, 'studentOperationalSummaries', studentId), payload, { merge: true });
  } catch (err) {
    console.warn('syncStudentOperationalSummary warning:', err?.message || err);
  }
}

export async function syncTeacherOperationalProfile(teacherId, userOverride = null) {
  if (!teacherId) return;
  try {
    let userData = userOverride;
    if (!userData) {
      const snap = await getDoc(doc(db, 'users', teacherId));
      if (!snap.exists()) return;
      userData = snap.data();
    }
    if (userData.role && userData.role !== 'teacher') return;
    const payload = extractNonFinancialTeacherProfile(teacherId, userData);
    await setDoc(doc(db, 'teacherOperationalProfiles', teacherId), payload, { merge: true });
  } catch (err) {
    console.warn('syncTeacherOperationalProfile warning:', err?.message || err);
  }
}

export async function backfillOperationalProjectionsIfNeeded() {
  try {
    const [studentsSnap, summariesSnap, usersSnap, profilesSnap] = await Promise.all([
      getDocs(collection(db, 'students')),
      getDocs(collection(db, 'studentOperationalSummaries')),
      getDocs(query(collection(db, 'users'), where('role', '==', 'teacher'))),
      getDocs(collection(db, 'teacherOperationalProfiles'))
    ]);

    const existingSummariesMap = new Map();
    summariesSnap.docs.forEach((d) => existingSummariesMap.set(d.id, d.data() || {}));
    const existingProfilesMap = new Map();
    profilesSnap.docs.forEach((d) => existingProfilesMap.set(d.id, d.data() || {}));

    const tasks = [];
    studentsSnap.forEach((docSnap) => {
      const existingSummary = existingSummariesMap.get(docSnap.id);
      const needsSync = !existingSummary || !existingSummary.name || !existingSummary.status || existingSummary.remainingLessons === undefined;
      if (needsSync) {
        const payload = extractNonFinancialStudentSummary(docSnap.id, docSnap.data());
        tasks.push(setDoc(doc(db, 'studentOperationalSummaries', docSnap.id), payload, { merge: true }));
      }
    });

    usersSnap.forEach((docSnap) => {
      const existingProfile = existingProfilesMap.get(docSnap.id);
      const needsSync = !existingProfile || !existingProfile.name || !existingProfile.status;
      if (needsSync) {
        const payload = extractNonFinancialTeacherProfile(docSnap.id, docSnap.data());
        tasks.push(setDoc(doc(db, 'teacherOperationalProfiles', docSnap.id), payload, { merge: true }));
      }
    });

    if (tasks.length > 0) {
      await Promise.allSettled(tasks);
    }
  } catch (err) {
    console.warn('backfillOperationalProjectionsIfNeeded warning:', err?.message || err);
  }
}

export async function logActivity({
  actorId,
  actorName,
  actorRole,
  actionType,
  targetCollection,
  targetId,
  summary = '',
  oldValue = null,
  newValue = null,
  reason = ''
}) {
  try {
    await addDoc(collection(db, 'activityLogs'), {
      actorId: actorId || 'system',
      actorName: actorName || 'النظام',
      actorRole: actorRole || 'supervisor',
      actionType: actionType || 'update',
      targetCollection: targetCollection || 'sessions',
      targetId: targetId || '',
      summary: summary || '',
      oldValue: oldValue || null,
      newValue: newValue || null,
      reason: reason || '',
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('logActivity warning:', err?.message || err);
  }
}

export function computeTeacherAvailableSlots({
  teacherProfile = null,
  students = [],
  groups = [],
  sessions = [],
  targetDate,
  slotDurationMinutes = 60
}) {
  const duration = Math.max(15, Number(slotDurationMinutes) || 60);
  const targetDayName = getArabicDayFromDate(targetDate);
  const normTargetDay = normalizeArabicDay(targetDayName);

  // Determine working intervals for that weekday
  const weeklySchedule = teacherProfile?.weeklySchedule || {};
  let workIntervals = [];
  let hasConfiguredSchedule = false;

  const matchedDayKey = Object.keys(weeklySchedule).find(
    (k) => normalizeArabicDay(k) === normTargetDay
  );

  if (matchedDayKey) {
    // A schedule exists for this weekday: never silently fall back to generic hours,
    // even when its windows are empty or malformed.
    hasConfiguredSchedule = true;
    if (Array.isArray(weeklySchedule[matchedDayKey]) && weeklySchedule[matchedDayKey].length > 0) {
      weeklySchedule[matchedDayKey].forEach((win) => {
        const startM = parseTimeToMinutes(win.start || win.from);
        const endM = parseTimeToMinutes(win.end || win.to);
        if (startM < 9999 && endM < 9999 && endM > startM) {
          workIntervals.push([startM, endM]);
        }
      });
    }
  }

  if (workIntervals.length === 0 && !hasConfiguredSchedule) {
    // Default operational academy hours: 08:00 AM to 11:00 PM
    workIntervals = [[8 * 60, 23 * 60]];
  }

  // Collect busy intervals
  const busyIntervals = [];
  const teacherId = teacherProfile?.uid || teacherProfile?.id || '';

  students.forEach((st) => {
    if (teacherId && st.teacherId !== teacherId) return;
    if (['archived', 'Suspended', 'suspended', 'pending_approval', 'paused', 'frozen'].includes(st.status)) return;
    if (st.subscriptionType === 'group' || st.groupId) return;

    const days = st.schedule?.days || st.sessionDays || st.days || [];
    const scheduledToday = days.some((d) => normalizeArabicDay(d) === normTargetDay);
    if (!scheduledToday) return;

    let timeStr = st.schedule?.uniformTime || st.sessionTime || st.time || '';
    if (st.schedule?.differentTimes && st.schedule?.times) {
      const timeKey = Object.keys(st.schedule.times).find((k) => normalizeArabicDay(k) === normTargetDay);
      if (timeKey) timeStr = st.schedule.times[timeKey];
    }
    const startM = parseTimeToMinutes(timeStr);
    if (startM < 9999) {
      const stDur = Number(getStudentDefaultDuration(st)) || 60;
      busyIntervals.push({
        start: startM,
        end: startM + stDur,
        label: `${st.name} (${stDur} د)`
      });
    }
  });

  groups.forEach((grp) => {
    if (teacherId && grp.teacherId !== teacherId) return;
    if (grp.status === 'archived') return;
    const grpDays = grp.day ? [grp.day] : (grp.days || []);
    const scheduledToday = grpDays.some((d) => normalizeArabicDay(d) === normTargetDay);
    if (!scheduledToday) return;

    const startM = parseTimeToMinutes(grp.time || '');
    if (startM < 9999) {
      const grpDur = Number(grp.duration || 60);
      busyIntervals.push({
        start: startM,
        end: startM + grpDur,
        label: `مجموعة: ${grp.name || 'حلقة'}`
      });
    }
  });

  sessions.forEach((sess) => {
    if (teacherId && sess.teacherId !== teacherId) return;
    if (sess.date !== targetDate) return;
    if (sess.status === LESSON_STATUSES.CANCELLED || sess.status === LESSON_STATUSES.DELAYED) return;

    const startM = parseTimeToMinutes(sess.time || sess.makeupTime || '');
    if (startM < 9999) {
      const sessDur = Number(sess.duration || 60);
      busyIntervals.push({
        start: startM,
        end: startM + sessDur,
        label: `${sess.studentName || 'حصة'} (${getLessonStatusMeta(sess.status, sess).label})`
      });
    }
  });

  const slots = [];
  const step = 30;
  workIntervals.forEach(([winStart, winEnd]) => {
    for (let t = winStart; t + duration <= winEnd; t += step) {
      const candidateEnd = t + duration;
      const overlaps = busyIntervals.some((b) => t < b.end && candidateEnd > b.start);
      if (!overlaps) {
        slots.push({
          startMinutes: t,
          endMinutes: candidateEnd,
          startLabel: formatMinutesToTime(t),
          endLabel: formatMinutesToTime(candidateEnd),
          time24: formatMinutesToInput24(t)
        });
      }
    }
  });

  return {
    targetDayName,
    hasConfiguredSchedule,
    slots,
    busyIntervals
  };
}

export async function recordLessonWithWorkflow(payload, actor = {}) {
  const {
    existingSessionId = null,
    studentId,
    studentName,
    teacherId,
    teacherName,
    date,
    time,
    duration,
    type = 'individual',
    status = LESSON_STATUSES.COMPLETED,
    absenceType = null,
    absenceReason = '',
    rating = 5,
    notes = '',
    postponeReason = '',
    responsibleParty = '',
    makeupDate = '',
    makeupTime = '',
    teacherNotes = '',
    slotSelectionReason = '',
    createMakeupSession = true,
    originalLessonId = '',
    cancellationResponsibility = '',
    cancellationReason = '',
    isTrial = false,
    trialStudentName = '',
    surahName = '',
    actualSurahName = '',
    actualVerse = 0,
    memorizationDirection = 'ascending',
    approved = undefined,
    salaryCalculated = undefined,
    isCalculated = undefined,
    trialStatus = undefined,
    memorizationUpdate = null,
    deductCreditCallback = null
  } = payload;

  if (!teacherId || !date || !status) {
    throw new Error('البيانات الأساسية للحصة غير مكتملة');
  }

  let studentSnapData = null;
  if (studentId && !isTrial && !String(studentId).startsWith('trial_')) {
    try {
      const summarySnap = await getDoc(doc(db, 'studentOperationalSummaries', studentId));
      if (summarySnap.exists()) {
        studentSnapData = summarySnap.data();
      }
    } catch (summaryErr) {
      console.warn('studentOperationalSummaries read fallback:', summaryErr?.message || summaryErr);
    }
    if (!studentSnapData && actor.role !== 'supervisor') {
      try {
        const stSnap = await getDoc(doc(db, 'students', studentId));
        if (stSnap.exists()) studentSnapData = stSnap.data();
      } catch (stErr) {
        console.warn('students read fallback warning:', stErr?.message || stErr);
      }
    }
  }

  // Auto-lock duration from student's package unless user holds edit_lesson_duration
  const canEditDuration = Boolean(actor.canEditDuration || actor.role === 'admin' || isTrial);
  const resolvedDuration = (!canEditDuration && studentSnapData)
    ? Number(getStudentDefaultDuration(studentSnapData))
    : Number(duration || (studentSnapData ? getStudentDefaultDuration(studentSnapData) : 60));

  const isCompensableStatus = status === LESSON_STATUSES.COMPLETED ||
    status === LESSON_STATUSES.COMPENSATORY ||
    (status === LESSON_STATUSES.STUDENT_ABSENT && absenceType === 'unexcused');

  const isSupervisor = actor.role === 'supervisor';
  // Supervisors may only create unapproved sessions. NEVER write approval/financial
  // flags on an update: those remain owned by the admin/teacher workflow.
  const resolvedApproved = isSupervisor
    ? false
    : (approved !== undefined ? approved : (actor.role === 'admin' || (actor.role === 'teacher' && !isTrial)));

  const sessionData = {
    studentId: studentId || '',
    studentName: isTrial ? (trialStudentName || studentName || 'طالب تجريبي') : (studentName || studentSnapData?.name || ''),
    teacherId,
    teacherName: teacherName || '',
    date,
    time: time || '',
    duration: resolvedDuration,
    type: isTrial ? 'trial' : type,
    isTrial: Boolean(isTrial),
    status,
    rating: status === LESSON_STATUSES.COMPLETED || status === LESSON_STATUSES.COMPENSATORY ? Number(rating || 5) : null,
    notes: notes || '',
    surahName: surahName || '',
    actualSurahName: actualSurahName || surahName || '',
    actualVerse: Number(actualVerse || 0),
    memorizationDirection: memorizationDirection || 'ascending',
    approved: resolvedApproved,
    salaryCalculated: salaryCalculated !== undefined ? salaryCalculated : (!isTrial && isCompensableStatus),
    isCalculated: isCalculated !== undefined ? isCalculated : (!isTrial && isCompensableStatus),
    trialStatus: isTrial ? (trialStatus || 'pending') : null,
    updatedBy: actor.uid || teacherId,
    updatedByRole: actor.role || 'teacher',
    updatedAt: serverTimestamp()
  };

  if (status === LESSON_STATUSES.STUDENT_ABSENT) {
    sessionData.absenceType = absenceType || 'unexcused';
    sessionData.absenceReason = absenceReason || '';
  } else if (status === LESSON_STATUSES.TEACHER_ABSENT) {
    sessionData.absenceReason = absenceReason || notes || '';
  } else if (status === LESSON_STATUSES.DELAYED) {
    sessionData.postponedFrom = date;
    sessionData.postponeReason = postponeReason || '';
    sessionData.responsibleParty = responsibleParty || 'student';
    sessionData.teacherNotes = teacherNotes || '';
    sessionData.makeupDate = makeupDate || '';
    sessionData.makeupTime = makeupTime || '';
    sessionData.slotSelectionReason = slotSelectionReason || '';
    sessionData.slotSelectedBy = makeupDate ? (actor.uid || '') : '';
    sessionData.slotSelectedAt = makeupDate ? new Date().toISOString() : '';
    sessionData.compensationStatus = makeupDate ? 'scheduled' : 'pending';
  } else if (status === LESSON_STATUSES.COMPENSATORY) {
    sessionData.originalLessonId = originalLessonId || '';
    sessionData.teacherNotes = teacherNotes || '';
  } else if (status === LESSON_STATUSES.CANCELLED) {
    sessionData.cancellationResponsibility = cancellationResponsibility || 'academy';
    sessionData.cancellationReason = cancellationReason || notes || '';
  }

  let savedSessionId = existingSessionId;
  let oldSnapshot = null;

  if (existingSessionId) {
    try {
      const prevSnap = await getDoc(doc(db, 'sessions', existingSessionId));
      if (prevSnap.exists()) oldSnapshot = prevSnap.data();
    } catch (prevErr) {
      console.warn('Could not read previous session snapshot:', prevErr?.message || prevErr);
    }

    const updateData = { ...sessionData };
    // Keep the stored approval/financial decision untouched on updates.
    delete updateData.approved;
    delete updateData.salaryCalculated;
    delete updateData.isCalculated;
    if (oldSnapshot && Object.prototype.hasOwnProperty.call(oldSnapshot, 'approved')) {
      updateData.approvalStatus = oldSnapshot.approved === true ? 'approved' : 'pending';
    }
    await updateDoc(doc(db, 'sessions', existingSessionId), updateData);
  } else {
    sessionData.createdBy = actor.uid || teacherId;
    sessionData.createdByRole = actor.role || 'teacher';
    sessionData.createdAt = serverTimestamp();
    sessionData.approvalStatus = sessionData.approved ? 'approved' : 'pending';
    const docRef = await addDoc(collection(db, 'sessions'), sessionData);
    savedSessionId = docRef.id;
  }

  // Immutable Absence Log
  if (status === LESSON_STATUSES.STUDENT_ABSENT || status === LESSON_STATUSES.TEACHER_ABSENT) {
    await addDoc(collection(db, 'absenceLogs'), {
      sessionId: savedSessionId,
      studentId: sessionData.studentId,
      studentName: sessionData.studentName,
      teacherId: sessionData.teacherId,
      teacherName: sessionData.teacherName,
      absenceSubject: status === LESSON_STATUSES.TEACHER_ABSENT ? 'teacher' : 'student',
      absenceType: status === LESSON_STATUSES.STUDENT_ABSENT ? (absenceType || 'unexcused') : 'teacher_absence',
      reason: absenceReason || notes || '',
      date,
      time: time || '',
      recordedBy: actor.uid || teacherId,
      recordedByName: actor.name || teacherName || '',
      recordedByRole: actor.role || 'teacher',
      createdAt: serverTimestamp()
    });
  }

  // Linked compensatory session creation when postponing with chosen makeup date
  let linkedMakeupId = null;
  if (status === LESSON_STATUSES.DELAYED && createMakeupSession && makeupDate && !isTrial) {
    const makeupRef = await addDoc(collection(db, 'sessions'), {
      studentId: sessionData.studentId,
      studentName: sessionData.studentName,
      teacherId: sessionData.teacherId,
      teacherName: sessionData.teacherName,
      date: makeupDate,
      time: makeupTime || time || '',
      duration: resolvedDuration,
      type: sessionData.type,
      status: LESSON_STATUSES.COMPENSATORY,
      originalLessonId: savedSessionId,
      postponedFrom: date,
      teacherNotes: teacherNotes || '',
      notes: `حصة تعويضية عن حصة مؤجلة بتاريخ ${date}`,
      approved: false,
      approvalStatus: 'pending',
      createdBy: actor.uid || teacherId,
      createdByRole: actor.role || 'teacher',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    linkedMakeupId = makeupRef.id;
    await updateDoc(doc(db, 'sessions', savedSessionId), {
      compensatedBySessionId: linkedMakeupId,
      updatedAt: serverTimestamp()
    });
  }

  // Update parent postponed lesson if recording/updating a compensatory session
  if (status === LESSON_STATUSES.COMPENSATORY && originalLessonId) {
    try {
      await updateDoc(doc(db, 'sessions', originalLessonId), {
        compensationStatus: 'completed',
        compensatedBySessionId: savedSessionId,
        compensatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      // تعليم الحصة التعويضية نفسها كمسجلة، حتى لا تعرض واجهة المعلم زر تسجيلها مرة أخرى
      await updateDoc(doc(db, 'sessions', savedSessionId), {
        compensationStatus: 'completed',
        compensatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('Could not update parent delayed session:', e?.message || e);
    }
  }

  // Optional credit deduction for Admin/Teacher (never supervisor, keeping financial ledger isolated)
  if (
    typeof deductCreditCallback === 'function' &&
    actor.role !== 'supervisor' &&
    !isTrial &&
    studentId &&
    (status === LESSON_STATUSES.COMPLETED ||
      status === LESSON_STATUSES.COMPENSATORY ||
      (status === LESSON_STATUSES.STUDENT_ABSENT && absenceType === 'unexcused'))
  ) {
    await deductCreditCallback(savedSessionId, studentId, status, absenceType);
  }

  // Sync non-financial summary if Admin/Teacher updated memorization or student counts
  if (!isTrial && studentId && !String(studentId).startsWith('trial_')) {
    if (memorizationUpdate) {
      try {
        if (actor.role !== 'supervisor') {
          await updateDoc(doc(db, 'students', studentId), {
            ...memorizationUpdate,
            updatedAt: serverTimestamp()
          });
          await syncStudentOperationalSummary(studentId);
        } else {
          await setDoc(doc(db, 'studentOperationalSummaries', studentId), {
            ...memorizationUpdate,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      } catch (e) {
        console.warn('memorization sync skipped:', e?.message || e);
      }
    } else if (actor.role !== 'supervisor') {
      await syncStudentOperationalSummary(studentId);
    }
  }

  await logActivity({
    actorId: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
    actionType: existingSessionId ? 'lesson_updated' : 'lesson_created',
    targetCollection: 'sessions',
    targetId: savedSessionId,
    summary: `حصة ${sessionData.studentName} - ${getLessonStatusMeta(status, sessionData).label} (${date})`,
    oldValue: oldSnapshot ? { status: oldSnapshot.status, date: oldSnapshot.date, time: oldSnapshot.time } : null,
    newValue: { status, date, time: sessionData.time, duration: resolvedDuration, originalLessonId: originalLessonId || null },
    reason: postponeReason || absenceReason || cancellationReason || ''
  });

  return { id: savedSessionId, linkedMakeupId, ...sessionData };
}

export async function updateStudentScheduleWithLog({ studentId, scheduleData, actor, note = '' }) {
  if (!studentId || !scheduleData) {
    throw new Error('بيانات الجدول أو الطالب غير مكتملة');
  }

  const summaryRef = doc(db, 'studentOperationalSummaries', studentId);
  const summarySnap = await getDoc(summaryRef);
  const oldSchedule = summarySnap.exists() ? (summarySnap.data().schedule || null) : null;

  const cleanSchedule = {
    days: Array.isArray(scheduleData.days) ? scheduleData.days : [],
    uniformTime: scheduleData.uniformTime || '',
    differentTimes: Boolean(scheduleData.differentTimes),
    times: scheduleData.times || {}
  };

  await setDoc(summaryRef, {
    days: cleanSchedule.days,
    sessionDays: cleanSchedule.days,
    sessionTime: cleanSchedule.uniformTime,
    schedule: cleanSchedule,
    updatedAt: serverTimestamp()
  }, { merge: true });

  // Also sync permitted schedule-only fields onto students doc
  await updateDoc(doc(db, 'students', studentId), {
    days: cleanSchedule.days,
    sessionDays: cleanSchedule.days,
    sessionTime: cleanSchedule.uniformTime,
    schedule: cleanSchedule,
    updatedAt: serverTimestamp()
  });

  await logActivity({
    actorId: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
    actionType: 'schedule_updated',
    targetCollection: 'studentOperationalSummaries',
    targetId: studentId,
    summary: `تعديل جدول الطالب (${summarySnap.data()?.name || studentId})`,
    oldValue: oldSchedule,
    newValue: cleanSchedule,
    reason: note || ''
  });
}

export async function submitSupervisorRequest({
  type,
  title,
  details = '',
  targetId = '',
  targetName = '',
  payload = {},
  actor
}) {
  if (!actor?.uid) throw new Error('جلسة المشرف غير صالحة');
  const docRef = await addDoc(collection(db, 'supervisorRequests'), {
    type: type || 'general_request',
    typeLabel: getRequestTypeLabel(type),
    title: title || getRequestTypeLabel(type),
    details,
    targetId: targetId || '',
    targetName: targetName || '',
    payload: payload || {},
    supervisorId: actor.uid,
    supervisorName: actor.name || 'مشرف',
    status: 'pending',
    adminDecision: 'pending',
    adminNote: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await logActivity({
    actorId: actor.uid,
    actorName: actor.name,
    actorRole: actor.role || 'supervisor',
    actionType: 'supervisor_request_created',
    targetCollection: 'supervisorRequests',
    targetId: docRef.id,
    summary: `طلب إداري جديد: ${title || getRequestTypeLabel(type)}`
  });

  return docRef.id;
}

export async function approveAndExecuteSupervisorRequest(req, adminNote = '', actor = {}) {
  const reqRef = doc(db, 'supervisorRequests', req.id);
  const payload = req.payload || {};
  const targetId = req.targetId || payload.targetId || payload.studentId || payload.teacherId || payload.sessionId || '';

  // A request is only marked approved/executed after a concrete write branch succeeds.
  let executed = false;

  if (req.type === 'student_schedule_change' && targetId && payload.schedule) {
    await updateDoc(doc(db, 'students', targetId), {
      schedule: payload.schedule,
      days: payload.schedule.days || [],
      sessionDays: payload.schedule.days || [],
      sessionTime: payload.schedule.uniformTime || '',
      updatedAt: serverTimestamp()
    });
    await syncStudentOperationalSummary(targetId);
    executed = true;
  } else if (req.type === 'teacher_replacement' && targetId && payload.newTeacherId) {
    await updateDoc(doc(db, 'students', targetId), {
      teacherId: payload.newTeacherId,
      teacherName: payload.newTeacherName || '',
      updatedAt: serverTimestamp()
    });
    await syncStudentOperationalSummary(targetId);
    executed = true;
  } else if (req.type === 'lesson_cancellation' && targetId) {
    await updateDoc(doc(db, 'sessions', targetId), {
      status: LESSON_STATUSES.CANCELLED,
      cancellationReason: payload.reason || req.details || 'إلغاء معتمد من المدير',
      cancellationResponsibility: payload.responsibility || 'academy',
      updatedAt: serverTimestamp()
    });
    executed = true;
  } else if (req.type === 'package_change' && targetId && (
    payload.packageName || payload.sessionDuration !== undefined ||
    payload.totalLessons !== undefined || payload.remainingSessions !== undefined
  )) {
    const updateFields = { updatedAt: serverTimestamp() };
    if (payload.packageName) updateFields.packageName = payload.packageName;
    if (payload.sessionDuration) updateFields.sessionDuration = Number(payload.sessionDuration);
    if (payload.totalLessons !== undefined) updateFields.totalLessons = Number(payload.totalLessons);
    if (payload.remainingSessions !== undefined) {
      updateFields.remainingSessions = Number(payload.remainingSessions);
      updateFields.remainingLessons = Number(payload.remainingSessions);
    }
    await updateDoc(doc(db, 'students', targetId), updateFields);
    await syncStudentOperationalSummary(targetId);
    executed = true;
  } else if (req.type === 'suspend_teacher' && targetId) {
    await updateDoc(doc(db, 'users', targetId), {
      status: 'suspended',
      updatedAt: serverTimestamp()
    });
    await syncTeacherOperationalProfile(targetId);
    executed = true;
  } else if (req.type === 'delete_student' && targetId) {
    await updateDoc(doc(db, 'students', targetId), {
      status: 'archived',
      updatedAt: serverTimestamp()
    });
    await syncStudentOperationalSummary(targetId);
    executed = true;
  } else if (req.type === 'delete_session' && targetId) {
    await deleteDoc(doc(db, 'sessions', targetId));
    executed = true;
  }

  if (!executed) {
    const reason = 'لم يتحقق أي فرع تنفيذي صالح لهذا الطلب، ولذلك لم يتم اعتماده.';
    console.warn('approveAndExecuteSupervisorRequest:', reason, req.type);
    return { executed: false, reason };
  }

  await updateDoc(reqRef, {
    status: 'approved',
    adminDecision: 'approved',
    adminNote: adminNote || 'تمت الموافقة والتنفيذ',
    reviewedBy: actor.uid || 'admin',
    reviewedByName: actor.name || 'المدير العام',
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await logActivity({
    actorId: actor.uid || 'admin',
    actorName: actor.name || 'المدير العام',
    actorRole: 'admin',
    actionType: 'supervisor_request_approved',
    targetCollection: 'supervisorRequests',
    targetId: req.id,
    summary: `اعتماد وتنفيذ طلب المشرف: ${req.title || getRequestTypeLabel(req.type)}`,
    reason: adminNote || ''
  });

  return { executed: true };
}

export async function rejectSupervisorRequest(reqId, req, adminNote = '', actor = {}) {
  await updateDoc(doc(db, 'supervisorRequests', reqId), {
    status: 'rejected',
    adminDecision: 'rejected',
    adminNote: adminNote || 'تم رفض الطلب',
    reviewedBy: actor.uid || 'admin',
    reviewedByName: actor.name || 'المدير العام',
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await logActivity({
    actorId: actor.uid || 'admin',
    actorName: actor.name || 'المدير العام',
    actorRole: 'admin',
    actionType: 'supervisor_request_rejected',
    targetCollection: 'supervisorRequests',
    targetId: reqId,
    summary: `رفض طلب المشرف: ${req?.title || getRequestTypeLabel(req?.type)}`,
    reason: adminNote || ''
  });
}

export async function keepPendingSupervisorRequest(reqId, req, adminNote = '', actor = {}) {
  await updateDoc(doc(db, 'supervisorRequests', reqId), {
    status: 'pending',
    adminDecision: 'kept_pending',
    adminNote: adminNote || 'بانتظار مراجعة إضافية من الإدارة',
    reviewedBy: actor.uid || 'admin',
    reviewedByName: actor.name || 'المدير العام',
    updatedAt: serverTimestamp()
  });

  await logActivity({
    actorId: actor.uid || 'admin',
    actorName: actor.name || 'المدير العام',
    actorRole: 'admin',
    actionType: 'supervisor_request_kept_pending',
    targetCollection: 'supervisorRequests',
    targetId: reqId,
    summary: `إبقاء طلب المشرف معلقاً: ${req?.title || getRequestTypeLabel(req?.type)}`,
    reason: adminNote || ''
  });
}
