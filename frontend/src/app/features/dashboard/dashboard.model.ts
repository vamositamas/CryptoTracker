export interface KpiData {
  totalTrades: number;
  totalNetProfit: number;
  bestSingleTrade: number | null;
  winRate: number;
}

export interface MonthlyData {
  year: number;
  month: number;
  tradeCount: number;
  netProfit: number;
  winRate: number;
}

export interface DashboardTokenData {
  token: string;
  tradeCount: number;
  netProfit: number;
  averageProfitPercent: number;
  winRate: number;
}

export interface DashboardWeekdayData {
  weekday: string;
  tradeCount: number;
  netProfit: number;
}

export interface DashboardOverview {
  kpis: KpiData & {
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
  monthly: MonthlyData[];
  tokenStats: DashboardTokenData[];
  weekdayStats: DashboardWeekdayData[];
}
