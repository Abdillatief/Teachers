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

/**
 * Automatically checks for previous months' sessions and archives them into salaryArchive with status "pending_admin_transfer".
 * @param {object} teacher - The logged-in teacher object
 */
export async function checkAndAutoArchivePreviousMonth(teacher) {
  if (!teacher || !teacher.uid) return;

  try {
    const currentYearMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    
    // Query all sessions for this teacher
    const q = query(collection(db, "sessions"), where("teacherId", "==", teacher.uid));
    const snap = await getDocs(q);
    
    const unarchivedPrevMonthSessions = [];
    snap.forEach(d => {
      const sess = d.data();
      const sessId = d.id;
      // Filter unarchived and in previous months
      if (sess.archived !== true && sess.paid !== true && sess.date && sess.date < currentYearMonth) {
        unarchivedPrevMonthSessions.push({ id: sessId, ...sess });
      }
    });

    if (unarchivedPrevMonthSessions.length === 0) return;

    // Group by year-month
    const groups = {};
    unarchivedPrevMonthSessions.forEach(sess => {
      const ym = sess.date.substring(0, 7);
      if (!groups[ym]) groups[ym] = [];
      groups[ym].push(sess);
    });

    const batch = writeBatch(db);

    for (const ym of Object.keys(groups)) {
      const sessions = groups[ym];
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
            rate = teacher.hourlyRateGroup || teacher.hourlyRate || 120;
          } else {
            rate = teacher.hourlyRateIndividual || teacher.hourlyRate || 100;
          }
          salary += hours * rate;
        }
      });

      if (salary > 0) {
        // Create a new salary claim in the archive waiting for admin transfer
        const archiveRef = doc(collection(db, "salaryArchive"));
        
        batch.set(archiveRef, {
          teacherId: teacher.uid,
          teacherName: teacher.name,
          month: ym,
          amount: Math.round(salary),
          sessionsCount,
          totalHours,
          method: teacher.paymentPreferred || "فودافون كاش (Vodafone Cash)",
          notes: "أرشفة وتصفير تلقائي للدورة المالية مع بداية الشهر الجديد - بانتظار تحويل الإدارة والاعتماد والتوثيق.",
          adminName: "النظام التلقائي",
          status: "pending_admin_transfer", // بانتظار تحويل الأدمن
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
      } else {
        // Even if salary is 0, we can archive sessions from previous month to keep counters clean
        sessions.forEach(sess => {
          const sessRef = doc(db, "sessions", sess.id);
          batch.update(sessRef, { archived: true });
        });
      }
    }

    await batch.commit();
    console.log("Monthly reset auto-archive job finished successfully.");
  } catch (err) {
    console.error("Error in checkAndAutoArchivePreviousMonth:", err);
  }
}
