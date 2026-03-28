import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { storageService } from '../services/storage.service';
import { formulaService, RawTrade, EnrichedTrade } from '../services/formula.service';

const router = Router();

router.use(authMiddleware);
router.use(requirePermission('dashboard:read'));

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
  profitPercent: number;
  totalDailyProfitPercent: number;
  winRate: number;
}

interface TokenRow {
  token: string;
  tradeCount: number;
  netProfit: number;
  averageProfitPercent: number;
  winRate: number;
}

interface WeekdayRow {
  weekday: string;
  tradeCount: number;
  netProfit: number;
}

interface DashboardOverviewResponse {
  kpis: KpiResponse & {
    worstSingleTrade: number | null;
    totalProfitPercent: number;
    averageProfitPercent: number;
    averageDailyProfitPercent: number;
    maxDailyProfitPercent: number | null;
    minDailyProfitPercent: number | null;
    maxProfitByTradePercent: number | null;
    maxLossByTradePercent: number | null;
  };
  split: {
    winTrades: number;
    lossTrades: number;
    shortTrades: number;
    longTrades: number;
  };
  monthly: MonthlyRow[];
  tokenStats: TokenRow[];
  weekdayStats: WeekdayRow[];
}

function buildMonthlyRows(enriched: EnrichedTrade[]): MonthlyRow[] {
  if (enriched.length === 0) {
    return [];
  }

  const monthlyMap = new Map<string, EnrichedTrade[]>();
  for (const trade of enriched) {
    const date = new Date(trade.closeDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, []);
    }
    monthlyMap.get(key)!.push(trade);
  }

  const rows: MonthlyRow[] = [];
  for (const [key, trades] of monthlyMap.entries()) {
    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const tradeCount = trades.length;
    const netProfit = trades.reduce((sum, t) => sum + t.nettoProfit, 0);
    const wins = trades.filter((t) => t.result === 'Win').length;
    const winRate = wins / tradeCount;
    const profitPercent = trades.reduce((sum, t) => sum + t.profitPercent, 0);
    const totalDailyProfitPercent = tradeCount > 0 ? profitPercent / tradeCount : 0;

    rows.push({ year, month, tradeCount, netProfit, profitPercent, totalDailyProfitPercent, winRate });
  }

  rows.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  return rows;
}

function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function normalizeToken(trade: EnrichedTrade): string {
  const raw = String(trade.token ?? trade.position ?? '').trim();
  return raw ? raw.toUpperCase() : 'UNKNOWN';
}

