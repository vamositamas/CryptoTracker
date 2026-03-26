import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { DashboardApiService } from './dashboard-api.service';
import { KpiData, MonthlyData } from './dashboard.model';
import { provideRouter } from '@angular/router';
import { ComponentFixture } from '@angular/core/testing';

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
  { year: 2024, month: 2, tradeCount: 5, netProfit: 3000, winRate: 0.8 },
];

describe('DashboardComponent', () => {
  let apiMock: { getKpis: ReturnType<typeof vi.fn>; getMonthly: ReturnType<typeof vi.fn> };

  const createComponent = (): ComponentFixture<DashboardComponent> =>
    TestBed.createComponent(DashboardComponent);

  const setLoadedState = (
    fixture: ComponentFixture<DashboardComponent>,
    kpis: KpiData = MOCK_KPI,
    monthly: MonthlyData[] = MOCK_MONTHLY,
  ): void => {
    vi.spyOn(DashboardComponent.prototype, 'ngOnInit').mockResolvedValue(undefined);
    fixture.componentInstance.kpis.set(kpis);
    fixture.componentInstance.monthly.set(monthly);
    fixture.componentInstance.loading.set(false);
    fixture.componentInstance.error.set(null);
    TestBed.flushEffects();
    fixture.detectChanges();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    apiMock = {
      getKpis: vi.fn().mockResolvedValue(MOCK_KPI),
      getMonthly: vi.fn().mockResolvedValue(MOCK_MONTHLY),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: DashboardApiService, useValue: apiMock },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it('loads KPIs and monthly data on init', async () => {
    const component = TestBed.runInInjectionContext(() => new DashboardComponent());

    await component.ngOnInit();

    expect(apiMock.getKpis).toHaveBeenCalledOnce();
    expect(apiMock.getMonthly).toHaveBeenCalledOnce();
    expect(component.kpis()).toEqual(MOCK_KPI);
    expect(component.monthly()).toEqual(MOCK_MONTHLY);
  });

  it('marks the dashboard as empty when totalTrades is 0', async () => {
    apiMock.getKpis.mockResolvedValue(MOCK_KPI_EMPTY);
    apiMock.getMonthly.mockResolvedValue([]);

    const component = TestBed.runInInjectionContext(() => new DashboardComponent());

    await component.ngOnInit();

    expect(component.isEmpty()).toBe(true);
    expect(component.monthly()).toEqual([]);
  });

  it('stores an error message on API failure', async () => {
    apiMock.getKpis.mockRejectedValue(new Error('Network error'));

    const component = TestBed.runInInjectionContext(() => new DashboardComponent());

    await component.ngOnInit();

    expect(component.error()).toBe('Failed to load dashboard data. Please try again.');
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

  it('displays "—" for bestSingleTrade when null', () => {
    const fixture = createComponent();

    fixture.componentInstance.kpis.set({ ...MOCK_KPI, bestSingleTrade: null });

    expect(fixture.componentInstance.bestSingleTradeDisplay()).toBe('—');
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
});
