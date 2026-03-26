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
