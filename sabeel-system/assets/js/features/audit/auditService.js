import { db } from '../../config/firebase.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Writes a security and operational log to Firestore auditLogs collection.
 * @param {string} actorId - ID of the user performing the action
 * @param {string} actorName - Name of the user performing the action
 * @param {string} action - Action descriptor (e.g., ADD_SESSION, DELETE_STUDENT)
 * @param {string|null} targetId - ID of the target resource if any
 * @param {object|string} details - Log details payload or message
 */
export async function writeAuditLog(actorId, actorName, action, targetId = null, details = {}) {
  try {
    const logData = {
      actorId,
      actorName,
      action,
      targetId,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      timestamp: new Date().toISOString()
    };

    await addDoc(collection(db, "auditLogs"), logData);
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
