import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { TradeWithMeta } from '../trade.service';

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

  readonly newTrade = output<void>();

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
}
