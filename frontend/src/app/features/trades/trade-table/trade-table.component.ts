import { Component, input, output } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { TradeWithMeta } from '../trade.service';

export type { TradeWithMeta };

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

  onNewTrade(): void {
    this.newTrade.emit();
  }
}
