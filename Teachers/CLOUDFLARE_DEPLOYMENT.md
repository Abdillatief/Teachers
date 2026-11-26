# دليل نشر نظام سبيل على Cloudflare (Pages & Workers)

تم تجهيز هذا المشروع ليكون متوافقاً 100% مع بيئة **Cloudflare Pages** و **Cloudflare Workers Functions** بدون الحاجة لأي تعديلات برمجية.

---

## ⚡ الطريقة الأولى: النشر التلقائي عبر GitHub / GitLab (الأسهل والأفضل)

1. قم برفع المشروع على مستودع (Git Repository) في GitHub أو GitLab.
2. سجّل الدخول إلى لوحة تحكم [Cloudflare Dashboard](https://dash.cloudflare.com).
3. توجّه إلى: **Workers & Pages** ثم اضغط على **Create application** > **Pages** > **Connect to Git**.
4. اختر المستودع الخاص بالمشروع، ثم املأ إعدادات البناء (Build Settings):
   - **Framework preset**: `Vite` (أو `None`)
   - **Build command**: `npm run build` (أو `npm run build:pages`)
   - **Build output directory**: `dist`
   - **Root directory**: `Teachers` (المشروع كله موجود جوّه فولدر `Teachers` في جذر مستودع `Abdillatief/Teachers`)
5. **إضافة المتغيرات البيئية (Environment Variables)**:
   - اضغط على **Add variable**.
   - الاسم (Variable name): `GEMINI_API_KEY`
   - القيمة (Value): مفتاح Google Gemini API الخاص بك (مثل `AIzaSy...`).
6. اضغط على **Save and Deploy**.

---

## 🚀 الطريقة الثانية: النشر المباشر عبر سطر الأوامر (Wrangler CLI)

إذا كنت ترغب برفع ملفات المشروع فوراً من جهازك بدون ربط Git:

1. بناء المشروع:
   ```bash
   npm run build
   ```

2. النشر المباشر على Cloudflare Workers (الطريقة المستخدمة فعلياً للموقع):
   ```bash
   npx wrangler deploy
   ```
   المشروع منشور كـWorker اسمه `teachers` (إعداداته في `wrangler.toml` مع `assets = "./dist"`),
   والرابط: `https://teachers.sabeelacademy8.workers.dev`. لو طلب تسجيل دخول:
   ```bash
   npx wrangler login
   ```

3. لضبط المتغير البيئي (مفتاح Gemini) على الـWorker:
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   ```

4. لنشر إصدار أندرويد جديد + الموقع معاً بأمر واحد:
   ```bash
   npm run android:apk   # يبنى الويب + APK ويحدّث public/version.json
   npm run deploy        # يبنى وينشر على الـWorker
   ```

---

## 🛠️ الملفات المهيأة تلقائياً داخل المشروع

1. **`public/_redirects`**:
   - يحتوي على `/* /index.html 200` لضمان عمل نظام SPA والتنقل الداخلي دون أخطاء 404 عند إعادة تحميل أي صفحة.

2. **`public/_headers`**:
   - ترويسات الأمان (Security Headers): `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`.
   - كاش فائق السرعة لملفات الأصول الثابتة: `/assets/*` (Cache-Control 1 year immutable).

3. **`functions/api/transcribe-and-grade.ts`**:
   - دوال Cloudflare Pages Functions الموزعة عالمياً على شبكة Cloudflare Edge (بدون الحاجة لخادم Node منفصل).
   - متوافقة تماماً مع معايير V8 Runtime و Web Request/Response.

4. **`functions/api/health.ts`**:
   - نقطة فحص سلامة الاتصال والتأكد من حالة مفتاح API على Cloudflare.

5. **`wrangler.toml`**:
   - ملف الإعدادات الرسمي الخاص بـ Cloudflare.

---

## 🔒 إعداد مفتاح API البديل من داخل التطبيق

إذا قمت بنشر المشروع كموقع ثابت فقط دون Cloudflare Functions:
- يمكنك النقر على زر **"نشر Cloudflare وإعدادات الربط"** في شريط الموقع العلوي.
- أدخل مفتاحك في خانة **"مفتاح Google Gemini API"** وسيتم حفظه محلياً في متصفحك (LocalStorage) ليعمل التطبيق مباشرة بدقة متناهية.
