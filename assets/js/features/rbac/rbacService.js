import { db } from '../../config/firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteField,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export const RBAC_COLLECTIONS = {
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  ROLE_PERMISSIONS: 'role_permissions',
  USER_ROLES: 'user_roles'
};

export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  TEACHER: 'teacher'
};

export const PERMISSIONS = {
  VIEW_SUPERVISOR_DASHBOARD: 'view_supervisor_dashboard',
  VIEW_STUDENTS: 'view_students',
  EDIT_STUDENT_OPERATIONAL: 'edit_student_operational',
  VIEW_LESSONS: 'view_lessons',
  MANAGE_LESSONS: 'manage_lessons',
  EDIT_LESSON_DURATION: 'edit_lesson_duration',
  VIEW_ABSENCES: 'view_absences',
  VIEW_POSTPONED_LESSONS: 'view_postponed_lessons',
  VIEW_SCHEDULES: 'view_schedules',
  EDIT_SCHEDULES: 'edit_schedules',
  CREATE_REQUESTS: 'create_requests',
  VIEW_OPERATIONAL_REPORTS: 'view_operational_reports'
};

export const ALL_PERMISSION_KEYS = Object.values(PERMISSIONS);

export const PERMISSION_CATALOG = [
  {
    key: PERMISSIONS.VIEW_SUPERVISOR_DASHBOARD,
    group: 'overview',
    groupLabel: 'لوحة القيادة والتقارير',
    label: 'عرض لوحة المشرف الرئيسية',
    description: 'الاطلاع على مؤشرات التشغيل اليومية وحالة الحصص والغياب دون بيانات مالية.'
  },
  {
    key: PERMISSIONS.VIEW_OPERATIONAL_REPORTS,
    group: 'overview',
    groupLabel: 'لوحة القيادة والتقارير',
    label: 'عرض التقارير التشغيلية',
    description: 'مراقبة معدلات الالتزام والحضور والتأجيل وتصدير تقارير التشغيل غير المالية.'
  },
  {
    key: PERMISSIONS.VIEW_STUDENTS,
    group: 'students',
    groupLabel: 'شؤون الطلاب التشغيلية',
    label: 'عرض بيانات الطلاب التشغيلية',
    description: 'رؤية الاسم والعمر وولي الأمر ووسائل التواصل والباقة والحصص المتبقية والجدول.'
  },
  {
    key: PERMISSIONS.EDIT_STUDENT_OPERATIONAL,
    group: 'students',
    groupLabel: 'شؤون الطلاب التشغيلية',
    label: 'تعديل بيانات الطلاب التشغيلية',
    description: 'تحديث الملاحظات التشغيلية وبيانات التواصل وحالة الانتظام ومستوى الحفظ.'
  },
  {
    key: PERMISSIONS.VIEW_LESSONS,
    group: 'lessons',
    groupLabel: 'الحصص والغياب والتعويض',
    label: 'عرض ومتابعة سجل الحصص',
    description: 'الاطلاع على حالة الحصص اليومية والأرشيف التشغيلي للمعلمين والطلاب.'
  },
  {
    key: PERMISSIONS.MANAGE_LESSONS,
    group: 'lessons',
    groupLabel: 'الحصص والغياب والتعويض',
    label: 'إدارة وتسجيل الحصص',
    description: 'تسجيل حالات الحضور والغياب والتأجيل والتعويض والإلغاء مع توثيق الأسباب.'
  },
  {
    key: PERMISSIONS.EDIT_LESSON_DURATION,
    group: 'lessons',
    groupLabel: 'الحصص والغياب والتعويض',
    label: 'تعديل مدة الحصة يدوياً',
    description: 'السماح بتجاوز القفل التلقائي لمدة الحصة المحدد من باقة الطالب.'
  },
  {
    key: PERMISSIONS.VIEW_ABSENCES,
    group: 'lessons',
    groupLabel: 'الحصص والغياب والتعويض',
    label: 'عرض سجل الغياب',
    description: 'متابعة غياب الطلاب وغياب المعلمين (سجل غير قابل للحذف).'
  },
  {
    key: PERMISSIONS.VIEW_POSTPONED_LESSONS,
    group: 'lessons',
    groupLabel: 'الحصص والغياب والتعويض',
    label: 'متابعة الحصص المؤجلة والتعويضية',
    description: 'إدارة ربط الحصص المؤجلة بالحصص التعويضية ومتابعة حالة التعويض.'
  },
  {
    key: PERMISSIONS.VIEW_SCHEDULES,
    group: 'schedules',
    groupLabel: 'الجداول والطلبات',
    label: 'عرض الجداول والأوقات المتاحة',
    description: 'استعراض جدول كل معلم أسبوعياً واكتشاف الفترات الفارغة المتاحة.'
  },
  {
    key: PERMISSIONS.EDIT_SCHEDULES,
    group: 'schedules',
    groupLabel: 'الجداول والطلبات',
    label: 'تعديل جداول الحصص',
    description: 'تعديل أيام وأوقات الحصص التشغيلية للطلاب مع توثيق التعديل في السجل.'
  },
  {
    key: PERMISSIONS.CREATE_REQUESTS,
    group: 'schedules',
    groupLabel: 'الجداول والطلبات',
    label: 'إرسال طلبات إدارية للمدير',
    description: 'رفع طلبات تغيير الباقة أو استبدال المعلم أو الحذف ومتابعة قرار المدير.'
  }
];

