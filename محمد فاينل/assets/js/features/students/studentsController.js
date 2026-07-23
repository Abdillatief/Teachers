import { db, auth } from '../../config/firebase.js';
import { collection, onSnapshot, doc, getDoc, updateDoc, setDoc, addDoc, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { protectRoute } from '../auth/authService.js';
import { renderSidebar } from '../../shared/components/sidebar.js';
import { renderNavbar } from '../../shared/components/navbar.js';
import { Toast } from '../../shared/utils/toast.js';
import { showCustomConfirm } from '../../shared/utils/helpers.js';
import { softDeleteToTrash } from '../trash/trashService.js';
import { writeAuditLog } from '../audit/auditService.js';

protectRoute('admin');

let studentsCached = [];
let pendingStudentsCached = [];
let teachersCached = [];
let packagesCached = [];
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
  // 1. Fetch packages to use for student approvals
  onSnapshot(collection(db, "packages"), (snapshot) => {
    packagesCached = [];
    snapshot.forEach(docSnap => {
      packagesCached.push({ id: docSnap.id, ...docSnap.data() });
    });
    populatePackageOptions();
  });

  // 2. Fetch approved teachers to populate assignment selects
  onSnapshot(collection(db, "users"), (snapshot) => {
    teachersCached = [];
    snapshot.forEach(docSnap => {
      const userData = docSnap.data();
      if (userData.role === 'teacher' && userData.status === 'approved') {
        teachersCached.push({ uid: docSnap.id, ...userData });
      }
    });

    populateTeachersDropdowns();

    // 3. Fetch students
    onSnapshot(collection(db, "students"), (studentsSnapshot) => {
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
    });
  });

  setupEventListeners();
  setupApproveStudentModalHandlers();
}

function populateTeachersDropdowns() {
  const editSelect = document.getElementById('editStudentTeacher');
  if (editSelect) {
    const optionsHtml = teachersCached.map(t => `<option value="${t.uid}">${t.name}</option>`).join('');
    editSelect.innerHTML = `<option value="">اختر معلماً مشرفاً...</option>` + optionsHtml;
  }

  const approveSelect = document.getElementById('approveTeacherSelect');
  if (approveSelect) {
    const optionsHtml = teachersCached.map(t => `<option value="${t.uid}">${t.name}</option>`).join('');
    approveSelect.innerHTML = `<option value="">اختر المعلم المشرف...</option>` + optionsHtml;
  }
}