function normalizeWeekday(closeDate: string): string {
  const date = new Date(closeDate);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function parseYearFilter(queryYear: unknown): number | null {
  if (typeof queryYear !== 'string' || queryYear.trim() === '') {
    return null;
  }

  const parsed = Number.parseInt(queryYear, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function filterTradesByYear(enriched: EnrichedTrade[], year: number | null): EnrichedTrade[] {
  if (year === null) {
    return enriched;
  }

  return enriched.filter((trade) => {
    const tradeYear = new Date(trade.closeDate).getFullYear();
    return tradeYear === year;
  });
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
  const trader = req.user!.username;

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
  const trader = req.user!.username;

  const rawTrades = await readTrades(trader);
  const enriched = rawTrades.map((t) => formulaService.applyAll(t));

  res.json(buildMonthlyRows(enriched));
});

// --- GET /api/v1/dashboard/overview ---
router.get('/overview', async (req: Request, res: Response) => {
  const trader = req.user!.username;
  const rawTrades = await readTrades(trader);
  const enriched = rawTrades.map((trade) => formulaService.applyAll(trade));
  const requestedYear = parseYearFilter(req.query['year']);
  const filtered = filterTradesByYear(enriched, requestedYear);

  if (filtered.length === 0) {
    const empty: DashboardOverviewResponse = {
      kpis: {
        totalTrades: 0,
        totalNetProfit: 0,
        bestSingleTrade: null,
        worstSingleTrade: null,
        winRate: 0,
        totalProfitPercent: 0,
        averageProfitPercent: 0,
        averageDailyProfitPercent: 0,
        maxDailyProfitPercent: null,
        minDailyProfitPercent: null,
        maxProfitByTradePercent: null,
        maxLossByTradePercent: null,
      },
      split: {
        winTrades: 0,
        lossTrades: 0,
        shortTrades: 0,
        longTrades: 0,
      },
      monthly: [],
      tokenStats: [],
      weekdayStats: [],
    };
    res.json(empty);
    return;
  }

  const totalTrades = filtered.length;
  const totalNetProfit = filtered.reduce((sum, trade) => sum + trade.nettoProfit, 0);
  const bestSingleTrade = Math.max(...filtered.map((trade) => trade.nettoProfit));
  const worstSingleTrade = Math.min(...filtered.map((trade) => trade.nettoProfit));
  const winTrades = filtered.filter((trade) => trade.result === 'Win').length;
  const lossTrades = totalTrades - winTrades;
  const winRate = safeDivide(winTrades, totalTrades);

  const averageProfitPercent = safeDivide(
    filtered.reduce((sum, trade) => sum + trade.profitPercent, 0),
    totalTrades,
  );
  const averageDailyProfitPercent = safeDivide(
    filtered.reduce((sum, trade) => sum + trade.dailyProfitPercent, 0),
    totalTrades,
  );
  const maxDailyProfitPercent = Math.max(...filtered.map((trade) => trade.dailyProfitPercent));
  const minDailyProfitPercent = Math.min(...filtered.map((trade) => trade.dailyProfitPercent));
  const maxProfitByTradePercent = Math.max(...filtered.map((trade) => trade.profitPercent));
  const maxLossByTradePercent = Math.min(...filtered.map((trade) => trade.profitPercent));

  const tokenBuckets = new Map<string, EnrichedTrade[]>();
  for (const trade of filtered) {
    const token = normalizeToken(trade);
    if (!tokenBuckets.has(token)) {
      tokenBuckets.set(token, []);
    }
    tokenBuckets.get(token)!.push(trade);
  }

  const tokenStats: TokenRow[] = Array.from(tokenBuckets.entries()).map(([token, trades]) => {
    const tradeCount = trades.length;
    const netProfit = trades.reduce((sum, trade) => sum + trade.nettoProfit, 0);
    const avgProfitPercent = safeDivide(
      trades.reduce((sum, trade) => sum + trade.profitPercent, 0),
      tradeCount,
    );
    const wins = trades.filter((trade) => trade.result === 'Win').length;

    return {
      token,
      tradeCount,
      netProfit,
      averageProfitPercent: avgProfitPercent,
      winRate: safeDivide(wins, tradeCount),
    };
  }).sort((a, b) => b.netProfit - a.netProfit).slice(0, 8);

  const weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekdayBuckets = new Map<string, EnrichedTrade[]>();
  for (const day of weekdayOrder) {
    weekdayBuckets.set(day, []);
  }
  for (const trade of filtered) {
    const day = normalizeWeekday(trade.closeDate);
    if (!weekdayBuckets.has(day)) {
      weekdayBuckets.set(day, []);
    }
    weekdayBuckets.get(day)!.push(trade);
  }

  const weekdayStats: WeekdayRow[] = Array.from(weekdayBuckets.entries())
    .filter(([, trades]) => trades.length > 0)
    .map(([weekday, trades]) => ({
      weekday,
      tradeCount: trades.length,
      netProfit: trades.reduce((sum, trade) => sum + trade.nettoProfit, 0),
    }))
    .sort((a, b) => weekdayOrder.indexOf(a.weekday) - weekdayOrder.indexOf(b.weekday));

  const shortTrades = filtered.filter((trade) => String(trade.tradePosition ?? 'long').toLowerCase() === 'short').length;
  const longTrades = totalTrades - shortTrades;

  const overview: DashboardOverviewResponse = {
    kpis: {
      totalTrades,
      totalNetProfit,
      bestSingleTrade,
      worstSingleTrade,
      winRate,
      totalProfitPercent: filtered.reduce((sum, trade) => sum + trade.profitPercent, 0),
      averageProfitPercent,
      averageDailyProfitPercent,
      maxDailyProfitPercent,
      minDailyProfitPercent,
      maxProfitByTradePercent,
      maxLossByTradePercent,
    },
    split: {
      winTrades,
      lossTrades,
      shortTrades,
      longTrades,
    },
    monthly: buildMonthlyRows(filtered),
    tokenStats,
    weekdayStats,
  };

  res.json(overview);
});

export default router;
