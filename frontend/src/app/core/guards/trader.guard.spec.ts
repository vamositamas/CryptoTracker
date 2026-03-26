import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { traderGuard } from './trader.guard';
import { UserService } from '../services/user.service';

describe('traderGuard', () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => localStorageMock[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { localStorageMock[key] = value; });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { delete localStorageMock[key]; });

    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when trader is set', () => {
    localStorageMock['activeTrader'] = 'tamas';
    TestBed.inject(UserService); // trigger signal init
    const result = TestBed.runInInjectionContext(() => traderGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('returns a UrlTree to /select-trader when no trader is set', () => {
    const result = TestBed.runInInjectionContext(() => traderGuard({} as never, {} as never));
    expect(result).toBeInstanceOf(UrlTree);
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result as UrlTree)).toBe('/select-trader');
  });
});
