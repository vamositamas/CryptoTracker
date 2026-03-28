import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TradeFilterBarComponent } from './trade-filter-bar.component';
import { provideTranslateTesting } from '../../../../testing/translate-test.providers';

describe('TradeFilterBarComponent', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [TradeFilterBarComponent],
      providers: [...provideTranslateTesting()],
    }).compileComponents();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders all four filter controls', async () => {
    const fixture = TestBed.createComponent(TradeFilterBarComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('#filter-positions')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#filter-trade-position')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#filter-type')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#filter-result')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#filter-date-from')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#filter-date-to')).not.toBeNull();
  });

  it('emits filterChange when input values change', async () => {
    const fixture = TestBed.createComponent(TradeFilterBarComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const emitSpy = vi.spyOn(fixture.componentInstance.filterChange, 'emit');

    fixture.componentInstance.form.patchValue({ positions: ['BTC'] });
    vi.advanceTimersByTime(151);

    expect(emitSpy).toHaveBeenCalledWith({
      positions: ['BTC'],
      tradePosition: '',
      type: '',
      result: '',
      dateFrom: '',
      dateTo: '',
    });
  });

  it('opens token dropdown and toggles checkbox selection', async () => {
    const fixture = TestBed.createComponent(TradeFilterBarComponent);
    fixture.componentRef.setInput('tokens', ['BTC', 'ETH']);
    fixture.detectChanges();
    await fixture.whenStable();

    const trigger = fixture.nativeElement.querySelector('#filter-positions') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const checkboxes = Array.from(
      fixture.nativeElement.querySelectorAll('input[type="checkbox"]'),
    ) as HTMLInputElement[];
    expect(checkboxes.length).toBe(2);

    checkboxes[0].checked = true;
    checkboxes[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.positions.value).toEqual(['BTC']);
  });

  it('clear button resets all fields and emits empty filter state', async () => {
    const fixture = TestBed.createComponent(TradeFilterBarComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const emitSpy = vi.spyOn(fixture.componentInstance.filterChange, 'emit');

    fixture.componentInstance.form.patchValue({
      positions: ['BTC'],
      tradePosition: 'Long',
      type: 'spot',
      result: 'Win',
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
    });
    vi.advanceTimersByTime(151);

    fixture.componentInstance.clearAll();
    vi.advanceTimersByTime(151);

    expect(fixture.componentInstance.form.value).toEqual({
      positions: [],
      tradePosition: '',
      type: '',
      result: '',
      dateFrom: '',
      dateTo: '',
    });
    expect(emitSpy).toHaveBeenLastCalledWith({
      positions: [],
      tradePosition: '',
      type: '',
      result: '',
      dateFrom: '',
      dateTo: '',
    });
  });

  it('value input patches form and syncs dropdowns', async () => {
    const fixture = TestBed.createComponent(TradeFilterBarComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentRef.setInput('value', {
      positions: ['BTC', 'ETH'],
      tradePosition: 'Long',
      type: 'Scalp',
      result: 'Win',
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.form.value).toEqual({
      positions: ['BTC', 'ETH'],
      tradePosition: 'Long',
      type: 'Scalp',
      result: 'Win',
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
    });

    fixture.componentRef.setInput('value', {
      positions: [],
      tradePosition: '',
      type: '',
      result: '',
      dateFrom: '',
      dateTo: '',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.form.value).toEqual({
      positions: [],
      tradePosition: '',
      type: '',
      result: '',
      dateFrom: '',
      dateTo: '',
    });
  });
});
