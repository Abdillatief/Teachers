import { db } from '../../config/firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from './toast.js';
import { safeStringify } from './helpers.js';

/**
 * Standard list of collections to back up across Sabeel Academy.
 * Matches 100% of all platform modules and Restore system in admin/settings.html.
 */
export const BACKUP_COLLECTIONS = [
  "students", 
  "teachers", 
  "sessions", 
  "payments", 
  "subscriptions", 
  "packages", 
  "salaryArchive",
  "users",
  "studentRequests",
  "settings",
  "notifications",
  "auditLogs",
  "groups",
  "group_sessions"
];

/**
 * Shared data retrieval function: pulls documents from specified Firestore collections
 * and returns the exact data structure required by the Sabeel Restore system.
 * 
 * @param {object} firestoreDb - Firestore database instance
 * @param {Array<string>} collectionsList - List of collection names to dump
 * @returns {Promise<Object>} Map of collectionName -> Array<{ id, ...docData }>
 */
export async function getBackupData(firestoreDb = db, collectionsList = BACKUP_COLLECTIONS) {
  const backupData = {};

  for (const collName of collectionsList) {
    try {
      const snap = await getDocs(collection(firestoreDb, collName));
      backupData[collName] = [];
      snap.forEach(doc => {
        backupData[collName].push({ id: doc.id, ...doc.data() });
      });
    } catch (err) {
      console.warn(`[getBackupData] تنبيه: تعذر استخراج بيانات المجموعة ${collName}:`, err.message);
      backupData[collName] = [];
    }
  }

  return backupData;
}

/**
 * Backs up entire Firestore database by pulling major collections and downloading as JSON.
 */
export async function exportDatabaseBackup() {
  Toast.info("جاري تحضير النسخة الاحتياطية لقاعدة البيانات...");
  
  try {
    const backupData = await getBackupData(db, BACKUP_COLLECTIONS);

    const jsonString = safeStringify(backupData, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `sabeel_academy_backup_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);

    Toast.success("تم تصدير النسخة الاحتياطية وتحميلها بنجاح.");
  } catch (error) {
    console.error("Backup export failed:", error);
    Toast.error("فشل تصدير النسخة الاحتياطية لقاعدة البيانات.");
  }
}
