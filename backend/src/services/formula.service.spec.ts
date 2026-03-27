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
  { field: 'nettoProfit',        expression: '(sellPrice - buyPrice) * volume * positionMultiplier - brokerCost',                       variables: ['sellPrice', 'buyPrice', 'volume', 'positionMultiplier', 'brokerCost'] },
  { field: 'profitPercent',      expression: '(sellPrice - buyPrice) / buyPrice * leverage * 100 * positionMultiplier',                 variables: ['sellPrice', 'buyPrice', 'leverage', 'positionMultiplier'] },
  { field: 'profitRealPercent',  expression: '(sellPrice - buyPrice) / buyPrice * 100 * positionMultiplier',                            variables: ['sellPrice', 'buyPrice', 'positionMultiplier'] },
  { field: 'dailyProfitPercent', expression: '(sellPrice - buyPrice) / buyPrice * leverage * 100 / holdingDays * positionMultiplier',  variables: ['sellPrice', 'buyPrice', 'leverage', 'holdingDays', 'positionMultiplier'] },
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

  it('throws when a formula references a variable that is not available yet', async () => {
    const badFormulas = [
      { field: 'riskScore', expression: 'nettoProfit / investment', variables: ['investment', 'nettoProfit'] },
      ...DEFAULT_FORMULAS,
    ];
    const badPath = path.join(tmpDir, 'bad-order-formulas.json');
    await fs.writeFile(badPath, JSON.stringify(badFormulas), 'utf-8');
    const badSvc = new FormulaService(badPath);
    await badSvc.load();

    expect(() => badSvc.validate()).toThrow('[FATAL] Formula config invalid: riskScore');
  });
});

describe('FormulaService.load()', () => {
  it('throws [FATAL] when the formulas file does not exist', async () => {
    const missingSvc = new FormulaService(path.join(tmpDir, 'nonexistent.json'));
    await expect(missingSvc.load()).rejects.toThrow('[FATAL]');
  });
});

describe('FormulaService.replaceEditableDefinitions()', () => {
  it('persists normalized formulas and keeps the derived result definition', async () => {
    const saved = await svc.replaceEditableDefinitions([
      { field: 'investment', expression: 'volume * buyPrice / leverage' },
      { field: 'investmentAll', expression: 'volume * buyPrice' },
      { field: 'sellValue', expression: 'volume * sellPrice' },
      { field: 'cost', expression: 'volume * buyPrice / leverage' },
      { field: 'nettoProfit', expression: '(sellPrice - buyPrice) * volume * positionMultiplier - brokerCost' },
      { field: 'profitPercent', expression: '(sellPrice - buyPrice) / buyPrice * leverage * 100 * positionMultiplier' },
      { field: 'profitRealPercent', expression: '(sellPrice - buyPrice) / buyPrice * 100 * positionMultiplier' },
      { field: 'dailyProfitPercent', expression: '(sellPrice - buyPrice) / buyPrice * leverage * 100 / holdingDays * positionMultiplier' },
      { field: 'riskScore', expression: 'nettoProfit / investment' },
    ]);

    expect(saved.at(-1)).toEqual({
      field: 'riskScore',
      expression: 'nettoProfit / investment',
      variables: ['investment', 'nettoProfit'],
    });

    const persisted = JSON.parse(
      await fs.readFile(path.join(tmpDir, 'formulas.json'), 'utf-8'),
    ) as Array<{ field: string; expression: string; variables: string[] }>;

    expect(persisted.at(-2)).toEqual({
      field: 'riskScore',
      expression: 'nettoProfit / investment',
      variables: ['investment', 'nettoProfit'],
    });
    expect(persisted.at(-1)).toEqual({
      field: 'result',
      expression: 'nettoProfit',
      variables: ['nettoProfit'],
    });
  });

  it('rejects custom formulas that reuse reserved input field names', async () => {
    await expect(
      svc.replaceEditableDefinitions([
        { field: 'investment', expression: 'volume * buyPrice / leverage' },
        { field: 'investmentAll', expression: 'volume * buyPrice' },
        { field: 'sellValue', expression: 'volume * sellPrice' },
        { field: 'cost', expression: 'volume * buyPrice / leverage' },
        { field: 'nettoProfit', expression: '(sellPrice - buyPrice) * volume * positionMultiplier - brokerCost' },
        { field: 'profitPercent', expression: '(sellPrice - buyPrice) / buyPrice * leverage * 100 * positionMultiplier' },
        { field: 'profitRealPercent', expression: '(sellPrice - buyPrice) / buyPrice * 100 * positionMultiplier' },
        { field: 'dailyProfitPercent', expression: '(sellPrice - buyPrice) / buyPrice * leverage * 100 / holdingDays * positionMultiplier' },
        { field: 'volume', expression: 'buyPrice * 2' },
      ]),
    ).rejects.toThrow('field name is reserved');
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

  it('inverts profit calculations for short positions', () => {
    svc.validate();

    const result = svc.applyAll({
      type: 'spot',
      position: 'BTC',
      tradePosition: 'short',
      leverage: 2,
      volume: 1,
      buyPrice: 100,
      sellPrice: 110,
      closeDate: '2026-03-26',
      holdingDays: 1,
    });

    expect(result.nettoProfit).toBeCloseTo(-10, 2);
    expect(result.profitPercent).toBeCloseTo(-20, 2);
    expect(result.profitRealPercent).toBeCloseTo(-10, 2);
    expect(result.dailyProfitPercent).toBeCloseTo(-20, 2);
    expect(result.result).toBe('Loss');
  });

  it('subtracts broker cost from netto profit', () => {
    svc.validate();

    const result = svc.applyAll({
      type: 'spot',
      position: 'BTC',
      tradePosition: 'long',
      leverage: 1,
      volume: 1,
      buyPrice: 100,
      sellPrice: 110,
      brokerCost: 3,
      closeDate: '2026-03-26',
      holdingDays: 1,
    });

    expect(result.nettoProfit).toBeCloseTo(7, 2);
    expect(result.result).toBe('Win');
  });
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
