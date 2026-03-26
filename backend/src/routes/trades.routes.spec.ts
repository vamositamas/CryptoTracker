import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { storageService } from '../services/storage.service';

vi.mock('../services/storage.service', () => ({
  storageService: { read: vi.fn(), write: vi.fn() },
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
