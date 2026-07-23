import { db } from '../../config/firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from './toast.js';

/**
 * Backs up entire Firestore database by pulling major collections and downloading as JSON.
 */
export async function exportDatabaseBackup() {
  Toast.info("جاري تحضير النسخة الاحتياطية لقاعدة البيانات...");
  
  try {
    const collectionsToBackup = ['users', 'students', 'sessions', 'studentRequests', 'settings', 'notifications', 'auditLogs'];
    const backupData = {};

    for (const collName of collectionsToBackup) {
      const snap = await getDocs(collection(db, collName));
      backupData[collName] = [];
      snap.forEach(doc => {
        backupData[collName].push({ id: doc.id, ...doc.data() });
      });
    }

    const jsonString = JSON.stringify(backupData, null, 2);
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
