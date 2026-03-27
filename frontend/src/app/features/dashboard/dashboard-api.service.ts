import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DashboardOverview, KpiData, MonthlyData } from './dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);

  async getKpis(): Promise<KpiData> {
    return await firstValueFrom(
      this.http.get<KpiData>('/api/v1/dashboard/kpis'),
    );
  }

  async getMonthly(): Promise<MonthlyData[]> {
    return await firstValueFrom(
      this.http.get<MonthlyData[]>('/api/v1/dashboard/monthly'),
    );
  }

  async getOverview(year?: number): Promise<DashboardOverview> {
    const params = year === undefined ? undefined : new HttpParams().set('year', String(year));
    return await firstValueFrom(
      this.http.get<DashboardOverview>('/api/v1/dashboard/overview', { params }),
    );
  }
}
