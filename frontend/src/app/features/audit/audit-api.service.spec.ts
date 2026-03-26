import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuditApiService } from './audit-api.service';
import { AuditEntry } from './audit.model';

const ENTRY_1: AuditEntry = {
  id: 'e1',
  timestamp: '2024-06-01T10:00:00.000Z',
  action: 'CREATE',
  traderId: 'alice',
  entityId: 'trade-1',
  previousValue: null,
  newValue: { position: 'BTC', type: 'spot' },
};

const ENTRY_2: AuditEntry = {
  id: 'e2',
  timestamp: '2024-06-02T12:30:00.000Z',
  action: 'UPDATE',
  traderId: 'alice',
  entityId: 'trade-1',
  field: 'sellPrice',
  previousValue: 30000,
  newValue: 35000,
};

describe('AuditApiService', () => {
  let service: AuditApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    vi.restoreAllMocks();
  });

  it('returns entries array from the API envelope', async () => {
    const promise = service.getEntries();
    httpTesting
      .expectOne('/api/v1/audit')
      .flush({ entries: [ENTRY_1, ENTRY_2], total: 2 });
    const entries = await promise;
    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe('e1');
    expect(entries[1].id).toBe('e2');
  });

  it('returns empty array when API returns empty entries', async () => {
    const promise = service.getEntries();
    httpTesting
      .expectOne('/api/v1/audit')
      .flush({ entries: [], total: 0 });
    const entries = await promise;
    expect(entries).toHaveLength(0);
  });

  it('calls GET /api/v1/audit (not POST/PUT/DELETE)', () => {
    service.getEntries();
    const req = httpTesting.expectOne('/api/v1/audit');
    expect(req.request.method).toBe('GET');
    req.flush({ entries: [], total: 0 });
  });
});
