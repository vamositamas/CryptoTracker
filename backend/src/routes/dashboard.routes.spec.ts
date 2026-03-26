import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { storageService } from '../services/storage.service';

vi.mock('../services/storage.service', () => ({
  storageService: { read: vi.fn(), write: vi.fn(), appendJsonArray: vi.fn() },
}));

vi.mock('../services/formula.service', () => ({
  formulaService: {
    applyAll: vi.fn((t: unknown) => {
      const raw = t as Record<string, unknown>;
      return {
        ...raw,
        investment: 10000,
        investmentAll: 10000,
        sellValue: 12000,
        cost: 0,
        nettoProfit: raw['nettoProfit'] ?? 2000,
        profitPercent: 20,
        profitRealPercent: 20,
        dailyProfitPercent: 5,
        result: (raw['nettoProfit'] as number) > 0 ? 'Win' : 'Loss',
      };
    }),
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

import dashboardRouter from './dashboard.routes';

const app = express();
app.use(express.json());
app.use('/', dashboardRouter);

const MOCK_RAW_TRADE_WIN = {
  id: 'trade-1',
  createdAt: '2024-01-15T00:00:00.000Z',
  holdingDays: 30,
  type: 'spot',
  position: 'BTC',
  leverage: 1,
  volume: 0.5,
  buyPrice: 30000,
  sellPrice: 35000,
  closeDate: '2024-02-15',
  nettoProfit: 2500,
};

const MOCK_RAW_TRADE_LOSS = {
  id: 'trade-2',
  createdAt: '2024-02-01T00:00:00.000Z',
  holdingDays: 10,
  type: 'futures',
  position: 'ETH',
  leverage: 2,
  volume: 1,
  buyPrice: 2000,
  sellPrice: 1800,
  closeDate: '2024-02-11',
  nettoProfit: -200,
};

const MOCK_RAW_TRADE_MARCH_WIN = {
  id: 'trade-3',
  createdAt: '2024-03-05T00:00:00.000Z',
  holdingDays: 5,
  type: 'spot',
  position: 'SOL',
  leverage: 1,
  volume: 10,
  buyPrice: 100,
  sellPrice: 120,
  closeDate: '2024-03-10',
  nettoProfit: 200,
};

describe('GET /kpis', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns empty state when trader has no trades', async () => {
    vi.mocked(storageService.read).mockRejectedValue(new Error('ENOENT'));

    const res = await request(app).get('/kpis').set('x-trader-username', 'tamas');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalTrades: 0,
      totalNetProfit: 0,
      bestSingleTrade: null,
      winRate: 0,
    });
  });

  it('calculates KPIs correctly for a single winning trade', async () => {
    vi.mocked(storageService.read).mockResolvedValue([MOCK_RAW_TRADE_WIN]);

    const res = await request(app).get('/kpis').set('x-trader-username', 'tamas');
    expect(res.status).toBe(200);
    expect(res.body.totalTrades).toBe(1);
    expect(res.body.totalNetProfit).toBe(2500);
    expect(res.body.bestSingleTrade).toBe(2500);
    expect(res.body.winRate).toBe(1);
  });

  it('calculates KPIs correctly for mixed wins and losses', async () => {
    vi.mocked(storageService.read).mockResolvedValue([
      MOCK_RAW_TRADE_WIN,
      MOCK_RAW_TRADE_LOSS,
      MOCK_RAW_TRADE_MARCH_WIN,
    ]);

    const res = await request(app).get('/kpis').set('x-trader-username', 'tamas');
    expect(res.status).toBe(200);
    expect(res.body.totalTrades).toBe(3);
    expect(res.body.totalNetProfit).toBe(2500); // 2500 + (-200) + 200
    expect(res.body.bestSingleTrade).toBe(2500);
    expect(res.body.winRate).toBeCloseTo(2 / 3, 2); // 2 wins out of 3 trades
  });

  it('handles all-loss portfolio', async () => {
    vi.mocked(storageService.read).mockResolvedValue([
      MOCK_RAW_TRADE_LOSS,
      { ...MOCK_RAW_TRADE_LOSS, id: 'trade-4', nettoProfit: -100 },
    ]);

    const res = await request(app).get('/kpis').set('x-trader-username', 'tamas');
    expect(res.status).toBe(200);
    expect(res.body.winRate).toBe(0);
    expect(res.body.bestSingleTrade).toBe(-100); // best = max([-200, -100])
  });
});

describe('GET /monthly', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns empty array when trader has no trades', async () => {
    vi.mocked(storageService.read).mockRejectedValue(new Error('ENOENT'));

    const res = await request(app).get('/monthly').set('x-trader-username', 'tamas');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('aggregates trades by month with correct counts and win rates', async () => {
    vi.mocked(storageService.read).mockResolvedValue([
      MOCK_RAW_TRADE_WIN, // Feb 2024
      MOCK_RAW_TRADE_LOSS, // Feb 2024
      MOCK_RAW_TRADE_MARCH_WIN, // March 2024
    ]);

    const res = await request(app).get('/monthly').set('x-trader-username', 'tamas');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    const feb = res.body.find((r: { month: number; year: number }) => r.year === 2024 && r.month === 2);
    expect(feb).toBeDefined();
    expect(feb.tradeCount).toBe(2);
    expect(feb.netProfit).toBe(2300); // 2500 + (-200)
    expect(feb.winRate).toBe(0.5); // 1 win out of 2

    const march = res.body.find((r: { month: number; year: number }) => r.year === 2024 && r.month === 3);
    expect(march).toBeDefined();
    expect(march.tradeCount).toBe(1);
    expect(march.netProfit).toBe(200);
    expect(march.winRate).toBe(1); // 1 win out of 1
  });

  it('returns rows sorted chronologically ascending', async () => {
    vi.mocked(storageService.read).mockResolvedValue([
      { ...MOCK_RAW_TRADE_WIN, closeDate: '2024-06-15' },
      { ...MOCK_RAW_TRADE_WIN, closeDate: '2024-01-15' },
      { ...MOCK_RAW_TRADE_WIN, closeDate: '2024-03-15' },
    ]);

    const res = await request(app).get('/monthly').set('x-trader-username', 'tamas');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);

    expect(res.body[0]).toMatchObject({ year: 2024, month: 1 });
    expect(res.body[1]).toMatchObject({ year: 2024, month: 3 });
    expect(res.body[2]).toMatchObject({ year: 2024, month: 6 });
  });

  it('aggregates trades across multiple years', async () => {
    vi.mocked(storageService.read).mockResolvedValue([
      { ...MOCK_RAW_TRADE_WIN, closeDate: '2023-12-15', nettoProfit: 1000 },
      { ...MOCK_RAW_TRADE_WIN, closeDate: '2024-01-15', nettoProfit: 2000 },
    ]);

    const res = await request(app).get('/monthly').set('x-trader-username', 'tamas');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    expect(res.body[0]).toMatchObject({ year: 2023, month: 12, tradeCount: 1, netProfit: 1000 });
    expect(res.body[1]).toMatchObject({ year: 2024, month: 1, tradeCount: 1, netProfit: 2000 });
  });
});
