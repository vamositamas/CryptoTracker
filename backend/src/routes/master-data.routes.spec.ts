import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { storageService } from '../services/storage.service';

vi.mock('../middleware/auth.middleware', () => ({
  authMiddleware: vi.fn((req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as unknown as Record<string, unknown>)['user'] = { id: 'u1', email: 't@t.com', username: 'tamas', groupId: 'superadmin-group', permissions: ['users:manage', 'trades:read', 'trades:write', 'trades:delete', 'audit:read', 'dashboard:read', 'master-data:manage', 'formulas:manage'] };
    next();
  }),
}));

vi.mock('../services/storage.service', () => ({
  storageService: { read: vi.fn(), write: vi.fn(), appendJsonArray: vi.fn() },
}));

import masterDataRouter from './master-data.routes';

const app = express();
app.use(express.json());
app.use('/', masterDataRouter);

const TOKEN_ENTRIES = [
  { id: 'BTC', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ETH', symbol: 'ETH', name: 'Ethereum' },
];

const TRADE_TYPE_ENTRIES = [
  { id: 'spot', name: 'Spot' },
  { id: 'futures', name: 'Futures' },
];

describe('GET /:type', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the full token list for a supported type', async () => {
    vi.mocked(storageService.read).mockResolvedValue(TOKEN_ENTRIES);

    const res = await request(app).get('/tokens');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tokens: TOKEN_ENTRIES });
  });

  it('returns an empty list when the backing file is missing', async () => {
    vi.mocked(storageService.read).mockRejectedValue(new Error('ENOENT'));

    const res = await request(app).get('/positions');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ positions: [] });
  });

  it('returns 400 for an invalid type', async () => {
    const res = await request(app).get('/unknown');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_MASTER_DATA_TYPE');
  });
});

describe('POST /:type', () => {
  beforeEach(() => {
    vi.mocked(storageService.appendJsonArray).mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns 409 when a duplicate name is submitted', async () => {
    vi.mocked(storageService.read).mockResolvedValue(TRADE_TYPE_ENTRIES);

    const res = await request(app).post('/trade-types').send({ name: 'spot' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'spot already exists in trade-types',
        field: 'name',
      },
    });
  });

  it('appends a unique trade type and returns 201', async () => {
    vi.mocked(storageService.read).mockResolvedValue(TRADE_TYPE_ENTRIES);

    const res = await request(app).post('/trade-types').send({ name: 'Scalp' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 'scalp', name: 'Scalp' });
    expect(storageService.appendJsonArray).toHaveBeenCalledWith(
      'shared/trade-types.json',
      { id: 'scalp', name: 'Scalp' },
    );
  });

  it('creates token entries with uppercase id and symbol', async () => {
    vi.mocked(storageService.read).mockResolvedValue(TOKEN_ENTRIES);

    const res = await request(app).post('/tokens').send({ name: 'Sei' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 'SEI', symbol: 'SEI', name: 'Sei' });
  });

  it('treats token symbols as duplicates for seeded entries', async () => {
    vi.mocked(storageService.read).mockResolvedValue(TOKEN_ENTRIES);

    const res = await request(app).post('/tokens').send({ name: 'BTC' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/positions').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe('name');
  });
});

describe('PUT /:type/:id', () => {
  beforeEach(() => {
    vi.mocked(storageService.write).mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('updates an existing trade type and rewrites the file', async () => {
    vi.mocked(storageService.read).mockResolvedValue(TRADE_TYPE_ENTRIES);

    const res = await request(app).put('/trade-types/spot').send({ name: 'Spot Trading' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'spot', name: 'Spot Trading' });
    expect(storageService.write).toHaveBeenCalledWith(
      'shared/trade-types.json',
      [
        { id: 'spot', name: 'Spot Trading' },
        { id: 'futures', name: 'Futures' },
      ],
    );
  });

  it('returns 409 when updating to a duplicate name', async () => {
    vi.mocked(storageService.read).mockResolvedValue(TRADE_TYPE_ENTRIES);

    const res = await request(app).put('/trade-types/spot').send({ name: 'Futures' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
  });

  it('returns 404 when the entry does not exist', async () => {
    vi.mocked(storageService.read).mockResolvedValue(TRADE_TYPE_ENTRIES);

    const res = await request(app).put('/trade-types/missing').send({ name: 'Swing' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('DELETE /:type/:id', () => {
  beforeEach(() => {
    vi.mocked(storageService.write).mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('deletes an existing entry and rewrites the file', async () => {
    vi.mocked(storageService.read).mockResolvedValue(TRADE_TYPE_ENTRIES);

    const res = await request(app).delete('/trade-types/futures');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
    expect(storageService.write).toHaveBeenCalledWith('shared/trade-types.json', [{ id: 'spot', name: 'Spot' }]);
  });

  it('returns 404 when deleting a non-existent entry', async () => {
    vi.mocked(storageService.read).mockResolvedValue(TRADE_TYPE_ENTRIES);

    const res = await request(app).delete('/trade-types/missing');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});