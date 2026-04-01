import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ChartColors {
  bar: string;
  line: string;
}

interface PreferencesResponse {
  preferences: {
    chartColors?: { bar?: string; line?: string };
  };
}

const DEFAULTS: ChartColors = {
  bar: '#86efac',
  line: '#f97316',
};

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly http = inject(HttpClient);

  readonly chartColors = signal<ChartColors>({ ...DEFAULTS });

  async load(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<PreferencesResponse>('/api/v1/preferences'));
      const saved = res.preferences.chartColors;
      this.chartColors.set({
        bar: saved?.bar ?? DEFAULTS.bar,
        line: saved?.line ?? DEFAULTS.line,
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
}
