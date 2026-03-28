/**
 * The 7 fields a user enters when creating a trade.
 * holdingDays is computed server-side from createdAt → closeDate.
 */
export interface CreateTradeDto {
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
}

/**
 * A trade record as stored in trades.json (7 input fields + server-generated metadata).
 * Calculated fields are never stored.
 */
export interface RawTrade extends CreateTradeDto {
  id: string;
  createdAt: string;
  holdingDays: number;
}

/**
 * A trade record enriched with all 9 calculated P&L fields.
 * Returned by the API on every read — never stored.
 */
export interface EnrichedTrade extends RawTrade {
  investment: number;
  investmentAll: number;
  sellValue: number;
  cost: number;
  nettoProfit: number;
  profitPercent: number;
  profitRealPercent: number;
  dailyProfitPercent: number;
  result: 'Win' | 'Loss';
}

/** Typed API error matching the backend error envelope. */
export interface ApiError {
  code: string;
  message: string;
  field?: string;
  row?: number;
}

export interface TradeImportResponse {
  imported: number;
  trades: EnrichedTrade[];
}

/** Active filter values for the trade list. Empty/[] means "no filter on this field". */
export interface FilterState {
  positions: string[]; // Multi-select tokens
  tradePosition: string;
  type: string;
  result: string;
  dateFrom: string;
  dateTo: string;
}
