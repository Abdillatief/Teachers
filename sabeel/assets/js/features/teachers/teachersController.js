import { db } from '../../config/firebase.js';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  addDoc, 
  serverTimestamp, 
  doc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { animateTextCounter } from '../../shared/utils/helpers.js';
import { sendPushNotification } from '../../shared/utils/pushService.js';

/**
 * Loads and real-time listens to stats for the teacher dashboard.
 * @param {object} teacher - The logged-in teacher object containing uid, hourly rates, etc.
 * @returns {function} Unsubscribe function to stop listening
 */
export function loadTeacherDashboardStats(teacher) {
  if (!teacher || !teacher.uid) return null;

  const teacherId = teacher.uid;
  const currentYearMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"

  let cachedStudents = [];
  let cachedSessions = [];

  const updateTodayCounters = () => {
    const arabicDays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const todayArabic = arabicDays[new Date().getDay()];
    const todayStr = new Date().toISOString().split('T')[0];

    // Filter active students scheduled for today
    const activeStudentsToday = cachedStudents.filter(student => {
      if (student.status === "archived" || student.status === "Suspended") return false;
      
      const scheduleDays = (student.schedule && student.schedule.days) ? student.schedule.days : (student.sessionDays || []);
      const isScheduledToday = scheduleDays.includes(todayArabic);

      // or they have a postponed session for today in sessions
      const hasPostponedSessionToday = cachedSessions.some(sess => 
        sess.studentId === student.id && 
        sess.date === todayStr && 
        sess.status === "delayed"
      );

      return isScheduledToday || hasPostponedSessionToday;
    });

    const recordedSessionsCount = activeStudentsToday.filter(student => {
      return cachedSessions.some(sess => 
        sess.studentId === student.id && 
        (sess.date === todayStr || sess.postponedFrom === todayStr) &&
        (sess.status === "completed" || sess.status === "student_absent" || sess.status === "cancelled" || sess.status === "delayed")
      );
    }).length;

    const remainingSessionsCount = activeStudentsToday.length - recordedSessionsCount;

    const elTodayCount = document.getElementById('todaySessionsCount');
    const elTodayRemaining = document.getElementById('todaySessionsRemaining');

    if (elTodayCount) animateTextCounter(elTodayCount, `${activeStudentsToday.length} حصة`);
    if (elTodayRemaining) animateTextCounter(elTodayRemaining, `${remainingSessionsCount >= 0 ? remainingSessionsCount : 0} حصة`);
  };

  // 1. Listen to active students
  const studentsQuery = query(collection(db, "students"), where("teacherId", "==", teacherId));
  const unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
    let studentCount = 0;
    cachedStudents = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      cachedStudents.push({ id: doc.id, ...data });
      if (!data.archived && data.status !== 'archived') {
        studentCount++;
      }
    });
    
    const el = document.getElementById('totalStudents');
    if (el) animateTextCounter(el, `${studentCount} دارس`);

    updateTodayCounters();
  }, (err) => console.error("Error listening to students stats:", err));

  // 2. Listen to sessions
  const sessionsQuery = query(collection(db, "sessions"), where("teacherId", "==", teacherId));
  const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
    let totalMinutes = 0;
    let sessionCount = 0;
    let currentSalary = 0;
    cachedSessions = [];
    const processedGroupSessions = new Set();

    snapshot.forEach(doc => {
      const session = doc.data();
      cachedSessions.push({ id: doc.id, ...session });

      // Skip student-only attendance records for salary/hours total
      if (session.isStudentRecordOnly === true || session.isSalaryRecord === false) return;

      const gId = session.groupSessionId || session.groupBatchId;
      const isGroup = session.type === "group" || session.sessionType === "group";

      if (isGroup && gId) {
        if (processedGroupSessions.has(gId)) return;
        processedGroupSessions.add(gId);
      }
      
      // Filter for current month sessions OR unarchived / carried over sessions from previous months
      const isCurrentMonth = session.date && session.date.startsWith(currentYearMonth);
      const isCarriedOver = session.isCarriedOver === true || (
        Boolean(session.date && session.date < currentYearMonth) && 
        session.archived !== true && 
        session.paid !== true &&
        !session.salaryClaimId
      );

      if (isCurrentMonth || isCarriedOver) {
        if (session.archived === true || session.paid === true) return;
        
        // Exclude trial sessions unless approved by Admin (student subscribed)
        if (session.type === "trial" && (session.approved !== true || session.trialSubscribed !== true)) {
          return;
        }

        const isCompleted = session.status === "completed";
        const isUnexcusedAbsent = session.status === "student_absent" && session.absenceType === "unexcused";
        const isApproved = session.approved === true;
        
        if (isApproved && (isCompleted || isUnexcusedAbsent)) {
          sessionCount++;
          
          const duration = parseInt(session.duration) || 0;
          totalMinutes += duration;

          // Calculate wage for this session
          let rate = 0;
          if (isGroup) {
            rate = parseFloat(teacher.hourlyRateGroup || teacher.hourlyRateIndividual || teacher.hourlyRate || 120);
          } else {
            rate = parseFloat(teacher.hourlyRateIndividual || teacher.hourlyRate || 100);
          }
          
          currentSalary += (duration / 60) * rate;
        }
      }
    });

    const totalHours = totalMinutes / 60;
    const bonuses = parseFloat(teacher.salaryBonuses || 0);
    const deductions = parseFloat(teacher.salaryDeductions || 0);
    const netSalary = Math.max(0, currentSalary + bonuses - deductions);

    const elHours = document.getElementById('totalMonthHours');
    const elSessions = document.getElementById('totalMonthSessions');
    const elSalary = document.getElementById('currentMonthSalary');

    if (elHours) animateTextCounter(elHours, `${totalHours.toFixed(2)} ساعة`);
    if (elSessions) animateTextCounter(elSessions, `${sessionCount} حصة`);
    if (elSalary) animateTextCounter(elSalary, `${netSalary.toFixed(2)} ج.م`);

    // Update monthly goal completion bar if available
    const elProgress = document.getElementById('monthlyHoursProgressBar');
    const elProgressText = document.getElementById('monthlyHoursProgressText');
    const elExecSummary = document.getElementById('executedHoursSummary');
    const elTargetSummary = document.getElementById('targetHoursSummary');

    if (elProgress || elProgressText) {
      const targetHours = 40; // Base baseline goal
      const percentage = Math.min(100, Math.round((totalHours / targetHours) * 100));
      if (elProgress) elProgress.style.width = `${percentage}%`;
      if (elProgressText) elProgressText.textContent = `${percentage}%`;
      if (elExecSummary) elExecSummary.textContent = `المنجز: ${totalHours.toFixed(1)} ساعة`;
      if (elTargetSummary) elTargetSummary.textContent = `الهدف: ${targetHours} ساعة`;
    }

    updateTodayCounters();
  }, (err) => console.error("Error listening to sessions stats:", err));

  // Return a combined unsubscribe function
  return () => {
    if (unsubStudents) unsubStudents();
    if (unsubSessions) unsubSessions();
  };
}

