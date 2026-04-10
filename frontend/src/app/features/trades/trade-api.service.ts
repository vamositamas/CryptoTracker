import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CreateTradeDto, EnrichedTrade, ApiError, TradeImportResponse, TradeExportResponse } from '../../core/models/trade.model';

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

  private parseFileName(contentDisposition: string | null): string {
    if (!contentDisposition) {
      return 'trades-backup.json';
    }

    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const plainMatch = /filename="?([^";]+)"?/i.exec(contentDisposition);
    if (plainMatch?.[1]) {
      return plainMatch[1];
    }

    return 'trades-backup.json';
  }

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

  async deleteTrade(id: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete<{ deleted: boolean; id: string }>(`/api/v1/trades/${id}`));
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.error?.error) {
        throw new TradeApiError(err.error.error as ApiError, err.status);
      }
      throw err;
    }
  }

  async importTrades(dtos: CreateTradeDto[]): Promise<TradeImportResponse> {
    try {
      return await firstValueFrom(
        this.http.post<TradeImportResponse>('/api/v1/trades/import', { trades: dtos }),
      );
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.error?.error) {
        throw new TradeApiError(err.error.error as ApiError, err.status);
      }
      throw err;
    }
  }

  async exportTrades(): Promise<TradeExportResponse> {
    try {
      const response = await firstValueFrom(
        this.http.get('/api/v1/trades/export', {
          observe: 'response',
          responseType: 'blob',
        }),
      );

      const fileName = this.parseFileName(response.headers.get('content-disposition'));
      return { blob: response.body ?? new Blob([], { type: 'application/json' }), fileName };
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.error?.error) {
        throw new TradeApiError(err.error.error as ApiError, err.status);
      }
      throw err;
    }
  }
}
