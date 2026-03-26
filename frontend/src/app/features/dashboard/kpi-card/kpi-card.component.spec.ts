import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { KpiCardComponent } from './kpi-card.component';

describe('KpiCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpiCardComponent],
    }).compileComponents();
  });

  it('renders label and value', () => {
    const fixture = TestBed.createComponent(KpiCardComponent);
    fixture.componentInstance.label = 'Total Trades';
    fixture.componentInstance.value = '42';
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Total Trades');
    expect(el.textContent).toContain('42');
  });

  it('shows loading skeleton when loading=true', () => {
    const fixture = TestBed.createComponent(KpiCardComponent);
    fixture.componentInstance.loading = true;
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const skeleton = el.querySelector('.animate-pulse');
    expect(skeleton).toBeTruthy();
  });

  it('applies positive color class for positive variant', () => {
    const fixture = TestBed.createComponent(KpiCardComponent);
    fixture.componentInstance.colorVariant = 'positive';
    fixture.componentInstance.value = '1000';
    fixture.detectChanges();

    expect(fixture.componentInstance.valueColorClass).toBe('text-emerald-600');
  });

  it('applies negative color class for negative variant', () => {
    const fixture = TestBed.createComponent(KpiCardComponent);
    fixture.componentInstance.colorVariant = 'negative';
    fixture.componentInstance.value = '-500';
    fixture.detectChanges();

    expect(fixture.componentInstance.valueColorClass).toBe('text-red-600');
  });

  it('applies neutral color class for neutral variant', () => {
    const fixture = TestBed.createComponent(KpiCardComponent);
    fixture.componentInstance.colorVariant = 'neutral';
    fixture.componentInstance.value = '10';
    fixture.detectChanges();

    expect(fixture.componentInstance.valueColorClass).toBe('text-gray-900');
  });
});
