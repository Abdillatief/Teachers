import { db } from '../../config/firebase.js';
import { collection, doc, addDoc, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { UndoManager } from '../../shared/utils/undoManager.js';

/**
 * Restores a record from the 'trash' collection back to its original collection.
 * @param {string} trashDocId - ID of the record in the 'trash' collection
 * @param {string} collectionName - Target collection (e.g. "students", "sessions")
 * @param {string} documentId - Original document ID
 * @param {object} data - Document data to restore
 */
export async function restoreFromTrash(trashDocId, collectionName, documentId, data) {
  try {
    // 1. Re-insert document into original collection
    await setDoc(doc(db, collectionName, documentId), data);

    // 2. Remove from trash collection
    if (trashDocId) {
      await deleteDoc(doc(db, "trash", trashDocId));
    }
  } catch (error) {
    console.error("Failed to restore from trash:", error);
    throw error;
  }
}

/**
 * Safely archives a document by saving it to a global 'trash' collection and then deleting the original.
 * Automatically displays a 30-second Undo Snackbar.
 * @param {string} collectionName - Name of the source collection (e.g. "sessions", "students")
 * @param {string} documentId - ID of the document to delete
 * @param {object} originalData - Full data of the document being deleted
 * @param {string} actionDescription - Reason or action description for audit trail
 */
export async function softDeleteToTrash(collectionName, documentId, originalData, actionDescription = "") {
  try {
    const trashPayload = {
      originalId: documentId,
      collectionName: collectionName,
      originalCollection: collectionName,
      data: originalData,
      deletedAt: new Date().toISOString(),
      description: actionDescription
    };

    // 1. Write the backup to trash collection
    const trashRef = await addDoc(collection(db, "trash"), trashPayload);

    // 2. Delete the original document
    await deleteDoc(doc(db, collectionName, documentId));

    // 3. Trigger 30-second Undo Snackbar
    const itemName = originalData?.name || originalData?.studentName || originalData?.teacherName || originalData?.title || 'العنصر';
    const entityLabels = {
      students: 'الطالب',
      users: 'المستخدم / المعلم',
      teachers: 'المعلم',
      sessions: 'الحصة',
      subscriptions: 'الاشتراك',
      payments: 'الدفعة / الإيصال',
      reports: 'التقرير',
      homework: 'الواجب'
    };
    const entityName = entityLabels[collectionName] || 'العنصر';

    UndoManager.showUndo({
      message: `تم حذف ${entityName} "${itemName}" بنجاح.`,
      duration: 30000,
      restoreFn: async () => {
        await restoreFromTrash(trashRef.id, collectionName, documentId, originalData);
      }
    });

    return { trashDocId: trashRef.id, collectionName, documentId, originalData };
  } catch (error) {
    console.error("Soft delete to trash failed:", error);
    throw error;
  }
}

