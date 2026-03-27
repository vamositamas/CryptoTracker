import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { DashboardApiService } from './dashboard-api.service';
import { KpiData, MonthlyData } from './dashboard.model';
import { KpiCardComponent } from './kpi-card/kpi-card.component';
import { MonthlyTableComponent } from './monthly-table/monthly-table.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, TranslatePipe, KpiCardComponent, MonthlyTableComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(DashboardApiService);

  readonly kpis = signal<KpiData | null>(null);
  readonly monthly = signal<MonthlyData[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly isEmpty = computed(() => {
    const k = this.kpis();
    return k !== null && k.totalTrades === 0;
  });

  readonly totalTradesDisplay = computed(() => {
    const k = this.kpis();
    return k ? String(k.totalTrades) : '';
  });

  readonly totalNetProfitDisplay = computed(() => {
    const k = this.kpis();
    return k ? k.totalNetProfit.toFixed(2) : '';
  });

  readonly totalNetProfitColor = computed(() => {
    const k = this.kpis();
    if (!k) return 'neutral';
    if (k.totalNetProfit > 0) return 'positive';
    if (k.totalNetProfit < 0) return 'negative';
    return 'neutral';
  });

  readonly bestSingleTradeDisplay = computed(() => {
    const k = this.kpis();
    if (!k || k.bestSingleTrade === null) return '-';
    return k.bestSingleTrade.toFixed(2);
  });

  readonly winRateDisplay = computed(() => {
    const k = this.kpis();
    return k ? `${(k.winRate * 100).toFixed(1)}%` : '';
  });

  readonly winRateColor = computed(() => {
    const k = this.kpis();
    if (!k) return 'neutral';
    return k.winRate >= 0.5 ? 'positive' : 'negative';
  });

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [kpis, monthly] = await Promise.all([
        this.api.getKpis(),
        this.api.getMonthly(),
      ]);
      this.kpis.set(kpis);
      this.monthly.set(monthly);
    } catch {
      this.error.set('dashboard.errors.loadFailed');
    } finally {
      this.loading.set(false);
    }
  }
}

