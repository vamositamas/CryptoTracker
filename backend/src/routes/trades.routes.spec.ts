import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { storageService } from '../services/storage.service';
import * as fs from 'fs/promises';

vi.mock('../services/storage.service', () => ({
  storageService: { read: vi.fn(), write: vi.fn(), appendJsonArray: vi.fn() },
}));

vi.mock('../services/formula.service', () => ({
  formulaService: {
    applyAll: vi.fn((t: unknown) => ({ ...(t as object), nettoProfit: 2500, result: 'Win', profitPercent: 16.67 })),
  },
  stripCalculatedFields: vi.fn((body: unknown) => body),
  CALCULATED_FIELDS: [],
}));

vi.mock('../middleware/trader.middleware', () => ({
  traderMiddleware: vi.fn((req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as unknown as Record<string, unknown>)['trader'] = 'tamas';
    next();
  }),
}));

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  readFile: vi.fn().mockResolvedValue('[]'),
}));

// Import AFTER mocks are declared
import tradesRouter from './trades.routes';

const app = express();
app.use(express.json());
app.use('/', tradesRouter);

const MOCK_RAW_TRADE = {
  id: 'trade-1',
  createdAt: '2024-01-01T00:00:00.000Z',
  holdingDays: 1,
  type: 'spot',
  position: 'BTC',
  leverage: 1,
  volume: 0.5,
  buyPrice: 30000,
  sellPrice: 35000,
  closeDate: '2024-06-01',
};

describe('GET /', () => {
  beforeEach(() => {
    vi.mocked(storageService.read).mockResolvedValue([MOCK_RAW_TRADE]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns { trades, total } with enriched trades', async () => {
    const res = await request(app).get('/').set('x-trader-username', 'tamas');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.trades)).toBe(true);
    expect(res.body.total).toBe(1);
    expect(res.body.trades[0]).toMatchObject({ type: 'spot', position: 'BTC', result: 'Win' });
  });

  it('returns empty trades when storage throws ENOENT', async () => {
    vi.mocked(storageService.read).mockRejectedValue(new Error('ENOENT: no such file'));
    const res = await request(app).get('/').set('x-trader-username', 'tamas');
    expect(res.status).toBe(200);
    expect(res.body.trades).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });
});

