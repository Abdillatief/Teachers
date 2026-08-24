// Helper utilities for Sabeel Academy

export function safeStringify(obj, space = null) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') return String(obj);
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'bigint') return value.toString();
      if (typeof value === 'symbol') return value.toString();
      if (typeof value === 'function') return '[Function]';
      if (typeof value === 'object' && value !== null) {
        if (value instanceof Error) {
          return { name: value.name, message: value.message, stack: value.stack };
        }
        if (typeof Node !== 'undefined' && value instanceof Node) {
          return `[DOMNode: ${value.nodeName || 'Element'}]`;
        }
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    }, space);
  } catch (err) {
    try {
      return String(obj);
    } catch {
      return '[Unserializable Object]';
    }
  }
}

if (typeof window !== 'undefined') {
  window.safeStringify = safeStringify;
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
 * Normalizes Arabic/English day string for uniform comparison.
 * @param {string} dayStr
 * @returns {string}
 */
export function normalizeArabicDay(dayStr) {
  if (!dayStr) return '';
  let str = String(dayStr).trim();
  
  // English to Arabic mapping
  const enMap = {
    'sunday': 'الاحد', 'sun': 'الاحد',
    'monday': 'الاثنين', 'mon': 'الاثنين',
    'tuesday': 'الثلاثاء', 'tue': 'الثلاثاء', 'tues': 'الثلاثاء',
    'wednesday': 'الاربعاء', 'wed': 'الاربعاء',
    'thursday': 'الخميس', 'thu': 'الخميس', 'thur': 'الخميس', 'thurs': 'الخميس',
    'friday': 'الجمعة', 'fri': 'الجمعة',
    'saturday': 'السبت', 'sat': 'السبت'
  };
  const lower = str.toLowerCase();
  if (enMap[lower]) {
    str = enMap[lower];
  }

  return str
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه');
}

/**
 * Extracts and normalizes an array of day strings from various data formats.
 * @param {*} rawDays - Array, comma-separated string, or single string
 * @returns {Array<string>}
 */
export function extractNormalizedDays(rawDays) {
  if (!rawDays) return [];
  let daysList = [];
  if (Array.isArray(rawDays)) {
    daysList = rawDays;
  } else if (typeof rawDays === 'string') {
    if (rawDays.includes(',') || rawDays.includes('،') || rawDays.includes('-') || rawDays.includes('|')) {
      daysList = rawDays.split(/[,،\-|]/).map(s => s.trim()).filter(Boolean);
    } else {
      daysList = [rawDays.trim()];
    }
  }
  return daysList.map(d => normalizeArabicDay(d)).filter(Boolean);
}

/**
 * Calculates projected / expected salary, hours, sessions and student revenue for a teacher for a given month
 * based on active students & groups in their schedule, assuming 100% attendance.
 * 
 * @param {Object} teacher - Teacher profile object containing rates
 * @param {Array} students - List of students assigned to teacher
 * @param {Array} groups - List of groups assigned to teacher
 * @param {string} [targetYearMonth] - Month string in "YYYY-MM" format (defaults to current month)
 * @param {Array} [sessions] - Optional sessions list to factor in trial sessions or recorded sessions
 * @returns {Object} Calculated expected salary and revenue metrics
 */
export function calculateExpectedTeacherSalary(teacher, students = [], groups = [], targetYearMonth = null, sessions = []) {
  const result = {
    expectedSalary: 0,
    expectedTotalHours: 0,
    expectedIndHours: 0,
    expectedGrpHours: 0,
    expectedSessionsCount: 0,
    expectedIndSessionsCount: 0,
    expectedGrpSessionsCount: 0,
    trialHours: 0,
    trialSessionsCount: 0,
    trialTeacherCost: 0,
    grossExpected: 0,
    bonuses: 0,
    deductions: 0,
    rateInd: 0,
    rateGrp: 0,
    projectedRevenue: 0,
    projectedIndRevenue: 0,
    projectedGrpRevenue: 0,
    expectedNetProfit: 0,
    profitMargin: 0,
    daysInMonthCount: 0,
    scheduledStudentsCount: 0,
    scheduledGroupsCount: 0,
    studentsDetails: [],
    groupsDetails: [],
    trialsDetails: []
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
  result.rateInd = rateInd;
  result.rateGrp = rateGrp;

  // 1. Individual Students
  (students || []).forEach(student => {
    if (!student) return;
    if (student.archived === true || student.status === 'archived' || student.status === 'Suspended' || student.status === 'suspended' || student.status === 'pending_approval' || student.status === 'inactive') {
      return;
    }
    if (student.subscriptionType === 'group' || student.groupId) {
      return; // Handled under group schedules
    }

    const rawDays = (student.schedule && student.schedule.days) ? student.schedule.days : (student.sessionDays || student.days || student.day || []);
    const scheduleDays = extractNormalizedDays(rawDays);
    if (scheduleDays.length === 0) return;

    const durationMins = parseFloat(student.sessionDuration || student.duration || (student.schedule && student.schedule.duration) || student.timeDuration || 60) || 60;
    const sessionHours = durationMins / 60;

    let studentSessionsInMonth = 0;
    scheduleDays.forEach(normDay => {
      if (dayOccurrences[normDay]) {
        studentSessionsInMonth += dayOccurrences[normDay];
      }
    });

    if (studentSessionsInMonth === 0) return;

    const studentTotalHours = studentSessionsInMonth * sessionHours;
    const studentTeacherCost = studentTotalHours * rateInd;

    // Student Revenue Estimation (Accurate Tuition/Collection based on pricing structure)
    let studentRev = 0;
    if (parseFloat(student.packagePrice) > 0) {
      studentRev = parseFloat(student.packagePrice);
    } else if (parseFloat(student.subscriptionPrice) > 0) {
      studentRev = parseFloat(student.subscriptionPrice);
    } else if (parseFloat(student.monthlyFee) > 0) {
      studentRev = parseFloat(student.monthlyFee);
    } else if (parseFloat(student.pricePerSession) > 0) {
      studentRev = parseFloat(student.pricePerSession) * studentSessionsInMonth;
    } else if (parseFloat(student.pricePerHour) > 0) {
      studentRev = parseFloat(student.pricePerHour) * studentTotalHours;
    } else if (parseFloat(student.price) > 0) {
      studentRev = parseFloat(student.price);
    } else {
      // Default standard student fee per hour (higher than teacher wage, approx 160 EGP/hr)
      studentRev = studentTotalHours * Math.max(160, rateInd * 1.5);
    }

    result.expectedIndSessionsCount += studentSessionsInMonth;
    result.expectedIndHours += studentTotalHours;
    result.projectedIndRevenue += studentRev;
    result.scheduledStudentsCount++;

    result.studentsDetails.push({
      id: student.id || student.uid,
      name: student.name || 'طالب',
      type: 'individual',
      sessionsCount: studentSessionsInMonth,
      totalHours: studentTotalHours,
      teacherCost: studentTeacherCost,
      revenue: studentRev,
      netProfit: studentRev - studentTeacherCost,
      durationMins: durationMins,
      scheduleDays: scheduleDays
    });
  });

  // 2. Groups
  (groups || []).forEach(group => {
    if (!group || group.status === 'archived' || group.archived === true) return;

    const rawDays = group.day ? [group.day] : (group.days || []);
    const grpDays = extractNormalizedDays(rawDays);
    if (grpDays.length === 0) return;

    const durationMins = parseFloat(group.duration || 60) || 60;
    const sessionHours = durationMins / 60;

    let groupSessionsInMonth = 0;
    grpDays.forEach(normDay => {
      if (dayOccurrences[normDay]) {
        groupSessionsInMonth += dayOccurrences[normDay];
      }
    });

    if (groupSessionsInMonth === 0) return;

    const groupTotalHours = groupSessionsInMonth * sessionHours;
    const groupTeacherCost = groupTotalHours * rateGrp; // Paid per session duration to teacher

    // Group Revenue Estimation
    const memberCount = Array.isArray(group.students) ? group.students.length : (parseInt(group.studentsCount) || 1);
    const pricePerStudent = parseFloat(group.pricePerStudent || group.pricePerSession || group.studentPrice || 60);
    
    let groupRev = 0;
    if (parseFloat(group.monthlyFee) > 0) {
      groupRev = parseFloat(group.monthlyFee);
    } else if (parseFloat(group.price) > 0) {
      groupRev = parseFloat(group.price) * Math.max(1, memberCount);
    } else if (parseFloat(group.packagePrice) > 0) {
      groupRev = parseFloat(group.packagePrice) * Math.max(1, memberCount);
    } else {
      groupRev = pricePerStudent * Math.max(1, memberCount) * groupSessionsInMonth;
    }

    result.expectedGrpSessionsCount += groupSessionsInMonth;
    result.expectedGrpHours += groupTotalHours;
    result.projectedGrpRevenue += groupRev;
    result.scheduledGroupsCount++;

    result.groupsDetails.push({
      id: group.id,
      name: group.name || 'مجموعة جماعية',
      type: 'group',
      memberCount: memberCount,
      sessionsCount: groupSessionsInMonth,
      totalHours: groupTotalHours,
      teacherCost: groupTeacherCost,
      revenue: groupRev,
      netProfit: groupRev - groupTeacherCost,
      durationMins: durationMins,
      scheduleDays: grpDays
    });
  });

  // 2.5. Direct Teacher weeklySchedule (if configured directly on teacher doc and not already accounted for)
  if (Array.isArray(teacher.weeklySchedule) && teacher.weeklySchedule.length > 0) {
    teacher.weeklySchedule.forEach(slot => {
      if (!slot) return;
      // Skip if this slot references an already calculated student or group
      if (slot.studentId && (students || []).some(s => (s.id === slot.studentId || s.uid === slot.studentId))) return;
      if (slot.groupId && (groups || []).some(g => g.id === slot.groupId)) return;

      const rawDays = slot.day ? [slot.day] : (slot.days || []);
      const slotDays = extractNormalizedDays(rawDays);
      if (slotDays.length === 0) return;

      const durationMins = parseFloat(slot.duration || slot.durationMins || 60) || 60;
      const sessionHours = durationMins / 60;
      const isGroup = slot.isGroup === true || slot.type === 'group';
      const rate = isGroup ? rateGrp : rateInd;

      let occurrencesInMonth = 0;
      slotDays.forEach(normDay => {
        if (dayOccurrences[normDay]) {
          occurrencesInMonth += dayOccurrences[normDay];
        }
      });

      if (occurrencesInMonth === 0) return;

      const totalHours = occurrencesInMonth * sessionHours;
      const teacherCost = totalHours * rate;

      if (isGroup) {
        result.expectedGrpSessionsCount += occurrencesInMonth;
        result.expectedGrpHours += totalHours;
        result.scheduledGroupsCount++;
        result.groupsDetails.push({
          id: slot.id || 'slot_grp',
          name: slot.name || slot.title || 'مجموعة مجدولة',
          type: 'group',
          sessionsCount: occurrencesInMonth,
          totalHours: totalHours,
          teacherCost: teacherCost,
          durationMins: durationMins,
          scheduleDays: slotDays
        });
      } else {
        result.expectedIndSessionsCount += occurrencesInMonth;
        result.expectedIndHours += totalHours;
        result.scheduledStudentsCount++;
        result.studentsDetails.push({
          id: slot.id || slot.studentId || 'slot_ind',
          name: slot.studentName || slot.name || slot.title || 'طالب مجدول',
          type: 'individual',
          sessionsCount: occurrencesInMonth,
          totalHours: totalHours,
          teacherCost: teacherCost,
          durationMins: durationMins,
          scheduleDays: slotDays
        });
      }
    });
  }

  // 3. Trial Sessions for this teacher in the month (strictly integrated with sessions archive as explicit exception)
  const teacherId = teacher.id || teacher.uid;
  if (Array.isArray(sessions) && sessions.length > 0 && teacherId) {
    sessions.forEach(s => {
      // Match teacher by ID, UID, Name or Email
      const matchesTeacher = s.teacherId === teacherId ||
        s.teacherUid === teacherId ||
        (s.teacherName && teacher.name && s.teacherName.trim().toLowerCase() === teacher.name.trim().toLowerCase()) ||
        (s.teacherEmail && teacher.email && s.teacherEmail.trim().toLowerCase() === teacher.email.trim().toLowerCase());

      if (!matchesTeacher) return;
      if (!s.date || !s.date.startsWith(yearMonth)) return;
      
      const isTrial = s.type === 'trial' ||
        s.sessionType === 'trial' ||
        s.isTrial === true ||
        s.status === 'trial' ||
        s.trialStatus != null ||
        (typeof s.type === 'string' && (s.type.includes('trial') || s.type.includes('تجريب'))) ||
        (typeof s.sessionType === 'string' && (s.sessionType.includes('trial') || s.sessionType.includes('تجريب')));

      if (!isTrial) return;

      const durMins = parseFloat(s.duration || 60) || 60;
      const durHours = durMins / 60;
      const cost = durHours * rateInd;

      result.trialSessionsCount++;
      result.trialHours += durHours;
      result.trialTeacherCost += cost;

      result.trialsDetails.push({
        id: s.id,
        date: s.date,
        time: s.time || s.sessionTime || '',
        studentName: s.studentName || s.trialStudentName || 'طالب تجريبي',
        durationMins: durMins,
        durationHours: durHours,
        teacherCost: cost,
        status: s.status || 'completed',
        absenceType: s.absenceType || '',
        approved: s.approved === true,
        isArchiveException: true,
        notes: s.notes || ''
      });
    });
  }

  result.expectedSessionsCount = result.expectedIndSessionsCount + result.expectedGrpSessionsCount;
  result.expectedTotalHours = result.expectedIndHours + result.expectedGrpHours;

  const bonuses = parseFloat(teacher.salaryBonuses || 0);
  const deductions = parseFloat(teacher.salaryDeductions || 0);
  result.bonuses = bonuses;
  result.deductions = deductions;

  // المرتب المتوقع الأساسي مبني تماماً وبدقة على الساعات المتوقع أن يدرسها المعلم وفقاً لجداول طلابه ومجموعاته
  const grossExpected = (result.expectedIndHours * rateInd) + (result.expectedGrpHours * rateGrp);
  result.grossExpected = grossExpected;
  result.expectedSalary = Math.max(0, grossExpected + bonuses - deductions);

  // إجمالي المستحقات شامل الحصص التجريبية المنفذة إن وجدت (مستقلة ومفصولة)
  result.totalWithTrials = result.expectedSalary + result.trialTeacherCost;

  result.projectedRevenue = result.projectedIndRevenue + result.projectedGrpRevenue;
  result.expectedNetProfit = result.projectedRevenue - result.expectedSalary;
  result.profitMargin = result.projectedRevenue > 0 ? (result.expectedNetProfit / result.projectedRevenue) * 100 : 0;

  return result;
}

/**
 * Calculates academy-wide financial earnings, revenue, expected payroll and net profit for a given month.
 * Strictly mirrors the Payments system revenue logic and archives trial sessions as explicit exceptions.
 * @param {Array} teachers - List of teachers
 * @param {Array} students - List of students
 * @param {Array} groups - List of groups
 * @param {Array} sessions - List of sessions from archive for the month
 * @param {Array} payments - List of payment receipts for the month
 * @param {string} targetYearMonth - "YYYY-MM"
 * @param {Array} subscriptions - List of subscriptions (source of truth for payments expected revenue)
 * @returns {Object} Academy earnings analytics
 */
export function calculateAcademyEarningsOverview(teachers = [], students = [], groups = [], sessions = [], payments = [], targetYearMonth = null, subscriptions = []) {
  const currentYm = targetYearMonth || new Date().toISOString().substring(0, 7);

  const overview = {
    targetYearMonth: currentYm,
    totalExpectedSalary: 0,
    totalApprovedSalary: 0,
    totalProjectedRevenue: 0,
    totalRealizedRevenue: 0,
    totalExpectedNetProfit: 0,
    totalRealizedNetProfit: 0,
    expectedProfitMargin: 0,
    realizedProfitMargin: 0,
    totalExpectedHours: 0,
    totalExpectedIndHours: 0,
    totalExpectedGrpHours: 0,
    totalExpectedSessions: 0,
    totalApprovedSessions: 0,
    totalApprovedHours: 0,
    teachersCount: 0,
    activeStudentsCount: 0,
    activeGroupsCount: 0,
    expectedRevenueSource: 'schedules',
    subscriptionsCount: 0,
    teachersBreakdown: [],
    itemsBreakdown: [],
    trialStats: {
      totalCount: 0,
      completedCount: 0,
      delayedOrAbsentCount: 0,
      totalHours: 0,
      totalTeacherCost: 0,
      convertedCount: 0,
      conversionRate: 0,
      sessions: []
    }
  };

  // 1. Realized Revenue from payments collection in target month
  (payments || []).forEach(p => {
    const pMonth = p.month || (p.paymentDate ? String(p.paymentDate).substring(0, 7) : '');
    if (pMonth === currentYm) {
      overview.totalRealizedRevenue += (parseFloat(p.amount) || 0);
    }
  });

  // 2. Extract and Process Trial Sessions from the session archive as explicit exceptions
  const activeStudentNamesSet = new Set(
    (students || [])
      .filter(s => s.status !== 'archived' && s.status !== 'trial' && s.status !== 'pending_trial')
      .map(s => (s.name || '').trim().toLowerCase())
      .filter(Boolean)
  );

  (sessions || []).forEach(s => {
    if (!s.date || !s.date.startsWith(currentYm)) return;

    const isTrial = s.type === 'trial' ||
      s.sessionType === 'trial' ||
      s.isTrial === true ||
      s.status === 'trial' ||
      s.trialStatus != null ||
      (typeof s.type === 'string' && (s.type.includes('trial') || s.type.includes('تجريب'))) ||
      (typeof s.sessionType === 'string' && (s.sessionType.includes('trial') || s.sessionType.includes('تجريب')));

    if (isTrial) {
      const durMins = parseFloat(s.duration || 60) || 60;
      const durHours = durMins / 60;

      // Find matching teacher
      const t = teachers.find(teach => 
        teach.id === s.teacherId || 
        teach.uid === s.teacherId ||
        (teach.name && s.teacherName && teach.name.trim().toLowerCase() === s.teacherName.trim().toLowerCase())
      );
      const rate = t ? parseFloat(t.hourlyRateIndividual || t.hourlyRate || 100) : 100;
      const teacherCost = durHours * rate;

      const stdName = (s.studentName || s.trialStudentName || 'طالب تجريبي').trim();
      const isConverted = activeStudentNamesSet.has(stdName.toLowerCase());

      overview.trialStats.totalCount++;
      overview.trialStats.totalHours += durHours;
      overview.trialStats.totalTeacherCost += teacherCost;

      if (s.status === 'completed') {
        overview.trialStats.completedCount++;
      } else {
        overview.trialStats.delayedOrAbsentCount++;
      }

      if (isConverted) {
        overview.trialStats.convertedCount++;
      }

      overview.trialStats.sessions.push({
        id: s.id,
        date: s.date,
        time: s.time || s.sessionTime || '',
        studentName: stdName,
        teacherId: s.teacherId,
        teacherName: t ? (t.name || 'معلم') : (s.teacherName || 'معلم'),
        durationMins: durMins,
        durationHours: durHours,
        teacherCost: teacherCost,
        status: s.status || 'completed',
        absenceType: s.absenceType || '',
        approved: s.approved === true,
        isConverted: isConverted,
        isArchiveException: true,
        notes: s.notes || s.evaluationNotes || s.curriculumCompleted || ''
      });

      // Add trial session to items breakdown as an archive exception item
      overview.itemsBreakdown.push({
        id: s.id,
        name: `${stdName} (استثناء: حصة تجريبية)`,
        type: 'trial',
        isTrialException: true,
        memberCount: 1,
        sessionsCount: 1,
        totalHours: durHours,
        teacherCost: teacherCost,
        revenue: 0,
        netProfit: -teacherCost,
        durationMins: durMins,
        scheduleDays: [s.date],
        teacherId: s.teacherId,
        teacherName: t ? (t.name || 'معلم') : (s.teacherName || 'معلم')
      });
    }
  });

  overview.trialStats.conversionRate = overview.trialStats.totalCount > 0
    ? Math.round((overview.trialStats.convertedCount / overview.trialStats.totalCount) * 100)
    : 0;

  // 3. Realized Approved Sessions & Payroll so far
  const processedSessions = new Set();
  (sessions || []).forEach(s => {
    if (!s.date || !s.date.startsWith(currentYm)) return;
    if (s.isStudentRecordOnly === true || s.isSalaryRecord === false) return;

    const gId = s.groupSessionId || s.groupBatchId;
    const isGroup = s.type === "group" || s.sessionType === "group";
    if (isGroup && gId) {
      if (processedSessions.has(gId)) return;
      processedSessions.add(gId);
    }

    if (s.approved === true && (s.status === "completed" || (s.status === "student_absent" && s.absenceType === "unexcused"))) {
      const durHours = (parseFloat(s.duration) || 0) / 60;
      overview.totalApprovedSessions++;
      overview.totalApprovedHours += durHours;

      // Find teacher rate
      const t = teachers.find(teach => (teach.id === s.teacherId || teach.uid === s.teacherId));
      let rate = 100;
      if (t) {
        rate = isGroup ? parseFloat(t.hourlyRateGroup || t.hourlyRateIndividual || t.hourlyRate || 120) : parseFloat(t.hourlyRateIndividual || t.hourlyRate || 100);
      }
      overview.totalApprovedSalary += durHours * rate;
    }
  });

  // 4. Expected Revenue: Mirror the Payments Page logic (subscriptions collection for target month)
  let expectedRevenueFromSubs = 0;
  let hasMatchingSubs = false;

  if (Array.isArray(subscriptions) && subscriptions.length > 0) {
    const currentMonthSubs = subscriptions.filter(s => {
      const subMonth = s.month || (s.startDate ? String(s.startDate).substring(0, 7) : currentYm);
      return subMonth === currentYm && s.status !== 'cancelled';
    });

    if (currentMonthSubs.length > 0) {
      hasMatchingSubs = true;
      overview.subscriptionsCount = currentMonthSubs.length;
      overview.expectedRevenueSource = 'subscriptions';
      expectedRevenueFromSubs = currentMonthSubs.reduce((sum, s) => {
        const price = parseFloat(s.price) || 0;
        const discount = parseFloat(s.discount) || 0;
        const total = (parseFloat(s.totalAmount) >= 0 && s.totalAmount !== undefined)
          ? parseFloat(s.totalAmount)
          : Math.max(0, price - discount);
        return sum + total;
      }, 0);
    }
  }

  // 5. Teachers Forecast Breakdown
  let totalSchedulesProjectedRevenue = 0;

  teachers.forEach(teacher => {
    const tId = teacher.id || teacher.uid;
    const tStudents = students.filter(std => (std.teacherId === tId || std.teacherUid === tId));
    const tGroups = groups.filter(grp => (grp.teacherId === tId || grp.teacherUid === tId));

    const tForecast = calculateExpectedTeacherSalary(teacher, tStudents, tGroups, currentYm, sessions);

    // Calculate this teacher's approved salary so far in this month
    let tApprovedSalary = 0;
    let tApprovedHours = 0;
    let tApprovedSessions = 0;
    const tProcessedSessions = new Set();

    (sessions || []).forEach(s => {
      const matchesTeacher = s.teacherId === tId || s.teacherUid === tId || (s.teacherName && teacher.name && s.teacherName.trim().toLowerCase() === teacher.name.trim().toLowerCase());
      if (!matchesTeacher || !s.date || !s.date.startsWith(currentYm)) return;
      if (s.isStudentRecordOnly === true || s.isSalaryRecord === false) return;

      const gId = s.groupSessionId || s.groupBatchId;
      const isGroup = s.type === "group" || s.sessionType === "group";
      if (isGroup && gId) {
        if (tProcessedSessions.has(gId)) return;
        tProcessedSessions.add(gId);
      }

      if (s.approved === true && (s.status === "completed" || (s.status === "student_absent" && s.absenceType === "unexcused"))) {
        const durHours = (parseFloat(s.duration) || 0) / 60;
        tApprovedSessions++;
        tApprovedHours += durHours;
        const rate = isGroup ? tForecast.rateGrp : tForecast.rateInd;
        tApprovedSalary += durHours * rate;
      }
    });

    overview.totalExpectedSalary += tForecast.expectedSalary;
    totalSchedulesProjectedRevenue += tForecast.projectedRevenue;
    overview.totalExpectedHours += tForecast.expectedTotalHours;
    overview.totalExpectedIndHours += tForecast.expectedIndHours;
    overview.totalExpectedGrpHours += tForecast.expectedGrpHours;
    overview.totalExpectedSessions += tForecast.expectedSessionsCount;
    overview.teachersCount++;

    overview.teachersBreakdown.push({
      teacherId: tId,
      teacherName: teacher.name || 'معلم',
      teacherEmail: teacher.email || '',
      teacherPhone: teacher.phone || '',
      rateInd: tForecast.rateInd,
      rateGrp: tForecast.rateGrp,
      studentsCount: tForecast.scheduledStudentsCount,
      groupsCount: tForecast.scheduledGroupsCount,
      expectedTotalHours: tForecast.expectedTotalHours,
      expectedIndHours: tForecast.expectedIndHours,
      expectedGrpHours: tForecast.expectedGrpHours,
      expectedSessionsCount: tForecast.expectedSessionsCount,
      trialHours: tForecast.trialHours,
      trialSessionsCount: tForecast.trialSessionsCount,
      trialTeacherCost: tForecast.trialTeacherCost,
      expectedSalary: tForecast.expectedSalary,
      approvedSalary: tApprovedSalary,
      approvedHours: tApprovedHours,
      approvedSessions: tApprovedSessions,
      projectedRevenue: tForecast.projectedRevenue,
      expectedNetProfit: tForecast.expectedNetProfit,
      profitMargin: tForecast.profitMargin,
      studentsDetails: tForecast.studentsDetails,
      groupsDetails: tForecast.groupsDetails,
      trialsDetails: tForecast.trialsDetails
    });

    // Append scheduled items to breakdown
    tForecast.studentsDetails.forEach(stdItem => {
      overview.itemsBreakdown.push({
        ...stdItem,
        teacherId: tId,
        teacherName: teacher.name || 'معلم'
      });
    });

    tForecast.groupsDetails.forEach(grpItem => {
      overview.itemsBreakdown.push({
        ...grpItem,
        teacherId: tId,
        teacherName: teacher.name || 'معلم'
      });
    });
  });

  // If subscriptions exist for target month, sync totalProjectedRevenue to match Payments page
  if (hasMatchingSubs) {
    overview.totalProjectedRevenue = expectedRevenueFromSubs;
  } else {
    overview.totalProjectedRevenue = totalSchedulesProjectedRevenue;
  }

  overview.activeStudentsCount = students.filter(s => s.status !== 'archived' && s.status !== 'Suspended').length;
  overview.activeGroupsCount = groups.filter(g => g.status !== 'archived').length;

  overview.totalExpectedNetProfit = overview.totalProjectedRevenue - overview.totalExpectedSalary;
  overview.totalRealizedNetProfit = overview.totalRealizedRevenue - overview.totalApprovedSalary;

  overview.expectedProfitMargin = overview.totalProjectedRevenue > 0
    ? (overview.totalExpectedNetProfit / overview.totalProjectedRevenue) * 100
    : 0;

  overview.realizedProfitMargin = overview.totalRealizedRevenue > 0
    ? (overview.totalRealizedNetProfit / overview.totalRealizedRevenue) * 100
    : 0;

  // Sort teachers by profit descending
  overview.teachersBreakdown.sort((a, b) => b.expectedNetProfit - a.expectedNetProfit);

  return overview;
}





