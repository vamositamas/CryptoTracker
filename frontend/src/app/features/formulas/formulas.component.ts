import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FormulaDefinition, FormulaDraft } from '../../core/models/formula.model';
import { FormulaApiError, FormulaApiService } from './formula-api.service';

interface FormulaRow extends FormulaDefinition {
  rowId: string;
}

type FormulaFieldError = 'fieldRequired' | 'expressionRequired' | 'duplicateField' | 'invalidField';

@Component({
  selector: 'app-formulas',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './formulas.component.html',
})
export class FormulasComponent {
  private readonly formulaApi = inject(FormulaApiService);
  private nextRowId = 0;
  private previewTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly requiredFields = new Set([
    'investment',
    'investmentAll',
    'sellValue',
    'cost',
    'nettoProfit',
    'profitPercent',
    'profitRealPercent',
    'dailyProfitPercent',
  ]);

  readonly formulas = signal<FormulaRow[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly previewing = signal(false);
  readonly dirty = signal(false);
  readonly error = signal<string | null>(null);
  readonly previewError = signal<string | null>(null);
  readonly previewStatus = signal<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  readonly deleteConfirmId = signal<string | null>(null);
  readonly validationErrors = signal<Record<string, Partial<Record<'field' | 'expression', FormulaFieldError>>>>({});
  readonly variableGuide = ['buyPrice', 'sellPrice', 'volume', 'leverage', 'holdingDays', 'positionMultiplier', 'brokerCost', 'type', 'position', 'token', 'tradePosition'];
  readonly hasRows = computed(() => this.formulas().length > 0);

  async ngOnInit(): Promise<void> {
    await this.loadFormulas();
  }

  async reload(): Promise<void> {
    await this.loadFormulas();
  }

  addFormula(): void {
    this.formulas.update((formulas) => [
      ...formulas,
      {
        rowId: this.createRowId(),
        field: '',
        expression: '',
        variables: [],
        required: false,
      },
    ]);
    this.error.set(null);
    this.previewError.set(null);
    this.previewStatus.set('invalid');
    this.dirty.set(true);
  }

  requestRemoveFormula(rowId: string): void {
    this.deleteConfirmId.set(rowId);
  }

  cancelRemoveFormula(): void {
    this.deleteConfirmId.set(null);
  }

  confirmRemoveFormula(rowId: string): void {
    this.formulas.update((formulas) => formulas.filter((formula) => formula.rowId !== rowId));
    this.validationErrors.update((errors) => {
      const next = { ...errors };
      delete next[rowId];
      return next;
    });
    this.deleteConfirmId.set(null);
    this.error.set(null);
    this.previewError.set(null);
    this.dirty.set(true);
    this.schedulePreview();
  }

  updateField(rowId: string, field: 'field' | 'expression', value: string): void {
    this.formulas.update((formulas) => formulas.map((formula) => (
      formula.rowId === rowId
        ? {
            ...formula,
            [field]: value,
            variables: field === 'expression' ? [] : formula.variables,
          }
        : formula
    )));

    this.validationErrors.update((errors) => {
      const next = { ...errors };
      if (next[rowId]) {
        next[rowId] = { ...next[rowId], [field]: undefined };
      }
      return next;
    });

    this.error.set(null);
    this.previewError.set(null);
    this.dirty.set(true);
    this.schedulePreview();
  }

  fieldError(rowId: string, field: 'field' | 'expression'): string | null {
    const error = this.validationErrors()[rowId]?.[field];
    if (!error) {
      return null;
    }

    return `formulas.errors.${error}`;
  }

  variablesLabel(formula: FormulaRow): string {
    if (formula.variables.length === 0) {
      return 'formulas.table.variablesPending';
    }

    return formula.variables.join(', ');
  }

  async save(): Promise<void> {
    const payload = this.buildPayload({ setSaveError: true });
    if (!payload) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    try {
      const saved = await this.formulaApi.saveAll(payload);
      this.formulas.set(this.attachRowIds(saved));
      this.validationErrors.set({});
      this.dirty.set(false);
    } catch (err) {
      if (err instanceof FormulaApiError) {
        this.error.set(err.apiError.message);
      } else {
        this.error.set('formulas.errors.saveFailed');
      }
    } finally {
      this.saving.set(false);
    }
  }

  async refreshPreview(): Promise<void> {
    const payload = this.buildPayload({ setSaveError: false });
    if (!payload) {
      this.previewing.set(false);
      this.previewStatus.set('invalid');
      this.previewError.set('formulas.preview.fixValidation');
      return;
    }

    this.previewing.set(true);
    this.previewStatus.set('loading');
    this.previewError.set(null);

    try {
      const preview = await this.formulaApi.previewAll(payload);
      this.formulas.update((formulas) => formulas.map((formula) => {
        const previewFormula = preview.find((entry) => entry.field === formula.field.trim());
        return previewFormula ? { ...formula, variables: previewFormula.variables } : formula;
      }));
      this.previewStatus.set('valid');
    } catch (err) {
      if (err instanceof FormulaApiError) {
        this.previewError.set(err.apiError.message);
      } else {
        this.previewError.set('formulas.preview.failed');
      }
      this.previewStatus.set('invalid');
    } finally {
      this.previewing.set(false);
    }
  }

  private async loadFormulas(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const formulas = await this.formulaApi.list();
      this.formulas.set(this.attachRowIds(formulas));
      this.validationErrors.set({});
      this.dirty.set(false);
      this.previewError.set(null);
      this.previewStatus.set('valid');
    } catch {
      this.error.set('formulas.errors.loadFailed');
    } finally {
      this.loading.set(false);
    }
  }

