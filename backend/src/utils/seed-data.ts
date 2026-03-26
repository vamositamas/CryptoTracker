import * as fs from 'fs/promises';
import * as path from 'path';
import { atomicWrite } from './atomic-write';

const DEFAULT_TOKENS = [
  { id: 'BTC', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ETH', symbol: 'ETH', name: 'Ethereum' },
  { id: 'SOL', symbol: 'SOL', name: 'Solana' },
  { id: 'BNB', symbol: 'BNB', name: 'BNB' },
  { id: 'XRP', symbol: 'XRP', name: 'XRP' },
  { id: 'DOGE', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'AVAX', symbol: 'AVAX', name: 'Avalanche' },
];

const DEFAULT_TRADE_TYPES = [
  { id: 'spot', name: 'Spot' },
  { id: 'futures', name: 'Futures' },
  { id: 'margin', name: 'Margin' },
];

const DEFAULT_POSITIONS = [
  { id: 'long', name: 'Long' },
  { id: 'short', name: 'Short' },
];

const DEFAULT_FORMULAS = [
  { field: 'investment',        expression: 'volume * buyPrice / leverage',                                       variables: ['volume', 'buyPrice', 'leverage'] },
  { field: 'investmentAll',     expression: 'volume * buyPrice',                                                  variables: ['volume', 'buyPrice'] },
  { field: 'sellValue',         expression: 'volume * sellPrice',                                                 variables: ['volume', 'sellPrice'] },
  { field: 'cost',              expression: 'volume * buyPrice / leverage',                                       variables: ['volume', 'buyPrice', 'leverage'] },
  { field: 'nettoProfit',       expression: '(sellPrice - buyPrice) * volume / leverage',                        variables: ['sellPrice', 'buyPrice', 'volume', 'leverage'] },
  { field: 'profitPercent',     expression: '(sellPrice - buyPrice) / buyPrice * leverage * 100',                variables: ['sellPrice', 'buyPrice', 'leverage'] },
  { field: 'profitRealPercent', expression: '(sellPrice - buyPrice) / buyPrice * 100',                           variables: ['sellPrice', 'buyPrice'] },
  { field: 'dailyProfitPercent', expression: '(sellPrice - buyPrice) / buyPrice * leverage * 100 / holdingDays', variables: ['sellPrice', 'buyPrice', 'leverage', 'holdingDays'] },
  // result ('Win'/'Loss') is a string — not evaluable by expr-eval; handled in FormulaService.applyAll
  { field: 'result',            expression: 'nettoProfit',                                                        variables: ['nettoProfit'] },
];

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates default seed data files if they do not already exist.
 * Called once at server startup. Does NOT overwrite existing data.
 */
export async function initSeedData(dataDir: string): Promise<void> {
  const shared = path.join(dataDir, 'shared');
  const config = path.join(dataDir, 'config');
  const seeds: Array<[string, unknown]> = [
    [path.join(shared, 'tokens.json'), DEFAULT_TOKENS],
    [path.join(shared, 'trade-types.json'), DEFAULT_TRADE_TYPES],
    [path.join(shared, 'positions.json'), DEFAULT_POSITIONS],
    [path.join(config, 'formulas.json'), DEFAULT_FORMULAS],
  ];
  for (const [filePath, data] of seeds) {
    if (!(await fileExists(filePath))) {
      await atomicWrite(filePath, data);
    }
  }
}
