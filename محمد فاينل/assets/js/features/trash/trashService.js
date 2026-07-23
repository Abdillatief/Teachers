import { db } from '../../config/firebase.js';
import { collection, doc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Safely archives a document by saving it to a global 'trash' collection and then deleting the original.
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
      data: originalData,
      deletedAt: new Date().toISOString(),
      description: actionDescription
    };

    // 1. Write the backup to trash collection
    await addDoc(collection(db, "trash"), trashPayload);

    // 2. Delete the original document
    await deleteDoc(doc(db, collectionName, documentId));
    
  } catch (error) {
    console.error("Soft delete to trash failed:", error);
    throw error;
  }
}
