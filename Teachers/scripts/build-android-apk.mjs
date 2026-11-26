// يبني APK جديد من كود الويب الحالي ويحطه في مجلد التحميل جاهز للنشر.
// ويولّد public/version.json (ملف فحص التحديث داخل التطبيق) من نفس أرقام الإصدار.
// الاستخدام: npm run android:apk
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const log = (msg) => console.log(`\n${msg}`);

function run(cmd, cwd = root) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true });
}

const gradleFile = path.join(root, 'android/app/build.gradle');
const gradle = fs.readFileSync(gradleFile, 'utf8');
const versionCode = Number(/versionCode\s+(\d+)/.exec(gradle)?.[1] ?? 0);
const versionName = /versionName\s+"([^"]+)"/.exec(gradle)?.[1] ?? '?';

log(`بناء APK — الإصدار ${versionName} (versionCode ${versionCode})`);

// ملف واحد يقرأه التطبيق ليعرف نسخته الحالية، ويقرأه الموقع ليعرف آخر إصدار منشور.
// لازم يتكتب قبل البناء حتى تدخل نسخته داخل الـAPK.
function writeVersionFile(extra = {}) {
  const payload = {
    versionCode,
    versionName,
    downloadPage: '/download.html',
    downloadUrl: '/downloads/sabeel-academy.apk',
    releasedAt: new Date().toISOString(),
    ...extra,
  };
  for (const dir of ['public', 'dist']) {
    const target = path.join(root, dir);
    if (dir === 'dist' && !fs.existsSync(target)) continue;
    fs.writeFileSync(path.join(target, 'version.json'), `${JSON.stringify(payload, null, 2)}\n`);
  }
  return payload;
}

writeVersionFile();

log('1/4 بناء الويب');
run('npm run build');

log('2/4 نسخ الأصول إلى مشروع الأندرويد');
run('npx cap sync android');

// من غير السطر ده التطبيق بيشيل جواه نسخة من الـAPK نفسه (حوالي 9MB زيادة)
fs.rmSync(path.join(root, 'android/app/src/main/assets/public/downloads'), { recursive: true, force: true });

log('3/4 بناء الـAPK');
const androidDir = path.join(root, 'android');

// Gradle محتاج يعرف مكان Android SDK، وإلا البناء بيفشل برسالة مسار غامضة
if (!process.env.ANDROID_HOME && !process.env.ANDROID_SDK_ROOT) {
  const candidates = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    process.env.HOME && path.join(process.env.HOME, 'Library', 'Android', 'sdk'),
    process.env.HOME && path.join(process.env.HOME, 'Android', 'Sdk'),
  ].filter(Boolean);
  const sdk = candidates.find((p) => fs.existsSync(p));
  if (sdk) {
    process.env.ANDROID_HOME = sdk;
    console.log(`   Android SDK: ${sdk}`);
  } else {
    console.log('   تحذير: لم يتم العثور على Android SDK — اضبط ANDROID_HOME');
  }
}

const gradlew = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
// مسار مطلق: cmd على ويندوز مبيحلّش gradlew.bat من الـcwd لو اتنده بالاسم المجرد
run(`"${gradlew}" assembleDebug --console=plain`, androidDir);

const built = path.join(root, 'android/app/build/outputs/apk/debug/app-debug.apk');
if (!fs.existsSync(built)) throw new Error('لم يتم إنتاج app-debug.apk');

log('4/4 نسخ الـAPK إلى مجلد التحميل');
for (const dir of ['public/downloads', 'dist/downloads']) {
  fs.mkdirSync(path.join(root, dir), { recursive: true });
  fs.copyFileSync(built, path.join(root, dir, 'sabeel-academy.apk'));
}

const bytes = fs.statSync(built).size;
const sha = crypto.createHash('sha256').update(fs.readFileSync(built)).digest('hex');

// نحدّث الملف بالحجم والبصمة بعد بناء الـAPK، فيقدر التطبيق يعرض بيانات دقيقة
writeVersionFile({ sizeBytes: bytes, sha256: sha });

console.log(`\n✅ جاهز: public/downloads/sabeel-academy.apk — ${(bytes / 1048576).toFixed(1)} MB`);
console.log(`   versionCode ${versionCode} • sha256 ${sha}`);
console.log(`   version.json محدّث (التطبيق بيقرأ منه رقم آخر إصدار)`);
console.log('\nالنشر: ارفع مجلد dist + public/downloads + public/version.json على الموقع');
console.log(`قبل الإصدار القادم: ارفع versionCode إلى ${versionCode + 1} في android/app/build.gradle\n`);
