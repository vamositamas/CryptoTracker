import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MonthlyData } from '../dashboard.model';

@Component({
  selector: 'app-monthly-table',
  standalone: true,
  imports: [TranslatePipe, NgClass],
  templateUrl: './monthly-table.component.html',
})
export class MonthlyTableComponent {
  @Input() data: MonthlyData[] = [];
  @Input() loading = false;

  deltaPercent(index: number): number {
    if (index === 0) return this.data[0]?.profitPercent ?? 0;
    return (this.data[index]?.profitPercent ?? 0) - (this.data[index - 1]?.profitPercent ?? 0);
  }

  get currentMonth(): number {
    return new Date().getMonth() + 1;
  }

  get currentYear(): number {
    return new Date().getFullYear();
  }

  isCurrentMonth(row: MonthlyData): boolean {
    return row.year === this.currentYear && row.month === this.currentMonth;
  }

  formatMonth(month: number, year: number): string {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  }

  formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  formatCurrency(value: number): string {
    return value.toFixed(2);
  }

  profitColorClass(value: number): string {
    if (value > 0) return 'text-emerald-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-900';
  }

  winRateColorClass(value: number): string {
    return value >= 0.5 ? 'text-emerald-600' : 'text-red-600';
  }
}
