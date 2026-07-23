import { auth, db } from '../../config/firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from '../../shared/utils/toast.js';

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalBtnHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="animate-spin" data-lucide="loader-2"></i> جاري إرسال الطلب...`;
      if (window.lucide) window.lucide.createIcons();

      try {
        // 1. Create authentication account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Prepare the teacher document in Firestore
        const teacherData = {
          uid: user.uid,
          name: name,
          phone: phone,
          email: email,
          role: 'teacher',
          status: 'pending', // Awaiting admin approval
          permissions: {
            addStudents: false,
            editStudents: false,
            editSessions: false,
            deleteSessions: false
          },
          hourlyRate: 100, // Default hourly rate in EGP
          hourlyRateIndividual: 100,
          hourlyRateGroup: 120,
          createdAt: new Date().toISOString(),
          salaryStart: new Date().toISOString().split('T')[0]
        };

        // Write user document
        await setDoc(doc(db, "users", user.uid), teacherData);

        // 3. Create an audit log for security & tracking
        await addDoc(collection(db, "auditLogs"), {
          action: "TEACHER_REGISTER",
          actorId: user.uid,
          actorName: name,
          details: `تم إرسال طلب تسجيل كمعلم جديد بالبريد: ${email} ورقم الهاتف: ${phone}`,
          timestamp: new Date().toISOString()
        });

        // 4. Create an admin notification
        await addDoc(collection(db, "notifications"), {
          title: "طلب انضمام معلم جديد 👤",
          body: `المعلم ${name} أرسل طلب انضمام جديد وبانتظار المراجعة والاعتماد.`,
          recipientId: "admin", // Recipient is admins
          senderId: user.uid,
          senderName: name,
          createdAt: new Date().toISOString(),
          readBy: []
        });

        // 5. Create a personal welcome notification for the new teacher
        await addDoc(collection(db, "notifications"), {
          title: "مرحباً بك في أكاديمية سبيل 🌸",
          body: `أهلاً بك أ. ${name}! تم تقديم طلب انضمامك كمعلم بنجاح وهو قيد المراجعة والاعتماد من قبل إدارة الأكاديمية.`,
          recipientId: user.uid,
          readBy: [],
          createdAt: new Date().toISOString()
        });

        // Sign out immediately so they don't enter approved state
        await auth.signOut();

        Toast.success("تم إرسال طلب تسجيلك كمعلم بنجاح! سيتم تفعيل حسابك من قبل الإدارة قريباً.");
        
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 3000);

      } catch (error) {
        console.error("Teacher registration failed:", error);
        let errorMsg = "فشل إرسال طلب التسجيل. الرجاء المحاولة مرة أخرى.";
        if (error.code === 'auth/email-already-in-use') {
          try {
            const q = query(collection(db, "users"), where("email", "==", email));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
              // The user is not in Firestore! This means the user document was deleted by the admin, but their Auth remains.
              // Let's attempt to authenticate the user to make sure they own the account.
              try {
                const signInCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = signInCredential.user;
                
                // Recreate user record in Firestore
                const teacherData = {
                  uid: user.uid,
                  name: name,
                  phone: phone,
                  email: email,
                  role: 'teacher',
                  status: 'pending', // Awaiting admin approval
                  permissions: {
                    addStudents: false,
                    editStudents: false,
                    editSessions: false,
                    deleteSessions: false
                  },
                  hourlyRate: 100, // Default hourly rate in EGP
                  hourlyRateIndividual: 100,
                  hourlyRateGroup: 120,
                  createdAt: new Date().toISOString(),
                  salaryStart: new Date().toISOString().split('T')[0]
                };

                await setDoc(doc(db, "users", user.uid), teacherData);

                // Create audit log
                await addDoc(collection(db, "auditLogs"), {
                  action: "TEACHER_RESTORE_REGISTER",
                  actorId: user.uid,
                  actorName: name,
                  details: `تم إعادة تفعيل وطلب تسجيل معلم سابق بالبريد: ${email} ورقم الهاتف: ${phone}`,
                  timestamp: new Date().toISOString()
                });

                // Create admin notification
                await addDoc(collection(db, "notifications"), {
                  title: "طلب انضمام معلم سابق 👤",
                  body: `المعلم السابق ${name} أرسل طلب انضمام جديد (استعادة ملف) وبانتظار المراجعة.`,
                  recipientId: "admin",
                  senderId: user.uid,
                  senderName: name,
                  createdAt: new Date().toISOString(),
                  readBy: []
                });

                // Create personal welcome notification for restored teacher
                await addDoc(collection(db, "notifications"), {
                  title: "مرحباً بك مجدداً في أكاديمية سبيل 🌸",
                  body: `أهلاً بك أ. ${name}! تم تقديم طلب إعادة تفعيل حسابك كمعلم بنجاح وهو بانتظار الاعتماد.`,
                  recipientId: user.uid,
                  readBy: [],
                  createdAt: new Date().toISOString()
                });

                await auth.signOut();

                Toast.success("تم العثور على حسابك السابق وإعادة تفعيل طلب انضمامك بنجاح! سيتم مراجعة طلبك من قبل الإدارة قريباً.");
                
                setTimeout(() => {
                  window.location.href = 'index.html';
                }, 3000);
                return;
              } catch (signInErr) {
                console.error("Sign in for existing user failed:", signInErr);
                errorMsg = "البريد الإلكتروني هذا مستخدم مسبقاً في النظام وتم حذف ملفك من قاعدة البيانات. يرجى كتابة كلمة المرور الصحيحة الخاصة بك لإعادة تقديم طلب الانضمام أو الاتصال بالإدارة.";
              }
            } else {
              errorMsg = "البريد الإلكتروني هذا مستخدم بالفعل.";
            }
          } catch (dbErr) {
            console.error("Firestore query check failed:", dbErr);
            errorMsg = "البريد الإلكتروني هذا مستخدم بالفعل.";
          }
        } else if (error.code === 'auth/weak-password') {
          errorMsg = "كلمة المرور ضعيفة للغاية. يرجى استخدام 6 رموز أو أكثر.";
        }
        Toast.error(errorMsg);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }
});
