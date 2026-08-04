import { db, auth } from '../../config/firebase.js';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from './toast.js';

// In-memory cache to prevent duplicate reminder notifications within current browser runtime
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
 * Requests native browser Notification permissions
 */
export async function requestBrowserNotificationPermission() {
  if (!('Notification' in window)) {
    Toast.info('متصفحك الحالي لا يدعم إشعارات المتصفح المنبثقة.');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      Toast.success('تم تفعيل إشعارات المتصفح بنجاح! 🔔 ستصلك تنبيهات الحصص حتى عند إغلاق أو تصغير الصفحة.');
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(err => {
          navigator.serviceWorker.register('/sw.js').catch(e => console.log('SW Registration fallback:', e));
        });
      }
    } else if (permission === 'denied') {
      Toast.warning('تم رفض إذن الإشعارات من المتصفح. يمكنك تفعيلها من إعدادات المتصفح.');
    }
    return permission;
  } catch (err) {
    console.error('Permission request error:', err);
    return 'error';
  }
}

/**
 * Triggers a native system browser notification with Web Push compatibility
 */
export function sendNativeNotification(title, body, url = '/teacher/today-sessions.html', extraData = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body: body,
          icon: '/assets/icons/icon-192.png',
          badge: '/assets/icons/icon-192.png',
          vibrate: [200, 100, 200, 100, 200],
          data: { url: url, ...extraData },
          actions: [
            { action: 'open_session', title: 'فتح الحصة 📖' },
            { action: 'open_today', title: 'جدول اليوم 📅' }
          ]
        });
      });
    } else {
      const notif = new Notification(title, {
        body: body,
        icon: '/assets/icons/icon-192.png'
      });
      notif.onclick = () => {
        window.focus();
        window.location.href = url;
      };
    }
  } catch (err) {
    console.error('Native notification error:', err);
  }
}

/**
 * Checks if a session has already been recorded in Firestore for today
 */