export const PERMISSION_PRESETS = {
  general_ops: {
    id: 'general_ops',
    label: 'مشرف تشغيل عام (شامل تشغيلي)',
    description: 'صلاحيات تشغيلية كاملة للمتابعة وإدارة الحصص والجداول دون تعديل مدة الحصة أو البيانات المالية.',
    permissions: [
      PERMISSIONS.VIEW_SUPERVISOR_DASHBOARD,
      PERMISSIONS.VIEW_STUDENTS,
      PERMISSIONS.EDIT_STUDENT_OPERATIONAL,
      PERMISSIONS.VIEW_LESSONS,
      PERMISSIONS.MANAGE_LESSONS,
      PERMISSIONS.VIEW_ABSENCES,
      PERMISSIONS.VIEW_POSTPONED_LESSONS,
      PERMISSIONS.VIEW_SCHEDULES,
      PERMISSIONS.EDIT_SCHEDULES,
      PERMISSIONS.CREATE_REQUESTS,
      PERMISSIONS.VIEW_OPERATIONAL_REPORTS
    ]
  },
  students_ops: {
    id: 'students_ops',
    label: 'مشرف متابعة الطلاب والجداول',
    description: 'التركيز على بيانات الطلاب التشغيلية والجداول والأوقات المتاحة والطلبات.',
    permissions: [
      PERMISSIONS.VIEW_SUPERVISOR_DASHBOARD,
      PERMISSIONS.VIEW_STUDENTS,
      PERMISSIONS.EDIT_STUDENT_OPERATIONAL,
      PERMISSIONS.VIEW_SCHEDULES,
      PERMISSIONS.EDIT_SCHEDULES,
      PERMISSIONS.CREATE_REQUESTS
    ]
  },
  lessons_ops: {
    id: 'lessons_ops',
    label: 'مشرف متابعة الحصص والغياب',
    description: 'متابعة الحصص اليومية والغياب والتأجيل والتعويض دون تعديل ملفات الطلاب.',
    permissions: [
      PERMISSIONS.VIEW_SUPERVISOR_DASHBOARD,
      PERMISSIONS.VIEW_STUDENTS,
      PERMISSIONS.VIEW_LESSONS,
      PERMISSIONS.MANAGE_LESSONS,
      PERMISSIONS.VIEW_ABSENCES,
      PERMISSIONS.VIEW_POSTPONED_LESSONS,
      PERMISSIONS.VIEW_SCHEDULES,
      PERMISSIONS.CREATE_REQUESTS,
      PERMISSIONS.VIEW_OPERATIONAL_REPORTS
    ]
  },
  readonly_ops: {
    id: 'readonly_ops',
    label: 'مشرف مراقبة وقراءة فقط',
    description: 'صلاحيات عرض واستطلاع دون تعديل مع إمكانية رفع الطلبات للمدير.',
    permissions: [
      PERMISSIONS.VIEW_SUPERVISOR_DASHBOARD,
      PERMISSIONS.VIEW_STUDENTS,
      PERMISSIONS.VIEW_LESSONS,
      PERMISSIONS.VIEW_ABSENCES,
      PERMISSIONS.VIEW_POSTPONED_LESSONS,
      PERMISSIONS.VIEW_SCHEDULES,
      PERMISSIONS.CREATE_REQUESTS,
      PERMISSIONS.VIEW_OPERATIONAL_REPORTS
    ]
  }
};

