import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MonthlyTableComponent } from './monthly-table.component';
import { MonthlyData } from '../dashboard.model';
import { provideTranslateTesting } from '../../../../testing/translate-test.providers';

const MOCK_DATA: MonthlyData[] = [
  { year: 2024, month: 1, tradeCount: 5, netProfit: 2000, winRate: 0.6 },
  { year: 2024, month: 2, tradeCount: 3, netProfit: -500, winRate: 0.33 },
];

describe('MonthlyTableComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonthlyTableComponent],
      providers: [...provideTranslateTesting()],
    }).compileComponents();
  });

  it('renders table with monthly data rows', () => {
    const fixture = TestBed.createComponent(MonthlyTableComponent);
    fixture.componentInstance.data = MOCK_DATA;
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('shows empty state when data is empty', () => {
    const fixture = TestBed.createComponent(MonthlyTableComponent);
    fixture.componentInstance.data = [];
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No monthly data available yet');
  });

  it('shows loading skeleton when loading=true', () => {
    const fixture = TestBed.createComponent(MonthlyTableComponent);
    fixture.componentInstance.loading = true;
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const skeleton = el.querySelector('.animate-pulse');
    expect(skeleton).toBeTruthy();
  });

  it('formats month correctly', () => {
    const fixture = TestBed.createComponent(MonthlyTableComponent);
    const comp = fixture.componentInstance;
    expect(comp.formatMonth(1, 2024)).toContain('Jan');
    expect(comp.formatMonth(1, 2024)).toContain('2024');
  });

  it('formats percent correctly', () => {
    const fixture = TestBed.createComponent(MonthlyTableComponent);
    const comp = fixture.componentInstance;
    expect(comp.formatPercent(0.725)).toBe('72.5%');
  });

  it('formats currency correctly', () => {
    const fixture = TestBed.createComponent(MonthlyTableComponent);
    const comp = fixture.componentInstance;
    expect(comp.formatCurrency(1234.567)).toBe('1234.57');
  });

  it('applies positive profit color for profit > 0', () => {
    const fixture = TestBed.createComponent(MonthlyTableComponent);
    const comp = fixture.componentInstance;
    expect(comp.profitColorClass(1000)).toBe('text-emerald-600');
  });

  it('applies negative profit color for profit < 0', () => {
    const fixture = TestBed.createComponent(MonthlyTableComponent);
    const comp = fixture.componentInstance;
    expect(comp.profitColorClass(-500)).toBe('text-red-600');
  });

  it('applies positive win rate color for winRate >= 0.5', () => {
    const fixture = TestBed.createComponent(MonthlyTableComponent);
    const comp = fixture.componentInstance;
    expect(comp.winRateColorClass(0.5)).toBe('text-emerald-600');
    expect(comp.winRateColorClass(0.8)).toBe('text-emerald-600');
  });

  it('applies negative win rate color for winRate < 0.5', () => {
    const fixture = TestBed.createComponent(MonthlyTableComponent);
    const comp = fixture.componentInstance;
    expect(comp.winRateColorClass(0.3)).toBe('text-red-600');
  });

  it('highlights current month row', () => {
    const fixture = TestBed.createComponent(MonthlyTableComponent);
    const comp = fixture.componentInstance;
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const currentRow: MonthlyData = { year: currentYear, month: currentMonth, tradeCount: 5, netProfit: 100, winRate: 0.6 };
    const pastRow: MonthlyData = { year: 2020, month: 1, tradeCount: 3, netProfit: 50, winRate: 0.5 };

    expect(comp.isCurrentMonth(currentRow)).toBe(true);
    expect(comp.isCurrentMonth(pastRow)).toBe(false);
  });
});
