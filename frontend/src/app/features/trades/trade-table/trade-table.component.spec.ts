import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TradeTableComponent } from './trade-table.component';
import { TradeWithMeta } from '../trade.service';

const WIN_TRADE: TradeWithMeta = {
  id: 'trade-1',
  createdAt: '2024-01-01T00:00:00.000Z',
  holdingDays: 1,
  type: 'spot',
  position: 'BTC',
  leverage: 2,
  volume: 0.5,
  buyPrice: 30000,
  sellPrice: 35000,
  closeDate: '2024-06-01',
  investment: 15000,
  investmentAll: 30000,
  sellValue: 17500,
  cost: 0,
  nettoProfit: 2500,
  profitPercent: 16.67,
  profitRealPercent: 8.33,
  dailyProfitPercent: 0.1,
  result: 'Win',
};

const LOSS_TRADE: TradeWithMeta = {
  ...WIN_TRADE,
  id: 'trade-2',
  sellPrice: 25000,
  nettoProfit: -2500,
  profitPercent: -16.67,
  result: 'Loss',
};

const ALT_TRADE: TradeWithMeta = {
  ...WIN_TRADE,
  id: 'trade-3',
  position: 'eth',
  type: 'futures',
  leverage: 10,
  volume: 10,
  buyPrice: 100,
  sellPrice: 200,
  closeDate: '2024-05-01',
  nettoProfit: 50,
  profitPercent: 1,
  result: 'Win',
};

describe('TradeTableComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TradeTableComponent],
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders skeleton rows while loading', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', true);
    fixture.componentRef.setInput('trades', []);
    fixture.detectChanges();
    await fixture.whenStable();

    const skeletonDivs = fixture.nativeElement.querySelectorAll('.animate-pulse');
    expect(skeletonDivs.length).toBeGreaterThan(0);
  });

  it('renders empty state when not loading and trades is empty', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', []);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No trades recorded yet');
  });

  it('renders "Add your first trade" button in empty state', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', []);
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const texts = Array.from(buttons).map((b) => b.textContent?.trim() ?? '');
    expect(texts.some((t) => t.includes('Add your first trade'))).toBe(true);
  });

  it('emits newTrade when empty-state button is clicked', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', []);
    fixture.detectChanges();
    await fixture.whenStable();

    const spy = vi.spyOn(fixture.componentInstance.newTrade, 'emit');

    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledOnce();
  });

  it('renders a table row for each trade', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE, LOSS_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('shows Win badge with emerald styling', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    const badge = fixture.nativeElement.querySelector('[class*="bg-emerald-100"]') as HTMLElement;
    expect(badge?.textContent?.trim()).toBe('Win');
  });

  it('shows Loss badge with red styling', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [LOSS_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    const badge = fixture.nativeElement.querySelector('[class*="bg-red-100"]') as HTMLElement;
    expect(badge?.textContent?.trim()).toBe('Loss');
  });

  it('applies bg-emerald-50 class to rows with flashNew: true', async () => {
    const flashTrade: TradeWithMeta = { ...WIN_TRADE, flashNew: true };
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [flashTrade]);
    fixture.detectChanges();
    await fixture.whenStable();

    const row = fixture.nativeElement.querySelector('tbody tr') as HTMLElement;
    expect(row.className).toContain('bg-emerald-50');
  });

  it('sorts ascending on first header click and descending on second click', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE, LOSS_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    const profitBtn = Array.from(
      fixture.nativeElement.querySelectorAll('thead button') as NodeListOf<HTMLButtonElement>,
    ).find((btn) => btn.textContent?.includes('Net Profit')) as HTMLButtonElement;

    profitBtn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.sortedTrades().map((t) => t.id)).toEqual(['trade-2', 'trade-1']);

    profitBtn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.sortedTrades().map((t) => t.id)).toEqual(['trade-1', 'trade-2']);
  });

  it('resets to API order on third click', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE, LOSS_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    const profitBtn = Array.from(
      fixture.nativeElement.querySelectorAll('thead button') as NodeListOf<HTMLButtonElement>,
    ).find((btn) => btn.textContent?.includes('Net Profit')) as HTMLButtonElement;

    profitBtn.click();
    profitBtn.click();
    profitBtn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.sortedTrades().map((t) => t.id)).toEqual(['trade-1', 'trade-2']);
  });

  it('sorts numeric columns numerically (not lexicographically)', async () => {
    const midTrade: TradeWithMeta = { ...WIN_TRADE, id: 'trade-mid', volume: 2 };
    const highTrade: TradeWithMeta = { ...WIN_TRADE, id: 'trade-high', volume: 10 };
    const lowTrade: TradeWithMeta = { ...WIN_TRADE, id: 'trade-low', volume: 1 };

    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [highTrade, lowTrade, midTrade]);
    fixture.detectChanges();
    await fixture.whenStable();

    const volumeBtn = Array.from(
      fixture.nativeElement.querySelectorAll('thead button') as NodeListOf<HTMLButtonElement>,
    ).find((btn) => btn.textContent?.includes('Volume')) as HTMLButtonElement;

    volumeBtn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.sortedTrades().map((t) => t.volume)).toEqual([1, 2, 10]);
  });

  it('sorts string columns case-insensitively', async () => {
    const btcTrade: TradeWithMeta = { ...WIN_TRADE, id: 'btc', position: 'BTC' };
    const ethTrade: TradeWithMeta = { ...ALT_TRADE, id: 'eth', position: 'eth' };

    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [ethTrade, btcTrade]);
    fixture.detectChanges();
    await fixture.whenStable();

    const tokenBtn = Array.from(
      fixture.nativeElement.querySelectorAll('thead button') as NodeListOf<HTMLButtonElement>,
    ).find((btn) => btn.textContent?.includes('Token')) as HTMLButtonElement;

    tokenBtn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.sortedTrades().map((t) => t.position)).toEqual(['BTC', 'eth']);
  });

  it('sets aria-sort on active column and clears it on third click', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE, LOSS_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    const tokenBtn = Array.from(
      fixture.nativeElement.querySelectorAll('thead button') as NodeListOf<HTMLButtonElement>,
    ).find((btn) => btn.textContent?.includes('Token')) as HTMLButtonElement;

    tokenBtn.click();
    fixture.detectChanges();
    const tokenTh = tokenBtn.closest('th') as HTMLElement;
    expect(tokenTh.getAttribute('aria-sort')).toBe('ascending');

    tokenBtn.click();
    fixture.detectChanges();
    expect(tokenTh.getAttribute('aria-sort')).toBe('descending');

    tokenBtn.click();
    fixture.detectChanges();
    expect(tokenTh.hasAttribute('aria-sort')).toBe(false);
  });
});
