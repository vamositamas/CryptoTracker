import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => localStorageMock[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { localStorageMock[key] = value; });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { delete localStorageMock[key]; });

    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initialises activeTrader from localStorage', () => {
    localStorageMock['activeTrader'] = 'tamas';
    const service = TestBed.inject(UserService);
    expect(service.activeTrader()).toBe('tamas');
  });

  it('initialises activeTrader as null when localStorage is empty', () => {
    const service = TestBed.inject(UserService);
    expect(service.activeTrader()).toBeNull();
  });

  it('selectTrader writes to localStorage and updates signal', () => {
    const service = TestBed.inject(UserService);
    service.selectTrader('mark');
    expect(localStorage.setItem).toHaveBeenCalledWith('activeTrader', 'mark');
    expect(service.activeTrader()).toBe('mark');
  });

  it('clearTrader removes from localStorage and sets signal to null', () => {
    localStorageMock['activeTrader'] = 'tamas';
    const service = TestBed.inject(UserService);
    service.clearTrader();
    expect(localStorage.removeItem).toHaveBeenCalledWith('activeTrader');
    expect(service.activeTrader()).toBeNull();
  });
});
