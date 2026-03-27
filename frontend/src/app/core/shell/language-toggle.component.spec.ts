import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { importProvidersFrom, signal } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { LanguageService } from '../services/language.service';
import { LanguageToggleComponent } from './language-toggle.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(_lang: string): Observable<any> {
    return of({
      shell: {
        language: 'Language',
        lang: { en: 'EN', hu: 'HU' },
      },
    });
  }
}

describe('LanguageToggleComponent', () => {
  const language = signal<'en' | 'hu'>('en');
  const languageServiceMock = {
    language,
    isActive: (lang: 'en' | 'hu') => language() === lang,
    setLanguage: (lang: 'en' | 'hu') => language.set(lang),
  };

  beforeEach(async () => {
    language.set('en');

    await TestBed.configureTestingModule({
      imports: [LanguageToggleComponent],
      providers: [
        { provide: LanguageService, useValue: languageServiceMock },
        importProvidersFrom(
          TranslateModule.forRoot({
            loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
          }),
        ),
      ],
    }).compileComponents();
  });

  it('renders EN/HU buttons', async () => {
    const fixture = TestBed.createComponent(LanguageToggleComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('EN');
    expect(text).toContain('HU');
  });

  it('changes active language when HU is clicked', async () => {
    const fixture = TestBed.createComponent(LanguageToggleComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const huButton = buttons.find((btn) => btn.textContent?.trim() === 'HU') as HTMLButtonElement;

    huButton.click();
    fixture.detectChanges();

    expect(language()).toBe('hu');
  });
});
