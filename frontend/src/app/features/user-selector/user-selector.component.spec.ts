import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { UserSelectorComponent } from './user-selector.component';
import { UserService } from '../../core/services/user.service';

describe('UserSelectorComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => localStorageMock[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { localStorageMock[key] = value; });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { delete localStorageMock[key]; });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'dashboard', component: UserSelectorComponent }]),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('fetches traders from API and populates the signal', async () => {
    let component!: UserSelectorComponent;
    let initPromise!: Promise<void>;

    TestBed.runInInjectionContext(() => {
      component = new UserSelectorComponent();
      initPromise = component.ngOnInit();
    });

    const req = httpMock.expectOne('/api/v1/traders');
    expect(req.request.method).toBe('GET');
    req.flush(['tamas', 'mark']);
    await initPromise;

    expect(component.traders()).toEqual(['tamas', 'mark']);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('sets error signal on API failure', async () => {
    let component!: UserSelectorComponent;
    let initPromise!: Promise<void>;

    TestBed.runInInjectionContext(() => {
      component = new UserSelectorComponent();
      initPromise = component.ngOnInit();
    });

    const req = httpMock.expectOne('/api/v1/traders');
    req.error(new ProgressEvent('network error'));
    await initPromise;

    expect(component.error()).toBeTruthy();
    expect(component.loading()).toBe(false);
  });

  it('calls userService.selectTrader and navigates on selectTrader()', () => {
    const userService = TestBed.inject(UserService);
    const selectSpy = vi.spyOn(userService, 'selectTrader');
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const component = TestBed.runInInjectionContext(() => new UserSelectorComponent());
    component.selectTrader('tamas');

    expect(selectSpy).toHaveBeenCalledWith('tamas');
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });
});
