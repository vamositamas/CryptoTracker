import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ChartColors {
  bar: string;
  line: string;
}

export interface DashboardColors {
  tradeSplitWin: string;
  tradeSplitShort: string;
  weekdayBar: string;
}

interface PreferencesResponse {
  preferences: {
    chartColors?: { bar?: string; line?: string };
    dashboardColors?: {
      tradeSplitWin?: string;
      tradeSplitShort?: string;
      weekdayBar?: string;
    };
  };
}

const DEFAULTS: ChartColors = {
  bar: '#86efac',
  line: '#f97316',
};

const DASHBOARD_DEFAULTS: DashboardColors = {
  tradeSplitWin: '#10b981',
  tradeSplitShort: '#3b82f6',
  weekdayBar: '#3b82f6',
};

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly http = inject(HttpClient);

  readonly chartColors = signal<ChartColors>({ ...DEFAULTS });
  readonly dashboardColors = signal<DashboardColors>({ ...DASHBOARD_DEFAULTS });

  async load(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<PreferencesResponse>('/api/v1/preferences'));
      const saved = res.preferences.chartColors;
      const dashboard = res.preferences.dashboardColors;
      this.chartColors.set({
        bar: saved?.bar ?? DEFAULTS.bar,
        line: saved?.line ?? DEFAULTS.line,
      });
      this.dashboardColors.set({
        tradeSplitWin: dashboard?.tradeSplitWin ?? DASHBOARD_DEFAULTS.tradeSplitWin,
        tradeSplitShort: dashboard?.tradeSplitShort ?? DASHBOARD_DEFAULTS.tradeSplitShort,
        weekdayBar: dashboard?.weekdayBar ?? DASHBOARD_DEFAULTS.weekdayBar,
      });
    } catch {
      // keep defaults if not yet saved or request fails
    }
  }

  async saveChartColors(colors: ChartColors): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.put<PreferencesResponse>('/api/v1/preferences', { chartColors: colors }),
      );
      const saved = res.preferences.chartColors;
      this.chartColors.set({
        bar: saved?.bar ?? colors.bar,
        line: saved?.line ?? colors.line,
      });
    } catch {
      // silently ignore — colors remain applied in memory
    }
  }

  async saveDashboardColors(colors: DashboardColors): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.put<PreferencesResponse>('/api/v1/preferences', { dashboardColors: colors }),
      );
      const saved = res.preferences.dashboardColors;
      this.dashboardColors.set({
        tradeSplitWin: saved?.tradeSplitWin ?? colors.tradeSplitWin,
        tradeSplitShort: saved?.tradeSplitShort ?? colors.tradeSplitShort,
        weekdayBar: saved?.weekdayBar ?? colors.weekdayBar,
      });
    } catch {
      // silently ignore — colors remain applied in memory
    }
  }
}