export const SUPERVISOR_PAGE_ACCESS = [
  {
    id: 'supervisor-dashboard',
    file: 'dashboard.html',
    url: '/supervisor/dashboard.html',
    title: 'لوحة المشرف',
    section: 'overview',
    icon: 'layout-dashboard',
    perm: PERMISSIONS.VIEW_SUPERVISOR_DASHBOARD
  },
  {
    id: 'supervisor-students',
    file: 'students.html',
    url: '/supervisor/students.html',
    title: 'متابعة الطلاب',
    section: 'operations',
    icon: 'users',
    perm: PERMISSIONS.VIEW_STUDENTS
  },
  {
    id: 'supervisor-lessons',
    file: 'lessons.html',
    url: '/supervisor/lessons.html',
    title: 'إدارة الحصص',
    section: 'operations',
    icon: 'book-open',
    perm: PERMISSIONS.VIEW_LESSONS
  },
  {
    id: 'supervisor-absences',
    file: 'absences.html',
    url: '/supervisor/absences.html',
    title: 'سجل الغياب',
    section: 'operations',
    icon: 'user-x',
    perm: PERMISSIONS.VIEW_ABSENCES
  },
  {
    id: 'supervisor-postponed',
    file: 'postponed.html',
    url: '/supervisor/postponed.html',
    title: 'المؤجلة والتعويض',
    section: 'operations',
    icon: 'clock',
    perm: PERMISSIONS.VIEW_POSTPONED_LESSONS
  },
  {
    id: 'supervisor-schedules',
    file: 'schedules.html',
    url: '/supervisor/schedules.html',
    title: 'الجداول والأوقات المتاحة',
    section: 'operations',
    icon: 'calendar-clock',
    perm: PERMISSIONS.VIEW_SCHEDULES
  },
  {
    id: 'supervisor-requests',
    file: 'requests.html',
    url: '/supervisor/requests.html',
    title: 'الطلبات الإدارية',
    section: 'coordination',
    icon: 'send',
    perm: PERMISSIONS.CREATE_REQUESTS
  },
  {
    id: 'supervisor-reports',
    file: 'reports.html',
    url: '/supervisor/reports.html',
    title: 'التقارير التشغيلية',
    section: 'coordination',
    icon: 'bar-chart-3',
    perm: PERMISSIONS.VIEW_OPERATIONAL_REPORTS
  },
  {
    id: 'supervisor-profile',
    file: 'profile.html',
    url: '/supervisor/profile.html',
    title: 'الملف الشخصي',
    section: 'account',
    icon: 'user-circle',
    perm: null
  }
];

export function buildPermissionMap(enabledKeys = []) {
  const enabledSet = new Set(Array.isArray(enabledKeys) ? enabledKeys : []);
  const map = {};
  ALL_PERMISSION_KEYS.forEach((key) => {
    map[key] = enabledSet.has(key);
  });
  return map;
}

