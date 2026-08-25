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
import { dataStore } from '../data/dataStore.js';
import { isMedianApp, promptMedianPushPermission } from './medianBridge.js';

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
 * Shows a friendly, structured modal guiding the user on how to enable notifications on their specific platform
 */
export function showNotificationHelperModal(statusObj) {
  const existing = document.getElementById('sabeelNotifHelpModal');
  if (existing) existing.remove();

  const isIOS = statusObj?.isIOS || /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  const isDenied = statusObj?.permission === 'denied';

  let title = 'تفعيل إشعارات وتنبيهات الحصص 🔔';
  let bodyContent = '';

  if (isIOS) {
    title = 'تفعيل الإشعارات على هواتف آيفون (iOS) 📱';
    bodyContent = `
      <div style="text-align: right; line-height: 1.6; font-size: 0.9rem; color: var(--text-primary);">
        <p style="margin-bottom: 0.75rem;">
          يتطلب نظام <strong>iOS</strong> من أبل تثبيت التطبيق على الشاشة الرئيسية لتتمكن من استلام الإشعارات عند إغلاق التطبيق:
        </p>
        <ol style="margin-right: 1.25rem; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; color: var(--text-secondary);">
          <li>اضغط على زر <strong>المشاركة (Share ⎋)</strong> في أسفل متصفح Safari.</li>
          <li>اختر <strong>«إضافة إلى الشاشة الرئيسية (Add to Home Screen)» 📲</strong>.</li>
          <li>افتح التطبيق من أيقونة الشاشة الرئيسية ثم اضغط <strong>«تفعيل الإشعارات»</strong>.</li>
        </ol>
      </div>
    `;
  } else if (isDenied) {
    title = 'تم حظر الإشعارات في متصفحك ⚠️';
    bodyContent = `
      <div style="text-align: right; line-height: 1.6; font-size: 0.9rem; color: var(--text-primary);">
        <p style="margin-bottom: 0.75rem;">
          تم رفض إذن الإشعارات مسبقاً في هذا المتصفح. يمكنك فك الحظر بسهولة بالخطوات التالية:
        </p>
        <ol style="margin-right: 1.25rem; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; color: var(--text-secondary);">
          <li>اضغط على <strong>رمز القفل (🔒) أو الإعدادات</strong> بجانب رابط الموقع في شريط العناوين.</li>
          <li>ابحث عن إذن <strong>«الإشعارات (Notifications)»</strong> وغيّره إلى <strong>«سماح (Allow)»</strong>.</li>
          <li>أعد تحديث الصفحة ثم انقر على تفعيل الإشعارات.</li>
        </ol>
      </div>
    `;
  } else {
    title = 'تنبيه حول توافق الإشعارات ℹ️';
    bodyContent = `
      <div style="text-align: right; line-height: 1.6; font-size: 0.9rem; color: var(--text-primary);">
        <p style="margin-bottom: 0.75rem;">
          للحصول على أفضل تجربة إشعارات وتنبيهات فورية عند إغلاق التطبيق، ننصح بفتح الرابط في متصفح <strong>Google Chrome</strong> أو <strong>Safari</strong> وتثبيت التطبيق كـ PWA.
        </p>
      </div>
    `;
  }

  const modal = document.createElement('div');
  modal.id = 'sabeelNotifHelpModal';
  modal.style.cssText = `
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.65); z-index: 10000;
    display: flex; align-items: center; justify-content: center; padding: 1.25rem;
    backdrop-filter: blur(4px); direction: rtl;
  `;

  modal.innerHTML = `
    <div style="background: var(--bg-secondary, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 16px; max-width: 480px; width: 100%; padding: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); animation: fadeIn 0.2s ease;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color, #e2e8f0); padding-bottom: 0.75rem;">
        <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary, #0f172a); margin: 0;">${title}</h3>
        <button id="btnCloseNotifHelpModal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted, #64748b); line-height: 1;">&times;</button>
      </div>
      <div style="margin-bottom: 1.5rem;">
        ${bodyContent}
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button id="btnNotifHelpGotIt" class="btn btn-primary" style="padding: 0.55rem 1.5rem; font-weight: 800; border-radius: 8px;">حسناً، فهمت</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('#btnCloseNotifHelpModal')?.addEventListener('click', closeModal);
  modal.querySelector('#btnNotifHelpGotIt')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

/**
 * Requests native browser Notification permissions or activates OneSignal in Median
 */
export async function requestBrowserNotificationPermission() {
  if (isMedianApp()) {
    // Inside Median Native Wrapper: Use OneSignal Native Push SDK directly
    await promptMedianPushPermission();
    Toast.success('تم تفعيل إشعارات التطبيق (OneSignal Push) بنجاح! 📲');
    return 'granted';
  }

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  if (!('Notification' in window)) {
    if (isIOS && !isStandalone) {
      showNotificationHelperModal({ isIOS: true });
      return 'unsupported_ios_browser';
    }
    Toast.info('متصفحك الحالي لا يدعم إشعارات المتصفح المنبثقة مباشرة.');
    showNotificationHelperModal({ isIOS: false });
    return 'unsupported';
  }

  try {
    if (Notification.permission === 'denied') {
      showNotificationHelperModal({ permission: 'denied', isIOS });
      Toast.warning('إذن الإشعارات محظور في إعدادات المتصفح.');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      Toast.success('تم تفعيل إشعارات المتصفح بنجاح! 🔔 ستصلك تنبيهات الحصص حتى عند إغلاق أو تصغير الصفحة.');
      
      // Register Service Worker for background dispatch (Normal browsers/PWA only)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {
          navigator.serviceWorker.register('/sw.js').catch(e => console.log('SW Registration fallback:', e));
        });
      }

      // Send a test welcome notification to confirm it's working
      setTimeout(() => {
        sendNativeNotification('أكاديمية سَبِيل 🔔', 'تم تفعيل التنبيهات الفورية بنجاح! ستصلك تنبيهات الحصص ومواعيد التسميع بدقة.');
      }, 500);

    } else if (permission === 'denied') {
      showNotificationHelperModal({ permission: 'denied', isIOS });
      Toast.warning('تم رفض إذن الإشعارات. يمكنك تفعيلها من إعدادات المتصفح.');
    }
    return permission;
  } catch (err) {
    console.error('Permission request error:', err);
    Toast.info('يرجى التحقق من إعدادات الإشعارات في متصفحك.');
    return 'error';
  }
}

/**
 * Triggers a native system browser notification with Web Push compatibility (Normal Browser / PWA only)
 */
export function sendNativeNotification(title, body, url = '/teacher/today-sessions.html', extraData = {}) {
  if (isMedianApp()) {
    // In Median, notifications are handled by OneSignal Native Push SDK
    return;
  }

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

let isCheckingReminders = false;

/**
 * Evaluates active session schedule:
 * 1. Alerts at session start time (حصة جارية الآن) without duplication.
 * 2. Pre-session reminders (15m before) for teacher/student.
 * 3. End of day unrecorded check (at/after 21:00) to alert admin once for missed sessions.
 */
export async function checkAndSendSessionReminders() {
  if (isCheckingReminders || document.hidden) return;
  const user = auth.currentUser;
  if (!user) return;

  isCheckingReminders = true;

  const now = new Date();
  const todayArabicDay = getArabicDayName(now);
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentHour = now.getHours();

  try {
    // 1. Get active students from dataStore or fallback to Firestore
    let activeStudents = [];
    const cachedStudents = dataStore.get('students');
    if (cachedStudents && cachedStudents.length > 0) {
      activeStudents = cachedStudents.filter(s => ["active", "approved", "مستمر"].includes(s.status));
    } else {
      const qStudents = query(
        collection(db, "students"),
        where("status", "in", ["active", "approved", "مستمر"])
      );
      const snap = await getDocs(qStudents);
      snap.forEach(d => activeStudents.push({ id: d.id, ...d.data() }));
    }

    if (activeStudents.length > 0) {
      for (const student of activeStudents) {

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
  } finally {
    isCheckingReminders = false;
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

    // Repeat check every 60 seconds for active sessions
    if (!window.__sessionReminderInterval) {
      window.__sessionReminderInterval = setInterval(() => {
        checkAndSendSessionReminders();
      }, 60000);
    }
  });
}

