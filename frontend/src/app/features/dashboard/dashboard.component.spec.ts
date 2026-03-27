import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { DashboardApiService } from './dashboard-api.service';
import { DashboardOverview, KpiData, MonthlyData } from './dashboard.model';
import { provideRouter } from '@angular/router';
import { ComponentFixture } from '@angular/core/testing';
import { provideTranslateTesting } from '../../../testing/translate-test.providers';

const MOCK_KPI: KpiData = {
  totalTrades: 10,
  totalNetProfit: 5000,
  bestSingleTrade: 2500,
  winRate: 0.7,
};

const MOCK_KPI_EMPTY: KpiData = {
  totalTrades: 0,
  totalNetProfit: 0,
  bestSingleTrade: null,
  winRate: 0,
};

const MOCK_MONTHLY: MonthlyData[] = [
  { year: 2024, month: 1, tradeCount: 5, netProfit: 2000, winRate: 0.6 },
  { year: 2025, month: 2, tradeCount: 5, netProfit: 3000, winRate: 0.8 },
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
  tokenStats: [
    { token: 'BTC', tradeCount: 6, netProfit: 3000, averageProfitPercent: 6, winRate: 0.66 },
    { token: 'ETH', tradeCount: 4, netProfit: 2000, averageProfitPercent: 4, winRate: 0.75 },
  ],
  weekdayStats: [
    { weekday: 'Monday', tradeCount: 3, netProfit: 1200 },
    { weekday: 'Tuesday', tradeCount: 7, netProfit: 3800 },
  ],
};

const MOCK_OVERVIEW_EMPTY: DashboardOverview = {
  ...MOCK_OVERVIEW,
  kpis: {
    ...MOCK_OVERVIEW.kpis,
    ...MOCK_KPI_EMPTY,
  },
  split: {
    winTrades: 0,
    lossTrades: 0,
    shortTrades: 0,
    longTrades: 0,
  },
  monthly: [],
  tokenStats: [],
  weekdayStats: [],
};

