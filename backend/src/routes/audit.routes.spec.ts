import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { storageService } from '../services/storage.service';

vi.mock('../services/storage.service', () => ({
  storageService: { read: vi.fn(), write: vi.fn(), appendJsonArray: vi.fn() },
}));

vi.mock('../middleware/auth.middleware', () => ({
  authMiddleware: vi.fn((req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as unknown as Record<string, unknown>)['user'] = { id: 'u1', email: 't@t.com', username: 'tamas', groupId: 'superadmin-group', permissions: ['users:manage', 'trades:read', 'trades:write', 'trades:delete', 'audit:read', 'dashboard:read', 'master-data:manage', 'formulas:manage'] };
    next();
  }),
}));

import auditRouter from './audit.routes';

const app = express();
app.use(express.json());
app.use('/', auditRouter);

describe('GET /', () => {
  beforeEach(() => {
    vi.mocked(storageService.read).mockResolvedValue([
      {
        id: 'a1',
        timestamp: '2026-03-26T00:00:00.000Z',
        action: 'CREATE',
        traderId: 'tamas',
        entityId: 'trade-1',
        previousValue: null,
        newValue: { id: 'trade-1' },
      },
    ]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns audit entries and total for current trader', async () => {
    const res = await request(app).get('/').set('x-trader-username', 'tamas');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.entries[0].entityId).toBe('trade-1');
    expect(storageService.read).toHaveBeenCalledWith('traders/tamas/audit-log.json');
  });

  it('returns empty list when audit log does not exist', async () => {
    vi.mocked(storageService.read).mockRejectedValue(new Error('ENOENT'));

    const res = await request(app).get('/').set('x-trader-username', 'tamas');
    expect(res.status).toBe(200);
    expect(res.body.entries).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});
