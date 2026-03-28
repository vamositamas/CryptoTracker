import { Component, DestroyRef, ElementRef, HostListener, computed, effect, inject, input, output, signal } from '@angular/core';
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
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly value = input<FilterState>({ positions: [], tradePosition: '', type: '', result: '', dateFrom: '', dateTo: '' });
  readonly tokens = input<string[]>([]);
  readonly positions = input<string[]>([]);
  readonly types = input<string[]>([]);

  readonly filterChange = output<FilterState>();
  readonly openDropdown = signal<null | 'tokens' | 'tradePosition' | 'result' | 'type'>(null);

  readonly form = this.fb.group({
    positions: [[] as string[]], // Multi-select array
    tradePosition: [''],
    type: [''],
    result: [''],
    dateFrom: [''],
    dateTo: [''],
  });

  readonly tokenSelectionLabel = computed(() => {
    const selected = this.form.controls.positions.value ?? [];
    return selected.length === 0 ? null : selected.join(', ');
  });

  get hasValues(): boolean {
    const v = this.form.value;
    return !!((v.positions && v.positions.length > 0) || v.tradePosition || v.type || v.result || v.dateFrom || v.dateTo);
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
          positions: val.positions ?? [],
          tradePosition: val.tradePosition ?? '',
          type: val.type ?? '',
          result: val.result ?? '',
          dateFrom: val.dateFrom ?? '',
          dateTo: val.dateTo ?? '',
        });
      });
  }

  clearAll(): void {
    this.form.reset({ positions: [], tradePosition: '', type: '', result: '', dateFrom: '', dateTo: '' });
    this.openDropdown.set(null);
    // valueChanges fires → emits empty FilterState via the subscription above
  }

  toggleDropdown(dropdown: 'tokens' | 'tradePosition' | 'result' | 'type'): void {
    this.openDropdown.update((open) => (open === dropdown ? null : dropdown));
  }

  isDropdownOpen(dropdown: 'tokens' | 'tradePosition' | 'result' | 'type'): boolean {
    return this.openDropdown() === dropdown;
  }

  closeDropdowns(): void {
    this.openDropdown.set(null);
  }

  isTokenSelected(token: string): boolean {
    return (this.form.controls.positions.value ?? []).includes(token);
  }

  toggleToken(token: string, checked: boolean): void {
    const selected = this.form.controls.positions.value ?? [];
    if (checked && !selected.includes(token)) {
      this.form.controls.positions.setValue([...selected, token]);
      return;
    }
    if (!checked && selected.includes(token)) {
      this.form.controls.positions.setValue(selected.filter((value) => value !== token));
    }
  }

  clearTokenSelection(): void {
    this.form.controls.positions.setValue([]);
  }

  selectTradePosition(value: string): void {
    this.form.controls.tradePosition.setValue(value);
    this.closeDropdowns();
  }

  selectResult(value: string): void {
    this.form.controls.result.setValue(value);
    this.closeDropdowns();
  }

  selectType(value: string): void {
    this.form.controls.type.setValue(value);
    this.closeDropdowns();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.openDropdown()) {
      return;
    }
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.openDropdown.set(null);
    }
  }
}
