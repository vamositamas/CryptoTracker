import {
  Component,
  Input,
  OnChanges,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnDestroy,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  Chart,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js';
import { MonthlyData } from '../dashboard.model';

Chart.register(
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
);

@Component({
  selector: 'app-monthly-chart',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './monthly-chart.component.html',
})
export class MonthlyChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() data: MonthlyData[] = [];
  @Input() selectedYear: number | null = null;
  @Input() loading = false;

  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  ngAfterViewInit(): void {
    this.buildChart();
  }

  ngOnChanges(): void {
    if (this.chart) {
      this.updateChart();
    } else if (this.canvasRef) {
      this.buildChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private getLabelsAndData(): { labels: string[]; profitPct: number[]; dailyPct: number[] } {
    const year = this.selectedYear ?? this.inferYear();

    if (year !== null) {
      // Show all 12 months for the selected year
      const labels: string[] = [];
      const profitPct: number[] = [];
      const dailyPct: number[] = [];

      for (let m = 1; m <= 12; m++) {
        labels.push(`${year}.${String(m).padStart(2, '0')}`);
        const row = this.data.find(d => d.year === year && d.month === m);
        profitPct.push(row ? row.profitPercent : 0);
        dailyPct.push(row ? row.totalDailyProfitPercent : 0);
      }
      return { labels, profitPct, dailyPct };
    }

    // All mode — show each month present in data chronologically
    const sorted = [...this.data].sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month,
    );
    return {
      labels: sorted.map(d => `${d.year}.${String(d.month).padStart(2, '0')}`),
      profitPct: sorted.map(d => d.profitPercent),
      dailyPct: sorted.map(d => d.totalDailyProfitPercent),
    };
  }

  private inferYear(): number | null {
    if (this.data.length === 0) return new Date().getFullYear();
    const years = [...new Set(this.data.map(d => d.year))];
    return years.length === 1 ? years[0] : null;
  }

  private buildChart(): void {
    if (!this.canvasRef) return;
    const { labels, profitPct, dailyPct } = this.getLabelsAndData();

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Monthly profit %',
            data: profitPct,
            backgroundColor: 'rgba(134, 239, 172, 0.85)',
            borderColor: 'rgba(74, 222, 128, 1)',
            borderWidth: 1,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line',
            label: 'Average daily profit %',
            data: dailyPct,
            borderColor: 'rgba(249, 115, 22, 1)',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: 'rgba(249, 115, 22, 1)',
            tension: 0.1,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 14, font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toFixed(2)}%`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } },
          },
          y: {
            type: 'linear',
            position: 'left',
            min: 0,
            ticks: {
              font: { size: 11 },
              callback: v => `${v}`,
            },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
          y1: {
            type: 'linear',
            position: 'right',
            min: 0,
            ticks: {
              font: { size: 11 },
              callback: v => `${v}`,
            },
            grid: { drawOnChartArea: false },
          },
        },
      },
    };

    this.chart = new Chart(this.canvasRef.nativeElement, config);
  }

  private updateChart(): void {
    if (!this.chart) return;
    const { labels, profitPct, dailyPct } = this.getLabelsAndData();
    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = profitPct;
    this.chart.data.datasets[1].data = dailyPct;
    this.chart.update();
  }
}
