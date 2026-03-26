import { Component, Input } from '@angular/core';

type KpiColorVariant = 'neutral' | 'positive' | 'negative';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [],
  templateUrl: './kpi-card.component.html',
})
export class KpiCardComponent {
  @Input() label = '';
  @Input() value: string | number | null = null;
  @Input() colorVariant: KpiColorVariant = 'neutral';
  @Input() loading = false;

  get valueColorClass(): string {
    switch (this.colorVariant) {
      case 'positive': return 'text-emerald-600';
      case 'negative': return 'text-red-600';
      case 'neutral': return 'text-gray-900';
    }
  }
}
