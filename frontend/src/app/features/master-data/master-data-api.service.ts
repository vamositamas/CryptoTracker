import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MasterDataApiService {
  private readonly http = inject(HttpClient);

  async getTokens(): Promise<string[]> {
    const res = await firstValueFrom(
      this.http.get<{ tokens: string[] }>('/api/v1/master-data/tokens'),
    );
    return res.tokens;
  }

  async getTradeTypes(): Promise<string[]> {
    const res = await firstValueFrom(
      this.http.get<{ tradeTypes: string[] }>('/api/v1/master-data/trade-types'),
    );
    return res.tradeTypes;
  }

  async getPositions(): Promise<string[]> {
    const res = await firstValueFrom(
      this.http.get<{ positions: string[] }>('/api/v1/master-data/positions'),
    );
    return res.positions;
  }
}
