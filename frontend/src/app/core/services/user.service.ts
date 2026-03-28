import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly authService = inject(AuthService);

  readonly activeTrader = computed(() => this.authService.currentUser()?.username ?? null);
}

