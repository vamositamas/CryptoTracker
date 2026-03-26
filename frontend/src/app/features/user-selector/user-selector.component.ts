import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-user-selector',
  imports: [],
  templateUrl: './user-selector.component.html',
})
export class UserSelectorComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  readonly traders = signal<string[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const list = await firstValueFrom(this.http.get<string[]>('/api/v1/traders'));
      this.traders.set(list);
    } catch {
      this.error.set('Failed to load trader profiles. Please refresh.');
    } finally {
      this.loading.set(false);
    }
  }

  selectTrader(username: string): void {
    this.userService.selectTrader(username);
    this.router.navigate(['/dashboard']);
  }
}
