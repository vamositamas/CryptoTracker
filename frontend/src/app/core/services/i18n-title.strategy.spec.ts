import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { I18nTitleStrategy } from './i18n-title.strategy';

describe('I18nTitleStrategy', () => {
  let setTitle: ReturnType<typeof vi.fn>;
  let instant: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setTitle = vi.fn();
    instant = vi.fn((key: string) => {
      const dict: Record<string, string> = {
        'routeTitles.dashboard': 'Dashboard',
        'shell.appName': 'CryptoTracker',
      };
      return dict[key] ?? key;
    });

    TestBed.configureTestingModule({
      providers: [
        I18nTitleStrategy,
        { provide: Title, useValue: { setTitle } },
        { provide: TranslateService, useValue: { instant } },
      ],
    });
  });

  it('sets translated document title when route provides a title key', () => {
    const strategy = TestBed.inject(I18nTitleStrategy);
    vi.spyOn(strategy as any, 'buildTitle').mockReturnValue('routeTitles.dashboard');

    strategy.updateTitle({} as any);

    expect(instant).toHaveBeenCalledWith('routeTitles.dashboard');
    expect(instant).toHaveBeenCalledWith('shell.appName');
    expect(setTitle).toHaveBeenCalledWith('Dashboard - CryptoTracker');
  });

  it('does not set document title when route has no title key', () => {
    const strategy = TestBed.inject(I18nTitleStrategy);
    vi.spyOn(strategy as any, 'buildTitle').mockReturnValue(undefined);

    strategy.updateTitle({} as any);

    expect(setTitle).not.toHaveBeenCalled();
  });
});
