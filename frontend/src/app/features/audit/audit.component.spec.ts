import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AuditComponent } from './audit.component';
import { AuditApiService } from './audit-api.service';
import { AuditEntry } from './audit.model';

const ENTRY_CREATE: AuditEntry = {
  id: 'e1',
  timestamp: '2024-06-01T10:00:00.000Z',
  action: 'CREATE',
  traderId: 'alice',
  entityId: 'trade-1',
  previousValue: null,
  newValue: { position: 'BTC', type: 'spot' },
};

const ENTRY_UPDATE: AuditEntry = {
  id: 'e2',
  timestamp: '2024-06-02T12:30:00.000Z',
  action: 'UPDATE',
  traderId: 'alice',
  entityId: 'trade-1',
  field: 'sellPrice',
  previousValue: 30000,
  newValue: 35000,
};

const ENTRY_DELETE: AuditEntry = {
  id: 'e3',
  timestamp: '2024-06-03T08:00:00.000Z',
  action: 'DELETE',
  traderId: 'alice',
  entityId: 'trade-2',
  previousValue: { position: 'ETH', type: 'futures' },
  newValue: null,
};

describe('AuditComponent', () => {
  let apiMock: { getEntries: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    apiMock = { getEntries: vi.fn().mockResolvedValue([]) };

    await TestBed.configureTestingModule({
      imports: [AuditComponent],
      providers: [{ provide: AuditApiService, useValue: apiMock }],
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it('calls getEntries on init and shows loaded entries', async () => {
    apiMock.getEntries.mockResolvedValue([ENTRY_CREATE, ENTRY_UPDATE]);

    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Entries stored in reverse (most-recent first)
    expect(fixture.componentInstance.entries()).toHaveLength(2);
  });

  it('shows error message when API fails', async () => {
    apiMock.getEntries.mockRejectedValue(new Error('Network error'));

    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toBeTruthy();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Failed to load audit trail');
  });

  it('shows empty state when no entries', async () => {
    apiMock.getEntries.mockResolvedValue([]);

    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No audit entries yet');
  });

  it('filters by action type', async () => {
    apiMock.getEntries.mockResolvedValue([ENTRY_CREATE, ENTRY_UPDATE, ENTRY_DELETE]);

    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.onFilterChange({ action: 'UPDATE' });
    fixture.detectChanges();

    expect(fixture.componentInstance.filteredEntries()).toHaveLength(1);
    expect(fixture.componentInstance.filteredEntries()[0].action).toBe('UPDATE');
  });

  it('filters by date from', async () => {
    apiMock.getEntries.mockResolvedValue([ENTRY_CREATE, ENTRY_UPDATE, ENTRY_DELETE]);

    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // only entries from 2024-06-02 onwards
    fixture.componentInstance.onFilterChange({ dateFrom: '2024-06-02' });
    fixture.detectChanges();

    const result = fixture.componentInstance.filteredEntries();
    expect(result.every((e) => e.timestamp.slice(0, 10) >= '2024-06-02')).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('filters by date to', async () => {
    apiMock.getEntries.mockResolvedValue([ENTRY_CREATE, ENTRY_UPDATE, ENTRY_DELETE]);

    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // only entries up to 2024-06-01
    fixture.componentInstance.onFilterChange({ dateTo: '2024-06-01' });
    fixture.detectChanges();

    const result = fixture.componentInstance.filteredEntries();
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe('CREATE');
  });

  it('resetFilters clears all filter state', async () => {
    apiMock.getEntries.mockResolvedValue([ENTRY_CREATE, ENTRY_UPDATE]);

    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.onFilterChange({ action: 'CREATE', dateFrom: '2024-06-02' });
    fixture.detectChanges();
    expect(fixture.componentInstance.hasActiveFilters()).toBe(true);

    fixture.componentInstance.resetFilters();
    fixture.detectChanges();
    expect(fixture.componentInstance.hasActiveFilters()).toBe(false);
    expect(fixture.componentInstance.filteredEntries()).toHaveLength(2);
  });

  it('returns most-recent entries first (reversed)', async () => {
    // API returns oldest first
    apiMock.getEntries.mockResolvedValue([ENTRY_CREATE, ENTRY_UPDATE, ENTRY_DELETE]);

    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const ids = fixture.componentInstance.entries().map((e) => e.id);
    // reversed: e3, e2, e1
    expect(ids).toEqual(['e3', 'e2', 'e1']);
  });

  it('formatValue returns "—" for null', () => {
    const fixture = TestBed.createComponent(AuditComponent);
    const comp = fixture.componentInstance;
    expect(comp.formatValue(null)).toBe('—');
    expect(comp.formatValue(undefined)).toBe('—');
  });

  it('formatValue returns compact summary for trade objects', () => {
    const fixture = TestBed.createComponent(AuditComponent);
    const comp = fixture.componentInstance;
    expect(comp.formatValue({ position: 'BTC', type: 'spot' })).toBe('BTC spot');
  });

  it('formatValue returns string representation for primitives', () => {
    const fixture = TestBed.createComponent(AuditComponent);
    const comp = fixture.componentInstance;
    expect(comp.formatValue(30000)).toBe('30000');
  });

  it('actionBadgeClass returns correct classes for each action', () => {
    const fixture = TestBed.createComponent(AuditComponent);
    const comp = fixture.componentInstance;
    expect(comp.actionBadgeClass('CREATE')).toContain('green');
    expect(comp.actionBadgeClass('UPDATE')).toContain('yellow');
    expect(comp.actionBadgeClass('DELETE')).toContain('red');
  });
});
