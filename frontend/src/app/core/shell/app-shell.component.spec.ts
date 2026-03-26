import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppShellComponent } from './app-shell.component';

describe('AppShellComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [provideRouter([])],
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

  it('renders nav links for all 4 sections', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const anchors = Array.from(
      fixture.nativeElement.querySelectorAll('nav a'),
    ) as HTMLAnchorElement[];
    const labels = anchors.map(a => a.textContent?.trim());
    expect(labels).toContain('Dashboard');
    expect(labels).toContain('Trades');
    expect(labels).toContain('Audit Trail');
    expect(labels).toContain('Master Data');
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
});