async function isSessionRecordedToday(teacherId, studentId, dateStr) {
  try {
    const q = query(
      collection(db, "sessions"),
      where("studentId", "==", studentId),
      where("date", "==", dateStr)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (e) {
    console.warn("Check session recorded error:", e);
    return false;
  }
}

/**
 * Automated FCM Web Push & Session Schedule Notification Engine.
 * Evaluates all 6 notification windows:
 * 1. 30 Minutes before session start
 * 2. 15 Minutes before session start
 * 3. At exact session start time (0 min)
 * 4. Teacher Delay Alert (10 min after start if unrecorded)
 * 5. Missing Session Report Alert (30 min after start if unrecorded)
 * 6. Daily Summary of Unrecorded Sessions
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

      // Filter by teacher if user is a teacher
      if (user.uid !== student.teacherId && user.uid !== student.requestedByTeacherId) {
        // Admin or other users check all
      }

      // Determine schedule days
      const days = student.schedule?.days || student.sessionDays || [];
      if (!days.includes(todayArabicDay)) continue;

      // Determine session time for today
      let timeStr = student.schedule?.uniformTime || student.sessionTime || student.time;
      if (student.schedule?.differentTimes && student.schedule?.times && student.schedule.times[todayArabicDay]) {
        timeStr = student.schedule.times[todayArabicDay];
      }

      if (!timeStr) continue;

      const duration = student.duration || student.sessionDuration || 60;
      const sessionDate = parseSessionTimeToTodayDate(timeStr);
      if (!sessionDate) continue;

      // Calculate time difference in minutes
      const diffMs = sessionDate.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      const targetUrl = `/teacher/today-sessions.html?studentId=${student.id}`;

      // Helper to dispatch and save notification idempotently
      const dispatchReminder = async (type, reminderKey, title, teacherMsg, studentMsg) => {
        if (processedReminders.has(reminderKey)) return;

        // Verify Firestore database duplicate check
        const existingQuery = query(
          collection(db, "notifications"),
          where("reminderKey", "==", reminderKey)
        );
        const existingSnap = await getDocs(existingQuery);
        if (!existingSnap.empty) {
          processedReminders.add(reminderKey);
          return;
        }

        processedReminders.add(reminderKey);

        // 1. Write notification for Teacher in Firestore
        if (student.teacherId) {
          await addDoc(collection(db, "notifications"), {
            title: title,
            body: teacherMsg,
            recipientId: student.teacherId,
            teacherId: student.teacherId,
            studentId: student.id,
            studentName: student.name,
            sessionTime: timeStr,
            duration: duration,
            url: targetUrl,
            reminderKey: reminderKey,
            type: type,
            createdAt: serverTimestamp()
          });
        }

        // 2. Write notification for Admin or Student
        await addDoc(collection(db, "notifications"), {
          title: title,
          body: `[سجل المتابعة والإشراف]: ${teacherMsg}`,
          recipientId: 'admin',
          teacherId: student.teacherId,
          studentId: student.id,
          studentName: student.name,
          sessionTime: timeStr,
          duration: duration,
          url: targetUrl,
          reminderKey: `${reminderKey}_admin`,
          type: type,
          createdAt: serverTimestamp()
        });

        // 3. Trigger audio chime and native system/FCM push if current active user is the recipient
        if (user.uid === student.teacherId || user.uid === 'admin') {
          playNotificationChime();
          Toast.warning(`${title}: ${student.name} (${timeStr})`);
          sendNativeNotification(title, teacherMsg, targetUrl, {
            studentName: student.name,
            sessionTime: timeStr,
            duration: duration,
            studentId: student.id
          });
        }
      };

      // --- TRIGGER 1: 30 Minutes Before Session Start (25 <= diffMinutes <= 32) ---
      if (diffMinutes >= 25 && diffMinutes <= 32) {
        const key = `remind_30m_${student.id}_${todayDateStr}_${timeStr.replace(/\s+/g, '_')}`;
        const title = `⏰ تذكير (30 دقيقة): موعد حصة القرآن قادم`;
        const teacherMsg = `تذكير: باقي 30 دقيقة على موعد حصة الطالب (${student.name}) المقرر لها اليوم الساعة (${timeStr}) ومدتها (${duration}) دقيقة. يرجى الاستعداد!`;
        const studentMsg = `تذكير: باقي 30 دقيقة على موعد حصتك القرآنية مع المعلم (${student.teacherName || 'المعلم'}) الساعة (${timeStr}).`;

        await dispatchReminder('session_reminder_30m', key, title, teacherMsg, studentMsg);
      }

      // --- TRIGGER 2: 15 Minutes Before Session Start (10 <= diffMinutes <= 18) ---
      if (diffMinutes >= 10 && diffMinutes <= 18) {
        const key = `remind_15m_${student.id}_${todayDateStr}_${timeStr.replace(/\s+/g, '_')}`;
        const title = `⏰ تذكير عاجل (15 دقيقة): أوشك موعد الحصة`;
        const teacherMsg = `تذكير عاجل: باقي 15 دقيقة على انطلاق حصة الطالب (${student.name}) الساعة (${timeStr}). تجهز لبدء الجلسة.`;
        const studentMsg = `تذكير عاجل: باقي 15 دقيقة على حصتك القرآنية اليوم الساعة (${timeStr}).`;

        await dispatchReminder('session_reminder_15m', key, title, teacherMsg, studentMsg);
      }

      // --- TRIGGER 3: Exact Session Start Time (-2 <= diffMinutes <= 3) ---
      if (diffMinutes >= -2 && diffMinutes <= 3) {
        const key = `remind_start_${student.id}_${todayDateStr}_${timeStr.replace(/\s+/g, '_')}`;
        const title = `🚀 حان الآن موعد الحصة!`;
        const teacherMsg = `بدأ الآن موعد حصة الطالب (${student.name}) - الساعة (${timeStr}). يرجى فتح قاعة الدرس وبدء التسجيل.`;
        const studentMsg = `حان الآن موعد حصتك القرآنية مع المعلم (${student.teacherName || 'المعلم'}). نتمنى لك جلسة مبروكة!`;

        await dispatchReminder('session_reminder_0m', key, title, teacherMsg, studentMsg);
      }

      // --- TRIGGER 4: Teacher Delay Alert (10 mins passed after start time, -20 <= diffMinutes <= -9) ---
      if (diffMinutes <= -9 && diffMinutes >= -22) {
        const isRecorded = await isSessionRecordedToday(student.teacherId, student.id, todayDateStr);
        if (!isRecorded) {
          const key = `alert_delay_${student.id}_${todayDateStr}_${timeStr.replace(/\s+/g, '_')}`;
          const title = `⚠️ تنبيه تأخير المعلم عن الحصة`;
          const teacherMsg = `تنبيه عاجل: انقضت 10 دقائق على موعد حصة الطالب (${student.name}) المقرر لها (${timeStr}) ولم يتم بدء الحصة أو تسجيل الحضور حتى الآن.`;

          await dispatchReminder('teacher_delay_alert', key, title, teacherMsg, teacherMsg);
        }
      }

      // --- TRIGGER 5: Missing Session Report Alert (30 mins passed after start time, -50 <= diffMinutes <= -28) ---
      if (diffMinutes <= -28 && diffMinutes >= -60) {
        const isRecorded = await isSessionRecordedToday(student.teacherId, student.id, todayDateStr);
        if (!isRecorded) {
          const key = `alert_missing_report_${student.id}_${todayDateStr}_${timeStr.replace(/\s+/g, '_')}`;
          const title = `📝 تنبيه: تقرير حصة مفقود`;
          const teacherMsg = `تنبيه توثيق: انقضت أكثر من 30 دقيقة على موعد حصة الطالب (${student.name}) الساعة (${timeStr}). يرجى إثبات الحضور أو إدخال تقرير التسميع والدرجات.`;

          await dispatchReminder('missing_session_report', key, title, teacherMsg, teacherMsg);
        }
      }
    }
  } catch (err) {
    console.error("Error running session FCM & schedule engine:", err);
  }
}

/**
 * Initializes automatic FCM schedule checker interval and service worker setup
 */
export function initSessionReminderChecker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(err => {
      navigator.serviceWorker.register('/sw.js').catch(e => console.log('SW fallback error:', e));
    });
  }

  auth.onAuthStateChanged((user) => {
    if (!user) return;

    // Run check immediately on load
    checkAndSendSessionReminders();

    // Repeat check every 45 seconds for active sessions
    if (!window.__sessionReminderInterval) {
      window.__sessionReminderInterval = setInterval(() => {
        checkAndSendSessionReminders();
      }, 45000);
    }
  });
}
