import { db } from '../../config/firebase.js';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Returns distinct visual styling and color metadata for each notification event type.
 * Ensures strict color consistency across dropdown, admin list, and modal details.
 */
export function getNotificationEventMeta(item = {}) {
  const type = item.type || item.category || '';
  const isLate = Boolean(item.isLate) || type === 'late_session_recorded';
  const hasPassword = Boolean(item.teacherPassword) || type === 'password_reset_request';

  if (hasPassword) {
    return {
      type: 'password_reset_request',
      label: '🔑 استعادة كلمة المرور',
      color: '#7c3aed', // Purple
      bgSubtle: 'rgba(124, 58, 237, 0.08)',
      borderColor: '#7c3aed',
      badgeBg: 'rgba(124, 58, 237, 0.15)',
      badgeColor: '#6d28d9',
      icon: 'key-round',
      isUnrecorded: false
    };
  }

  if (type === 'session_ongoing' || type === 'session_reminder_0m' || type === 'session_start') {
    return {
      type: 'session_ongoing',
      label: '🔴 حصة جارية الآن',
      color: '#0284c7', // Sky Blue
      bgSubtle: 'rgba(2, 132, 199, 0.08)',
      borderColor: '#0284c7',
      badgeBg: 'rgba(2, 132, 199, 0.15)',
      badgeColor: '#0369a1',
      icon: 'play-circle',
      isUnrecorded: false
    };
  }

  if (type === 'completed_session') {
    return {
      type: 'completed_session',
      label: '🟢 حصة مكتملة',
      color: '#059669', // Emerald Green
      bgSubtle: 'rgba(5, 150, 105, 0.08)',
      borderColor: '#059669',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeColor: '#047857',
      icon: 'check-circle-2',
      isUnrecorded: false
    };
  }

  if (isLate) {
    const delayText = item.delayMinutes ? ` (تأخير ${item.delayMinutes} د)` : '';
    return {
      type: 'late_session_recorded',
      label: `⏱️ تسجيل متأخر${delayText}`,
      color: '#d97706', // Amber / Orange
      bgSubtle: 'rgba(217, 119, 6, 0.08)',
      borderColor: '#d97706',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeColor: '#b45309',
      icon: 'clock',
      isUnrecorded: false
    };
  }

  if (type === 'overdue_unrecorded_session' || type === 'missing_session_report' || type === 'teacher_delay_alert') {
    return {
      type: 'overdue_unrecorded_session',
      label: '⚠️ حصة غير مسجلة (نهاية اليوم)',
      color: '#dc2626', // Red / Danger
      bgSubtle: 'rgba(220, 38, 38, 0.08)',
      borderColor: '#dc2626',
      badgeBg: 'rgba(239, 68, 68, 0.15)',
      badgeColor: '#b91c1c',
      icon: 'alert-triangle',
      isUnrecorded: true
    };
  }

  if (type === 'trial_session_submitted' || type === 'trial') {
    return {
      type: 'trial_session_submitted',
      label: '🧪 حصة تجريبية',
      color: '#0d9488', // Teal
      bgSubtle: 'rgba(13, 148, 136, 0.08)',
      borderColor: '#0d9488',
      badgeBg: 'rgba(13, 148, 136, 0.15)',
      badgeColor: '#0f766e',
      icon: 'flask-conical',
      isUnrecorded: false
    };
  }

  if (type === 'new_student_request') {
    return {
      type: 'new_student_request',
      label: '👤 طلب طالب جديد',
      color: '#2563eb', // Royal Blue
      bgSubtle: 'rgba(37, 99, 235, 0.08)',
      borderColor: '#2563eb',
      badgeBg: 'rgba(37, 99, 235, 0.15)',
      badgeColor: '#1d4ed8',
      icon: 'user-plus',
      isUnrecorded: false
    };
  }

  if (type === 'admin_teacher_reminder') {
    return {
      type: 'admin_teacher_reminder',
      label: '🔔 تذكير إداري للمعلم',
      color: '#e11d48', // Rose
      bgSubtle: 'rgba(225, 29, 72, 0.08)',
      borderColor: '#e11d48',
      badgeBg: 'rgba(225, 29, 72, 0.15)',
      badgeColor: '#be123c',
      icon: 'bell-ring',
      isUnrecorded: false
    };
  }

  if (type === 'feedback_request' || item.isFeedbackRequest) {
    return {
      type: 'feedback_request',
      label: '💡 طلب آراء واستطلاع (فيدباك)',
      color: '#8b5cf6', // Violet
      bgSubtle: 'rgba(139, 92, 246, 0.08)',
      borderColor: '#8b5cf6',
      badgeBg: 'rgba(139, 92, 246, 0.15)',
      badgeColor: '#7c3aed',
      icon: 'message-square-plus',
      isUnrecorded: false
    };
  }

  if (type === 'feedback_submitted') {
    return {
      type: 'feedback_submitted',
      label: '💬 رأي جديد من معلم',
      color: '#0284c7', // Sky Blue
      bgSubtle: 'rgba(2, 132, 199, 0.08)',
      borderColor: '#0284c7',
      badgeBg: 'rgba(2, 132, 199, 0.15)',
      badgeColor: '#0369a1',
      icon: 'messages-square',
      isUnrecorded: false
    };
  }

  if (type === 'feedback_reply') {
    return {
      type: 'feedback_reply',
      label: '✉️ رد الإدارة على رأيك',
      color: '#059669', // Emerald
      bgSubtle: 'rgba(5, 150, 105, 0.08)',
      borderColor: '#059669',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeColor: '#047857',
      icon: 'message-square-check',
      isUnrecorded: false
    };
  }

  if (type === 'broadcast' || type === 'admin_broadcast') {
    return {
      type: 'broadcast',
      label: '📢 تعميم إداري عام',
      color: '#4f46e5', // Indigo
      bgSubtle: 'rgba(79, 70, 229, 0.08)',
      borderColor: '#4f46e5',
      badgeBg: 'rgba(79, 70, 229, 0.15)',
      badgeColor: '#4338ca',
      icon: 'megaphone',
      isUnrecorded: false
    };
  }

  // Default: General broadcast / system
  return {
    type: type || 'general',
    label: '📢 تعميم إداري',
    color: '#6366f1', // Indigo
    bgSubtle: 'rgba(99, 102, 241, 0.08)',
    borderColor: '#6366f1',
    badgeBg: 'rgba(99, 102, 241, 0.15)',
    badgeColor: '#4338ca',
    icon: 'megaphone',
    isUnrecorded: false
  };
}

