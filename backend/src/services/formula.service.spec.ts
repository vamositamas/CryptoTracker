import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fss from 'fs';
import { FormulaService, stripCalculatedFields, CALCULATED_FIELDS, type RawTrade } from './formula.service';

const DEFAULT_FORMULAS = [
  { field: 'investment',         expression: 'volume * buyPrice / leverage',                                        variables: ['volume', 'buyPrice', 'leverage'] },
  { field: 'investmentAll',      expression: 'volume * buyPrice',                                                   variables: ['volume', 'buyPrice'] },
  { field: 'sellValue',          expression: 'volume * sellPrice',                                                  variables: ['volume', 'sellPrice'] },
  { field: 'cost',               expression: 'volume * buyPrice / leverage',                                        variables: ['volume', 'buyPrice', 'leverage'] },
  { field: 'nettoProfit',        expression: '(sellPrice - buyPrice) * volume / leverage',                         variables: ['sellPrice', 'buyPrice', 'volume', 'leverage'] },
  { field: 'profitPercent',      expression: '(sellPrice - buyPrice) / buyPrice * leverage * 100',                 variables: ['sellPrice', 'buyPrice', 'leverage'] },
  { field: 'profitRealPercent',  expression: '(sellPrice - buyPrice) / buyPrice * 100',                            variables: ['sellPrice', 'buyPrice'] },
  { field: 'dailyProfitPercent', expression: '(sellPrice - buyPrice) / buyPrice * leverage * 100 / holdingDays',  variables: ['sellPrice', 'buyPrice', 'leverage', 'holdingDays'] },
  { field: 'result',             expression: 'nettoProfit',                                                         variables: ['nettoProfit'] },
];

interface Fixture {
  scenario: string;
  input: RawTrade;
  expected: Record<string, number | string>;
}

const fixturePath = path.join(__dirname, 'formula-fixture.json');
const fixtures: Fixture[] = JSON.parse(fss.readFileSync(fixturePath, 'utf-8')) as Fixture[];

let tmpDir: string;
let svc: FormulaService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ct-formula-'));
  const formulasPath = path.join(tmpDir, 'formulas.json');
  await fs.writeFile(formulasPath, JSON.stringify(DEFAULT_FORMULAS), 'utf-8');
  svc = new FormulaService(formulasPath);
  await svc.load();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('FormulaService.validate()', () => {
  it('does not throw when all expressions are valid', () => {
    expect(() => svc.validate()).not.toThrow();
  });

  it('throws [FATAL] with field name on a malformed expression', async () => {
    const badFormulas = [
      ...DEFAULT_FORMULAS.slice(0, 4),
      { field: 'nettoProfit', expression: '(sellPrice - buyPrice * / leverage', variables: [] },
      ...DEFAULT_FORMULAS.slice(5),
    ];
    const badPath = path.join(tmpDir, 'bad-formulas.json');
    await fs.writeFile(badPath, JSON.stringify(badFormulas), 'utf-8');
    const badSvc = new FormulaService(badPath);
    await badSvc.load();
    expect(() => badSvc.validate()).toThrow('[FATAL] Formula config invalid: nettoProfit');
  });
});

describe('FormulaService.load()', () => {
  it('throws [FATAL] when the formulas file does not exist', async () => {
    const missingSvc = new FormulaService(path.join(tmpDir, 'nonexistent.json'));
    await expect(missingSvc.load()).rejects.toThrow('[FATAL]');
  });
});

describe('FormulaService.applyAll() — Excel parity fixture', () => {
  for (const fixture of fixtures) {
    it(`scenario: ${fixture.scenario}`, () => {
      svc.validate();
      const result = svc.applyAll(fixture.input);

      // Numeric fields — use toBeCloseTo for float tolerance (2 decimal places)
      const numericFields = [
        'investment', 'investmentAll', 'sellValue', 'cost',
        'nettoProfit', 'profitPercent', 'profitRealPercent', 'dailyProfitPercent',
      ] as const;

      for (const field of numericFields) {
        expect(result[field], `${fixture.scenario}: ${field}`).toBeCloseTo(
          fixture.expected[field] as number,
          2,
        );
      }

      // String field
      expect(result.result, `${fixture.scenario}: result`).toBe(fixture.expected['result']);
    });
  }
});

describe('stripCalculatedFields()', () => {
  it('removes all 9 calculated fields from a body object', () => {
    const body: Record<string, unknown> = {
      type: 'long',
      volume: 50,
      buyPrice: 8.47,
      investment: 42.35,
      nettoProfit: 18.65,
      result: 'Win',
    };
    const stripped = stripCalculatedFields(body);
    for (const field of CALCULATED_FIELDS) {
      expect(stripped).not.toHaveProperty(field);
    }
    expect(stripped).toHaveProperty('type');
    expect(stripped).toHaveProperty('volume');
    expect(stripped).toHaveProperty('buyPrice');
  });
});
