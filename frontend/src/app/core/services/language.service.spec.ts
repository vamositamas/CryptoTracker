import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';
import { TranslateService } from '@ngx-translate/core';

describe('LanguageService', () => {
  let translateMock: {
    addLangs: ReturnType<typeof vi.fn>;
    setFallbackLang: ReturnType<typeof vi.fn>;
    use: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    localStorage.removeItem('language');

    translateMock = {
      addLangs: vi.fn(),
      setFallbackLang: vi.fn(),
      use: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: TranslateService, useValue: translateMock }],
    });
  });

  it('defaults to English when localStorage is empty', () => {
    const service = TestBed.inject(LanguageService);

    expect(service.language()).toBe('en');
    expect(translateMock.use).toHaveBeenCalledWith('en');
    expect(translateMock.setFallbackLang).toHaveBeenCalledWith('en');
  });

  it('restores Hungarian when localStorage contains hu', () => {
    localStorage.setItem('language', 'hu');
    const service = TestBed.inject(LanguageService);

    expect(service.language()).toBe('hu');
    expect(translateMock.use).toHaveBeenCalledWith('hu');
  });

  it('switches language and persists selection', () => {
    const service = TestBed.inject(LanguageService);

    service.setLanguage('hu');

    expect(service.language()).toBe('hu');
    expect(localStorage.getItem('language')).toBe('hu');
    expect(translateMock.use).toHaveBeenLastCalledWith('hu');
  });
});
