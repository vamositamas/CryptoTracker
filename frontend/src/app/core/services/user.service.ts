import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UserService {
  readonly activeTrader = signal<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('activeTrader') : null,
  );

  selectTrader(username: string): void {
    localStorage.setItem('activeTrader', username);
    this.activeTrader.set(username);
  }

  clearTrader(): void {
    localStorage.removeItem('activeTrader');
    this.activeTrader.set(null);
  }
}
