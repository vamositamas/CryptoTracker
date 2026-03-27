import { Component, DestroyRef, effect, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { debounceTime } from 'rxjs/operators';
import { FilterState } from '../../../core/models/trade.model';

@Component({
  selector: 'app-trade-filter-bar',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './trade-filter-bar.component.html',
})
export class TradeFilterBarComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly value = input<FilterState>({ position: '', tradePosition: '', type: '', result: '', dateFrom: '', dateTo: '' });
  readonly tokens = input<string[]>([]);
  readonly positions = input<string[]>([]);
  readonly types = input<string[]>([]);

  readonly filterChange = output<FilterState>();

  readonly form = this.fb.group({
    position: [''],
    tradePosition: [''],
    type: [''],
    result: [''],
    dateFrom: [''],
    dateTo: [''],
  });

  get hasValues(): boolean {
    const v = this.form.value;
    return !!(v.position || v.tradePosition || v.type || v.result || v.dateFrom || v.dateTo);
  }

  constructor() {
    // Sync form when parent drives value (KPI clicks, clear, programmatic resets)
    effect(() => {
      this.form.patchValue(this.value(), { emitEvent: false });
    });

    // Emit on every user-driven form value change
    this.form.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => {
        this.filterChange.emit({
          position: val.position ?? '',
          tradePosition: val.tradePosition ?? '',
          type: val.type ?? '',
          result: val.result ?? '',
          dateFrom: val.dateFrom ?? '',
          dateTo: val.dateTo ?? '',
        });
      });
  }

  clearAll(): void {
    this.form.reset({ position: '', tradePosition: '', type: '', result: '', dateFrom: '', dateTo: '' });
    // valueChanges fires → emits empty FilterState via the subscription above
  }
}
