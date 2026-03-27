import { Component, HostListener, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TradeWithMeta } from '../trade.service';
import { CreateTradeDto } from '../../../core/models/trade.model';
import { MasterDataApiService } from '../../master-data/master-data-api.service';

export type { TradeWithMeta };

export type SortableColumn =
  | 'closeDate'
  | 'position'
  | 'tradePosition'
  | 'type'
  | 'brokerCost'
  | 'leverage'
  | 'volume'
  | 'buyPrice'
  | 'sellPrice'
  | 'nettoProfit'
  | 'profitPercent'
  | 'result';

interface DailyAggregateCell {
  isFirst: boolean;
  rowSpan: number;
  totalNetProfit: number;
  totalProfitPercent: number;
}

@Component({
  selector: 'app-trade-table',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, TranslatePipe],
  templateUrl: './trade-table.component.html',
})
export class TradeTableComponent implements OnInit {
  private readonly masterDataApi = inject(MasterDataApiService);

  readonly trades = input<TradeWithMeta[]>([]);
  readonly loading = input<boolean>(false);
  readonly hasActiveFilters = input<boolean>(false);

  readonly newTrade = output<void>();
  readonly clearFilters = output<void>();
  readonly deleteTrade = output<string>();
  readonly editSave = output<{
    id: string;
    dto: CreateTradeDto;
    onSuccess: () => void;
    onError: () => void;
  }>();

  readonly editingId = signal<string | null>(null);
  readonly deleteConfirmId = signal<string | null>(null);
  readonly savingEdit = signal(false);
  readonly draft = signal<CreateTradeDto>({
    token: '',
    type: '',
    position: '',
    tradePosition: 'long',
    brokerCost: 0,
    leverage: 1,
    volume: 0,
    buyPrice: 0,
    sellPrice: 0,
    closeDate: '',
  });
  readonly fieldErrors = signal<Partial<Record<keyof CreateTradeDto, string>>>({});
  readonly tokens = signal<string[]>([]);
  readonly positions = signal<string[]>([]);
  readonly tradeTypes = signal<string[]>([]);
  readonly tokenOptions = computed(() => this.withDraftValue(this.tokens(), String(this.draft().token ?? this.draft().position ?? '').trim()));
  readonly positionOptions = computed(() => this.withDraftValue(this.positions(), String(this.draft().tradePosition ?? '').trim()));
  readonly typeOptions = computed(() => this.withDraftValue(this.tradeTypes(), String(this.draft().type ?? '').trim()));

  readonly sortCol = signal<SortableColumn | null>(null);
  readonly sortDir = signal<'asc' | 'desc'>('asc');

  async ngOnInit(): Promise<void> {
    const [tokens, positions, tradeTypes] = await Promise.allSettled([
      this.masterDataApi.getTokens(),
      this.masterDataApi.getPositions(),
      this.masterDataApi.getTradeTypes(),
    ]);

    if (tokens.status === 'fulfilled') {
      this.tokens.set(tokens.value);
    }

    if (positions.status === 'fulfilled') {
      this.positions.set(positions.value);
    }

    if (tradeTypes.status === 'fulfilled') {
      this.tradeTypes.set(tradeTypes.value);
    }
  }

  readonly sortedTrades = computed(() => {
    const col = this.sortCol();
    const dir = this.sortDir();
    const list = [...this.trades()];
    if (!col) return list;
    return list.sort((a, b) => {
      const av = a[col];
      const bv = b[col];
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' });
      return dir === 'asc' ? cmp : -cmp;
    });
  });

  readonly dailyAggregateMeta = computed(() => {
    const rows = this.sortedTrades();
    const meta = new Map<string, DailyAggregateCell>();

    let index = 0;
    while (index < rows.length) {
      const groupDate = rows[index].closeDate;
      let cursor = index;
      let totalNetProfit = 0;
      let totalProfitPercent = 0;

      while (cursor < rows.length && rows[cursor].closeDate === groupDate) {
        totalNetProfit += rows[cursor].nettoProfit;
        totalProfitPercent += rows[cursor].profitPercent;
        cursor += 1;
      }

      const rowSpan = cursor - index;
      for (let groupIndex = index; groupIndex < cursor; groupIndex += 1) {
        const trade = rows[groupIndex];
        meta.set(trade.id, {
          isFirst: groupIndex === index,
          rowSpan,
          totalNetProfit,
          totalProfitPercent,
        });
      }

      index = cursor;
    }

    return meta;
  });

  sortBy(col: SortableColumn): void {
    if (this.sortCol() !== col) {
      this.sortCol.set(col);
      this.sortDir.set('asc');
    } else if (this.sortDir() === 'asc') {
      this.sortDir.set('desc');
    } else {
      this.sortCol.set(null);
      this.sortDir.set('asc');
    }
  }

