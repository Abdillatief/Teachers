/**
 * Sabeel Academy - Notification Templates Service
 * Handles pre-configured templates, placeholder replacements, and Admin customization
 */

import { db } from '../../config/firebase.js';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const DEFAULT_TEMPLATES = [
  {
    id: 'session_reminder',
    name: 'تذكير الحصة قبل 15 دقيقة',
    title: 'تذكير بموعد حصة قادمة',
    body: 'السلام عليكم {teacherName}، لديك حصة مع {studentName} بعد 15 دقيقة.',
    variables: ['teacherName', 'studentName'],
    priority: 'high',
    sound: 'chime',
    enabled: true,
    deepLink: '/teacher/today-sessions.html',
    category: 'sessions'
  },
  {
    id: 'session_start',
    name: 'بداية الحصة الآن',
    title: 'حان موعد الحصة الآن',
    body: 'حان موعد حصتك الآن مع {studentName}. نتمنى لك حصة موفقة ومباركة.',
    variables: ['teacherName', 'studentName'],
    priority: 'urgent',
    sound: 'bell',
    enabled: true,
    deepLink: '/teacher/today-sessions.html',
    category: 'sessions'
  },
  {
    id: 'session_unrecorded_1h',
    name: 'عدم تسجيل الحصة بعد ساعة',
    title: 'تنبيه: عدم تسجيل الحصة',
    body: 'السلام عليكم {teacherName}، مضت ساعة على موعد حصتك مع {studentName} ولم يتم توثيقها بعد. يرجى تسجيل الحصة لضمان احتسابها في الراتب.',
    variables: ['teacherName', 'studentName'],
    priority: 'urgent',
    sound: 'alert',
    enabled: true,
    deepLink: '/teacher/today-sessions.html',
    category: 'sessions'
  },
  {
    id: 'salary_deposit',
    name: 'نزول الراتب والمستحقات',
    title: 'إيداع مستحقات الراتب',
    body: 'تم اعتماد مستحقات الراتب لشهر {month}. يمكنك الاطلاع على التفاصيل وتأكيد الاستلام عبر قسم الراتب.',
    variables: ['month'],
    priority: 'normal',
    sound: 'cash',
    enabled: true,
    deepLink: '/teacher/current-salary.html',
    category: 'salary'
  },
  {
    id: 'admin_message',
    name: 'رسالة وتوجيه إداري',
    title: 'توجيه إداري من إدارة الأكاديمية',
    body: '{message}',
    variables: ['message'],
    priority: 'normal',
    sound: 'default',
    enabled: true,
    deepLink: '/teacher/dashboard.html',
    category: 'administrative'
  },
  {
    id: 'community_post',
    name: 'منشور جديد في الملتقى',
    title: 'منشور جديد في ملتقى الأكاديمية',
    body: 'نشر {authorName} منشوراً جديداً في الملتقى: "{postTitle}"',
    variables: ['authorName', 'postTitle'],
    priority: 'low',
    sound: 'pop',
    enabled: true,
    deepLink: '/teacher/community.html',
    category: 'community'
  },
  {
    id: 'subscription_expiry',
    name: 'انتهاء باقة الطالب',
    title: 'تنبيه رصيد باقة الطالب',
    body: 'تنبيه: أوشك رصيد حصص الطالب {studentName} على النفاد (المتبقي: {remainingLessons} حصص). يرجى التنسيق للتجديد.',
    variables: ['studentName', 'remainingLessons'],
    priority: 'normal',
    sound: 'warning',
    enabled: true,
    deepLink: '/admin/subscriptions.html',
    category: 'finance'
  },
  {
    id: 'maintenance_mode',
    name: 'وضع الصيانة والترقية',
    title: 'تنبيه صيانة النظام',
    body: 'يقوم الفريق التقني للأكاديمية حالياً ببعض أعمال الصيانة والتحسينات المجدولة. نعتذر عن أي إزعاج مؤقت.',
    variables: [],
    priority: 'urgent',
    sound: 'alert',
    enabled: true,
    deepLink: '/teacher/maintenance.html',
    category: 'system'
  }
];

/**
 * Initializes default templates in Firestore if they do not exist
 */
export async function seedDefaultTemplates() {
  try {
    for (const tpl of DEFAULT_TEMPLATES) {
      const docRef = doc(db, 'notification_templates', tpl.id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, {
          ...tpl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.warn('[TemplateService] Error seeding templates:', err);
  }
}

/**
 * Fetches all templates from Firestore (or fallback defaults)
 */
export async function getAllTemplates() {
  try {
    const snap = await getDocs(collection(db, 'notification_templates'));
    if (snap.empty) {
      await seedDefaultTemplates();
      return DEFAULT_TEMPLATES;
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('[TemplateService] Error getting templates:', err);
    return DEFAULT_TEMPLATES;
  }
}

/**
 * Updates a notification template in Firestore
 */
export async function updateTemplate(templateId, updates) {
  try {
    const docRef = doc(db, 'notification_templates', templateId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Renders template body and title by substituting variables
 * e.g. "السلام عليكم {teacherName}" -> "السلام عليكم أ. أحمد"
 */
export function renderTemplateContent(template, values = {}) {
  let title = template.title || '';
  let body = template.body || '';

  Object.entries(values).forEach(([key, val]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    const replacement = val !== undefined && val !== null ? String(val) : '';
    title = title.replace(regex, replacement);
    body = body.replace(regex, replacement);
  });

  return { title, body };
}
