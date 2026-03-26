import { test, expect } from '@playwright/test';

test.describe('Health endpoint', () => {
  test('GET /api/v1/health returns 200 and { status: "ok" }', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/v1/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: 'ok' });
  });

  test('CSP header present on health response', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/v1/health');
    expect(response.headers()['content-security-policy']).toBe("default-src 'self'");
  });

  test('GET /data returns 403 Forbidden', async ({ request }) => {
    const response = await request.get('http://localhost:3001/data/anything.json');
    expect(response.status()).toBe(403);
  });
});
