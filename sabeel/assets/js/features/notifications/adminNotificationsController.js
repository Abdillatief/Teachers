/**
 * Sabeel Academy - Admin Notifications Controller
 * Powers admin/notifications.html
 */

import { auth, db } from '../../config/firebase.js';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { renderNavbar } from '../../shared/components/navbar.js';
import { renderSidebar } from '../../shared/components/sidebar.js';
import { Toast } from '../../shared/utils/toast.js';
import { showCustomConfirm } from '../../shared/utils/helpers.js';
import { 
  sendNotification, 
  sendNotificationToUser 
} from '../../shared/services/notificationService.js';
import { 
  getAllTemplates, 
  updateTemplate, 
  seedDefaultTemplates,
  renderTemplateContent,
  DEFAULT_TEMPLATES 
} from '../../shared/services/templateService.js';
import { 
  getAdminNotificationSettings, 
  updateAdminNotificationSettings 
} from '../../shared/services/adminNotificationSettingsService.js';
import { 
  cleanInactiveDevices 
} from '../../shared/services/deviceService.js';

let currentAdminUser = null;
let cachedTeachers = [];
let cachedStudents = [];
let cachedTemplates = [];
let unsubscribeNotifications = null;
let unsubscribeDevices = null;

document.addEventListener('DOMContentLoaded', async () => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = '../index.html';
      return;
    }

    currentAdminUser = user;

    // Verify Admin Role
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        window.location.href = '../index.html';
        return;
      }
      const uData = userDoc.data();
      if (uData.role !== 'admin' && uData.role !== 'sub_admin') {
        Toast.error("عذراً، هذه الصفحة مخصصة لإدارة الأكاديمية فقط.");
        setTimeout(() => { window.location.href = '../teacher/dashboard.html'; }, 1000);
        return;
      }

      renderNavbar('إدارة وتوجيه الإشعارات', {
        name: uData.name || user.email,
        roleName: uData.role === 'sub_admin' ? 'مشرف النظام' : 'مدير الأكاديمية'
      });
      renderSidebar('notifications', 'admin');

      if (window.lucide) window.lucide.createIcons();

      // Initialize all subsystems
      await initTargetData();
      initFormHandlers();
      initTabs();
      await loadTemplatesTab();
      initHistoryListener();
      await loadSettingsTab();
      initDevicesListener();

    } catch (err) {
      console.error("Auth init error:", err);
      Toast.error("حدث خطأ أثناء تحميل بيانات الحساب.");
    }
  });
});

/**
 * Loads teachers and students for targeting dropdowns
 */
async function initTargetData() {
  try {
    // Teachers
    const teachersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "teacher")));
    cachedTeachers = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const teacherSelect = document.getElementById('selectSpecificTeacher');
    if (teacherSelect) {
      teacherSelect.innerHTML = `<option value="">-- اختر المعلم --</option>` + 
        cachedTeachers.map(t => `<option value="${t.id}">${t.name || t.email} (${t.phone || 'بدون هاتف'})</option>`).join('');
    }

    // Students
    const studentsSnap = await getDocs(collection(db, "students"));
    cachedStudents = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const studentSelect = document.getElementById('selectSpecificStudent');
    if (studentSelect) {
      studentSelect.innerHTML = `<option value="">-- اختر الطالب --</option>` + 
        cachedStudents.map(s => `<option value="${s.id}">${s.name || 'طالب'} (${s.phone || s.parentPhone || 'بدون هاتف'})</option>`).join('');
    }
  } catch (err) {
    console.warn("Error loading targets:", err);
  }
}

/**
 * Initializes Compose Form & live phone preview
 */
