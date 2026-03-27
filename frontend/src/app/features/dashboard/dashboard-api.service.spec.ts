import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DashboardApiService } from './dashboard-api.service';
import { DashboardOverview, KpiData, MonthlyData } from './dashboard.model';

const MOCK_KPI: KpiData = {
  totalTrades: 10,
  totalNetProfit: 5000,
  bestSingleTrade: 2500,
  winRate: 0.7,
};

const MOCK_MONTHLY: MonthlyData[] = [
  { year: 2024, month: 1, tradeCount: 5, netProfit: 2000, winRate: 0.6 },
  { year: 2024, month: 2, tradeCount: 5, netProfit: 3000, winRate: 0.8 },
];

const MOCK_OVERVIEW: DashboardOverview = {
  kpis: {
    ...MOCK_KPI,
    worstSingleTrade: -500,
    totalProfitPercent: 50,
    averageProfitPercent: 5,
    averageDailyProfitPercent: 2.5,
    maxDailyProfitPercent: 9.5,
    minDailyProfitPercent: -3.25,
    maxProfitByTradePercent: 12.5,
    maxLossByTradePercent: -4.4,
  },
  split: {
    winTrades: 7,
    lossTrades: 3,
    shortTrades: 4,
    longTrades: 6,
  },
  monthly: MOCK_MONTHLY,
  tokenStats: [],
  weekdayStats: [],
};

describe('DashboardApiService', () => {
  let service: DashboardApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    vi.restoreAllMocks();
  });

  it('fetches KPI data from GET /api/v1/dashboard/kpis', async () => {
    const promise = service.getKpis();
    httpTesting.expectOne('/api/v1/dashboard/kpis').flush(MOCK_KPI);
    const result = await promise;
    expect(result).toEqual(MOCK_KPI);
  });

  it('fetches monthly data from GET /api/v1/dashboard/monthly', async () => {
    const promise = service.getMonthly();
    httpTesting.expectOne('/api/v1/dashboard/monthly').flush(MOCK_MONTHLY);
    const result = await promise;
    expect(result).toEqual(MOCK_MONTHLY);
  });

  it('returns empty array when monthly endpoint returns []', async () => {
    const promise = service.getMonthly();
    httpTesting.expectOne('/api/v1/dashboard/monthly').flush([]);
    const result = await promise;
    expect(result).toHaveLength(0);
  });

  it('fetches overview data from GET /api/v1/dashboard/overview', async () => {
    const promise = service.getOverview();
    httpTesting.expectOne('/api/v1/dashboard/overview').flush(MOCK_OVERVIEW);
    const result = await promise;
    expect(result).toEqual(MOCK_OVERVIEW);
  });

  it('fetches year-filtered overview data with query parameter', async () => {
    const promise = service.getOverview(2025);
    const req = httpTesting.expectOne((request) =>
      request.url === '/api/v1/dashboard/overview' && request.params.get('year') === '2025',
    );
    req.flush(MOCK_OVERVIEW);
    const result = await promise;
    expect(result).toEqual(MOCK_OVERVIEW);
  });
});
