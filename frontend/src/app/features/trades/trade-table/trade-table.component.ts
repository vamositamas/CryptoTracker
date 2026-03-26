import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { TradeWithMeta } from '../trade.service';
import { CreateTradeDto } from '../../../core/models/trade.model';

export type { TradeWithMeta };

export type SortableColumn =
  | 'closeDate'
  | 'position'
  | 'type'
  | 'leverage'
  | 'volume'
  | 'buyPrice'
  | 'sellPrice'
  | 'nettoProfit'
  | 'profitPercent'
  | 'result';

@Component({
  selector: 'app-trade-table',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  templateUrl: './trade-table.component.html',
})
export class TradeTableComponent {
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
    type: '',
    position: '',
    leverage: 1,
    volume: 0,
    buyPrice: 0,
    sellPrice: 0,
    closeDate: '',
  });
  readonly fieldErrors = signal<Partial<Record<keyof CreateTradeDto, string>>>({});

  readonly sortCol = signal<SortableColumn | null>(null);
  readonly sortDir = signal<'asc' | 'desc'>('asc');

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
      type: trade.type,
      position: trade.position,
      leverage: trade.leverage,
      volume: trade.volume,
      buyPrice: trade.buyPrice,
      sellPrice: trade.sellPrice,
      closeDate: trade.closeDate,
    });
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
    this.draft.update((d) => ({ ...d, [field]: value }));
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

  private validateDraft(): CreateTradeDto | null {
    const d = this.draft();
    const errors: Partial<Record<keyof CreateTradeDto, string>> = {};

    const type = String(d.type ?? '').trim();
    const position = String(d.position ?? '').trim();
    const leverage = Number(d.leverage);
    const volume = Number(d.volume);
    const buyPrice = Number(d.buyPrice);
    const sellPrice = Number(d.sellPrice);
    const closeDate = String(d.closeDate ?? '').trim();

    if (!type) errors.type = 'Trade type is required';
    if (!position) errors.position = 'Token is required';
    if (isNaN(leverage) || leverage <= 0) errors.leverage = 'Leverage must be greater than 0';
    if (isNaN(volume) || volume <= 0) errors.volume = 'Volume must be greater than 0';
    if (isNaN(buyPrice) || buyPrice <= 0) errors.buyPrice = 'Buy price must be greater than 0';
    if (isNaN(sellPrice) || sellPrice <= 0) errors.sellPrice = 'Sell price must be greater than 0';
    if (!closeDate || isNaN(Date.parse(closeDate))) errors.closeDate = 'Close date is required';

    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) return null;

    return {
      type,
      position,
      leverage,
      volume,
      buyPrice,
      sellPrice,
      closeDate,
    };
  }
}
