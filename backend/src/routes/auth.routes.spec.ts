import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../middleware/auth.middleware', () => ({
  authMiddleware: vi.fn((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !String(authHeader).startsWith('Bearer ')) {
      res.status(401).json({ error: { code: 'MISSING_TOKEN', message: 'Authorization token required' } });
      return;
    }
    (req as unknown as Record<string, unknown>)['user'] = {
      id: 'u1',
      email: 'user@example.com',
      username: 'user1',
      groupId: 'g1',
      permissions: ['trades:read'],
    };
    next();
  }),
}));

vi.mock('../services/auth.service', () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
    getUserById: vi.fn(),
    updateUser: vi.fn(),
    refreshTokenForUserId: vi.fn(),
  },
}));

import authRouter from './auth.routes';
import { authService } from '../services/auth.service';

const app = express();
app.use(express.json());
app.use('/', authRouter);

describe('auth routes self-profile endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /me returns 401 without token', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('GET /me returns current user with token', async () => {
    vi.mocked(authService.getUserById).mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      username: 'user1',
      groupId: 'g1',
      active: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const res = await request(app).get('/me').set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 'u1', email: 'user@example.com', username: 'user1' });
    expect(authService.getUserById).toHaveBeenCalledWith('u1');
  });

  it('PUT /me updates own profile and returns refreshed token', async () => {
    vi.mocked(authService.updateUser).mockResolvedValue({
      id: 'u1',
      email: 'new@example.com',
      username: 'new-user',
      groupId: 'g1',
      active: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(authService.refreshTokenForUserId).mockResolvedValue('new-token');

    const res = await request(app)
      .put('/me')
      .set('Authorization', 'Bearer test-token')
      .send({ email: 'NEW@Example.com', username: 'new-user', password: '12345678' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('new-token');
    expect(authService.updateUser).toHaveBeenCalledWith('u1', {
      email: 'new@example.com',
      username: 'new-user',
      password: '12345678',
    });
    expect(authService.refreshTokenForUserId).toHaveBeenCalledWith('u1');
  });

  it('PUT /me validates password length', async () => {
    const res = await request(app)
      .put('/me')
      .set('Authorization', 'Bearer test-token')
      .send({ password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('password');
    expect(authService.updateUser).not.toHaveBeenCalled();
  });
});
