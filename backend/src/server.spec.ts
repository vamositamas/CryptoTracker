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

