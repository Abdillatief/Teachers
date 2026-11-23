# أكاديمية سبيل — نظام الإدارة الذكي

نظام ويب عربي (RTL) لإدارة معهد تحفيظ قرآن، مقسّم إلى ثلاث بوابات مستقلة:

| البوابة | المسار | من يستخدمها | أهم ما فيها |
| --- | --- | --- | --- |
| المدير | `/admin/*.html` | إدارة الأكاديمية | الطلاب، المعلمون، المجموعات، المدفوعات، الرواتب، الصلاحيات، الطلبات، التقارير |
| المشرف | `/supervisor/*.html` | المشرف التشغيلي | الحصص، الغياب، المؤجلة والتعويض، الجداول، الطلبات — **بدون أي بيانات مالية أو إشعارات** |
| المعلم | `/teacher/*.html` | المعلم | حصصه وطلابه وجدوله وراتبه وتنبيهات بدء الحصة |
| تسجيل الدخول | `index.html` / `register.html` | الجميع | مصادقة Firebase وتوجيه حسب الدور |

## التشغيل محلياً

```bash
npm install
npm run dev          # http://localhost:3000
```

> على Windows إذا منعت سياسة التنفيذ تشغيل npm، استخدم: `cmd /c "npm install"` و `cmd /c "npm run dev"`.

## البناء والنشر

```bash
npm run build        # ينتج مجلد dist بكل صفحات الأدوار الثلاثة
npm run deploy       # نشر Pages على Cloudflare
```

- الواجهة: ملفات HTML/JS أصلية (ES modules) + Firebase 10.14.1 + Tailwind عبر Vite.
- الإشعارات: Cloud Functions في مجلد `functions/` + OneSignal. راجع `functions/index.js` و`CLOUDFLARE_DEPLOYMENT.md`.
- الدوال الخلفية (التقييم/الصوت) الموجودة في `server.ts` و`functions/api/` خاصة بأدوات AI Studio، وليست جزءاً من بوابات الأدوار.

### الإشعارات: المسار النشط هو Cloudflare Worker (لا يحتاج Blaze)

الواجهة لا تستدعي Firebase Functions عند الإرسال، بل تستدعي Worker جاهزاً:

- `WORKER_PUSH_URL` في `assets/js/shared/services/notificationService.js` = `https://notification-api.prnccrft.workers.dev/`
- المفتاح محفوظ داخل متغيرات Worker في Cloudflare، **مش في المتصفح**.

=> **لا تحتاج ترقية Firebase إلى Blaze**، ولا تحتاج تنشر `functions/` عشان الإشعارات تشتغل.
قواعد Firestore بس هي اللي اتنشرت، وده كافي للبوابات الثلاثة.

> ملاحظة أمنية: Worker الحالي يستقبل POST بدون توكن. يفضّل إضافة هيدر ثابت
> (مثلاً `X-Sabeel-Key`) يتم التحقق منه في Worker وإرساله من `notificationService.js`.

### Firebase Functions (مسار احتياطي/قديم — اختياري)

مجلد `functions/` فيه نسخة محصّنة من منطق الإشعارات، لكنها **غير منشورة** حالياً.
نشرها اختياري ومحتاج خطة Blaze. لو قررت تنشرها:

```bash
cmd /c "firebase functions:secrets:set ONESIGNAL_REST_API_KEY"
cmd /c "firebase functions:secrets:set CRON_SECRET"
cmd /c "firebase deploy --only functions --project sabeelteacher"
```

| المتغير | الغرض |
| --- | --- |
| `ONESIGNAL_REST_API_KEY` | مفتاح إرسال Push. بدونه لا يُرسل شيء (fail-closed). يُكتب بدون كلمة `Basic`. |
| `ONESIGNAL_APP_ID` | معرّف تطبيق OneSignal (له قيمة افتراضية). |
| `CRON_SECRET` | سرّ نقطة `processScheduledNotifications` عند جدولة Cloud Scheduler. |
| `ALLOWED_ORIGIN` | origin المسموح له باستدعاء دوال الإشعارات (اختياري، الافتراضي `*` مع إلزام التوكن). |

## الصلاحيات والأمان

- المصدر الوحيد للدور والصلاحيات هو `user_roles/{uid}` + `role_permissions/{roleId}` (واجهة `assets/js/features/rbac/rbacService.js`).
- `firestore.rules` يبدأ بـ default-deny، ويمنع المشرف من المجموعات المالية وبيانات المستخدمين الخام، ويجعل سجلات الغياب/Nشاط غير قابلة للتعديل.
- حالات `isSubAdmin` / `sub_admin` القديمة موجودة **فقط** كجسر ترحيل لبيانات ما قبل نظام RBAC، ويتم حذفها من مستندات المستخدم عند أول تحديث. لا تضف فحصاً جديداً لها في صفحات الأدوار.
- نقطة `dispatchNotification` تتطلب توكن Firebase لمستخدم **`admin` موافق عليه**، ولا تثق بـ `senderId` القادم من العميل.
- `security_spec.md` يوثّق 12 سيناريو اختراق يجب أن تفشل جميعها بـ `PERMISSION_DENIED`.

## فحص سريع

```bash
npm run verify:config   # يفحص إعدادات النشر والإشعارات وتوحيد الأدوار
npm run lint:rules      # يفحص firestore.rules
npm run test:rules      # 16 اختباراً على Firestore Emulator (الـ 12 سيناريو + مسارات الأدوار)
```

`test:rules` يشغّل المحاكي من مسار ASCII مؤقت (لأن Java على Windows لا يقرأ مسار المشروع العربي)،
ثم ينفّذ `tests/firestore.rules.test.mjs`. يحتاج Java و`firebase-tools` مثبّتين (`npm i -g firebase-tools`).
لا تنشر `firestore.rules` قبل ما كل الاختبارات تعدي.
