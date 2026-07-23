// Helper utilities for Sabeel Academy

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

  sessions.forEach(session => {
    // Range filter
    if (rangeType === 'month' && (!session.date || !session.date.startsWith(currentYearMonth))) {
      return;
    }

    if (session.archived === true || session.paid === true) {
      return;
    }

    const isCompleted = session.status === "completed";
    const isUnexcusedAbsent = session.status === "student_absent" && session.absenceType === "unexcused";
    const isApproved = session.approved === true;

    if (isApproved && (isCompleted || isUnexcusedAbsent)) {
      const duration = parseInt(session.duration) || 0;
      const hours = duration / 60;

      let rate = 0;
      if (session.type === "group") {
        rate = teacher.hourlyRateGroup || teacher.hourlyRate || 120;
        result.groupHours += hours;
      } else {
        rate = teacher.hourlyRateIndividual || teacher.hourlyRate || 100;
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

  sessions.forEach(session => {
    if (!session.date) return;
    if (session.archived === true || session.paid === true) return;
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
      if (session.type === "group") {
        rate = teacher.hourlyRateGroup || teacher.hourlyRate || 120;
      } else {
        rate = teacher.hourlyRateIndividual || teacher.hourlyRate || 100;
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
export function showCustomConfirm(message, onConfirm, onCancel = null) {
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
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 14px;
      padding: 1.75rem;
      width: 90%;
      max-width: 380px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      text-align: center;
      transform: scale(0.9);
      transition: transform 0.3s ease;
      direction: rtl;
    ">
      <div style="background: rgba(239, 68, 68, 0.15); color: #ef4444; width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem;">
        <i data-lucide="help-circle" style="width: 28px; height: 28px;"></i>
      </div>
      <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary, #0f172a); margin-bottom: 0.75rem;">تأكيد الإجراء</h3>
      <p style="font-size: 0.92rem; color: var(--text-secondary, #475569); line-height: 1.6; margin-bottom: 1.75rem;">${message}</p>
      <div style="display: flex; gap: 0.75rem; justify-content: center;">
        <button id="custom-confirm-ok" class="btn btn-danger" style="flex: 1; padding: 0.65rem; font-weight: 700; border-radius: 8px; background: #ef4444; color: white; border: none; cursor: pointer;">تأكيد</button>
        <button id="custom-confirm-cancel" class="btn btn-secondary" style="flex: 1; padding: 0.65rem; font-weight: 700; border-radius: 8px; cursor: pointer;">إلغاء</button>
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
  };

  modal.querySelector('#custom-confirm-cancel').onclick = () => {
    close();
    if (onCancel) onCancel();
  };

  // Close when clicking outside card
  modal.onclick = (e) => {
    if (e.target === modal) {
      close();
      if (onCancel) onCancel();
    }
  };
}



