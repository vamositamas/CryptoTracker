import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { TradeService } from './trade.service';
import { TradeFormComponent } from './trade-form/trade-form.component';
import { TradeTableComponent } from './trade-table/trade-table.component';

@Component({
  selector: 'app-trades',
  standalone: true,
  imports: [TradeFormComponent, TradeTableComponent],
  templateUrl: './trades.component.html',
})
export class TradesComponent implements OnInit {
  private readonly tradeService = inject(TradeService);

  readonly trades = this.tradeService.trades;
  readonly loading = this.tradeService.loading;

  readonly showForm = signal(false);

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

  @HostListener('document:keydown.n', ['$event'])
  onKeyN(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }
    this.openForm();
  }
}
