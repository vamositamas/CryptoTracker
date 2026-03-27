import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:4200',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'npx ng serve --no-open',
      cwd: '../frontend',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      timeout: 120000,
    },
    {
      command: 'npx ts-node src/server.ts',
      cwd: '../backend',
      url: 'http://localhost:3001/api/v1/health',
      reuseExistingServer: !process.env['CI'],
      timeout: 30000,
      env: {
        DATA_DIR: process.env['DATA_DIR'] || path.join(os.tmpdir(), `crypto-tracker-test-${Date.now()}`),
      },
    },
  ],
    // globalSetup: require.resolve('./global-setup.ts'),
    // globalTeardown: require.resolve('./global-teardown.ts'),
});
