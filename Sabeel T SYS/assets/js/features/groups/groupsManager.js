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
 * Group Management Helper Module for Sabeel Academy
 */

/**
 * Fetches all groups for admin
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
export async function createGroup({ name, teacherId, teacherName, studentIds = [], notes = '' }) {
  if (!name || !teacherId) throw new Error("اسم المجموعة والمعلم المسؤول مطلوبان.");
  
  const docRef = await addDoc(collection(db, "groups"), {
    name: name.trim(),
    teacherId,
    teacherName: teacherName || 'غير مسمى',
    studentIds: Array.isArray(studentIds) ? studentIds : [],
    status: 'active',
    notes: notes.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
}

/**
 * Updates a group's details
 */
export async function updateGroup(groupId, updateData) {
  if (!groupId) return;
  const groupRef = doc(db, "groups", groupId);
  await updateDoc(groupRef, {
    ...updateData,
    updatedAt: serverTimestamp()
  });
}

/**
 * Deletes a group
 */
export async function deleteGroup(groupId) {
  if (!groupId) return;
  await deleteDoc(doc(db, "groups", groupId));
}

/**
 * Adds a student to a group
 */
export async function addStudentToGroup(groupId, studentId) {
  if (!groupId || !studentId) return;
  const groupRef = doc(db, "groups", groupId);
  await updateDoc(groupRef, {
    studentIds: arrayUnion(studentId),
    updatedAt: serverTimestamp()
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
}

/**
 * Transfers a student from one group to another
 */
export async function transferStudentBetweenGroups(fromGroupId, toGroupId, studentId) {
  if (!studentId || !toGroupId) return;
  if (fromGroupId) {
    await removeStudentFromGroup(fromGroupId, studentId);
  }
  await addStudentToGroup(toGroupId, studentId);
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
      const sSnap = await getDoc(doc(db, "users", sid));
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
