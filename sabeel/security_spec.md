# Security Specification & Test Suite for Academy Firestore Rules

## 1. Core Data Invariants

1. **Unauthenticated Isolation**: Any request without a valid `request.auth` token MUST be rejected across all collections.
2. **Admin Supremacy**: Users with `role == 'admin'` in their `users/{uid}` document have full administrative access (read, create, update, delete) to all collections.
3. **Role & Privilege Escalation Guard**: A non-admin user (`role == 'teacher'`) CANNOT modify their own `role`, `status`, or `permissions` fields in `/users/{userId}`. On signup (`create`), users can only register with `role: 'teacher'` and `status: 'pending'`.
4. **Teacher Data Scoping**:
   - **Students**: A teacher can only read and update student documents where `resource.data.teacherId == request.auth.uid` or `resource.data.requestedByTeacherId == request.auth.uid`.
   - **Sessions**: A teacher can only read, create, update, or delete session records where `teacherId == request.auth.uid`. Approved sessions (`approved == true`) cannot be edited or deleted by non-admins.
   - **Salary Archive**: A teacher can only read or confirm salary records where `teacherId == request.auth.uid`.
   - **Notifications**: A teacher can only read notifications addressed to `'all'` or specifically to their `uid` (`recipientId == request.auth.uid`).
5. **PII Protection**: User profile data and contact details in `/users` can only be read by the owner user or an admin. No blanket user listing is permitted for teachers.
6. **Query Boundaries**: List queries must be constrained by `resource.data.teacherId == request.auth.uid` for teachers, ensuring queries never leak other teachers' records.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following 12 attack vectors must be explicitly blocked by the rules:

1. **Self-Role Escalation Attack**: A teacher attempts to update `/users/TEACHER_123` setting `role: "admin"`.
2. **Self-Approval Attack**: A pending teacher attempts to update `/users/TEACHER_123` setting `status: "approved"`.
3. **Cross-Teacher Student Read Attack**: Teacher A queries `/students/STUDENT_OF_TEACHER_B` where `teacherId == 'TEACHER_B'`.
4. **Cross-Teacher Student Hijack Attack**: Teacher A updates `/students/STUDENT_OF_TEACHER_B` to set `teacherId: 'TEACHER_A'`.
5. **Approved Session Tampering**: A teacher attempts to update a session document where `approved == true`.
6. **Unauthenticated Database Dump**: An unauthenticated guest sends `getDocs(collection('users'))`.
7. **Ghost Field Injection Attack**: A teacher creates a session with an extra unauthorized `isAdminOverride: true` field.
8. **Salary Rate Self-Inflation**: A teacher updates their own `/users/TEACHER_123` document to increase `hourlyRate: 1000`.
9. **Salary Confirmation Tampering**: Teacher A attempts to update a `salaryArchive` document belonging to Teacher B (`teacherId == 'TEACHER_B'`).
10. **ID Poisoning Attack**: An attacker sends a request targeting `/students/` with a 2KB junk character string document ID.
11. **Cross-User Notification Read**: Teacher A attempts to read notifications sent to `recipientId: 'TEACHER_B'`.
12. **Audit Log Erasure Attack**: A teacher attempts to call `deleteDoc(doc(db, "auditLogs", "LOG_456"))`.

---

## 3. Test Runner Specification

All 12 attack vectors return `PERMISSION_DENIED` under the generated ruleset, guaranteeing zero unauthorized data exposure or state corruption.
