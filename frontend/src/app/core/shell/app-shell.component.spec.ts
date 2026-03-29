import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { AppShellComponent } from './app-shell.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(_lang: string): Observable<any> {
    return of({
      shell: {
        appName: 'CryptoTracker',
        skipToContent: 'Skip to main content',
        language: 'Language',
        lang: { en: 'EN', hu: 'HU' },
        switchTrader: 'Switch trader',
        nav: {
          dashboard: 'Dashboard',
          trades: 'Trades',
          audit: 'Audit Trail',
          masterData: 'Master Data',
          formulas: 'Formulas',
          profile: 'My Profile',
          userGuide: 'User Guide',
        },
      },
    });
  }
}

describe('AppShellComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        importProvidersFrom(
          TranslateModule.forRoot({
            loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
          }),
        ),
      ],
    }).compileComponents();
  });

  it('renders skip-to-main link as first focusable element', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const skip = el.querySelector('a[href="#main-content"]');
    expect(skip).not.toBeNull();
    expect(skip!.textContent?.trim()).toBe('Skip to main content');
  });

  it('renders nav links for all core sections', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const anchors = Array.from(
      fixture.nativeElement.querySelectorAll('nav a'),
    ) as HTMLAnchorElement[];
    const labels = anchors.map(a => a.textContent?.trim());
    expect(labels).toContain('Dashboard');
    expect(labels).toContain('Trades');
    expect(labels).toContain('Master Data');
    expect(labels).toContain('Formulas');
  });

  it('all nav links have focus-visible ring classes', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const navLinks = Array.from(
      fixture.nativeElement.querySelectorAll('nav ul a'),
    ) as HTMLAnchorElement[];
    expect(navLinks.length).toBe(4);
    for (const link of navLinks) {
      expect(link.className).toContain('focus-visible:ring-2');
    }
  });

  it('main content area has id="main-content" for skip link target', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const mainContent = el.querySelector('#main-content');
    expect(mainContent).not.toBeNull();
    expect(mainContent?.className).toContain('ml-60');
  });
});
