import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TradesComponent } from './trades.component';
import { TradeService, TradeWithMeta } from './trade.service';

const TRADE_A: TradeWithMeta = {
  id: 'a',
  createdAt: '2024-01-01T00:00:00.000Z',
  holdingDays: 1,
  type: 'spot',
  position: 'BTC',
  leverage: 1,
  volume: 0.5,
  buyPrice: 30000,
  sellPrice: 32000,
  closeDate: '2024-06-01',
  investment: 15000,
  investmentAll: 15000,
  sellValue: 16000,
  cost: 0,
  nettoProfit: 1000,
  profitPercent: 6.67,
  profitRealPercent: 6.67,
  dailyProfitPercent: 0.2,
  result: 'Win',
};

const TRADE_B: TradeWithMeta = {
  ...TRADE_A,
  id: 'b',
  position: 'ETH',
  type: 'futures',
  closeDate: '2024-05-20',
};

const TRADE_C: TradeWithMeta = {
  ...TRADE_A,
  id: 'c',
  position: 'SOL',
  type: 'spot',
  closeDate: '2024-04-05',
};

describe('TradesComponent', () => {
  let tradesSignal: ReturnType<typeof signal<TradeWithMeta[]>>;
  let loadingSignal: ReturnType<typeof signal<boolean>>;
  let tradeServiceMock: {
    trades: ReturnType<typeof signal<TradeWithMeta[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    loadTrades: ReturnType<typeof vi.fn>;
    updateTrade: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    tradesSignal = signal<TradeWithMeta[]>([]);
    loadingSignal = signal(false);

    tradeServiceMock = {
      trades: tradesSignal,
      loading: loadingSignal,
      loadTrades: vi.fn().mockResolvedValue(undefined),
      updateTrade: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [TradesComponent],
      providers: [{ provide: TradeService, useValue: tradeServiceMock }],
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it('filters by position (case-insensitive partial match)', async () => {
    const fixture = TestBed.createComponent(TradesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    tradesSignal.set([TRADE_A, TRADE_B, TRADE_C]);
    fixture.componentInstance.onFilterChange({
      position: 'bt',
      type: '',
      dateFrom: '',
      dateTo: '',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.filteredTrades().map((t) => t.id)).toEqual(['a']);
  });

  it('filters by trade type', async () => {
    const fixture = TestBed.createComponent(TradesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    tradesSignal.set([TRADE_A, TRADE_B, TRADE_C]);
    fixture.componentInstance.onFilterChange({
      position: '',
      type: 'spot',
      dateFrom: '',
      dateTo: '',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.filteredTrades().map((t) => t.id)).toEqual(['a', 'c']);
  });

  it('filters by date range (inclusive)', async () => {
    const fixture = TestBed.createComponent(TradesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    tradesSignal.set([TRADE_A, TRADE_B, TRADE_C]);
    fixture.componentInstance.onFilterChange({
      position: '',
      type: '',
      dateFrom: '2024-05-01',
      dateTo: '2024-06-01',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.filteredTrades().map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('combines multiple filters with AND logic', async () => {
    const fixture = TestBed.createComponent(TradesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    tradesSignal.set([TRADE_A, TRADE_B, TRADE_C]);
    fixture.componentInstance.onFilterChange({
      position: 'et',
      type: 'fut',
      dateFrom: '2024-05-01',
      dateTo: '2024-05-31',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.filteredTrades().map((t) => t.id)).toEqual(['b']);
  });

  it('shows no-match empty state when active filters produce zero trades', async () => {
    const fixture = TestBed.createComponent(TradesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    tradesSignal.set([TRADE_A, TRADE_B]);
    fixture.componentInstance.onFilterChange({
      position: 'xrp',
      type: '',
      dateFrom: '',
      dateTo: '',
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No trades match your filters');
  });

  it('clear filters resets list to all trades', async () => {
    const fixture = TestBed.createComponent(TradesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    tradesSignal.set([TRADE_A, TRADE_B, TRADE_C]);
    fixture.componentInstance.onFilterChange({
      position: 'btc',
      type: '',
      dateFrom: '',
      dateTo: '',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.filteredTrades().map((t) => t.id)).toEqual(['a']);

    fixture.componentInstance.onClearFilters();
    fixture.detectChanges();

    expect(fixture.componentInstance.filteredTrades().map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect(fixture.componentInstance.hasActiveFilters()).toBe(false);
  });
});
