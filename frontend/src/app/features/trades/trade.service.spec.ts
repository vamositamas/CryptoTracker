import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TradeService } from './trade.service';
import { TradeApiService } from './trade-api.service';
import { EnrichedTrade } from '../../core/models/trade.model';

const BASE_TRADE: EnrichedTrade = {
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

const DTO = {
  type: 'spot',
  position: 'BTC',
  leverage: 1,
  volume: 0.5,
  buyPrice: 30000,
  sellPrice: 35000,
  closeDate: '2024-06-01',
};

describe('TradeService', () => {
  let service: TradeService;
  let apiMock: {
    getTrades: ReturnType<typeof vi.fn>;
    createTrade: ReturnType<typeof vi.fn>;
    updateTrade: ReturnType<typeof vi.fn>;
    deleteTrade: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    apiMock = {
      getTrades: vi.fn().mockResolvedValue([BASE_TRADE]),
      createTrade: vi.fn().mockResolvedValue(BASE_TRADE),
      updateTrade: vi.fn().mockResolvedValue(BASE_TRADE),
      deleteTrade: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        TradeService,
        { provide: TradeApiService, useValue: apiMock },
      ],
    });

    service = TestBed.inject(TradeService);
  });

  afterEach(() => vi.restoreAllMocks());

  describe('loadTrades', () => {
    it('populates trades signal on success', async () => {
      await service.loadTrades();
      expect(service.trades()).toHaveLength(1);
      expect(service.trades()[0].id).toBe('trade-1');
    });

    it('sets loading to false after success', async () => {
      await service.loadTrades();
      expect(service.loading()).toBe(false);
    });

    it('clears error on success', async () => {
      await service.loadTrades();
      expect(service.error()).toBeNull();
    });

    it('sets error signal on API failure', async () => {
      apiMock.getTrades.mockRejectedValue(new Error('network error'));
      await service.loadTrades();
      expect(service.error()).toBeTruthy();
    });

    it('sets loading to false even after failure', async () => {
      apiMock.getTrades.mockRejectedValue(new Error('fail'));
      await service.loadTrades();
      expect(service.loading()).toBe(false);
    });
  });

  describe('createTrade', () => {
    it('replaces the optimistic record with the server trade on success', async () => {
      await service.createTrade(DTO);
      expect(service.trades()).toHaveLength(1);
      // Should be the real server record (nettoProfit = 2500), not optimistic (nettoProfit = 0)
      expect(service.trades()[0].nettoProfit).toBe(2500);
    });

    it('prepends the new trade to the list', async () => {
      // Pre-load an existing trade
      service.trades.set([{ ...BASE_TRADE, id: 'existing-trade' }]);
      await service.createTrade(DTO);
      expect(service.trades()).toHaveLength(2);
      // Server trade should be first (prepended)
      expect(service.trades()[0].id).toBe('trade-1');
    });

    it('rolls back optimistic trade on API failure', async () => {
      service.trades.set([{ ...BASE_TRADE, id: 'existing-trade' }]);
      apiMock.createTrade.mockRejectedValue(new Error('server down'));
      await expect(service.createTrade(DTO)).rejects.toThrow('server down');
      // Should have rolled back to 1 trade
      expect(service.trades()).toHaveLength(1);
      expect(service.trades()[0].id).toBe('existing-trade');
    });

    it('marks the new trade with flashNew: true', async () => {
      await service.createTrade(DTO);
      expect(service.trades()[0].flashNew).toBe(true);
    });
  });

  describe('updateTrade', () => {
    const UPDATE_DTO = {
      type: 'futures',
      position: 'ETH',
      leverage: 2,
      volume: 1,
      buyPrice: 2000,
      sellPrice: 2200,
      closeDate: '2024-06-02',
    };

    it('optimistically updates the row and then replaces it with server response', async () => {
      service.trades.set([BASE_TRADE]);
      apiMock.updateTrade.mockResolvedValue({ ...BASE_TRADE, ...UPDATE_DTO, nettoProfit: 500 });

      await service.updateTrade('trade-1', UPDATE_DTO);

      expect(apiMock.updateTrade).toHaveBeenCalledWith('trade-1', UPDATE_DTO);
      expect(service.trades()[0].position).toBe('ETH');
      expect(service.trades()[0].nettoProfit).toBe(500);
    });

    it('rolls back to snapshot on update failure', async () => {
      service.trades.set([BASE_TRADE]);
      apiMock.updateTrade.mockRejectedValue(new Error('update failed'));

      await expect(service.updateTrade('trade-1', UPDATE_DTO)).rejects.toThrow('update failed');
      expect(service.trades()[0].position).toBe('BTC');
    });
  });

  describe('deleteTrade', () => {
    it('optimistically removes trade on delete success', async () => {
      service.trades.set([BASE_TRADE]);

      await service.deleteTrade('trade-1');

      expect(apiMock.deleteTrade).toHaveBeenCalledWith('trade-1');
      expect(service.trades()).toHaveLength(0);
    });

    it('restores removed trade on delete failure', async () => {
      service.trades.set([BASE_TRADE]);
      apiMock.deleteTrade.mockRejectedValue(new Error('delete failed'));

      await expect(service.deleteTrade('trade-1')).rejects.toThrow('delete failed');

      expect(service.trades()).toHaveLength(1);
      expect(service.trades()[0].id).toBe('trade-1');
    });
  });
});
