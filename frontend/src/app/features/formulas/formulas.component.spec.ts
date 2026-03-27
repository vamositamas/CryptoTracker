import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FormulasComponent } from './formulas.component';
import { FormulaApiService } from './formula-api.service';
import { provideTranslateTesting } from '../../../testing/translate-test.providers';

const REQUIRED_FORMULAS = [
  { field: 'investment', expression: 'volume * buyPrice / leverage', variables: ['buyPrice', 'leverage', 'volume'], required: true },
  { field: 'investmentAll', expression: 'volume * buyPrice', variables: ['buyPrice', 'volume'], required: true },
  { field: 'sellValue', expression: 'volume * sellPrice', variables: ['sellPrice', 'volume'], required: true },
  { field: 'cost', expression: 'volume * buyPrice / leverage', variables: ['buyPrice', 'leverage', 'volume'], required: true },
  { field: 'nettoProfit', expression: '(sellPrice - buyPrice) * volume * positionMultiplier - brokerCost', variables: ['brokerCost', 'buyPrice', 'positionMultiplier', 'sellPrice', 'volume'], required: true },
  { field: 'profitPercent', expression: '(sellPrice - buyPrice) / buyPrice * leverage * 100 * positionMultiplier', variables: ['buyPrice', 'leverage', 'positionMultiplier', 'sellPrice'], required: true },
  { field: 'profitRealPercent', expression: '(sellPrice - buyPrice) / buyPrice * 100 * positionMultiplier', variables: ['buyPrice', 'positionMultiplier', 'sellPrice'], required: true },
  { field: 'dailyProfitPercent', expression: '(sellPrice - buyPrice) / buyPrice * leverage * 100 / holdingDays * positionMultiplier', variables: ['buyPrice', 'holdingDays', 'leverage', 'positionMultiplier', 'sellPrice'], required: true },
];

describe('FormulasComponent', () => {
  let apiMock: {
    list: ReturnType<typeof vi.fn>;
    previewAll: ReturnType<typeof vi.fn>;
    saveAll: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    apiMock = {
      list: vi.fn().mockResolvedValue(REQUIRED_FORMULAS),
      previewAll: vi.fn().mockImplementation(async (formulas) => formulas.map((formula: { field: string; expression: string }) => ({
        field: formula.field,
        expression: formula.expression,
        variables: formula.field === 'riskScore' ? ['investment', 'nettoProfit'] : [],
        required: REQUIRED_FORMULAS.some((entry) => entry.field === formula.field),
      }))),
      saveAll: vi.fn().mockResolvedValue(REQUIRED_FORMULAS),
    };

    await TestBed.configureTestingModule({
      imports: [FormulasComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: FormulaApiService, useValue: apiMock },
      ],
    }).compileComponents();
  });

  it('shows delete confirmation before removing a custom formula', async () => {
    const component = TestBed.runInInjectionContext(() => new FormulasComponent());
    await component.ngOnInit();

    component.addFormula();
    const customRow = component.formulas().at(-1)!;

    component.requestRemoveFormula(customRow.rowId);
    expect(component.deleteConfirmId()).toBe(customRow.rowId);

    component.confirmRemoveFormula(customRow.rowId);
    expect(component.deleteConfirmId()).toBeNull();
    expect(component.formulas().some((formula) => formula.rowId === customRow.rowId)).toBe(false);
  });

  it('updates formula variables after preview', async () => {
    const component = TestBed.runInInjectionContext(() => new FormulasComponent());
    await component.ngOnInit();

    component.addFormula();
    const customRow = component.formulas().at(-1)!;

    component.updateField(customRow.rowId, 'field', 'riskScore');
    component.updateField(customRow.rowId, 'expression', 'nettoProfit / investment');
    await component.refreshPreview();

    expect(apiMock.previewAll).toHaveBeenCalled();
    const updatedCustomRow = component.formulas().find((formula) => formula.rowId === customRow.rowId)!;
    expect(updatedCustomRow.variables).toEqual(['investment', 'nettoProfit']);
    expect(component.previewStatus()).toBe('valid');
  });
});