import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);

  email = '';
  username = '';
  newPassword = '';

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  ngOnInit(): void {
    const currentUser = this.authService.currentUser();
    this.email = currentUser?.email ?? '';
    this.username = currentUser?.username ?? '';
  }

  save(): void {
    if (!this.email || !this.username) {
      return;
    }
    if (this.newPassword && this.newPassword.length < 8) {
      this.error.set('profile.validation.passwordMin');
      this.success.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);

    this.authService.updateMe({
      email: this.email.trim(),
      username: this.username.trim(),
      ...(this.newPassword ? { password: this.newPassword } : {}),
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.newPassword = '';
        this.success.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        const message = err?.error?.error?.message ?? 'profile.errors.saveFailed';
        this.error.set(message);
      },
    });
  }
}
