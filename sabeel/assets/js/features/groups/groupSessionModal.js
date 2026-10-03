import { db } from '../../config/firebase.js';
import { doc, getDoc, getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { recordGroupAttendance } from './groupAttendanceService.js';
import { Toast } from '../../shared/utils/toast.js';

/**
 * Group Session Interactive Modal Handler
 */

let recordModalEl = null;
let detailsModalEl = null;

function ensureModalContainer() {
  if (document.getElementById('groupSessionModalWrapper')) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'groupSessionModalWrapper';
  wrapper.innerHTML = `
    <!-- Modal 1: Record Group Session Modal -->
    <div id="recordGroupSessionModal" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.6); z-index: 10000; align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(4px);">
      <div class="modal-card" style="background-color: var(--bg-secondary); border-radius: 12px; border: 1px solid var(--border-color); width: 100%; max-width: 680px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: var(--shadow-lg); overflow: hidden;">
        
        <!-- Header -->
        <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-primary);">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
              <i data-lucide="users-round" style="color: var(--primary-color); width: 22px; height: 22px;"></i>
              تسجيل الحصة الجماعية
            </h3>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.2rem 0 0 0;">إثبات الحضور والغياب وكتابة الملاحظات لطلاب المجموعة.</p>
          </div>
          <button type="button" id="btnCloseRecordGroupModal" style="background: transparent; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted); padding: 0.25rem; display: flex; align-items: center;">
            <i data-lucide="x"></i>
          </button>
        </div>

        <!-- Body Scrollable -->
        <div style="padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 1.25rem;">
          
          <!-- Group Info Card -->
          <div style="background: rgba(var(--primary-rgb, 14, 165, 233), 0.08); border: 1px solid rgba(var(--primary-rgb, 14, 165, 233), 0.25); border-radius: 10px; padding: 1rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; font-size: 0.85rem;">
            <div>
              <span style="color: var(--text-secondary); display: block; font-size: 0.75rem;">اسم المجموعة:</span>
              <strong id="recGrpName" style="color: var(--primary-color); font-size: 1rem;">-</strong>
            </div>
            <div>
              <span style="color: var(--text-secondary); display: block; font-size: 0.75rem;">المعلم المشرف:</span>
              <strong id="recGrpTeacher" style="color: var(--text-primary);">-</strong>
            </div>
            <div>
              <span style="color: var(--text-secondary); display: block; font-size: 0.75rem;">موعد الحصة:</span>
              <strong id="recGrpTime" style="color: var(--text-primary);">-</strong>
            </div>
            <div>
              <span style="color: var(--text-secondary); display: block; font-size: 0.75rem;">إجمالي الطلاب:</span>
              <strong id="recGrpCount" style="color: var(--text-primary);">-</strong>
            </div>
          </div>

          <!-- Quick Actions & Controls -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; background: var(--bg-primary); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.35rem;">
              <i data-lucide="check-square" style="width: 18px; height: 18px; color: var(--success);"></i>
              كشف حضور وغياب الطلاب
            </div>
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
              <button type="button" id="btnRecGrpAllPresent" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.3rem 0.65rem; color: var(--success); font-weight: 700; border-color: var(--success);">
                ✅ تحديد الكل حاضر
              </button>
              <button type="button" id="btnRecGrpAllAbsent" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.3rem 0.65rem; color: var(--danger); font-weight: 700; border-color: var(--danger);">
                🔴 تحديد الكل غائب
              </button>
            </div>
          </div>

          <!-- Students Attendance List Container -->
          <div id="recGrpStudentsList" style="display: flex; flex-direction: column; gap: 0.75rem;">
            <!-- Rendered dynamically -->
          </div>

          <!-- General Notes & Duration -->
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; margin-top: 0.5rem;">
            <div class="form-group" style="margin: 0;">
              <label style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.35rem; display: block;">ملاحظات عامة تخص الحصة الجماعية (اختياري)</label>
              <input type="text" id="recGrpGeneralNotes" class="form-control" placeholder="اكتب ملاحظة عامة للحصة..." style="font-size: 0.88rem;">
            </div>
            <div class="form-group" style="margin: 0;">
              <label style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.35rem; display: block;">مدة الحصة (بالدقائق)</label>
              <select id="recGrpDuration" class="form-control" style="font-size: 0.88rem; font-weight: 700;">
                <option value="30">30 دقيقة</option>
                <option value="45">45 دقيقة</option>
                <option value="60" selected>60 دقيقة (ساعة)</option>
                <option value="90">90 دقيقة</option>
                <option value="120">120 دقيقة (ساعتان)</option>
              </select>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 0.75rem; background: var(--bg-primary);">
          <button type="button" id="btnCancelRecordGroupModal" class="btn btn-secondary" style="font-weight: 700;">إلغاء</button>
          <button type="button" id="btnSaveRecordGroupModal" class="btn btn-primary" style="font-weight: 800; gap: 0.4rem;">
            <i data-lucide="check-circle-2"></i> حفظ الحصة الجماعية
          </button>
        </div>

      </div>
    </div>

    <!-- Modal 2: View Group Session Details Modal -->
    <div id="detailsGroupSessionModal" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.6); z-index: 10000; align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(4px);">
      <div class="modal-card" style="background-color: var(--bg-secondary); border-radius: 12px; border: 1px solid var(--border-color); width: 100%; max-width: 650px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: var(--shadow-lg); overflow: hidden;">
        
        <!-- Header -->
        <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-primary);">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
              <i data-lucide="clipboard-check" style="color: var(--success); width: 22px; height: 22px;"></i>
              تفاصيل الحصة الجماعية المسجلة
            </h3>
            <span id="detGrpRecordedTime" style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.2rem; display: inline-block;">-</span>
          </div>
          <button type="button" id="btnCloseDetailsGroupModal" style="background: transparent; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted); padding: 0.25rem; display: flex; align-items: center;">
            <i data-lucide="x"></i>
          </button>
        </div>

        <!-- Body Scrollable -->
        <div style="padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 1.25rem;">
          
          <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; font-size: 0.85rem;">
            <div>
              <span style="color: var(--text-secondary); display: block; font-size: 0.75rem;">المجموعة:</span>
              <strong id="detGrpName" style="color: var(--primary-color); font-size: 1rem;">-</strong>
            </div>
            <div>
              <span style="color: var(--text-secondary); display: block; font-size: 0.75rem;">المعلم:</span>
              <strong id="detGrpTeacher" style="color: var(--text-primary);">-</strong>
            </div>
            <div>
              <span style="color: var(--text-secondary); display: block; font-size: 0.75rem;">الحضور:</span>
              <strong id="detGrpPresent" style="color: var(--success);">-</strong>
            </div>
            <div>
              <span style="color: var(--text-secondary); display: block; font-size: 0.75rem;">الغياب:</span>
              <strong id="detGrpAbsent" style="color: var(--danger);">-</strong>
            </div>
          </div>

          <div id="detGrpGeneralNotesBox" style="display: none; background: rgba(0,0,0,0.02); border: 1px dashed var(--border-color); border-radius: 8px; padding: 0.85rem; font-size: 0.85rem; color: var(--text-primary);">
            <strong style="color: var(--primary-color); display: block; margin-bottom: 0.25rem;">📝 ملاحظات الحصة العامة:</strong>
            <span id="detGrpGeneralNotesText"></span>
          </div>

          <div>
            <h4 style="font-size: 0.9rem; font-weight: 800; color: var(--text-primary); margin: 0 0 0.75rem 0;">سجل حضور الطلاب والملاحظات:</h4>
            <div id="detGrpStudentsTable" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
          </div>

        </div>

        <!-- Footer -->
        <div style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; background: var(--bg-primary);">
          <button type="button" id="btnOkDetailsGroupModal" class="btn btn-primary" style="font-weight: 700;">إغلاق</button>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(wrapper);
  if (window.lucide) window.lucide.createIcons();

  // Bind close buttons
  document.getElementById('btnCloseRecordGroupModal')?.addEventListener('click', closeRecordGroupModal);
  document.getElementById('btnCancelRecordGroupModal')?.addEventListener('click', closeRecordGroupModal);
  document.getElementById('btnCloseDetailsGroupModal')?.addEventListener('click', closeDetailsGroupModal);
  document.getElementById('btnOkDetailsGroupModal')?.addEventListener('click', closeDetailsGroupModal);
}

export function closeRecordGroupModal() {
  const modal = document.getElementById('recordGroupSessionModal');
  if (modal) modal.style.display = 'none';
}

export function closeDetailsGroupModal() {
  const modal = document.getElementById('detailsGroupSessionModal');
  if (modal) modal.style.display = 'none';
}

/**
 * Open Modal to Record Group Session
 */
export async function openRecordGroupSessionModal(group, teacherName = 'المعلم المشرف', onSaveSuccess = null) {
  ensureModalContainer();

  const modal = document.getElementById('recordGroupSessionModal');
  const elName = document.getElementById('recGrpName');
  const elTeacher = document.getElementById('recGrpTeacher');
  const elTime = document.getElementById('recGrpTime');
  const elCount = document.getElementById('recGrpCount');
  const listContainer = document.getElementById('recGrpStudentsList');
  const generalNotesInput = document.getElementById('recGrpGeneralNotes');

  if (!group || !modal || !listContainer) return;

  elName.textContent = group.name || 'مجموعة جماعية';
  elTeacher.textContent = group.teacherName || teacherName || 'المعلم';
  elTime.textContent = group.time || '05:30 مساءً';

  const studentIds = group.studentIds || [];
  elCount.textContent = `${studentIds.length} طلاب`;
  if (generalNotesInput) generalNotesInput.value = '';

  listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 1rem;">جاري تحميل قائمة الطلاب...</p>';
  modal.style.display = 'flex';

  // Fetch full student objects for the group
  const studentsList = [];
  for (const sid of studentIds) {
    try {
      const sSnap = await getDoc(doc(db, "students", sid));
      if (sSnap.exists()) {
        studentsList.push({ id: sSnap.id, ...sSnap.data() });
      } else {
        const uSnap = await getDoc(doc(db, "users", sid));
        if (uSnap.exists()) {
          studentsList.push({ id: uSnap.id, name: uSnap.data().name || 'طالب' });
        } else {
          studentsList.push({ id: sid, name: 'طالب' });
        }
      }
    } catch (e) {
      studentsList.push({ id: sid, name: 'طالب' });
    }
  }

  if (studentsList.length === 0) {
    listContainer.innerHTML = `
      <div style="background: rgba(239, 68, 68, 0.08); border: 1px dashed var(--danger); border-radius: 8px; padding: 1.25rem; text-align: center;">
        <p style="color: var(--danger); font-weight: 800; margin: 0;">⚠️ لا يوجد طلاب مسجلون داخل هذه المجموعة حالياً.</p>
      </div>
    `;
    return;
  }

  // Render Students Checklist
  // Default state for all students is PRESENT (حاضر ✅)
  listContainer.innerHTML = studentsList.map(st => `
    <div class="grp-st-record-row" data-id="${st.id}" data-name="${st.name}" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.65rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <span style="font-weight: 800; font-size: 0.92rem; color: var(--text-primary);">${st.name}</span>
        
        <!-- Toggle Button for Present / Absent -->
        <button type="button" class="btn-toggle-attendance btn" data-status="completed" style="font-size: 0.82rem; font-weight: 800; padding: 0.35rem 0.85rem; border-radius: 20px; background: rgba(16, 185, 129, 0.12); color: var(--success); border: 1px solid var(--success); cursor: pointer; transition: all 0.2s;">
          <span class="status-text">حاضر ✅</span>
        </button>
      </div>

      <!-- Absence Details Drawer (Shown when absent) -->
      <div class="absence-details-drawer" style="display: none; background: rgba(239, 68, 68, 0.05); padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px dashed var(--danger);">
        <label style="font-size: 0.75rem; font-weight: 700; color: var(--danger); display: block; margin-bottom: 0.25rem;">تفاصيل ومبرر الغياب:</label>
        <select class="absence-type-select form-control" style="font-size: 0.8rem; padding: 0.35rem;">
          <option value="unexcused" selected>بدون عذر (يُحسب في الأجر) 🔴</option>
          <option value="excused">بعذر مقبول (لا يُحسب) 🟢</option>
        </select>
      </div>

      <!-- Student Notes & Quick Chips -->
      <div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <input type="text" class="student-note-input form-control" placeholder="ملاحظة خاصة بالطالب (مثال: راجع جيداً، متأخر...)..." style="font-size: 0.8rem; padding: 0.35rem 0.65rem;">
        </div>
        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.4rem;">
          <span class="chip-note" style="font-size: 0.7rem; background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.15rem 0.5rem; border-radius: 12px; cursor: pointer; user-select: none;">+ راجع جيداً</span>
          <span class="chip-note" style="font-size: 0.7rem; background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.15rem 0.5rem; border-radius: 12px; cursor: pointer; user-select: none;">+ لم يسمع</span>
          <span class="chip-note" style="font-size: 0.7rem; background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.15rem 0.5rem; border-radius: 12px; cursor: pointer; user-select: none;">+ متأخر</span>
          <span class="chip-note" style="font-size: 0.7rem; background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.15rem 0.5rem; border-radius: 12px; cursor: pointer; user-select: none;">+ يحتاج متابعة</span>
        </div>
      </div>
    </div>
  `).join('');

  // Attach events to student rows
  listContainer.querySelectorAll('.grp-st-record-row').forEach(row => {
    const btnToggle = row.querySelector('.btn-toggle-attendance');
    const statusText = row.querySelector('.status-text');
    const drawer = row.querySelector('.absence-details-drawer');
    const noteInput = row.querySelector('.student-note-input');

    btnToggle.addEventListener('click', () => {
      const currentStatus = btnToggle.dataset.status;
      if (currentStatus === 'completed') {
        btnToggle.dataset.status = 'student_absent';
        btnToggle.style.background = 'rgba(239, 68, 68, 0.12)';
        btnToggle.style.color = 'var(--danger)';
        btnToggle.style.borderColor = 'var(--danger)';
        statusText.textContent = 'غائب 🔴';
        drawer.style.display = 'block';
      } else {
        btnToggle.dataset.status = 'completed';
        btnToggle.style.background = 'rgba(16, 185, 129, 0.12)';
        btnToggle.style.color = 'var(--success)';
        btnToggle.style.borderColor = 'var(--success)';
        statusText.textContent = 'حاضر ✅';
        drawer.style.display = 'none';
      }
    });

    // Chip note clicks
    row.querySelectorAll('.chip-note').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.textContent.replace('+', '').trim();
        if (noteInput.value) {
          if (!noteInput.value.includes(text)) {
            noteInput.value += ` • ${text}`;
          }
        } else {
          noteInput.value = text;
        }
      });
    });
  });

  // Bulk Actions
  const btnAllPresent = document.getElementById('btnRecGrpAllPresent');
  const btnAllAbsent = document.getElementById('btnRecGrpAllAbsent');

  btnAllPresent.onclick = () => {
    listContainer.querySelectorAll('.grp-st-record-row').forEach(row => {
      const btnToggle = row.querySelector('.btn-toggle-attendance');
      const statusText = row.querySelector('.status-text');
      const drawer = row.querySelector('.absence-details-drawer');
      btnToggle.dataset.status = 'completed';
      btnToggle.style.background = 'rgba(16, 185, 129, 0.12)';
      btnToggle.style.color = 'var(--success)';
      btnToggle.style.borderColor = 'var(--success)';
      statusText.textContent = 'حاضر ✅';
      drawer.style.display = 'none';
    });
    Toast.success("تم تحديد كافة الطلاب كحاضرين ✅");
  };

  btnAllAbsent.onclick = () => {
    listContainer.querySelectorAll('.grp-st-record-row').forEach(row => {
      const btnToggle = row.querySelector('.btn-toggle-attendance');
      const statusText = row.querySelector('.status-text');
      const drawer = row.querySelector('.absence-details-drawer');
      btnToggle.dataset.status = 'student_absent';
      btnToggle.style.background = 'rgba(239, 68, 68, 0.12)';
      btnToggle.style.color = 'var(--danger)';
      btnToggle.style.borderColor = 'var(--danger)';
      statusText.textContent = 'غائب 🔴';
      drawer.style.display = 'block';
    });
    Toast.success("تم تحديد كافة الطلاب كغائبين 🔴");
  };

  // Submit Handler
  const saveBtn = document.getElementById('btnSaveRecordGroupModal');
  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    try {
      const attendees = [];
      listContainer.querySelectorAll('.grp-st-record-row').forEach(row => {
        const studentId = row.dataset.id;
        const studentName = row.dataset.name;
        const status = row.querySelector('.btn-toggle-attendance').dataset.status;
        const absenceType = row.querySelector('.absence-type-select').value;
        const note = row.querySelector('.student-note-input').value.trim();

        attendees.push({
          studentId,
          studentName,
          status,
          absenceType,
          note
        });
      });

      const generalNotes = document.getElementById('recGrpGeneralNotes')?.value.trim() || '';
      const duration = parseInt(document.getElementById('recGrpDuration')?.value) || 60;
      const todayStr = new Date().toISOString().split('T')[0];

      const res = await recordGroupAttendance({
        groupId: group.id,
        groupName: group.name,
        teacherId: group.teacherId,
        teacherName: group.teacherName || teacherName,
        duration,
        date: todayStr,
        time: group.time || '05:30 مساءً',
        attendees,
        generalNotes
      });

      Toast.success(`تم حفظ الحصة الجماعية بنجاح! ✅ (حضر: ${res.presentCount} - غاب: ${res.absentCount})`);
      closeRecordGroupModal();

      if (onSaveSuccess) onSaveSuccess(res);
    } catch (err) {
      console.error("Error saving group session:", err);
      Toast.error("حدث خطأ أثناء حفظ الحصة: " + err.message);
    } finally {
      saveBtn.disabled = false;
    }
  };
}

/**
 * Open Modal to View Details of Completed Group Session
 */
export function openGroupSessionDetailsModal(groupSessionDoc) {
  ensureModalContainer();

  const modal = document.getElementById('detailsGroupSessionModal');
  if (!modal || !groupSessionDoc) return;

  document.getElementById('detGrpName').textContent = groupSessionDoc.groupName || 'مجموعة جماعية';
  document.getElementById('detGrpTeacher').textContent = groupSessionDoc.teacherName || 'المعلم';
  document.getElementById('detGrpPresent').textContent = `${groupSessionDoc.presentCount || 0} طلاب`;
  document.getElementById('detGrpAbsent').textContent = `${groupSessionDoc.absentCount || 0} طلاب`;
  document.getElementById('detGrpRecordedTime').textContent = `🕒 تاريخ التسجيل: ${groupSessionDoc.date || ''} (الساعة ${groupSessionDoc.recordedAt || 'غير محدد'})`;

  const notesBox = document.getElementById('detGrpGeneralNotesBox');
  const notesText = document.getElementById('detGrpGeneralNotesText');
  if (groupSessionDoc.generalNotes) {
    notesBox.style.display = 'block';
    notesText.textContent = groupSessionDoc.generalNotes;
  } else {
    notesBox.style.display = 'none';
  }

  const tableContainer = document.getElementById('detGrpStudentsTable');
  const attendees = groupSessionDoc.attendees || [];

  if (attendees.length === 0) {
    tableContainer.innerHTML = `<p style="color: var(--text-muted); text-align: center;">لا تتوفّر تفاصيل طلاب لهذه الجلسة.</p>`;
  } else {
    tableContainer.innerHTML = attendees.map(st => {
      const isPresent = st.status === 'completed';
      const badgeBg = isPresent 
        ? 'background: rgba(16, 185, 129, 0.12); color: var(--success);' 
        : 'background: rgba(239, 68, 68, 0.12); color: var(--danger);';
      const statusLabel = isPresent 
        ? 'حاضر ✅' 
        : (st.absenceType === 'excused' ? 'غائب بعذر 🟢' : 'غائب بدون عذر 🔴');

      return `
        <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <strong style="font-size: 0.9rem; color: var(--text-primary); display: block;">${st.studentName}</strong>
            ${st.note ? `<span style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.15rem; display: block;">📝 ملاحظة: ${st.note}</span>` : ''}
          </div>
          <span class="badge" style="position: static; font-size: 0.78rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 6px; ${badgeBg}">
            ${statusLabel}
          </span>
        </div>
      `;
    }).join('');
  }

  modal.style.display = 'flex';
}
