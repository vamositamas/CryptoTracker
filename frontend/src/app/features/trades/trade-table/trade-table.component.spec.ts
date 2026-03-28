import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TradeTableComponent } from './trade-table.component';
import { TradeWithMeta } from '../trade.service';
import { provideTranslateTesting } from '../../../../testing/translate-test.providers';
import { MasterDataApiService } from '../../master-data/master-data-api.service';

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
    const masterDataApiMock = {
      getTokens: vi.fn().mockResolvedValue(['BTC', 'ETH', 'DOT']),
      getPositions: vi.fn().mockResolvedValue(['long', 'short']),
      getTradeTypes: vi.fn().mockResolvedValue(['spot', 'futures']),
    };

    await TestBed.configureTestingModule({
      imports: [TradeTableComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: MasterDataApiService, useValue: masterDataApiMock },
      ],
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
    fixture.componentRef.setInput('hasActiveFilters', false);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No trades recorded yet');
  });

  it('renders "Add your first trade" button in empty state', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', []);
    fixture.componentRef.setInput('hasActiveFilters', false);
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
    fixture.componentRef.setInput('hasActiveFilters', false);
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

  it('renders merged daily aggregate cells with summed values by close date', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE, LOSS_TRADE, ALT_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    const dailyNetCells = fixture.nativeElement.querySelectorAll('[data-testid="daily-net-profit-cell"]') as NodeListOf<HTMLTableCellElement>;
    const dailyProfitCells = fixture.nativeElement.querySelectorAll('[data-testid="daily-profit-percent-cell"]') as NodeListOf<HTMLTableCellElement>;

    expect(dailyNetCells.length).toBe(2);
    expect(dailyProfitCells.length).toBe(2);
    expect(dailyNetCells[0].getAttribute('rowspan')).toBe('2');
    expect(dailyProfitCells[0].getAttribute('rowspan')).toBe('2');
    expect((dailyNetCells[0].textContent ?? '').replace(/\s+/g, '')).toContain('+0.00');
    expect((dailyProfitCells[0].textContent ?? '').replace(/\s+/g, '')).toContain('+0.00%');
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

  it('sets contextual aria-label on icon-only delete button', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    const deleteBtn = fixture.nativeElement.querySelector('button[aria-label^="Delete trade"]') as HTMLButtonElement;
    expect(deleteBtn.getAttribute('aria-label')).toContain('Delete trade BTC closed on 2024-06-01');
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

  it('shows filter-specific empty state when hasActiveFilters is true', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', []);
    fixture.componentRef.setInput('hasActiveFilters', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No trades match your filters');
    expect(text).toContain('Clear filters');
    expect(text).not.toContain('No trades recorded yet');
  });

  it('emits clearFilters when filter-empty-state button is clicked', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', []);
    fixture.componentRef.setInput('hasActiveFilters', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const clearSpy = vi.spyOn(fixture.componentInstance.clearFilters, 'emit');

    const clearBtn = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((btn) => btn.textContent?.includes('Clear filters')) as HTMLButtonElement;

    clearBtn.click();
    fixture.detectChanges();

    expect(clearSpy).toHaveBeenCalledOnce();
  });

  it('enters edit mode when a data row is clicked', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    const row = fixture.nativeElement.querySelector('tbody tr') as HTMLTableRowElement;
    row.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.editingId()).toBe('trade-1');
    const saveBtn = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((btn) => btn.textContent?.includes('Save'));
    expect(saveBtn).toBeTruthy();
  });

  it('enters edit mode when a row receives Enter key', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    const row = fixture.nativeElement.querySelector('tbody tr') as HTMLTableRowElement;
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.editingId()).toBe('trade-1');
  });

  it('cancels edit mode on Escape key', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.startEdit(WIN_TRADE);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[type="number"], input[type="date"]') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.editingId()).toBeNull();
  });

  it('renders dropdown lists for token, position, and type in edit mode', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.componentInstance.ngOnInit();

    fixture.componentInstance.startEdit(WIN_TRADE);
    fixture.detectChanges();

    // Verify the component has loaded the correct options in each signal
    expect(fixture.componentInstance.tokenOptions()).toEqual(['BTC', 'ETH', 'DOT']);
    expect(fixture.componentInstance.positionOptions()).toEqual(['long', 'short']);
    expect(fixture.componentInstance.typeOptions()).toEqual(['spot', 'futures']);

    // Verify dropdown trigger buttons are rendered in the edit row
    const triggerButtons = fixture.nativeElement.querySelectorAll('td button') as NodeListOf<HTMLButtonElement>;
    expect(triggerButtons.length).toBeGreaterThanOrEqual(3);
  });

  it('cancels edit mode on global Escape key', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.startEdit(WIN_TRADE);
    expect(fixture.componentInstance.editingId()).toBe('trade-1');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.editingId()).toBeNull();
  });

  it('emits editSave on Save for a valid draft', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.startEdit(WIN_TRADE);
    fixture.componentInstance.setDraftField('position', 'ETH');
    fixture.detectChanges();

    const saveSpy = vi.spyOn(fixture.componentInstance.editSave, 'emit');
    fixture.componentInstance.onSaveEdit();

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'trade-1',
        dto: expect.objectContaining({ position: 'ETH' }),
      }),
    );
  });

  it('does not emit editSave when draft is invalid', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.startEdit(WIN_TRADE);
    fixture.componentInstance.setDraftField('sellPrice', 0);

    const saveSpy = vi.spyOn(fixture.componentInstance.editSave, 'emit');
    fixture.componentInstance.onSaveEdit();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.fieldErrors().sellPrice).toBe('trades.table.edit.errors.min.sellPrice');
  });

  it('shows inline delete confirmation when delete icon is clicked', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    const deleteBtn = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((btn) => (btn.getAttribute('aria-label') ?? '').startsWith('Delete trade')) as HTMLButtonElement;

    deleteBtn.click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Are you sure?');
    expect(text).toContain('Delete');
    expect(text).toContain('Cancel');
  });

  it('restores normal row state when delete confirmation is cancelled', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openDeleteConfirm('trade-1');
    fixture.detectChanges();

    const cancelBtn = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((btn) => btn.textContent?.trim() === 'Cancel') as HTMLButtonElement;

    cancelBtn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.deleteConfirmId()).toBeNull();
  });

  it('cancels delete confirmation on global Escape key', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openDeleteConfirm('trade-1');
    expect(fixture.componentInstance.deleteConfirmId()).toBe('trade-1');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.deleteConfirmId()).toBeNull();
  });

  it('emits deleteTrade when delete confirmation is accepted', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openDeleteConfirm('trade-1');
    fixture.detectChanges();

    const deleteSpy = vi.spyOn(fixture.componentInstance.deleteTrade, 'emit');

    const confirmDeleteBtn = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((btn) => btn.textContent?.trim() === 'Delete') as HTMLButtonElement;

    confirmDeleteBtn.click();
    fixture.detectChanges();

    expect(deleteSpy).toHaveBeenCalledWith('trade-1');
    expect(fixture.componentInstance.deleteConfirmId()).toBeNull();
  });

  it('generates sort button label when not sorted', () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.detectChanges();

    const label = fixture.componentInstance.getSortButtonLabel('closeDate', 'Close Date');

    expect(label).toBe('Sort by Close Date');
  });

  it('generates sort button label when sorted ascending', () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.detectChanges();

    fixture.componentInstance.sortCol.set('closeDate');
    fixture.componentInstance.sortDir.set('asc');

    const label = fixture.componentInstance.getSortButtonLabel('closeDate', 'Close Date');

    expect(label).toContain('Close Date');
    expect(label).toContain('ascending');
  });

  it('generates sort button label when sorted descending', () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.detectChanges();

    fixture.componentInstance.sortCol.set('leverage');
    fixture.componentInstance.sortDir.set('desc');

    const label = fixture.componentInstance.getSortButtonLabel('leverage', 'Leverage');

    expect(label).toContain('Leverage');
    expect(label).toContain('descending');
  });

  it('applies focus-visible:ring-2 styling to sort buttons', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    const sortButtons = Array.from(
      fixture.nativeElement.querySelectorAll('th button') as NodeListOf<HTMLButtonElement>,
    ).filter((btn) => btn.textContent?.trim() && !btn.textContent?.includes('Delete'));

    expect(sortButtons.length).toBeGreaterThan(0);
    sortButtons.forEach((btn) => {
      expect(btn.className).toContain('focus-visible:ring-2');
    });
  });

  it('applies aria-label to sort buttons', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    const closeDateButton = Array.from(
      fixture.nativeElement.querySelectorAll('th button') as NodeListOf<HTMLButtonElement>,
    ).find((btn) => btn.textContent?.includes('Close Date'));

    expect(closeDateButton).toBeDefined();
    expect(closeDateButton?.getAttribute('aria-label')).toBeTruthy();
    expect(closeDateButton?.getAttribute('aria-label')).toContain('Close Date');
  });

  it('applies focus-visible:ring-2 styling to save button in edit mode', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.startEdit(WIN_TRADE);
    fixture.detectChanges();

    const saveButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((btn) => btn.textContent?.trim() === 'Save') as HTMLButtonElement;

    expect(saveButton).toBeDefined();
    expect(saveButton.className).toContain('focus-visible:ring-2');
  });

  it('applies focus-visible:ring-2 styling to delete button in delete confirmation', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openDeleteConfirm('trade-1');
    fixture.detectChanges();

    const deleteButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((btn) => btn.textContent?.trim() === 'Delete') as HTMLButtonElement;

    expect(deleteButton).toBeDefined();
    expect(deleteButton.className).toContain('focus-visible:ring-2');
  });

  it('applies focus-visible:ring-2 styling to edit input fields', async () => {
    const fixture = TestBed.createComponent(TradeTableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('trades', [WIN_TRADE]);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.startEdit(WIN_TRADE);
    fixture.detectChanges();

    const editInputs = Array.from(
      fixture.nativeElement.querySelectorAll('tr input') as NodeListOf<HTMLInputElement>,
    );

    expect(editInputs.length).toBeGreaterThan(0);
    editInputs.forEach((input) => {
      expect(input.className).toContain('focus-visible:ring-2');
    });
  });
});
