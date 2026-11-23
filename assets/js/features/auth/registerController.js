import '../../shared/utils/jsonShield.js';
import { auth, db } from '../../config/firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, setDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { Toast } from '../../shared/utils/toast.js';
import { RBAC_COLLECTIONS, ROLES, buildPermissionMap } from '../rbac/rbacService.js';
import { extractNonFinancialTeacherProfile } from '../supervisor/supervisorDomainService.js';

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const roleTeacherBtn = document.getElementById('roleTeacherBtn');
  const roleSupervisorBtn = document.getElementById('roleSupervisorBtn');
  const selectedRoleInput = document.getElementById('selectedRole');
  const supervisorDeptGroup = document.getElementById('supervisorDeptGroup');
  const supervisorNotesGroup = document.getElementById('supervisorNotesGroup');
  const cardTagText = document.getElementById('cardTagText');
  const submitBtnText = document.getElementById('submitBtnText');
  const registerSubtitle = document.getElementById('registerSubtitle');

  // Role Switcher Tabs (Teacher vs Supervisor)
  function setRole(role) {
    if (!selectedRoleInput) return;
    selectedRoleInput.value = role;

    if (role === ROLES.SUPERVISOR) {
      if (roleSupervisorBtn) {
        roleSupervisorBtn.classList.add('active');
        roleSupervisorBtn.style.background = 'var(--primary-color, #4FA3D1)';
        roleSupervisorBtn.style.color = '#ffffff';
      }
      if (roleTeacherBtn) {
        roleTeacherBtn.classList.remove('active');
        roleTeacherBtn.style.background = 'transparent';
        roleTeacherBtn.style.color = 'var(--text-secondary, #64748b)';
      }
      if (supervisorDeptGroup) supervisorDeptGroup.style.display = 'block';
      if (supervisorNotesGroup) supervisorNotesGroup.style.display = 'block';
      if (cardTagText) cardTagText.textContent = 'طلب حساب مشرف تشغيلي';
      if (submitBtnText) submitBtnText.textContent = 'إرسال طلب الانضمام كمشرف';
      if (registerSubtitle) registerSubtitle.textContent = 'بوابة طلبات المشرفين ومنسقي التشغيل';
    } else {
      if (roleTeacherBtn) {
        roleTeacherBtn.classList.add('active');
        roleTeacherBtn.style.background = 'var(--primary-color, #4FA3D1)';
        roleTeacherBtn.style.color = '#ffffff';
      }
      if (roleSupervisorBtn) {
        roleSupervisorBtn.classList.remove('active');
        roleSupervisorBtn.style.background = 'transparent';
        roleSupervisorBtn.style.color = 'var(--text-secondary, #64748b)';
      }
      if (supervisorDeptGroup) supervisorDeptGroup.style.display = 'none';
      if (supervisorNotesGroup) supervisorNotesGroup.style.display = 'none';
      if (cardTagText) cardTagText.textContent = 'طلب انضمام لهيئة التدريس';
      if (submitBtnText) submitBtnText.textContent = 'إرسال طلب الانضمام كمعلم';
      if (registerSubtitle) registerSubtitle.textContent = 'بوابة انضمام المعلمين الجدد';
    }
    if (window.lucide) window.lucide.createIcons();
  }

  if (roleTeacherBtn) {
    roleTeacherBtn.addEventListener('click', () => setRole(ROLES.TEACHER));
  }
  if (roleSupervisorBtn) {
    roleSupervisorBtn.addEventListener('click', () => setRole(ROLES.SUPERVISOR));
  }

  async function persistNewAccountDocs(user, role, { name, phone, email, supervisorDept, supervisorNotes }) {
    const emptyPerms = buildPermissionMap([]);
    if (role === ROLES.SUPERVISOR) {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        phone,
        email,
        role: ROLES.SUPERVISOR,
        supervisorTitle: supervisorDept,
        department: supervisorDept,
        notes: supervisorNotes,
        status: 'pending',
        permissions: emptyPerms,
        createdAt: new Date().toISOString()
      });

      await setDoc(doc(db, RBAC_COLLECTIONS.USER_ROLES, user.uid), {
        uid: user.uid,
        roleId: ROLES.SUPERVISOR,
        permissions: emptyPerms,
        status: 'pending',
        department: supervisorDept,
        supervisorTitle: supervisorDept,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      const teacherData = {
        uid: user.uid,
        name,
        phone,
        email,
        role: ROLES.TEACHER,
        status: 'pending',
        permissions: {
          addStudents: false,
          editStudents: false,
          editSessions: false,
          deleteSessions: false
        },
        hourlyRate: 100,
        hourlyRateIndividual: 100,
        hourlyRateGroup: 120,
        createdAt: new Date().toISOString(),
        salaryStart: new Date().toISOString().split('T')[0]
      };
      await setDoc(doc(db, "users", user.uid), teacherData);

      await setDoc(doc(db, RBAC_COLLECTIONS.USER_ROLES, user.uid), {
        uid: user.uid,
        roleId: ROLES.TEACHER,
        permissions: emptyPerms,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await setDoc(
        doc(db, "teacherOperationalProfiles", user.uid),
        extractNonFinancialTeacherProfile(user.uid, teacherData),
        { merge: true }
      );
    }
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const role = selectedRoleInput?.value === ROLES.SUPERVISOR ? ROLES.SUPERVISOR : ROLES.TEACHER;
      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();

      const rawEmailPrefix = (document.getElementById('emailPrefix')?.value || document.getElementById('email')?.value || '').trim();
      const cleanUsername = rawEmailPrefix.replace(/@.*$/, '').trim();
      const email = `${cleanUsername}@gmail.com`;

      const password = document.getElementById('password').value;
      const supervisorDept = document.getElementById('supervisorDept')?.value || 'إشراف عام وتنسيق';
      const supervisorNotes = document.getElementById('supervisorNotes')?.value?.trim() || '';

      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalBtnHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="animate-spin" data-lucide="loader-2"></i> جاري إرسال الطلب...`;
      if (window.lucide) window.lucide.createIcons();

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await persistNewAccountDocs(user, role, { name, phone, email, supervisorDept, supervisorNotes });

        if (role === ROLES.SUPERVISOR) {
          await addDoc(collection(db, "auditLogs"), {
            action: "SUPERVISOR_REGISTER",
            actorId: user.uid,
            actorName: name,
            details: `تم إرسال طلب تسجيل مشرف جديد (${supervisorDept}) بالبريد: ${email} ورقم الهاتف: ${phone}`,
            timestamp: new Date().toISOString()
          });

          await addDoc(collection(db, "notifications"), {
            title: "طلب انضمام مشرف جديد",
            body: `المشرف ${name} أرسل طلب انضمام (${supervisorDept}) وهو بانتظار المراجعة وتحديد الصلاحيات.`,
            recipientId: "admin",
            senderId: user.uid,
            senderName: name,
            deepLink: "/admin/account-requests.html",
            url: "/admin/account-requests.html",
            createdAt: new Date().toISOString(),
            readBy: []
          });

          await auth.signOut();
          Toast.success("تم إرسال طلب حساب المشرف بنجاح. سيتم مراجعة الطلب ومنح الصلاحيات من قبل الإدارة.");
        } else {
          await addDoc(collection(db, "auditLogs"), {
            action: "TEACHER_REGISTER",
            actorId: user.uid,
            actorName: name,
            details: `تم إرسال طلب تسجيل كمعلم جديد بالبريد: ${email} ورقم الهاتف: ${phone}`,
            timestamp: new Date().toISOString()
          });

          await addDoc(collection(db, "notifications"), {
            title: "طلب انضمام معلم جديد",
            body: `المعلم ${name} أرسل طلب انضمام جديد وبانتظار المراجعة والاعتماد.`,
            recipientId: "admin",
            senderId: user.uid,
            senderName: name,
            deepLink: "/admin/teachers.html",
            url: "/admin/teachers.html",
            createdAt: new Date().toISOString(),
            readBy: []
          });

          await addDoc(collection(db, "notifications"), {
            title: "مرحباً بك في أكاديمية سبيل",
            body: `أهلاً بك أ. ${name}. تم تقديم طلب انضمامك كمعلم بنجاح وهو قيد المراجعة والاعتماد من قبل إدارة الأكاديمية.`,
            recipientId: user.uid,
            readBy: [],
            createdAt: new Date().toISOString()
          });

          await auth.signOut();
          Toast.success("تم إرسال طلب تسجيلك كمعلم بنجاح! سيتم تفعيل حسابك من قبل الإدارة قريباً.");
        }

        setTimeout(() => {
          window.location.href = 'index.html';
        }, 2500);

      } catch (error) {
        console.error("Registration failed:", error);
        let errorMsg = "فشل إرسال طلب التسجيل. الرجاء المحاولة مرة أخرى.";

        if (error.code === 'auth/email-already-in-use') {
          try {
            const q = query(collection(db, "users"), where("email", "==", email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
              try {
                const signInCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = signInCredential.user;
                await persistNewAccountDocs(user, role, { name, phone, email, supervisorDept, supervisorNotes });

                await auth.signOut();
                Toast.success("تم استعادة الحساب وتجديد طلب الانضمام بنجاح! بانتظار موافقة الإدارة.");
                setTimeout(() => { window.location.href = 'index.html'; }, 2500);
                return;
              } catch (signInErr) {
                console.error("Sign in failed:", signInErr);
                errorMsg = "هذا الحساب مسجل مسبقاً في النظام. يرجى إدخال كلمة المرور الصحيحة أو مراجعة الإدارة.";
              }
            } else {
              errorMsg = "البريد الإلكتروني هذا مستخدم بالفعل في النظام.";
            }
          } catch (dbErr) {
            console.error("Firestore query error:", dbErr);
            errorMsg = "البريد الإلكتروني هذا مستخدم بالفعل.";
          }
        } else if (error.code === 'auth/weak-password') {
          errorMsg = "كلمة المرور ضعيفة للغاية. يرجى استخدام 8 خانات أو أكثر.";
        }

        Toast.error(errorMsg);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }
});
