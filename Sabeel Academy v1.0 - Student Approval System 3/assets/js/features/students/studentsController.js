import { db, auth } from '../../config/firebase.js';
import { collection, onSnapshot, doc, getDoc, updateDoc, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { protectRoute } from '../auth/authService.js';
import { renderSidebar } from '../../shared/components/sidebar.js';
import { renderNavbar } from '../../shared/components/navbar.js';
import { Toast } from '../../shared/utils/toast.js';
import { softDeleteToTrash } from '../trash/trashService.js';
import { writeAuditLog } from '../audit/auditService.js';

protectRoute('admin');

let studentsCached = [];
let teachersCached = [];
let loggedInAdminData = null;
let currentEditingStudentId = null;

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
  // 1. Fetch approved teachers to populate assignment selects
  onSnapshot(collection(db, "users"), (snapshot) => {
    teachersCached = [];
    snapshot.forEach(docSnap => {
      const userData = docSnap.data();
      if (userData.role === 'teacher' && userData.status === 'approved') {
        teachersCached.push({ uid: docSnap.id, ...userData });
      }
    });

    populateTeachersDropdowns();

    // 2. Fetch students
    onSnapshot(collection(db, "students"), (studentsSnapshot) => {
      studentsCached = [];
      studentsSnapshot.forEach(docSnap => {
        studentsCached.push({ id: docSnap.id, ...docSnap.data() });
      });

      renderStudentsTable();
    });
  });

  setupEventListeners();
}

function populateTeachersDropdowns() {
  const editSelect = document.getElementById('editStudentTeacher');
  if (!editSelect) return;

  const optionsHtml = teachersCached.map(t => `<option value="${t.uid}">${t.name}</option>`).join('');
  editSelect.innerHTML = `<option value="">اختر معلماً مشرفاً...</option>` + optionsHtml;
}

