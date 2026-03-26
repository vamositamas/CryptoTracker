# Story 5.1: Dashboard Backend Aggregations

**Epic:** 5 — Dashboard & Analytics  
**Status:** review  
**Commit:** b978b25

## Summary

Backend aggregation endpoints that calculate KPI summaries and monthly performance rollups from raw trades scoped to the requesting trader.

## Acceptance Criteria

- [x] `GET /api/v1/dashboard/kpis` returns `{ totalTrades, totalNetProfit, bestSingleTrade, winRate }`
- [x] All values calculated from stored raw trades re-derived via `FormulaService.applyAll()`
- [x] `winRate` expressed as decimal (e.g. 0.72 for 72%)
- [x] `GET /api/v1/dashboard/monthly` returns array of `{ year, month, tradeCount, netProfit, winRate }` rows
- [x] One row per calendar month present in trader's data
- [x] Rows ordered chronologically ascending
- [x] Empty state: no trades → `{ totalTrades: 0, totalNetProfit: 0, bestSingleTrade: null, winRate: 0 }` for KPIs and `[]` for monthly
- [x] Both endpoints trader-scoped via traderMiddleware
- [x] Registered in server.ts at `/api/v1/dashboard`

## Files Created / Modified

| File | Change |
|------|--------|
| `backend/src/routes/dashboard.routes.ts` | NEW — KPI and monthly aggregation endpoints |
| `backend/src/routes/dashboard.routes.spec.ts` | NEW — 8 tests (empty state, single trade, multi-trade, all-loss, multi-month, multi-year, sort order) |
| `backend/src/server.ts` | Registered dashboardRouter |
| `backend/src/server.spec.ts` | Added dashboard route mount tests |

## Test Results

- Backend: 86/86 tests pass (12 files)
- New tests: 8 dashboard route tests
- Server tests: 2 new mount tests

## Implementation Notes

- **Month grouping:** Uses `closeDate` field to group trades by year-month
- **KPI calculations:**
  - `totalTrades`: count of all trades
  - `totalNetProfit`: sum of nettoProfit from enriched trades
  - `bestSingleTrade`: Math.max of nettoProfit values
  - `winRate`: count(result='Win') / totalTrades (as decimal)
- **Monthly aggregations:**
  - Group by `YYYY-MM` key from closeDate
  - Calculate netProfit sum and winRate per month
  - Sort chronologically (year asc, month asc)
- **Empty state:** Both endpoints handle missing trades.json gracefully