function initFormHandlers() {
  const form = document.getElementById('composeNotifForm');
  const titleInput = document.getElementById('notifTitle');
  const bodyInput = document.getElementById('notifBody');
  const imageInput = document.getElementById('notifImage');
  const previewTitle = document.getElementById('previewTitle');
  const previewBody = document.getElementById('previewBody');
  const previewImageWrapper = document.getElementById('previewImageWrapper');
  const previewImageEl = document.getElementById('previewImageEl');

  const presetSelect = document.getElementById('selectPresetTemplate');
  const timingRadios = document.querySelectorAll('input[name="timingRadio"]');
  const scheduleWrapper = document.getElementById('wrapperSchedulePicker');
  const targetRadios = document.querySelectorAll('input[name="targetTypeRadio"]');
  const specificTeacherWrapper = document.getElementById('wrapperSpecificTeacher');
  const specificStudentWrapper = document.getElementById('wrapperSpecificStudent');
  const submitBtnText = document.getElementById('btnSubmitDispatchText');

  // Live Phone Mockup Preview Sync
  const updatePreview = () => {
    if (previewTitle) previewTitle.textContent = titleInput.value.trim() || 'عنوان الإشعار يظهر هنا';
    if (previewBody) previewBody.textContent = bodyInput.value.trim() || 'محتوى وتفاصيل الإشعار تظهر هنا بالشكل الذي سيراه المعلم أو الطالب على هاتفه.';
    if (previewImageWrapper && previewImageEl) {
      const imgVal = imageInput.value.trim();
      if (imgVal) {
        previewImageEl.src = imgVal;
        previewImageWrapper.style.display = 'block';
      } else {
        previewImageWrapper.style.display = 'none';
      }
    }
  };

  titleInput?.addEventListener('input', updatePreview);
  bodyInput?.addEventListener('input', updatePreview);
  imageInput?.addEventListener('input', updatePreview);

  // Target radio selection
  targetRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const val = radio.value;
      if (specificTeacherWrapper) specificTeacherWrapper.style.display = val === 'specific_teacher' ? 'block' : 'none';
      if (specificStudentWrapper) specificStudentWrapper.style.display = val === 'specific_student' ? 'block' : 'none';
    });
  });

  // Preset Template Quick Fill
  presetSelect?.addEventListener('change', () => {
    const selectedId = presetSelect.value;
    if (!selectedId) return;

    const tpl = cachedTemplates.find(t => t.id === selectedId) || DEFAULT_TEMPLATES.find(t => t.id === selectedId);
    if (tpl) {
      if (titleInput) titleInput.value = tpl.title;
      if (bodyInput) bodyInput.value = tpl.body;
      const deepLinkInput = document.getElementById('notifDeepLink');
      if (deepLinkInput && tpl.deepLink) deepLinkInput.value = tpl.deepLink;
      const prioritySelect = document.getElementById('notifPriority');
      if (prioritySelect && tpl.priority) prioritySelect.value = tpl.priority;
      const soundSelect = document.getElementById('notifSound');
      if (soundSelect && tpl.sound) soundSelect.value = tpl.sound;

      updatePreview();
      Toast.info(`تم تحميل قالب: ${tpl.name}`);
    }
  });

  // Timing: Now vs Schedule
  timingRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const isSchedule = radio.value === 'schedule';
      if (scheduleWrapper) scheduleWrapper.style.display = isSchedule ? 'block' : 'none';
      if (submitBtnText) submitBtnText.textContent = isSchedule ? 'حفظ وجدولة الإشعار' : 'إرسال الإشعار الآن';
    });
  });

  // Form Submit
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    if (!title || !body) {
      Toast.warning("يرجى ملء عنوان ونص الإشعار.");
      return;
    }

    const targetTypeSelected = document.querySelector('input[name="targetTypeRadio"]:checked')?.value || 'all';
    let targetType = 'all';
    let targetIds = [];

    if (targetTypeSelected === 'teachers') {
      targetType = 'teachers';
    } else if (targetTypeSelected === 'admins') {
      targetType = 'admins';
    } else if (targetTypeSelected === 'specific_teacher') {
      const teacherId = document.getElementById('selectSpecificTeacher')?.value;
      if (!teacherId) {
        Toast.warning("يرجى اختيار المعلم المستهدف.");
        return;
      }
      targetType = 'specific_teachers';
      targetIds = [teacherId];
    } else if (targetTypeSelected === 'specific_student') {
      const studentId = document.getElementById('selectSpecificStudent')?.value;
      if (!studentId) {
        Toast.warning("يرجى اختيار الطالب المستهدف.");
        return;
      }
      targetType = 'specific_user';
      targetIds = [studentId];
    }

    const priority = document.getElementById('notifPriority')?.value || 'normal';
    const deepLink = document.getElementById('notifDeepLink')?.value.trim() || '/teacher/today-sessions.html';
    const image = imageInput?.value.trim() || null;
    const sound = document.getElementById('notifSound')?.value || 'default';

    const isSchedule = document.querySelector('input[name="timingRadio"]:checked')?.value === 'schedule';
    let scheduledAt = null;

    if (isSchedule) {
      const dtVal = document.getElementById('scheduledDateTime')?.value;
      if (!dtVal) {
        Toast.warning("يرجى تحديد وقت وتاريخ الجدولة بدقة.");
        return;
      }
      scheduledAt = new Date(dtVal).toISOString();
      if (new Date(scheduledAt).getTime() <= Date.now()) {
        Toast.warning("وقت الجدولة يجب أن يكون في المستقبل.");
        return;
      }
    }

    const submitBtn = document.getElementById('btnSubmitDispatch');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="loading-spinner" style="width:14px; height:14px; margin-left:6px;"></span> جاري الإرسال...`;

    try {
      const isSpecificTeacher = targetType === 'specific_teachers';
      const isSpecificUser = targetType === 'specific_user';
      const targetUid = targetIds.length > 0 ? targetIds[0] : null;

      const res = await sendNotification({
        title,
        body,
        image,
        type: isSpecificTeacher || isSpecificUser ? 'admin_direct_message' : (targetType === 'admins' ? 'admin_alert' : 'admin_broadcast'),
        priority,
        targetType,
        targetIds,
        recipientId: targetUid || (targetType === 'teachers' ? 'teachers' : (targetType === 'admins' ? 'admin' : 'all')),
        teacherId: isSpecificTeacher ? targetUid : null,
        targetRole: (targetType === 'teachers' || isSpecificTeacher) ? 'teacher' : (targetType === 'admins' ? 'admin' : 'all'),
        deepLink,
        scheduledAt,
        senderId: currentAdminUser.uid,
        data: { sound }
      });

      if (res.success) {
        if (isSchedule) {
          Toast.success("تمت جدولة الإشعار بنجاح للإرسال في الموعد المحدد.");
        } else {
          Toast.success("تم إرسال وتوجيه الإشعار بنجاح عبر النظام والـ Push.");
        }
        form.reset();
        updatePreview();
        if (scheduleWrapper) scheduleWrapper.style.display = 'none';
        if (submitBtnText) submitBtnText.textContent = 'إرسال الإشعار الآن';
      } else {
        Toast.error("فشل إرسال الإشعار: " + (res.error || "خطأ غير معروف"));
      }
    } catch (err) {
      console.error("Dispatch error:", err);
      Toast.error("حدث خطأ أثناء الإرسال: " + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i data-lucide="send"></i> <span>${submitBtnText ? submitBtnText.textContent : 'إرسال الإشعار'}</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // Quick Self Test Button
  document.getElementById('btnQuickTestSelf')?.addEventListener('click', async () => {
    if (!currentAdminUser) return;
    try {
      Toast.info("جاري إرسال إشعار تجريبي لحسابك...");
      const res = await sendNotificationToUser(
        currentAdminUser.uid,
        '🔔 اختبار إشعار فوري من سبيل',
        'هذا إشعار تجريبي للتأكد من وصول التنبيهات الفورية عبر Web Push والمتصفح وتطبيق الهاتف.',
        {
          priority: 'urgent',
          deepLink: '/admin/notifications.html'
        }
      );
      if (res.success) {
        Toast.success("تم إرسال الإشعار التجريبي بنجاح!");
      } else {
        Toast.warning("تم حفظ الإشعار داخلياً، ولكن تعذر إرسال Push: " + (res.error || ''));
      }
    } catch (e) {
      Toast.error("خطأ: " + e.message);
    }
  });

  // Refresh Button
  document.getElementById('btnRefreshNotifs')?.addEventListener('click', () => {
    initHistoryListener();
    initDevicesListener();
    loadTemplatesTab();
    Toast.success("تم تحديث البيانات لحظياً.");
  });
}

/**
 * Initializes Tab navigation
 */
function initTabs() {
  const tabButtons = document.querySelectorAll('.notif-tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.style.display = 'none');

      btn.classList.add('active');
      const targetId = btn.dataset.tab;
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.style.display = 'block';

      if (window.lucide) window.lucide.createIcons();
    });
  });
}

/**
 * Loads templates for Tab 2
 */
async function loadTemplatesTab() {
  const container = document.getElementById('templatesGridContainer');
  if (!container) return;

  try {
    cachedTemplates = await getAllTemplates();
    renderTemplatesGrid(cachedTemplates);
  } catch (e) {
    container.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 2rem;">تعذر تحميل القوالب: ${e.message}</div>`;
  }

  // Restore Default Templates Button
  document.getElementById('btnSeedTemplates')?.addEventListener('click', async () => {
    showCustomConfirm('هل تريد استعادة جميع القوالب الافتراضية الثمانية المعيارية؟', async () => {
      await seedDefaultTemplates();
      cachedTemplates = await getAllTemplates();
      renderTemplatesGrid(cachedTemplates);
      Toast.success("تمت استعادة القوالب الافتراضية بنجاح.");
    });
  });
}

