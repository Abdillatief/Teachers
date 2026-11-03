import '../../shared/utils/jsonShield.js';
import { auth, db } from '../../config/firebase.js';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from '../../shared/utils/toast.js';

/**
 * Creates an administrative request from a supervisor to the admin
 * @param {Object} params
 * @param {'delete_student'|'delete_teacher'|'suspend_teacher'|'change_package'|'reactivate_account'|'delete_session'|'edit_sensitive_data'|'general_request'} params.type
 * @param {string} params.title
 * @param {string} [params.targetId]
 * @param {string} [params.targetName]
 * @param {string} [params.targetType] - 'student' | 'teacher' | 'session' | 'other'
 * @param {Object} [params.details]
 * @param {string} params.reason
 * @returns {Promise<string>}
 */
export async function createSupervisorRequest({
  type,
  title,
  targetId = '',
  targetName = '',
  targetType = '',
  details = {},
  reason
}) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("المستخدم غير مسجل الدخول");

  let supervisorName = currentUser.displayName || currentUser.email;
  try {
    const rawSession = sessionStorage.getItem('sabeel_user_session');
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      if (parsed.name) supervisorName = parsed.name;
    }
  } catch (e) {}

  const requestPayload = {
    supervisorId: currentUser.uid,
    supervisorName: supervisorName,
    supervisorEmail: currentUser.email || '',
    type: String(type || 'general_request'),
    title: String(title || 'طلب إداري من المشرف'),
    targetId: String(targetId || ''),
    targetName: String(targetName || ''),
    targetType: String(targetType || ''),
    details: details || {},
    reason: String(reason || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, "supervisorRequests"), requestPayload);

  // Send real-time notification to the Admin
  try {
    await addDoc(collection(db, "notifications"), {
      title: `طلب إداري جديد من المشرف: ${supervisorName}`,
      body: `نوع الطلب: ${getRequestTypeLabel(type)} - ${title} (السبب: ${reason})`,
      type: 'supervisor_request',
      priority: 'high',
      targetRole: 'admin',
      recipientRole: 'admin',
      recipientId: 'admin',
      deepLink: '/admin/supervisor-requests.html',
      createdAt: new Date().toISOString(),
      read: false
    });
  } catch (notifErr) {
    console.warn("Could not dispatch admin notification for supervisor request:", notifErr);
  }

  return docRef.id;
}

/**
 * Maps request types to human-readable Arabic labels
 * @param {string} type
 * @returns {string}
 */
export function getRequestTypeLabel(type) {
  const map = {
    'delete_student': 'طلب حذف طالب',
    'delete_teacher': 'طلب حذف معلم',
    'suspend_teacher': 'طلب إيقاف معلم مؤقتاً',
    'change_package': 'طلب تغيير باقة طالب',
    'reactivate_account': 'طلب إعادة تفعيل حساب',
    'delete_session': 'طلب حذف حصة',
    'edit_sensitive_data': 'طلب تعديل بيانات حساسة',
    'general_request': 'طلب إداري عام'
  };
  return map[type] || 'طلب إداري';
}

/**
 * Calculates operational subscription status without exposing ANY financial details
 * @param {Object} student
 * @param {Object} [studentPackage]
 * @returns {{ label: string, color: string, bg: string, isRenewDue: boolean, remainingCount: number }}
 */
export function calculateStudentSubscriptionStatus(student, studentPackage = null) {
  // If explicitly archived or paused
  if (student.status === 'archived' || student.status === 'deleted') {
    return { label: 'مؤرشف / ملغي', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', isRenewDue: false, remainingCount: 0 };
  }
  if (student.status === 'Suspended' || student.status === 'suspended') {
    return { label: 'معلق مؤقتاً', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', isRenewDue: false, remainingCount: 0 };
  }

  // Priority to active studentPackage credits if present
  let remainingLessons = null;
  let totalLessons = null;
  let isExpired = false;

  if (studentPackage) {
    remainingLessons = typeof studentPackage.remainingLessons === 'number' ? studentPackage.remainingLessons : null;
    totalLessons = typeof studentPackage.totalLessons === 'number' ? studentPackage.totalLessons : null;
    if (studentPackage.status === 'expired' || studentPackage.status === 'completed') {
      isExpired = true;
    }
  }

  // Fallback to student properties
  if (remainingLessons === null && typeof student.remainingLessons === 'number') {
    remainingLessons = student.remainingLessons;
  }
  if (totalLessons === null && typeof student.sessionsCount === 'number') {
    totalLessons = student.sessionsCount;
  }

  // If subscription marked expired or remaining is 0
  if (isExpired || (remainingLessons !== null && remainingLessons <= 0)) {
    return {
      label: 'انتهى الاشتراك (مستحق للتجديد)',
      color: '#dc2626',
      bg: 'rgba(239, 68, 68, 0.12)',
      isRenewDue: true,
      remainingCount: 0
    };
  }

  // If nearing expiry (1 or 2 lessons remaining)
  if (remainingLessons !== null && remainingLessons <= 2) {
    return {
      label: 'أوشك على الانتهاء (يحتاج متابعة تجديد)',
      color: '#d97706',
      bg: 'rgba(245, 158, 11, 0.12)',
      isRenewDue: true,
      remainingCount: remainingLessons
    };
  }

  // Active status
  if (remainingLessons !== null && remainingLessons > 2) {
    return {
      label: 'الاشتراك نشط',
      color: '#059669',
      bg: 'rgba(16, 185, 129, 0.12)',
      isRenewDue: false,
      remainingCount: remainingLessons
    };
  }

  // Default active check based on last session activity
  return {
    label: 'الاشتراك نشط',
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.12)',
    isRenewDue: false,
    remainingCount: remainingLessons || 0
  };
}

/**
 * Logs a parent interaction, complaint, or operational follow-up
 * @param {Object} params
 * @returns {Promise<string>}
 */
export async function logParentInteraction({
  studentId,
  studentName,
  parentName = '',
  parentPhone = '',
  type = 'inquiry',
  channel = 'whatsapp',
  subject,
  details,
  actionTaken = '',
  status = 'open'
}) {
  const currentUser = auth.currentUser;
  let supervisorName = currentUser?.displayName || currentUser?.email || 'مشرف التشغيل';
  try {
    const rawSession = sessionStorage.getItem('sabeel_user_session');
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      if (parsed.name) supervisorName = parsed.name;
    }
  } catch (e) {}

  const interactionPayload = {
    studentId: String(studentId || ''),
    studentName: String(studentName || '').trim(),
    parentName: String(parentName || '').trim(),
    parentPhone: String(parentPhone || '').trim(),
    supervisorId: currentUser?.uid || '',
    supervisorName: supervisorName,
    type: String(type || 'inquiry'),
    channel: String(channel || 'whatsapp'),
    status: String(status || 'open'),
    subject: String(subject || 'متابعة تشغيلية').trim(),
    details: String(details || '').trim(),
    actionTaken: String(actionTaken || '').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, "parentInteractions"), interactionPayload);
  return docRef.id;
}

/**
 * Updates a parent interaction status or action taken
 * @param {string} interactionId
 * @param {Object} updates
 * @returns {Promise<void>}
 */
export async function updateParentInteraction(interactionId, updates) {
  const ref = doc(db, "parentInteractions", interactionId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
}
