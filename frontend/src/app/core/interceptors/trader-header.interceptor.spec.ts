import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { traderHeaderInterceptor } from './trader-header.interceptor';
import { UserService } from '../services/user.service';

describe('traderHeaderInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => localStorageMock[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { localStorageMock[key] = value; });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { delete localStorageMock[key]; });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([traderHeaderInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('adds X-Trader-Username header when trader is set', () => {
    localStorageMock['activeTrader'] = 'tamas';
    // Re-create service so signal picks up the mock
    TestBed.inject(UserService);

    http.get('/api/v1/trades').subscribe();
    const req = httpMock.expectOne('/api/v1/trades');
    expect(req.request.headers.get('X-Trader-Username')).toBe('tamas');
    req.flush([]);
  });

  it('does not add header when no trader is set', () => {
    http.get('/api/v1/traders').subscribe();
    const req = httpMock.expectOne('/api/v1/traders');
    expect(req.request.headers.has('X-Trader-Username')).toBe(false);
    req.flush([]);
  });
});
