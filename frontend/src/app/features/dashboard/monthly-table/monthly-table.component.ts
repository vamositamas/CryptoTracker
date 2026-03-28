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

  readonly pageSize = 5;
  currentPage = 1;

  get sortedData(): MonthlyData[] {
    return [...this.data].sort((a, b) =>
      a.year !== b.year ? b.year - a.year : b.month - a.month,
    );
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.sortedData.length / this.pageSize));
  }

  get pagedData(): MonthlyData[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedData.slice(start, start + this.pageSize);
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  // globalIndex is position in sortedData (descending); delta = current - previous month
  deltaPercent(globalIndex: number): number {
    const sorted = this.sortedData;
    const current = sorted[globalIndex]?.profitPercent ?? 0;
    const prev = sorted[globalIndex + 1]?.profitPercent;
    return prev === undefined ? current : current - prev;
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