let isArchivingRunning = false;

/**
 * Automatically checks for previous months' sessions across teachers (or for a specific teacher),
 * archives them into salaryArchive with status "pending_admin_transfer", resets active month counters,
 * and sends detailed notifications to Admin and Teachers about due monthly salaries.
 * @param {object} [teacher] - Optional teacher object. If omitted or null, checks for ALL teachers.
 */
export async function checkAndAutoArchivePreviousMonth(teacher = null) {
  if (isArchivingRunning) return;
  
  const currentYearMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  const sessionCheckKey = `sabeel_auto_archived_checked_${currentYearMonth}_${teacher?.uid || 'all'}`;
  
  // Skip if checked in this session within the last 30 minutes
  const lastCheck = sessionStorage.getItem(sessionCheckKey);
  if (lastCheck && (Date.now() - parseInt(lastCheck, 10)) < 30 * 60 * 1000) {
    return;
  }

  isArchivingRunning = true;

  try {
    sessionStorage.setItem(sessionCheckKey, String(Date.now()));
    
    // 1. Build teacher map from users collection
    const usersSnap = await getDocs(collection(db, "users"));
    const teacherMap = {};
    usersSnap.forEach(d => {
      const u = d.data();
      if (u.role === 'teacher' || u.role === 'supervisor') {
        teacherMap[d.id] = { uid: d.id, ...u };
      }
    });

    if (teacher && teacher.uid) {
      teacherMap[teacher.uid] = { ...(teacherMap[teacher.uid] || {}), ...teacher };
    }

    // 2. Query all unarchived sessions from previous months
    const sessionsSnap = await getDocs(collection(db, "sessions"));
    const unarchivedPrevSessions = [];

    sessionsSnap.forEach(d => {
      const sess = d.data();
      if (sess.archived !== true && sess.paid !== true && sess.date && sess.date < currentYearMonth) {
        if (!teacher || !teacher.uid || sess.teacherId === teacher.uid) {
          unarchivedPrevSessions.push({ id: d.id, ...sess });
        }
      }
    });

    if (unarchivedPrevSessions.length === 0) return;

    // 3. Group sessions by month (YYYY-MM), then by teacherId
    const monthGroups = {}; // { "2026-07": { teacherId1: [sess1, sess2], teacherId2: [...] } }

    unarchivedPrevSessions.forEach(sess => {
      const ym = sess.date.substring(0, 7);
      if (!monthGroups[ym]) monthGroups[ym] = {};
      if (!monthGroups[ym][sess.teacherId]) monthGroups[ym][sess.teacherId] = [];
      monthGroups[ym][sess.teacherId].push(sess);
    });

    // 4. Process each month group
    for (const ym of Object.keys(monthGroups)) {
      const teacherGroups = monthGroups[ym];
      const batch = writeBatch(db);
      
      const adminSummaryList = [];
      let grandTotalSalary = 0;

      for (const teacherId of Object.keys(teacherGroups)) {
        const sessions = teacherGroups[teacherId];
        const teacherData = teacherMap[teacherId] || { name: sessions[0]?.teacherName || "معلم" };
        
        // Check if salaryArchive already has an entry for this teacher and month
        const existingArchiveQuery = query(
          collection(db, "salaryArchive"),
          where("teacherId", "==", teacherId),
          where("month", "==", ym)
        );
        const existingArchiveSnap = await getDocs(existingArchiveQuery);
        const alreadyArchived = !existingArchiveSnap.empty;

        let totalHours = 0;
        let salary = 0;
        let sessionsCount = 0;
        const processedGroupSessions = new Set();

        sessions.forEach(session => {
          if (session.isStudentRecordOnly === true || session.isSalaryRecord === false) return;

          const gId = session.groupSessionId || session.groupBatchId;
          const isGroup = session.type === "group" || session.sessionType === "group";

          if (isGroup && gId) {
            if (processedGroupSessions.has(gId)) return;
            processedGroupSessions.add(gId);
          }

          if (session.type === "trial" && (session.approved !== true || session.trialSubscribed !== true)) {
            return;
          }

          const isCompleted = session.status === "completed";
          const isUnexcusedAbsent = session.status === "student_absent" && session.absenceType === "unexcused";
          const isApproved = session.approved === true;

          if (isApproved && (isCompleted || isUnexcusedAbsent)) {
            sessionsCount++;
            const duration = parseInt(session.duration) || 0;
            const hours = duration / 60;
            totalHours += hours;

            let rate = 0;
            if (isGroup) {
              rate = parseFloat(teacherData.hourlyRateGroup || 0);
            } else {
              rate = parseFloat(teacherData.hourlyRateIndividual || teacherData.hourlyRate || 0);
            }
            if (!rate || rate <= 0) {
              rate = isGroup ? 120 : 100;
            }
            salary += hours * rate;
          }
        });

        const bonuses = parseFloat(teacherData.salaryBonuses || 0);
        const deductions = parseFloat(teacherData.salaryDeductions || 0);
        const netSalary = Math.max(0, salary + bonuses - deductions);
        const roundedSalary = Math.round(netSalary);

        if (roundedSalary > 0 && !alreadyArchived) {
          const archiveRef = doc(collection(db, "salaryArchive"));
          
          const paymentMethod = teacherData.paymentPreferred 
            || teacherData.paymentVodafone 
            || teacherData.paymentInstapay 
            || "فودافون كاش / انستاباي";

          batch.set(archiveRef, {
            teacherId: teacherId,
            teacherName: teacherData.name || "معلم",
            month: ym,
            amount: roundedSalary,
            sessionsCount,
            totalHours: parseFloat(totalHours.toFixed(1)),
            method: paymentMethod,
            notes: "أرشفة وتصفير تلقائي للدورة المالية مع بداية الشهر الجديد (يوم 1 في الشهر) بانتظار تحويل الإدارة.",
            adminName: "النظام التلقائي",
            status: "pending_admin_transfer",
            createdAt: serverTimestamp()
          });

          // Set sessions as archived and link them to the claim ID
          sessions.forEach(sess => {
            const sessRef = doc(db, "sessions", sess.id);
            const isTrial = sess.type === "trial" || sess.sessionType === "trial" || sess.isTrial === true;
            const isCompleted = sess.status === "completed";
            const isUnexcusedAbsent = sess.status === "student_absent" && sess.absenceType === "unexcused";
            const isApproved = sess.approved === true;
            const isTrialSubscribed = isTrial ? sess.trialSubscribed === true : true;

            if (isApproved && isTrialSubscribed && (isCompleted || isUnexcusedAbsent)) {
              batch.update(sessRef, { 
                archived: true, 
                paid: false,
                salaryCalculated: true,
                salaryClaimId: archiveRef.id,
                isCarriedOver: false
              });
            } else if (!isApproved) {
              batch.update(sessRef, { 
                archived: false, 
                paid: false,
                salaryCalculated: false,
                salaryClaimId: null,
                isCarriedOver: true,
                carriedOverFromMonth: ym,
                carriedOverNote: `مرحّلة من شهر ${monthNum}`
              });
            } else {
              batch.update(sessRef, { 
                archived: true, 
                paid: false,
                salaryCalculated: false,
                salaryClaimId: null,
                isCarriedOver: false
              });
            }
          });

          // Reset teacher active bonuses and deductions for the new month cycle
          const teacherUserRef = doc(db, "users", teacherId);
          batch.update(teacherUserRef, {
            salaryBonuses: 0,
            salaryDeductions: 0,
            salaryStatus: "pending_transfer"
          });

          grandTotalSalary += roundedSalary;
          adminSummaryList.push({
            teacherName: teacherData.name || "معلم",
            amount: roundedSalary,
            totalHours: totalHours.toFixed(1),
            sessionsCount,
            method: paymentMethod,
            phone: teacherData.paymentVodafone || teacherData.phone || "-"
          });

          // Send individual notification to teacher with both message and body
          const notifMsg = `تم إعادة ضبط السجل للشهر الجديد وأرشفة مستحقاتك المالية لشهر (${ym}) بمبلغ (${roundedSalary.toLocaleString()} ج.م) عن (${sessionsCount} حصة / ${totalHours.toFixed(1)} ساعة). المستحقات معتمدة وبانتظار تحويل الإدارة.`;
          const teacherNotifRef = doc(collection(db, "notifications"));
          batch.set(teacherNotifRef, {
            recipientId: teacherId,
            teacherId: teacherId,
            title: `💰 تصفير الشهر وأرشفة المستحقات لشهر (${ym})`,
            message: notifMsg,
            body: notifMsg,
            type: "salary_archived",
            read: false,
            createdAt: serverTimestamp()
          });

          sendPushNotification({
            title: `💰 تصفير الشهر وأرشفة المستحقات لشهر (${ym})`,
            body: notifMsg,
            recipientId: teacherId,
            type: "salary_archived",
            url: "/teacher/index.html",
            data: { notifId: teacherNotifRef.id, month: ym, amount: roundedSalary }
          }).catch(e => console.warn(e));
        } else if (alreadyArchived) {
          // If already archived (e.g. deposited or closed early on day 30), do NOT discard sessions!
          // Carry them over to the active new month under note "مرحّلة من شهر X" so no session is ever lost!
          const monthNum = parseInt(ym.split('-')[1], 10);
          sessions.forEach(sess => {
            const sessRef = doc(db, "sessions", sess.id);
            batch.update(sessRef, {
              archived: false,
              paid: false,
              salaryClaimId: null,
              isCarriedOver: true,
              carriedOverFromMonth: ym,
              carriedOverNote: `مرحّلة من شهر ${monthNum}`
            });
          });
        } else {
          // Salary is 0 or no approved sessions to archive
          sessions.forEach(sess => {
            const sessRef = doc(db, "sessions", sess.id);
            if (sess.approved !== true) {
              batch.update(sessRef, {
                archived: false,
                paid: false,
                salaryCalculated: false,
                salaryClaimId: null,
                isCarriedOver: true,
                carriedOverFromMonth: ym,
                carriedOverNote: `مرحّلة من شهر ${monthNum}`
              });
            } else {
              batch.update(sessRef, {
                archived: true,
                paid: false,
                salaryCalculated: false,
                salaryClaimId: null,
                isCarriedOver: false
              });
            }
          });
        }
      }

      await batch.commit();

      // Send consolidated Admin notification if salaries were newly archived
      if (adminSummaryList.length > 0) {
        const detailsText = adminSummaryList.map((item, idx) => 
          `${idx + 1}. أ. ${item.teacherName}: ${item.amount.toLocaleString()} ج.م (${item.sessionsCount} حصة | ${item.totalHours} ساعة) - طريقة التحويل: [${item.method}]`
        ).join("\n");

        const adminMsg = `تم تصفير الدورة المالية للشهر السابق وتوليد كشف أرشيف الرواتب تلقائيًا مع بداية الشهر.\nإجمالي المستحقات المطلوبة من الأكاديمية: (${grandTotalSalary.toLocaleString()} ج.م)\n\nكشف المستحقات لكل معلم:\n${detailsText}\n\nيمكنك مراجعة الكشف وإرفاق إيصالات الدفع من صفحة أرشيف الرواتب أو إدارة المعلمين.`;

        const adminNotifRef = await addDoc(collection(db, "notifications"), {
          recipientId: "admin",
          title: `💰 إشعار الرواتب والمستحقات الشهرية - شهر (${ym})`,
          message: adminMsg,
          body: adminMsg,
          type: "monthly_payroll_reset",
          month: ym,
          totalAmount: grandTotalSalary,
          teachersCount: adminSummaryList.length,
          read: false,
          createdAt: serverTimestamp()
        });

        sendPushNotification({
          title: `💰 إشعار الرواتب والمستحقات الشهرية - شهر (${ym})`,
          body: adminMsg,
          recipientId: "admin",
          type: "monthly_payroll_reset",
          url: "/admin/salaries-archive.html",
          data: { notifId: adminNotifRef.id, month: ym, totalAmount: grandTotalSalary }
        }).catch(e => console.warn(e));
      }
    }

    console.log("Monthly reset auto-archive job finished successfully.");
  } catch (err) {
    console.error("Error in checkAndAutoArchivePreviousMonth:", err);
  } finally {
    isArchivingRunning = false;
  }
}

/**
 * Manually carries over specific sessions recorded after an archive was closed,
 * adding them to the new active month's salary under a note "مرحّلة من شهر X".
 * @param {Array<string>} sessionIds - List of session document IDs
 * @param {string} sourceMonth - Source month in "YYYY-MM" format (e.g. "2026-08")
 * @returns {Promise<number>} Number of carried-over sessions
 */
export async function carryOverPostArchiveSessions(sessionIds, sourceMonth = '') {
  if (!sessionIds || sessionIds.length === 0) return 0;
  
  const monthNum = sourceMonth ? parseInt(sourceMonth.split('-')[1], 10) : '';
  const noteText = monthNum ? `مرحّلة من شهر ${monthNum}` : 'مرحّلة من شهر سابق';
  const batch = writeBatch(db);

  sessionIds.forEach(id => {
    const ref = doc(db, "sessions", id);
    batch.update(ref, {
      archived: false,
      paid: false,
      salaryClaimId: null,
      isCarriedOver: true,
      carriedOverFromMonth: sourceMonth,
      carriedOverNote: noteText
    });
  });

  await batch.commit();
  return sessionIds.length;
}

