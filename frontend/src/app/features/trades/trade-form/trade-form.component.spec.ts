import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TradeFormComponent } from './trade-form.component';
import { TradeService } from '../trade.service';
import { MasterDataApiService } from '../../master-data/master-data-api.service';
import { provideTranslateTesting } from '../../../../testing/translate-test.providers';

describe('TradeFormComponent', () => {
  let masterDataMock: { getTokens: ReturnType<typeof vi.fn>; getPositions: ReturnType<typeof vi.fn>; getTradeTypes: ReturnType<typeof vi.fn> };
  let tradeServiceMock: { createTrade: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    masterDataMock = {
      getTokens: vi.fn().mockResolvedValue(['BTC', 'ETH', 'SOL']),
      getPositions: vi.fn().mockResolvedValue(['long', 'short']),
      getTradeTypes: vi.fn().mockResolvedValue(['spot', 'futures', 'margin']),
    };
    tradeServiceMock = {
      createTrade: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [TradeFormComponent],
      providers: [
        ...provideTranslateTesting(),
        provideHttpClient(),
        { provide: MasterDataApiService, useValue: masterDataMock },
        { provide: TradeService, useValue: tradeServiceMock },
      ],
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders a form element', async () => {
    const fixture = TestBed.createComponent(TradeFormComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
  });

  it('fetches tokens and trade types on init', async () => {
    const fixture = TestBed.createComponent(TradeFormComponent);
    await fixture.componentInstance.ngOnInit();

    expect(masterDataMock.getTokens).toHaveBeenCalledOnce();
    expect(masterDataMock.getPositions).toHaveBeenCalledOnce();
    expect(masterDataMock.getTradeTypes).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.tokens()).toEqual(['BTC', 'ETH', 'SOL']);
    expect(fixture.componentInstance.positions()).toEqual(['long', 'short']);
    expect(fixture.componentInstance.tradeTypes()).toEqual(['spot', 'futures', 'margin']);
  });

  it('re-fetches master data each time the form is mounted', async () => {
    const first = TestBed.createComponent(TradeFormComponent);
    await first.componentInstance.ngOnInit();
    first.destroy();

    const second = TestBed.createComponent(TradeFormComponent);
    await second.componentInstance.ngOnInit();

    expect(masterDataMock.getTokens).toHaveBeenCalledTimes(2);
    expect(masterDataMock.getPositions).toHaveBeenCalledTimes(2);
    expect(masterDataMock.getTradeTypes).toHaveBeenCalledTimes(2);
  });

  it('renders Save and Cancel buttons', async () => {
    const fixture = TestBed.createComponent(TradeFormComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const buttonTexts = Array.from(buttons).map((b) => b.textContent?.trim());
    expect(buttonTexts.some((t) => t?.includes('Save'))).toBe(true);
    expect(buttonTexts.some((t) => t?.includes('Cancel'))).toBe(true);
  });

  it('marks all fields as touched and invalid when submitted empty', async () => {
    const fixture = TestBed.createComponent(TradeFormComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    expect(fixture.componentInstance.isInvalid('token')).toBe(true);
    expect(fixture.componentInstance.isInvalid('tradePosition')).toBe(true);
    expect(fixture.componentInstance.isInvalid('type')).toBe(true);
    expect(fixture.componentInstance.isInvalid('volume')).toBe(true);
    expect(fixture.componentInstance.isInvalid('buyPrice')).toBe(true);
    expect(fixture.componentInstance.isInvalid('sellPrice')).toBe(true);
    expect(fixture.componentInstance.isInvalid('closeDate')).toBe(true);
  });

  it('does not call tradeService.createTrade when the form is invalid', async () => {
    const fixture = TestBed.createComponent(TradeFormComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onSubmit();

    expect(tradeServiceMock.createTrade).not.toHaveBeenCalled();
  });

  it('emits cancelled when onCancel is called', async () => {
    const fixture = TestBed.createComponent(TradeFormComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const spy = vi.spyOn(fixture.componentInstance.cancelled, 'emit');
    fixture.componentInstance.onCancel();

    expect(spy).toHaveBeenCalledOnce();
  });

  it('emits cancelled when Escape is pressed', async () => {
    const fixture = TestBed.createComponent(TradeFormComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const spy = vi.spyOn(fixture.componentInstance.cancelled, 'emit');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledOnce();
  });

  it('getError returns required message for empty position field', async () => {
    const fixture = TestBed.createComponent(TradeFormComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onSubmit();

    const error = fixture.componentInstance.getError('token');
    expect(error).toContain('required');
  });

  it('isInvalid returns false for untouched fields', async () => {
    const fixture = TestBed.createComponent(TradeFormComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isInvalid('token')).toBe(false);
  });

  it('shows disabled empty-state options when master data lists are empty', async () => {
    masterDataMock.getTokens.mockResolvedValue([]);
    masterDataMock.getPositions.mockResolvedValue([]);
    masterDataMock.getTradeTypes.mockResolvedValue([]);

    const fixture = TestBed.createComponent(TradeFormComponent);
    await fixture.componentInstance.ngOnInit();
    fixture.detectChanges();

    const tokenSelect = fixture.nativeElement.querySelector('#token') as HTMLSelectElement;
    const positionSelect = fixture.nativeElement.querySelector('#tradePosition') as HTMLSelectElement;
    const typeSelect = fixture.nativeElement.querySelector('#type') as HTMLSelectElement;

    const tokenOptions = Array.from(tokenSelect.options).map((opt) => ({ text: opt.textContent?.trim(), disabled: opt.disabled }));
    const positionOptions = Array.from(positionSelect.options).map((opt) => ({ text: opt.textContent?.trim(), disabled: opt.disabled }));
    const typeOptions = Array.from(typeSelect.options).map((opt) => ({ text: opt.textContent?.trim(), disabled: opt.disabled }));

    expect(tokenOptions.some((opt) => opt.text === 'No tokens configured - add in Master Data' && opt.disabled)).toBe(true);
    expect(positionOptions.some((opt) => opt.text === 'No positions configured - add in Master Data' && opt.disabled)).toBe(true);
    expect(typeOptions.some((opt) => opt.text === 'No trade types configured - add in Master Data' && opt.disabled)).toBe(true);
  });

  it('announces successful save in polite live region', async () => {
    const fixture = TestBed.createComponent(TradeFormComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.form.setValue({
      token: 'BTC',
      tradePosition: 'long',
      type: 'spot',
      brokerCost: 12.5,
      leverage: 2,
      volume: 0.5,
      buyPrice: 30000,
      sellPrice: 32000,
      closeDate: '2026-03-27',
    });

    fixture.componentInstance.onSubmit();
    await fixture.whenStable();
    fixture.detectChanges();

    const liveRegion = fixture.nativeElement.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(liveRegion.textContent).toContain('Trade saved');
  });
});
