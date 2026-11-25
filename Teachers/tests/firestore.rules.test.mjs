/**
 * Firestore security rules regression suite — Sabeel Academy.
 * Implements the 12 attack scenarios from security_spec.md plus positive
 * checks so the three portals keep working after rule changes.
 *
 * Run: npm run test:rules
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where
} from 'firebase/firestore';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rules = readFileSync(resolve(root, 'firestore.rules'), 'utf8');
const PROJECT_ID = 'sabeel-rules-test';

const ALL_OPS_PERMS = {
  view_supervisor_dashboard: true,
  view_students: true,
  edit_student_operational: true,
  view_lessons: true,
  manage_lessons: true,
  edit_lesson_duration: false,
  view_absences: true,
  view_postponed_lessons: true,
  view_schedules: true,
  edit_schedules: true,
  create_requests: true,
  view_operational_reports: true
};

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules }
  });
});

after(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const writes = [
      ['users/ADMIN1', { role: 'admin', status: 'approved', name: 'Admin' }],
      ['users/SUP1', { role: 'supervisor', status: 'approved', name: 'Supervisor' }],
      ['users/SUP2', { role: 'supervisor', status: 'approved', name: 'Limited Supervisor' }],
      ['users/T1', { role: 'teacher', status: 'approved', name: 'Teacher One' }],
      ['users/T2', { role: 'teacher', status: 'approved', name: 'Teacher Two' }],
      ['user_roles/SUP1', { uid: 'SUP1', roleId: 'supervisor', status: 'approved', permissions: ALL_OPS_PERMS }],
      ['user_roles/SUP2', {
        uid: 'SUP2', roleId: 'supervisor', status: 'approved',
        permissions: { ...ALL_OPS_PERMS, edit_schedules: false }
      }],
      ['user_roles/T1', { uid: 'T1', roleId: 'teacher', status: 'approved', permissions: {} }],
      ['user_roles/T2', { uid: 'T2', roleId: 'teacher', status: 'approved', permissions: {} }],
      ['role_permissions/supervisor', { roleId: 'supervisor', permissions: ALL_OPS_PERMS }],
      ['students/ST1', { teacherId: 'T1', price: 100, remainingSessions: 5, sessionTime: '08:00' }],
      ['studentOperationalSummaries/ST1', { teacherId: 'T1', name: 'Student' }],
      ['sessions/S_T1', { teacherId: 'T1', date: '2026-11-23', status: 'scheduled' }],
      ['sessions/S_T2', { teacherId: 'T2', date: '2026-11-23', status: 'scheduled' }],
      ['payments/PAY1', { amount: 100, studentId: 'ST1' }],
      ['notifications/N1', { recipientId: 'T1', title: 'test' }],
      ['absenceLogs/LOG1', { teacherId: 'T1', sessionId: 'S_T1', recordedBy: 'T1' }],
      ['activityLogs/ACT1', { actorId: 'T1', actionType: 'edit', createdAt: '2026-11-23' }],
      ['supervisorRequests/REQ1', { supervisorId: 'SUP1', status: 'pending' }]
    ];
    await Promise.all(writes.map(([path, data]) => setDoc(doc(db, path), data)));
  });
});

const ctxAs = (uid) => testEnv.authenticatedContext(uid).firestore();
const sup = () => ctxAs('SUP1');
const limitedSup = () => ctxAs('SUP2');
const teacher = () => ctxAs('T1');
const admin = () => ctxAs('ADMIN1');

// 0 — unauthenticated isolation
test('0. unauthenticated user cannot read any collection', async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'students/ST1')));
  await assertFails(getDocs(collection(db, 'notifications')));
});

// 1 — supervisor financial read
test('1. supervisor cannot read payments or salaryArchive', async () => {
  await assertFails(getDoc(doc(sup(), 'payments/PAY1')));
  await assertFails(getDocs(collection(sup(), 'payments')));
  await assertFails(getDocs(collection(sup(), 'salaryArchive')));
});

// 2 — supervisor raw students dump
test('2. supervisor cannot read raw students', async () => {
  await assertFails(getDocs(collection(sup(), 'students')));
  await assertFails(getDoc(doc(sup(), 'students/ST1')));
  await assertSucceeds(getDoc(doc(sup(), 'studentOperationalSummaries/ST1')));
});

// 3 — supervisor PII scrape
test('3. supervisor cannot list users or read another profile', async () => {
  await assertFails(getDocs(collection(sup(), 'users')));
  await assertFails(getDoc(doc(sup(), 'users/T2')));
});

// 4 — supervisor self permission escalation
test('4. supervisor cannot rewrite its own RBAC document', async () => {
  await assertFails(updateDoc(doc(sup(), 'user_roles/SUP1'), { roleId: 'admin' }));
  await assertFails(updateDoc(doc(sup(), 'user_roles/SUP1'), {
    permissions: { ...ALL_OPS_PERMS, edit_lesson_duration: true }
  }));
});

// 5 — signup self approval / role tampering
test('5. plain signup cannot grant itself admin or approved status', async () => {
  const db = testEnv.authenticatedContext('NEWUID').firestore();
  await assertFails(setDoc(doc(db, 'users/NEWUID'), { role: 'admin', status: 'approved' }));
  await assertFails(setDoc(doc(db, 'user_roles/NEWUID'), { roleId: 'admin', status: 'approved' }));
});

// 6 — supervisor without edit_schedules
test('6. supervisor without edit_schedules cannot touch a schedule', async () => {
  await assertFails(updateDoc(doc(limitedSup(), 'students/ST1'), { sessionTime: '10:00' }));
});

// 7 — financial field injection through a schedule update
test('7. supervisor cannot smuggle price/credit fields into a schedule update', async () => {
  await assertFails(updateDoc(doc(sup(), 'students/ST1'), { price: 0 }));
  await assertFails(updateDoc(doc(sup(), 'students/ST1'), { remainingSessions: 999 }));
});

// 8 — immutable operational logs
test('8. absenceLogs and activityLogs cannot be updated or deleted', async () => {
  await assertFails(updateDoc(doc(sup(), 'absenceLogs/LOG1'), { reason: 'x' }));
  await assertFails(deleteDoc(doc(sup(), 'absenceLogs/LOG1')));
  await assertFails(deleteDoc(doc(teacher(), 'activityLogs/ACT1')));
});

// 9 — supervisor notification ban
test('9. supervisor cannot read or delete notifications', async () => {
  await assertFails(getDoc(doc(sup(), 'notifications/N1')));
  await assertFails(deleteDoc(doc(sup(), 'notifications/N1')));
});

// 10 — supervisor request self approval
test('10. supervisor cannot auto-approve its request', async () => {
  await assertFails(setDoc(doc(sup(), 'supervisorRequests/REQ2'), {
    supervisorId: 'SUP1', status: 'approved'
  }));
  await assertFails(updateDoc(doc(sup(), 'supervisorRequests/REQ1'), { adminNote: 'ok' }));
  await assertSucceeds(setDoc(doc(sup(), 'supervisorRequests/REQ3'), {
    supervisorId: 'SUP1', status: 'pending'
  }));
});

// 11 — teacher cross-teacher isolation
test('11. teacher cannot read or alter another teacher session', async () => {
  await assertFails(getDoc(doc(teacher(), 'sessions/S_T2')));
  await assertFails(updateDoc(doc(teacher(), 'sessions/S_T2'), { status: 'completed' }));
  await assertSucceeds(getDoc(doc(teacher(), 'sessions/S_T1')));
});

// 12 — invalid document id poisoning
test('12. malformed document ids are rejected by the rules', async () => {
  const badId = 'A'.repeat(130); // > 128 limit, still below Firestore SDK max
  await assertFails(getDoc(doc(sup(), 'studentOperationalSummaries', badId)));
});

// Positive paths — the three portals must keep working
test('positive: admin keeps full financial and operational access', async () => {
  await assertSucceeds(getDoc(doc(admin(), 'payments/PAY1')));
  await assertSucceeds(getDocs(collection(admin(), 'users')));
  await assertSucceeds(getDoc(doc(admin(), 'sessions/S_T1')));
});

test('positive: supervisor can run its operational workflow', async () => {
  await assertSucceeds(getDocs(collection(sup(), 'sessions')));
  await assertSucceeds(getDocs(collection(sup(), 'absenceLogs')));
  await assertSucceeds(updateDoc(doc(sup(), 'students/ST1'), { sessionTime: '09:30' }));
});

test('positive: teacher can manage its own sessions', async () => {
  // Teacher pages always filter by teacherId; an unfiltered dump is intentionally denied.
  const ownSessions = query(collection(teacher(), 'sessions'), where('teacherId', '==', 'T1'));
  await assertSucceeds(getDocs(ownSessions));
  await assertSucceeds(updateDoc(doc(teacher(), 'sessions/S_T1'), { status: 'completed' }));
});
