import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:4200',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'cd ../frontend && npx ng serve --no-open',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      timeout: 120000,
    },
    {
      command: 'cd ../backend && npx ts-node src/server.ts',
      url: 'http://localhost:3001/api/v1/health',
      reuseExistingServer: !process.env['CI'],
      timeout: 30000,
    },
  ],
});
