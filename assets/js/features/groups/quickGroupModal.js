import { db } from '../../config/firebase.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createGroup, updateGroup } from './groupsManager.js';
import { Toast } from '../../shared/utils/toast.js';

/**
 * Group Modal Component for Sabeel Academy
 * Supports creating new groups or editing existing ones with all required fields:
 * Name, Teacher, Day, Time, Duration, Max Capacity, Status, and Notes.
 */
export function openQuickGroupModal({ 
  teacherId = null, 
  teacherName = '', 
  groupData = null, 
  onGroupSaved = null,
  onGroupCreated = null 
} = {}) {
  const isEdit = !!(groupData && groupData.id);

  // Remove existing modal if open
  const existing = document.getElementById('quickGroupModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'quickGroupModal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';

  const defaultDay = groupData?.sessionDay || 'السبت';
  const defaultTime = groupData?.sessionTime || '05:00 م';
  const defaultDuration = groupData?.sessionDuration || 60;
  const defaultMaxCap = groupData?.maxCapacity || 10;
  const defaultStatus = groupData?.status || 'active';

  modal.innerHTML = `
    <div class="modal-card" style="max-width: 540px; border-radius: 12px; padding: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.85rem;">
        <h3 style="font-weight: 800; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 0.5rem; font-size: 1.15rem;">
          <i data-lucide="users-round" style="color: var(--primary-color);"></i> ${isEdit ? 'تعديل بيانات المجموعة' : '👥 إنشاء مجموعة جديدة'}
        </h3>
        <span id="btnCloseQuickGroupModal" style="cursor: pointer; padding: 0.25rem; display: flex; align-items: center; justify-content: center;">
          <i data-lucide="x" style="color: var(--text-muted);"></i>
        </span>
      </div>

      <form id="quickGroupForm">
        <!-- اسم المجموعة -->
        <div class="form-group" style="margin-bottom: 1rem;">
          <label for="quickGroupName" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.35rem; display: block;">
            اسم المجموعة التعليمية <span style="color: var(--danger);">*</span>
          </label>
          <input type="text" id="quickGroupName" class="form-control" required 
            value="${groupData?.name || ''}" 
            placeholder="مثال: مجموعة الفجر - حفظ القرآن الكريم" 
            style="width: 100%; font-weight: bold;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <!-- المعلم المشرف -->
          <div class="form-group" id="quickGroupTeacherContainer">
            <label for="quickGroupTeacher" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.35rem; display: block;">
              المعلم المسؤول <span style="color: var(--danger);">*</span>
            </label>
            <select id="quickGroupTeacher" class="form-control" style="width: 100%; font-weight: 600;">
              <option value="">جاري تحميل المعلمين...</option>
            </select>
          </div>

          <!-- يوم الحصة -->
          <div class="form-group">
            <label for="quickGroupDay" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.35rem; display: block;">
              يوم الحصة <span style="color: var(--danger);">*</span>
            </label>
            <select id="quickGroupDay" class="form-control" required style="width: 100%; font-weight: 600;">
              <option value="السبت" ${defaultDay === 'السبت' ? 'selected' : ''}>السبت</option>
              <option value="الأحد" ${defaultDay === 'الأحد' ? 'selected' : ''}>الأحد</option>
              <option value="الاثنين" ${defaultDay === 'الاثنين' ? 'selected' : ''}>الاثنين</option>
              <option value="الثلاثاء" ${defaultDay === 'الثلاثاء' ? 'selected' : ''}>الثلاثاء</option>
              <option value="الأربعاء" ${defaultDay === 'الأربعاء' ? 'selected' : ''}>الأربعاء</option>
              <option value="الخميس" ${defaultDay === 'الخميس' ? 'selected' : ''}>الخميس</option>
              <option value="الجمعة" ${defaultDay === 'الجمعة' ? 'selected' : ''}>الجمعة</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <!-- موعد الحصة -->
          <div class="form-group">
            <label for="quickGroupTime" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.35rem; display: block;">
              موعد الحصة <span style="color: var(--danger);">*</span>
            </label>
            <input type="text" id="quickGroupTime" class="form-control" required 
              value="${defaultTime}" 
              placeholder="مثال: 05:00 م أو 17:00" style="width: 100%; font-weight: 600;">
          </div>

          <!-- مدة الحصة -->
          <div class="form-group">
            <label for="quickGroupDuration" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.35rem; display: block;">
              مدة الحصة (بالدقيقة) <span style="color: var(--danger);">*</span>
            </label>
            <select id="quickGroupDuration" class="form-control" required style="width: 100%; font-weight: 600;">
              <option value="30" ${defaultDuration == 30 ? 'selected' : ''}>30 دقيقة</option>
              <option value="45" ${defaultDuration == 45 ? 'selected' : ''}>45 دقيقة</option>
              <option value="60" ${defaultDuration == 60 ? 'selected' : ''}>60 دقيقة (ساعة)</option>
              <option value="90" ${defaultDuration == 90 ? 'selected' : ''}>90 دقيقة (ساعة ونصف)</option>
              <option value="120" ${defaultDuration == 120 ? 'selected' : ''}>120 دقيقة (ساعتان)</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <!-- الحد الأقصى للطلاب -->
          <div class="form-group">
            <label for="quickGroupMaxCapacity" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.35rem; display: block;">
              الحد الأقصى للطلاب <span style="color: var(--danger);">*</span>
            </label>
            <input type="number" id="quickGroupMaxCapacity" class="form-control" min="1" max="100" required 
              value="${defaultMaxCap}" style="width: 100%; font-weight: 600;">
          </div>

          <!-- حالة المجموعة -->
          <div class="form-group">
            <label for="quickGroupStatus" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.35rem; display: block;">
              حالة المجموعة <span style="color: var(--danger);">*</span>
            </label>
            <select id="quickGroupStatus" class="form-control" required style="width: 100%; font-weight: 600;">
              <option value="active" ${defaultStatus === 'active' ? 'selected' : ''}>نشطة 🟢</option>
              <option value="archived" ${defaultStatus === 'archived' ? 'selected' : ''}>مؤرشفة 📦</option>
            </select>
          </div>
        </div>

        <!-- ملاحظات -->
        <div class="form-group" style="margin-bottom: 1.25rem;">
          <label for="quickGroupNotes" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.35rem; display: block;">
            ملاحظات عن المجموعة (اختياري)
          </label>
          <textarea id="quickGroupNotes" class="form-control" rows="2" placeholder="المستوى الدراسي، المنهج، أو أي ملاحظات أخرى..." style="resize: vertical; font-size: 0.85rem;">${groupData?.notes || ''}</textarea>
        </div>

        <div style="display: flex; gap: 0.5rem; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 1rem;">
          <button type="submit" class="btn btn-primary" id="btnSubmitQuickGroup" style="gap: 0.35rem; font-weight: 700;">
            <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i> ${isEdit ? 'حفظ التعديلات' : 'إنشاء المجموعة'}
          </button>
          <button type="button" class="btn btn-secondary" id="btnCancelQuickGroup">إلغاء</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  if (window.lucide) {
    window.lucide.createIcons();
  }

  const teacherSelect = modal.querySelector('#quickGroupTeacher');
  const teacherContainer = modal.querySelector('#quickGroupTeacherContainer');

  if (teacherId && !isEdit) {
    if (teacherContainer) teacherContainer.style.display = 'none';
  } else {
    loadTeachersForQuickGroup(teacherSelect, groupData?.teacherId || teacherId);
  }

  // Close buttons
  modal.querySelector('#btnCloseQuickGroupModal').addEventListener('click', () => modal.remove());
  modal.querySelector('#btnCancelQuickGroup').addEventListener('click', () => modal.remove());

  // Form Submit
  modal.querySelector('#quickGroupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = modal.querySelector('#quickGroupName').value.trim();
    const day = modal.querySelector('#quickGroupDay').value;
    const time = modal.querySelector('#quickGroupTime').value.trim();
    const duration = parseInt(modal.querySelector('#quickGroupDuration').value) || 60;
    const maxCapacity = parseInt(modal.querySelector('#quickGroupMaxCapacity').value) || 10;
    const status = modal.querySelector('#quickGroupStatus').value;
    const notes = modal.querySelector('#quickGroupNotes').value.trim();

    let finalTeacherId = teacherId;
    let finalTeacherName = teacherName;

    if (teacherSelect && teacherSelect.offsetParent !== null) {
      finalTeacherId = teacherSelect.value;
      const selectedOpt = teacherSelect.options[teacherSelect.selectedIndex];
      finalTeacherName = selectedOpt ? selectedOpt.text : 'المعلم المعتمد';
    } else if (isEdit && groupData) {
      finalTeacherId = groupData.teacherId;
      finalTeacherName = groupData.teacherName;
    }

    if (!finalTeacherId) {
      Toast.error("يرجى اختيار المعلم المسؤول عن المجموعة.");
      return;
    }

    const submitBtn = modal.querySelector('#btnSubmitQuickGroup');
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (isEdit) {
        await updateGroup(groupData.id, {
          name,
          teacherId: finalTeacherId,
          teacherName: finalTeacherName,
          sessionDay: day,
          sessionTime: time,
          sessionDuration: duration,
          maxCapacity,
          status,
          notes
        });
        Toast.success(`تم تحديث بيانات المجموعة (${name}) بنجاح 🎉`);
      } else {
        const newGroupId = await createGroup({
          name,
          teacherId: finalTeacherId,
          teacherName: finalTeacherName,
          sessionDay: day,
          sessionTime: time,
          sessionDuration: duration,
          maxCapacity,
          status,
          notes
        });
        Toast.success(`تم إنشاء المجموعة (${name}) بنجاح 🎉`);
      }

      modal.remove();

      const callback = onGroupSaved || onGroupCreated;
      if (typeof callback === 'function') {
        callback();
      }
    } catch (err) {
      console.error("Error saving group:", err);
      Toast.error(err.message || "حدث خطأ أثناء حفظ المجموعة.");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

async function loadTeachersForQuickGroup(selectEl, selectedTeacherId = null) {
  if (!selectEl) return;
  try {
    const q = query(collection(db, "users"), where("role", "==", "teacher"));
    const snap = await getDocs(q);
    let html = `<option value="">-- اختر المعلم المسؤول --</option>`;
    snap.forEach(d => {
      const data = d.data();
      const selected = (d.id === selectedTeacherId) ? 'selected' : '';
      html += `<option value="${d.id}" ${selected}>${data.name || 'معلم'}</option>`;
    });
    selectEl.innerHTML = html;
  } catch (err) {
    console.error("Failed to load teachers for quick group modal:", err);
    selectEl.innerHTML = `<option value="">تعذر جلب المعلمين</option>`;
  }
}
