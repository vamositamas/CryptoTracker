import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TradeApiService, TradeApiError } from './trade-api.service';
import { EnrichedTrade } from '../../core/models/trade.model';

const ENRICHED: EnrichedTrade = {
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
  investment: 15000,
  investmentAll: 15000,
  sellValue: 17500,
  cost: 0,
  nettoProfit: 2500,
  profitPercent: 16.67,
  profitRealPercent: 16.67,
  dailyProfitPercent: 16.67,
  result: 'Win',
};

describe('TradeApiService', () => {
  let service: TradeApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TradeApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    vi.restoreAllMocks();
  });

  describe('getTrades', () => {
    it('returns the trades array from the API envelope', async () => {
      const promise = service.getTrades();
      httpTesting.expectOne('/api/v1/trades').flush({ trades: [ENRICHED], total: 1 });
      const trades = await promise;
      expect(trades).toHaveLength(1);
      expect(trades[0].id).toBe('trade-1');
    });

    it('returns empty array when API returns empty trades list', async () => {
      const promise = service.getTrades();
      httpTesting.expectOne('/api/v1/trades').flush({ trades: [], total: 0 });
      const trades = await promise;
      expect(trades).toHaveLength(0);
    });
  });

  describe('createTrade', () => {
    const dto = {
      type: 'spot',
      position: 'BTC',
      leverage: 1,
      volume: 0.5,
      buyPrice: 30000,
      sellPrice: 35000,
      closeDate: '2024-06-01',
    };

    it('POSTs to /api/v1/trades and returns the enriched trade', async () => {
      const promise = service.createTrade(dto);
      const req = httpTesting.expectOne('/api/v1/trades');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(ENRICHED, { status: 201, statusText: 'Created' });
      const trade = await promise;
      expect(trade.result).toBe('Win');
    });

    it('throws TradeApiError with code and field on 400', async () => {
      const apiError = { code: 'VALIDATION_ERROR', message: 'Type is required', field: 'type' };
      const promise = service.createTrade(dto);
      httpTesting
        .expectOne('/api/v1/trades')
        .flush({ error: apiError }, { status: 400, statusText: 'Bad Request' });
      await expect(promise).rejects.toBeInstanceOf(TradeApiError);
    });

    it('TradeApiError carries apiError and status', async () => {
      const apiError = { code: 'VALIDATION_ERROR', message: 'Position required', field: 'position' };
      const promise = service.createTrade(dto);
      httpTesting
        .expectOne('/api/v1/trades')
        .flush({ error: apiError }, { status: 400, statusText: 'Bad Request' });
      let caught: TradeApiError | null = null;
      try {
        await promise;
      } catch (e) {
        caught = e as TradeApiError;
      }
      expect(caught?.status).toBe(400);
      expect(caught?.apiError.field).toBe('position');
    });
  });

  describe('updateTrade', () => {
    const dto = {
      type: 'futures',
      position: 'ETH',
      leverage: 2,
      volume: 1,
      buyPrice: 2000,
      sellPrice: 2200,
      closeDate: '2024-06-02',
    };

    it('PUTs to /api/v1/trades/:id and returns updated enriched trade', async () => {
      const promise = service.updateTrade('trade-1', dto);
      const req = httpTesting.expectOne('/api/v1/trades/trade-1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      req.flush({ ...ENRICHED, ...dto }, { status: 200, statusText: 'OK' });

      const trade = await promise;
      expect(trade.position).toBe('ETH');
      expect(trade.type).toBe('futures');
    });

    it('throws TradeApiError on 400 with field details', async () => {
      const apiError = { code: 'VALIDATION_ERROR', message: 'Sell price must be > 0', field: 'sellPrice' };
      const promise = service.updateTrade('trade-1', dto);
      httpTesting
        .expectOne('/api/v1/trades/trade-1')
        .flush({ error: apiError }, { status: 400, statusText: 'Bad Request' });

      await expect(promise).rejects.toBeInstanceOf(TradeApiError);
    });
  });

  describe('deleteTrade', () => {
    it('DELETEs /api/v1/trades/:id and resolves on success', async () => {
      const promise = service.deleteTrade('trade-1');
      const req = httpTesting.expectOne('/api/v1/trades/trade-1');
      expect(req.request.method).toBe('DELETE');
      req.flush({ deleted: true, id: 'trade-1' }, { status: 200, statusText: 'OK' });
      await expect(promise).resolves.toBeUndefined();
    });

    it('throws TradeApiError on 403', async () => {
      const apiError = { code: 'FORBIDDEN', message: 'You cannot delete another trader\'s trade' };
      const promise = service.deleteTrade('trade-1');
      httpTesting
        .expectOne('/api/v1/trades/trade-1')
        .flush({ error: apiError }, { status: 403, statusText: 'Forbidden' });
      await expect(promise).rejects.toBeInstanceOf(TradeApiError);
    });
  });

  describe('importTrades', () => {
    const dto = {
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
    };

    it('POSTs the trades array to /api/v1/trades/import', async () => {
      const promise = service.importTrades([dto]);
      const req = httpTesting.expectOne('/api/v1/trades/import');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ trades: [dto] });
      req.flush({ imported: 1, trades: [ENRICHED] }, { status: 201, statusText: 'Created' });

      await expect(promise).resolves.toEqual({ imported: 1, trades: [ENRICHED] });
    });
  });

  describe('exportTrades', () => {
    it('GETs /api/v1/trades/export and returns blob + filename', async () => {
      const promise = service.exportTrades();
      const req = httpTesting.expectOne('/api/v1/trades/export');
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');

      const headers = { 'content-disposition': 'attachment; filename="trades-backup-tamas-2026-04-10.json"' };
      req.flush(new Blob(['[]'], { type: 'application/json' }), { status: 200, statusText: 'OK', headers });

      const payload = await promise;
      expect(payload.fileName).toBe('trades-backup-tamas-2026-04-10.json');
      expect(payload.blob).toBeInstanceOf(Blob);
    });
  });
});
