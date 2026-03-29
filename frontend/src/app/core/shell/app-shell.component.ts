import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';
import { LanguageService } from '../services/language.service';
import { LanguageToggleComponent } from './language-toggle.component';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe, LanguageToggleComponent],
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent {
  readonly authService = inject(AuthService);
  readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);

  get userGuideUrl(): string {
    return `/user-guide.${this.languageService.language()}.html`;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
