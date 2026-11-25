/**
 * Fast, dependency-free health check for the Sabeel Academy role/deploy setup.
 * Run with: npm run verify:config
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8');
const results = [];
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

function check(label, condition, detail = '') {
  results.push({ label, ok: Boolean(condition), detail });
}

let firebaseJson;
try {
  firebaseJson = JSON.parse(read('firebase.json'));
} catch (err) {
  fail(`firebase.json is not valid JSON: ${err.message}`);
}
const functionsSource = firebaseJson.functions?.[0]?.source;
check('Functions source points to an existing folder', functionsSource === 'functions' && existsSync(resolve(root, 'functions')), `source=${functionsSource}`);

const functionsJs = read('functions/index.js');
check('OneSignal REST key is mandatory (fail closed)', functionsJs.includes("ONESIGNAL_REST_API_KEY is not configured"));
check('No global "Total Subscriptions" broadcast fallback', !functionsJs.includes("included_segments"));
check('notification secrets are bound through Firebase Secret Manager', functionsJs.includes("defineSecret('ONESIGNAL_REST_API_KEY')") && functionsJs.includes("defineSecret('CRON_SECRET')") && functionsJs.includes('runWith({ secrets:'));
check('dispatchNotification requires a verified admin token', functionsJs.includes("verifyIdToken") && functionsJs.includes("Admin Firebase token required"));
check('scheduled worker requires a scheduler/admin token', functionsJs.includes("Scheduler secret or admin token required"));
check('CORS never falls back to a wildcard origin', !functionsJs.includes("ALLOWED_ORIGIN || '*'") && !functionsJs.includes("'Access-Control-Allow-Origin', '*'"));
check('OneSignal and cron secrets are read inside function handlers', functionsJs.includes('secret.value()') && functionsJs.includes('readSecret(oneSignalKeySecret') && functionsJs.includes('readSecret(cronSecret'));
check('push logs never expose recipient identifiers', !functionsJs.includes('Target external IDs'));

check('Firestore indexes are configured', firebaseJson.firestore?.indexes === 'firestore.indexes.json' && existsSync(resolve(root, 'firestore.indexes.json')));
check('Hosting serves the built dist folder', firebaseJson.hosting?.public === 'dist' && Array.isArray(firebaseJson.hosting?.rewrites));
check('Hosting deploy ignores sensitive source folders', ['functions/**', 'scripts/**', 'src/**'].every((p) => (firebaseJson.hosting?.ignore || []).includes(p)));

const transcribeTs = read('functions/api/transcribe-and-grade.ts');
check('transcribe API never accepts a client-supplied Gemini key', !transcribeTs.includes('x-gemini-api-key') && transcribeTs.includes('context.env.GEMINI_API_KEY'));
check('transcribe API never emits wildcard CORS', !transcribeTs.includes("'Access-Control-Allow-Origin': '*'") && transcribeTs.includes('buildCorsHeaders'));
check('transcribe API does not leak upstream error details', !transcribeTs.includes('details: lastErrorDetails') && !transcribeTs.includes('details: error.message'));

const viteConfig = read('vite.config.ts');
check('dev server serves CSS as text/css (no unstyled preview)', viteConfig.includes("command === 'serve'") && viteConfig.includes('?direct'));

const variablesCss = read('assets/css/variables.css');
const mainCss = read('assets/css/main.css');
const componentsCss = read('assets/css/components.css');
check('dark theme is a soft charcoal, not pitch black',
  variablesCss.includes('--bg-primary: #0B1220') && !variablesCss.includes('--bg-primary: #000000') && !variablesCss.includes('--bg-card: #0a0a0a'));
check('dialogs always stack above the mobile sidebar',
  variablesCss.includes('--z-sidebar-mobile: 9000') &&
  variablesCss.includes('--z-modal: 10000') &&
  mainCss.includes('var(--z-sidebar-mobile)') &&
  componentsCss.includes('var(--z-modal)'));
const helpersJs = read('assets/js/shared/utils/helpers.js');
check('confirm dialogs collapse the mobile sidebar before opening',
  helpersJs.includes("document.querySelectorAll('.sidebar.active')") && helpersJs.includes("getElementById('sidebar-backdrop')"));
check('skeleton placeholders are actually visible while data loads',
  componentsCss.includes('.skeleton-box::after') && componentsCss.includes('skeletonShimmer'));
check('mobile touch targets and iOS input zoom are handled',
  mainCss.includes('min-height: 42px') && mainCss.includes('font-size: 16px !important'));

const authCss = read('assets/css/auth.css');
check('login theme uses the shared design tokens', authCss.includes('--auth-baby-blue: var(--primary-color)') && authCss.includes('body.auth-page-wrapper'));
check('no hardcoded cyan left in the auth theme', !authCss.includes('#38bdf8') && !authCss.includes('rgba(56, 189, 248,'));

const firebaseConfigJs = read('assets/js/config/firebase.js');
check('brand color cannot repaint the whole UI with a neon value', firebaseConfigJs.includes('Ignored an out-of-palette brand color'));

const notificationServiceJs = read('assets/js/shared/services/notificationService.js');
check('active push path is the Cloudflare Worker (no Blaze required)', notificationServiceJs.includes("https://notification-api.prnccrft.workers.dev/") && notificationServiceJs.includes('fetch(WORKER_PUSH_URL'));

const authJs = read('assets/js/features/auth/authService.js');
const sessionBody = authJs.slice(authJs.indexOf('function updateStoredSession'), authJs.indexOf('function redirectToLogin'));
check('session object never stores the legacy isSubAdmin flag', !sessionBody.includes('isSubAdmin'));
check('session role is resolved through the RBAC service', authJs.includes('resolveEffectiveRole(cached)'));

const rules = read('firestore.rules');
check('Firestore keeps its zero-trust default deny', /match \/\{document=\*\*\} \{\s*allow read, write: if false;/.test(rules));
check('Firestore still contains normalized RBAC helpers', rules.includes('hasPerm(') && rules.includes('user_roles/{userId}'));
check('lesson-view permission check is guarded for teachers (expression limit)', rules.includes('(isSupervisor() && hasLessonViewPerm())'));
check(
  'sessions/lessons block teacher self-approval flips and trial self-approval',
  (rules.match(/incoming\(\)\.approved == existing\(\)\.approved/g) || []).length >= 2 &&
  (rules.match(/incoming\(\)\.isTrial != true/g) || []).length >= 2
);
check('audit logs are immutable', /match \/auditLogs\/\{logId\} \{[\s\S]*?allow update, delete: if false;/.test(rules));
check('settings reads require sign-in except the public academy doc', rules.includes("settingId == 'academy' || isSignedIn()"));
check('community post edits require authorship or admin', rules.includes('isApprovedTeacher() && existing().authorId == request.auth.uid'));

const scriptSources = [
  'check-notif.cjs', 'test-firestore-rest.cjs', 'verify-onesignal.cjs', 'verify-onesignal.js',
  'push-to-github.mjs', 'verify-config.mjs'
].map((f) => read(`scripts/${f}`)).join('\n');
check('no hardcoded Google API keys in scripts', !/AIza[0-9A-Za-z_-]{20,}/.test(scriptSources));
check('no hardcoded OneSignal app IDs in scripts', !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(scriptSources));
const oneSignalVerifiers = ['verify-onesignal.cjs', 'verify-onesignal.js'].map((f) => read(`scripts/${f}`));
check('OneSignal verification targets one test alias with explicit confirmation', oneSignalVerifiers.every((src) => src.includes('include_aliases') && src.includes('external_id') && src.includes('CONFIRM_TEST_PUSH') && !src.includes('included_segments')));
check('Firestore REST smoke test refuses production without opt-in', scriptSources.includes('ALLOW_FIRESTORE_TEST') && scriptSources.includes('Refusing to run') && scriptSources.includes("projectId === 'sabeelteacher'"));
check('push-to-github excludes the sensitive scripts folder', read('scripts/push-to-github.mjs').includes("'scripts'"));

const supervisorPages = readdirSync(resolve(root, 'supervisor')).filter((f) => f.endsWith('.html'));
const unguardedSupervisorPages = supervisorPages.filter((f) => !read(`supervisor/${f}`).includes('initSupervisorPage('));
check('every supervisor page uses the RBAC page shell', unguardedSupervisorPages.length === 0, unguardedSupervisorPages.join(', '));

const criticalGuards = [
  ['admin/today-sessions.html', "protectRoute('admin')"],
  ['admin/investigation.html', "protectRoute('admin')"],
  ['teacher/community.html', "protectRoute('teacher')"]
];
for (const [file, guard] of criticalGuards) {
  check(`${file} has an explicit role guard`, read(file).includes(guard));
}
check('investigation center no longer trusts a display-only role name', !read('admin/investigation.html').includes("roleName !== 'مشرف'"));

const pkg = JSON.parse(read('package.json'));
check('package.json is named for this project', pkg.name === 'sabeel-academy');

let failures = 0;
for (const { label, ok, detail } of results) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}

console.log(`\n${results.length - failures}/${results.length} checks passed.`);
if (failures > 0) {
  console.error(`Config verification failed: ${failures} check(s) did not pass.`);
  process.exit(1);
}
process.exit(0);
