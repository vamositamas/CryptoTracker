import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { UserService } from './user.service';
import { AuthService } from './auth.service';

describe('UserService', () => {
  const mockUser = signal<{ username: string } | null>(null);

  beforeEach(() => {
    mockUser.set(null);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { currentUser: mockUser.asReadonly() },
        },
      ],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('activeTrader returns null when no user is logged in', () => {
    const service = TestBed.inject(UserService);
    expect(service.activeTrader()).toBeNull();
  });

  it('activeTrader returns username when user is logged in', () => {
    mockUser.set({ username: 'tamas' } as never);
    const service = TestBed.inject(UserService);
    expect(service.activeTrader()).toBe('tamas');
  });
});

