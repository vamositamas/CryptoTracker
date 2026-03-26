import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FilterState } from '../../core/models/trade.model';
import { TradeService } from './trade.service';
import { TradeFormComponent } from './trade-form/trade-form.component';
import { TradeFilterBarComponent } from './trade-filter-bar/trade-filter-bar.component';
import { TradeTableComponent } from './trade-table/trade-table.component';

@Component({
  selector: 'app-trades',
  standalone: true,
  imports: [TradeFormComponent, TradeFilterBarComponent, TradeTableComponent],
  templateUrl: './trades.component.html',
})
export class TradesComponent implements OnInit {
  private readonly tradeService = inject(TradeService);

  readonly trades = this.tradeService.trades;
  readonly loading = this.tradeService.loading;

  readonly showForm = signal(false);
  readonly filterState = signal<FilterState>({
    position: '',
    type: '',
    dateFrom: '',
    dateTo: '',
  });
  readonly clearCount = signal(0);

  readonly hasActiveFilters = computed(() => {
    const f = this.filterState();
    return !!(f.position || f.type || f.dateFrom || f.dateTo);
  });

  readonly filteredTrades = computed(() => {
    const list = this.trades();
    const f = this.filterState();
    const positionNeedle = f.position.trim().toLowerCase();
    const typeNeedle = f.type.trim().toLowerCase();
    const dateFrom = f.dateFrom;
    const dateTo = f.dateTo;

    return list.filter((trade) => {
      if (positionNeedle && !trade.position.toLowerCase().includes(positionNeedle)) {
        return false;
      }
      if (typeNeedle && !trade.type.toLowerCase().includes(typeNeedle)) {
        return false;
      }
      if (dateFrom && trade.closeDate < dateFrom) {
        return false;
      }
      if (dateTo && trade.closeDate > dateTo) {
        return false;
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.tradeService.loadTrades();
  }

  openForm(): void {
    this.showForm.set(true);
  }

  onFormSaved(): void {
    this.showForm.set(false);
  }

  onFormCancelled(): void {
    this.showForm.set(false);
  }

  onFilterChange(next: FilterState): void {
    this.filterState.set(next);
  }

  onClearFilters(): void {
    this.clearCount.update((n) => n + 1);
    this.filterState.set({ position: '', type: '', dateFrom: '', dateTo: '' });
  }

  @HostListener('document:keydown.n', ['$event'])
  onKeyN(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }
    this.openForm();
  }
}
