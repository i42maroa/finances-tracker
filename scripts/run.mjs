import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve, delimiter } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localNode = join(root, '.runtime', 'node_modules', 'node', 'bin', process.platform === 'win32' ? 'node.exe' : 'node');
const [major, minor] = process.versions.node.split('.').map(Number);
const compatible = major >= 26 || major === 24 && minor >= 15;
const node = compatible ? process.execPath : existsSync(localNode) ? localNode : null;
if (!node) {
  console.error('Hucha necesita Node 24.15+ o 26+. Instala una versión compatible y ejecuta npm ci.');
  process.exit(1);
}
const [command, ...args] = process.argv.slice(2);
const entries = { ng: '@angular/cli/bin/ng.js', vitest: 'vitest/vitest.mjs', playwright: '@playwright/test/cli.js', firebase: 'firebase-tools/lib/bin/firebase.js' };
if (!entries[command]) { console.error('Herramienta no reconocida.'); process.exit(1); }
const env = { ...process.env, PATH: `${dirname(node)}${delimiter}${process.env.PATH || ''}` };
if (command === 'firebase') env.DEBUG = '';
const javaRoot = join(root, '.runtime', 'java');
if (!env.JAVA_HOME && existsSync(javaRoot)) {
  const directory = readdirSync(javaRoot, { withFileTypes: true }).find(entry => entry.isDirectory());
  if (directory) { env.JAVA_HOME = join(javaRoot, directory.name); env.PATH = `${join(env.JAVA_HOME, 'bin')}${delimiter}${env.PATH}`; }
}
const child = spawn(node, [join(root, 'node_modules', entries[command]), ...args], { cwd: root, env, stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
