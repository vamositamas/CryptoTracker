import * as fs from 'fs/promises';
import * as path from 'path';
import { Parser } from 'expr-eval';
import { atomicWrite } from '../utils/atomic-write';
import { getFileQueue } from '../utils/file-queue';

const DEFAULT_FORMULAS_PATH = path.resolve(
  process.env.DATA_DIR || path.join(__dirname, '../../data'),
  'config',
  'formulas.json',
);

export interface FormulaDefinition {
  field: string;
  expression: string;
  variables: string[];
}

export interface EditableFormulaInput {
  field: string;
  expression: string;
}

export interface RawTrade {
  token?: string;
  type: string;
  position: string;
  tradePosition?: string;
  brokerCost?: number;
  leverage: number;
  volume: number;
  buyPrice: number;
  sellPrice: number;
  closeDate: string;
  holdingDays: number;
  [key: string]: unknown;
}

export interface EnrichedTrade extends RawTrade {
  investment: number;
  investmentAll: number;
  sellValue: number;
  cost: number;
  nettoProfit: number;
  profitPercent: number;
  profitRealPercent: number;
  dailyProfitPercent: number;
  result: string;
}

export const CALCULATED_FIELDS = [
  'investment',
  'investmentAll',
  'sellValue',
  'cost',
  'nettoProfit',
  'profitPercent',
  'profitRealPercent',
  'dailyProfitPercent',
  'result',
] as const;

export const REQUIRED_EDITABLE_FORMULA_FIELDS = [
  'investment',
  'investmentAll',
  'sellValue',
  'cost',
  'nettoProfit',
  'profitPercent',
  'profitRealPercent',
  'dailyProfitPercent',
] as const;

const BASE_FORMULA_VARIABLES = [
  'id',
  'createdAt',
  'token',
  'type',
  'position',
  'tradePosition',
  'brokerCost',
  'leverage',
  'volume',
  'buyPrice',
  'sellPrice',
  'closeDate',
  'holdingDays',
  'positionMultiplier',
] as const;

const RESERVED_FORMULA_FIELDS = new Set<string>(BASE_FORMULA_VARIABLES);

export type CalculatedField = (typeof CALCULATED_FIELDS)[number];

/**
 * Strips calculated fields from an incoming request body.
 * Trade routes MUST call this before passing data to StorageService.
 */
export function stripCalculatedFields(body: Record<string, unknown>): Record<string, unknown> {
  const stripped = { ...body };
  for (const field of CALCULATED_FIELDS) {
    delete stripped[field];
  }
  return stripped;
}

export class FormulaService {
  private readonly formulasPath: string;
  private definitions: FormulaDefinition[] = [];
  private parser: Parser;

