import '../../shared/utils/jsonShield.js';
import { auth, db } from '../../config/firebase.js';
import { 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  getDoc, 
  collection, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Executes an approved supervisor request automatically on behalf of the Admin.
 * @param {Object} request
 * @param {string} [adminNote]
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function executeApprovedRequest(request, adminNote = '') {
  const currentAdmin = auth.currentUser;
  const adminIdentifier = currentAdmin?.email || currentAdmin?.displayName || 'المدير العام';
  const reqId = request.id;
  const type = request.type;
  const targetId = request.targetId;
  const details = request.details || {};

  let executionSummary = '';

  // 1. Execute specific operation according to request type
  if (type === 'delete_student' && targetId) {
    const studentRef = doc(db, "students", targetId);
    await updateDoc(studentRef, {
      status: 'archived',
      archivedAt: new Date().toISOString(),
      archivedBy: `Admin approved request from supervisor ${request.supervisorName}`,
      archiveReason: request.reason || 'بناءً على طلب معتمد من المشرف'
    });
    executionSummary = `تمت أرشفة وحذف الطالب (${request.targetName || targetId}) تلقائياً من القوائم النشطة.`;

  } else if (type === 'delete_teacher' && targetId) {
    const teacherRef = doc(db, "users", targetId);
    await updateDoc(teacherRef, {
      status: 'rejected',
      archived: true,
      archivedAt: new Date().toISOString(),
      archivedBy: `Admin approved request from supervisor ${request.supervisorName}`
    });
    executionSummary = `تم حذف وإلغاء تفعيل حساب المعلم (${request.targetName || targetId}) تلقائياً.`;

  } else if (type === 'suspend_teacher' && targetId) {
    const teacherRef = doc(db, "users", targetId);
    await updateDoc(teacherRef, {
      status: 'suspended',
      suspendedAt: new Date().toISOString(),
      suspendReason: request.reason || 'إيقاف مؤقت بطلب من المشرف'
    });
    executionSummary = `تم إيقاف حساب المعلم (${request.targetName || targetId}) مؤقتاً تلقائياً.`;

  } else if (type === 'reactivate_account' && targetId) {
    const userRef = doc(db, "users", targetId);
    await updateDoc(userRef, {
      status: 'approved',
      reactivatedAt: new Date().toISOString()
    });
    executionSummary = `تمت إعادة تفعيل الحساب (${request.targetName || targetId}) بنجاح.`;

  } else if (type === 'change_package' && targetId) {
    const studentRef = doc(db, "students", targetId);
    const newPackageName = details.newPackageName || details.packageName || 'باقة جديدة';
    const newTotalLessons = parseInt(details.newTotalLessons || details.lessonsCount, 10) || 8;

    await updateDoc(studentRef, {
      packageName: newPackageName,
      sessionsCount: newTotalLessons,
      remainingLessons: newTotalLessons,
      subscriptionStatus: 'active',
      packageUpdatedAt: new Date().toISOString()
    });

    if (details.packageId) {
      await addDoc(collection(db, "studentPackages"), {
        studentId: targetId,
        studentName: request.targetName || '',
        packageName: newPackageName,
        packageId: details.packageId,
        totalLessons: newTotalLessons,
        remainingLessons: newTotalLessons,
        usedLessons: 0,
        status: 'active',
        createdAt: new Date().toISOString()
      });
    }

    executionSummary = `تم تعديل باقة الطالب إلى (${newPackageName} - ${newTotalLessons} حصص) تلقائياً.`;

  } else if (type === 'delete_session' && targetId) {
    const sessionRef = doc(db, "sessions", targetId);
    await updateDoc(sessionRef, {
      status: 'cancelled',
      archived: true,
      deletedAt: new Date().toISOString(),
      deletedBy: `Admin approved request from supervisor ${request.supervisorName}`
    });
    executionSummary = `تم إلغاء وأرشفة الحصة (${targetId}) تلقائياً.`;

  } else if (type === 'edit_sensitive_data' && targetId && details.patch) {
    const targetCollection = details.targetCollection || 'students';
    const targetRef = doc(db, targetCollection, targetId);
    await updateDoc(targetRef, {
      ...details.patch,
      updatedAt: new Date().toISOString()
    });
    executionSummary = `تم تطبيق التعديلات الحساسة المطلوبة على (${request.targetName || targetId}) بنجاح.`;

  } else {
    executionSummary = `تمت الموافقة الإدارية واعتماد الطلب من قبل الإدارة العامة.`;
  }

  // 2. Update supervisor request document in Firestore
  const reqRef = doc(db, "supervisorRequests", reqId);
  const now = new Date().toISOString();
  await updateDoc(reqRef, {
    status: 'approved',
    adminResponse: adminNote || 'تمت الموافقة والتنفيذ بنجاح.',
    executionResult: executionSummary,
    reviewedBy: adminIdentifier,
    reviewedAt: now,
    executedAt: now,
    updatedAt: now
  });

  // 3. Write to Audit Log
  try {
    await addDoc(collection(db, "auditLogs"), {
      action: "SUPERVISOR_REQUEST_APPROVED_AND_EXECUTED",
      requestId: reqId,
      requestType: type,
      targetId: targetId || '',
      targetName: request.targetName || '',
      supervisorId: request.supervisorId,
      supervisorName: request.supervisorName,
      executedBy: adminIdentifier,
      executionSummary: executionSummary,
      timestamp: now
    });
  } catch (aErr) {
    console.warn("Could not write audit log:", aErr);
  }

  // 4. Send real-time notification to the Supervisor
  if (request.supervisorId) {
    try {
      await addDoc(collection(db, "notifications"), {
        title: `✅ تمت الموافقة على طلبك: ${request.title}`,
        body: `${executionSummary}${adminNote ? ` (ملاحظة المدير: ${adminNote})` : ''}`,
        type: 'supervisor_request_approved',
        priority: 'high',
        targetRole: 'supervisor',
        recipientRole: 'supervisor',
        recipientId: request.supervisorId,
        deepLink: '/supervisor/requests.html',
        createdAt: now,
        read: false
      });
    } catch (nErr) {
      console.warn("Could not dispatch supervisor notification:", nErr);
    }
  }

  return { success: true, message: executionSummary };
}

/**
 * Rejects a supervisor request with reason.
 * @param {string} requestId
 * @param {Object} request
 * @param {string} rejectionReason
 * @returns {Promise<void>}
 */
export async function rejectSupervisorRequest(requestId, request, rejectionReason) {
  const currentAdmin = auth.currentUser;
  const adminIdentifier = currentAdmin?.email || currentAdmin?.displayName || 'المدير العام';
  const reasonText = (rejectionReason || '').trim() || 'لم يتم استيفاء المتطلبات الإدارية للطلب.';
  const now = new Date().toISOString();

  const reqRef = doc(db, "supervisorRequests", requestId);
  await updateDoc(reqRef, {
    status: 'rejected',
    adminResponse: reasonText,
    reviewedBy: adminIdentifier,
    reviewedAt: now,
    updatedAt: now
  });

  // Write audit log
  try {
    await addDoc(collection(db, "auditLogs"), {
      action: "SUPERVISOR_REQUEST_REJECTED",
      requestId: requestId,
      requestType: request?.type || '',
      supervisorId: request?.supervisorId || '',
      rejectedBy: adminIdentifier,
      rejectionReason: reasonText,
      timestamp: now
    });
  } catch (aErr) {}

  // Send real-time notification to the supervisor
  if (request?.supervisorId) {
    try {
      await addDoc(collection(db, "notifications"), {
        title: `❌ تم رفض طلبك: ${request.title || 'طلب إداري'}`,
        body: `سبب الرفض: ${reasonText}`,
        type: 'supervisor_request_rejected',
        priority: 'high',
        targetRole: 'supervisor',
        recipientRole: 'supervisor',
        recipientId: request.supervisorId,
        deepLink: '/supervisor/requests.html',
        createdAt: now,
        read: false
      });
    } catch (nErr) {
      console.warn("Could not notify supervisor of rejection:", nErr);
    }
  }
}
