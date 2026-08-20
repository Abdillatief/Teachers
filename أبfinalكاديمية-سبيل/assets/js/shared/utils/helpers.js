// Helper utilities for Sabeel Academy

export function safeStringify(obj, space = null) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') return String(obj);
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    }, space);
  } catch (err) {
    return String(obj);
  }
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP'
  }).format(amount);
}

export function formatDate(dateObjOrString) {
  if (!dateObjOrString) return '';
  const date = dateObjOrString.seconds 
    ? new Date(dateObjOrString.seconds * 1000) 
    : new Date(dateObjOrString);
  return date.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatTime(dateObjOrString) {
  if (!dateObjOrString) return '';
  const date = dateObjOrString.seconds 
    ? new Date(dateObjOrString.seconds * 1000) 
    : new Date(dateObjOrString);
  return date.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDateTime(dateObjOrString) {
  if (!dateObjOrString) return '';
  const date = dateObjOrString.seconds 
    ? new Date(dateObjOrString.seconds * 1000) 
    : new Date(dateObjOrString);
  return date.toLocaleString('ar-EG');
}

/**
 * Calculates advanced teacher salary based on sessions and rate parameters.
 * @param {Array} sessions - List of session logs
 * @param {Object} teacher - Teacher profile containing rates
 * @param {string} rangeType - 'month' or 'all'
 */
export function calculateTeacherSalaryAdvanced(sessions, teacher, rangeType = 'all') {
  const result = {
    salary: 0,
    individualHours: 0,
    groupHours: 0,
    totalHours: 0
  };

  if (!teacher) return result;

  const currentYearMonth = new Date().toISOString().substring(0, 7);
  const processedGroupSessions = new Set();

  sessions.forEach(session => {
    // Skip student-only attendance records from group sessions (they are for student stats only)
    if (session.isStudentRecordOnly === true || session.isSalaryRecord === false) {
      return;
    }

    // Deduplicate group sessions by groupSessionId / groupBatchId so a group session is counted once only
    const gId = session.groupSessionId || session.groupBatchId;
    const isGroup = session.type === "group" || session.sessionType === "group";
    
    if (isGroup && gId) {
      if (processedGroupSessions.has(gId)) {
        return; // Skip duplicate group session row
      }
      processedGroupSessions.add(gId);
    }

    // Range filter
    if (rangeType === 'month' && (!session.date || !session.date.startsWith(currentYearMonth))) {
      return;
    }

    if (session.archived === true || session.paid === true) {
      return;
    }

    if (session.type === "trial" && (session.approved !== true || session.trialSubscribed !== true)) {
      return;
    }

    const isCompleted = session.status === "completed";
    const isUnexcusedAbsent = session.status === "student_absent" && session.absenceType === "unexcused";
    const isApproved = session.approved === true;

    if (isApproved && (isCompleted || isUnexcusedAbsent)) {
      const duration = parseInt(session.duration) || 0;
      const hours = duration / 60;

      let rate = 0;
      if (isGroup) {
        rate = parseFloat(teacher.hourlyRateGroup || teacher.hourlyRateIndividual || teacher.hourlyRate || 120);
        result.groupHours += hours;
      } else {
        rate = parseFloat(teacher.hourlyRateIndividual || teacher.hourlyRate || 100);
        result.individualHours += hours;
      }

      result.totalHours += hours;
      result.salary += hours * rate;
    }
  });

  return result;
}

/**
 * Aggregates monthly salary history across all sessions.
 * @param {Array} sessions - List of sessions
 * @param {Object} teacher - Teacher profile containing rates
 * @returns {Array} List of monthly records sorted by month descending
 */
export function aggregateMonthlySalaryHistory(sessions, teacher) {
  if (!sessions || !teacher) return [];

  const groups = {};
  const processedGroupSessions = new Set();

  sessions.forEach(session => {
    if (!session.date) return;
    if (session.isStudentRecordOnly === true || session.isSalaryRecord === false) return;

    const gId = session.groupSessionId || session.groupBatchId;
    const isGroup = session.type === "group" || session.sessionType === "group";

    if (isGroup && gId) {
      if (processedGroupSessions.has(gId)) return;
      processedGroupSessions.add(gId);
    }

    if (session.archived === true || session.paid === true) return;
    if (session.type === "trial" && (session.approved !== true || session.trialSubscribed !== true)) return;
    const yearMonth = session.date.substring(0, 7); // "YYYY-MM"

    const isCompleted = session.status === "completed";
    const isUnexcusedAbsent = session.status === "student_absent" && session.absenceType === "unexcused";
    const isApproved = session.approved === true;

    if (isApproved && (isCompleted || isUnexcusedAbsent)) {
      if (!groups[yearMonth]) {
        groups[yearMonth] = {
          yearMonth,
          hours: 0,
          salary: 0
        };
      }

      const duration = parseInt(session.duration) || 0;
      const hours = duration / 60;

      let rate = 0;
      if (isGroup) {
        rate = parseFloat(teacher.hourlyRateGroup || teacher.hourlyRateIndividual || teacher.hourlyRate || 120);
      } else {
        rate = parseFloat(teacher.hourlyRateIndividual || teacher.hourlyRate || 100);
      }

      groups[yearMonth].hours += hours;
      groups[yearMonth].salary += hours * rate;
    }
  });

  return Object.values(groups).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
}

/**
 * Animates a numeric counter within a string, preserving any leading/trailing non-numeric characters.
 * @param {string|HTMLElement} elementId - ID of element or element itself
 * @param {string} targetString - The final formatted string
 */
export function animateTextCounter(elementId, targetString) {
  const el = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
  if (!el) return;
  
  const match = targetString.match(/^([\s\S]*?)([0-9]+(?:\.[0-9]+)?)([\s\S]*)$/);
  if (!match) {
    el.textContent = targetString;
    return;
  }
  
  const prefix = match[1] || '';
  const numberStr = match[2];
  const suffix = match[3] || '';
  const endValue = parseFloat(numberStr) || 0;
  
  let decimalPlaces = 0;
  if (numberStr.includes('.')) {
    const parts = numberStr.split('.');
    decimalPlaces = parts[1] ? parts[1].length : 2;
  }
  
  const startValue = el._currentVal !== undefined ? el._currentVal : 0;
  
  const duration = 800; // 800ms
  const startTime = performance.now();
  
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out quad
    const ease = progress * (2 - progress);
    const current = startValue + (endValue - startValue) * ease;
    
    el.textContent = prefix + current.toFixed(decimalPlaces) + suffix;
    
    if (progress < 1) {
      el._animationFrame = requestAnimationFrame(update);
    } else {
      el.textContent = targetString;
      el._currentVal = endValue;
    }
  }
  
  if (el._animationFrame) {
    cancelAnimationFrame(el._animationFrame);
  }
  
  el._animationFrame = requestAnimationFrame(update);
}

/**
 * Shows a beautiful custom confirmation modal in pure HTML to avoid browser blocks in iframes.
 * @param {string} message - Message to display
 * @param {function} onConfirm - Callback on confirm
 * @param {function} [onCancel] - Optional callback on cancel
 */
export function showCustomConfirm(message, onConfirm = null, onCancel = null) {
  return new Promise((resolve) => {
    // Remove existing if any
    const existingConfirm = document.getElementById('custom-confirm-modal');
    if (existingConfirm) {
      existingConfirm.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'custom-confirm-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
      font-family: inherit;
    `;

    modal.innerHTML = `
      <div style="
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        padding: 1.5rem;
        width: 90%;
        max-width: 380px;
        box-shadow: var(--shadow-xl);
        text-align: center;
        transform: scale(0.95);
        transition: transform 0.2s ease;
        direction: rtl;
      ">
        <div style="background: var(--danger-light); color: var(--danger); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; border: 1px solid var(--danger-border);">
          <i data-lucide="alert-triangle" style="width: 22px; height: 22px;"></i>
        </div>
        <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">تأكيد الإجراء</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.25rem;">${message}</p>
        <div style="display: flex; gap: 0.65rem; justify-content: center;">
          <button id="custom-confirm-ok" class="btn btn-danger" style="flex: 1;">تأكيد</button>
          <button id="custom-confirm-cancel" class="btn btn-secondary" style="flex: 1;">إلغاء</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Trigger Lucide Icons
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Animate in
    setTimeout(() => {
      modal.style.opacity = '1';
      modal.firstElementChild.style.transform = 'scale(1)';
    }, 10);

    const close = () => {
      modal.style.opacity = '0';
      modal.firstElementChild.style.transform = 'scale(0.9)';
      setTimeout(() => {
        modal.remove();
      }, 300);
    };

    modal.querySelector('#custom-confirm-ok').onclick = () => {
      close();
      if (onConfirm) onConfirm();
      resolve(true);
    };

    modal.querySelector('#custom-confirm-cancel').onclick = () => {
      close();
      if (onCancel) onCancel();
      resolve(false);
    };

    // Close when clicking outside card
    modal.onclick = (e) => {
      if (e.target === modal) {
        close();
        if (onCancel) onCancel();
        resolve(false);
      }
    };
  });
}

/**
 * Normalizes Arabic day string for uniform comparison.
 * @param {string} dayStr
 * @returns {string}
 */
export function normalizeArabicDay(dayStr) {
  if (!dayStr) return '';
  return String(dayStr)
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه');
}

/**
 * Calculates projected / expected salary and hours for a teacher for a given month
 * based on the active students & groups in their schedule, assuming 100% attendance.
 * 
 * @param {Object} teacher - Teacher profile object containing rates
 * @param {Array} students - List of students assigned to teacher
 * @param {Array} groups - List of groups assigned to teacher
 * @param {string} [targetYearMonth] - Month string in "YYYY-MM" format (defaults to current month)
 * @returns {Object} Calculated expected salary metrics
 */
export function calculateExpectedTeacherSalary(teacher, students = [], groups = [], targetYearMonth = null) {
  const result = {
    expectedSalary: 0,
    expectedTotalHours: 0,
    expectedIndHours: 0,
    expectedGrpHours: 0,
    expectedSessionsCount: 0,
    expectedIndSessionsCount: 0,
    expectedGrpSessionsCount: 0,
    daysInMonthCount: 0
  };

  if (!teacher) return result;

  const yearMonth = targetYearMonth || new Date().toISOString().substring(0, 7);
  const parts = yearMonth.split('-');
  const year = parseInt(parts[0], 10);
  const monthIndex = parseInt(parts[1], 10) - 1; // 0-indexed

  if (isNaN(year) || isNaN(monthIndex)) return result;

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  result.daysInMonthCount = daysInMonth;

  const arabicDaysMap = {
    0: normalizeArabicDay("الأحد"),
    1: normalizeArabicDay("الاثنين"),
    2: normalizeArabicDay("الثلاثاء"),
    3: normalizeArabicDay("الأربعاء"),
    4: normalizeArabicDay("الخميس"),
    5: normalizeArabicDay("الجمعة"),
    6: normalizeArabicDay("السبت")
  };

  const dayOccurrences = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, monthIndex, d);
    const dayOfWeek = date.getDay();
    const normalizedDay = arabicDaysMap[dayOfWeek];
    if (normalizedDay) {
      dayOccurrences[normalizedDay] = (dayOccurrences[normalizedDay] || 0) + 1;
    }
  }

  const rateInd = parseFloat(teacher.hourlyRateIndividual || teacher.hourlyRate || 100);
  const rateGrp = parseFloat(teacher.hourlyRateGroup || teacher.hourlyRateIndividual || teacher.hourlyRate || 120);

  // 1. Individual Students
  (students || []).forEach(student => {
    if (!student) return;
    if (student.archived === true || student.status === 'archived' || student.status === 'Suspended' || student.status === 'suspended' || student.status === 'pending_approval') {
      return;
    }
    if (student.subscriptionType === 'group' || student.groupId) {
      return; // Included under group schedules
    }

    const scheduleDays = (student.schedule && student.schedule.days) ? student.schedule.days : (student.sessionDays || student.days || []);
    if (!Array.isArray(scheduleDays) || scheduleDays.length === 0) return;

    const durationMins = parseFloat(student.sessionDuration || student.duration || student.timeDuration || 60) || 60;
    const sessionHours = durationMins / 60;

    let studentSessionsInMonth = 0;
    scheduleDays.forEach(dayStr => {
      const normDay = normalizeArabicDay(dayStr);
      if (dayOccurrences[normDay]) {
        studentSessionsInMonth += dayOccurrences[normDay];
      }
    });

    const studentTotalHours = studentSessionsInMonth * sessionHours;
    result.expectedIndSessionsCount += studentSessionsInMonth;
    result.expectedIndHours += studentTotalHours;
  });

  // 2. Groups
  (groups || []).forEach(group => {
    if (!group || group.status === 'archived') return;

    const grpDays = group.day ? [group.day] : (group.days || []);
    if (!Array.isArray(grpDays) || grpDays.length === 0) return;

    const durationMins = parseFloat(group.duration || 60) || 60;
    const sessionHours = durationMins / 60;

    let groupSessionsInMonth = 0;
    grpDays.forEach(dayStr => {
      const normDay = normalizeArabicDay(dayStr);
      if (dayOccurrences[normDay]) {
        groupSessionsInMonth += dayOccurrences[normDay];
      }
    });

    const groupTotalHours = groupSessionsInMonth * sessionHours;
    result.expectedGrpSessionsCount += groupSessionsInMonth;
    result.expectedGrpHours += groupTotalHours;
  });

  result.expectedSessionsCount = result.expectedIndSessionsCount + result.expectedGrpSessionsCount;
  result.expectedTotalHours = result.expectedIndHours + result.expectedGrpHours;

  const bonuses = parseFloat(teacher.salaryBonuses || 0);
  const deductions = parseFloat(teacher.salaryDeductions || 0);

  const grossExpected = (result.expectedIndHours * rateInd) + (result.expectedGrpHours * rateGrp);
  result.expectedSalary = grossExpected + bonuses - deductions;

  return result;
}