  constructor(formulasPath: string = DEFAULT_FORMULAS_PATH) {
    this.formulasPath = formulasPath;
    this.parser = new Parser();
  }

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.formulasPath, 'utf-8');
      this.definitions = JSON.parse(raw) as FormulaDefinition[];
    } catch (err) {
      throw new Error(
        `[FATAL] Failed to load formula config from ${this.formulasPath}: ${(err as Error).message}`,
      );
    }
  }

  validate(): void {
    this.validateDefinitionList(this.definitions);
  }

  getEditableDefinitions(): FormulaDefinition[] {
    return this.cloneDefinitions(this.definitions.filter((definition) => definition.field !== 'result'));
  }

  previewEditableDefinitions(definitions: EditableFormulaInput[]): FormulaDefinition[] {
    const normalized = this.normalizeEditableDefinitions(definitions);
    this.validateDefinitionList([...normalized, this.getResultDefinition()]);
    return this.cloneDefinitions(normalized);
  }

  async replaceEditableDefinitions(definitions: EditableFormulaInput[]): Promise<FormulaDefinition[]> {
    const normalized = this.previewEditableDefinitions(definitions);
    const nextDefinitions = [...normalized, this.getResultDefinition()];

    const queue = getFileQueue(this.formulasPath);
    await queue.add(async () => {
      await fs.mkdir(path.dirname(this.formulasPath), { recursive: true });
      await atomicWrite(this.formulasPath, nextDefinitions);
    });

    this.definitions = nextDefinitions;
    return this.getEditableDefinitions();
  }

  private getPositionMultiplier(tradePosition?: string): number {
    const normalized = String(tradePosition ?? 'long').trim().toLowerCase();
    return normalized === 'short' ? -1 : 1;
  }

  applyAll(rawTrade: RawTrade): EnrichedTrade {
    const vars: Record<string, unknown> = {
      ...rawTrade,
      positionMultiplier: this.getPositionMultiplier(rawTrade.tradePosition),
      brokerCost: Number(rawTrade.brokerCost ?? 0),
    };
    const calculated: Record<string, number | string> = {};

    for (const def of this.definitions) {
      // 'result' is a string (Win/Loss) — handled as post-process, not via expr-eval
      if (def.field === 'result') {
        continue;
      }
      const expr = this.parser.parse(def.expression);
      try {
        calculated[def.field] = expr.evaluate(vars as Record<string, number>);
      } catch (err) {
        throw new Error(
          `[ERROR] Formula evaluation failed: ${def.field} — ${(err as Error).message}`,
        );
      }
      // Make intermediate results available to subsequent formulas
      vars[def.field] = calculated[def.field];
    }

    // Post-process: result is 'Win' or 'Loss' based on nettoProfit sign
    const nettoProfit = calculated['nettoProfit'] as number;
    calculated['result'] = nettoProfit >= 0 ? 'Win' : 'Loss';

    return { ...rawTrade, ...calculated } as EnrichedTrade;
  }

  private cloneDefinitions(definitions: FormulaDefinition[]): FormulaDefinition[] {
    return definitions.map((definition) => ({
      field: definition.field,
      expression: definition.expression,
      variables: [...definition.variables],
    }));
  }

  private getResultDefinition(): FormulaDefinition {
    const existing = this.definitions.find((definition) => definition.field === 'result');
    if (existing) {
      return {
        field: existing.field,
        expression: existing.expression,
        variables: [...existing.variables],
      };
    }

    return {
      field: 'result',
      expression: 'nettoProfit',
      variables: ['nettoProfit'],
    };
  }

  private normalizeEditableDefinitions(definitions: EditableFormulaInput[]): FormulaDefinition[] {
    if (!Array.isArray(definitions)) {
      throw new Error('[FATAL] Formula config invalid: formulas must be an array');
    }

    const normalized = definitions.map((definition, index) => {
      const field = String(definition.field ?? '').trim();
      const expression = String(definition.expression ?? '').trim();

      if (!field) {
        throw new Error(`[FATAL] Formula config invalid: formulas[${index}].field is required`);
      }

      if (!expression) {
        throw new Error(`[FATAL] Formula config invalid: ${field} — expression is required`);
      }

      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(field)) {
        throw new Error(`[FATAL] Formula config invalid: ${field} — field must start with a letter and use only letters, numbers, or underscores`);
      }

      if (RESERVED_FORMULA_FIELDS.has(field)) {
        throw new Error(`[FATAL] Formula config invalid: ${field} — field name is reserved`);
      }

      try {
        const parsed = this.parser.parse(expression);
        const variables = Array.from(new Set(parsed.variables())).sort((left, right) => left.localeCompare(right));
        return { field, expression, variables };
      } catch (err) {
        throw new Error(`[FATAL] Formula config invalid: ${field} — ${(err as Error).message}`);
      }
    });

    for (const requiredField of REQUIRED_EDITABLE_FORMULA_FIELDS) {
      if (!normalized.some((definition) => definition.field === requiredField)) {
        throw new Error(`[FATAL] Formula config invalid: missing required formula ${requiredField}`);
      }
    }

    return normalized;
  }

  private validateDefinitionList(definitions: FormulaDefinition[]): void {
    const availableVariables = new Set<string>(BASE_FORMULA_VARIABLES);
    const seenFields = new Set<string>();

    for (const definition of definitions) {
      if (seenFields.has(definition.field)) {
        throw new Error(`[FATAL] Formula config invalid: ${definition.field} — duplicate field name`);
      }

      let parsedVariables: string[];
      try {
        parsedVariables = Array.from(new Set(this.parser.parse(definition.expression).variables()));
      } catch (err) {
        throw new Error(
          `[FATAL] Formula config invalid: ${definition.field} — ${(err as Error).message}`,
        );
      }

      const unknownVariables = parsedVariables.filter((variable) => !availableVariables.has(variable));
      if (unknownVariables.length > 0) {
        throw new Error(
          `[FATAL] Formula config invalid: ${definition.field} — unknown variables: ${unknownVariables.join(', ')}`,
        );
      }

      availableVariables.add(definition.field);
      seenFields.add(definition.field);
    }
  }
}

export const formulaService = new FormulaService();
