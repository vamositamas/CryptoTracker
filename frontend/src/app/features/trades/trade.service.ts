import { Injectable, inject, signal } from '@angular/core';
import { CreateTradeDto, EnrichedTrade } from '../../core/models/trade.model';
import { TradeApiService } from './trade-api.service';

/** Adds a transient UI flag for the row-flash animation. Not stored or sent to the API. */
export type TradeWithMeta = EnrichedTrade & { flashNew?: boolean };

@Injectable({ providedIn: 'root' })
export class TradeService {
  private readonly api = inject(TradeApiService);

  readonly trades = signal<TradeWithMeta[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  async loadTrades(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const trades = await this.api.getTrades();
      this.trades.set(trades);
    } catch {
      this.error.set('Failed to load trades. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async createTrade(dto: CreateTradeDto): Promise<void> {
    // Build an optimistic placeholder with the raw fields + transient flash marker
    const optimisticId = crypto.randomUUID();
    const optimistic: TradeWithMeta = {
      id: optimisticId,
      createdAt: new Date().toISOString(),
      holdingDays: 1,
      ...dto,
      // Calculated fields are unknown until server responds — use 0 as placeholder
      investment: 0,
      investmentAll: 0,
      sellValue: 0,
      cost: 0,
      nettoProfit: 0,
      profitPercent: 0,
      profitRealPercent: 0,
      dailyProfitPercent: 0,
      result: 'Win',
      flashNew: true,
    };

    const snapshot = this.trades();
    this.trades.update((ts) => [optimistic, ...ts]);
    this.error.set(null);

    try {
      const saved = await this.api.createTrade(dto);
      // Replace the optimistic record with the real server response (with correct calculated fields)
      this.trades.update((ts) =>
        ts.map((t) => (t.id === optimisticId ? { ...saved, flashNew: true } : t)),
      );
    } catch (err) {
      // Rollback
      this.trades.set(snapshot);
      const message =
        err instanceof Error ? err.message : 'Failed to save trade. Please try again.';
      this.error.set(message);
      throw err;
    }
  }

  async updateTrade(id: string, dto: CreateTradeDto): Promise<void> {
    const snapshot = this.trades();
    const target = snapshot.find((t) => t.id === id);
    if (!target) {
      this.error.set('Trade not found. Please refresh and try again.');
      return;
    }

    this.error.set(null);
    this.trades.update((ts) =>
      ts.map((t) =>
        t.id === id
          ? {
              ...t,
              ...dto,
              holdingDays: 1,
            }
          : t,
      ),
    );

    try {
      const saved = await this.api.updateTrade(id, dto);
      this.trades.update((ts) => ts.map((t) => (t.id === id ? saved : t)));
    } catch (err) {
      this.trades.set(snapshot);
      const message = err instanceof Error ? err.message : 'Failed to update trade. Please try again.';
      this.error.set(message);
      throw err;
    }
  }

  async deleteTrade(id: string): Promise<void> {
    const snapshot = this.trades();
    const target = snapshot.find((t) => t.id === id);
    if (!target) {
      this.error.set('Trade not found. Please refresh and try again.');
      return;
    }

    this.error.set(null);
    this.trades.update((ts) => ts.filter((t) => t.id !== id));

    try {
      await this.api.deleteTrade(id);
    } catch (err) {
      this.trades.set(snapshot);
      const message = err instanceof Error ? err.message : 'Failed to delete trade. Please try again.';
      this.error.set(message);
      throw err;
    }
  }
}
