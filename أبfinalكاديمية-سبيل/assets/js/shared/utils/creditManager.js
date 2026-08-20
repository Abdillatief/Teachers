import { db } from '../../config/firebase.js';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { logAuditLog } from './activityLogger.js';

/**
 * =========================================================================
 * SABIL ACADEMY - LESSON CREDIT & PACKAGE SUBSCRIPTION MANAGER
 * =========================================================================
 * Manages package subscriptions, lesson credit deductions (including negative 
 * credit/debt handling), auto-debt settlement on renewal, audit logs, 
 * real-time low/negative balance alerts, and ledger synchronization.
 */

/**
 * Fetch the current active or most relevant package for a student
 * @param {string} studentId 
 * @returns {Promise<Object|null>}
 */
export async function getStudentActivePackage(studentId) {
  if (!studentId) return null;
  try {
    const q = query(
      collection(db, "studentPackages"),
      where("studentId", "==", studentId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const packages = [];
      snap.forEach(docSnap => packages.push({ id: docSnap.id, ...docSnap.data() }));

      // 1. Prefer package with status "active" and remainingLessons > 0
      const activePositive = packages.find(p => p.status === "active" && (p.remainingLessons || 0) > 0);
      if (activePositive) return activePositive;

      // 2. Otherwise active package (even if remaining <= 0)
      const anyActive = packages.find(p => p.status === "active");
      if (anyActive) return anyActive;

      // 3. Sort by createdAt / updatedAt descending to pick latest
      packages.sort((a, b) => {
        const tA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const tB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return tB - tA;
      });

      return packages[0] || null;
    }
  } catch (err) {
    console.error("Error fetching active package for student:", studentId, err);
  }
  return null;
}

/**
 * Deduct 1 credit from student's active package upon completed session or unexcused absence.
 * Supports negative credit overdraft (e.g. 0 -> -1 -> -2), never blocks session recording,
 * automatically updates financial/subscription states and triggers real-time alerts.
 * 
 * @param {Object} params
 * @param {string} params.sessionId
 * @param {string} params.studentId
 * @param {string} params.studentName
 * @param {string} [params.teacherId]
 * @param {string} [params.teacherName]
 * @param {string} params.status - 'completed' | 'student_absent'
 * @param {string} [params.absenceType] - 'unexcused' | 'excused'
 * @param {Object} [params.actor] - { uid, name }
 * @returns {Promise<Object>}
 */
export async function deductSessionCredit({
  sessionId,
  studentId,
  studentName,
  teacherId = '',
  teacherName = '',
  status,
  absenceType = '',
  actor = { uid: 'system', name: 'النظام' }
}) {
  if (!studentId) return { success: false, reason: 'missing_student_id' };

  // Only deduct credit for completed sessions or unexcused student absence
  const shouldDeduct = status === "completed" || (status === "student_absent" && absenceType === "unexcused");
  if (!shouldDeduct) {
    return { success: true, deducted: false, message: 'no_deduction_needed' };
  }

  const effectiveTeacherId = teacherId || actor.uid || 'system';
  const effectiveTeacherName = teacherName || actor.name || 'المعلم';

  try {
    let activePkg = await getStudentActivePackage(studentId);
    let packageId = activePkg ? activePkg.id : null;
    let packageName = activePkg ? activePkg.packageName : 'باقة عامة';

    // Fetch current remaining lessons from package or student document
    let previousCredits = 0;
    let totalLessons = activePkg ? (parseInt(activePkg.totalLessons) || 0) : 0;
    let currentUsed = activePkg ? (parseInt(activePkg.usedLessons) || 0) : 0;

    if (activePkg && activePkg.remainingLessons !== undefined) {
      previousCredits = parseInt(activePkg.remainingLessons) || 0;
    } else {
      const sSnap = await getDoc(doc(db, "students", studentId));
      if (sSnap.exists()) {
        previousCredits = parseInt(sSnap.data().remainingLessons) || 0;
      }
    }

    // CRITICAL: Calculate new remaining credits allowing negative values (0 -> -1 -> -2)
    const newRemainingCredits = previousCredits - 1;
    const newUsedLessons = currentUsed + 1;
    const isOverdraft = newRemainingCredits < 0;
    const isExhausted = newRemainingCredits <= 0;

    // 1. Update Package in Firestore if exists
    if (activePkg) {
      const pkgRef = doc(db, "studentPackages", activePkg.id);
      await updateDoc(pkgRef, {
        usedLessons: newUsedLessons,
        remainingLessons: newRemainingCredits,
        status: isExhausted ? "expired" : "active",
        updatedAt: serverTimestamp()
      });
    }

    // 2. Record detailed entry in lessonCreditsLogs
    const logRef = doc(collection(db, "lessonCreditsLogs"));
    let reasonText = '';
    if (isOverdraft) {
      reasonText = `خصم حصة بعد نفاد الرصيد (تسجيل دين حصص: الرصيد الآن ${newRemainingCredits})`;
    } else if (newRemainingCredits === 0) {
      reasonText = `خصم الحصة الأخيرة ونفاد رصيد الباقة بالكامل (0 متبقي)`;
    } else {
      reasonText = status === "completed" 
        ? `خصم رصيد لحضور حصة مكتملة (${sessionId || 'حصة'})`
        : `خصم رصيد لغياب غير مبرر للطالب (${sessionId || 'حصة'})`;
    }

    await setDoc(logRef, {
      id: logRef.id,
      studentId,
      studentName: studentName || 'طالب',
      packageId: packageId || '',
      packageName: packageName,
      sessionId: sessionId || '',
      teacherId: effectiveTeacherId,
      teacherName: effectiveTeacherName,
      changeAmount: -1,
      previousCredits: previousCredits,
      newCredits: newRemainingCredits,
      actionType: isOverdraft ? 'overdraft_session_deduction' : 'session_deduction',
      action: isOverdraft ? 'overdraft_session_deduction' : 'session_deduction',
      reason: reasonText,
      description: reasonText,
      isOverdraft: isOverdraft,
      performedBy: actor.uid || 'system',
      performedByName: actor.name || 'النظام',
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    });

    // 3. Record Audit Log if balance became exhausted (0) or negative (< 0)
    if (isExhausted) {
      await logAuditLog({
        actionType: isOverdraft ? "STUDENT_CREDIT_OVERDRAFT" : "STUDENT_CREDIT_EXHAUSTED",
        targetCollection: "students",
        targetId: studentId,
        studentId,
        studentName,
        teacherId: effectiveTeacherId,
        teacherName: effectiveTeacherName,
        sessionId: sessionId || '',
        previousCredits,
        newCredits: newRemainingCredits,
        debtLessons: isOverdraft ? Math.abs(newRemainingCredits) : 0,
        adminId: actor.uid || 'system',
        adminName: actor.name || 'النظام',
        reason: isOverdraft 
          ? `تسجيل حصة بعد انتهاء الرصيد وتجاوز الباقة (الرصيد: ${newRemainingCredits} حصة)`
          : `انتهاء رصيد حصص الطالب بالكامل (0 متبقي)`
      });
    }

    // 4. Update student document with updated counters & financial status
    try {
      const studentDocRef = doc(db, "students", studentId);
      const studentSnap = await getDoc(studentDocRef);
      if (studentSnap.exists()) {
        const sData = studentSnap.data();
        const currentCount = parseInt(sData.sessionsCount || 0);

        const updatePayload = {
          sessionsCount: currentCount + 1,
          remainingLessons: newRemainingCredits,
          usedLessons: (parseInt(sData.usedLessons) || 0) + 1,
          subscriptionStatus: isExhausted ? 'expired' : 'active',
          paymentStatus: isExhausted ? 'unpaid' : (sData.paymentStatus || 'paid'),
          paymentStatusReason: isOverdraft 
            ? `عجز رصيد الحصص (${Math.abs(newRemainingCredits)} حصة مستهلكة بدون تجديد)`
            : (newRemainingCredits === 0 ? 'انتهاء رصيد الحصص بالكامل' : ''),
          lastSessionDate: new Date().toISOString().split('T')[0],
          updatedAt: serverTimestamp()
        };

        await updateDoc(studentDocRef, updatePayload);
      }
    } catch (e) {
      console.warn("Could not update student doc cached count:", e);
    }

    // 5. Sync student consolidated balance
    await syncStudentBalance(studentId);

    // 6. Trigger real-time notifications for Admin & Teacher when 0 or negative
    await handleCreditNotifications({
      studentId,
      studentName: studentName || 'طالب',
      teacherId: effectiveTeacherId,
      teacherName: effectiveTeacherName,
      remainingLessons: newRemainingCredits
    });

    return {
      success: true,
      deducted: true,
      remainingCredits: newRemainingCredits,
      isOverdraft,
      packageId
    };
  } catch (err) {
    console.error("Error in deductSessionCredit:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Reverses a previously deducted credit (e.g. when session is deleted, cancelled, or excused)
 * @param {Object} params
 * @param {string} params.sessionId
 * @param {string} params.studentId
 * @param {string} [params.studentName]
 * @param {string} [params.reason]
 * @param {Object} [params.actor]
 */
export async function reverseSessionCredit({
  sessionId,
  studentId,
  studentName = '',
  reason = 'إلغاء أو تعديل الحصة',
  actor = { uid: 'system', name: 'النظام' }
}) {
  if (!studentId || !sessionId) return { success: false };

  try {
    // Check if there was a deduction log for this session
    const qLog = query(
      collection(db, "lessonCreditsLogs"),
      where("sessionId", "==", sessionId)
    );
    const logSnap = await getDocs(qLog);
    if (logSnap.empty) {
      return { success: true, reversed: false, message: 'no_prior_deduction' };
    }

    const deductionLog = logSnap.docs[0].data();
    const packageId = deductionLog.packageId;

    let previousCredits = 0;
    let newCredits = 0;

    if (packageId) {
      const pkgRef = doc(db, "studentPackages", packageId);
      const pkgSnap = await getDoc(pkgRef);
      if (pkgSnap.exists()) {
        const pkgData = pkgSnap.data();
        previousCredits = parseInt(pkgData.remainingLessons) || 0;
        const total = parseInt(pkgData.totalLessons) || 0;
        const used = Math.max(0, (parseInt(pkgData.usedLessons) || 1) - 1);
        newCredits = previousCredits + 1;

        await updateDoc(pkgRef, {
          usedLessons: used,
          remainingLessons: newCredits,
          status: newCredits > 0 ? "active" : "expired",
          updatedAt: serverTimestamp()
        });
      }
    } else {
      const sRef = doc(db, "students", studentId);
      const sSnap = await getDoc(sRef);
      if (sSnap.exists()) {
        previousCredits = parseInt(sSnap.data().remainingLessons) || 0;
        newCredits = previousCredits + 1;
      }
    }

    // Add reversal log
    const revLogRef = doc(collection(db, "lessonCreditsLogs"));
    await setDoc(revLogRef, {
      id: revLogRef.id,
      studentId,
      studentName: studentName || deductionLog.studentName || 'طالب',
      packageId: packageId || '',
      packageName: deductionLog.packageName || '',
      sessionId: sessionId,
      changeAmount: 1,
      previousCredits,
      newCredits,
      actionType: 'session_reversal',
      action: 'session_reversal',
      reason: `استرداد رصيد حصة: ${reason}`,
      description: `استرداد رصيد حصة: ${reason}`,
      performedBy: actor.uid || 'system',
      performedByName: actor.name || 'النظام',
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    });

    // Update student doc
    try {
      const studentDocRef = doc(db, "students", studentId);
      const sSnap = await getDoc(studentDocRef);
      if (sSnap.exists()) {
        const sData = sSnap.data();
        const currentCount = Math.max(0, parseInt(sData.sessionsCount || 1) - 1);
        const isExhausted = newCredits <= 0;

        await updateDoc(studentDocRef, {
          sessionsCount: currentCount,
          remainingLessons: newCredits,
          usedLessons: Math.max(0, (parseInt(sData.usedLessons) || 1) - 1),
          subscriptionStatus: isExhausted ? 'expired' : 'active',
          paymentStatus: isExhausted ? 'unpaid' : 'paid',
          paymentStatusReason: newCredits < 0 
            ? `عجز رصيد الحصص (${Math.abs(newCredits)} حصة مستهلكة بدون تجديد)`
            : (newCredits === 0 ? 'انتهاء رصيد الحصص بالكامل' : ''),
          updatedAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.warn("Could not update student doc on reversal:", e);
    }

    await syncStudentBalance(studentId);

    return { success: true, reversed: true, newCredits };
  } catch (err) {
    console.error("Error in reverseSessionCredit:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Assigns a new package to a student and handles Auto-Debt Settlement (تسوية دين الحصص).
 * If student has negative credits (e.g. -3), auto-deducts the debt from the new package 
 * (e.g. 12 - 3 = 9), logs the deduction, records audit log, and updates student balance.
 * 
 * @param {Object} params
 */
export async function assignPackageToStudent({
  studentId,
  studentName,
  packageId = '',
  packageName,
  totalLessons,
  lessonDuration = 30,
  price = 0,
  discount = 0,
  startDate = '',
  expiryDate = '',
  notes = '',
  actor = { uid: 'admin', name: 'الإدارة' }
}) {
  if (!studentId || !totalLessons) {
    throw new Error("بيانات الطالب وعدد الحصص مطلوبة.");
  }

  const numLessons = parseInt(totalLessons, 10);
  const numPrice = parseFloat(price) || 0;
  const numDiscount = parseFloat(discount) || 0;
  const totalAmount = Math.max(0, numPrice - numDiscount);
  const start = startDate || new Date().toISOString().split('T')[0];

  // Default expiry: 90 days if not provided
  let exp = expiryDate;
  if (!exp) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 90);
    exp = expDate.toISOString().split('T')[0];
  }

  // 1. Check if student has an existing debt (negative remaining credits)
  let currentDebt = 0;
  let currentStudentRemaining = 0;
  try {
    const sDoc = await getDoc(doc(db, "students", studentId));
    if (sDoc.exists()) {
      currentStudentRemaining = parseInt(sDoc.data().remainingLessons) || 0;
      if (currentStudentRemaining < 0) {
        currentDebt = Math.abs(currentStudentRemaining);
      }
    }
  } catch (err) {
    console.warn("Could not read student debt:", err);
  }

  // Calculate settlement
  const settledDebt = Math.min(numLessons, currentDebt);
  const finalRemainingLessons = numLessons - settledDebt;
  const initialUsedLessons = settledDebt;

  // 2. Create studentPackages doc
  const pkgDocRef = doc(collection(db, "studentPackages"));
  const packagePayload = {
    id: pkgDocRef.id,
    studentId,
    studentName: studentName || 'طالب',
    packageId: packageId || '',
    packageName: packageName || `باقة ${numLessons} حصة`,
    totalLessons: numLessons,
    usedLessons: initialUsedLessons,
    remainingLessons: finalRemainingLessons,
    settledPreviousDebt: settledDebt,
    lessonDuration: parseInt(lessonDuration, 10) || 30,
    price: numPrice,
    discount: numDiscount,
    totalAmount,
    totalPaid: 0,
    remainingAmount: totalAmount,
    startDate: start,
    expiryDate: exp,
    status: finalRemainingLessons > 0 ? 'active' : 'completed',
    notes: notes || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(pkgDocRef, packagePayload);

  // 3. Record Base Package Purchase Log
  const logPurchaseRef = doc(collection(db, "lessonCreditsLogs"));
  await setDoc(logPurchaseRef, {
    id: logPurchaseRef.id,
    studentId,
    studentName,
    packageId: pkgDocRef.id,
    packageName: packagePayload.packageName,
    sessionId: '',
    changeAmount: numLessons,
    previousCredits: currentStudentRemaining,
    newCredits: currentStudentRemaining + numLessons,
    actionType: 'package_purchase',
    action: 'package_purchase',
    reason: `شراء وتفعيل باقة جديدة (${packagePayload.packageName} - ${numLessons} حصة)`,
    description: `شراء وتفعيل باقة جديدة (${packagePayload.packageName} - ${numLessons} حصة)`,
    performedBy: actor.uid || 'admin',
    performedByName: actor.name || 'الإدارة',
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp()
  });

  // 4. Record Auto-Debt Settlement Log if student had negative balance
  if (settledDebt > 0) {
    const debtLogRef = doc(collection(db, "lessonCreditsLogs"));
    await setDoc(debtLogRef, {
      id: debtLogRef.id,
      studentId,
      studentName,
      packageId: pkgDocRef.id,
      packageName: packagePayload.packageName,
      sessionId: '',
      changeAmount: -settledDebt,
      amount: settledDebt,
      previousCredits: numLessons,
      newCredits: finalRemainingLessons,
      debtSettled: settledDebt,
      actionType: 'deduct_previous_debt',
      action: 'deduct_previous_debt',
      reason: `خصم الحصص المستهلكة قبل التجديد (تسوية دين ${settledDebt} حصص مستهلكة)`,
      description: `خصم الحصص المستهلكة قبل التجديد (تسوية دين ${settledDebt} حصص مستهلكة)`,
      performedBy: actor.uid || 'admin',
      performedByName: actor.name || 'الإدارة',
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    });

    // Record in auditLogs
    await logAuditLog({
      actionType: "SETTLE_STUDENT_CREDIT_DEBT",
      targetCollection: "studentPackages",
      targetId: pkgDocRef.id,
      studentId,
      studentName,
      oldValue: { previousDebt: currentDebt, remainingCredits: currentStudentRemaining },
      newValue: { newPackageLessons: numLessons, settledDebt, finalRemainingLessons },
      debtLessons: settledDebt,
      adminId: actor.uid || 'admin',
      adminName: actor.name || 'الإدارة',
      reason: `تسوية دين الحصص المستهلكة تلقائياً عند تجديد الباقة (تم خصم ${settledDebt} من ${numLessons} ليصبح الرصيد ${finalRemainingLessons})`
    });
  }

  // 5. Add charge to studentLedger
  const ledgerRef = doc(collection(db, "studentLedger"));
  await setDoc(ledgerRef, {
    id: ledgerRef.id,
    studentId,
    studentName,
    type: 'charge',
    amount: totalAmount,
    referenceId: pkgDocRef.id,
    description: `رسوم باقة: ${packagePayload.packageName} (${numLessons} حصة)`,
    paymentMethod: 'invoice',
    date: start,
    createdAt: serverTimestamp()
  });

  // 6. Update student profile
  try {
    const studentRef = doc(db, "students", studentId);
    await updateDoc(studentRef, {
      activePackageId: pkgDocRef.id,
      packageName: packagePayload.packageName,
      totalLessons: numLessons,
      remainingLessons: finalRemainingLessons,
      subscriptionStatus: finalRemainingLessons > 0 ? 'active' : 'expired',
      paymentStatus: 'paid', // Initial package state; payments/debt will calculate accurately in sync
      paymentStatusReason: '',
      sessionDuration: parseInt(lessonDuration, 10) || 30,
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    console.warn("Could not update student main record:", e);
  }

  // 7. Sync financial summary
  await syncStudentBalance(studentId);

  // 8. General Audit Log
  await logAuditLog({
    actionType: "ASSIGN_STUDENT_PACKAGE",
    targetCollection: "studentPackages",
    targetId: pkgDocRef.id,
    studentId,
    studentName,
    adminId: actor.uid,
    adminName: actor.name,
    reason: `إسناد باقة (${packagePayload.packageName}) للطالب مع تسوية ${settledDebt} حصة دين سابقة`,
    details: {
      packageName: packagePayload.packageName,
      totalLessons: numLessons,
      settledDebt,
      finalRemainingLessons,
      totalAmount
    }
  });

  return packagePayload;
}

/**
 * Adjusts student credits manually (positive or negative) by Admin with full audit tracking
 */
export async function adjustStudentCredits({
  studentId,
  studentName,
  packageId = '',
  adjustmentAmount = 0,
  reason = 'تعديل إداري لرصيد الحصص',
  actor = { uid: 'admin', name: 'الإدارة' }
}) {
  const adj = parseInt(adjustmentAmount, 10);
  if (!studentId || isNaN(adj) || adj === 0) {
    throw new Error("يرجى إدخال قيمة صحيحة وموجبة أو سالبة لتعديل الرصيد.");
  }

  let pkg = null;
  if (packageId) {
    const pSnap = await getDoc(doc(db, "studentPackages", packageId));
    if (pSnap.exists()) pkg = { id: pSnap.id, ...pSnap.data() };
  }
  if (!pkg) {
    pkg = await getStudentActivePackage(studentId);
  }

  let previousCredits = 0;
  if (pkg && pkg.remainingLessons !== undefined) {
    previousCredits = parseInt(pkg.remainingLessons) || 0;
  } else {
    const sDoc = await getDoc(doc(db, "students", studentId));
    if (sDoc.exists()) previousCredits = parseInt(sDoc.data().remainingLessons) || 0;
  }

  const newCredits = previousCredits + adj;
  const isExhausted = newCredits <= 0;

  if (pkg) {
    const pkgRef = doc(db, "studentPackages", pkg.id);
    const newTotal = (pkg.totalLessons || 0) + (adj > 0 ? adj : 0);
    const newUsed = Math.max(0, newTotal - newCredits);
    await updateDoc(pkgRef, {
      totalLessons: newTotal,
      usedLessons: newUsed,
      remainingLessons: newCredits,
      status: newCredits > 0 ? "active" : "expired",
      updatedAt: serverTimestamp()
    });
  }

  // Log in lessonCreditsLogs
  const logRef = doc(collection(db, "lessonCreditsLogs"));
  await setDoc(logRef, {
    id: logRef.id,
    studentId,
    studentName: studentName || 'طالب',
    packageId: pkg ? pkg.id : '',
    packageName: pkg ? pkg.packageName : 'تعديل يدوي',
    sessionId: '',
    changeAmount: adj,
    previousCredits,
    newCredits,
    actionType: 'admin_adjustment',
    action: 'admin_adjustment',
    reason: reason || 'تعديل يدوي من الإدارة',
    description: reason || 'تعديل يدوي من الإدارة',
    performedBy: actor.uid,
    performedByName: actor.name,
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp()
  });

  // Update student doc
  try {
    const sRef = doc(db, "students", studentId);
    await updateDoc(sRef, {
      remainingLessons: newCredits,
      subscriptionStatus: isExhausted ? 'expired' : 'active',
      paymentStatus: isExhausted ? 'unpaid' : 'paid',
      paymentStatusReason: newCredits < 0 
        ? `عجز رصيد الحصص (${Math.abs(newCredits)} حصة)`
        : (newCredits === 0 ? 'انتهاء رصيد الحصص بالكامل' : ''),
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    console.warn("Could not update student doc on manual credit adjustment:", e);
  }

  await syncStudentBalance(studentId);

  await logAuditLog({
    actionType: "ADJUST_STUDENT_CREDITS",
    targetCollection: "students",
    targetId: studentId,
    studentId,
    studentName,
    oldValue: { remainingLessons: previousCredits },
    newValue: { remainingLessons: newCredits, adjustment: adj },
    adminId: actor.uid,
    adminName: actor.name,
    reason: `تعديل رصيد الحصص يدوياً (${adj > 0 ? '+' : ''}${adj} حصة) - ${reason}`
  });

  return { previousCredits, newCredits, changeAmount: adj };
}

/**
 * Synchronizes and consolidates student financial debit, credit, debt, and credit counts
 * @param {string} studentId 
 */
export async function syncStudentBalance(studentId) {
  if (!studentId) return;

  try {
    // 1. Fetch all packages for student
    const qPackages = query(collection(db, "studentPackages"), where("studentId", "==", studentId));
    const pkgSnap = await getDocs(qPackages);

    let totalDebit = 0;
    let activePackage = null;
    let latestPackage = null;
    let totalLessonsAll = 0;
    let usedLessonsAll = 0;
    let remainingLessonsConsolidated = 0;
    let hasPackages = !pkgSnap.empty;

    const allPkgs = [];
    pkgSnap.forEach(pDoc => {
      const p = { id: pDoc.id, ...pDoc.data() };
      allPkgs.push(p);
      totalDebit += (parseFloat(p.totalAmount) || 0);
      totalLessonsAll += (parseInt(p.totalLessons) || 0);
      usedLessonsAll += (parseInt(p.usedLessons) || 0);
      if (p.status === "active") {
        activePackage = p;
      }
    });

    if (allPkgs.length > 0) {
      allPkgs.sort((a, b) => {
        const tA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const tB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return tB - tA;
      });
      latestPackage = allPkgs[0];
    }

    // Determine current student remaining credits
    if (activePackage) {
      remainingLessonsConsolidated = parseInt(activePackage.remainingLessons) || 0;
    } else if (latestPackage) {
      remainingLessonsConsolidated = parseInt(latestPackage.remainingLessons) || 0;
    } else {
      // Check student doc
      const sSnap = await getDoc(doc(db, "students", studentId));
      if (sSnap.exists()) {
        remainingLessonsConsolidated = parseInt(sSnap.data().remainingLessons) || 0;
      }
    }

    const isOverdraft = remainingLessonsConsolidated < 0;
    const overdraftLessons = isOverdraft ? Math.abs(remainingLessonsConsolidated) : 0;
    const isExhausted = remainingLessonsConsolidated <= 0;

    // 2. Fetch all payments for student
    const qPayments = query(collection(db, "payments"), where("studentId", "==", studentId));
    const paySnap = await getDocs(qPayments);

    let totalPaid = 0;
    paySnap.forEach(payDoc => {
      const p = payDoc.data();
      totalPaid += (parseFloat(p.amount) || 0);
    });

    // Calculate monetary debt: Unpaid package invoices + monetary estimate for overdraft lessons
    const unpaidInvoices = Math.max(0, totalDebit - totalPaid);
    
    // Estimate cost per session from latest package or default (e.g. 75 EGP)
    const unitPrice = (latestPackage && latestPackage.totalLessons > 0)
      ? (latestPackage.totalAmount / latestPackage.totalLessons)
      : 75;
    const overdraftMonetaryDebt = overdraftLessons * unitPrice;
    const totalDebt = unpaidInvoices + overdraftMonetaryDebt;

    const displayPackage = activePackage || latestPackage;

    // 3. Write / update studentBalances/{studentId}
    const balanceRef = doc(db, "studentBalances", studentId);
    const balancePayload = {
      studentId,
      studentName: displayPackage?.studentName || '',
      totalDebit,
      totalPaid,
      outstandingBalance: totalDebt,
      unpaidInvoices,
      overdraftMonetaryDebt,
      overdraftLessons,
      isOverdraft,
      isExhausted,
      activePackageId: displayPackage?.id || '',
      activePackageName: displayPackage?.packageName || '',
      remainingLessons: remainingLessonsConsolidated,
      totalLessons: totalLessonsAll,
      usedLessons: usedLessonsAll,
      subscriptionStatus: isExhausted ? 'expired' : 'active',
      paymentStatus: (isExhausted || totalDebt > 0) ? 'unpaid' : 'paid',
      paymentStatusReason: isOverdraft 
        ? `عجز رصيد الحصص (${overdraftLessons} حصة مستهلكة بدون تجديد)` 
        : (remainingLessonsConsolidated === 0 ? 'انتهاء رصيد الحصص بالكامل' : (totalDebt > 0 ? 'متبقي مالي مطلوب تحصيله' : '')),
      updatedAt: serverTimestamp()
    };

    await setDoc(balanceRef, balancePayload, { merge: true });

    // 4. Update student document with balance & financial states
    try {
      const studentDocRef = doc(db, "students", studentId);
      await updateDoc(studentDocRef, {
        totalDebt: totalDebt,
        totalPaid: totalPaid,
        remainingLessons: remainingLessonsConsolidated,
        overdraftLessons: overdraftLessons,
        isOverdraft: isOverdraft,
        subscriptionStatus: isExhausted ? 'expired' : 'active',
        paymentStatus: (isExhausted || totalDebt > 0) ? 'unpaid' : 'paid',
        paymentStatusReason: balancePayload.paymentStatusReason,
        packageStatus: activePackage ? 'active' : (isOverdraft ? 'overdraft' : (totalLessonsAll > 0 ? 'completed' : 'none')),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      // ignore
    }

    return balancePayload;
  } catch (err) {
    console.error("Error in syncStudentBalance:", err);
  }
}

/**
 * Dispatches real-time alerts for low, exhausted (0), or negative overdraft (< 0) credits
 */
export async function handleCreditNotifications({
  studentId,
  studentName,
  teacherId = '',
  teacherName = '',
  remainingLessons
}) {
  if (remainingLessons > 3) return;

  let alertTitle = '';
  let alertMsg = '';
  let notifyTeacher = false;
  let type = 'low_credits_alert';

  if (remainingLessons < 0) {
    const debtCount = Math.abs(remainingLessons);
    alertTitle = `🔴 تنبيه عجز حصص (رصيد سالب): ${studentName}`;
    alertMsg = `الطالب (${studentName}) لديه (${debtCount}) حصص مستهلكة بدون تجديد (الرصيد: ${remainingLessons}). يرجى سرعة التواصل وسداد الاشتراك وتجديد الباقة.`;
    notifyTeacher = true;
    type = 'credit_overdraft_alert';
  } else if (remainingLessons === 0) {
    alertTitle = `⚠️ نفاد رصيد الحصص: ${studentName}`;
    alertMsg = `الطالب (${studentName}) استهلك جميع الحصص في باقته الحالية (0 حصة متبقية) وتغيرت حالته إلى غير مدفوع / منتهي. يرجى تجديد الباقة.`;
    notifyTeacher = true;
    type = 'credit_exhausted_alert';
  } else if (remainingLessons === 1) {
    alertTitle = `🔴 تنبيه: بقيت حصة واحدة للطالب ${studentName}`;
    alertMsg = `تنبيه رصيد الحصص: بقي للطالب (${studentName}) حصة واحدة فقط (1 متبقي) في باقته الحالية.`;
  } else if (remainingLessons === 3) {
    alertTitle = `⏳ تنبيه: اقتراب انتهاء باقة ${studentName}`;
    alertMsg = `تنبيه رصيد الحصص: بقي للطالب (${studentName}) 3 حصص فقط في باقته الحالية.`;
  } else {
    return;
  }

  try {
    // 1. Notify Admin
    await addDoc(collection(db, "notifications"), {
      recipientId: "admin",
      recipientRole: "admin",
      title: alertTitle,
      message: alertMsg,
      body: alertMsg,
      type: type,
      studentId: studentId,
      studentName: studentName,
      teacherId: teacherId || '',
      remainingLessons: remainingLessons,
      read: false,
      createdAt: serverTimestamp()
    });

    // 2. Notify Teacher if 0 or negative
    if (notifyTeacher && teacherId) {
      await addDoc(collection(db, "notifications"), {
        recipientId: teacherId,
        recipientRole: "teacher",
        title: alertTitle,
        message: alertMsg,
        body: alertMsg,
        type: type,
        studentId: studentId,
        studentName: studentName,
        remainingLessons: remainingLessons,
        read: false,
        createdAt: serverTimestamp()
      });
    }
  } catch (e) {
    console.warn("Could not save credit notification:", e);
  }
}

/**
 * Backwards compatible helper for low credits check
 */
export async function checkAndNotifyLowCredits(studentId, studentName, remainingLessons) {
  return handleCreditNotifications({ studentId, studentName, remainingLessons });
}

/**
 * Safe Migration Helper: Converts legacy subscriptions to Package & Credit system
 */
export async function migrateLegacySubscriptionsToPackages(actor = { uid: 'admin', name: 'المدير' }) {
  const result = {
    processed: 0,
    created: 0,
    skipped: 0,
    errors: []
  };

  try {
    const legacySnap = await getDocs(collection(db, "subscriptions"));
    const existingPkgsSnap = await getDocs(collection(db, "studentPackages"));
    const existingStudentIds = new Set();
    existingPkgsSnap.forEach(d => existingStudentIds.add(d.data().studentId));

    // Get all sessions to count completed sessions per student
    const sessionsSnap = await getDocs(collection(db, "sessions"));
    const studentSessionCounts = {};
    sessionsSnap.forEach(sDoc => {
      const s = sDoc.data();
      if (s.studentId && (s.status === 'completed' || (s.status === 'student_absent' && s.absenceType === 'unexcused'))) {
        studentSessionCounts[s.studentId] = (studentSessionCounts[s.studentId] || 0) + 1;
      }
    });

    for (const subDoc of legacySnap.docs) {
      result.processed++;
      const sub = subDoc.data();
      const studentId = sub.studentId;

      if (!studentId || existingStudentIds.has(studentId)) {
        result.skipped++;
        continue;
      }

      try {
        const totalLessons = parseInt(sub.totalSessions || sub.sessionsCount || 8, 10);
        const usedLessons = studentSessionCounts[studentId] || 0;
        const remainingLessons = totalLessons - usedLessons;
        const price = parseFloat(sub.price || sub.totalAmount || 0);
        const totalPaid = parseFloat(sub.totalPaid || 0);

        const newPkgRef = doc(collection(db, "studentPackages"));
        await setDoc(newPkgRef, {
          id: newPkgRef.id,
          legacySubscriptionId: subDoc.id,
          studentId,
          studentName: sub.studentName || 'طالب',
          packageId: sub.packageId || '',
          packageName: sub.packageName || sub.planName || `باقة ${totalLessons} حصص (مرحّلة)`,
          totalLessons,
          usedLessons,
          remainingLessons,
          lessonDuration: parseInt(sub.lessonDuration || 30, 10),
          price,
          discount: parseFloat(sub.discount || 0),
          totalAmount: price,
          totalPaid,
          remainingAmount: Math.max(0, price - totalPaid),
          startDate: sub.startDate || sub.monthKey || new Date().toISOString().split('T')[0],
          expiryDate: sub.endDate || sub.expiryDate || '',
          status: remainingLessons > 0 ? 'active' : 'expired',
          notes: 'تم ترحيل هذا الاشتراك آلياً من النظام السابق',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Add initial credits log
        const logRef = doc(collection(db, "lessonCreditsLogs"));
        await setDoc(logRef, {
          id: logRef.id,
          studentId,
          studentName: sub.studentName || 'طالب',
          packageId: newPkgRef.id,
          packageName: sub.packageName || `باقة ${totalLessons} حصص`,
          sessionId: '',
          changeAmount: remainingLessons,
          previousCredits: 0,
          newCredits: remainingLessons,
          actionType: 'package_purchase',
          reason: 'ترحيل أولي لرصيد الباقة من النظام القديم',
          performedBy: actor.uid,
          performedByName: actor.name,
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp()
        });

        await syncStudentBalance(studentId);
        result.created++;
        existingStudentIds.add(studentId);
      } catch (subErr) {
        result.errors.push({ studentId, error: subErr.message });
      }
    }
  } catch (err) {
    console.error("Migration fatal error:", err);
    result.errors.push({ general: err.message });
  }

  return result;
}
