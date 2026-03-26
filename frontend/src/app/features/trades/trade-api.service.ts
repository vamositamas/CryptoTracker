import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CreateTradeDto, EnrichedTrade, ApiError } from '../../core/models/trade.model';

export class TradeApiError extends Error {
  constructor(
    public readonly apiError: ApiError,
    public readonly status: number,
  ) {
    super(apiError.message);
    this.name = 'TradeApiError';
  }
}

@Injectable({ providedIn: 'root' })
export class TradeApiService {
  private readonly http = inject(HttpClient);

  async getTrades(): Promise<EnrichedTrade[]> {
    const res = await firstValueFrom(
      this.http.get<{ trades: EnrichedTrade[]; total: number }>('/api/v1/trades'),
    );
    return res.trades;
  }

  async createTrade(dto: CreateTradeDto): Promise<EnrichedTrade> {
    try {
      return await firstValueFrom(
        this.http.post<EnrichedTrade>('/api/v1/trades', dto),
      );
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.error?.error) {
        throw new TradeApiError(err.error.error as ApiError, err.status);
      }
      throw err;
    }
  }

  async updateTrade(id: string, dto: CreateTradeDto): Promise<EnrichedTrade> {
    try {
      return await firstValueFrom(
        this.http.put<EnrichedTrade>(`/api/v1/trades/${id}`, dto),
      );
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.error?.error) {
        throw new TradeApiError(err.error.error as ApiError, err.status);
      }
      throw err;
    }
  }
}