describe('POST /', () => {
  const validBody = {
    type: 'spot',
    position: 'BTC',
    leverage: 1,
    volume: 0.5,
    buyPrice: 30000,
    sellPrice: 35000,
    closeDate: '2024-06-01',
  };

  beforeEach(() => {
    vi.mocked(storageService.read).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(storageService.write).mockResolvedValue(undefined);
    vi.mocked(storageService.appendJsonArray).mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns 201 with enriched trade for valid body', async () => {
    const res = await request(app).post('/').set('x-trader-username', 'tamas').send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.result).toBe('Win');
  });

  it('returns 400 VALIDATION_ERROR when type is missing', async () => {
    const { type: _, ...rest } = validBody;
    const res = await request(app).post('/').set('x-trader-username', 'tamas').send(rest);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe('type');
  });

  it('returns 400 when buyPrice is 0', async () => {
    const res = await request(app).post('/').set('x-trader-username', 'tamas').send({ ...validBody, buyPrice: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('buyPrice');
  });

  it('returns 400 when closeDate is invalid', async () => {
    const res = await request(app)
      .post('/')
      .set('x-trader-username', 'tamas')
      .send({ ...validBody, closeDate: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('closeDate');
  });

  it('writes the new trade to storage', async () => {
    await request(app).post('/').set('x-trader-username', 'tamas').send(validBody);
    expect(storageService.write).toHaveBeenCalledWith(
      'traders/tamas/trades.json',
      expect.arrayContaining([
        expect.objectContaining({ type: 'spot', position: 'BTC', leverage: 1 }),
      ]),
    );
  });

  it('sets holdingDays to at least 1', async () => {
    await request(app)
      .post('/')
      .set('x-trader-username', 'tamas')
      .send({ ...validBody, closeDate: new Date().toISOString().split('T')[0] }); // same-day close

    const writeCall = vi.mocked(storageService.write).mock.calls[0];
    const trades = writeCall[1] as Array<{ holdingDays: number }>;
    expect(trades[0].holdingDays).toBeGreaterThanOrEqual(1);
  });
});

describe('POST /import', () => {
  const importBody = {
    trades: [
      {
        type: 'scalp',
        token: 'DOT',
        position: 'DOT',
        tradePosition: 'short',
        brokerCost: 0.06,
        leverage: 10,
        volume: 47.8,
        buyPrice: 2.092,
        sellPrice: 2.079,
        closeDate: '2026-01-09',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageService.read).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(storageService.write).mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('imports all rows and returns enriched trades', async () => {
    const res = await request(app)
      .post('/import')
      .set('x-trader-username', 'tamas')
      .send(importBody);

    expect(res.status).toBe(201);
    expect(res.body.imported).toBe(1);
    expect(res.body.trades[0]).toMatchObject({ position: 'DOT', tradePosition: 'short' });
  });

  it('rejects an empty trades payload', async () => {
    const res = await request(app)
      .post('/import')
      .set('x-trader-username', 'tamas')
      .send({ trades: [] });

    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('trades');
  });

  it('returns row-specific validation errors without writing partial imports', async () => {
    const res = await request(app)
      .post('/import')
      .set('x-trader-username', 'tamas')
      .send({
        trades: [
          importBody.trades[0],
          { ...importBody.trades[0], buyPrice: 0 },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('buyPrice');
    expect(res.body.error.message).toContain('Row 3');
    expect(storageService.write).not.toHaveBeenCalled();
  });
});

describe('PUT /:id', () => {
  const updateBody = {
    type: 'futures',
    position: 'ETH',
    leverage: 2,
    volume: 1,
    buyPrice: 2000,
    sellPrice: 2200,
    closeDate: '2024-06-02',
  };

  beforeEach(() => {
    vi.mocked(storageService.write).mockResolvedValue(undefined);
    vi.mocked(storageService.appendJsonArray).mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns 200 with enriched trade for valid update', async () => {
    vi.mocked(storageService.read).mockResolvedValue([MOCK_RAW_TRADE]);

    const res = await request(app)
      .put('/trade-1')
      .set('x-trader-username', 'tamas')
      .send(updateBody);

    expect(res.status).toBe(200);
    expect(res.body.position).toBe('ETH');
    expect(res.body.result).toBe('Win');
  });

  it('returns 404 when trade does not exist', async () => {
    vi.mocked(storageService.read).mockResolvedValue([]);
    vi.mocked(fs.readdir).mockResolvedValue([] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

    const res = await request(app)
      .put('/missing-id')
      .set('x-trader-username', 'tamas')
      .send(updateBody);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 403 when trade belongs to another trader', async () => {
    vi.mocked(storageService.read).mockResolvedValue([]);
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'other-trader', isDirectory: () => true },
    ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([{ ...MOCK_RAW_TRADE, id: 'other-id' }]));

    const res = await request(app)
      .put('/other-id')
      .set('x-trader-username', 'tamas')
      .send(updateBody);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 VALIDATION_ERROR when update payload is invalid', async () => {
    vi.mocked(storageService.read).mockResolvedValue([MOCK_RAW_TRADE]);

    const res = await request(app)
      .put('/trade-1')
      .set('x-trader-username', 'tamas')
      .send({ ...updateBody, sellPrice: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe('sellPrice');
  });

  it('writes updated raw trade to storage preserving id and createdAt', async () => {
    vi.mocked(storageService.read).mockResolvedValue([MOCK_RAW_TRADE]);

    await request(app)
      .put('/trade-1')
      .set('x-trader-username', 'tamas')
      .send(updateBody);

    expect(storageService.write).toHaveBeenCalledWith(
      'traders/tamas/trades.json',
      expect.arrayContaining([
        expect.objectContaining({
          id: 'trade-1',
          createdAt: '2024-01-01T00:00:00.000Z',
          position: 'ETH',
          type: 'futures',
          leverage: 2,
        }),
      ]),
    );
  });
});

describe('DELETE /:id', () => {
  beforeEach(() => {
    vi.mocked(storageService.write).mockResolvedValue(undefined);
    vi.mocked(storageService.appendJsonArray).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue([] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
    vi.mocked(fs.readFile).mockResolvedValue('[]');
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns 200 and removes trade from storage for valid delete', async () => {
    vi.mocked(storageService.read).mockResolvedValue([MOCK_RAW_TRADE]);

    const res = await request(app)
      .delete('/trade-1')
      .set('x-trader-username', 'tamas');

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
    expect(storageService.write).toHaveBeenCalledWith('traders/tamas/trades.json', []);
  });

  it('returns 404 when trade is not found anywhere', async () => {
    vi.mocked(storageService.read).mockResolvedValue([]);

    const res = await request(app)
      .delete('/missing-id')
      .set('x-trader-username', 'tamas');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 403 when trade belongs to another trader', async () => {
    vi.mocked(storageService.read).mockResolvedValue([]);
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'other-trader', isDirectory: () => true },
    ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([{ ...MOCK_RAW_TRADE, id: 'foreign-id' }]));

    const res = await request(app)
      .delete('/foreign-id')
      .set('x-trader-username', 'tamas');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