function renderStudentsTable(filterText = "") {
  const tbody = document.getElementById('studentsTableBody');
  if (!tbody) return;

  const filtered = studentsCached.filter(s => {
    const nameMatch = s.name && s.name.toLowerCase().includes(filterText.toLowerCase());
    return nameMatch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">لا يوجد طلاب مطابقين للبحث.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const teacher = teachersCached.find(t => t.uid === s.teacherId);
    const teacherName = teacher ? teacher.name : `<span style="color:var(--danger); font-weight:700;">غير معين ⚠️</span>`;
    
    let statusBadge = '';
    if (s.status === 'active' || s.status === 'Active') {
      statusBadge = `<span style="background-color: var(--success-light); color: var(--success); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">نشط ✅</span>`;
    } else if (s.status === 'Suspended') {
      statusBadge = `<span style="background-color: var(--warning-light); color: var(--warning); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">موقوف ⚠️</span>`;
    } else {
      statusBadge = `<span style="background-color: var(--secondary-light); color: var(--secondary-color); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">مؤرشف 📦</span>`;
    }

    const daysLabel = s.days && Array.isArray(s.days) && s.days.length > 0 ? s.days.join('، ') : 'غير محدد';
    const timeLabel = s.time ? s.time : 'غير محدد';

    return `
      <tr>
        <td>
          <div style="font-weight: 800; color: var(--text-primary);">${s.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">مواعيد: ${daysLabel} • ${timeLabel}</div>
        </td>
        <td>${s.age || 'غير مسجل'} سنة</td>
        <td><strong>${teacherName}</strong></td>
        <td>${s.sessionsCount || 0} حصة</td>
        <td><div style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size:0.8rem; color:var(--text-secondary);" title="${s.notes || ''}">${s.notes || 'لا يوجد ملاحظات'}</div></td>
        <td><strong style="color: var(--primary-color);">${(parseFloat(s.averageRating) || 5.0).toFixed(1)} / 5.0</strong></td>
        <td>${statusBadge}</td>
        <td>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-edit-student" data-id="${s.id}" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;"><i data-lucide="edit-3"></i> تعديل</button>
            <button class="btn btn-danger btn-delete-student" data-id="${s.id}" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;"><i data-lucide="trash-2"></i> أرشيف</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind Actions
  tbody.querySelectorAll('.btn-edit-student').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      openEditModal(id);
    });
  });

  tbody.querySelectorAll('.btn-delete-student').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      deleteStudent(id);
    });
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

const TIME_OPTIONS = [
  "", "08:00 صباحاً", "08:30 صباحاً", "09:00 صباحاً", "09:30 صباحاً",
  "10:00 صباحاً", "10:30 صباحاً", "11:00 صباحاً", "11:30 صباحاً",
  "12:00 مساءً", "12:30 مساءً", "01:00 مساءً", "01:30 مساءً",
  "02:00 مساءً", "02:30 مساءً", "03:00 مساءً", "03:30 مساءً",
  "04:00 مساءً", "04:30 مساءً", "05:00 مساءً", "05:30 مساءً",
  "06:00 مساءً", "06:30 مساءً", "07:00 مساءً", "07:30 مساءً",
  "08:00 مساءً", "08:30 مساءً", "09:00 مساءً", "09:30 مساءً",
  "10:00 مساءً", "10:30 مساءً", "11:00 مساءً", "11:30 مساءً"
];

const DAYS_LIST = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

function getTimeOptionsHtml(selectedValue = "") {
  let found = false;
  let html = `<option value="" ${!selectedValue ? 'selected' : ''}>-- اختر الموعد --</option>`;
  TIME_OPTIONS.slice(1).forEach(time => {
    const isSel = selectedValue === time;
    if (isSel) found = true;
    html += `<option value="${time}" ${isSel ? 'selected' : ''}>${time}</option>`;
  });
  if (selectedValue && !found) {
    html += `<option value="${selectedValue}" selected>${selectedValue}</option>`;
  }
  return html;
}

function renderPerDayGridHtml(containerId, timesObj = {}, daysArray = []) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = DAYS_LIST.map(day => {
    const isChecked = daysArray.includes(day) || Boolean(timesObj[day]);
    const dayTime = timesObj[day] || "";
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.5rem 0.75rem; background: var(--bg-secondary); border-radius: 6px; border: 1px solid var(--border-color);">
        <label style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 0.85rem; color: var(--text-primary); cursor: pointer;">
          <input type="checkbox" class="per-day-cb" data-day="${day}" ${isChecked ? 'checked' : ''}>
          ${day}
        </label>
        <select class="form-control per-day-time-select" data-day="${day}" style="max-width: 220px; font-size: 0.85rem;" ${!isChecked ? 'disabled' : ''}>
          ${getTimeOptionsHtml(dayTime)}
        </select>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.per-day-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const day = e.target.dataset.day;
      const select = container.querySelector(`.per-day-time-select[data-day="${day}"]`);
      if (select) {
        select.disabled = !e.target.checked;
      }
    });
  });
}

function openEditModal(id) {
  const s = studentsCached.find(item => item.id === id);
  if (!s) return;

  currentEditingStudentId = id;

  document.getElementById('editStudentName').value = s.name || '';
  document.getElementById('editStudentAge').value = s.age || '';
  document.getElementById('editStudentStatus').value = s.status || 'active';
  document.getElementById('editStudentTeacher').value = s.teacherId || '';
  
  if (document.getElementById('editStudentDuration')) {
    document.getElementById('editStudentDuration').value = s.sessionDuration || s.duration || s.schedule?.duration || 30;
  }

  document.getElementById('editStudentSessionsCount').value = s.sessionsCount || 0;
  document.getElementById('editStudentHoursCount').value = s.hoursCount || 0.00;
  document.getElementById('editStudentAverageRating').value = s.averageRating || 5.0;
  document.getElementById('editStudentNotes').value = s.notes || '';

  const isDifferent = Boolean(s.schedule?.differentTimes || s.differentTimes);
  const modeSelect = document.getElementById('editStudentScheduleMode');
  const uniformContainer = document.getElementById('editStudentUniformContainer');
  const differentContainer = document.getElementById('editStudentDifferentContainer');

  if (modeSelect) {
    modeSelect.value = isDifferent ? 'different' : 'uniform';
  }

  if (uniformContainer && differentContainer) {
    if (isDifferent) {
      uniformContainer.style.display = 'none';
      differentContainer.style.display = 'block';
    } else {
      uniformContainer.style.display = 'block';
      differentContainer.style.display = 'none';
    }
  }

  // Populate Uniform Time
  const uniformTimeSelect = document.getElementById('editStudentTime');
  if (uniformTimeSelect) {
    uniformTimeSelect.innerHTML = getTimeOptionsHtml(s.schedule?.uniformTime || s.time || '');
  }

  // Populate Uniform Days
  const daysContainer = document.getElementById('editStudentDaysContainer');
  if (daysContainer) {
    const studentDays = s.schedule?.days || s.days || [];
    daysContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = studentDays.includes(cb.value);
    });
  }

  // Populate Per Day Grid
  renderPerDayGridHtml('editStudentPerDayGrid', s.schedule?.times || s.dayTimes || {}, s.schedule?.days || s.days || []);

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

  if (confirm(`هل أنت متأكد من ترحيل الدارس (${s.name}) إلى سلة المحذوفات والأرشيف؟`)) {
    try {
      await softDeleteToTrash("students", id, s, `أرشفة وحذف الطالب من قبل المشرف العام`);
      await writeAuditLog(auth.currentUser.uid, loggedInAdminData.name || "المشرف", "ARCHIVE_STUDENT", id, { studentName: s.name });
      Toast.success("تم ترحيل الطالب إلى سلة المحذوفات والأرشيف بنجاح.");
    } catch (err) {
      console.error(err);
      Toast.error("فشل ترحيل الطالب إلى سلة المحذوفات.");
    }
  }
}

// Setup adding a new student using a clean dynamic modal
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
          
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-top: 1rem;">
            <div class="form-group">
              <label for="addStudentTeacher">المعلم المشرف المعتمد</label>
              <select id="addStudentTeacher" class="form-control" required>
                <option value="">اختر معلماً...</option>
                ${teacherOptions}
              </select>
            </div>
            <div class="form-group">
              <label for="addStudentDuration">مدة الحصة (بالدقائق)</label>
              <select id="addStudentDuration" class="form-control" style="border: 1px solid var(--border-color); width: 100%;">
                <option value="15">15 دقيقة</option>
                <option value="30" selected>30 دقيقة</option>
                <option value="45">45 دقيقة</option>
                <option value="60">60 دقيقة (ساعة كاملة)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="addStudentScheduleMode">نظام مواعيد الحصص</label>
              <select id="addStudentScheduleMode" class="form-control" style="border: 1px solid var(--border-color); width: 100%;">
                <option value="uniform">موعد موحد لجميع الأيام</option>
                <option value="different">مواعيد مختلفة لكل يوم 📅</option>
              </select>
            </div>
          </div>

          <!-- قسم الموعد الموحد -->
          <div id="addStudentUniformContainer" style="margin-top: 1rem;">
            <div class="form-group">
              <label for="addStudentTime">موعد الحصة الموحد</label>
              <select id="addStudentTime" class="form-control" style="border: 1px solid var(--border-color); width: 100%;">
                ${getTimeOptionsHtml()}
              </select>
            </div>
            <h4 style="font-size: 0.85rem; font-weight: 800; color: var(--primary-color); margin-top: 1rem; margin-bottom: 0.75rem; border-right: 3px solid var(--primary-color); padding-right: 0.5rem; line-height: 1;">أيام الحصص المجدولة أسبوعيًا</h4>
            <div class="form-group">
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;" id="addStudentDaysContainer">
                ${DAYS_LIST.map(day => `<label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer;"><input type="checkbox" value="${day}"> ${day}</label>`).join('')}
              </div>
            </div>
          </div>

          <!-- قسم المواعيد المختلفة لكل يوم -->
          <div id="addStudentDifferentContainer" style="display: none; margin-top: 1rem; background: var(--bg-primary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <h4 style="font-size: 0.85rem; font-weight: 800; color: var(--primary-color); margin-bottom: 0.75rem; border-right: 3px solid var(--primary-color); padding-right: 0.5rem; line-height: 1;">تحديد موعد منفصل لكل يوم دراسي</h4>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;" id="addStudentPerDayGrid">
              <!-- Grid generated below -->
            </div>
          </div>
          
          <div class="form-group" style="margin-top: 1rem;">
            <label for="addStudentNotes">ملاحظات أولية أو أهداف الدراسة</label>
            <textarea id="addStudentNotes" class="form-control" rows="2" placeholder="اكتب مستوى الطالب التعليمي أو الأهداف التعليمية للمتابعة..."></textarea>
          </div>

          <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
            <button type="submit" class="btn btn-primary">تسجيل وحفظ</button>
            <button type="button" class="btn btn-secondary" id="btnCancelAddStudent">إلغاء</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Bind schedule mode toggle in Add Modal
    const addModeSelect = modal.querySelector('#addStudentScheduleMode');
    const addUniformCont = modal.querySelector('#addStudentUniformContainer');
    const addDiffCont = modal.querySelector('#addStudentDifferentContainer');

    addModeSelect.addEventListener('change', (e) => {
      if (e.target.value === 'different') {
        addUniformCont.style.display = 'none';
        addDiffCont.style.display = 'block';
        renderPerDayGridHtml('addStudentPerDayGrid');
      } else {
        addUniformCont.style.display = 'block';
        addDiffCont.style.display = 'none';
      }
    });

    // Bind events for Add modal
    modal.querySelector('#btnCloseAddModalBtn').addEventListener('click', () => modal.style.display = 'none');
    modal.querySelector('#btnCancelAddStudent').addEventListener('click', () => modal.style.display = 'none');
    
    modal.querySelector('#addStudentForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = modal.querySelector('#addStudentName').value.trim();
      const age = parseInt(modal.querySelector('#addStudentAge').value) || 0;
      const teacherId = modal.querySelector('#addStudentTeacher').value;
      const sessionDuration = parseInt(modal.querySelector('#addStudentDuration').value) || 30;
      const scheduleMode = modal.querySelector('#addStudentScheduleMode').value;
      const notes = modal.querySelector('#addStudentNotes').value.trim();

      let days = [];
      let timesMap = {};
      let primaryTime = "";

      if (scheduleMode === 'different') {
        const grid = modal.querySelector('#addStudentPerDayGrid');
        grid.querySelectorAll('.per-day-cb').forEach(cb => {
          if (cb.checked) {
            const day = cb.dataset.day;
            const timeSelect = grid.querySelector(`.per-day-time-select[data-day="${day}"]`);
            const selectedTime = timeSelect ? timeSelect.value : "";
            days.push(day);
            if (selectedTime) {
              timesMap[day] = selectedTime;
              if (!primaryTime) primaryTime = selectedTime;
            }
          }
        });
      } else {
        primaryTime = modal.querySelector('#addStudentTime').value.trim();
        modal.querySelectorAll('#addStudentDaysContainer input[type="checkbox"]').forEach(cb => {
          if (cb.checked) days.push(cb.value);
        });
      }

      try {
        const studentData = {
          name,
          age,
          teacherId,
          sessionDuration,
          time: primaryTime,
          sessionTime: primaryTime,
          notes,
          days,
          sessionDays: days,
          schedule: {
            duration: sessionDuration,
            differentTimes: scheduleMode === 'different',
            uniformTime: scheduleMode === 'uniform' ? primaryTime : '',
            days,
            times: timesMap
          },
          sessionsCount: 0,
          hoursCount: 0,
          averageRating: 5.0,
          status: 'active',
          createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, "students"), studentData);
        await writeAuditLog(auth.currentUser.uid, loggedInAdminData.name || "المشرف", "ADD_STUDENT", docRef.id, { studentName: name });
        
        Toast.success(`تم تسجيل الطالب (${name}) بنجاح وتعيينه للمشرف.`);
        modal.style.display = 'none';
        modal.querySelector('#addStudentForm').reset();
      } catch (err) {
        console.error(err);
        Toast.error("فشل إدخال وتسجيل الطالب الجديد.");
      }
    });
  }

  modal.style.display = 'flex';
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('adminStudentSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderStudentsTable(e.target.value);
    });
  }

  const btnOpenAdd = document.getElementById('openAddStudentModal');
  if (btnOpenAdd) {
    btnOpenAdd.addEventListener('click', () => {
      openAddStudentModalForm();
    });
  }

  // Toggle mode in Admin Edit Modal
  const editModeSelect = document.getElementById('editStudentScheduleMode');
  if (editModeSelect) {
    editModeSelect.addEventListener('change', (e) => {
      const uniformContainer = document.getElementById('editStudentUniformContainer');
      const differentContainer = document.getElementById('editStudentDifferentContainer');
      if (e.target.value === 'different') {
        if (uniformContainer) uniformContainer.style.display = 'none';
        if (differentContainer) {
          differentContainer.style.display = 'block';
          renderPerDayGridHtml('editStudentPerDayGrid');
        }
      } else {
        if (uniformContainer) uniformContainer.style.display = 'block';
        if (differentContainer) differentContainer.style.display = 'none';
      }
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
      const status = document.getElementById('editStudentStatus').value;
      const teacherId = document.getElementById('editStudentTeacher').value;
      const sessionDuration = parseInt(document.getElementById('editStudentDuration')?.value) || 30;
      const scheduleMode = document.getElementById('editStudentScheduleMode')?.value || 'uniform';
      
      const sessionsCount = parseInt(document.getElementById('editStudentSessionsCount').value) || 0;
      const hoursCount = parseFloat(document.getElementById('editStudentHoursCount').value) || 0.00;
      const averageRating = parseFloat(document.getElementById('editStudentAverageRating').value) || 5.0;
      const notes = document.getElementById('editStudentNotes').value.trim();

      let days = [];
      let timesMap = {};
      let primaryTime = "";

      if (scheduleMode === 'different') {
        const grid = document.getElementById('editStudentPerDayGrid');
        if (grid) {
          grid.querySelectorAll('.per-day-cb').forEach(cb => {
            if (cb.checked) {
              const day = cb.dataset.day;
              const timeSelect = grid.querySelector(`.per-day-time-select[data-day="${day}"]`);
              const selectedTime = timeSelect ? timeSelect.value : "";
              days.push(day);
              if (selectedTime) {
                timesMap[day] = selectedTime;
                if (!primaryTime) primaryTime = selectedTime;
              }
            }
          });
        }
      } else {
        primaryTime = document.getElementById('editStudentTime')?.value?.trim() || '';
        document.querySelectorAll('#editStudentDaysContainer input[type="checkbox"]').forEach(cb => {
          if (cb.checked) days.push(cb.value);
        });
      }

      try {
        await updateDoc(doc(db, "students", currentEditingStudentId), {
          name,
          age,
          status,
          teacherId,
          sessionDuration,
          time: primaryTime,
          sessionTime: primaryTime,
          sessionsCount,
          hoursCount,
          averageRating,
          notes,
          days,
          sessionDays: days,
          schedule: {
            duration: sessionDuration,
            differentTimes: scheduleMode === 'different',
            uniformTime: scheduleMode === 'uniform' ? primaryTime : '',
            days,
            times: timesMap
          }
        });

        await writeAuditLog(auth.currentUser.uid, loggedInAdminData.name || "المشرف", "EDIT_STUDENT", currentEditingStudentId, { studentName: name });
        Toast.success("تم تحديث كافة حقول الدارس بنجاح.");
        closeEditModal();
      } catch (err) {
        console.error(err);
        Toast.error("فشل تحديث بيانات الدارس.");
      }
    });
  }
}
