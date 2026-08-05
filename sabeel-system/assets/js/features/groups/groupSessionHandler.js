import { db } from '../../config/firebase.js';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from '../../shared/utils/toast.js';
import { logAuditLog } from '../../shared/utils/activityLogger.js';

/**
 * Group Session Handling Utility according to Sabeel Academy Business Logic
 */

/**
 * Fetches active groups for teacher and populates the given select element
 */
export async function populateGroupSelect(selectElement, teacherId) {
  if (!selectElement) return [];
  selectElement.innerHTML = '<option value="">-- اختر المجموعة الجماعية --</option>';

  let q;
  if (teacherId) {
    q = query(collection(db, "groups"), where("teacherId", "==", teacherId));
  } else {
    q = query(collection(db, "groups"));
  }

  const snap = await getDocs(q);
  const groups = [];
  snap.forEach(docSnap => {
    const data = docSnap.data();
    if ((data.status || 'active') === 'active') {
      groups.push({ id: docSnap.id, ...data });
    }
  });

  groups.forEach(g => {
    const count = (g.studentIds || []).length;
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = `${g.name} (${count} طلاب)`;
    selectElement.appendChild(opt);
  });

  return groups;
}

/**
 * Renders attendance controls for a selected group inside containerElement
 */
export async function renderGroupSessionUI(containerElement, group, studentsMap = new Map()) {
  if (!containerElement) return { isValid: false };
  containerElement.innerHTML = '';

  const studentIds = group ? (group.studentIds || []) : [];

  // Case 1: Empty Group
  if (!group || studentIds.length === 0) {
    containerElement.innerHTML = `
      <div style="background: rgba(239, 68, 68, 0.08); border: 1px dashed var(--danger); border-radius: 8px; padding: 1.25rem; text-align: center; margin-top: 0.75rem;">
        <p style="color: var(--danger); font-weight: 800; font-size: 0.9rem; margin-bottom: 0.75rem;">
          ⚠️ لا يوجد طلاب داخل هذه المجموعة.
        </p>
        <p style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 1rem;">
          لا يمكن تسجيل حصة لمجموعة فارغة. يرجى إضافة طالب واحد على الأقل للمجموعة أولاً.
        </p>
        <a href="../teacher/groups.html" class="btn btn-primary" style="font-size: 0.82rem; padding: 0.45rem 1rem; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;">
          <i data-lucide="user-plus" style="width: 16px; height: 16px;"></i> إدارة المجموعة وإضافة طلاب 👥
        </a>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return { isValid: false };
  }

  // Fetch missing student details if not in studentsMap
  const studentList = [];
  for (const sid of studentIds) {
    if (studentsMap.has(sid)) {
      studentList.push(studentsMap.get(sid));
    } else {
      try {
        const sSnap = await getDoc(doc(db, "users", sid));
        if (sSnap.exists()) {
          const sData = { id: sSnap.id, ...sSnap.data() };
          studentsMap.set(sid, sData);
          studentList.push(sData);
        } else {
          studentList.push({ id: sid, name: 'طالب غير محدد' });
        }
      } catch (e) {
        studentList.push({ id: sid, name: 'طالب' });
      }
    }
  }

  // Case 2: Group has students -> Show Attendance Options
  const html = `
    <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-top: 0.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <h4 style="font-size: 0.9rem; font-weight: 800; color: var(--primary-color); margin: 0; display: flex; align-items: center; gap: 0.35rem;">
          <i data-lucide="users" style="width: 18px; height: 18px;"></i> تحضير طلاب المجموعة (${studentList.length} طلاب)
        </h4>
      </div>

      <!-- Attendance Mode Radios -->
      <div style="display: flex; gap: 1.5rem; margin-bottom: 1rem; background: var(--bg-card); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color);">
        <label style="display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 0.88rem; cursor: pointer; color: var(--success);">
          <input type="radio" name="grpAttendanceMode_${group.id}" value="all_present" checked style="accent-color: var(--success); width: 18px; height: 18px;">
          <span>✅ الجميع حاضرون (${studentList.length})</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 0.88rem; cursor: pointer; color: var(--danger);">
          <input type="radio" name="grpAttendanceMode_${group.id}" value="some_absent" style="accent-color: var(--danger); width: 18px; height: 18px;">
          <span>🔴 يوجد غياب</span>
        </label>
      </div>

      <!-- Student Checklist Container -->
      <div id="grpStudentsChecklistContainer_${group.id}" style="display: none; flex-direction: column; gap: 0.65rem; max-height: 250px; overflow-y: auto; padding-left: 0.25rem;">
        ${studentList.map(st => `
          <div class="grp-student-row" data-id="${st.id}" data-name="${st.name}" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.6rem 0.8rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
              <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${st.name}</span>
              <label style="display: flex; align-items: center; gap: 0.4rem; font-weight: 800; font-size: 0.82rem; cursor: pointer; user-select: none;">
                <input type="checkbox" class="grp-st-checkbox" checked style="width: 18px; height: 18px; accent-color: var(--success);">
                <span class="grp-st-label" style="color: var(--success);">حاضر ✅</span>
              </label>
            </div>

            <!-- Absence details drawer (hidden by default) -->
            <div class="grp-st-absence-box" style="display: none; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color); grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div>
                <label style="font-size: 0.72rem; color: var(--text-secondary); display: block; margin-bottom: 0.2rem;">مبرر الغياب</label>
                <select class="grp-st-absence-type form-control" style="font-size: 0.78rem; padding: 0.25rem 0.5rem;">
                  <option value="unexcused" selected>بدون عذر (يُحسب) 🔴</option>
                  <option value="excused">بعذر (لا يُحسب) 🟢</option>
                </select>
              </div>
              <div>
                <label style="font-size: 0.72rem; color: var(--text-secondary); display: block; margin-bottom: 0.2rem;">ملاحظة خاصة بالغياب</label>
                <input type="text" class="grp-st-note form-control" placeholder="سبب الغياب..." style="font-size: 0.78rem; padding: 0.25rem 0.5rem;">
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  containerElement.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();

  const radioModeAll = containerElement.querySelector(`input[value="all_present"]`);
  const radioModeSome = containerElement.querySelector(`input[value="some_absent"]`);
  const checklistContainer = containerElement.querySelector(`#grpStudentsChecklistContainer_${group.id}`);

  radioModeAll.addEventListener('change', () => {
    checklistContainer.style.display = 'none';
  });

  radioModeSome.addEventListener('change', () => {
    checklistContainer.style.display = 'flex';
  });

  // Bind checkbox toggle for each student
  containerElement.querySelectorAll('.grp-student-row').forEach(row => {
    const cb = row.querySelector('.grp-st-checkbox');
    const labelSpan = row.querySelector('.grp-st-label');
    const absenceBox = row.querySelector('.grp-st-absence-box');

    cb.addEventListener('change', () => {
      if (cb.checked) {
        labelSpan.textContent = 'حاضر ✅';
        labelSpan.style.color = 'var(--success)';
        absenceBox.style.display = 'none';
      } else {
        labelSpan.textContent = 'غائب 🔴';
        labelSpan.style.color = 'var(--danger)';
        absenceBox.style.display = 'grid';
      }
    });
  });

  return {
    isValid: true,
    getAttendanceData: () => {
      const isAllPresent = radioModeAll.checked;
      const records = [];

      containerElement.querySelectorAll('.grp-student-row').forEach(row => {
        const studentId = row.dataset.id;
        const studentName = row.dataset.name;
        const isPresent = isAllPresent ? true : row.querySelector('.grp-st-checkbox').checked;
        const absenceType = isPresent ? '' : row.querySelector('.grp-st-absence-type').value;
        const note = isPresent ? '' : row.querySelector('.grp-st-note').value.trim();

        records.push({
          studentId,
          studentName,
          isPresent,
          absenceType,
          note
        });
      });

      return records;
    }
  };
}

/**
 * Executes group session recording: Creates individual session docs in Firestore linked by groupBatchId
 */
export async function executeGroupSessionSubmit({
  group,
  teacherId,
  teacherName,
  duration,
  date,
  time,
  attendanceRecords,
  groupNotes = '',
  rating = 5
}) {
  if (!group || !attendanceRecords || attendanceRecords.length === 0) {
    throw new Error("بيانات المجموعة والحضور غير مكتملة.");
  }

  // 1. Fetch teacher details to determine group hourly rate
  let groupHourlyRate = 120;
  try {
    const tSnap = await getDoc(doc(db, "users", teacherId));
    if (tSnap.exists()) {
      const tData = tSnap.data();
      groupHourlyRate = parseFloat(tData.hourlyRateGroup || tData.hourlyRateIndividual || tData.hourlyRate || 120);
    }
  } catch (e) {
    console.warn("Could not fetch teacher group rate, using default 120:", e);
  }

  const durationHours = (parseInt(duration) || 60) / 60;
  const earningsPerStudent = durationHours * groupHourlyRate;

  // Generate unique Batch ID linking all individual student records
  const groupBatchId = `gbatch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let presentCount = 0;
  let absentCount = 0;

  for (const st of attendanceRecords) {
    const isPresent = st.isPresent;
    if (isPresent) presentCount++; else absentCount++;

    const isCalculatedSalary = isPresent || (st.absenceType === 'unexcused');
    const teacherEarnings = isCalculatedSalary ? earningsPerStudent : 0;

    const sessRef = doc(collection(db, "sessions"));
    const payload = {
      id: sessRef.id,
      groupBatchId,
      groupId: group.id,
      groupName: group.name,
      studentId: st.studentId,
      studentName: st.studentName,
      teacherId,
      teacherName: teacherName || 'المعلم',
      date,
      time,
      duration: parseInt(duration) || 60,
      type: "group",
      sessionType: "group",
      status: isPresent ? "completed" : "student_absent",
      absenceType: !isPresent ? (st.absenceType || "unexcused") : "",
      rating: rating,
      notes: st.note ? `${groupNotes ? groupNotes + ' | ' : ''}ملاحظة الطالب: ${st.note}` : (groupNotes || "حصة جماعية"),
      hourlyRateUsed: groupHourlyRate,
      teacherEarnings: teacherEarnings,
      approved: true,
      salaryCalculated: isCalculatedSalary,
      isCalculated: isCalculatedSalary,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(sessRef, payload);

    // Update student activity metadata in students/users collection
    try {
      const studentDocRef = doc(db, "students", st.studentId);
      const studentSnap = await getDoc(studentDocRef);
      if (studentSnap.exists()) {
        await updateDoc(studentDocRef, {
          lastSessionDate: date,
          sessionsCount: (parseInt(studentSnap.data().sessionsCount) || 0) + 1
        });
      }
    } catch (e) {
      // ignore
    }
  }

  // Audit Log
  await logAuditLog(teacherId, teacherName, "RECORD_GROUP_SESSION", null, {
    groupId: group.id,
    groupName: group.name,
    groupBatchId,
    presentCount,
    absentCount,
    duration
  });

  return {
    groupBatchId,
    presentCount,
    absentCount,
    totalStudents: attendanceRecords.length
  };
}
