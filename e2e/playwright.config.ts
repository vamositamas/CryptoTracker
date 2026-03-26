import { defineConfig, devices } from '@playwright/test';

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
    },
  ],
});
