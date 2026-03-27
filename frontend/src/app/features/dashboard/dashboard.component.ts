import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { DashboardApiService } from './dashboard-api.service';
import { DashboardOverview, KpiData, MonthlyData } from './dashboard.model';
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

  private readonly weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  readonly overview = signal<DashboardOverview | null>(null);
  readonly availableYears = signal<number[]>([]);
  readonly viewMode = signal<'all' | 'year'>('all');
  readonly selectedYear = signal<number | null>(null);

  readonly kpis = signal<KpiData | null>(null);
  readonly monthly = signal<MonthlyData[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly split = computed(() => this.overview()?.split ?? {
    winTrades: 0,
    lossTrades: 0,
    shortTrades: 0,
    longTrades: 0,
  });

  readonly tokenStats = computed(() => this.overview()?.tokenStats ?? []);
  readonly weekdayStats = computed(() => {
    const rows = this.overview()?.weekdayStats ?? [];
    return [...rows].sort((a, b) => this.weekdayOrder.indexOf(a.weekday) - this.weekdayOrder.indexOf(b.weekday));
  });

  readonly winLossRatioDisplay = computed(() => {
    const split = this.split();
    if (split.lossTrades === 0) return split.winTrades > 0 ? `${split.winTrades}:0` : '0:0';
    return `${split.winTrades}:${split.lossTrades}`;
  });

  readonly shortLongRatioDisplay = computed(() => {
    const split = this.split();
    return `${split.shortTrades}:${split.longTrades}`;
  });

  readonly averageProfitPercentDisplay = computed(() => {
    const value = this.overview()?.kpis.averageProfitPercent ?? 0;
    return `${value.toFixed(2)}%`;
  });

  readonly averageDailyProfitPercentDisplay = computed(() => {
    const value = this.overview()?.kpis.averageDailyProfitPercent ?? 0;
    return `${value.toFixed(2)}%`;
  });

  readonly maxDailyProfitPercentDisplay = computed(() => {
    const value = this.overview()?.kpis.maxDailyProfitPercent;
    return value === null || value === undefined ? '0.00%' : `${value.toFixed(2)}%`;
  });

  readonly minDailyProfitPercentDisplay = computed(() => {
    const value = this.overview()?.kpis.minDailyProfitPercent;
    return value === null || value === undefined ? '0.00%' : `${value.toFixed(2)}%`;
  });

  readonly maxProfitByTradePercentDisplay = computed(() => {
    const value = this.overview()?.kpis.maxProfitByTradePercent;
    return value === null || value === undefined ? '0.00%' : `${value.toFixed(2)}%`;
  });

  readonly maxLossByTradePercentDisplay = computed(() => {
    const value = this.overview()?.kpis.maxLossByTradePercent;
    return value === null || value === undefined ? '0.00%' : `${value.toFixed(2)}%`;
  });

  readonly totalProfitPercentDisplay = computed(() => {
    const value = this.overview()?.kpis.totalProfitPercent ?? 0;
    return `${value.toFixed(2)}%`;
  });

  readonly bestToken = computed(() => this.tokenStats().at(0) ?? null);
  readonly selectedYearValue = computed(() => {
    const year = this.selectedYear();
    return year === null ? '' : String(year);
  });

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
    await this.loadOverview();
  }

  async onViewModeChange(mode: 'all' | 'year'): Promise<void> {
    this.viewMode.set(mode);
    if (mode === 'all') {
      this.selectedYear.set(null);
      await this.loadOverview();
      return;
    }

    const year = this.selectedYear() ?? this.availableYears().at(-1) ?? null;
    this.selectedYear.set(year);
    await this.loadOverview();
  }

  async onYearChange(rawYear: string): Promise<void> {
    const parsed = Number.parseInt(rawYear, 10);
    if (!Number.isFinite(parsed)) {
      return;
    }

    this.selectedYear.set(parsed);
    if (this.viewMode() === 'year') {
      await this.loadOverview();
    }
  }

  weekdayBarWidth(tradeCount: number): string {
    const max = Math.max(...this.weekdayStats().map((row) => row.tradeCount), 1);
    return `${Math.max((tradeCount / max) * 100, 4)}%`;
  }

  tokenBarWidth(netProfit: number): string {
    const max = Math.max(...this.tokenStats().map((row) => Math.abs(row.netProfit)), 1);
    return `${Math.max((Math.abs(netProfit) / max) * 100, 4)}%`;
  }

  private async loadOverview(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const year = this.viewMode() === 'year' ? this.selectedYear() ?? undefined : undefined;
      const overview = await this.api.getOverview(year);

      this.overview.set(overview);
      this.kpis.set(overview.kpis);
      this.monthly.set(overview.monthly);

      const years = Array.from(new Set(overview.monthly.map((row) => row.year))).sort((a, b) => a - b);
      if (this.viewMode() === 'all') {
        this.availableYears.set(years);
      }

      if (this.viewMode() === 'year' && this.selectedYear() === null && years.length > 0) {
        this.selectedYear.set(years.at(-1) ?? null);
      }
    } catch {
      this.error.set('dashboard.errors.loadFailed');
    } finally {
      this.loading.set(false);
    }
  }
}

