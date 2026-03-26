import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuditEntry } from './audit.model';

@Injectable({ providedIn: 'root' })
export class AuditApiService {
  private readonly http = inject(HttpClient);

  async getEntries(): Promise<AuditEntry[]> {
    const res = await firstValueFrom(
      this.http.get<{ entries: AuditEntry[]; total: number }>('/api/v1/audit'),
    );
    return res.entries;
  }
}
