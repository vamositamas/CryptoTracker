import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppLanguage, LanguageService } from '../services/language.service';

@Component({
  selector: 'app-language-toggle',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div
      class="rounded-full bg-gray-800 p-1 inline-flex gap-1"
      role="group"
      [attr.aria-label]="'shell.language' | translate"
    >
      <button
        type="button"
        (click)="setLanguage('en')"
        class="px-3 py-1 text-xs font-semibold rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 transition-colors"
        [class.bg-blue-600]="languageService.isActive('en')"
        [class.text-white]="languageService.isActive('en')"
        [class.text-gray-300]="!languageService.isActive('en')"
        [attr.aria-pressed]="languageService.isActive('en')"
      >
        EN
      </button>
      <button
        type="button"
        (click)="setLanguage('hu')"
        class="px-3 py-1 text-xs font-semibold rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 transition-colors"
        [class.bg-blue-600]="languageService.isActive('hu')"
        [class.text-white]="languageService.isActive('hu')"
        [class.text-gray-300]="!languageService.isActive('hu')"
        [attr.aria-pressed]="languageService.isActive('hu')"
      >
        HU
      </button>
    </div>
  `,
})
export class LanguageToggleComponent {
  readonly languageService = inject(LanguageService);

  setLanguage(lang: AppLanguage): void {
    this.languageService.setLanguage(lang);
  }
}