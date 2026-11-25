// يبني APK جديد من كود الويب الحالي ويحطه في مجلد التحميل جاهز للنشر.
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

log('1/4 بناء الويب');
run('npm run build');

log('2/4 نسخ الأصول إلى مشروع الأندرويد');
run('npx cap sync android');

// من غير السطر ده التطبيق بيشيل جواه نسخة من الـAPK نفسه (حوالي 9MB زيادة)
fs.rmSync(path.join(root, 'android/app/src/main/assets/public/downloads'), { recursive: true, force: true });

log('3/4 بناء الـAPK');
const androidDir = path.join(root, 'android');
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
console.log(`\n✅ جاهز: public/downloads/sabeel-academy.apk — ${(bytes / 1048576).toFixed(1)} MB`);
console.log(`   versionCode ${versionCode} • sha256 ${sha}`);
console.log('\nالنشر: git add -f public/downloads/sabeel-academy.apk && git commit -m "Update Android APK" && git push');
console.log(`قبل الإصدار القادم: ارفع versionCode إلى ${versionCode + 1} في android/app/build.gradle\n`);