export function getFullPermissionsMap() {
  return buildPermissionMap(ALL_PERMISSION_KEYS);
}

export function getPresetPermissions(presetId) {
  const preset = PERMISSION_PRESETS[presetId] || PERMISSION_PRESETS.general_ops;
  return buildPermissionMap(preset.permissions);
}

export function migrateLegacyPermissionsToRbac(legacyPerms = {}) {
  if (!legacyPerms || typeof legacyPerms !== 'object') {
    return buildPermissionMap([]);
  }

  // If object already uses the new keys, normalize cleanly
  const hasNewKey = ALL_PERMISSION_KEYS.some((k) => k in legacyPerms);
  if (hasNewKey) {
    const map = {};
    ALL_PERMISSION_KEYS.forEach((k) => {
      map[k] = legacyPerms[k] === true;
    });
    return map;
  }

  const enabled = new Set();
  enabled.add(PERMISSIONS.VIEW_SUPERVISOR_DASHBOARD);

  if (legacyPerms.viewStudents) enabled.add(PERMISSIONS.VIEW_STUDENTS);
  if (legacyPerms.manageStudents) {
    enabled.add(PERMISSIONS.VIEW_STUDENTS);
    enabled.add(PERMISSIONS.EDIT_STUDENT_OPERATIONAL);
  }
  if (legacyPerms.manageSessions) {
    enabled.add(PERMISSIONS.VIEW_LESSONS);
    enabled.add(PERMISSIONS.MANAGE_LESSONS);
    enabled.add(PERMISSIONS.VIEW_ABSENCES);
    enabled.add(PERMISSIONS.VIEW_POSTPONED_LESSONS);
  }
  if (legacyPerms.viewTeachers || legacyPerms.manageTeachers || legacyPerms.manageGroups || legacyPerms.manageSchedules) {
    enabled.add(PERMISSIONS.VIEW_SCHEDULES);
  }
  if (legacyPerms.manageSchedules || legacyPerms.manageGroups) {
    enabled.add(PERMISSIONS.EDIT_SCHEDULES);
  }
  if (legacyPerms.viewReports) {
    enabled.add(PERMISSIONS.VIEW_OPERATIONAL_REPORTS);
  }
  enabled.add(PERMISSIONS.CREATE_REQUESTS);

  return buildPermissionMap(Array.from(enabled));
}

export function resolveEffectiveRole(userData, userRoleDoc = null) {
  if (userRoleDoc?.roleId && [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.TEACHER].includes(userRoleDoc.roleId)) {
    return userRoleDoc.roleId;
  }
  // Migration-only fallback for accounts created before user_roles existed.
  // New accounts are always resolved from the normalized role document above.
  if (userData?.isSubAdmin === true || userData?.role === 'supervisor' || userData?.role === 'sub_admin') {
    return ROLES.SUPERVISOR;
  }
  if (userData?.role === 'admin') {
    return ROLES.ADMIN;
  }
  return ROLES.TEACHER;
}

export function resolveEffectivePermissions(userData, userRoleDoc = null) {
  const effectiveRole = resolveEffectiveRole(userData, userRoleDoc);
  if (effectiveRole === ROLES.ADMIN) {
    return getFullPermissionsMap();
  }
  if (effectiveRole === ROLES.TEACHER) {
    return buildPermissionMap([]);
  }

  if (userRoleDoc?.permissions && typeof userRoleDoc.permissions === 'object') {
    const map = {};
    ALL_PERMISSION_KEYS.forEach((key) => {
      map[key] = userRoleDoc.permissions[key] === true;
    });
    return map;
  }

  return migrateLegacyPermissionsToRbac(userData?.permissions || {});
}

export function hasPermissionFromSession(permKey, sessionObj = null) {
  if (!permKey) return true;
  let session = sessionObj;
  if (!session) {
    try {
      session = JSON.parse(sessionStorage.getItem('sabeel_user_session') || 'null');
    } catch {
      session = null;
    }
  }
  if (!session) return false;
  if (resolveEffectiveRole(session) === ROLES.ADMIN) return true;
  return Boolean(session.permissions && session.permissions[permKey] === true);
}

