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
});
