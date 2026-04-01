import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MasterDataTableComponent } from './master-data-table.component';
import { MasterDataApiError, MasterDataApiService } from './master-data-api.service';
import { MasterDataConfig } from '../../core/models/master-data.model';
import { provideTranslateTesting } from '../../../testing/translate-test.providers';

const TOKEN_CONFIG: MasterDataConfig = {
  type: 'tokens',
  tabLabel: 'Tokens',
  singularLabel: 'token',
  fieldLabel: 'Token',
  emptyLabel: 'No tokens configured',
  addLabel: 'Add token',
};

const TRADE_TYPE_CONFIG: MasterDataConfig = {
  type: 'trade-types',
  tabLabel: 'Trade Types',
  singularLabel: 'trade type',
  fieldLabel: 'Trade Type',
  emptyLabel: 'No trade types configured',
  addLabel: 'Add trade type',
};

describe('MasterDataTableComponent', () => {
  let apiMock: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    apiMock = {
      list: vi.fn().mockResolvedValue([{ id: 'BTC', symbol: 'BTC', name: 'Bitcoin' }]),
      create: vi.fn().mockResolvedValue({ id: 'ETH', symbol: 'ETH', name: 'ETH' }),
      update: vi.fn().mockResolvedValue({ id: 'BTC', symbol: 'BTC', name: 'BTC' }),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [MasterDataTableComponent],
      providers: [...provideTranslateTesting(), { provide: MasterDataApiService, useValue: apiMock }],
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it('loads entries on init', async () => {
    const fixture = TestBed.createComponent(MasterDataTableComponent);
    fixture.componentRef.setInput('config', TOKEN_CONFIG);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(apiMock.list).toHaveBeenCalledWith('tokens');
    expect(fixture.nativeElement.textContent).toContain('BTC');
  });

  it('shows empty state when the list is empty', async () => {
    apiMock.list.mockResolvedValue([]);

    const fixture = TestBed.createComponent(MasterDataTableComponent);
    fixture.componentRef.setInput('config', TOKEN_CONFIG);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No tokens configured');
  });

  it('creates a new entry from the inline add row', async () => {
    const fixture = TestBed.createComponent(MasterDataTableComponent);
    fixture.componentRef.setInput('config', TOKEN_CONFIG);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.startAdd();
    fixture.componentInstance.draftSymbol = 'ETH';
    fixture.componentInstance.draftName = 'Ethereum';
    await fixture.componentInstance.saveEdit();
    fixture.detectChanges();

    expect(apiMock.create).toHaveBeenCalledWith('tokens', { symbol: 'ETH', name: 'Ethereum' });
    expect(fixture.componentInstance.entries().some((entry) => entry.id === 'ETH')).toBe(true);
  });

  it('shows inline duplicate error when create fails with DUPLICATE_ENTRY', async () => {
    apiMock.create.mockRejectedValue(
      new MasterDataApiError({ code: 'DUPLICATE_ENTRY', message: 'BTC already exists', field: 'name' }, 409),
    );

    const fixture = TestBed.createComponent(MasterDataTableComponent);
    fixture.componentRef.setInput('config', TOKEN_CONFIG);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.startAdd();
    fixture.componentInstance.draftSymbol = 'BTC';
    fixture.componentInstance.draftName = 'Bitcoin';
    await fixture.componentInstance.saveEdit();
    fixture.detectChanges();

    expect(fixture.componentInstance.inlineError()).toBe('BTC already exists');
  });

  it('opens inline delete confirmation and deletes the row', async () => {
    const fixture = TestBed.createComponent(MasterDataTableComponent);
    fixture.componentRef.setInput('config', TOKEN_CONFIG);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openDeleteConfirm('BTC');
    await fixture.componentInstance.confirmDelete('BTC');
    fixture.detectChanges();

    expect(apiMock.delete).toHaveBeenCalledWith('tokens', 'BTC');
    expect(fixture.componentInstance.entries()).toHaveLength(0);
  });

  it('reloads entries when the config tab changes', async () => {
    apiMock.list
      .mockResolvedValueOnce([{ id: 'BTC', symbol: 'BTC', name: 'Bitcoin' }])
      .mockResolvedValueOnce([{ id: 'spot', name: 'Spot' }]);

    const fixture = TestBed.createComponent(MasterDataTableComponent);
    fixture.componentRef.setInput('config', TOKEN_CONFIG);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentRef.setInput('config', TRADE_TYPE_CONFIG);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(apiMock.list).toHaveBeenNthCalledWith(1, 'tokens');
    expect(apiMock.list).toHaveBeenNthCalledWith(2, 'trade-types');
    expect(fixture.nativeElement.textContent).toContain('Spot');
    expect(fixture.nativeElement.textContent).not.toContain('Bitcoin');
  });

  it('closes add editor on Escape key', async () => {
    const fixture = TestBed.createComponent(MasterDataTableComponent);
    fixture.componentRef.setInput('config', TOKEN_CONFIG);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.startAdd();
    expect(fixture.componentInstance.editingId()).toBe('__new__');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.editingId()).toBeNull();
  });

  it('closes delete confirmation on Escape key', async () => {
    const fixture = TestBed.createComponent(MasterDataTableComponent);
    fixture.componentRef.setInput('config', TOKEN_CONFIG);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openDeleteConfirm('BTC');
    expect(fixture.componentInstance.deleteConfirmId()).toBe('BTC');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.deleteConfirmId()).toBeNull();
  });
});