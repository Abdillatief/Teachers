import { db } from '../../config/firebase.js';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  arrayUnion, 
  arrayRemove, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { syncStudentOperationalSummary } from '../supervisor/supervisorDomainService.js';

/**
 * New Independent Group Management Service for Sabeel Academy
 * Manages groups and syncs seamlessly with the students collection.
 */

/**
 * Fetches all groups from Firestore
 */
export async function getAllGroups() {
  try {
    const snap = await getDocs(collection(db, "groups"));
    const groups = [];
    snap.forEach(docSnap => {
      groups.push({ id: docSnap.id, ...docSnap.data() });
    });
    return groups;
  } catch (err) {
    console.error("Error fetching all groups:", err);
    return [];
  }
}

/**
 * Fetches groups assigned to a specific teacher
 * @param {string} teacherId 
 */
export async function getTeacherGroups(teacherId) {
  if (!teacherId) return [];
  try {
    const q = query(
      collection(db, "groups"),
      where("teacherId", "==", teacherId)
    );
    const snap = await getDocs(q);
    const groups = [];
    snap.forEach(docSnap => {
      groups.push({ id: docSnap.id, ...docSnap.data() });
    });
    return groups;
  } catch (err) {
    console.error("Error fetching teacher groups:", err);
    return [];
  }
}

/**
 * Creates a new group
 */
