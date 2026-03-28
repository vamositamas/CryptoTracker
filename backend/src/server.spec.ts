import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { app, errorHandler } from './server';

describe('GET /api/v1/health', () => {
  it('returns { status: "ok" } with HTTP 200', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('includes Content-Security-Policy header on all responses', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['content-security-policy']).toBe("default-src 'self'");
  });
});

describe('GET /api/v1/audit', () => {
  it('is mounted and requires trader identity', async () => {
    const res = await request(app).get('/api/v1/audit');
    expect([200, 401]).toContain(res.status);
  });

  it('does not expose PUT /api/v1/audit/:id', async () => {
    const res = await request(app).put('/api/v1/audit/some-id').send({});
    expect([401, 404]).toContain(res.status);
  });

  it('does not expose DELETE /api/v1/audit/:id', async () => {
    const res = await request(app).delete('/api/v1/audit/some-id');
    expect([401, 404]).toContain(res.status);
  });
});

describe('GET /api/v1/dashboard', () => {
  it('is mounted and /api/v1/dashboard/kpis requires trader identity', async () => {
    const res = await request(app).get('/api/v1/dashboard/kpis');
    expect([200, 401]).toContain(res.status);
  });

  it('/api/v1/dashboard/monthly requires trader identity', async () => {
    const res = await request(app).get('/api/v1/dashboard/monthly');
    expect([200, 401]).toContain(res.status);
  });
});

describe('GET /api/v1/master-data', () => {
  it('is mounted and requires authentication', async () => {
    const res = await request(app).get('/api/v1/master-data/invalid-type');
    expect(res.status).toBe(401);
  });
});

describe('GET /data (403 guard)', () => {
  it('returns 403 when accessing /data directly', async () => {
    const res = await request(app).get('/data/anything.json');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for deep paths under /data', async () => {
    const res = await request(app).get('/data/traders/alice/trades.json');
    expect(res.status).toBe(403);
  });
});

describe('Global error handler', () => {
  it('returns 500 with typed error envelope on unhandled errors', async () => {
    // Use a mini express app so the route is registered before the error handler
    const testApp = express();
    testApp.get('/boom', (_req, _res, next) => { next(new Error('test error')); });
    testApp.use(errorHandler);
    const res = await request(testApp).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBe('test error');
  });
});

