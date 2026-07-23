import { db, auth } from '../../config/firebase.js';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from './toast.js';

// In-memory set to avoid duplicate checks within the session
const processedReminders = new Set();

/**
 * Audio chime sound using Web Audio API for gentle notification alerts
 */
export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.12);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch (err) {
    // Audio context might be restricted before user gesture
  }
}

/**
 * Parses time strings like "05:30 مساءً", "8:00 صباحاً", "17:30" into a Date object for today
 */
export function parseSessionTimeToTodayDate(timeStr) {
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

  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  return todayDate;
}

/**
 * Gets Arabic day name for today
 */
export function getArabicDayName(date = new Date()) {
  const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return days[date.getDay()];
}

/**
 * Checks scheduled lessons for today and sends 15-minute reminders
 */
export async function checkAndSendSessionReminders() {
  const user = auth.currentUser;
  if (!user) return;

  const now = new Date();
  const todayArabicDay = getArabicDayName(now);
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  try {
    // Fetch active students
    const qStudents = query(
      collection(db, "students"),
      where("status", "in", ["active", "approved", "مستمر"])
    );
    const snap = await getDocs(qStudents);

    if (snap.empty) return;

    for (const docSnap of snap.docs) {
      const student = { id: docSnap.id, ...docSnap.data() };

      // Determine days
      const days = student.schedule?.days || student.sessionDays || [];
      if (!days.includes(todayArabicDay)) continue;

      // Determine session time for today
      let timeStr = student.schedule?.uniformTime || student.sessionTime || student.time;
      if (student.schedule?.differentTimes && student.schedule?.times && student.schedule.times[todayArabicDay]) {
        timeStr = student.schedule.times[todayArabicDay];
      }

      if (!timeStr) continue;

      const sessionDate = parseSessionTimeToTodayDate(timeStr);
      if (!sessionDate) continue;

      // Calculate time difference in minutes
      const diffMs = sessionDate.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      // Check if session is within 15 minutes from now (0 <= diffMinutes <= 15)
      if (diffMinutes >= 0 && diffMinutes <= 15) {
        const reminderKey = `remind_${student.id}_${todayDateStr}_${timeStr.replace(/\s+/g, '_')}`;

        if (processedReminders.has(reminderKey)) continue;

        // Check in Firestore if notification was already sent today
        const existingNotifQuery = query(
          collection(db, "notifications"),
          where("reminderKey", "==", reminderKey)
        );
        const existingSnap = await getDocs(existingNotifQuery);

        if (!existingSnap.empty) {
          processedReminders.add(reminderKey);
          continue;
        }

        // Mark as processed in local memory
        processedReminders.add(reminderKey);

        const title = `⏰ تذكير: حصة القرآن تبدأ خلال ${diffMinutes === 0 ? 'لحظات' : diffMinutes + ' دقيقة'}`;
        const teacherMessage = `تذكير بموعد الحصة للطالب (${student.name}) المقرر لها اليوم الساعة (${timeStr}). أوشك موعد الانطلاق!`;
        const studentMessage = `تذكير بموعد حصتك القرآنية مع المعلم (${student.teacherName || 'المعلم'}) المقرر لها اليوم الساعة (${timeStr}). نتمنى لك جلسة نافعة!`;

        // 1. Notification for Teacher
        if (student.teacherId) {
          await addDoc(collection(db, "notifications"), {
            title: title,
            body: teacherMessage,
            recipientId: student.teacherId,
            teacherId: student.teacherId,
            studentId: student.id,
            reminderKey: reminderKey,
            type: 'session_reminder_15m',
            createdAt: serverTimestamp()
          });
        }

        // 2. Notification for Student if student has a UID or account
        if (student.uid) {
          await addDoc(collection(db, "notifications"), {
            title: title,
            body: studentMessage,
            recipientId: student.uid,
            teacherId: student.teacherId,
            studentId: student.id,
            reminderKey: `${reminderKey}_student`,
            type: 'session_reminder_15m',
            createdAt: serverTimestamp()
          });
        } else {
          // Record for admin/academy overview
          await addDoc(collection(db, "notifications"), {
            title: title,
            body: `[إشعار للطالب والولي]: ${studentMessage}`,
            recipientId: 'admin',
            teacherId: student.teacherId,
            studentId: student.id,
            reminderKey: `${reminderKey}_admin_log`,
            type: 'session_reminder_15m',
            createdAt: serverTimestamp()
          });
        }

        // 3. Play audio chime sound & show Toast if current user is the teacher or student
        if (user.uid === student.teacherId || user.uid === student.uid) {
          playNotificationChime();
          Toast.warning(`⏰ تنبيه حصة: ${title} - ${student.name}`);
        }
      }
    }
  } catch (err) {
    console.error("Error running session reminder check:", err);
  }
}

/**
 * Initializes auto reminder interval when app is active
 */
export function initSessionReminderChecker() {
  auth.onAuthStateChanged((user) => {
    if (!user) return;

    // Run check immediately on load
    checkAndSendSessionReminders();

    // Repeat check every 45 seconds
    if (!window.__sessionReminderInterval) {
      window.__sessionReminderInterval = setInterval(() => {
        checkAndSendSessionReminders();
      }, 45000);
    }
  });
}