  ariaSort(col: SortableColumn): 'ascending' | 'descending' | null {
    if (this.sortCol() !== col) return null;
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  getSortButtonLabel(col: SortableColumn, colName: string): string {
    const currentSort = this.ariaSort(col);
    if (!currentSort) {
      return `Sort by ${colName}`;
    }
    const direction = currentSort === 'ascending' ? 'ascending' : 'descending';
    return `${colName}, currently sorted ${direction}. Activate to change sort.`;
  }

  onNewTrade(): void {
    this.newTrade.emit();
  }

  onClearFilters(): void {
    this.clearFilters.emit();
  }

  isEditing(tradeId: string): boolean {
    return this.editingId() === tradeId;
  }

  startEdit(trade: TradeWithMeta): void {
    this.editingId.set(trade.id);
    this.fieldErrors.set({});
    this.draft.set({
      token: trade.position,
      type: trade.type,
      position: trade.position,
      tradePosition: trade.tradePosition ?? 'long',
      brokerCost: trade.brokerCost ?? 0,
      leverage: trade.leverage,
      volume: trade.volume,
      buyPrice: trade.buyPrice,
      sellPrice: trade.sellPrice,
      closeDate: trade.closeDate,
    });
  }

  onRowKeydown(event: KeyboardEvent, trade: TradeWithMeta): void {
    if (this.isEditing(trade.id)) {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('button, input, select, textarea, a')) {
      return;
    }

    event.preventDefault();
    this.startEdit(trade);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.fieldErrors.set({});
    this.savingEdit.set(false);
  }

  openDeleteConfirm(tradeId: string, event?: Event): void {
    event?.stopPropagation();
    this.deleteConfirmId.set(tradeId);
  }

  cancelDeleteConfirm(event?: Event): void {
    event?.stopPropagation();
    this.deleteConfirmId.set(null);
  }

  confirmDelete(tradeId: string, event?: Event): void {
    event?.stopPropagation();
    this.deleteConfirmId.set(null);
    this.deleteTrade.emit(tradeId);
  }

  setDraftField<K extends keyof CreateTradeDto>(field: K, value: CreateTradeDto[K]): void {
    this.draft.update((draft) => {
      if (field === 'token' || field === 'position') {
        return {
          ...draft,
          token: value as CreateTradeDto['token'],
          position: value as CreateTradeDto['position'],
        };
      }

      return { ...draft, [field]: value };
    });
  }

  onSaveEdit(): void {
    const id = this.editingId();
    if (!id || this.savingEdit()) return;

    const dto = this.validateDraft();
    if (!dto) return;

    this.savingEdit.set(true);
    this.editSave.emit({
      id,
      dto,
      onSuccess: () => {
        this.savingEdit.set(false);
        this.cancelEdit();
      },
      onError: () => {
        this.savingEdit.set(false);
      },
    });
  }

  onEditKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.cancelEdit();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.onSaveEdit();
    }
  }

  toNumber(value: string): number {
    return Number(value);
  }

  getDailyAggregateCell(tradeId: string): DailyAggregateCell {
    return this.dailyAggregateMeta().get(tradeId) ?? {
      isFirst: true,
      rowSpan: 1,
      totalNetProfit: 0,
      totalProfitPercent: 0,
    };
  }

  private withDraftValue(options: string[], current: string): string[] {
    if (!current) {
      return options;
    }

    return options.includes(current) ? options : [current, ...options];
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    if (!this.editingId() && !this.deleteConfirmId()) {
      return;
    }
    event.preventDefault();
    if (this.editingId()) {
      this.cancelEdit();
    }
    if (this.deleteConfirmId()) {
      this.cancelDeleteConfirm();
    }
  }

  private validateDraft(): CreateTradeDto | null {
    const d = this.draft();
    const errors: Partial<Record<keyof CreateTradeDto, string>> = {};

    const token = String(d.token ?? d.position ?? '').trim();
    const type = String(d.type ?? '').trim();
    const position = String(d.position ?? '').trim();
    const tradePosition = String(d.tradePosition ?? '').trim();
    const brokerCost = Number(d.brokerCost ?? 0);
    const leverage = Number(d.leverage);
    const volume = Number(d.volume);
    const buyPrice = Number(d.buyPrice);
    const sellPrice = Number(d.sellPrice);
    const closeDate = String(d.closeDate ?? '').trim();

    if (!token) errors.token = 'trades.table.edit.errors.required.token';
    if (!type) errors.type = 'trades.table.edit.errors.required.type';
    if (!position) errors.position = 'trades.table.edit.errors.required.position';
    if (!tradePosition) errors.tradePosition = 'trades.table.edit.errors.required.tradePosition';
    if (isNaN(brokerCost) || brokerCost < 0) errors.brokerCost = 'trades.table.edit.errors.min.brokerCost';
    if (isNaN(leverage) || leverage <= 0) errors.leverage = 'trades.table.edit.errors.min.leverage';
    if (isNaN(volume) || volume <= 0) errors.volume = 'trades.table.edit.errors.min.volume';
    if (isNaN(buyPrice) || buyPrice <= 0) errors.buyPrice = 'trades.table.edit.errors.min.buyPrice';
    if (isNaN(sellPrice) || sellPrice <= 0) errors.sellPrice = 'trades.table.edit.errors.min.sellPrice';
    if (!closeDate || isNaN(Date.parse(closeDate))) errors.closeDate = 'trades.table.edit.errors.required.closeDate';

    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) return null;

    return {
      token,
      type,
      position: token,
      tradePosition,
      brokerCost,
      leverage,
      volume,
      buyPrice,
      sellPrice,
      closeDate,
    };
  }
}