function renderTemplatesGrid(templates) {
  const container = document.getElementById('templatesGridContainer');
  if (!container) return;

  container.innerHTML = templates.map(tpl => {
    const isEnabled = tpl.enabled !== false;
    const badgeColor = tpl.priority === 'urgent' ? '#dc2626' : (tpl.priority === 'high' ? '#b45309' : '#059669');
    const badgeBg = tpl.priority === 'urgent' ? 'rgba(239, 68, 68, 0.15)' : (tpl.priority === 'high' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)');

    return `
      <div class="template-card" data-template-id="${tpl.id}" style="${isEnabled ? '' : 'opacity: 0.6; filter: grayscale(40%);'}">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.65rem;">
            <div>
              <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">${tpl.category || 'عام'}</span>
              <h3 style="font-size: 0.95rem; font-weight: 800; color: var(--text-primary); margin: 0.15rem 0;">${tpl.name}</h3>
            </div>
            <label class="switch-toggle" title="${isEnabled ? 'القالب مفعل' : 'القالب معطل'}">
              <input type="checkbox" class="toggle-template-enabled" data-id="${tpl.id}" ${isEnabled ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: 0.65rem; margin-bottom: 0.75rem;">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--primary-color); margin-bottom: 0.2rem;">${tpl.title}</div>
            <p style="font-size: 0.74rem; color: var(--text-secondary); line-height: 1.4; margin: 0;">${tpl.body}</p>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted);">
            <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 2px 7px; border-radius: 4px; font-weight: 700;">
              ${tpl.priority === 'urgent' ? 'عاجل' : (tpl.priority === 'high' ? 'هام' : 'عادي')}
            </span>
            <span>نغمة: ${tpl.sound || 'افتراضي'}</span>
          </div>
        </div>

        <div style="display: flex; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.5rem;">
          <button class="btn btn-sm btn-secondary btn-edit-template" data-id="${tpl.id}" style="flex: 1; font-size: 0.76rem; font-weight: 700;">
            <i data-lucide="edit"></i>
            تعديل
          </button>
          <button class="btn btn-sm btn-secondary btn-test-template" data-id="${tpl.id}" style="flex: 1; font-size: 0.76rem; font-weight: 700; color: var(--primary-color);">
            <i data-lucide="play"></i>
            تجربة
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();

  // Attach Template Toggle Enabled Listeners
  container.querySelectorAll('.toggle-template-enabled').forEach(checkbox => {
    checkbox.addEventListener('change', async () => {
      const tId = checkbox.dataset.id;
      const isChecked = checkbox.checked;
      try {
        await updateTemplate(tId, { enabled: isChecked });
        Toast.success(isChecked ? "تم تفعيل القالب بنجاح." : "تم إيقاف القالب.");
        const card = container.querySelector(`.template-card[data-template-id="${tId}"]`);
        if (card) {
          card.style.opacity = isChecked ? '1' : '0.6';
          card.style.filter = isChecked ? 'none' : 'grayscale(40%)';
        }
      } catch (err) {
        Toast.error("فشل تحديث القالب: " + err.message);
        checkbox.checked = !isChecked;
      }
    });
  });

  // Attach Edit Template Modal
  container.querySelectorAll('.btn-edit-template').forEach(btn => {
    btn.addEventListener('click', () => {
      const tId = btn.dataset.id;
      const tpl = cachedTemplates.find(t => t.id === tId) || DEFAULT_TEMPLATES.find(t => t.id === tId);
      if (!tpl) return;

      document.getElementById('editTemplateId').value = tpl.id;
      document.getElementById('editTemplateName').value = tpl.name || '';
      document.getElementById('editTemplateHeader').value = tpl.title || '';
      document.getElementById('editTemplateBody').value = tpl.body || '';
      document.getElementById('editTemplatePriority').value = tpl.priority || 'normal';
      document.getElementById('editTemplateDeepLink').value = tpl.deepLink || '';

      const modal = document.getElementById('modalEditTemplate');
      if (modal) modal.style.display = 'flex';
      if (window.lucide) window.lucide.createIcons();
    });
  });

  // Attach Test Template Button
  container.querySelectorAll('.btn-test-template').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tId = btn.dataset.id;
      const tpl = cachedTemplates.find(t => t.id === tId) || DEFAULT_TEMPLATES.find(t => t.id === tId);
      if (!tpl || !currentAdminUser) return;

      const rendered = renderTemplateContent(tpl, {
        teacherName: currentAdminUser.displayName || 'أستاذنا الفاضل',
        studentName: 'عمر خالد',
        month: 'سبتمبر 2026',
        remainingLessons: '2',
        message: 'توجيه إداري تجريبي لاختبار القالب'
      });

      Toast.info(`جاري اختبار إرسال قالب [${tpl.name}]...`);
      const res = await sendNotificationToUser(currentAdminUser.uid, rendered.title, rendered.body, {
        priority: tpl.priority || 'normal',
        deepLink: tpl.deepLink || '/admin/notifications.html'
      });

      if (res.success) {
        Toast.success("تم إرسال نموذج القالب بنجاح!");
      } else {
        Toast.warning("تم حفظ القالب، وتعذر إرسال Push: " + (res.error || ''));
      }
    });
  });
}

// Edit Template Modal Form
document.getElementById('btnCloseEditTemplate')?.addEventListener('click', () => {
  document.getElementById('modalEditTemplate').style.display = 'none';
});
document.getElementById('btnCancelEditTemplate')?.addEventListener('click', () => {
  document.getElementById('modalEditTemplate').style.display = 'none';
});

document.getElementById('formEditTemplate')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const tId = document.getElementById('editTemplateId').value;
  const name = document.getElementById('editTemplateName').value.trim();
  const title = document.getElementById('editTemplateHeader').value.trim();
  const body = document.getElementById('editTemplateBody').value.trim();
  const priority = document.getElementById('editTemplatePriority').value;
  const deepLink = document.getElementById('editTemplateDeepLink').value.trim();

  try {
    await updateTemplate(tId, { name, title, body, priority, deepLink });
    Toast.success("تم حفظ تعديلات القالب بنجاح.");
    document.getElementById('modalEditTemplate').style.display = 'none';
    cachedTemplates = await getAllTemplates();
    renderTemplatesGrid(cachedTemplates);
  } catch (err) {
    Toast.error("حدث خطأ أثناء تعديل القالب: " + err.message);
  }
});

/**
 * History & Logs Real-time Listener (Tab 3)
 */
function initHistoryListener() {
  if (unsubscribeNotifications) {
    unsubscribeNotifications();
    unsubscribeNotifications = null;
  }

  const q = query(
    collection(db, "notifications"),
    orderBy("createdAt", "desc"),
    limit(60)
  );

  unsubscribeNotifications = onSnapshot(q, (snapshot) => {
    const totalCount = snapshot.size;
    const statTotalSentEl = document.getElementById('statTotalSent');
    if (statTotalSentEl) statTotalSentEl.textContent = totalCount;

    let scheduledCount = 0;
    const historyItems = [];

    snapshot.forEach(docSnap => {
      const data = { id: docSnap.id, ...docSnap.data() };
      if (data.status === 'scheduled') scheduledCount++;
      historyItems.push(data);
    });

    const statScheduledEl = document.getElementById('statScheduledCount');
    if (statScheduledEl) statScheduledEl.textContent = scheduledCount;

    renderHistoryTable(historyItems);
  }, (err) => {
    console.warn("Notifications history listener error:", err);
  });
}

function renderHistoryTable(items) {
  const tbody = document.getElementById('notifHistoryTableBody');
  const filterStatus = document.getElementById('filterHistoryStatus')?.value || 'all';
  if (!tbody) return;

  let filtered = items;
  if (filterStatus !== 'all') {
    filtered = items.filter(i => i.status === filterStatus);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">لا توجد إشعارات مسجلة في هذا القسم.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    let statusBadge = '<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #059669; font-weight: 700;">تم الإرسال</span>';
    if (item.status === 'scheduled') {
      statusBadge = '<span class="badge" style="background: rgba(2, 132, 199, 0.15); color: #0284c7; font-weight: 700;">مجدول</span>';
    } else if (item.status === 'failed') {
      statusBadge = '<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #dc2626; font-weight: 700;">فشل الإرسال</span>';
    } else if (item.status === 'cancelled') {
      statusBadge = '<span class="badge" style="background: rgba(100, 116, 139, 0.15); color: #64748b; font-weight: 700;">ملغى</span>';
    }

    const priorityColor = item.priority === 'urgent' ? '#dc2626' : (item.priority === 'high' ? '#b45309' : '#059669');
    
    // Target display
    let targetLabel = 'الجميع';
    if (item.targetType === 'teachers') targetLabel = 'جميع المعلمين';
    else if (item.targetType === 'admins') targetLabel = 'الإدارة';
    else if (Array.isArray(item.targetIds) && item.targetIds.length > 0) {
      targetLabel = `${item.targetIds.length} مستخدم`;
    }

    // Date
    let timeText = item.createdAt ? new Date(item.createdAt).toLocaleString('ar-EG') : 'الآن';
    if (item.scheduledAt) {
      timeText += `<br><span style="font-size: 0.7rem; color: #0284c7;">مجدول: ${new Date(item.scheduledAt).toLocaleString('ar-EG')}</span>`;
    }

    return `
      <tr>
        <td style="max-width: 250px;">
          <strong style="color: var(--text-primary); display: block;">${item.title || 'بدون عنوان'}</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${item.body || ''}
          </span>
        </td>
        <td><span style="font-size: 0.78rem; font-weight: 600;">${targetLabel}</span></td>
        <td><span style="color: ${priorityColor}; font-weight: 700; font-size: 0.78rem;">${item.priority || 'عادي'}</span></td>
        <td>${statusBadge}</td>
        <td style="font-size: 0.74rem; color: var(--text-muted);">${timeText}</td>
        <td>
          <div style="display: flex; gap: 4px;">
            ${item.status === 'scheduled' ? `
              <button class="btn btn-sm btn-secondary btn-cancel-scheduled" data-id="${item.id}" title="إلغاء الجدولة" style="padding: 4px 6px; color: #ef4444;">
                <i data-lucide="x-circle" style="width: 14px; height: 14px;"></i>
              </button>
            ` : ''}
            <button class="btn btn-sm btn-secondary btn-delete-history-notif" data-id="${item.id}" title="حذف السجل" style="padding: 4px 6px; color: var(--text-muted);">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();

  // Attach Cancel Scheduled
  tbody.querySelectorAll('.btn-cancel-scheduled').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      try {
        await updateDoc(doc(db, "notifications", id), { status: 'cancelled' });
        Toast.success("تم إلغاء جدولة الإشعار.");
      } catch (e) {
        Toast.error("فشل إلغاء الجدولة: " + e.message);
      }
    });
  });

  // Attach Delete History
  tbody.querySelectorAll('.btn-delete-history-notif').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      showCustomConfirm('هل أنت متأكد من رغبتك في حذف هذا الإشعار من السجل نهائياً؟', async () => {
        try {
          await deleteDoc(doc(db, "notifications", id));
          Toast.success("تم حذف الإشعار بنجاح.");
        } catch (e) {
          Toast.error("فشل الحذف: " + e.message);
        }
      });
    });
  });
}