function populatePackageOptions() {
  const pkgSelect = document.getElementById('approvePackageSelect');
  if (!pkgSelect) return;

  if (packagesCached.length > 0) {
    pkgSelect.innerHTML = `<option value="">-- اختر الباقة التعليمية المناسبة للطالب --</option>` +
      packagesCached.map(p => `<option value="${p.id}" data-price="${p.price}" data-name="${p.name}">${p.name} (${p.price} ج.م)</option>`).join('');
  } else {
    pkgSelect.innerHTML = `
      <option value="">-- اختر الباقة التعليمية المناسبة للطالب --</option>
      <option value="pkg_4" data-price="300" data-name="باقة 4 حصص شهرياً">باقة 4 حصص شهرياً (300 ج.م)</option>
      <option value="pkg_8" data-price="500" data-name="باقة 8 حصص شهرياً">باقة 8 حصص شهرياً (500 ج.م)</option>
      <option value="pkg_12" data-price="700" data-name="باقة 12 حصة شهرياً">باقة 12 حصة شهرياً (700 ج.م)</option>
      <option value="pkg_custom" data-price="600" data-name="باقة تعليمية مخصصة">باقة تعليمية مخصصة (600 ج.م)</option>
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
    const phoneInfo = s.phone ? `📞 ${s.phone}` : 'لا يوجد هاتف';

    return `
      <tr>
        <td>
          <strong style="color: var(--text-primary); font-size: 0.95rem;">${s.name}</strong>
          ${s.email ? `<div style="font-size: 0.75rem; color: var(--text-secondary);">${s.email}</div>` : ''}
        </td>
        <td>${s.age || '-'} سنة <br><span style="font-size: 0.75rem; color: var(--text-secondary);">${phoneInfo}</span></td>
        <td><strong style="color: var(--primary-color);">${s.teacherName || 'المعلم المتقدم'}</strong></td>
        <td><span style="font-size: 0.8rem; font-weight: 700; color: var(--primary-color);">${days}</span><br><span style="font-size: 0.75rem; color: var(--text-muted);">🕒 ${time}</span></td>
        <td><div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem; color: var(--text-secondary);" title="${s.notes || ''}">${s.notes || 'لا يوجد'}</div></td>
        <td>
          <div style="display: flex; gap: 0.35rem; align-items: center;">
            <button class="btn btn-primary btn-approve-student" data-id="${s.id}" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; background-color: var(--success); border-color: var(--success); display: flex; align-items: center; gap: 0.25rem; font-weight: 700;">
              <i data-lucide="check-circle-2" style="width: 14px; height: 14px;"></i> اعتماد وتحديد الباقة
            </button>
            <button class="btn btn-secondary btn-reject-student" data-id="${s.id}" style="padding: 0.35rem 0.5rem; font-size: 0.75rem; color: var(--danger); display: flex; align-items: center; gap: 0.2rem;">
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
    return;
  }

  // 1. Render Table View
  tbody.innerHTML = filtered.map(s => {
    const teacher = teachersCached.find(t => t.uid === s.teacherId);
    const teacherName = teacher ? teacher.name : (s.teacherName || `<span style="color:var(--danger); font-weight:700;">غير معين ⚠️</span>`);
    
    let statusBadge = '';
    if (s.status === 'active' || s.status === 'Active') {
      statusBadge = `<span style="background-color: var(--success-light); color: var(--success); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">نشط ✅</span>`;
    } else if (s.status === 'Suspended') {
      statusBadge = `<span style="background-color: var(--warning-light); color: var(--warning); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">موقوف ⚠️</span>`;
    } else {
      statusBadge = `<span style="background-color: var(--secondary-light); color: var(--secondary-color); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">مؤرشف 📦</span>`;
    }

    const daysLabel = s.days && Array.isArray(s.days) && s.days.length > 0 ? s.days.join('، ') : (s.sessionDays ? s.sessionDays.join('، ') : 'غير محدد');
    const timeLabel = s.time || s.sessionTime || 'غير محدد';
    const pkgLabel = s.packageName ? `<span class="badge" style="position:static; background-color: var(--primary-light); color: var(--primary-color); font-weight: 700; margin-top:0.25rem;">${s.packageName}</span>` : '';

    return `
      <tr>
        <td>
          <div style="font-weight: 800; color: var(--text-primary);">${s.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">مواعيد: ${daysLabel} • ${timeLabel}</div>
          ${pkgLabel}
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

  // 2. Render Cards View
  gridContainer.innerHTML = filtered.map(s => {
    const teacher = teachersCached.find(t => t.uid === s.teacherId);
    const teacherName = teacher ? teacher.name : (s.teacherName || `<span style="color:var(--danger); font-weight:700;">غير معين ⚠️</span>`);

    let statusBadge = '';
    if (s.status === 'active' || s.status === 'Active') {
      statusBadge = `<span style="background-color: var(--success-light); color: var(--success); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.78rem; font-weight: 700;">نشط ✅</span>`;
    } else if (s.status === 'Suspended') {
      statusBadge = `<span style="background-color: var(--warning-light); color: var(--warning); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.78rem; font-weight: 700;">موقوف ⚠️</span>`;
    } else {
      statusBadge = `<span style="background-color: var(--secondary-light); color: var(--secondary-color); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.78rem; font-weight: 700;">مؤرشف 📦</span>`;
    }

    const daysLabel = s.days && Array.isArray(s.days) && s.days.length > 0 ? s.days.join('، ') : (s.sessionDays ? s.sessionDays.join('، ') : 'غير محدد');
    const timeLabel = s.time || s.sessionTime || 'غير محدد';
    const pkgLabel = s.packageName ? `<span class="badge" style="position:static; background-color: var(--primary-light); color: var(--primary-color); font-weight: 700;">${s.packageName}</span>` : '';

    return `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem; box-shadow: 0 2px 5px rgba(0,0,0,0.03);">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.75rem;">
            <div>
              <strong style="font-size: 1.05rem; color: var(--text-primary); display: block;">${s.name}</strong>
              <span style="font-size: 0.8rem; color: var(--text-muted);">${s.age || 'غير مسجل'} سنة</span>
            </div>
            ${statusBadge}
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.83rem; color: var(--text-secondary); margin-bottom: 0.75rem; background: var(--bg-primary); padding: 0.75rem; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="user-check" style="width: 15px; height: 15px; color: var(--primary-color);"></i>
              <span>المعلم: <strong>${teacherName}</strong></span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="calendar" style="width: 15px; height: 15px; color: var(--text-muted);"></i>
              <span>${daysLabel} • ${timeLabel}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="award" style="width: 15px; height: 15px; color: var(--warning);"></i>
              <span>${s.sessionsCount || 0} حصة • تقييم: <strong style="color:var(--primary-color);">${(parseFloat(s.averageRating) || 5.0).toFixed(1)}/5.0</strong></span>
            </div>
          </div>

          ${pkgLabel ? `<div style="margin-bottom: 0.5rem;">${pkgLabel}</div>` : ''}
          ${s.notes ? `<p style="font-size: 0.78rem; color: var(--text-muted); margin: 0; background: rgba(0,0,0,0.02); padding: 0.5rem; border-radius: 6px; line-height: 1.4;">${s.notes}</p>` : ''}
        </div>

        <div style="display: flex; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
          <button class="btn btn-secondary btn-edit-student" data-id="${s.id}" style="flex: 1; justify-content: center; padding: 0.4rem; font-size: 0.8rem; gap: 0.35rem;">
            <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i> تعديل
          </button>
          <button class="btn btn-danger btn-delete-student" data-id="${s.id}" style="flex: 1; justify-content: center; padding: 0.4rem; font-size: 0.8rem; gap: 0.35rem;">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> أرشيف
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Bind Actions across both views
  document.querySelectorAll('.btn-edit-student').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      openEditModal(id);
    });
  });

  document.querySelectorAll('.btn-delete-student').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      deleteStudent(id);
    });
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// --- مودال الاعتماد وتحديد الباقة للطلب المعلق ---
function openApproveModal(id) {
  const student = pendingStudentsCached.find(s => s.id === id);
  if (!student) return;

  currentApprovingStudent = student;

  document.getElementById('approveStudentId').value = student.id;
  document.getElementById('approveStudentNameDisplay').textContent = student.name;
  document.getElementById('approveStudentTeacherDisplay').textContent = student.teacherName || 'غير محدد';

  populateTeachersDropdowns();
  populatePackageOptions();

  const teacherSelect = document.getElementById('approveTeacherSelect');
  if (teacherSelect && student.teacherId) {
    teacherSelect.value = student.teacherId;
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
      const teacherId = document.getElementById('approveTeacherSelect').value;
      const teacherObj = teachersCached.find(t => t.uid === teacherId);
      const teacherName = teacherObj ? teacherObj.name : currentApprovingStudent.teacherName;
      const startDate = document.getElementById('approveStartDate').value;
      const endDate = document.getElementById('approveEndDate').value;

      const submitBtn = document.getElementById('btnSubmitApproveStudent');
      if (submitBtn) submitBtn.disabled = true;

      try {
        // 1. التحديث الفوري لحالة الطالب فـي جدول الطلاب
        await updateDoc(doc(db, "students", studentId), {
          status: 'active',
          teacherId: teacherId,
          teacherName: teacherName,
          packageName: packageName,
          packagePrice: packagePrice,
          approvedAt: new Date().toISOString()
        });

        // 2. إنشاء خطة اشتراك معتمدة في جدول الاشتراكات
        await addDoc(collection(db, "subscriptions"), {
          studentId: studentId,
          studentName: currentApprovingStudent.name,
          planName: packageName,
          price: packagePrice,
          startDate: startDate,
          endDate: endDate,
          status: 'active',
          createdAt: serverTimestamp()
        });

        // 3. إرسال إشعار للمعلم بقبول طلب إضافة الطالب
        if (teacherId) {
          await addDoc(collection(db, "notifications"), {
            title: "تمت الموافقة على إضافة الطالب وتفعيل باقته 🎉",
            body: `وافقت إدارة الأكاديمية على إضافة الطالب (${currentApprovingStudent.name}) وتم تفعيل باقته الدراسية (${packageName}) بنجاح.`,
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
  document.getElementById('editStudentStatus').value = s.status || 'active';
  document.getElementById('editStudentTeacher').value = s.teacherId || '';
  document.getElementById('editStudentTime').value = s.time || s.sessionTime || '';
  document.getElementById('editStudentSessionsCount').value = s.sessionsCount || 0;
  document.getElementById('editStudentHoursCount').value = s.hoursCount || 0.00;
  document.getElementById('editStudentAverageRating').value = s.averageRating || 5.0;
  document.getElementById('editStudentNotes').value = s.notes || '';

  // Select Checkboxes
  const container = document.getElementById('editStudentDaysContainer');
  if (container) {
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const studentDays = s.days || s.sessionDays || [];
    checkboxes.forEach(cb => {
      cb.checked = studentDays.includes(cb.value);
    });
  }

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
    
    modal.querySelector('#addStudentForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = modal.querySelector('#addStudentName').value.trim();
      const age = parseInt(modal.querySelector('#addStudentAge').value) || 0;
      const teacherId = modal.querySelector('#addStudentTeacher').value;
      const time = modal.querySelector('#addStudentTime').value.trim();
      const notes = modal.querySelector('#addStudentNotes').value.trim();

      const days = [];
      modal.querySelectorAll('#addStudentDaysContainer input[type="checkbox"]').forEach(cb => {
        if (cb.checked) days.push(cb.value);
      });

      try {
        const teacherObj = teachersCached.find(t => t.uid === teacherId);
        const teacherName = teacherObj ? teacherObj.name : 'المعلم المعتمد';

        const studentData = {
          name,
          age,
          teacherId,
          teacherName,
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

      try {
        const teacherObj = teachersCached.find(t => t.uid === teacherId);
        const teacherName = teacherObj ? teacherObj.name : '';

        await updateDoc(doc(db, "students", currentEditingStudentId), {
          name,
          age,
          status,
          teacherId,
          ...(teacherName ? { teacherName } : {}),
          time,
          sessionsCount,
          hoursCount,
          averageRating,
          notes,
          days
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
