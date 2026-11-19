import { afterEach, expect, test } from 'vitest';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const fixtures: string[] = [];
afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    if (!fixture.startsWith(join(tmpdir(), 'hucha-config-'))) throw new Error('Ruta temporal no válida.');
    rmSync(fixture, { recursive: true, force: true });
  }
});

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'hucha-config-'));
  fixtures.push(root);
  for (const directory of ['scripts', 'config', 'public']) mkdirSync(join(root, directory));
  copyFileSync('scripts/setup-config.mjs', join(root, 'scripts/setup-config.mjs'));
  copyFileSync('config/firebase-config.example.json', join(root, 'config/firebase-config.example.json'));
  copyFileSync('.firebaserc.example', join(root, '.firebaserc.example'));
  return root;
}

function setup(root: string): void {
  execFileSync(process.execPath, [join(root, 'scripts/setup-config.mjs')], { cwd: root, windowsHide: true });
}

test('prepara una copia nueva con configuración vacía y demostración disponible', () => {
  const root = fixture();
  setup(root);
  expect(JSON.parse(readFileSync(join(root, 'public/firebase-config.json'), 'utf8')).projectId).toBe('');
  expect(readFileSync(join(root, 'public/firebase-config.local.json'), 'utf8')).toBe(readFileSync(join(root, 'public/firebase-config.json'), 'utf8'));
  expect(existsSync(join(root, '.firebaserc'))).toBe(true);
});

test('conserva la configuración existente y solo usa producción como valor inicial del desarrollo', () => {
  const root = fixture();
  const production = '{"projectId":"production-fixture"}\n';
  const development = '{"projectId":"development-fixture"}\n';
  const aliases = '{"projects":{"default":"production-fixture"}}\n';
  writeFileSync(join(root, 'public/firebase-config.json'), production);
  writeFileSync(join(root, '.firebaserc'), aliases);
  setup(root);
  expect(readFileSync(join(root, 'public/firebase-config.local.json'), 'utf8')).toBe(production);
  writeFileSync(join(root, 'public/firebase-config.local.json'), development);
  setup(root);
  expect(readFileSync(join(root, 'public/firebase-config.local.json'), 'utf8')).toBe(development);
  expect(readFileSync(join(root, 'public/firebase-config.json'), 'utf8')).toBe(production);
  expect(readFileSync(join(root, '.firebaserc'), 'utf8')).toBe(aliases);
});
