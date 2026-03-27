import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AuditApiService } from './audit-api.service';
import { AuditEntry, AuditFilterState } from './audit.model';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './audit.component.html',
})
export class AuditComponent implements OnInit {
  private readonly api = inject(AuditApiService);

  readonly entries = signal<AuditEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly filterState = signal<AuditFilterState>({ action: '', dateFrom: '', dateTo: '' });

  readonly filteredEntries = computed(() => {
    const list = this.entries();
    const f = this.filterState();
    return list.filter((e) => {
      if (f.action && e.action !== f.action) return false;
      // compare ISO date prefix (YYYY-MM-DD) against filter dates
      const entryDate = e.timestamp.slice(0, 10);
      if (f.dateFrom && entryDate < f.dateFrom) return false;
      if (f.dateTo && entryDate > f.dateTo) return false;
      return true;
    });
  });

  readonly hasActiveFilters = computed(() => {
    const f = this.filterState();
    return !!(f.action || f.dateFrom || f.dateTo);
  });

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const entries = await this.api.getEntries();
      // Most-recent first
      this.entries.set([...entries].reverse());
    } catch {
      this.error.set('audit.errors.loadFailed');
    } finally {
      this.loading.set(false);
    }
  }

  onFilterChange(patch: Partial<AuditFilterState>): void {
    this.filterState.update((prev) => ({ ...prev, ...patch }));
  }

  resetFilters(): void {
    this.filterState.set({ action: '', dateFrom: '', dateTo: '' });
  }

  formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      // For trade objects, show a compact summary
      if ('position' in obj && 'type' in obj) {
        return [obj['position'], obj['tradePosition'], obj['type']]
          .filter((part) => typeof part === 'string' && part.trim() !== '')
          .join(' ');
      }
      return JSON.stringify(value);
    }
    return String(value);
  }

  actionBadgeClass(action: AuditEntry['action']): string {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
    }
  }
}

