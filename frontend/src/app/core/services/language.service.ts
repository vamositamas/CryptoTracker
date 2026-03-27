import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'en' | 'hu';

const STORAGE_KEY = 'language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly language = signal<AppLanguage>(this.readStoredLanguage());

  constructor(private readonly translate: TranslateService) {
    this.translate.addLangs(['en', 'hu']);
    this.translate.setFallbackLang('en');

    const selected = this.readStoredLanguage();
    this.translate.use(selected);
    this.language.set(selected);
  }

  setLanguage(next: AppLanguage): void {
    localStorage.setItem(STORAGE_KEY, next);
    this.translate.use(next);
    this.language.set(next);
  }

  isActive(lang: AppLanguage): boolean {
    return this.language() === lang;
  }

  private readStoredLanguage(): AppLanguage {
    if (typeof localStorage === 'undefined') {
      return 'en';
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'hu' ? 'hu' : 'en';
  }
}