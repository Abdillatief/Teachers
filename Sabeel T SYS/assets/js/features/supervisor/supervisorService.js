/**
 * Supervisor Service
 * Provides helper utilities and request submission for Sabeel Academy supervisors.
 */
import { db, auth } from '../../config/firebase.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Calculates a student's subscription and renewal status
 * @param {Object} student 
 * @returns {Object} status object with badge, label, and renewal flags
 */
export function calculateStudentSubscriptionStatus(student) {
  if (!student) {
    return {
      isExpired: false,
      isExpiringSoon: false,
      needsRenewal: false,
      remainingLessons: 0,
      label: 'غير محدد',
      badgeClass: 'badge-sub-active'
    };
  }

  const total = Number(student.totalLessons || student.subscriptionHours || 8);
  const executed = Number(student.completedLessons || student.executedLessons || student.executedHours || 0);
  const remaining = Math.max(0, total - executed);

  let isExpired = false;
  let isExpiringSoon = false;

  // Check lessons count
  if (remaining <= 0) {
    isExpired = true;
  } else if (remaining <= 2) {
    isExpiringSoon = true;
  }

  // Check end date if provided
  if (student.subscriptionEndDate) {
    const end = new Date(student.subscriptionEndDate);
    const now = new Date();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      isExpired = true;
    } else if (diffDays <= 5) {
      isExpiringSoon = true;
    }
  }

  const needsRenewal = isExpired || isExpiringSoon;

  let label = 'اشتراك سارٍ';
  let badgeClass = 'badge-sub-active';

  if (isExpired) {
    label = 'منتهي (بحاجة لتجديد)';
    badgeClass = 'badge-sub-expired';
  } else if (isExpiringSoon) {
    label = `أوشك على الانتهاء (${remaining} متبقية)`;
    badgeClass = 'badge-sub-expiring';
  }

  return {
    isExpired,
    isExpiringSoon,
    needsRenewal,
    remainingLessons: remaining,
    label,
    badgeClass
  };
}

/**
 * Creates and submits an administrative supervisor request for admin approval
 * @param {Object} reqData 
 */
export async function createSupervisorRequest(reqData) {
  const user = auth.currentUser;
  let supervisorName = 'المشرف التشغيلي';
  try {
    const cached = JSON.parse(sessionStorage.getItem('sabeel_user_session') || '{}');
    if (cached.name) supervisorName = cached.name;
  } catch (e) {}

  return await addDoc(collection(db, 'supervisorRequests'), {
    ...reqData,
    supervisorId: user ? user.uid : 'supervisor',
    supervisorName,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
}

/**
 * Returns human-readable Arabic label for request types
 * @param {string} type 
 * @returns {string} Arabic label
 */
export function getRequestTypeLabel(type) {
  const labels = {
    'student_edit': 'تعديل بيانات دارس',
    'student_add': 'إضافة دارس جديد',
    'session_edit': 'تعديل أو إلغاء حصة',
    'package_change': 'تعديل باقة واشتراك',
    'teacher_transfer': 'نقل دارس لمعلم آخر',
    'schedule_change': 'تعديل جدول الحصص',
    'salary_adjustment': 'تسوية مالية للمعلم',
    'general': 'طلب إداري عام'
  };

  return labels[type] || 'طلب إداري';
}