document.getElementById('filterHistoryStatus')?.addEventListener('change', () => {
  initHistoryListener();
});

/**
 * Loads and saves Master Settings (Tab 4)
 */
async function loadSettingsTab() {
  try {
    const settings = await getAdminNotificationSettings();
    document.getElementById('settingSessionReminder').checked = settings.sessionReminderEnabled !== false;
    if (document.getElementById('settingSessionStart')) {
      document.getElementById('settingSessionStart').checked = settings.sessionStartEnabled !== false;
    }
    document.getElementById('settingSalary').checked = settings.salaryEnabled !== false;
    document.getElementById('settingCommunity').checked = settings.communityEnabled !== false;
    document.getElementById('settingSubscription').checked = settings.subscriptionEnabled !== false;
    document.getElementById('settingMaintenance').checked = settings.maintenanceEnabled !== false;
  } catch (err) {
    console.warn("Error loading settings:", err);
  }

  // Save Settings
  document.getElementById('btnSaveMasterSettings')?.addEventListener('click', async () => {
    const payload = {
      sessionReminderEnabled: document.getElementById('settingSessionReminder').checked,
      sessionStartEnabled: document.getElementById('settingSessionStart') ? document.getElementById('settingSessionStart').checked : true,
      salaryEnabled: document.getElementById('settingSalary').checked,
      communityEnabled: document.getElementById('settingCommunity').checked,
      subscriptionEnabled: document.getElementById('settingSubscription').checked,
      maintenanceEnabled: document.getElementById('settingMaintenance').checked
    };

    const res = await updateAdminNotificationSettings(payload);
    if (res.success) {
      Toast.success("تم حفظ إعدادات الإشعارات العامة بنجاح.");
    } else {
      Toast.error("فشل حفظ الإعدادات: " + res.error);
    }
  });

  // Clean inactive devices button
  document.getElementById('btnCleanDevices')?.addEventListener('click', async () => {
    showCustomConfirm('هل تريد إزالة جميع الأجهزة غير النشطة لأكثر من 90 يوماً من قاعدة البيانات؟', async () => {
      await cleanInactiveDevices(90);
      Toast.success("تم تنظيف الأجهزة القديمة بنجاح.");
    });
  });
}

