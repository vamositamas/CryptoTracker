import * as fs from 'fs/promises';
import * as path from 'path';
import { Parser } from 'expr-eval';

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

export interface RawTrade {
  type: string;
  position: string;
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
    for (const def of this.definitions) {
      try {
        this.parser.parse(def.expression);
      } catch (err) {
        throw new Error(
          `[FATAL] Formula config invalid: ${def.field} — ${(err as Error).message}`,
        );
      }
    }
  }

  applyAll(rawTrade: RawTrade): EnrichedTrade {
    const vars: Record<string, unknown> = { ...rawTrade };
    const calculated: Record<string, number | string> = {};

    for (const def of this.definitions) {
      // 'result' is a string (Win/Loss) — handled as post-process, not via expr-eval
      if (def.field === 'result') {
        continue;
      }
      const expr = this.parser.parse(def.expression);
      calculated[def.field] = expr.evaluate(vars as Record<string, number>);
      // Make intermediate results available to subsequent formulas
      vars[def.field] = calculated[def.field];
    }

    // Post-process: result is 'Win' or 'Loss' based on nettoProfit sign
    const nettoProfit = calculated['nettoProfit'] as number;
    calculated['result'] = nettoProfit >= 0 ? 'Win' : 'Loss';

    return { ...rawTrade, ...calculated } as EnrichedTrade;
  }
}

export const formulaService = new FormulaService();
