/**
 * Boots the Firestore emulator from an ASCII-only temp path (Java on Windows
 * cannot read non-ASCII project paths), then runs the rules test suite.
 * Run with: npm run test:rules
 */
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.FIRESTORE_TEST_PORT || 8088);
const host = `127.0.0.1:${port}`;

const emulatorCacheDir = join(homedir(), '.cache', 'firebase', 'emulators');
const cachedJar = existsSync(emulatorCacheDir)
  ? readdirSync(emulatorCacheDir).find((name) => name.startsWith('cloud-firestore-emulator') && name.endsWith('.jar'))
  : null;
const jar = process.env.FIRESTORE_EMULATOR_JAR
  || (cachedJar ? join(emulatorCacheDir, cachedJar) : null);

if (!jar || !existsSync(jar)) {
  console.error('لم يتم العثور على Firestore Emulator. ثبّت: npm i -g firebase-tools');
  process.exit(1);
}

// Keep a clean, ASCII-only copy of the rules for the Java process.
const tempDir = join(tmpdir(), 'opencode', 'sabeel-firestore-rules');
mkdirSync(tempDir, { recursive: true });
const rulesCopy = join(tempDir, 'firestore.rules');
copyFileSync(join(root, 'firestore.rules'), rulesCopy);

const emulator = spawn('java', [
  '-jar', jar,
  '--host', '127.0.0.1',
  '--port', String(port),
  '--rules', rulesCopy
], { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] });

let emulatorError = '';
emulator.stderr.on('data', (chunk) => { emulatorError += chunk.toString(); });

async function waitForEmulator() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (emulator.exitCode !== null) {
      throw new Error(`Emulator exited early (${emulator.exitCode}): ${emulatorError.slice(-800)}`);
    }
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.status > 0) return;
    } catch {
      // not ready yet
    }
    await new Promise((done) => setTimeout(done, 300));
  }
  throw new Error('Timed out waiting for the Firestore emulator.');
}

try {
  await waitForEmulator();
  const tests = spawn(process.execPath, ['--test', 'tests/firestore.rules.test.mjs'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, FIRESTORE_EMULATOR_HOST: host }
  });
  const code = await new Promise((done) => tests.on('exit', done));
  process.exitCode = code ?? 1;
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  emulator.kill('SIGTERM');
}