/**
 * Real-time listener for registered devices (Tab 4)
 */
function initDevicesListener() {
  if (unsubscribeDevices) {
    unsubscribeDevices();
    unsubscribeDevices = null;
  }

  const q = query(
    collection(db, "notification_devices"),
    orderBy("lastActive", "desc"),
    limit(50)
  );

  unsubscribeDevices = onSnapshot(q, (snapshot) => {
    const statActiveDevicesEl = document.getElementById('statActiveDevices');
    if (statActiveDevicesEl) statActiveDevicesEl.textContent = snapshot.size;

    const container = document.getElementById('devicesListContainer');
    if (!container) return;

    if (snapshot.empty) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem;">لا توجد أجهزة مسجلة حالياً.</div>`;
      return;
    }

    const devices = [];
    snapshot.forEach(docSnap => {
      devices.push({ id: docSnap.id, ...docSnap.data() });
    });

    container.innerHTML = devices.map(d => {
      const platformIcon = d.platform?.includes('ios') ? 'apple' : (d.platform?.includes('android') ? 'smartphone' : 'monitor');
      const isMedian = Boolean(d.isMedian);
      const isPlayerActive = Boolean(d.oneSignalPlayerId);

      return `
        <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: 0.75rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div style="width: 34px; height: 34px; background: rgba(13, 148, 136, 0.1); color: var(--primary-color); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <i data-lucide="${platformIcon}" style="width: 17px; height: 17px;"></i>
            </div>
            <div>
              <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 4px;">
                <span>${d.platform || 'جهاز غير معروف'}</span>
                ${isMedian ? '<span class="badge" style="background: rgba(139, 92, 246, 0.15); color: #7c3aed; font-size: 0.65rem; padding: 1px 5px;">Median App</span>' : ''}
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">
                معرف المستخدم: <code style="font-size: 0.68rem;">${d.userId ? d.userId.substring(0, 10) + '...' : 'غير محدد'}</code>
              </div>
            </div>
          </div>

          <div style="text-align: left;">
            <span class="badge" style="background: ${isPlayerActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${isPlayerActive ? '#059669' : '#dc2626'}; font-size: 0.65rem; font-weight: 700;">
              ${isPlayerActive ? 'OneSignal متصل' : 'بانتظار الإذن'}
            </span>
            <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 2px;">
              ${d.lastActive ? new Date(d.lastActive).toLocaleDateString('ar-EG') : 'غير مسجل'}
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }, (err) => {
    console.warn("Devices listener error:", err);
  });
}