describe('DashboardComponent', () => {
  let apiMock: { getOverview: ReturnType<typeof vi.fn> };

  const createComponent = (): ComponentFixture<DashboardComponent> =>
    TestBed.createComponent(DashboardComponent);

  const setLoadedState = (
    fixture: ComponentFixture<DashboardComponent>,
    overview: DashboardOverview = MOCK_OVERVIEW,
  ): void => {
    vi.spyOn(DashboardComponent.prototype, 'ngOnInit').mockResolvedValue(undefined);
    fixture.componentInstance.overview.set(overview);
    fixture.componentInstance.kpis.set(overview.kpis);
    fixture.componentInstance.monthly.set(overview.monthly);
    fixture.componentInstance.loading.set(false);
    fixture.componentInstance.error.set(null);
    TestBed.flushEffects();
    fixture.detectChanges();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    apiMock = {
      getOverview: vi.fn().mockResolvedValue(MOCK_OVERVIEW),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: DashboardApiService, useValue: apiMock },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it('loads overview data on init', async () => {
    const component = TestBed.runInInjectionContext(() => new DashboardComponent());

    await component.ngOnInit();

    expect(apiMock.getOverview).toHaveBeenCalledWith(undefined);
    expect(component.kpis()).toEqual(MOCK_OVERVIEW.kpis);
    expect(component.monthly()).toEqual(MOCK_MONTHLY);
    expect(component.availableYears()).toEqual([2024, 2025]);
  });

  it('marks the dashboard as empty when totalTrades is 0', async () => {
    apiMock.getOverview.mockResolvedValue(MOCK_OVERVIEW_EMPTY);

    const component = TestBed.runInInjectionContext(() => new DashboardComponent());

    await component.ngOnInit();

    expect(component.isEmpty()).toBe(true);
    expect(component.monthly()).toEqual([]);
  });

  it('stores an error message on API failure', async () => {
    apiMock.getOverview.mockRejectedValue(new Error('Network error'));

    const component = TestBed.runInInjectionContext(() => new DashboardComponent());

    await component.ngOnInit();

    expect(component.error()).toBe('dashboard.errors.loadFailed');
    expect(component.loading()).toBe(false);
  });

  it('computes totalNetProfitColor as positive for profit > 0', () => {
    const fixture = createComponent();

    fixture.componentInstance.kpis.set(MOCK_KPI);

    expect(fixture.componentInstance.totalNetProfitColor()).toBe('positive');
  });

  it('computes totalNetProfitColor as negative for profit < 0', () => {
    const fixture = createComponent();

    fixture.componentInstance.kpis.set({ ...MOCK_KPI, totalNetProfit: -1000 });

    expect(fixture.componentInstance.totalNetProfitColor()).toBe('negative');
  });

  it('computes winRateColor as positive for winRate >= 0.5', () => {
    const fixture = createComponent();

    fixture.componentInstance.kpis.set(MOCK_KPI);

    expect(fixture.componentInstance.winRateColor()).toBe('positive');
  });

  it('computes winRateColor as negative for winRate < 0.5', () => {
    const fixture = createComponent();

    fixture.componentInstance.kpis.set({ ...MOCK_KPI, winRate: 0.3 });

    expect(fixture.componentInstance.winRateColor()).toBe('negative');
  });

  it('displays winRate as percentage string', () => {
    const fixture = createComponent();

    fixture.componentInstance.kpis.set(MOCK_KPI);

    expect(fixture.componentInstance.winRateDisplay()).toBe('70.0%');
  });

  it('displays "-" for bestSingleTrade when null', () => {
    const fixture = createComponent();

    fixture.componentInstance.kpis.set({ ...MOCK_KPI, bestSingleTrade: null });

    expect(fixture.componentInstance.bestSingleTradeDisplay()).toBe('-');
  });

  it('renders 4 KPI cards when data is loaded', () => {
    const fixture = createComponent();

    setLoadedState(fixture);

    const el: HTMLElement = fixture.nativeElement;
    const cards = el.querySelectorAll('app-kpi-card');
    expect(cards.length).toBe(4);
  });

  it('renders monthly table when data is loaded', () => {
    const fixture = createComponent();

    setLoadedState(fixture);

    const el: HTMLElement = fixture.nativeElement;
    const table = el.querySelector('app-monthly-table');
    expect(table).toBeTruthy();
  });

  it('computes ratio and percentage displays from overview data', () => {
    const fixture = createComponent();

    setLoadedState(fixture);

    expect(fixture.componentInstance.winLossRatioDisplay()).toBe('7:3');
    expect(fixture.componentInstance.shortLongRatioDisplay()).toBe('4:6');
    expect(fixture.componentInstance.totalProfitPercentDisplay()).toBe('50.00%');
    expect(fixture.componentInstance.averageProfitPercentDisplay()).toBe('5.00%');
  });

  it('switches to selected-year mode and requests filtered overview', async () => {
    const yearOverview: DashboardOverview = {
      ...MOCK_OVERVIEW,
      monthly: [{ year: 2025, month: 2, tradeCount: 5, netProfit: 3000, winRate: 0.8 }],
    };
    apiMock.getOverview
      .mockResolvedValueOnce(MOCK_OVERVIEW)
      .mockResolvedValueOnce(yearOverview);

    const component = TestBed.runInInjectionContext(() => new DashboardComponent());
    await component.ngOnInit();
    await component.onViewModeChange('year');

    expect(component.viewMode()).toBe('year');
    expect(component.selectedYear()).toBe(2025);
    expect(apiMock.getOverview).toHaveBeenLastCalledWith(2025);
  });

  it('reloads year view when selected year changes', async () => {
    const component = TestBed.runInInjectionContext(() => new DashboardComponent());
    await component.ngOnInit();

    apiMock.getOverview.mockResolvedValueOnce(MOCK_OVERVIEW);
    await component.onViewModeChange('year');

    apiMock.getOverview.mockResolvedValueOnce(MOCK_OVERVIEW);
    await component.onYearChange('2024');

    expect(component.selectedYear()).toBe(2024);
    expect(apiMock.getOverview).toHaveBeenLastCalledWith(2024);
  });
});
