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

    snapshot.forEach(doc => {
      const session = doc.data();
      cachedSessions.push({ id: doc.id, ...session });
      
      // Filter for current month sessions
      if (session.date && session.date.startsWith(currentYearMonth)) {
        const isCompleted = session.status === "completed";
        const isUnexcusedAbsent = session.status === "student_absent" && session.absenceType === "unexcused";
        
        if (isCompleted || isUnexcusedAbsent) {
          sessionCount++;
          
          const duration = parseInt(session.duration) || 0;
          totalMinutes += duration;

          // Calculate wage for this session
          let rate = 0;
          if (session.type === "group") {
            rate = teacher.hourlyRateGroup || teacher.hourlyRate || 120;
          } else {
            rate = teacher.hourlyRateIndividual || teacher.hourlyRate || 100;
          }
          
          currentSalary += (duration / 60) * rate;
        }
      }
    });

    const totalHours = totalMinutes / 60;

    const elHours = document.getElementById('totalMonthHours');
    const elSessions = document.getElementById('totalMonthSessions');
    const elSalary = document.getElementById('currentMonthSalary');

    if (elHours) animateTextCounter(elHours, `${totalHours.toFixed(2)} ساعة`);
    if (elSessions) animateTextCounter(elSessions, `${sessionCount} حصة`);
    if (elSalary) animateTextCounter(elSalary, `${currentSalary.toFixed(2)} ج.م`);

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
  isArchivingRunning = true;

  try {
    const currentYearMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    
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

        sessions.forEach(session => {
          const isCompleted = session.status === "completed";
          const isUnexcusedAbsent = session.status === "student_absent" && session.absenceType === "unexcused";
          const isApproved = session.approved === true;

          if (isApproved && (isCompleted || isUnexcusedAbsent)) {
            sessionsCount++;
            const duration = parseInt(session.duration) || 0;
            const hours = duration / 60;
            totalHours += hours;

            let rate = 0;
            if (session.type === "group") {
              rate = parseFloat(teacherData.hourlyRateGroup || 0);
            } else {
              rate = parseFloat(teacherData.hourlyRateIndividual || teacherData.hourlyRate || 0);
            }
            if (!rate || rate <= 0) {
              rate = session.type === "group" ? 120 : 100;
            }
            salary += hours * rate;
          }
        });

        const roundedSalary = Math.round(salary);

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
            batch.update(sessRef, { 
              archived: true, 
              paid: false,
              salaryClaimId: archiveRef.id
            });
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
        } else {
          // If already archived or salary is 0, archive sessions to clean up active status
          const existingClaimId = alreadyArchived ? existingArchiveSnap.docs[0].id : null;
          sessions.forEach(sess => {
            const sessRef = doc(db, "sessions", sess.id);
            const updatePayload = { archived: true };
            if (existingClaimId) updatePayload.salaryClaimId = existingClaimId;
            batch.update(sessRef, updatePayload);
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

        await addDoc(collection(db, "notifications"), {
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
      }
    }

    console.log("Monthly reset auto-archive job finished successfully.");
  } catch (err) {
    console.error("Error in checkAndAutoArchivePreviousMonth:", err);
  } finally {
    isArchivingRunning = false;
  }
}
