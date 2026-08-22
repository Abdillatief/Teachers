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
import { 
  notifyAdminSessionNow, 
  notifyAdminEndOfDayUnrecorded 
} from './adminNotificationService.js';

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
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
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
 * Evaluates active session schedule:
 * 1. Alerts at session start time (حصة جارية الآن) without duplication.
 * 2. Pre-session reminders (15m before) for teacher/student.
 * 3. End of day unrecorded check (at/after 21:00) to alert admin once for missed sessions.
 */
export async function checkAndSendSessionReminders() {
  const user = auth.currentUser;
  if (!user) return;

  const now = new Date();
  const todayArabicDay = getArabicDayName(now);
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentHour = now.getHours();

  try {
    // 1. Fetch active students
    const qStudents = query(
      collection(db, "students"),
      where("status", "in", ["active", "approved", "مستمر"])
    );
    const snap = await getDocs(qStudents);

    if (!snap.empty) {
      for (const docSnap of snap.docs) {
        const student = { id: docSnap.id, ...docSnap.data() };

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

        // Helper to dispatch non-repeating reminder
        const dispatchReminder = async (type, reminderKey, title, teacherMsg, studentMsg) => {
          if (processedReminders.has(reminderKey)) return;

          // Check in Firestore collection for idempotency
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

          // Write notification for Teacher in Firestore
          if (student.teacherId) {
            await addDoc(collection(db, "notifications"), {
              title: title,
              body: teacherMsg,
              recipientId: student.teacherId,
              recipientRole: "teacher",
              teacherId: student.teacherId,
              teacherName: student.teacherName || 'المعلم',
              studentId: student.id,
              studentName: student.name,
              sessionTime: timeStr,
              duration: duration,
              url: targetUrl,
              reminderKey: reminderKey,
              type: type,
              category: type,
              read: false,
              readBy: [],
              createdAt: serverTimestamp()
            });
          }

          // Trigger sound and native alert if current user is the teacher
          if (user.uid === student.teacherId) {
            playNotificationChime();
            Toast.info(`${title}: ${student.name} (${timeStr})`);
            sendNativeNotification(title, teacherMsg, targetUrl, {
              studentName: student.name,
              sessionTime: timeStr,
              duration: duration,
              studentId: student.id
            });
          }
        };

        // --- 1. Pre-Session Reminder (15 Minutes Before Start) for Teacher/Student ---
        if (diffMinutes >= 10 && diffMinutes <= 17) {
          const key = `remind_15m_${student.id}_${todayDateStr}_${timeStr.replace(/\s+/g, '_')}`;
          const title = `⏰ تذكير بموعد الحصة`;
          const teacherMsg = `تذكير: باقي 15 دقيقة على موعد حصة الطالب (${student.name}) المقرر لها اليوم (${timeStr}).`;
          const studentMsg = `تذكير: باقي 15 دقيقة على حصتك القرآنية اليوم (${timeStr}).`;

          await dispatchReminder('session_reminder_15m', key, title, teacherMsg, studentMsg);
        }

        // --- 2. EXACT SESSION START TIME: Ongoing Session Now (Non-Repeating) ---
        // Range: -3 <= diffMinutes <= 3
        if (diffMinutes >= -3 && diffMinutes <= 3) {
          const key = `session_now_ind_${student.id}_${todayDateStr}_${timeStr.replace(/\s+/g, '_')}`;
          const title = `🔴 حصة جارية الآن`;
          const teacherMsg = `بدأ الآن موعد حصة الطالب (${student.name}) - الساعة (${timeStr}). يرجى بدء الحصة وتسجيل الحضور.`;

          await dispatchReminder('session_ongoing', key, title, teacherMsg, teacherMsg);

          // Dispatch single session-now notification for Admin
          notifyAdminSessionNow({
            teacherId: student.teacherId,
            teacherName: student.teacherName || 'المعلم',
            teacherPhone: student.teacherPhone || '',
            targetName: student.name,
            sessionType: 'individual',
            scheduledTime: timeStr,
            studentId: student.id,
            dateStr: todayDateStr
          }).catch(e => console.warn(e));
        }

        // --- 3. END-OF-DAY UNRECORDED SESSIONS CHECK (Only at or after 21:00 / 9:00 PM) ---
        if (currentHour >= 21) {
          // If session time has passed today (diffMinutes < -30)
          if (diffMinutes < -30) {
            const isRecorded = await isSessionRecordedToday(student.teacherId, student.id, todayDateStr);
            if (!isRecorded) {
              notifyAdminEndOfDayUnrecorded({
                teacherId: student.teacherId,
                teacherName: student.teacherName || 'المعلم',
                teacherPhone: student.teacherPhone || '',
                targetName: student.name,
                sessionType: 'individual',
                scheduledTime: timeStr,
                dateStr: todayDateStr,
                studentId: student.id
              }).catch(e => console.warn(e));
            }
          }
        }
      }
    }

    // 2. Process Group Sessions
    try {
      const snapGroups = await getDocs(query(collection(db, "groups")));
      for (const gDoc of snapGroups.docs) {
        const group = { id: gDoc.id, ...gDoc.data() };
        const groupDays = Array.isArray(group.day) ? group.day : [group.day];
        if (!groupDays.includes(todayArabicDay)) continue;

        const groupTime = group.time || group.sessionTime || '05:30 مساءً';
        const groupDate = parseSessionTimeToTodayDate(groupTime);
        if (!groupDate) continue;

        const diffGroupMs = groupDate.getTime() - now.getTime();
        const diffGroupMins = Math.floor(diffGroupMs / (1000 * 60));

        // Group Session Starting Right Now (-3 <= diff <= 3)
        if (diffGroupMins >= -3 && diffGroupMins <= 3) {
          notifyAdminSessionNow({
            teacherId: group.teacherId,
            teacherName: group.teacherName || 'المعلم',
            teacherPhone: group.teacherPhone || '',
            targetName: group.name,
            sessionType: 'group',
            scheduledTime: groupTime,
            groupId: group.id,
            dateStr: todayDateStr
          }).catch(e => console.warn(e));
        }

        // Group End-of-Day Unrecorded Check (At or after 21:00 / 9 PM)
        if (currentHour >= 21 && diffGroupMins < -30) {
          const groupSessQ = query(
            collection(db, "group_sessions"),
            where("groupId", "==", group.id),
            where("date", "==", todayDateStr)
          );
          const gSnap = await getDocs(groupSessQ);
          if (gSnap.empty) {
            notifyAdminEndOfDayUnrecorded({
              teacherId: group.teacherId,
              teacherName: group.teacherName || 'المعلم',
              teacherPhone: group.teacherPhone || '',
              targetName: group.name,
              sessionType: 'group',
              scheduledTime: groupTime,
              dateStr: todayDateStr,
              groupId: group.id
            }).catch(e => console.warn(e));
          }
        }
      }
    } catch (gErr) {
      console.warn("Group schedule reminder check error:", gErr);
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