export function getSupervisorPageMeta(fileOrPath) {
  const str = String(fileOrPath || '');
  return SUPERVISOR_PAGE_ACCESS.find((p) => str.includes(p.file)) || null;
}

export function getFirstAllowedSupervisorPage(permissionsMap = {}) {
  for (const page of SUPERVISOR_PAGE_ACCESS) {
    if (!page.perm || permissionsMap?.[page.perm] === true) {
      return `../supervisor/${page.file}`;
    }
  }
  return '../supervisor/profile.html';
}

export async function assignUserRbac(uid, {
  roleId,
  permissions = {},
  department = '',
  supervisorTitle = '',
  status = 'approved',
  approvedBy = null
} = {}) {
  if (!uid || !roleId) {
    throw new Error('معرف المستخدم والدور مطلوبان');
  }

  const normalizedPerms = roleId === ROLES.ADMIN
    ? getFullPermissionsMap()
    : roleId === ROLES.SUPERVISOR
      ? buildPermissionMap(
          Object.entries(permissions || {})
            .filter(([, val]) => val === true)
            .map(([k]) => k)
        )
      : buildPermissionMap([]);

  const userRoleRef = doc(db, RBAC_COLLECTIONS.USER_ROLES, uid);
  const existingRoleSnap = await getDoc(userRoleRef);

  const userRolePayload = {
    uid,
    roleId,
    permissions: normalizedPerms,
    status,
    department: department || '',
    supervisorTitle: supervisorTitle || '',
    updatedBy: approvedBy || null,
    updatedAt: serverTimestamp()
  };

  if (!existingRoleSnap.exists()) {
    userRolePayload.createdAt = serverTimestamp();
  }

  await setDoc(userRoleRef, userRolePayload, { merge: true });

  const userUpdate = {
    role: roleId,
    permissions: normalizedPerms,
    status,
    isSubAdmin: deleteField(),
    plainPassword: deleteField(),
    password: deleteField(),
    updatedAt: serverTimestamp()
  };

  if (department !== undefined) userUpdate.department = department || '';
  if (supervisorTitle !== undefined) userUpdate.supervisorTitle = supervisorTitle || '';
  if (status === 'approved' && approvedBy) {
    userUpdate.approvedBy = approvedBy;
    userUpdate.approvedAt = serverTimestamp();
  }

  await updateDoc(doc(db, 'users', uid), userUpdate);

  return {
    uid,
    roleId,
    permissions: normalizedPerms,
    status
  };
}

