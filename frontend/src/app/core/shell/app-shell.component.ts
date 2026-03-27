import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { UserService } from '../services/user.service';
import { LanguageToggleComponent } from './language-toggle.component';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe, LanguageToggleComponent],
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent {
  readonly userService = inject(UserService);
  private readonly router = inject(Router);

  switchTrader(): void {
    this.userService.clearTrader();
    this.router.navigate(['/select-trader']);
  }
}
