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

    expect(fixture.nativeElement.querySelector('#filter-position')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#filter-type')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#filter-date-from')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#filter-date-to')).not.toBeNull();
  });

  it('emits filterChange when input values change', async () => {
    const fixture = TestBed.createComponent(TradeFilterBarComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const emitSpy = vi.spyOn(fixture.componentInstance.filterChange, 'emit');

    fixture.componentInstance.form.patchValue({ position: 'BTC' });
    vi.advanceTimersByTime(151);

    expect(emitSpy).toHaveBeenCalledWith({
      position: 'BTC',
      type: '',
      dateFrom: '',
      dateTo: '',
    });
  });

  it('clear button resets all fields and emits empty filter state', async () => {
    const fixture = TestBed.createComponent(TradeFilterBarComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const emitSpy = vi.spyOn(fixture.componentInstance.filterChange, 'emit');

    fixture.componentInstance.form.patchValue({
      position: 'BTC',
      type: 'spot',
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
    });
    vi.advanceTimersByTime(151);

    fixture.componentInstance.clearAll();
    vi.advanceTimersByTime(151);

    expect(fixture.componentInstance.form.value).toEqual({
      position: '',
      type: '',
      dateFrom: '',
      dateTo: '',
    });
    expect(emitSpy).toHaveBeenLastCalledWith({
      position: '',
      type: '',
      dateFrom: '',
      dateTo: '',
    });
  });

  it('clearCount input triggers programmatic reset and emit', async () => {
    const fixture = TestBed.createComponent(TradeFilterBarComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const emitSpy = vi.spyOn(fixture.componentInstance.filterChange, 'emit');

    fixture.componentInstance.form.patchValue({ position: 'ETH', type: 'futures' });
    vi.advanceTimersByTime(151);

    fixture.componentRef.setInput('clearCount', 1);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.value).toEqual({
      position: '',
      type: '',
      dateFrom: '',
      dateTo: '',
    });
    expect(emitSpy).toHaveBeenLastCalledWith({
      position: '',
      type: '',
      dateFrom: '',
      dateTo: '',
    });
  });
});
