import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TradeFormComponent } from './trade-form.component';
import { TradeService } from '../trade.service';
import { MasterDataApiService } from '../../master-data/master-data-api.service';

describe('TradeFormComponent', () => {
  let masterDataMock: { getTokens: ReturnType<typeof vi.fn>; getTradeTypes: ReturnType<typeof vi.fn> };
  let tradeServiceMock: { createTrade: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    masterDataMock = {
      getTokens: vi.fn().mockResolvedValue(['BTC', 'ETH', 'SOL']),
      getTradeTypes: vi.fn().mockResolvedValue(['spot', 'futures', 'margin']),
    };
    tradeServiceMock = {
      createTrade: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [TradeFormComponent],
      providers: [
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

    expect(fixture.componentInstance.isInvalid('position')).toBe(true);
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

  it('getError returns required message for empty position field', async () => {
    const fixture = TestBed.createComponent(TradeFormComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onSubmit();

    const error = fixture.componentInstance.getError('position');
    expect(error).toContain('required');
  });

  it('isInvalid returns false for untouched fields', async () => {
    const fixture = TestBed.createComponent(TradeFormComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isInvalid('position')).toBe(false);
  });
});
