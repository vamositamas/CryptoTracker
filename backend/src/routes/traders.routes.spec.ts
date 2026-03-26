import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { storageService } from '../services/storage.service';

vi.mock('../services/storage.service', () => ({
  storageService: { read: vi.fn() },
}));

import tradersRouter from './traders.routes';

const app = express();
app.use(express.json());
app.use('/', tradersRouter);

describe('GET /api/v1/traders', () => {
  beforeEach(() => {
    vi.mocked(storageService.read).mockResolvedValue(['tamas', 'mark']);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a string array of traders', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(['tamas', 'mark']);
  });
});
