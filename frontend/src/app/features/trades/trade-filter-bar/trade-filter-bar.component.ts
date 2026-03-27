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

  /**
   * Increment this input to programmatically clear all filters from the parent.
   * Filter bar reacts via effect() and resets its form.
   */
  readonly clearCount = input<number>(0);

  readonly filterChange = output<FilterState>();

  readonly form = this.fb.group({
    position: [''],
    type: [''],
    dateFrom: [''],
    dateTo: [''],
  });

  get hasValues(): boolean {
    const v = this.form.value;
    return !!(v.position || v.type || v.dateFrom || v.dateTo);
  }

  constructor() {
    // React to parent-driven clear requests
    effect(() => {
      const count = this.clearCount();
      if (count > 0) {
        this.form.reset(
          { position: '', type: '', dateFrom: '', dateTo: '' },
          { emitEvent: false },
        );
        this.filterChange.emit({ position: '', type: '', dateFrom: '', dateTo: '' });
      }
    });

    // Emit on every form value change
    this.form.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => {
        this.filterChange.emit({
          position: val.position ?? '',
          type: val.type ?? '',
          dateFrom: val.dateFrom ?? '',
          dateTo: val.dateTo ?? '',
        });
      });
  }

  clearAll(): void {
    this.form.reset({ position: '', type: '', dateFrom: '', dateTo: '' });
    // valueChanges fires → emits empty FilterState via the subscription above
  }
}
