import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_OWNER || 'Abdillatief';
const REPO = process.env.GITHUB_REPO || 'Teachers';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const REMOTE_PREFIX = (process.env.GITHUB_REMOTE_PREFIX || 'Sabeel SYS').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
const ROOT = process.cwd();

if (!TOKEN) {
  console.error('Missing GITHUB_TOKEN env var.');
  process.exit(1);
}

const API = 'https://api.github.com';
const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'sabeel-upload-script'
};

const EXCLUDE_DIRS = new Set([
  'node_modules', 'dist', '.wrangler', '.git', '.gradle', '.idea', '.vscode',
  'scripts', // may contain env-driven diagnostic scripts and credentials in local env files
  'android/.gradle', 'android/build', 'android/app/build', 'android/capacitor-cordova-android-plugins/build',
  'android/app/.cxx', 'android/local.properties', 'tmp-icon-preview'
]);
const EXCLUDE_FILES = new Set(['.env', '.env.local', '.env.production', '.env.development', 'google-services.json', 'GoogleService-Info.plist']);
const EXCLUDE_PATTERNS = [/\.log$/i, /\.keystore$/i, /\.jks$/i];

function toPosix(p) { return p.replace(/\\/g, '/'); }
function rel(p) { return toPosix(path.relative(ROOT, p)); }
function isExcluded(relPath) {
  const p = toPosix(relPath).replace(/^\/+/, '');
  if (EXCLUDE_FILES.has(path.basename(p))) return true;
  if (EXCLUDE_PATTERNS.some(r => r.test(p))) return true;
  const parts = p.split('/');
  for (let i = 0; i < parts.length; i++) {
    const sub = parts.slice(0, i + 1).join('/');
    if (EXCLUDE_DIRS.has(sub) || EXCLUDE_DIRS.has(parts[i])) return true;
  }
  if (p.startsWith('.env')) return true;
  return false;
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    const r = rel(full);
    if (!r || isExcluded(r)) continue;
    if (ent.isDirectory()) walk(full, out);
    else if (ent.isFile()) out.push({ full, rel: r });
  }
  return out;
}

async function gh(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = typeof data === 'object' ? JSON.stringify(data) : String(data);
    throw new Error(`${res.status} ${res.statusText} ${url}\n${msg}`);
  }
  return data;
}

async function main() {
  console.log(`Repo: ${OWNER}/${REPO} branch=${BRANCH} remotePrefix=${REMOTE_PREFIX}/`);
  console.log('Collecting files...');
  const files = walk(ROOT).filter(f => !isExcluded(f.rel));
  console.log(`Files: ${files.length}`);

  // Get current ref/commit/tree
  const ref = await gh(`${API}/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
  const headSha = ref.object.sha;
  const headCommit = await gh(`${API}/repos/${OWNER}/${REPO}/git/commits/${headSha}`);
  const rootTree = await gh(`${API}/repos/${OWNER}/${REPO}/git/trees/${headCommit.tree.sha}`);

  // Keep root entries except REMOTE_PREFIX
  const keptRootEntries = (rootTree.tree || []).filter(e => e.path !== REMOTE_PREFIX);
  console.log(`Root entries kept: ${keptRootEntries.map(e=>e.path).join(', ')}`);

  // Create blobs
  const treeEntries = [...keptRootEntries.map(e => ({ path: e.path, mode: e.mode, type: e.type, sha: e.sha }))];
  let i = 0;
  for (const f of files) {
    i++;
    const content = fs.readFileSync(f.full);
    const b64 = content.toString('base64');
    const blob = await gh(`${API}/repos/${OWNER}/${REPO}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: b64, encoding: 'base64' })
    });
    const remotePath = `${REMOTE_PREFIX}/${f.rel}`;
    treeEntries.push({ path: remotePath, mode: '100644', type: 'blob', sha: blob.sha });
    if (i % 25 === 0 || i === files.length) console.log(`Blobs: ${i}/${files.length}`);
  }

  console.log('Creating tree...');
  const tree = await gh(`${API}/repos/${OWNER}/${REPO}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ tree: treeEntries })
  });

  console.log('Creating commit...');
  const commit = await gh(`${API}/repos/${OWNER}/${REPO}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message: process.env.GITHUB_COMMIT_MESSAGE || 'Fix admin modals/layout, notifications page, download APK path, and push error handling',
      tree: tree.sha,
      parents: [headSha]
    })
  });

  console.log('Updating ref...');
  await gh(`${API}/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false })
  });

  console.log('Done. Commit:', commit.sha);
}

main().catch(err => { console.error(err); process.exit(1); });