/**
 * Formats a Date object to Arabic time string (e.g. "05:30 مساءً")
 */
export function formatArabicTime(date = new Date()) {
  return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Parses time strings like "05:30 مساءً", "8:00 صباحاً", "17:30" into a Date object for today
 */
export function parseSessionTimeToDate(timeStr, baseDate = new Date()) {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const normalized = timeStr.trim();
  const isPM = /مساءً|مساء|م|pm/i.test(normalized);
  const isAM = /صباحاً|صباح|ص|am/i.test(normalized);

  const match = normalized.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes, 0, 0);
}

/**
 * Calculates delay in minutes between scheduled time string and actual recording Date
 */
export function calculateSessionDelay(scheduledTimeStr, actualDateObj = new Date()) {
  if (!scheduledTimeStr || typeof scheduledTimeStr !== 'string') {
    return { isLate: false, delayMinutes: 0 };
  }

  const scheduledDate = parseSessionTimeToDate(scheduledTimeStr, actualDateObj);
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
  teacherPhone = '',
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
  const targetLabel = sessionType === 'group' ? `للمجموعة "${targetName}"` : `للطالب "${targetName}"`;

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
    teacherPhone: teacherPhone || '',
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
 * Dispatches an Alert for a Session Starting RIGHT NOW (Single alert, strictly non-repeating)
 */
export async function notifyAdminSessionNow({
  teacherId,
  teacherName,
  teacherPhone = '',
  targetName,
  sessionType = 'individual',
  scheduledTime = '',
  studentId = '',
  groupId = '',
  dateStr = new Date().toISOString().substring(0, 10)
}) {
  const cleanTimeKey = (scheduledTime || '').replace(/[\s:-]/g, '_');
  const reminderKey = `session_now_${sessionType}_${studentId || groupId}_${dateStr}_${cleanTimeKey}`;

  // Idempotency: ensure this notification only sends once per session slot
  try {
    const existingQ = query(collection(db, "notifications"), where("reminderKey", "==", reminderKey));
    const snap = await getDocs(existingQ);
    if (!snap.empty) return;
  } catch (e) {
    console.warn("Check existing session now alert error:", e);
  }

  const typeLabel = sessionType === 'group' ? `حصة المجموعة "${targetName}"` : `حصة الطالب "${targetName}"`;
  const title = `🔴 حصة جارية الآن`;
  const body = `بدأ الآن موعد ${typeLabel} مع المعلم (${teacherName || 'المعلم'}) - الموعد: (${scheduledTime}).`;

  await addDoc(collection(db, "notifications"), {
    recipientId: "admin",
    recipientRole: "admin",
    targetRole: "admin",
    type: "session_ongoing",
    category: "session_ongoing",
    title,
    body,
    message: body,
    teacherId: teacherId || '',
    teacherName: teacherName || 'المعلم',
    teacherPhone: teacherPhone || '',
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

/**
 * Dispatches an End-of-Day Unrecorded Session Alert to Admin (Triggered ONLY at end of day, non-repeating)
 */
export async function notifyAdminEndOfDayUnrecorded({
  teacherId,
  teacherName,
  teacherPhone = '',
  targetName,
  sessionType = 'individual',
  scheduledTime,
  dateStr = new Date().toISOString().substring(0, 10),
  studentId = '',
  groupId = ''
}) {
  const cleanTimeKey = (scheduledTime || '').replace(/[\s:-]/g, '_');
  const reminderKey = `eod_unrecorded_${sessionType}_${studentId || groupId}_${dateStr}_${cleanTimeKey}`;

  // Strict idempotency: only 1 unrecorded alert per student/group at end of day
  try {
    const existingQ = query(collection(db, "notifications"), where("reminderKey", "==", reminderKey));
    const snap = await getDocs(existingQ);
    if (!snap.empty) return;
  } catch (e) {
    console.warn("Check existing eod unrecorded alert error:", e);
  }

  const typeLabel = sessionType === 'group' ? `حصة المجموعة "${targetName}"` : `حصة الطالب "${targetName}"`;
  const title = `⚠️ حصة غير مسجلة (نهاية اليوم)`;
  const body = `⚠️ تنبيه نهاية اليوم: انقضى اليوم ولم يسجل المعلم (${teacherName || 'معلم'}) ${typeLabel} المقررة اليوم الساعة (${scheduledTime}). اضغط لإرسال تذكير للمعلم.`;

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
    teacherPhone: teacherPhone || '',
    targetName: targetName || '',
    studentName: sessionType === 'individual' ? targetName : '',
    groupName: sessionType === 'group' ? targetName : '',
    sessionType: sessionType,
    scheduledTime: scheduledTime || '',
    reminderKey: reminderKey,
    studentId: studentId || '',
    groupId: groupId || '',
    dateStr: dateStr,
    isEndOfDayAlert: true,
    read: false,
    archived: false,
    readBy: [],
    createdAt: serverTimestamp()
  });
}

/**
 * Sends an immediate system reminder to a teacher who has an unrecorded session
 */
export async function sendDirectReminderToTeacher({
  teacherId,
  teacherName,
  studentName = '',
  scheduledTime = '',
  customMessage = '',
  isPinned = true
}) {
  if (!teacherId) throw new Error("معرف المعلم غير محدد");

  const title = `⚠️ تذكير إداري: توثيق حصة الطالب (${studentName || 'المقررة'})`;
  const body = customMessage || `السلام عليكم أستاذنا الفاضل (${teacherName || 'المعلم'})، نذكركم بضرورة تسجيل وتوثيق تقرير حصة الطالب (${studentName}) المقررة اليوم (${scheduledTime}). جزاكم الله خيراً.`;

  const docRef = await addDoc(collection(db, "notifications"), {
    recipientId: teacherId,
    recipientRole: "teacher",
    targetRole: "teacher",
    teacherId: teacherId,
    teacherName: teacherName || 'المعلم',
    studentName: studentName,
    scheduledTime: scheduledTime,
    title: title,
    body: body,
    message: body,
    type: "admin_teacher_reminder",
    category: "admin_teacher_reminder",
    url: "/teacher/today-sessions.html",
    isPinned: Boolean(isPinned),
    unpinnedBy: [],
    read: false,
    readBy: [],
    createdAt: serverTimestamp()
  });

  return { success: true, id: docRef.id, title, body };
}

/**
 * Generates WhatsApp reminder link and formatted text for a teacher
 */
export function buildTeacherWhatsAppReminder({
  teacherName = '',
  teacherPhone = '',
  studentName = '',
  scheduledTime = ''
}) {
  const cleanPhone = (teacherPhone || '').replace(/[^0-9]/g, '');
  const message = `السلام عليكم ورحمة الله وبركاته، أستاذنا الفاضل ${teacherName || ''} 🌸\n\nنود تذكيركم بلطف بتسجيل وتوثيق حصة الطالب: *${studentName}* المقررة اليوم (*${scheduledTime}*).\n\nيرجى التكرم بتسجيل الحصة عبر بوابة الأكاديمية:\n${window.location.origin}/teacher/today-sessions.html\n\nمع خالص الشكر والتقدير لجهودكم المباركة 🌿`;
  
  const encodedText = encodeURIComponent(message);
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;

  return {
    rawMessage: message,
    encodedText,
    waUrl,
    cleanPhone
  };
}

/**
 * Plays a pleasant polite notification chime using standard Web Audio API
 */
export function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.28); // D6

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime + 0.1);
    osc1.stop(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // AudioContext autoplay restrictions or unsupported
  }
}

