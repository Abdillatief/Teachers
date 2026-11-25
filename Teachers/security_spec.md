# Security Specification & RBAC Test Suite for Sabeel Academy Firestore Rules

## 1. Core Data Invariants

1. **Unauthenticated Isolation**: Any request without a valid `request.auth` token MUST be rejected across all collections.
2. **Normalized RBAC Authority (`user_roles/{uid}`)**: Permissions are evaluated via `/user_roles/{uid}` (with strict non-`isSubAdmin` legacy admin fallback). Supervisors NEVER inherit admin access.
3. **Self-Role & RBAC Tampering Guard**: Non-admins CANNOT write to `/roles`, `/permissions`, `/role_permissions`, or `/user_roles`. Users registering on `/users/{uid}` may ONLY create `role in ['teacher', 'supervisor']` with `status == 'pending'` and CANNOT modify `role`, `status`, `permissions`, or `isSubAdmin`.
4. **Strict Financial & PII Isolation for Supervisors**:
   - Supervisors CANNOT read or write `payments`, `subscriptions`, `packages`, `studentPackages`, `studentBalances`, `studentLedger`, `salaryArchive`, `payrollReconciliationLogs`, `teacher_salary_transactions`, `lessonCreditsLogs`, or `expenses`.
   - Supervisors CANNOT list `/users` or read other users' `/users/{otherUid}` documents. Operational views read `/studentOperationalSummaries` and `/teacherOperationalProfiles` instead.
   - Supervisors CANNOT read, create, or delete `/students/{id}`; they may ONLY update constrained schedule keys (`days`, `sessionDays`, `sessionTime`, `schedule`, `updatedAt`) when holding `edit_schedules`.
5. **Zero Notification Access for Supervisors**: Supervisors are denied read/write access on `notifications`, `notification_devices`, `notification_logs`, and `notification_templates`.
6. **Immutable Operational Logs**: `absenceLogs` and `activityLogs` forbid `update` and `delete` for ALL client callers.
7. **Admin-Only Decisioning on Requests**: Supervisors with `create_requests` can create `supervisorRequests` only with `supervisorId == request.auth.uid` and `status == 'pending'`; only Admin can approve, keep pending, reject, or delete requests.

---

## 2. The "Dirty Dozen" Malicious Payloads (All Must Return `PERMISSION_DENIED`)

1. **Supervisor Financial Read**: Supervisor queries `/payments` or `/salaryArchive`.
2. **Supervisor Raw Students Dump**: Supervisor calls `getDocs(collection('students'))` or `getDoc(doc('students', 'ST_1'))`.
3. **Supervisor PII Scrape**: Supervisor calls `getDocs(collection('users'))` or `getDoc(doc('users', 'TEACHER_2'))`.
4. **Supervisor Self-Permission Escalation**: Supervisor updates `/user_roles/SUP_UID` adding `edit_lesson_duration: true` or `roleId: "admin"`.
5. **Self-Approval on Signup**: Pending user creates `/users/NEW_UID` with `role: "admin"` or `status: "approved"`.
6. **Supervisor Unpermitted Schedule Edit**: Supervisor without `edit_schedules` updates `/students/ST_1` `schedule`.
7. **Supervisor Financial Field Injection on `/students` Schedule Update**: Supervisor with `edit_schedules` updates `/students/ST_1` including `price: 0` or `remainingSessions: 999`.
8. **Immutable Log Tampering**: Supervisor or Teacher attempts `updateDoc` or `deleteDoc` on `/absenceLogs/LOG_1` or `/activityLogs/ACT_1`.
9. **Supervisor Notification Read/Delete**: Supervisor reads `/notifications/N_1` or deletes notifications.
10. **Supervisor Auto-Approving Own Request**: Supervisor creates `/supervisorRequests/REQ_1` with `status: "approved"` or updates `adminNote`.
11. **Teacher Cross-Teacher Session Tampering**: Teacher A reads or updates `/sessions/S_B` owned by Teacher B.
12. **ID Poisoning Attack**: Attacker sends `getDoc(doc(db, 'studentOperationalSummaries', '<2KB invalid id>'))`.
