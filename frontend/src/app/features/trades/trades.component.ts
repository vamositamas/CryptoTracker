import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CreateTradeDto, FilterState } from '../../core/models/trade.model';
import { TradeService } from './trade.service';
import { TradeFormComponent } from './trade-form/trade-form.component';
import { TradeFilterBarComponent } from './trade-filter-bar/trade-filter-bar.component';
import { TradeTableComponent } from './trade-table/trade-table.component';
import { readTradeWorkbook } from './trade-import.parser';

@Component({
  selector: 'app-trades',
  standalone: true,
  imports: [TranslatePipe, TradeFormComponent, TradeFilterBarComponent, TradeTableComponent],
  templateUrl: './trades.component.html',
})
export class TradesComponent implements OnInit {
  private readonly tradeService = inject(TradeService);

  readonly trades = this.tradeService.trades;
  readonly loading = this.tradeService.loading;

  readonly showForm = signal(false);
  readonly deleteErrorToast = signal<string | null>(null);
  readonly importSuccess = signal<{ count: number; fileName: string } | null>(null);
  readonly importError = signal<string | null>(null);
  readonly importing = signal(false);
  readonly filterState = signal<FilterState>({
    position: '',
    type: '',
    dateFrom: '',
    dateTo: '',
  });
  readonly clearCount = signal(0);

  private deleteToastTimer: ReturnType<typeof setTimeout> | null = null;
  private importToastTimer: ReturnType<typeof setTimeout> | null = null;

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

  async onEditSave(event: {
    id: string;
    dto: CreateTradeDto;
    onSuccess: () => void;
    onError: () => void;
  }): Promise<void> {
    try {
      await this.tradeService.updateTrade(event.id, event.dto);
      event.onSuccess();
    } catch {
      event.onError();
    }
  }

  async onDeleteTrade(id: string): Promise<void> {
    try {
      await this.tradeService.deleteTrade(id);
    } catch {
      const message = this.tradeService.error() ?? 'trades.toasts.deleteFailed';
      this.deleteErrorToast.set(message);
      if (this.deleteToastTimer) {
        clearTimeout(this.deleteToastTimer);
      }
      this.deleteToastTimer = setTimeout(() => {
        this.deleteErrorToast.set(null);
      }, 4000);
    }
  }

  async onImportFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      return;
    }

    this.importing.set(true);
    this.importSuccess.set(null);
    this.importError.set(null);

    try {
      const trades = await readTradeWorkbook(file);
      const importedCount = await this.tradeService.importTrades(trades);
      this.importSuccess.set({ count: importedCount, fileName: file.name });
      if (this.importToastTimer) {
        clearTimeout(this.importToastTimer);
      }
      this.importToastTimer = setTimeout(() => {
        this.importSuccess.set(null);
      }, 5000);
    } catch (err) {
      this.importError.set(err instanceof Error ? err.message : 'trades.import.errors.failed');
      if (this.importToastTimer) {
        clearTimeout(this.importToastTimer);
      }
      this.importToastTimer = setTimeout(() => {
        this.importError.set(null);
      }, 5000);
    } finally {
      this.importing.set(false);
      if (input) {
        input.value = '';
      }
    }
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