/**
 * Dispatches a Feedback Request notification to all teachers or specific teacher
 */
export async function sendFeedbackRequestToTeachers({
  topic = '',
  question = '',
  targetTeacherId = 'teachers', // 'teachers', 'all', or specific UID
  target = '',
  targetTeacherName = '',
  isPinned = true,
  adminId = 'admin',
  adminName = 'الإدارة'
}) {
  const finalTarget = target || targetTeacherId || 'teachers';
  const title = `💡 استطلاع رأي واستشارة: ${topic || 'رأيك يهمنا'}`;
  const body = question || `تود إدارة الأكاديمية استطلاع آرائكم ومقترحاتكم بخصوص: "${topic}". نرجو التكرم بالضغط هنا ومشاركتنا رأيكم ومقترحاتكم.`;

  const docRef = await addDoc(collection(db, "notifications"), {
    recipientId: finalTarget,
    recipientRole: finalTarget === 'teachers' || finalTarget === 'all' ? 'all' : 'teacher',
    targetRole: 'teacher',
    type: 'feedback_request',
    category: 'feedback_request',
    isFeedbackRequest: true,
    feedbackTopic: topic,
    feedbackQuestion: question,
    title: title,
    body: body,
    message: body,
    adminId: adminId,
    adminName: adminName,
    isPinned: Boolean(isPinned),
    targetTeacherName: targetTeacherName || '',
    unpinnedBy: [],
    read: false,
    readBy: [],
    createdAt: serverTimestamp()
  });

  return { success: true, id: docRef.id, title, body };
}

