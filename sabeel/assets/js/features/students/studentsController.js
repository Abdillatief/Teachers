import { db, auth } from '../../config/firebase.js';
import { collection, onSnapshot, doc, getDoc, updateDoc, setDoc, addDoc, serverTimestamp, deleteDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { protectRoute } from '../auth/authService.js';
import { renderSidebar } from '../../shared/components/sidebar.js';
import { renderNavbar } from '../../shared/components/navbar.js';
import { Toast } from '../../shared/utils/toast.js';
import { showCustomConfirm } from '../../shared/utils/helpers.js';
import { softDeleteToTrash } from '../trash/trashService.js';
import { writeAuditLog } from '../audit/auditService.js';
import { openStudentReportModal } from '../../shared/utils/studentReportCard.js';
import { TransactionProtector } from '../../shared/utils/transactionProtector.js';
import { addStudentToGroup, removeStudentFromGroup } from '../groups/newGroupsService.js';
import { ListenerManager, debounce, updateTargetIcons, paginateData, renderPaginationControls } from '../../shared/utils/perfUtils.js';
import { assignPackageToStudent, getStudentPackagesArchive } from '../../shared/utils/creditManager.js';
import { openWhatsAppReminderWidget, renderWarningCountBadge } from '../../shared/utils/whatsappWidget.js';

protectRoute('admin');

const listenerManager = new ListenerManager();

const TIME_OPTIONS_HTML_FRAGMENT = `
  <option value="08:00 صباحاً">08:00 صباحاً</option>
  <option value="08:30 صباحاً">08:30 صباحاً</option>
  <option value="09:00 صباحاً">09:00 صباحاً</option>
  <option value="09:30 صباحاً">09:30 صباحاً</option>
  <option value="10:00 صباحاً">10:00 صباحاً</option>
  <option value="10:30 صباحاً">10:30 صباحاً</option>
  <option value="11:00 صباحاً">11:00 صباحاً</option>
  <option value="11:30 صباحاً">11:30 صباحاً</option>
  <option value="12:00 مساءً">12:00 مساءً</option>
  <option value="12:30 مساءً">12:30 مساءً</option>
  <option value="01:00 مساءً">01:00 مساءً</option>
  <option value="01:30 مساءً">01:30 مساءً</option>
  <option value="02:00 مساءً">02:00 مساءً</option>
  <option value="02:30 مساءً">02:30 مساءً</option>
  <option value="03:00 مساءً">03:00 مساءً</option>
  <option value="03:30 مساءً">03:30 مساءً</option>
  <option value="04:00 مساءً">04:00 مساءً</option>
  <option value="04:30 مساءً">04:30 مساءً</option>
  <option value="05:00 مساءً">05:00 مساءً</option>
  <option value="05:30 مساءً">05:30 مساءً</option>
  <option value="06:00 مساءً">06:00 مساءً</option>
  <option value="06:30 مساءً">06:30 مساءً</option>
  <option value="07:00 مساءً">07:00 مساءً</option>
  <option value="07:30 مساءً">07:30 مساءً</option>
  <option value="08:00 مساءً">08:00 مساءً</option>
  <option value="08:30 مساءً">08:30 مساءً</option>
  <option value="09:00 مساءً">09:00 مساءً</option>
  <option value="09:30 مساءً">09:30 مساءً</option>
  <option value="10:00 مساءً">10:00 مساءً</option>
  <option value="10:30 مساءً">10:30 مساءً</option>
  <option value="11:00 مساءً">11:00 مساءً</option>
  <option value="11:30 مساءً">11:30 مساءً</option>
`;

function renderAdminPerDayTimeInputs(containerListId, selectedDays, timesObj = {}, defaultTime = "05:30 مساءً") {
  const listEl = document.getElementById(containerListId);
  if (!listEl) return;
  if (!selectedDays || selectedDays.length === 0) {
    listEl.innerHTML = `<div style="grid-column: 1/-1; color: var(--text-muted); font-size: 0.8rem;">يرجى اختيار الأيام أولاً لتحديد موعد الحصة لكل يوم.</div>`;
    return;
  }
  listEl.innerHTML = selectedDays.map(day => {
    return `
      <div class="form-group" style="margin: 0;">
        <label style="font-size: 0.78rem; font-weight: 700; color: var(--primary-color); display: block; margin-bottom: 0.25rem;">موعد يوم ${day}:</label>
        <select class="form-control admin-day-time-select" data-day="${day}" style="border: 1px solid var(--border-color); width: 100%; font-size: 0.85rem;">
          <option value="">-- اختر موعد ${day} --</option>
          ${TIME_OPTIONS_HTML_FRAGMENT}
        </select>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.admin-day-time-select').forEach(sel => {
    const day = sel.dataset.day;
    if (timesObj && timesObj[day]) {
      sel.value = timesObj[day];
    } else if (defaultTime) {
      sel.value = defaultTime;
    }
  });
}

let studentsCached = [];
let pendingStudentsCached = [];
let teachersCached = [];
let packagesCached = [];
let groupsCached = [];
let loggedInAdminData = null;
let currentEditingStudentId = null;
let currentApprovingStudent = null;

// Initialize Page and real-time streams
auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        loggedInAdminData = userDoc.data();
        
        const isSubAdmin = loggedInAdminData.role === "admin" && loggedInAdminData.isSubAdmin;
        const roleName = isSubAdmin ? "مشرف مساعد" : "مدير الأكاديمية";

        renderSidebar('students', 'admin');
        renderNavbar('إدارة شؤون الطلاب والدارسين', { name: loggedInAdminData.name || 'الإدارة العامة', roleName: roleName });
        
        initStudentsModule();
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    }
  }
});

function initStudentsModule() {
  listenerManager.unsubscribeAll();

  // 1. Fetch packages
  const unsubPackages = onSnapshot(collection(db, "packages"), (snapshot) => {
    packagesCached = [];
    snapshot.forEach(docSnap => {
      packagesCached.push({ id: docSnap.id, ...docSnap.data() });
    });
    populatePackageOptions();
  }, err => console.warn("Error fetching packages:", err));
  listenerManager.register("packages", unsubPackages);

  // 2. Fetch active groups
  const unsubGroups = onSnapshot(collection(db, "groups"), (groupSnap) => {
    groupsCached = [];
    groupSnap.forEach(docSnap => {
      groupsCached.push({ id: docSnap.id, ...docSnap.data() });
    });
    populateGroupDropdowns();
    renderStudentsTable();
  }, err => console.warn("Error fetching groups:", err));
  listenerManager.register("groups", unsubGroups);

  // 3. Fetch approved teachers
  const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
    teachersCached = [];
    snapshot.forEach(docSnap => {
      const userData = docSnap.data();
      if (userData.role === 'teacher' && userData.status === 'approved') {
        teachersCached.push({ uid: docSnap.id, ...userData });
      }
    });

    populateTeachersDropdowns();
    renderStudentsTable();
  }, err => console.warn("Error fetching teachers:", err));
  listenerManager.register("users", unsubUsers);

  // 4. Fetch students independently
  const unsubStudents = onSnapshot(collection(db, "students"), (studentsSnapshot) => {
    studentsCached = [];
    pendingStudentsCached = [];

    studentsSnapshot.forEach(docSnap => {
      const data = { id: docSnap.id, ...docSnap.data() };
      if (data.status === 'pending_approval') {
        pendingStudentsCached.push(data);
      } else {
        studentsCached.push(data);
      }
    });

    renderPendingStudentsTable();
    renderStudentsTable();
  }, err => console.warn("Error fetching students:", err));
  listenerManager.register("students", unsubStudents);

  setupEventListeners();
  setupApproveStudentModalHandlers();
}

function populateTeachersDropdowns() {
  const optionsHtml = teachersCached.map(t => `<option value="${t.uid}">${t.name}</option>`).join('');

  const editSelect = document.getElementById('editStudentTeacher');
  if (editSelect) {
    const currentVal = editSelect.value;
    editSelect.innerHTML = `<option value="">اختر معلماً مشرفاً...</option>` + optionsHtml;
    if (currentVal) editSelect.value = currentVal;
  }

  const approveSelect = document.getElementById('approveTeacherSelect');
  if (approveSelect) {
    const currentVal = approveSelect.value;
    approveSelect.innerHTML = `<option value="">اختر المعلم المشرف...</option>` + optionsHtml;
    if (currentVal) approveSelect.value = currentVal;
  }

  const addTeacherSelect = document.getElementById('addStudentTeacher');
  if (addTeacherSelect) {
    const currentVal = addTeacherSelect.value;
    addTeacherSelect.innerHTML = `<option value="">اختر معلماً مشرفاً معتمداً...</option>` + optionsHtml;
    if (currentVal) addTeacherSelect.value = currentVal;
  }
}

function populateGroupDropdowns() {
  const editGroupSelect = document.getElementById('editStudentGroupSelect');
  const addGroupSelect = document.getElementById('addStudentGroupSelect');

  const activeGroups = groupsCached.filter(g => (g.status || 'active') === 'active');

  const optionsHtml = activeGroups.length > 0 
    ? activeGroups.map(g => {
        const count = (g.studentIds || []).length;
        const limit = parseInt(g.maxStudents) || 10;
        const isFull = count >= limit;
        const scheduleStr = (g.day || g.time) ? ` - [${g.day || ''} ${g.time || ''}]` : '';
        return `<option value="${g.id}" data-teacherid="${g.teacherId || ''}" data-day="${g.day || 'السبت'}" data-time="${g.time || '05:30 مساءً'}" ${isFull ? 'disabled' : ''}>${g.name} (${g.teacherName || 'معلم'})${scheduleStr} - (${count}/${limit} طالب) ${isFull ? '⚠️ مكتملة' : ''}</option>`;
      }).join('')
    : '<option value="" disabled>لا توجد مجموعات نشطة حالياً</option>';

  if (editGroupSelect) {
    const currentVal = editGroupSelect.value;
    editGroupSelect.innerHTML = `<option value="">-- اختر المجموعة --</option>` + optionsHtml;
    if (currentVal) editGroupSelect.value = currentVal;
  }

  if (addGroupSelect) {
    const currentVal = addGroupSelect.value;
    addGroupSelect.innerHTML = `<option value="">-- اختر المجموعة --</option>` + optionsHtml;
    if (currentVal) addGroupSelect.value = currentVal;
  }
}

function getPackageSessionCount(p) {
  if (!p) return 4;
  const val = p.totalSessions ?? p.sessionsCount ?? p.sessions ?? p.totalLessons ?? p.lessonsCount;
  const num = parseInt(val, 10);
  return !isNaN(num) && num > 0 ? num : 4;
}

function populatePackageOptions() {
  const pkgSelect = document.getElementById('approvePackageSelect');
  if (!pkgSelect) return;

  if (packagesCached.length > 0) {
    pkgSelect.innerHTML = `<option value="">-- اختر الباقة التعليمية المناسبة للطالب --</option>` +
      packagesCached.map(p => {
        const sess = getPackageSessionCount(p);
        const dur = p.duration || p.sessionDuration || p.lessonDuration || 60;
        return `<option value="${p.id}" data-price="${p.price}" data-name="${p.name}" data-sessions="${sess}" data-duration="${dur}">${p.name} (${p.price} ج.م - ${sess} حصص)</option>`;
      }).join('');
  } else {
    pkgSelect.innerHTML = `
      <option value="">-- اختر الباقة التعليمية المناسبة للطالب --</option>
      <option value="pkg_4" data-price="300" data-name="باقة 4 حصص شهرياً" data-sessions="4" data-duration="60">باقة 4 حصص شهرياً (300 ج.م - 4 حصص)</option>
      <option value="pkg_8" data-price="500" data-name="باقة 8 حصص شهرياً" data-sessions="8" data-duration="60">باقة 8 حصص شهرياً (500 ج.م - 8 حصص)</option>
      <option value="pkg_12" data-price="700" data-name="باقة 12 حصة شهرياً" data-sessions="12" data-duration="60">باقة 12 حصة شهرياً (700 ج.م - 12 حصة)</option>
      <option value="pkg_custom" data-price="600" data-name="باقة تعليمية مخصصة" data-sessions="8" data-duration="60">باقة تعليمية مخصصة (600 ج.م)</option>
    `;
  }
}

function renderPendingStudentsTable() {
  const cardSection = document.getElementById('pendingStudentRequestsCard');
  const tbody = document.getElementById('pendingStudentsTableBody');
  const badgeCount = document.getElementById('pendingBadgeCount');

  if (!cardSection || !tbody) return;

  if (pendingStudentsCached.length === 0) {
    cardSection.style.display = 'none';
    return;
  }

  cardSection.style.display = 'block';
  if (badgeCount) badgeCount.textContent = `${pendingStudentsCached.length} طلبات معلقة`;

  tbody.innerHTML = pendingStudentsCached.map(s => {
    const days = (s.schedule && s.schedule.days) ? s.schedule.days.join(' • ') : (s.sessionDays ? s.sessionDays.join(' • ') : 'غير محدد');
    const time = s.schedule?.uniformTime || s.sessionTime || s.time || 'مرن';
    const phoneInfo = s.phone ? s.phone : 'لا يوجد هاتف';
    const subTypeBadge = s.subscriptionType === 'group' || s.groupId || s.requestedGroupId
      ? `<span class="badge badge-info" style="position: static;">مجموعة ${s.requestedGroupName ? `: ${s.requestedGroupName}` : ''}</span>`
      : `<span class="badge badge-success" style="position: static;">فردية</span>`;

    return `
      <tr>
        <td>
          <strong style="color: var(--text-primary); font-size: 0.92rem;">${s.name}</strong>
          ${s.email ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${s.email}</div>` : ''}
          <div style="margin-top: 0.25rem;">${subTypeBadge}</div>
        </td>
        <td>${s.age || '-'} سنة <br><span style="font-size: 0.75rem; color: var(--text-muted);">${phoneInfo}</span></td>
        <td><strong style="color: var(--primary-color);">${s.teacherName || 'المعلم المتقدم'}</strong></td>
        <td><span style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary);">${days}</span><br><span style="font-size: 0.75rem; color: var(--text-muted);">${time}</span></td>
        <td><div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem; color: var(--text-secondary);" title="${s.notes || ''}">${s.notes || 'لا يوجد'}</div></td>
        <td>
          <div style="display: flex; gap: 0.35rem; align-items: center;">
            <button class="btn btn-sm btn-primary btn-approve-student" data-id="${s.id}" style="display: flex; align-items: center; gap: 0.25rem;">
              <i data-lucide="check-circle-2" style="width: 14px; height: 14px;"></i> اعتماد وتحديد الباقة
            </button>
            <button class="btn btn-sm btn-secondary btn-reject-student" data-id="${s.id}" style="color: var(--danger); display: flex; align-items: center; gap: 0.2rem;">
              <i data-lucide="x-circle" style="width: 14px; height: 14px;"></i> رفض
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Bind actions
  tbody.querySelectorAll('.btn-approve-student').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id') || btn.dataset.id;
      if (id) openApproveModal(id);
    });
  });

  tbody.querySelectorAll('.btn-reject-student').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id') || btn.dataset.id;
      if (id) rejectStudentRequest(id);
    });
  });
}

let currentViewMode = localStorage.getItem('admin_students_view_mode') || 'table';

function updateViewModeUI() {
  const btnList = document.getElementById('btnListView');
  const btnGrid = document.getElementById('btnGridView');
  const tableContainer = document.getElementById('studentsTableContainer');
  const gridContainer = document.getElementById('studentsGridContainer');

  if (!btnList || !btnGrid) return;

  if (currentViewMode === 'grid') {
    btnGrid.style.backgroundColor = 'var(--primary-color)';
    btnGrid.style.color = '#ffffff';
    btnList.style.backgroundColor = 'transparent';
    btnList.style.color = 'var(--text-secondary)';

    if (tableContainer) tableContainer.style.display = 'none';
    if (gridContainer) gridContainer.style.display = 'grid';
  } else {
    btnList.style.backgroundColor = 'var(--primary-color)';
    btnList.style.color = '#ffffff';
    btnGrid.style.backgroundColor = 'transparent';
    btnGrid.style.color = 'var(--text-secondary)';

    if (tableContainer) tableContainer.style.display = 'block';
    if (gridContainer) gridContainer.style.display = 'none';
  }
}

let currentStudentsPage = 1;
const STUDENTS_PAGE_SIZE = 20;

function renderStudentsTable(filterText = "") {
  const tbody = document.getElementById('studentsTableBody');
  const gridContainer = document.getElementById('studentsGridContainer');
  if (!tbody || !gridContainer) return;

  updateViewModeUI();

  const filtered = studentsCached.filter(s => {
    const nameMatch = s.name && s.name.toLowerCase().includes(filterText.toLowerCase());
    return nameMatch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">لا يوجد طلاب مطابقين للبحث.</td></tr>`;
    gridContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">لا يوجد طلاب مطابقين للبحث.</div>`;
    const pagEl = document.getElementById('studentsPaginationContainer');
    if (pagEl) pagEl.innerHTML = '';
    return;
  }

  const { items: paginatedStudents, totalPages } = paginateData(filtered, currentStudentsPage, STUDENTS_PAGE_SIZE);

  // 1. Render Table View
  tbody.innerHTML = paginatedStudents.map(s => {
    const teacher = teachersCached.find(t => t.uid === s.teacherId);
    const teacherName = teacher ? teacher.name : (s.teacherName || `<span style="color:var(--danger); font-weight:600;">غير معين</span>`);
    
    let statusBadge = '';
    if (s.status === 'active' || s.status === 'Active') {
      statusBadge = `<span class="badge badge-success">نشط</span>`;
    } else if (s.status === 'Suspended') {
      statusBadge = `<span class="badge badge-warning">موقوف</span>`;
    } else {
      statusBadge = `<span class="badge badge-neutral">مؤرشف</span>`;
    }

    const daysLabel = s.days && Array.isArray(s.days) && s.days.length > 0 ? s.days.join('، ') : (s.sessionDays ? s.sessionDays.join('، ') : 'غير محدد');
    const timeLabel = s.time || s.sessionTime || 'غير محدد';
    const pkgLabel = s.packageName ? `<span class="badge badge-primary student-pkg-badge-trigger" data-id="${s.id}" style="position:static; margin-top:0.25rem; cursor:pointer;" title="انقر لعرض تفاصيل الباقة والأرشيف"><i data-lucide="layers" style="width:10px;height:10px;display:inline;"></i> ${s.packageName}</span>` : '';

    const subTypeBadge = (s.subscriptionType === 'group' || s.groupId)
      ? `<span class="badge badge-info" style="position:static; margin-top:0.25rem;">مجموعة (${s.groupName || 'دراسي'})</span>`
      : `<span class="badge badge-neutral" style="position:static; margin-top:0.25rem;">فردي</span>`;

    let creditBadge = '';
    if (s.remainingLessons !== undefined) {
      const rem = parseInt(s.remainingLessons) || 0;
      if (rem < 0) {
        creditBadge = `<span class="badge badge-danger student-pkg-badge-trigger" data-id="${s.id}" style="position:static; margin-top:0.25rem; cursor:pointer;" title="انقر لإدارة الباقة والتجديد">عجز حصص: ${rem}</span>`;
      } else if (rem === 0) {
        creditBadge = `<span class="badge badge-danger student-pkg-badge-trigger" data-id="${s.id}" style="position:static; margin-top:0.25rem; cursor:pointer;" title="انقر لتجديد الباقة">0 حصة (منتهي)</span>`;
      } else if (rem <= 3) {
        creditBadge = `<span class="badge badge-warning student-pkg-badge-trigger" data-id="${s.id}" style="position:static; margin-top:0.25rem; cursor:pointer;" title="انقر لعرض رصيد الباقة">${rem} حصص متبقية</span>`;
      } else {
        creditBadge = `<span class="badge badge-success student-pkg-badge-trigger" data-id="${s.id}" style="position:static; margin-top:0.25rem; cursor:pointer;" title="انقر لعرض رصيد الباقة">${rem} حصة متبقية</span>`;
      }
    }

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.92rem;">${s.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">مواعيد: ${daysLabel} • ${timeLabel}</div>
          <div style="display:flex; gap:0.3rem; flex-wrap:wrap; margin-top:0.25rem;">${subTypeBadge} ${pkgLabel} ${creditBadge}</div>
        </td>
        <td>${s.age || 'غير مسجل'} سنة</td>
        <td><strong>${teacherName}</strong></td>
        <td>${s.sessionsCount || 0} حصة</td>
        <td><div style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size:0.8rem; color:var(--text-secondary);" title="${s.notes || ''}">${s.notes || 'لا يوجد ملاحظات'}</div></td>
        <td><strong style="color: var(--primary-color);">${(parseFloat(s.averageRating) || 5.0).toFixed(1)} / 5.0</strong></td>
        <td>${statusBadge}</td>
        <td>
          <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center;">
            <button class="btn btn-sm btn-secondary btn-view-packages" data-id="${s.id}" title="عرض تفاصيل الباقة الحالية وأرشيف الباقات السابقة" style="color: #4f46e5; border-color: #c7d2fe; display: flex; align-items: center; gap: 0.25rem; font-weight: 600;">
              <i data-lucide="layers" style="width:14px;height:14px;"></i> الباقات والأرشيف
            </button>
            <button class="btn btn-sm btn-secondary btn-wa-student" data-id="${s.id}" title="إرسال رسالة أو تذكير واتساب لولي الأمر" style="color: #16a34a; border-color: #86efac; display: flex; align-items: center; gap: 0.25rem;">
              <i data-lucide="message-square" style="width:14px;height:14px;"></i> واتساب
            </button>
            ${renderWarningCountBadge(s.waWarningCount || 0)}
            <button class="btn btn-sm btn-secondary btn-report-student" data-id="${s.id}" style="color: var(--primary-color);">
              <i data-lucide="file-text" style="width:14px;height:14px;"></i> تقرير
            </button>
            <button class="btn btn-sm btn-secondary btn-edit-student" data-id="${s.id}">
              <i data-lucide="edit-3" style="width:14px;height:14px;"></i> تعديل
            </button>
            <button class="btn btn-sm btn-danger btn-delete-student" data-id="${s.id}">
              <i data-lucide="archive" style="width:14px;height:14px;"></i> أرشيف
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // 2. Render Cards View
  gridContainer.innerHTML = paginatedStudents.map(s => {
    const teacher = teachersCached.find(t => t.uid === s.teacherId);
    const teacherName = teacher ? teacher.name : (s.teacherName || `<span style="color:var(--danger); font-weight:600;">غير معين</span>`);

    let statusBadge = '';
    if (s.status === 'active' || s.status === 'Active') {
      statusBadge = `<span class="badge badge-success">نشط</span>`;
    } else if (s.status === 'Suspended') {
      statusBadge = `<span class="badge badge-warning">موقوف</span>`;
    } else {
      statusBadge = `<span class="badge badge-neutral">مؤرشف</span>`;
    }

    const daysLabel = s.days && Array.isArray(s.days) && s.days.length > 0 ? s.days.join('، ') : (s.sessionDays ? s.sessionDays.join('، ') : 'غير محدد');
    const timeLabel = s.time || s.sessionTime || 'غير محدد';
    const pkgLabel = s.packageName ? `<span class="badge badge-primary student-pkg-badge-trigger" data-id="${s.id}" style="position:static; cursor:pointer;" title="انقر لعرض تفاصيل الباقة والأرشيف"><i data-lucide="layers" style="width:10px;height:10px;display:inline;"></i> ${s.packageName}</span>` : '';

    const subTypeBadge = (s.subscriptionType === 'group' || s.groupId)
      ? `<span class="badge badge-info" style="position:static;">مجموعة (${s.groupName || 'دراسي'})</span>`
      : `<span class="badge badge-neutral" style="position:static;">فردي</span>`;

    let creditBadge = '';
    if (s.remainingLessons !== undefined) {
      const rem = parseInt(s.remainingLessons) || 0;
      if (rem < 0) {
        creditBadge = `<span class="badge badge-danger student-pkg-badge-trigger" data-id="${s.id}" style="position:static; cursor:pointer;" title="انقر لإدارة الباقة والتجديد">عجز: ${rem}</span>`;
      } else if (rem === 0) {
        creditBadge = `<span class="badge badge-danger student-pkg-badge-trigger" data-id="${s.id}" style="position:static; cursor:pointer;" title="انقر لتجديد الباقة">0 حصة</span>`;
      } else if (rem <= 3) {
        creditBadge = `<span class="badge badge-warning student-pkg-badge-trigger" data-id="${s.id}" style="position:static; cursor:pointer;" title="انقر لعرض رصيد الباقة">${rem} متبقية</span>`;
      } else {
        creditBadge = `<span class="badge badge-success student-pkg-badge-trigger" data-id="${s.id}" style="position:static; cursor:pointer;" title="انقر لعرض رصيد الباقة">${rem} متبقية</span>`;
      }
    }

    return `
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 0.85rem;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.75rem;">
            <div>
              <strong style="font-size: 1rem; color: var(--text-primary); display: block;">${s.name}</strong>
              <span style="font-size: 0.78rem; color: var(--text-muted);">${s.age || 'غير مسجل'} سنة</span>
            </div>
            ${statusBadge}
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.75rem; background: var(--bg-primary); padding: 0.65rem; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="user-check" style="width: 14px; height: 14px; color: var(--primary-color);"></i>
              <span>المعلم: <strong>${teacherName}</strong></span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="calendar" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
              <span>${daysLabel} • ${timeLabel}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="star" style="width: 14px; height: 14px; color: var(--warning);"></i>
              <span>${s.sessionsCount || 0} حصة • تقييم: <strong style="color:var(--primary-color);">${(parseFloat(s.averageRating) || 5.0).toFixed(1)}/5.0</strong></span>
            </div>
          </div>

          <div style="margin-bottom: 0.5rem; display:flex; gap:0.35rem; flex-wrap:wrap;">${subTypeBadge} ${pkgLabel} ${creditBadge}</div>
          ${s.notes ? `<p style="font-size: 0.75rem; color: var(--text-muted); margin: 0; background: var(--bg-primary); padding: 0.4rem 0.6rem; border-radius: var(--border-radius-sm); line-height: 1.4; border: 1px solid var(--border-color);">${s.notes}</p>` : ''}
        </div>

        <div style="display: flex; gap: 0.35rem; border-top: 1px solid var(--border-color); padding-top: 0.65rem; flex-wrap: wrap;">
          <button class="btn btn-sm btn-secondary btn-view-packages" data-id="${s.id}" style="flex: 1 1 100%; justify-content: center; color: #4f46e5; border-color: #c7d2fe; display: flex; align-items: center; gap: 0.35rem; font-weight: 600;">
            <i data-lucide="layers" style="width: 14px; height: 14px;"></i> الباقات الحالية والأرشيف
          </button>
          <button class="btn btn-sm btn-secondary btn-wa-student" data-id="${s.id}" style="flex: 1 1 100%; justify-content: center; color: #16a34a; border-color: #86efac; display: flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="message-square" style="width: 14px; height: 14px;"></i> واتساب ولي الأمر ${renderWarningCountBadge(s.waWarningCount || 0)}
          </button>
          <button class="btn btn-sm btn-secondary btn-report-student" data-id="${s.id}" style="flex: 1 1 100%; justify-content: center; color: var(--primary-color);">
            <i data-lucide="file-text" style="width: 14px; height: 14px;"></i> بطاقة تقرير شهري
          </button>
          <button class="btn btn-sm btn-secondary btn-edit-student" data-id="${s.id}" style="flex: 1; justify-content: center;">
            <i data-lucide="edit-3" style="width: 13px; height: 13px;"></i> تعديل
          </button>
          <button class="btn btn-sm btn-danger btn-delete-student" data-id="${s.id}" style="flex: 1; justify-content: center;">
            <i data-lucide="archive" style="width: 13px; height: 13px;"></i> أرشيف
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Render pagination
  let pagEl = document.getElementById('studentsPaginationContainer');
  if (!pagEl) {
    pagEl = document.createElement('div');
    pagEl.id = 'studentsPaginationContainer';
    pagEl.style.marginTop = '1rem';
    const mainTableContainer = tbody.closest('.card') || tbody.parentElement;
    if (mainTableContainer) mainTableContainer.appendChild(pagEl);
  }
  
  if (pagEl) {
    pagEl.innerHTML = renderPaginationControls(currentStudentsPage, totalPages);
    pagEl.querySelectorAll('.btn-page').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentStudentsPage = parseInt(e.currentTarget.dataset.page);
        renderStudentsTable(filterText);
      });
    });
  }

  // Targeted Lucide Icon Update
  updateTargetIcons(tbody);
  updateTargetIcons(gridContainer);
}

// --- مودال الاعتماد وتحديد الباقة للطلب المعلق ---
function openApproveModal(id) {
  const student = pendingStudentsCached.find(s => s.id === id);
  if (!student) return;

  currentApprovingStudent = student;

  document.getElementById('approveStudentId').value = student.id;
  document.getElementById('approveStudentNameDisplay').textContent = student.name;
  document.getElementById('approveStudentTeacherDisplay').textContent = student.requestedByTeacherName || student.teacherName || 'غير محدد';

  populateTeachersDropdowns();
  populatePackageOptions();

  const teacherSelect = document.getElementById('approveTeacherSelect');
  const defaultTeacherId = student.requestedByTeacherId || student.teacherId;
  if (teacherSelect && defaultTeacherId) {
    teacherSelect.value = defaultTeacherId;
  }

  // Set default dates
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  document.getElementById('approveStartDate').value = today;
  document.getElementById('approveEndDate').value = thirtyDaysLater;

  const modal = document.getElementById('approveStudentModal');
  if (modal) modal.style.display = 'flex';
}

function closeApproveModal() {
  const modal = document.getElementById('approveStudentModal');
  if (modal) modal.style.display = 'none';
  currentApprovingStudent = null;
}

function setupApproveStudentModalHandlers() {
  document.getElementById('btnCloseApproveModalBtn')?.addEventListener('click', closeApproveModal);
  document.getElementById('btnCancelApproveStudent')?.addEventListener('click', closeApproveModal);

  const pkgSelect = document.getElementById('approvePackageSelect');
  if (pkgSelect) {
    pkgSelect.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      if (selectedOption && selectedOption.dataset.price) {
        document.getElementById('approvePackagePrice').value = selectedOption.dataset.price;
      }
      if (selectedOption && selectedOption.dataset.duration) {
        const durEl = document.getElementById('approveSessionDuration');
        if (durEl) durEl.value = selectedOption.dataset.duration;
      }
    });
  }

  const approveForm = document.getElementById('approveStudentForm');
  if (approveForm) {
    approveForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!currentApprovingStudent) return;

      const studentId = document.getElementById('approveStudentId').value;
      const pkgSelectEl = document.getElementById('approvePackageSelect');
      const selectedOption = pkgSelectEl.options[pkgSelectEl.selectedIndex];
      
      const packageName = selectedOption ? (selectedOption.dataset.name || selectedOption.text) : 'باقة تعليمية معتمدة';
      const packagePrice = parseFloat(document.getElementById('approvePackagePrice').value) || 0;
      const sessionDuration = parseInt(document.getElementById('approveSessionDuration')?.value) || 60;
      const teacherId = document.getElementById('approveTeacherSelect').value;
      const teacherObj = teachersCached.find(t => t.uid === teacherId);
      const teacherName = teacherObj ? teacherObj.name : currentApprovingStudent.teacherName;
      const startDate = document.getElementById('approveStartDate').value;
      const endDate = document.getElementById('approveEndDate').value;

      const submitBtn = document.getElementById('btnSubmitApproveStudent');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const targetGroupId = currentApprovingStudent.requestedGroupId || currentApprovingStudent.groupId || '';
        const subType = currentApprovingStudent.subscriptionType || (targetGroupId ? 'group' : 'individual');

        // 1. التحديث الفوري لحالة الطالب وربطه بالمعلم مع مدة الحصة المعتمدة
        await updateDoc(doc(db, "students", studentId), {
          status: 'active',
          teacherId: teacherId,
          teacherName: teacherName,
          packageName: packageName,
          packagePrice: packagePrice,
          sessionDuration: sessionDuration,
          packageDuration: sessionDuration,
          duration: sessionDuration,
          subscriptionType: subType,
          groupId: subType === 'group' ? targetGroupId : '',
          approvedAt: new Date().toISOString()
        });

        if (subType === 'group' && targetGroupId) {
          try {
            await addStudentToGroup(targetGroupId, studentId);
          } catch (gErr) {
            console.warn("إضافة الطالب للمجموعة أثناء الاعتماد:", gErr);
          }
        }

        // 2. تفعيل باقة الحصص المعتمدة وحساب الرصيد (Credits) للدارس
        const currentMonthKey = new Date().toISOString().substring(0, 7);
        const totalSessions = parseInt(selectedOption?.dataset?.sessions) || 8;
        
        await assignPackageToStudent({
          studentId: studentId,
          studentName: currentApprovingStudent.name,
          packageId: pkgSelectEl.value || null,
          packageName: packageName,
          totalLessons: totalSessions,
          lessonDuration: sessionDuration,
          price: packagePrice,
          discount: 0,
          startDate: startDate,
          expiryDate: endDate,
          notes: `تم التفعيل عند اعتماد الطالب بواسطة الإدارة`,
          actor: { uid: auth.currentUser?.uid || 'admin', name: loggedInAdminData?.name || 'مدير الأكاديمية' }
        });

        // إنشاء سجل الاشتراك للتوافق المالي الكلي
        await addDoc(collection(db, "subscriptions"), {
          studentId: studentId,
          studentName: currentApprovingStudent.name,
          month: currentMonthKey,
          packageName: packageName,
          planName: packageName,
          totalSessions: totalSessions,
          sessionDuration: sessionDuration,
          price: packagePrice,
          discount: 0,
          totalAmount: packagePrice,
          totalPaid: 0,
          remainingAmount: packagePrice,
          status: 'unpaid',
          startDate: startDate,
          endDate: endDate,
          createdAt: serverTimestamp()
        });

        // 3. إرسال إشعار للمعلم بقبول طلب إضافة الطالب وتعيينه رسمياً
        if (teacherId) {
          await addDoc(collection(db, "notifications"), {
            title: "تمت الموافقة على إضافة الطالب وتفعيل باقته 🎉",
            body: `وافقت إدارة الأكاديمية على إضافة الطالب (${currentApprovingStudent.name})، وتم تعيينك معلماً له وتفعيل باقته (${packageName}) بمدة حصة (${sessionDuration} دقيقة).`,
            recipientId: teacherId,
            readBy: [],
            createdAt: serverTimestamp()
          });
        }

        await writeAuditLog(auth.currentUser.uid, loggedInAdminData?.name || "المشرف", "APPROVE_STUDENT", studentId, {
          studentName: currentApprovingStudent.name,
          packageName: packageName
        });

        Toast.success(`تمت الموافقة على الطالب (${currentApprovingStudent.name}) واعتماد باقته بنجاح 🎉`);
        closeApproveModal();
      } catch (err) {
        console.error("خطأ اعتماد الطالب:", err);
        Toast.error("عذرًا، حدث خطأ أثناء تفعيل واعتماد الطالب.");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}

async function rejectStudentRequest(id) {
  const student = pendingStudentsCached.find(s => s.id === id);
  if (!student) return;

  showCustomConfirm(`هل أنت متأكد من رفض طلب إضافة الطالب (${student.name}) المقدم من المعلم؟`, async () => {
    try {
      await updateDoc(doc(db, "students", id), {
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      });

      if (student.teacherId) {
        await addDoc(collection(db, "notifications"), {
          title: "إشعار بشأن طلب إضافة طالب ⚠️",
          body: `تعذر قبول طلب إضافة الطالب (${student.name}). يرجى التواصل مع إدارة الأكاديمية للتفاصيل.`,
          recipientId: student.teacherId,
          readBy: [],
          createdAt: serverTimestamp()
        });
      }

      await writeAuditLog(auth.currentUser.uid, loggedInAdminData?.name || "المشرف", "REJECT_STUDENT_REQUEST", id, { studentName: student.name });
      Toast.success("تم رفض طلب إضافة الطالب بنجاح.");
    } catch (err) {
      console.error(err);
      Toast.error("حدث خطأ أثناء رفض الطلب.");
    }
  });
}

function openEditModal(id) {
  const s = studentsCached.find(item => item.id === id);
  if (!s) return;

  currentEditingStudentId = id;

  document.getElementById('editStudentName').value = s.name || '';
  document.getElementById('editStudentAge').value = s.age || '';
  const phoneEl = document.getElementById('editStudentPhone');
  if (phoneEl) phoneEl.value = s.phone || s.whatsapp || s.parentPhone || '';
  document.getElementById('editStudentStatus').value = s.status || 'active';
  document.getElementById('editStudentTeacher').value = s.teacherId || '';
  document.getElementById('editStudentTime').value = s.schedule?.uniformTime || s.time || s.sessionTime || '';
  document.getElementById('editStudentSessionsCount').value = s.sessionsCount || 0;
  document.getElementById('editStudentHoursCount').value = s.hoursCount || 0.00;
  document.getElementById('editStudentAverageRating').value = s.averageRating || 5.0;
  document.getElementById('editStudentNotes').value = s.notes || '';

  // Handle Subscription Type & Group Selection
  const subTypeSelect = document.getElementById('editSubscriptionType');
  const groupSelectContainer = document.getElementById('editGroupSelectContainer');
  const groupSelect = document.getElementById('editStudentGroupSelect');

  populateGroupDropdowns();

  if (subTypeSelect) {
    const isGroup = (s.subscriptionType === 'group' || !!s.groupId);
    subTypeSelect.value = isGroup ? 'group' : 'individual';
    if (groupSelectContainer) {
      groupSelectContainer.style.display = isGroup ? 'block' : 'none';
    }
    if (groupSelect && s.groupId) {
      groupSelect.value = s.groupId;
    }

    subTypeSelect.onchange = () => {
      const showGroup = subTypeSelect.value === 'group';
      if (groupSelectContainer) groupSelectContainer.style.display = showGroup ? 'block' : 'none';
    };

    if (groupSelect) {
      groupSelect.onchange = () => {
        const selectedOpt = groupSelect.options[groupSelect.selectedIndex];
        if (selectedOpt && selectedOpt.value) {
          const tId = selectedOpt.dataset.teacherid;
          const gDay = selectedOpt.dataset.day;
          const gTime = selectedOpt.dataset.time;
          
          if (tId) document.getElementById('editStudentTeacher').value = tId;
          if (gTime) document.getElementById('editStudentTime').value = gTime;

          if (gDay) {
            const cb = container?.querySelector(`input[value="${gDay}"]`);
            if (cb) cb.checked = true;
          }
        }
      };
    }
  }

  // Select Checkboxes
  const container = document.getElementById('editStudentDaysContainer');
  const studentDays = s.schedule?.days || s.days || s.sessionDays || [];
  if (container) {
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = studentDays.includes(cb.value);
    });
  }

  // Handle per-day times toggle & container
  const toggle = document.getElementById('editStudentDifferentTimesToggle');
  const diffContainer = document.getElementById('editStudentDifferentTimesContainer');

  if (toggle) {
    toggle.checked = s.schedule?.differentTimes || false;
  }

  function updateAdminPerDayTimesUI() {
    if (!toggle || !diffContainer) return;
    if (toggle.checked) {
      diffContainer.style.display = 'block';
      const selectedDays = [];
      container?.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (cb.checked) selectedDays.push(cb.value);
      });
      const defaultTime = document.getElementById('editStudentTime')?.value || "05:30 مساءً";
      renderAdminPerDayTimeInputs('editStudentPerDayTimesList', selectedDays, s.schedule?.times || {}, defaultTime);
    } else {
      diffContainer.style.display = 'none';
    }
  }

  if (toggle) toggle.onchange = updateAdminPerDayTimesUI;
  if (container) {
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.onchange = updateAdminPerDayTimesUI;
    });
  }

  updateAdminPerDayTimesUI();

  const modal = document.getElementById('editStudentModal');
  if (modal) modal.style.display = 'flex';
}

function closeEditModal() {
  const modal = document.getElementById('editStudentModal');
  if (modal) modal.style.display = 'none';
  currentEditingStudentId = null;
}

async function deleteStudent(id) {
  const s = studentsCached.find(item => item.id === id);
  if (!s) return;

  showCustomConfirm(`هل أنت متأكد من ترحيل الدارس (${s.name}) إلى سلة المحذوفات والأرشيف؟`, async () => {
    try {
      await softDeleteToTrash("students", id, s, `أرشفة وحذف الطالب من قبل المشرف العام`);
      await writeAuditLog(auth.currentUser.uid, loggedInAdminData?.name || "المشرف", "ARCHIVE_STUDENT", id, { studentName: s.name });
      Toast.success("تم ترحيل الطالب إلى سلة المحذوفات والأرشيف بنجاح.");
    } catch (err) {
      console.error(err);
      Toast.error("فشل ترحيل الطالب إلى سلة المحذوفات.");
    }
  });
}

// Setup adding a new student directly by Admin
function openAddStudentModalForm() {
  let modal = document.getElementById('addStudentModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'addStudentModal';
    modal.className = 'modal-overlay';
    
    const teacherOptions = teachersCached.map(t => `<option value="${t.uid}">${t.name}</option>`).join('');

    modal.innerHTML = `
      <div class="modal-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
          <h3 style="font-weight: 800; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="user-plus" style="color: var(--primary-color);"></i> تسجيل طالب جديد بالأكاديمية
          </h3>
          <span id="btnCloseAddModalBtn" style="cursor: pointer; padding: 0.25rem; display: flex; align-items: center; justify-content: center;">
            <i data-lucide="x" style="color: var(--text-muted);"></i>
          </span>
        </div>
        <form id="addStudentForm">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label for="addStudentName">اسم الدارس الجديد بالكامل</label>
              <input type="text" id="addStudentName" class="form-control" required placeholder="اكتب الاسم بالكامل">
            </div>
            <div class="form-group">
              <label for="addStudentAge">العمر</label>
              <input type="number" id="addStudentAge" class="form-control" required placeholder="مثال: 12">
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
            <div class="form-group">
              <label for="addSubscriptionType" style="font-weight: 700;">نوع الاشتراك</label>
              <select id="addSubscriptionType" class="form-control" style="border: 1px solid var(--border-color); width: 100%; font-weight: 600;">
                <option value="individual" selected>فردي 👤</option>
                <option value="group">مجموعة 👥</option>
              </select>
            </div>
            <div class="form-group" id="addGroupSelectContainer" style="display: none;">
              <label for="addStudentGroupSelect" style="font-weight: 700;">اختر المجموعة التابع لها</label>
              <select id="addStudentGroupSelect" class="form-control" style="border: 1px solid var(--border-color); width: 100%; font-weight: 600;">
                <option value="">-- اختر المجموعة --</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
            <div class="form-group">
              <label for="addStudentTeacher">المعلم المشرف المعتمد</label>
              <select id="addStudentTeacher" class="form-control" required>
                <option value="">اختر معلماً...</option>
                ${teacherOptions}
              </select>
            </div>
            <div class="form-group">
              <label for="addStudentTime">موعد الحصة الافتراضي</label>
              <select id="addStudentTime" class="form-control" style="border: 1px solid var(--border-color); width: 100%;">
                <option value="">-- اختر وقت الحصة --</option>
                <option value="08:00 صباحاً">08:00 صباحاً</option>
                <option value="08:30 صباحاً">08:30 صباحاً</option>
                <option value="09:00 صباحاً">09:00 صباحاً</option>
                <option value="09:30 صباحاً">09:30 صباحاً</option>
                <option value="10:00 صباحاً">10:00 صباحاً</option>
                <option value="10:30 صباحاً">10:30 صباحاً</option>
                <option value="11:00 صباحاً">11:00 صباحاً</option>
                <option value="11:30 صباحاً">11:30 صباحاً</option>
                <option value="12:00 مساءً">12:00 مساءً</option>
                <option value="12:30 مساءً">12:30 مساءً</option>
                <option value="01:00 مساءً">01:00 مساءً</option>
                <option value="01:30 مساءً">01:30 مساءً</option>
                <option value="02:00 مساءً">02:00 مساءً</option>
                <option value="02:30 مساءً">02:30 مساءً</option>
                <option value="03:00 مساءً">03:00 مساءً</option>
                <option value="03:30 مساءً">03:30 مساءً</option>
                <option value="04:00 مساءً">04:00 مساءً</option>
                <option value="04:30 مساءً">04:30 مساءً</option>
                <option value="05:00 مساءً">05:00 مساءً</option>
                <option value="05:30 مساءً" selected>05:30 مساءً</option>
                <option value="06:00 مساءً">06:00 مساءً</option>
                <option value="06:30 مساءً">06:30 مساءً</option>
                <option value="07:00 مساءً">07:00 مساءً</option>
                <option value="07:30 مساءً">07:30 مساءً</option>
                <option value="08:00 مساءً">08:00 مساءً</option>
                <option value="08:30 مساءً">08:30 مساءً</option>
                <option value="09:00 مساءً">09:00 مساءً</option>
                <option value="09:30 مساءً">09:30 مساءً</option>
                <option value="10:00 مساءً">10:00 مساءً</option>
                <option value="10:30 مساءً">10:30 مساءً</option>
                <option value="11:00 مساءً">11:00 مساءً</option>
                <option value="11:30 مساءً">11:30 مساءً</option>
              </select>
            </div>
          </div>
          
          <div class="form-group" style="margin-top: 1rem;">
            <label for="addStudentNotes">ملاحظات أولية أو أهداف الدراسة</label>
            <textarea id="addStudentNotes" class="form-control" rows="2" placeholder="اكتب مستوى الطالب التعليمي أو الأهداف التعليمية للمتابعة..."></textarea>
          </div>

          <h4 style="font-size: 0.85rem; font-weight: 800; color: var(--primary-color); margin-top: 1.5rem; margin-bottom: 1rem; border-right: 3px solid var(--primary-color); padding-right: 0.5rem; line-height: 1;">أيام الحصص المجدولة أسبوعيًا</h4>
          <div class="form-group">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;" id="addStudentDaysContainer">
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer;"><input type="checkbox" value="السبت"> السبت</label>
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer;"><input type="checkbox" value="الأحد"> الأحد</label>
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer;"><input type="checkbox" value="الاثنين"> الاثنين</label>
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer;"><input type="checkbox" value="الثلاثاء"> الثلاثاء</label>
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer;"><input type="checkbox" value="الأربعاء"> الأربعاء</label>
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer;"><input type="checkbox" value="الخميس"> الخميس</label>
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer;"><input type="checkbox" value="الجمعة"> الجمعة</label>
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
            <button type="submit" class="btn btn-primary">تسجيل وحفظ</button>
            <button type="button" class="btn btn-secondary" id="btnCancelAddStudent">إلغاء</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Bind events for Add modal
    modal.querySelector('#btnCloseAddModalBtn').addEventListener('click', () => modal.style.display = 'none');
    modal.querySelector('#btnCancelAddStudent').addEventListener('click', () => modal.style.display = 'none');

    const addSubTypeSelect = modal.querySelector('#addSubscriptionType');
    const addGroupContainer = modal.querySelector('#addGroupSelectContainer');
    const addGroupSelect = modal.querySelector('#addStudentGroupSelect');

    if (addSubTypeSelect) {
      addSubTypeSelect.addEventListener('change', () => {
        const isGroup = addSubTypeSelect.value === 'group';
        if (addGroupContainer) addGroupContainer.style.display = isGroup ? 'block' : 'none';
        if (isGroup) {
          populateGroupDropdowns();
        }
      });
    }

    if (addGroupSelect) {
      addGroupSelect.addEventListener('change', () => {
        const selectedOpt = addGroupSelect.options[addGroupSelect.selectedIndex];
        if (selectedOpt && selectedOpt.value) {
          const tId = selectedOpt.dataset.teacherid;
          const gDay = selectedOpt.dataset.day;
          const gTime = selectedOpt.dataset.time;

          if (tId) modal.querySelector('#addStudentTeacher').value = tId;
          if (gTime) modal.querySelector('#addStudentTime').value = gTime;

          if (gDay) {
            const cb = modal.querySelector(`#addStudentDaysContainer input[value="${gDay}"]`);
            if (cb) cb.checked = true;
          }
        }
      });
    }
    
    modal.querySelector('#addStudentForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector('button[type="submit"]');

      const name = modal.querySelector('#addStudentName').value.trim();
      const age = parseInt(modal.querySelector('#addStudentAge').value) || 0;
      const subType = modal.querySelector('#addSubscriptionType')?.value || 'individual';
      const selectedGroupId = modal.querySelector('#addStudentGroupSelect')?.value || '';
      const teacherId = modal.querySelector('#addStudentTeacher').value;
      const time = modal.querySelector('#addStudentTime').value.trim();
      const notes = modal.querySelector('#addStudentNotes').value.trim();

      let groupName = '';
      if (subType === 'group' && selectedGroupId) {
        const foundGroup = groupsCached.find(g => g.id === selectedGroupId);
        if (foundGroup) {
          groupName = foundGroup.name;
          if ((foundGroup.studentIds || []).length >= parseInt(foundGroup.maxStudents || 10)) {
            Toast.error(`المجموعة (${foundGroup.name}) وصلت للحد الأقصى للطلاب!`);
            return;
          }
        }
      }

      const days = [];
      modal.querySelectorAll('#addStudentDaysContainer input[type="checkbox"]').forEach(cb => {
        if (cb.checked) days.push(cb.value);
      });

      await TransactionProtector.executeProtected({
        opName: 'ADD_STUDENT',
        button: submitBtn,
        lockKey: `add_student_${name.toLowerCase()}`,
        idempotencyKey: `idem_add_student_${name.toLowerCase()}_${teacherId}`,
        duplicateCheck: async () => {
          return await TransactionProtector.checkDuplicate('students', [
            where('name', '==', name),
            where('status', '==', 'active')
          ], `الطالب (${name}) موجود مسبقاً بالنظام`);
        },
        actionFn: async () => {
          const teacherObj = teachersCached.find(t => t.uid === teacherId);
          const teacherName = teacherObj ? teacherObj.name : 'المعلم المعتمد';

          const studentData = {
            name,
            age,
            teacherId,
            teacherName,
            subscriptionType: subType,
            groupId: subType === 'group' ? selectedGroupId : null,
            groupName: subType === 'group' ? groupName : '',
            time,
            notes,
            days,
            sessionsCount: 0,
            hoursCount: 0,
            averageRating: 5.0,
            status: 'active',
            createdAt: new Date().toISOString()
          };

          const docRef = await addDoc(collection(db, "students"), studentData);

          if (subType === 'group' && selectedGroupId) {
            await addStudentToGroup(selectedGroupId, docRef.id);
          }

          await writeAuditLog(auth.currentUser.uid, loggedInAdminData?.name || "المشرف", "ADD_STUDENT", docRef.id, { studentName: name });
          modal.style.display = 'none';
          modal.querySelector('#addStudentForm').reset();
          return { id: docRef.id };
        },
        successMsg: `تم تسجيل الطالب (${name}) بنجاح وتعيينه للمشرف.`
      });
    });
  }

  populateTeachersDropdowns();
  populateGroupDropdowns();
  modal.style.display = 'flex';
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('adminStudentSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      currentStudentsPage = 1;
      renderStudentsTable(e.target.value);
    }, 250));
  }

  // Delegated action handlers for table & grid
  const handleActionClick = (e) => {
    const btnViewPkg = e.target.closest('.btn-view-packages') || e.target.closest('.student-pkg-badge-trigger');
    if (btnViewPkg) {
      const id = btnViewPkg.dataset.id;
      if (id) openStudentPackagesModal(id);
      return;
    }

    const btnWa = e.target.closest('.btn-wa-student');
    if (btnWa) {
      const id = btnWa.dataset.id;
      const studentObj = studentsCached.find(st => st.id === id);
      if (studentObj) {
        openWhatsAppReminderWidget({
          student: studentObj,
          templateType: (studentObj.remainingLessons !== undefined && parseInt(studentObj.remainingLessons) <= 0) ? 'overdraft' : 'statement'
        });
      }
      return;
    }

    const btnReport = e.target.closest('.btn-report-student');
    if (btnReport) {
      const id = btnReport.dataset.id;
      const studentObj = studentsCached.find(st => st.id === id);
      if (studentObj) openStudentReportModal(id, studentObj);
      return;
    }

    const btnEdit = e.target.closest('.btn-edit-student');
    if (btnEdit) {
      const id = btnEdit.dataset.id;
      openEditModal(id);
      return;
    }

    const btnDelete = e.target.closest('.btn-delete-student');
    if (btnDelete) {
      const id = btnDelete.dataset.id;
      deleteStudent(id);
      return;
    }
  };

  const tbody = document.getElementById('studentsTableBody');
  if (tbody && !tbody.dataset.listenerAttached) {
    tbody.addEventListener('click', handleActionClick);
    tbody.dataset.listenerAttached = 'true';
  }

  const gridContainer = document.getElementById('studentsGridContainer');
  if (gridContainer && !gridContainer.dataset.listenerAttached) {
    gridContainer.addEventListener('click', handleActionClick);
    gridContainer.dataset.listenerAttached = 'true';
  }

  const btnList = document.getElementById('btnListView');
  const btnGrid = document.getElementById('btnGridView');

  if (btnList && btnGrid) {
    btnList.addEventListener('click', () => {
      currentViewMode = 'table';
      localStorage.setItem('admin_students_view_mode', 'table');
      const filterText = searchInput ? searchInput.value : '';
      renderStudentsTable(filterText);
    });

    btnGrid.addEventListener('click', () => {
      currentViewMode = 'grid';
      localStorage.setItem('admin_students_view_mode', 'grid');
      const filterText = searchInput ? searchInput.value : '';
      renderStudentsTable(filterText);
    });
  }

  const btnOpenAdd = document.getElementById('openAddStudentModal');
  if (btnOpenAdd) {
    btnOpenAdd.addEventListener('click', () => {
      openAddStudentModalForm();
    });
  }

  const btnCloseEdit = document.getElementById('btnCloseEditModalBtn');
  if (btnCloseEdit) btnCloseEdit.addEventListener('click', closeEditModal);

  const btnCancelEdit = document.getElementById('btnCancelEditStudent');
  if (btnCancelEdit) btnCancelEdit.addEventListener('click', closeEditModal);

  const editForm = document.getElementById('editStudentForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!currentEditingStudentId) return;

      const name = document.getElementById('editStudentName').value.trim();
      const age = parseInt(document.getElementById('editStudentAge').value) || 0;
      const phone = document.getElementById('editStudentPhone')?.value.trim() || '';
      const status = document.getElementById('editStudentStatus').value;
      const teacherId = document.getElementById('editStudentTeacher').value;
      const time = document.getElementById('editStudentTime').value.trim();
      const sessionsCount = parseInt(document.getElementById('editStudentSessionsCount').value) || 0;
      const hoursCount = parseFloat(document.getElementById('editStudentHoursCount').value) || 0.00;
      const averageRating = parseFloat(document.getElementById('editStudentAverageRating').value) || 5.0;
      const notes = document.getElementById('editStudentNotes').value.trim();

      const days = [];
      document.querySelectorAll('#editStudentDaysContainer input[type="checkbox"]').forEach(cb => {
        if (cb.checked) days.push(cb.value);
      });

      const toggle = document.getElementById('editStudentDifferentTimesToggle');
      const isDiffTimes = toggle ? toggle.checked : false;
      const perDayTimes = {};
      if (isDiffTimes) {
        document.querySelectorAll('#editStudentPerDayTimesList select.admin-day-time-select').forEach(sel => {
          if (sel.dataset.day && sel.value) {
            perDayTimes[sel.dataset.day] = sel.value;
          }
        });
      }

      const mainTime = time || (Object.values(perDayTimes)[0] || "غير محدد");

      const subType = document.getElementById('editSubscriptionType')?.value || 'individual';
      const selectedGroupId = document.getElementById('editStudentGroupSelect')?.value || '';

      const currentStudent = studentsCached.find(st => st.id === currentEditingStudentId);
      const previousGroupId = currentStudent ? currentStudent.groupId : null;

      let groupName = '';
      if (subType === 'group' && selectedGroupId) {
        const foundGroup = groupsCached.find(g => g.id === selectedGroupId);
        if (foundGroup) {
          groupName = foundGroup.name;
          // Check capacity if moving to a different group
          if (previousGroupId !== selectedGroupId && (foundGroup.studentIds || []).length >= parseInt(foundGroup.maxStudents || 10)) {
            Toast.error(`المجموعة (${foundGroup.name}) وصلت للحد الأقصى للطلاب!`);
            return;
          }
        }
      }

      try {
        const teacherObj = teachersCached.find(t => t.uid === teacherId);
        const teacherName = teacherObj ? teacherObj.name : '';

        await updateDoc(doc(db, "students", currentEditingStudentId), {
          name,
          age,
          phone,
          whatsapp: phone,
          parentPhone: phone,
          status,
          teacherId,
          ...(teacherName ? { teacherName } : {}),
          subscriptionType: subType,
          groupId: subType === 'group' ? selectedGroupId : null,
          groupName: subType === 'group' ? groupName : '',
          time: mainTime,
          sessionTime: mainTime,
          sessionsCount,
          hoursCount,
          averageRating,
          notes,
          days,
          sessionDays: days,
          schedule: {
            days,
            uniformTime: mainTime,
            differentTimes: isDiffTimes,
            times: perDayTimes
          }
        });

        // Sync student ID with group studentIds array
        if (subType === 'group' && selectedGroupId) {
          if (previousGroupId && previousGroupId !== selectedGroupId) {
            await removeStudentFromGroup(previousGroupId, currentEditingStudentId);
          }
          await addStudentToGroup(selectedGroupId, currentEditingStudentId);
        } else if (subType === 'individual' && previousGroupId) {
          await removeStudentFromGroup(previousGroupId, currentEditingStudentId);
        }

        await writeAuditLog(auth.currentUser.uid, loggedInAdminData.name || "المشرف", "EDIT_STUDENT", currentEditingStudentId, { studentName: name });
        Toast.success("تم تحديث كافة حقول الدارس بنجاح.");
        closeEditModal();
      } catch (err) {
        console.error(err);
        Toast.error("فشل تحديث بيانات الدارس.");
      }
    });
  }

  // Package Archive Modal Listeners
  document.getElementById('btnCloseStudentPackagesModal')?.addEventListener('click', closeStudentPackagesModal);
  document.getElementById('btnClosePackagesModalBtn')?.addEventListener('click', closeStudentPackagesModal);
  document.getElementById('btnQuickRenewFromModal')?.addEventListener('click', () => {
    if (currentStudentPackagesModalStudentId) {
      openQuickRenewModal(currentStudentPackagesModalStudentId);
    }
  });

  // Archive Section Toggle Listener
  document.getElementById('btnToggleArchiveSection')?.addEventListener('click', toggleStudentArchiveSection);

  // Quick Renew Modal Listeners
  document.getElementById('btnCloseQuickRenewModal')?.addEventListener('click', closeQuickRenewModal);
  document.getElementById('btnCancelQuickRenew')?.addEventListener('click', closeQuickRenewModal);

  const renewTemplateSelect = document.getElementById('renewPackageTemplateSelect');
  if (renewTemplateSelect) {
    renewTemplateSelect.addEventListener('change', (e) => {
      const opt = e.target.options[e.target.selectedIndex];
      if (opt && opt.dataset.sessions) {
        const sessEl = document.getElementById('renewPackageTotalLessons');
        if (sessEl) sessEl.value = opt.dataset.sessions;
      }
      if (opt && opt.dataset.price) {
        const priceEl = document.getElementById('renewPackagePrice');
        if (priceEl) priceEl.value = opt.dataset.price;
      }
      if (opt && opt.dataset.duration) {
        const durEl = document.getElementById('renewPackageDuration');
        if (durEl) durEl.value = opt.dataset.duration;
      }
    });
  }

  const quickRenewForm = document.getElementById('quickRenewStudentForm');
  if (quickRenewForm) {
    quickRenewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btnSubmitQuickRenew');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const studentId = document.getElementById('renewModalStudentId').value;
        const student = studentsCached.find(s => s.id === studentId);
        const studentName = student ? student.name : 'طالب';

        const tplSelect = document.getElementById('renewPackageTemplateSelect');
        const opt = tplSelect ? tplSelect.options[tplSelect.selectedIndex] : null;
        const packageName = opt && opt.value ? (opt.dataset.name || opt.text) : 'باقة حصص مجددة';

        const totalLessons = parseInt(document.getElementById('renewPackageTotalLessons').value, 10) || 8;
        const price = parseFloat(document.getElementById('renewPackagePrice').value) || 0;
        const lessonDuration = parseInt(document.getElementById('renewPackageDuration').value, 10) || 60;
        const startDate = document.getElementById('renewPackageStartDate').value || new Date().toISOString().split('T')[0];
        const notes = document.getElementById('renewPackageNotes').value.trim();

        await assignPackageToStudent({
          studentId,
          studentName,
          packageId: tplSelect?.value || 'pkg_renew',
          packageName,
          totalLessons,
          lessonDuration,
          price,
          totalAmount: price,
          totalPaid: 0,
          startDate,
          notes,
          reason: 'تجديد باقة وأرشفة الباقة السابقة',
          actor: {
            uid: auth.currentUser?.uid || 'admin',
            name: loggedInAdminData?.name || auth.currentUser?.displayName || 'مدير الأكاديمية'
          }
        });

        Toast.success(`تم تجديد باقة (${studentName}) وتفعيل ${totalLessons} حصص وأرشفة الباقة السابقة بنجاح! 🔄`);
        closeQuickRenewModal();

        // Refresh modal if still open
        if (currentStudentPackagesModalStudentId === studentId) {
          await openStudentPackagesModal(studentId);
        }
      } catch (err) {
        console.error(err);
        Toast.error(err.message || "حدث خطأ أثناء تجديد باقة الدارس.");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}

// --- إدارة باقات واشتراكات الدارس والأرشيف الاحترافي ---
let currentStudentPackagesModalStudentId = null;
let currentArchivedPackagesCount = 0;

function toggleStudentArchiveSection() {
  const container = document.getElementById('studentArchiveCollapsibleContainer');
  const btn = document.getElementById('btnToggleArchiveSection');
  const text = document.getElementById('archiveToggleText');
  const icon = document.getElementById('archiveToggleIcon');

  if (!container) return;

  const isHidden = container.style.display === 'none' || !container.style.display;
  if (isHidden) {
    container.style.display = 'block';
    if (text) text.textContent = 'إخفاء أرشيف الاشتراكات 🔼';
    if (btn) {
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
    }
    if (icon) icon.setAttribute('data-lucide', 'eye-off');
  } else {
    container.style.display = 'none';
    if (text) text.textContent = `عرض أرشيف الاشتراكات (${currentArchivedPackagesCount}) 📦`;
    if (btn) {
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-secondary');
    }
    if (icon) icon.setAttribute('data-lucide', 'eye');
  }
  if (window.lucide) window.lucide.createIcons();
}

async function openStudentPackagesModal(studentId) {
  currentStudentPackagesModalStudentId = studentId;
  const student = studentsCached.find(s => s.id === studentId);
  const studentName = student ? student.name : 'طالب';

  const subtitle = document.getElementById('packagesModalStudentSubtitle');
  if (subtitle) {
    subtitle.innerHTML = `الدارس: <strong style="color: var(--text-primary);">${studentName}</strong> (معرف: ${studentId})`;
  }

  const activeContainer = document.getElementById('activePackageContainer');
  const archiveTbody = document.getElementById('studentArchiveTableBody');
  const archiveCountBadge = document.getElementById('archiveCountBadge');
  const archiveContainer = document.getElementById('studentArchiveCollapsibleContainer');
  const btnToggle = document.getElementById('btnToggleArchiveSection');
  const toggleText = document.getElementById('archiveToggleText');
  const toggleIcon = document.getElementById('archiveToggleIcon');

  // Reset archive toggle to collapsed by default
  if (archiveContainer) archiveContainer.style.display = 'none';
  if (btnToggle) {
    btnToggle.classList.remove('btn-primary');
    btnToggle.classList.add('btn-secondary');
  }
  if (toggleIcon) toggleIcon.setAttribute('data-lucide', 'eye');
  if (toggleText) toggleText.textContent = 'عرض أرشيف الاشتراكات (0) 📦';

  if (activeContainer) {
    activeContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">جاري تحميل تفاصيل الباقة الحالية...</div>`;
  }
  if (archiveTbody) {
    archiveTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">جاري تحميل أرشيف الاشتراكات...</td></tr>`;
  }

  const modal = document.getElementById('studentPackagesModal');
  if (modal) modal.style.display = 'flex';

  try {
    const archiveData = await getStudentPackagesArchive(studentId);
    const { activePackage, archivedPackages } = archiveData;
    currentArchivedPackagesCount = archivedPackages.length;

    // 1. Render Active Package
    if (activeContainer) {
      if (!activePackage) {
        activeContainer.innerHTML = `
          <div style="background: rgba(239, 68, 68, 0.04); border: 1px dashed var(--danger); border-radius: 10px; padding: 1.25rem; text-align: center;">
            <div style="font-weight: 700; color: var(--danger); font-size: 0.95rem; margin-bottom: 0.5rem;">
              لا توجد باقة نشطة حالياً لهذا الدارس
            </div>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;">
              يمكنك تفعيل باقة جديدة وتعيين رصيد الحصص فوراً من خلال زر التجديد السريع.
            </p>
            <button type="button" class="btn btn-sm btn-primary btn-open-renew-from-empty" style="background: var(--primary-color); border-color: var(--primary-color);">
              <i data-lucide="plus-circle" style="width: 14px; height: 14px;"></i> تفعيل وإسناد باقة جديدة
            </button>
          </div>
        `;
        activeContainer.querySelector('.btn-open-renew-from-empty')?.addEventListener('click', () => {
          openQuickRenewModal(studentId);
        });
      } else {
        const total = parseInt(activePackage.totalLessons) || 0;
        const used = parseInt(activePackage.usedLessons) || 0;
        const remaining = parseInt(activePackage.remainingLessons) || 0;
        const percentUsed = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
        const isOverdraft = remaining < 0;

        let statusBadge = `<span class="badge" style="background: rgba(16,185,129,0.12); color: var(--success); font-weight: 800;">نشط 🟢</span>`;
        if (isOverdraft) {
          statusBadge = `<span class="badge" style="background: rgba(239,68,68,0.15); color: var(--danger); font-weight: 800;">عجز حصص (دين) ⚠️</span>`;
        } else if (remaining === 0) {
          statusBadge = `<span class="badge" style="background: rgba(239,68,68,0.12); color: var(--danger); font-weight: 800;">منتهي (0 متبقي) ❌</span>`;
        }

        const renewalBadge = activePackage.renewalCount && activePackage.renewalCount > 1
          ? `<span class="badge" style="background: rgba(99, 102, 241, 0.12); color: var(--primary-color); font-weight: 700; display: inline-flex; align-items: center; gap: 0.2rem;">
              <i data-lucide="refresh-cw" style="width: 10px; height: 10px;"></i> دورة تجديد #${activePackage.renewalCount}
            </span>`
          : `<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success); font-weight: 700;">الباقة الحالية</span>`;

        const price = parseFloat(activePackage.price) || 0;
        const totalAmount = parseFloat(activePackage.totalAmount) || price;
        const totalPaid = parseFloat(activePackage.totalPaid) || 0;
        const remainingAmount = Math.max(0, totalAmount - totalPaid);

        activeContainer.innerHTML = `
          <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 10px; padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <strong style="font-size: 1.1rem; color: var(--text-primary);">${activePackage.packageName || 'باقة الحصص'}</strong>
                  ${renewalBadge}
                </div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                  ⏱️ مدة الحصة: <strong>${activePackage.lessonDuration || 30} دقيقة</strong> | 💰 السعر: <strong>${totalAmount} ج.م</strong> (${remainingAmount === 0 ? 'مسدد بالكامل' : `متبقي: ${remainingAmount} ج.م`})
                </div>
              </div>
              <div>${statusBadge}</div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
              <div style="background: var(--card-bg, #fff); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.65rem 0.85rem; text-align: center;">
                <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">إجمالي الحصص</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-top: 0.2rem;">${total}</div>
              </div>
              <div style="background: var(--card-bg, #fff); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.65rem 0.85rem; text-align: center;">
                <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">المستخدم (المستهلك)</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: #d97706; margin-top: 0.2rem;">${used}</div>
              </div>
              <div style="background: var(--card-bg, #fff); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.65rem 0.85rem; text-align: center;">
                <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">المتبقي</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: ${isOverdraft || remaining === 0 ? 'var(--danger)' : 'var(--success)'}; margin-top: 0.2rem;">${remaining}</div>
              </div>
              <div style="background: var(--card-bg, #fff); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.65rem 0.85rem; text-align: center;">
                <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">تاريخ البداية</div>
                <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-top: 0.35rem;">${activePackage.startDate || '-'}</div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 0.35rem;">
                <span style="color: var(--text-secondary); font-weight: 600;">نسبة استهلاك رصيد الحصص:</span>
                <span style="color: var(--text-primary); font-weight: 800;">${percentUsed}% (${used}/${total} حصة)</span>
              </div>
              <div style="width: 100%; height: 8px; background: rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden;">
                <div style="width: ${percentUsed}%; height: 100%; background: ${isOverdraft || remaining === 0 ? 'var(--danger)' : (remaining <= 3 ? '#d97706' : 'var(--success)')}; transition: width 0.3s ease;"></div>
              </div>
            </div>
          </div>
        `;
      }
    }

    // 2. Render Archive Table & Badge
    if (archiveCountBadge) {
      archiveCountBadge.textContent = `${archivedPackages.length} باقة سابقة`;
    }
    if (toggleText) {
      toggleText.textContent = `عرض أرشيف الاشتراكات (${archivedPackages.length}) 📦`;
    }

    if (archiveTbody) {
      if (archivedPackages.length === 0) {
        archiveTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">لا توجد باقات سابقة في الأرشيف (هذه هي الباقة الأولى للدارس).</td></tr>`;
      } else {
        archiveTbody.innerHTML = archivedPackages.map((pkg, idx) => {
          const used = parseInt(pkg.usedLessons) || 0;
          const total = parseInt(pkg.totalLessons) || 0;
          const remaining = parseInt(pkg.remainingLessons) || 0;
          const price = parseFloat(pkg.price) || 0;
          const totalAmount = parseFloat(pkg.totalAmount) || price;
          const totalPaid = parseFloat(pkg.totalPaid) || totalAmount;
          const remainingAmount = Math.max(0, totalAmount - totalPaid);

          return `
            <tr style="background: rgba(100, 116, 139, 0.02);">
              <td>
                <strong style="color: var(--text-primary); font-size: 0.88rem;">${pkg.packageName || 'باقة حصص'}</strong>
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.1rem;">معرف: ${pkg.id ? pkg.id.slice(0, 8) : '-'}</div>
              </td>
              <td>
                <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">من: ${pkg.startDate || '-'}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.1rem;">إلى: ${pkg.endDate || pkg.expiryDate || 'تاريخ الأرشفة'}</div>
              </td>
              <td>
                <strong style="color: var(--primary-color); font-size: 0.88rem;">${used} / ${total}</strong>
                <div style="font-size: 0.7rem; color: var(--text-muted);">${remaining <= 0 ? 'مكتملة بالكامل ✅' : `متبقي: ${remaining}`}</div>
              </td>
              <td>
                <strong style="color: var(--text-primary); font-size: 0.85rem;">${totalAmount} ج.م</strong>
                <div style="font-size: 0.72rem; color: ${remainingAmount === 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 700; margin-top: 0.1rem;">
                  ${remainingAmount === 0 ? 'مسدد بالكامل' : `متبقي: ${remainingAmount} ج.م`}
                </div>
              </td>
              <td><span class="badge" style="background: rgba(100,116,139,0.15); color: #475569; font-weight: 800; border: 1px solid rgba(100,116,139,0.3);">مؤرشفة 📦</span></td>
              <td><span class="badge" style="background: rgba(99, 102, 241, 0.1); color: var(--primary-color); font-weight: 700;">دورة #${pkg.renewalCount || (archivedPackages.length - idx)}</span></td>
              <td>
                <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-primary);">${pkg.lastReceiptId || pkg.receiptNumber || 'محفوظ محاسبياً'}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.1rem;">${pkg.lastPaymentDate || pkg.archivedAt?.toDate ? pkg.archivedAt.toDate().toLocaleDateString('ar-EG') : (pkg.paymentMethod || 'مسجل')}</div>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error("Failed to load student packages archive:", err);
    if (activeContainer) {
      activeContainer.innerHTML = `<div style="color: var(--danger); padding: 1rem; text-align: center;">حدث خطأ أثناء تحميل باقات الطالب.</div>`;
    }
  }
}

function closeStudentPackagesModal() {
  const modal = document.getElementById('studentPackagesModal');
  if (modal) modal.style.display = 'none';
}

function openQuickRenewModal(studentId) {
  const student = studentsCached.find(s => s.id === studentId);
  const studentName = student ? student.name : 'طالب';

  document.getElementById('renewModalStudentId').value = studentId;
  const nameDisplay = document.getElementById('renewStudentNameDisplay');
  if (nameDisplay) nameDisplay.textContent = `الدارس: ${studentName}`;

  // Populate template select
  const tplSelect = document.getElementById('renewPackageTemplateSelect');
  if (tplSelect) {
    if (packagesCached.length > 0) {
      tplSelect.innerHTML = `<option value="">-- اختر باقة للتجديد --</option>` +
        packagesCached.map(p => {
          const sess = getPackageSessionCount(p);
          const dur = p.duration || p.sessionDuration || p.lessonDuration || 60;
          return `<option value="${p.id}" data-name="${p.name}" data-price="${p.price}" data-sessions="${sess}" data-duration="${dur}">${p.name} (${p.price} ج.م - ${sess} حصص)</option>`;
        }).join('');
    } else {
      tplSelect.innerHTML = `
        <option value="">-- اختر باقة للتجديد --</option>
        <option value="pkg_4" data-name="باقة 4 حصص" data-price="300" data-sessions="4" data-duration="60">باقة 4 حصص (300 ج.م)</option>
        <option value="pkg_8" data-name="باقة 8 حصص" data-price="500" data-sessions="8" data-duration="60">باقة 8 حصص (500 ج.م)</option>
        <option value="pkg_12" data-name="باقة 12 حصة" data-price="700" data-sessions="12" data-duration="60">باقة 12 حصة (700 ج.م)</option>
      `;
    }
  }

  // Default dates
  const today = new Date().toISOString().split('T')[0];
  const startDateInput = document.getElementById('renewPackageStartDate');
  if (startDateInput) startDateInput.value = today;

  const modal = document.getElementById('quickRenewStudentModal');
  if (modal) modal.style.display = 'flex';
}

function closeQuickRenewModal() {
  const modal = document.getElementById('quickRenewStudentModal');
  if (modal) modal.style.display = 'none';
}