export async function ensureRbacSeeded(currentAdminUid = null) {
  try {
    const batch = writeBatch(db);

    const roleDefs = [
      { id: ROLES.ADMIN, name: 'المدير العام', description: 'صلاحيات إدارية ومالية وتقنية كاملة على جميع أقسام المنصة', isSystem: true },
      { id: ROLES.SUPERVISOR, name: 'المشرف التشغيلي', description: 'صلاحيات تشغيلية محددة عبر نظام الصلاحيات دون الوصول للمالية أو الرواتب', isSystem: true },
      { id: ROLES.TEACHER, name: 'المعلم', description: 'إدارة الحصص والطلاب المسندين له ومتابعة جدوله الشخصي', isSystem: true }
    ];

    for (const r of roleDefs) {
      batch.set(doc(db, RBAC_COLLECTIONS.ROLES, r.id), {
        ...r,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    for (const p of PERMISSION_CATALOG) {
      batch.set(doc(db, RBAC_COLLECTIONS.PERMISSIONS, p.key), {
        key: p.key,
        group: p.group,
        groupLabel: p.groupLabel,
        label: p.label,
        description: p.description,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    batch.set(doc(db, RBAC_COLLECTIONS.ROLE_PERMISSIONS, ROLES.ADMIN), {
      roleId: ROLES.ADMIN,
      permissions: getFullPermissionsMap(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    batch.set(doc(db, RBAC_COLLECTIONS.ROLE_PERMISSIONS, ROLES.SUPERVISOR), {
      roleId: ROLES.SUPERVISOR,
      permissions: getPresetPermissions('general_ops'),
      updatedAt: serverTimestamp()
    }, { merge: true });

    batch.set(doc(db, RBAC_COLLECTIONS.ROLE_PERMISSIONS, ROLES.TEACHER), {
      roleId: ROLES.TEACHER,
      permissions: buildPermissionMap([]),
      updatedAt: serverTimestamp()
    }, { merge: true });

    await batch.commit();

    // Idempotent backfill for existing user documents missing user_roles or having legacy isSubAdmin
    const [usersSnap, userRolesSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, RBAC_COLLECTIONS.USER_ROLES))
    ]);

    const existingUserRoleIds = new Set(userRolesSnap.docs.map((d) => d.id));
    const fixBatch = writeBatch(db);
    let pendingOps = 0;

    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data() || {};
      const uid = userDoc.id;
      const isLegacySubAdmin = data.isSubAdmin === true || data.role === 'sub_admin';
      const targetRole = resolveEffectiveRole(data);

      if (isLegacySubAdmin || !existingUserRoleIds.has(uid)) {
        const mappedPerms = resolveEffectivePermissions(data);
        fixBatch.set(doc(db, RBAC_COLLECTIONS.USER_ROLES, uid), {
          uid,
          roleId: targetRole,
          permissions: mappedPerms,
          status: data.status || 'approved',
          department: data.department || '',
          supervisorTitle: data.supervisorTitle || '',
          migratedBy: currentAdminUid || 'system',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true });

        if (isLegacySubAdmin) {
          fixBatch.update(doc(db, 'users', uid), {
            role: ROLES.SUPERVISOR,
            permissions: mappedPerms,
            isSubAdmin: deleteField(),
            plainPassword: deleteField(),
            password: deleteField(),
            updatedAt: serverTimestamp()
          });
        }
        pendingOps += 1;
      }
    }

    if (pendingOps > 0) {
      await fixBatch.commit();
    }
  } catch (err) {
    console.warn('RBAC seed/backfill warning:', err?.message || err);
  }
}

export function subscribeUserRbac(uid, onUpdate) {
  let latestUser = null;
  let latestRoleDoc = null;
  let userResolved = false;

  const emit = () => {
    if (!userResolved) return;
    if (!latestUser) {
      onUpdate({ exists: false, userData: null, userRoleDoc: latestRoleDoc, role: null, permissions: {} });
      return;
    }
    const role = resolveEffectiveRole(latestUser, latestRoleDoc);
    const permissions = resolveEffectivePermissions(latestUser, latestRoleDoc);
    const status = latestRoleDoc?.status && latestUser?.status === 'approved'
      ? latestRoleDoc.status
      : (latestUser?.status || latestRoleDoc?.status || 'pending');

    onUpdate({
      exists: true,
      userData: latestUser,
      userRoleDoc: latestRoleDoc,
      role,
      status,
      permissions
    });
  };

  const unsubUser = onSnapshot(doc(db, 'users', uid), (snap) => {
    userResolved = true;
    latestUser = snap.exists() ? { uid: snap.id, ...snap.data() } : null;
    emit();
  }, (err) => {
    console.warn('subscribeUserRbac users error:', err?.message || err);
  });

  const unsubRole = onSnapshot(doc(db, RBAC_COLLECTIONS.USER_ROLES, uid), (snap) => {
    latestRoleDoc = snap.exists() ? { id: snap.id, ...snap.data() } : null;
    emit();
  }, (err) => {
    console.warn('subscribeUserRbac user_roles error:', err?.message || err);
  });

  return () => {
    try { unsubUser(); } catch {}
    try { unsubRole(); } catch {}
  };
}