export async function createGroup({ 
  name, 
  teacherId, 
  teacherName = '', 
  day = 'السبت', 
  time = '05:30 مساءً', 
  maxStudents = 10, 
  status = 'active', 
  studentIds = [], 
  notes = '' 
}) {
  if (!name || !name.trim()) throw new Error("اسم المجموعة مطلوب.");
  if (!teacherId) throw new Error("يرجى اختيار المعلم المسؤول عن المجموعة.");

  const docRef = await addDoc(collection(db, "groups"), {
    name: name.trim(),
    teacherId,
    teacherName: teacherName || 'غير مسمى',
    day: day || 'السبت',
    time: time || '05:30 مساءً',
    maxStudents: parseInt(maxStudents) || 10,
    status: status || 'active',
    studentIds: Array.isArray(studentIds) ? studentIds : [],
    notes: (notes || '').trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
}

/**
 * Updates a group's information and syncs changes to all attached students
 */
export async function updateGroup(groupId, updateData) {
  if (!groupId) return;
  
  const groupRef = doc(db, "groups", groupId);
  const cleanData = {
    ...updateData,
    updatedAt: serverTimestamp()
  };

  if (cleanData.maxStudents) {
    cleanData.maxStudents = parseInt(cleanData.maxStudents) || 10;
  }

  await updateDoc(groupRef, cleanData);

  // Sync group name, teacher, day, time to connected students in 'students' collection
  try {
    const studentsQuery = query(collection(db, "students"), where("groupId", "==", groupId));
    const snap = await getDocs(studentsQuery);

    const studentUpdates = [];
    const affectedStudentIds = [];
    snap.forEach(docSnap => {
      affectedStudentIds.push(docSnap.id);
      const existingData = docSnap.data() || {};
      const payload = {};
      if (cleanData.name) payload.groupName = cleanData.name;
      if (cleanData.teacherId) payload.teacherId = cleanData.teacherId;
      if (cleanData.teacherName) payload.teacherName = cleanData.teacherName;
      if (cleanData.day) {
        payload.days = [cleanData.day];
        payload.sessionDays = [cleanData.day];
      }
      if (cleanData.time) {
        payload.time = cleanData.time;
        payload.sessionTime = cleanData.time;
      }
      // لازم نحدّث كائن الجدول نفسه؛ لأن حساب «وقت الحصة» عند المشرف يقرأ schedule.uniformTime أولاً
      if (cleanData.day || cleanData.time) {
        const nextDays = cleanData.day
          ? [cleanData.day]
          : (Array.isArray(existingData.days) ? existingData.days : (existingData.schedule?.days || []));
        const nextTime = cleanData.time
          || existingData.schedule?.uniformTime
          || existingData.sessionTime
          || existingData.time
          || '';
        payload.schedule = {
          days: nextDays,
          uniformTime: nextTime,
          differentTimes: false,
          times: {}
        };
      }

      if (Object.keys(payload).length > 0) {
        studentUpdates.push(updateDoc(doc(db, "students", docSnap.id), payload));
      }
    });

    await Promise.all(studentUpdates);
    // حدّث الملخص التشغيلي فوراً حتى تظهر الأيام والوقت الجديد عند المشرف
    await Promise.allSettled(affectedStudentIds.map(sid => syncStudentOperationalSummary(sid)));
  } catch (syncErr) {
    console.warn("Notice: Error syncing group updates to student records:", syncErr);
  }
}

/**
 * Deletes a group and resets subscription fields for connected students
 */
export async function deleteGroup(groupId) {
  if (!groupId) return;

  // 1. Fetch group to find students
  const groupSnap = await getDoc(doc(db, "groups", groupId));
  if (groupSnap.exists()) {
    const gData = groupSnap.data();
    const studentIds = gData.studentIds || [];

    // Reset student fields in 'students' collection
    const resets = studentIds.map(sid => {
      return updateDoc(doc(db, "students", sid), {
        subscriptionType: 'individual',
        groupId: '',
        groupName: ''
      }).catch(() => {});
    });
    await Promise.all(resets);
    await Promise.allSettled(studentIds.map(sid => syncStudentOperationalSummary(sid)));
  }

  // Also query students with matching groupId
  try {
    const q = query(collection(db, "students"), where("groupId", "==", groupId));
    const snap = await getDocs(q);
    const detachedIds = snap.docs.map(docSnap => docSnap.id);
    const queryResets = snap.docs.map(docSnap => {
      return updateDoc(doc(db, "students", docSnap.id), {
        subscriptionType: 'individual',
        groupId: '',
        groupName: ''
      }).catch(() => {});
    });
    await Promise.all(queryResets);
    await Promise.allSettled(detachedIds.map(sid => syncStudentOperationalSummary(sid)));
  } catch (e) {}

  await deleteDoc(doc(db, "groups", groupId));
}

/**
 * Adds a student to a group with capacity validation
 */
export async function addStudentToGroup(groupId, studentId) {
  if (!groupId || !studentId) throw new Error("بيانات غير مكتملة.");

  const groupRef = doc(db, "groups", groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) throw new Error("المجموعة غير موجودة.");

  const groupData = groupSnap.data();
  const currentStudentIds = groupData.studentIds || [];
  const maxStudents = parseInt(groupData.maxStudents) || 10;

  if (currentStudentIds.length >= maxStudents && !currentStudentIds.includes(studentId)) {
    throw new Error(`عذراً، وصلت المجموعة إلى الحد الأقصى المسموح به (${maxStudents} طلاب).`);
  }

  // 1. Add student to group's studentIds array
  await updateDoc(groupRef, {
    studentIds: arrayUnion(studentId),
    updatedAt: serverTimestamp()
  });

  // 2. Update student doc in 'students' collection
  const studentRef = doc(db, "students", studentId);
  await updateDoc(studentRef, {
    subscriptionType: 'group',
    groupId: groupId,
    groupName: groupData.name || '',
    teacherId: groupData.teacherId || '',
    teacherName: groupData.teacherName || '',
    days: groupData.day ? [groupData.day] : ['السبت'],
    sessionDays: groupData.day ? [groupData.day] : ['السبت'],
    time: groupData.time || '05:30 مساءً',
    sessionTime: groupData.time || '05:30 مساءً',
    schedule: {
      days: groupData.day ? [groupData.day] : ['السبت'],
      uniformTime: groupData.time || '05:30 مساءً',
      differentTimes: false,
      times: {}
    }
  });
  await syncStudentOperationalSummary(studentId);
}

/**
 * Removes a student from a group
 */
export async function removeStudentFromGroup(groupId, studentId) {
  if (!groupId || !studentId) return;

  const groupRef = doc(db, "groups", groupId);
  await updateDoc(groupRef, {
    studentIds: arrayRemove(studentId),
    updatedAt: serverTimestamp()
  });

  const studentRef = doc(db, "students", studentId);
  await updateDoc(studentRef, {
    subscriptionType: 'individual',
    groupId: '',
    groupName: ''
  });
  await syncStudentOperationalSummary(studentId);
}

/**
 * Transfers a student between groups with capacity check
 */
export async function transferStudentBetweenGroups(fromGroupId, toGroupId, studentId) {
  if (!studentId || !toGroupId) throw new Error("المجموعة المستهدفة مطلوبة.");

  // Check target group capacity
  const targetGroupRef = doc(db, "groups", toGroupId);
  const targetSnap = await getDoc(targetGroupRef);
  if (!targetSnap.exists()) throw new Error("المجموعة المستهدفة غير موجودة.");

  const targetData = targetSnap.data();
  const currentIds = targetData.studentIds || [];
  const maxLimit = parseInt(targetData.maxStudents) || 10;

  if (currentIds.length >= maxLimit && !currentIds.includes(studentId)) {
    throw new Error(`عذراً، المجموعة المستهدفة وصلت للحد الأقصى (${maxLimit} طلاب).`);
  }

  // Remove from old group if specified
  if (fromGroupId) {
    const oldGroupRef = doc(db, "groups", fromGroupId);
    await updateDoc(oldGroupRef, {
      studentIds: arrayRemove(studentId),
      updatedAt: serverTimestamp()
    });
  }

  // Add to target group
  await updateDoc(targetGroupRef, {
    studentIds: arrayUnion(studentId),
    updatedAt: serverTimestamp()
  });

  // Update student doc
  const studentRef = doc(db, "students", studentId);
  await updateDoc(studentRef, {
    subscriptionType: 'group',
    groupId: toGroupId,
    groupName: targetData.name || '',
    teacherId: targetData.teacherId || '',
    teacherName: targetData.teacherName || '',
    days: targetData.day ? [targetData.day] : ['السبت'],
    sessionDays: targetData.day ? [targetData.day] : ['السبت'],
    time: targetData.time || '05:30 مساءً',
    sessionTime: targetData.time || '05:30 مساءً',
    schedule: {
      days: targetData.day ? [targetData.day] : ['السبت'],
      uniformTime: targetData.time || '05:30 مساءً',
      differentTimes: false,
      times: {}
    }
  });
  await syncStudentOperationalSummary(studentId);
}

/**
 * Fetches group details with student objects populated from the 'students' collection
 */
export async function getGroupWithStudentDetails(groupId) {
  if (!groupId) return null;
  const groupSnap = await getDoc(doc(db, "groups", groupId));
  if (!groupSnap.exists()) return null;

  const groupData = { id: groupSnap.id, ...groupSnap.data() };
  const studentIds = groupData.studentIds || [];
  const students = [];

  for (const sid of studentIds) {
    try {
      const sSnap = await getDoc(doc(db, "students", sid));
      if (sSnap.exists()) {
        students.push({ id: sSnap.id, ...sSnap.data() });
      } else {
        students.push({ id: sid, name: 'طالب' });
      }
    } catch (e) {
      students.push({ id: sid, name: 'طالب' });
    }
  }

  return { ...groupData, students };
}
