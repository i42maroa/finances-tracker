import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = [
  ['config/firebase-config.example.json', 'public/firebase-config.json'],
  ['public/firebase-config.json', 'public/firebase-config.local.json'],
  ['.firebaserc.example', '.firebaserc']
];

for (const [source, target] of files) {
  const destination = join(root, target);
  if (existsSync(destination)) {
    console.log(`Se conserva ${target}.`);
    continue;
  }
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(join(root, source), destination);
  console.log(`Creado ${target}.`);
}

console.log('Configuración local lista. Completa los archivos de public/ para usar Firebase real.');
