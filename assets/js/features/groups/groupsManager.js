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
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Clean & Modular Group Management Module for Sabeel Academy
 */

/**
 * Fetches all groups for admin view
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
 * Fetches active groups for a given teacher
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
      const data = docSnap.data();
      if ((data.status || 'active') === 'active') {
        groups.push({ id: docSnap.id, ...data });
      }
    });
    return groups;
  } catch (err) {
    console.error("Error fetching teacher groups:", err);
    return [];
  }
}

/**
 * Fetches a group by ID
 */
export async function getGroupById(groupId) {
  if (!groupId) return null;
  try {
    const snap = await getDoc(doc(db, "groups", groupId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (err) {
    console.error(`Error fetching group ${groupId}:`, err);
    return null;
  }
}

/**
 * Creates a new group and syncs initial student memberships
 */
export async function createGroup({ 
  name, 
  teacherId, 
  teacherName = '', 
  sessionDay = 'السبت',
  sessionTime = '05:00 م',
  sessionDuration = 60, 
  maxCapacity = 10,
  studentIds = [], 
  notes = '', 
  status = 'active' 
}) {
  if (!name || !name.trim()) throw new Error("اسم المجموعة مطلوب.");
  if (!teacherId) throw new Error("المعلم المشرف مطلوب.");
  
  const cleanName = name.trim();
  const durationNum = parseInt(sessionDuration) || 60;
  const capacityNum = parseInt(maxCapacity) || 10;
  
  const docRef = await addDoc(collection(db, "groups"), {
    name: cleanName,
    teacherId,
    teacherName: teacherName || 'المعلم',
    sessionDay: sessionDay || 'السبت',
    sessionTime: sessionTime || '05:00 م',
    sessionDuration: durationNum,
    maxCapacity: capacityNum,
    studentIds: Array.isArray(studentIds) ? studentIds : [],
    status: status || 'active',
    notes: notes ? notes.trim() : '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const groupId = docRef.id;

  // Sync initial students
  if (Array.isArray(studentIds) && studentIds.length > 0) {
    for (const sid of studentIds) {
      await updateStudentGroupData(sid, {
        studentType: 'group',
        groupId: groupId,
        groupName: cleanName
      });
    }
  }

  return groupId;
}

/**
 * Updates a group's details and syncs associated student records if needed
 */
export async function updateGroup(groupId, updateData) {
  if (!groupId) return;
  const groupRef = doc(db, "groups", groupId);
  
  const payload = { ...updateData, updatedAt: serverTimestamp() };
  if (payload.name) payload.name = payload.name.trim();
  if (payload.sessionDuration) payload.sessionDuration = parseInt(payload.sessionDuration) || 60;
  if (payload.maxCapacity) payload.maxCapacity = parseInt(payload.maxCapacity) || 10;

  await updateDoc(groupRef, payload);

  // Sync group name changes across member students
  if (updateData.name || updateData.teacherName) {
    const snap = await getDoc(groupRef);
    if (snap.exists()) {
      const gData = snap.data();
      const sIds = gData.studentIds || [];
      for (const sid of sIds) {
        await updateStudentGroupData(sid, { 
          groupName: gData.name,
          ...(gData.teacherId ? { teacherId: gData.teacherId, teacherName: gData.teacherName } : {})
        });
      }
    }
  }
}

/**
 * Deletes a group and resets all member students to 'individual'
 */
export async function deleteGroup(groupId) {
  if (!groupId) return;
  try {
    const groupSnap = await getDoc(doc(db, "groups", groupId));
    if (groupSnap.exists()) {
      const studentIds = groupSnap.data().studentIds || [];
      for (const sid of studentIds) {
        await updateStudentGroupData(sid, {
          studentType: 'individual',
          groupId: '',
          groupName: ''
        });
      }
    }
  } catch (err) {
    console.error("Error cleaning up group members on delete:", err);
  }
  await deleteDoc(doc(db, "groups", groupId));
}

/**
 * Archives or unarchives a group
 */
export async function toggleGroupArchive(groupId, isArchived = true) {
  if (!groupId) return;
  await updateDoc(doc(db, "groups", groupId), {
    status: isArchived ? 'archived' : 'active',
    updatedAt: serverTimestamp()
  });
}

/**
 * Adds a student to a group with max capacity validation
 */
export async function addStudentToGroup(groupId, studentId, groupName = '') {
  if (!groupId || !studentId) return;
  const groupRef = doc(db, "groups", groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) throw new Error("المجموعة غير موجودة.");

  const gData = groupSnap.data();
  const currentStudents = gData.studentIds || [];
  const maxCap = gData.maxCapacity || 10;

  if (currentStudents.includes(studentId)) {
    // Already in group
    return;
  }

  if (currentStudents.length >= maxCap) {
    throw new Error(`عذراً، وصلت المجموعة (${gData.name}) للحد الأقصى لعدد الطلاب (${maxCap} طلاب).`);
  }
  
  await updateDoc(groupRef, {
    studentIds: arrayUnion(studentId),
    updatedAt: serverTimestamp()
  });

  await updateStudentGroupData(studentId, {
    studentType: 'group',
    groupId: groupId,
    groupName: gData.name || groupName || '',
    ...(gData.teacherId ? { teacherId: gData.teacherId, teacherName: gData.teacherName } : {})
  });
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

  await updateStudentGroupData(studentId, {
    studentType: 'individual',
    groupId: '',
    groupName: ''
  });
}

/**
 * Safely transfers a student between two groups
 */
export async function transferStudentBetweenGroups(fromGroupId, toGroupId, studentId) {
  if (!studentId || !toGroupId) return;
  if (fromGroupId === toGroupId) return;

  // Add to target group first (validates capacity)
  await addStudentToGroup(toGroupId, studentId);

  // Then remove from old group if successful
  if (fromGroupId) {
    const oldGroupRef = doc(db, "groups", fromGroupId);
    await updateDoc(oldGroupRef, {
      studentIds: arrayRemove(studentId),
      updatedAt: serverTimestamp()
    });
  }
}

/**
 * Fetches group details with full student objects populated
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
      let sSnap = await getDoc(doc(db, "students", sid));
      if (!sSnap.exists()) {
        sSnap = await getDoc(doc(db, "users", sid));
      }
      if (sSnap.exists()) {
        students.push({ id: sSnap.id, ...sSnap.data() });
      } else {
        students.push({ id: sid, name: 'طالب غير محدد' });
      }
    } catch (e) {
      students.push({ id: sid, name: 'طالب' });
    }
  }

  return { ...groupData, students };
}

/**
 * Helper to update student metadata across students or users collection
 */
async function updateStudentGroupData(studentId, dataToUpdate) {
  if (!studentId) return;
  try {
    const studentRef = doc(db, "students", studentId);
    const snap = await getDoc(studentRef);
    if (snap.exists()) {
      await updateDoc(studentRef, dataToUpdate);
    } else {
      const userRef = doc(db, "users", studentId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, dataToUpdate);
      }
    }
  } catch (err) {
    console.warn(`Could not update group info for student ${studentId}:`, err);
  }
}
