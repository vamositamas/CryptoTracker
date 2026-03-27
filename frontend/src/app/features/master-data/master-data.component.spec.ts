import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MasterDataComponent } from './master-data.component';
import { MasterDataApiService } from './master-data-api.service';
import { provideTranslateTesting } from '../../../testing/translate-test.providers';

describe('MasterDataComponent', () => {
  let apiMock: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    apiMock = {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [MasterDataComponent],
      providers: [...provideTranslateTesting(), { provide: MasterDataApiService, useValue: apiMock }],
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders the three master data tabs', async () => {
    const fixture = TestBed.createComponent(MasterDataComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const labels = buttons.map((button) => button.textContent?.trim());
    expect(labels).toContain('Tokens');
    expect(labels).toContain('Trade Types');
    expect(labels).toContain('Positions');
  });

  it('switches the active tab when a tab is clicked', async () => {
    const fixture = TestBed.createComponent(MasterDataComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const positionsButton = buttons.find((button) => button.textContent?.trim() === 'Positions');
    positionsButton?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.activeTab().type).toBe('positions');
    expect(fixture.nativeElement.textContent).toContain('Manage shared position values');
  });
});