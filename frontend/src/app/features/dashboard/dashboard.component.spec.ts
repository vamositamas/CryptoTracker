import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { DashboardApiService } from './dashboard-api.service';
import { KpiData, MonthlyData } from './dashboard.model';
import { provideRouter } from '@angular/router';

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
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(apiMock.getKpis).toHaveBeenCalledOnce();
    expect(apiMock.getMonthly).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.kpis()).toEqual(MOCK_KPI);
    expect(fixture.componentInstance.monthly()).toEqual(MOCK_MONTHLY);
  });

  it('shows empty state when totalTrades is 0', async () => {
    apiMock.getKpis.mockResolvedValue(MOCK_KPI_EMPTY);
    apiMock.getMonthly.mockResolvedValue([]);

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges(); // Final render with signal values

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No trades yet');
  });

  it('shows error message on API failure', async () => {
    apiMock.getKpis.mockRejectedValue(new Error('Network error'));

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges(); // Final render with signal values

    expect(fixture.componentInstance.error()).toBeTruthy();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Failed to load dashboard data');
  });

  it('computes totalNetProfitColor as positive for profit > 0', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.totalNetProfitColor()).toBe('positive');
  });

  it('computes totalNetProfitColor as negative for profit < 0', async () => {
    // Create a fresh test module with negative profit mock
    const negativeMock = {
      getKpis: vi.fn().mockResolvedValue({ ...MOCK_KPI, totalNetProfit: -1000 }),
      getMonthly: vi.fn().mockResolvedValue(MOCK_MONTHLY),
    };

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: DashboardApiService, useValue: negativeMock },
        provideRouter([]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.totalNetProfitColor()).toBe('negative');
  });

  it('computes winRateColor as positive for winRate >= 0.5', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.winRateColor()).toBe('positive');
  });

  it('computes winRateColor as negative for winRate < 0.5', async () => {
    // Create a fresh test module with low win rate mock
    const lowWinRateMock = {
      getKpis: vi.fn().mockResolvedValue({ ...MOCK_KPI, winRate: 0.3 }),
      getMonthly: vi.fn().mockResolvedValue(MOCK_MONTHLY),
    };

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: DashboardApiService, useValue: lowWinRateMock },
        provideRouter([]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.winRateColor()).toBe('negative');
  });

  it('displays winRate as percentage string', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.winRateDisplay()).toBe('70.0%');
  });

  it('displays "—" for bestSingleTrade when null', async () => {
    // Create a fresh test module with null bestSingleTrade
    const nullBestTradeMock = {
      getKpis: vi.fn().mockResolvedValue({ ...MOCK_KPI, bestSingleTrade: null }),
      getMonthly: vi.fn().mockResolvedValue(MOCK_MONTHLY),
    };

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: DashboardApiService, useValue: nullBestTradeMock },
        provideRouter([]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.bestSingleTradeDisplay()).toBe('—');
  });

  it('renders 4 KPI cards when data is loaded', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    const el: HTMLElement =fixture.nativeElement;
    const cards = el.querySelectorAll('app-kpi-card');
    expect(cards.length).toBe(4);
  });

  it('renders monthly table when data is loaded', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    const table = el.querySelector('app-monthly-table');
    expect(table).toBeTruthy();
  });
});
