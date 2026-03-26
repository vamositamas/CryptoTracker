import { Router, Request, Response } from 'express';
import { traderMiddleware } from '../middleware/trader.middleware';
import { storageService } from '../services/storage.service';
import { formulaService, RawTrade, EnrichedTrade } from '../services/formula.service';

const router = Router();

// Apply traderMiddleware to all dashboard routes
router.use(traderMiddleware);

type TraderRequest = Request & { trader: string };

interface KpiResponse {
  totalTrades: number;
  totalNetProfit: number;
  bestSingleTrade: number | null;
  winRate: number;
}

interface MonthlyRow {
  year: number;
  month: number;
  tradeCount: number;
  netProfit: number;
  winRate: number;
}

/**
 * Reads trades for a trader, returning [] if the file doesn't exist yet.
 */
async function readTrades(trader: string): Promise<RawTrade[]> {
  try {
    return (await storageService.read<RawTrade[]>(`traders/${trader}/trades.json`)) ?? [];
  } catch {
    return [];
  }
}

// --- GET /api/v1/dashboard/kpis ---
router.get('/kpis', async (req: Request, res: Response) => {
  const { trader } = req as TraderRequest;

  const rawTrades = await readTrades(trader);
  const enriched = rawTrades.map((t) => formulaService.applyAll(t));

  if (enriched.length === 0) {
    const emptyResponse: KpiResponse = {
      totalTrades: 0,
      totalNetProfit: 0,
      bestSingleTrade: null,
      winRate: 0,
    };
    res.json(emptyResponse);
    return;
  }

  const totalTrades = enriched.length;
  const totalNetProfit = enriched.reduce((sum, t) => sum + t.nettoProfit, 0);
  const bestSingleTrade = Math.max(...enriched.map((t) => t.nettoProfit));
  const wins = enriched.filter((t) => t.result === 'Win').length;
  const winRate = wins / totalTrades;

  const response: KpiResponse = {
    totalTrades,
    totalNetProfit,
    bestSingleTrade,
    winRate,
  };

  res.json(response);
});

// --- GET /api/v1/dashboard/monthly ---
router.get('/monthly', async (req: Request, res: Response) => {
  const { trader } = req as TraderRequest;

  const rawTrades = await readTrades(trader);
  const enriched = rawTrades.map((t) => formulaService.applyAll(t));

  if (enriched.length === 0) {
    res.json([]);
    return;
  }

  // Group trades by year-month
  const monthlyMap = new Map<string, EnrichedTrade[]>();
  for (const trade of enriched) {
    const date = new Date(trade.closeDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, []);
    }
    monthlyMap.get(key)!.push(trade);
  }

  // Calculate aggregations per month
  const rows: MonthlyRow[] = [];
  for (const [key, trades] of monthlyMap.entries()) {
    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const tradeCount = trades.length;
    const netProfit = trades.reduce((sum, t) => sum + t.nettoProfit, 0);
    const wins = trades.filter((t) => t.result === 'Win').length;
    const winRate = wins / tradeCount;

    rows.push({ year, month, tradeCount, netProfit, winRate });
  }

  // Sort chronologically ascending
  rows.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  res.json(rows);
});

export default router;
