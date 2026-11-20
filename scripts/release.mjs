import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const verifyOnly = args.includes('--verify-only');
const project = args[args.indexOf('--project') + 1];
if (!verifyOnly && (!args.includes('--project') || !project || project.startsWith('--'))) {
  console.error('Indica --project ID o usa --verify-only para validar sin publicar.');
  process.exit(1);
}

const inputs = ['src', 'public', 'tests', 'e2e', 'scripts', 'package.json', 'package-lock.json', 'angular.json', 'firebase.json', 'firestore.rules', 'firestore.indexes.json', 'playwright.config.ts', 'vitest.config.ts', 'vitest.rules.config.ts', 'tsconfig.json', 'tsconfig.app.json'];
function fingerprint() {
  const hash = createHash('sha256');
  function visit(path) {
    const absolute = join(root, path);
    if (!existsSync(absolute)) return;
    const entries = readdirIfDirectory(absolute);
    if (entries) for (const entry of entries.sort()) visit(join(path, entry));
    else hash.update(path).update(readFileSync(absolute));
  }
  for (const input of inputs) visit(input);
  return hash.digest('hex');
}
function readdirIfDirectory(path) {
  try { return readdirSync(path); }
  catch (error) { if (error.code === 'ENOTDIR') return null; throw error; }
}
function run(tool, ...toolArgs) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [resolve(root, 'scripts/run.mjs'), tool, ...toolArgs], { cwd: root, env: process.env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolveRun() : reject(new Error(`${tool} terminó con código ${code}.`)));
  });
}

try {
  if (!verifyOnly) {
    const config = JSON.parse(readFileSync(join(root, 'public/firebase-config.json'), 'utf8'));
    if (config.projectId !== project || config.useEmulators || !config.apiKey || !config.appId)
      throw new Error('La configuración de producción no coincide con el proyecto indicado.');
  }
  const before = fingerprint();
  await run('vitest', 'run');
  await run('firebase', 'emulators:exec', '--only', 'firestore', '--project', 'demo-hucha', 'node scripts/run.mjs vitest run --config vitest.rules.config.ts');
  const browserTests = readdirSync(join(root, 'e2e')).filter(name => name.endsWith('.spec.ts') && name !== 'firebase.spec.ts').sort().map(name => `e2e/${name}`);
  await run('playwright', 'test', ...browserTests);
  await run('firebase', 'emulators:exec', '--only', 'auth,firestore', '--project', 'demo-hucha', 'node scripts/run.mjs playwright test e2e/firebase.spec.ts');
  await run('ng', 'build', '--configuration', 'production');
  if (before !== fingerprint()) throw new Error('El código cambió durante la validación. Repite la publicación.');
  console.log('Validación completa: cálculos, reglas, navegador, dos cuentas y compilación de producción.');
  if (!verifyOnly) {
    await run('firebase', 'deploy', '--only', 'firestore:rules,firestore:indexes,hosting', '--project', project, '--non-interactive');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