  private attachRowIds(formulas: FormulaDefinition[]): FormulaRow[] {
    return formulas.map((formula) => ({ ...formula, rowId: this.createRowId() }));
  }

  private createRowId(): string {
    this.nextRowId += 1;
    return `formula-row-${this.nextRowId}`;
  }

  private buildPayload(options: { setSaveError: boolean }): FormulaDraft[] | null {
    const errors: Record<string, Partial<Record<'field' | 'expression', FormulaFieldError>>> = {};
    const normalizedFields = new Map<string, string>();

    for (const formula of this.formulas()) {
      const field = formula.field.trim();
      const expression = formula.expression.trim();

      if (!field) {
        errors[formula.rowId] = { ...errors[formula.rowId], field: 'fieldRequired' };
      } else if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(field)) {
        errors[formula.rowId] = { ...errors[formula.rowId], field: 'invalidField' };
      }

      if (!expression) {
        errors[formula.rowId] = { ...errors[formula.rowId], expression: 'expressionRequired' };
      }

      const normalizedKey = field.toLowerCase();
      if (field && normalizedFields.has(normalizedKey)) {
        errors[formula.rowId] = { ...errors[formula.rowId], field: 'duplicateField' };
        const duplicateRowId = normalizedFields.get(normalizedKey)!;
        errors[duplicateRowId] = { ...errors[duplicateRowId], field: 'duplicateField' };
      } else if (field) {
        normalizedFields.set(normalizedKey, formula.rowId);
      }
    }

    for (const requiredField of this.requiredFields) {
      const hasRequiredField = this.formulas().some((formula) => formula.field.trim() === requiredField);
      if (!hasRequiredField) {
        if (options.setSaveError) {
          this.error.set(`Missing required formula: ${requiredField}`);
        }
        this.validationErrors.set(errors);
        return null;
      }
    }

    this.validationErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      return null;
    }

    return this.formulas().map((formula) => ({
      field: formula.field.trim(),
      expression: formula.expression.trim(),
    }));
  }

  private schedulePreview(): void {
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
    }

    this.previewStatus.set('loading');
    this.previewTimer = setTimeout(() => {
      void this.refreshPreview();
    }, 350);
  }
}