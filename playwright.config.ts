import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:4201', channel: process.platform === 'win32' ? 'msedge' : undefined, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  reporter: 'list',
  webServer: { command: 'node scripts/run.mjs ng serve --configuration testing --host 127.0.0.1 --port 4201', url: 'http://127.0.0.1:4201', reuseExistingServer: false, timeout: 60000 }
});
