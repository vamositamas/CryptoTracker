import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CreateTradeDto, FilterState } from '../../core/models/trade.model';
import { TradeService } from './trade.service';
import { TradeFormComponent } from './trade-form/trade-form.component';
import { TradeFilterBarComponent } from './trade-filter-bar/trade-filter-bar.component';
import { TradeTableComponent } from './trade-table/trade-table.component';
import { downloadTradeImportTemplate, readTradeWorkbook } from './trade-import.parser';

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
    positions: [],
    tradePosition: '',
    type: '',
    result: '',
    dateFrom: '',
    dateTo: '',
  });

  private deleteToastTimer: ReturnType<typeof setTimeout> | null = null;
  private importToastTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly today = new Date().toISOString().split('T')[0];

  readonly totalCount = computed(() => this.trades().length);
  readonly winCount = computed(() => this.trades().filter((t) => t.result === 'Win').length);
  readonly lossCount = computed(() => this.trades().filter((t) => t.result === 'Loss').length);
  readonly todayCount = computed(() => this.trades().filter((t) => t.closeDate === this.today).length);

  readonly activeKpi = computed<'all' | 'wins' | 'losses' | 'today' | null>(() => {
    const f = this.filterState();
    const noDropdownFilters = f.positions.length === 0 && !f.tradePosition && !f.type;
    if (!noDropdownFilters) return null;
    if (!f.result && !f.dateFrom && !f.dateTo) return 'all';
    if (f.result === 'Win' && !f.dateFrom && !f.dateTo) return 'wins';
    if (f.result === 'Loss' && !f.dateFrom && !f.dateTo) return 'losses';
    if (f.dateFrom === this.today && f.dateTo === this.today && !f.result) return 'today';
    return null;
  });

  readonly availableTokens = computed(() =>
    [...new Set(this.trades().map((t) => t.position))].sort()
  );

  readonly availablePositions = computed(() =>
    [...new Set(this.trades().map((t) => t.tradePosition).filter((p): p is string => !!p))].sort()
  );

  readonly availableTypes = computed(() =>
    [...new Set(this.trades().map((t) => t.type).filter((t): t is string => !!t))].sort()
  );

  readonly hasActiveFilters = computed(() => {
    const f = this.filterState();
    return !!(f.positions.length > 0 || f.tradePosition || f.type || f.result || f.dateFrom || f.dateTo);
  });

  readonly filteredTrades = computed(() => {
    const list = this.trades();
    const f = this.filterState();
    const positionFilters = f.positions; // Array of selected tokens
    const tradePositionFilter = f.tradePosition;
    const typeNeedle = f.type.trim().toLowerCase();
    const resultFilter = f.result;
    const dateFrom = f.dateFrom;
    const dateTo = f.dateTo;

    return list.filter((trade) => {
      // Multi-select: if positions is non-empty, trade must match at least one
      if (positionFilters.length > 0 && !positionFilters.includes(trade.position)) {
        return false;
      }
      if (tradePositionFilter && trade.tradePosition !== tradePositionFilter) {
        return false;
      }
      if (typeNeedle && trade.type.toLowerCase() !== typeNeedle) {
        return false;
      }
      if (resultFilter && trade.result !== resultFilter) {
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
    this.filterState.set({ positions: [], tradePosition: '', type: '', result: '', dateFrom: '', dateTo: '' });
  }

  onKpiClick(kpi: 'all' | 'wins' | 'losses' | 'today'): void {
    if (this.activeKpi() === kpi) {
      this.onClearFilters();
      return;
    }
    const base: FilterState = { positions: [], tradePosition: '', type: '', result: '', dateFrom: '', dateTo: '' };
    switch (kpi) {
      case 'all':
        this.filterState.set(base);
        break;
      case 'wins':
        this.filterState.set({ ...base, result: 'Win' });
        break;
      case 'losses':
        this.filterState.set({ ...base, result: 'Loss' });
        break;
      case 'today':
        this.filterState.set({ ...base, dateFrom: this.today, dateTo: this.today });
        break;
    }
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

  onDownloadTemplate(): void {
    downloadTradeImportTemplate();
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