/**
 * Submits Teacher Feedback to 'feedbacks' collection and triggers Admin notification
 */
export async function submitTeacherFeedback({
  notificationId = '',
  topic = '',
  question = '',
  teacherId = '',
  teacherName = '',
  teacherEmail = '',
  teacherPhone = '',
  message = '',
  rating = 'ممتاز'
}) {
  if (!teacherId || !message.trim()) {
    throw new Error('بيانات الرأي غير مكتملة');
  }

  // 1. Create Feedback document
  const feedbackDocRef = await addDoc(collection(db, "feedbacks"), {
    notificationId: notificationId || '',
    topic: topic || 'رأي عام ومقترح',
    question: question || '',
    teacherId: teacherId,
    teacherName: teacherName || 'معلم',
    teacherEmail: teacherEmail || '',
    teacherPhone: teacherPhone || '',
    message: message.trim(),
    rating: rating || 'إيجابي',
    status: 'new', // 'new' | 'reviewed' | 'addressed' | 'archived'
    adminNotes: '',
    adminReplied: false,
    adminReply: '',
    adminReplyMessage: '',
    adminRepliedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // 2. Dispatch notification to Admin
  const adminNotifTitle = `💬 رأي جديد من المعلم: ${teacherName || 'معلم'}`;
  const adminNotifBody = `قدم المعلم رأيه حول موضوع "${topic || 'استطلاع الرأي'}":\n"${message.length > 120 ? message.substring(0, 120) + '...' : message}"\nالتقييم: (${rating})`;

  await addDoc(collection(db, "notifications"), {
    recipientId: "admin",
    recipientRole: "admin",
    targetRole: "admin",
    type: "feedback_submitted",
    category: "feedback_submitted",
    title: adminNotifTitle,
    body: adminNotifBody,
    message: adminNotifBody,
    feedbackId: feedbackDocRef.id,
    notificationId: notificationId || '',
    teacherId: teacherId,
    teacherName: teacherName || 'معلم',
    feedbackTopic: topic,
    url: "/admin/feedback.html",
    read: false,
    archived: false,
    readBy: [],
    createdAt: serverTimestamp()
  });

  return { success: true, feedbackId: feedbackDocRef.id };
}

/**
 * Replies to a teacher's feedback and sends an in-app notification to that teacher
 */
export async function replyToTeacherFeedback({
  feedbackId,
  teacherId,
  teacherName = '',
  topic = '',
  replyMessage = '',
  adminReply = '',
  adminName = 'إدارة الأكاديمية',
  adminId = 'admin'
}) {
  const replyText = (replyMessage || adminReply || '').trim();
  if (!feedbackId || !teacherId || !replyText) {
    throw new Error('بيانات الرد غير مكتملة');
  }

  // 1. Update the feedback document
  try {
    await updateDoc(doc(db, "feedbacks", feedbackId), {
      adminReply: replyText,
      adminReplyMessage: replyText,
      adminReplied: true,
      adminName: adminName,
      adminId: adminId,
      status: 'addressed',
      repliedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn("Could not update feedback doc status:", err);
  }

  // 2. Send feedback_reply notification to the teacher
  const notifTitle = `✉️ رد الإدارة على رأيك: ${topic || 'استطلاع الرأي'}`;
  const notifBody = `السلام عليكم أستاذنا (${teacherName || 'المعلم'})، بخصوص رأيكم حول (${topic || 'استطلاع الرأي'}):\n\n"${replyText}"\n\nنشكركم جزيلاً على تفاعلكم ومقترحاتكم البناءة 🌸`;

  await addDoc(collection(db, "notifications"), {
    recipientId: teacherId,
    recipientRole: "teacher",
    targetRole: "teacher",
    type: "feedback_reply",
    category: "feedback_reply",
    title: notifTitle,
    body: notifBody,
    message: notifBody,
    feedbackId: feedbackId,
    feedbackTopic: topic,
    isPinned: true,
    unpinnedBy: [],
    read: false,
    readBy: [],
    createdAt: serverTimestamp()
  });

  return { success: true };
}


