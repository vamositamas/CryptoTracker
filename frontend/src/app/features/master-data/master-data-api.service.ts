import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiError, MasterDataEntry, MasterDataItem, MasterDataToken, MasterDataType } from '../../core/models/master-data.model';

export class MasterDataApiError extends Error {
  constructor(
    public readonly apiError: ApiError,
    public readonly status: number,
  ) {
    super(apiError.message);
    this.name = 'MasterDataApiError';
  }
}

type MasterDataWriteValue = string | { symbol: string; name: string };

@Injectable({ providedIn: 'root' })
export class MasterDataApiService {
  private readonly http = inject(HttpClient);

  private readonly responseKeyMap: Record<MasterDataType, 'tokens' | 'tradeTypes' | 'positions'> = {
    'tokens': 'tokens',
    'trade-types': 'tradeTypes',
    'positions': 'positions',
  };

  private buildPayload(type: MasterDataType, value: MasterDataWriteValue): { name: string; symbol?: string } {
    const trimmed = typeof value === 'string' ? value.trim() : value.name.trim();
    if (type === 'tokens') {
      const symbol = typeof value === 'string' ? trimmed : value.symbol.trim();
      return { name: trimmed, symbol };
    }
    return { name: trimmed };
  }

  private async handleRequest<T>(request: Promise<T>): Promise<T> {
    try {
      return await request;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.error?.error) {
        throw new MasterDataApiError(err.error.error as ApiError, err.status);
      }
      throw err;
    }
  }

  async list(type: MasterDataType): Promise<MasterDataEntry[]> {
    const key = this.responseKeyMap[type];
    const res = await firstValueFrom(
      this.http.get<Record<typeof key, MasterDataEntry[]>>(`/api/v1/master-data/${type}`),
    );
    return res[key];
  }

  async create(type: MasterDataType, value: MasterDataWriteValue): Promise<MasterDataEntry> {
    return this.handleRequest(
      firstValueFrom(
        this.http.post<MasterDataEntry>(`/api/v1/master-data/${type}`, this.buildPayload(type, value)),
      ),
    );
  }

  async update(type: MasterDataType, id: string, value: MasterDataWriteValue): Promise<MasterDataEntry> {
    return this.handleRequest(
      firstValueFrom(
        this.http.put<MasterDataEntry>(`/api/v1/master-data/${type}/${id}`, this.buildPayload(type, value)),
      ),
    );
  }

  async delete(type: MasterDataType, id: string): Promise<void> {
    await this.handleRequest(
      firstValueFrom(this.http.delete<{ deleted: boolean }>(`/api/v1/master-data/${type}/${id}`)),
    );
  }

  private mapValues<T extends MasterDataEntry>(
    entries: T[],
    projector: (entry: T) => string,
  ): string[] {
    return entries.map(projector);
  }

  async getTokens(): Promise<string[]> {
    const entries = await this.list('tokens') as MasterDataToken[];
    return this.mapValues(entries, (entry) => entry.symbol ?? entry.id);
  }

  async getTradeTypes(): Promise<string[]> {
    const entries = await this.list('trade-types') as MasterDataItem[];
    return this.mapValues(entries, (entry) => entry.id);
  }

  async getPositions(): Promise<string[]> {
    const entries = await this.list('positions') as MasterDataItem[];
    return this.mapValues(entries, (entry) => entry.id);
  }
}
