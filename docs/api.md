# CryptoTracker API Reference

- **OpenAPI spec:** [`openapi.yaml`](./openapi.yaml) — renderable with Swagger UI or Redoc
- **Base URL (dev):** `http://localhost:3001`
- **Base URL (Docker):** `http://localhost:80` (nginx proxies `/api/*` to the backend)
- **API version prefix:** `/api/v1`

---

## Authentication

All trade, dashboard, and audit endpoints require a trader identity header:

```http
X-Trader-Username: tamas
```

The server validates the value against `data/shared/traders.json`.  
Missing or unknown → **401 Unauthorized**.

---

## Response envelopes

### Success
Shapes vary per endpoint — see the sections below.

### Error
Every non-2xx response uses one consistent shape:

```json
{
  "error": {
    "code":    "VALIDATION_ERROR",
    "message": "Human-readable description",
    "field":   "fieldName"
  }
}
```

| Code | HTTP | When |
|------|------|------|
| `MISSING_TRADER` | 401 | `X-Trader-Username` header absent |
| `UNKNOWN_TRADER` | 401 | Username not in traders list |
| `VALIDATION_ERROR` | 400 | Request body fails field-level validation |
| `NOT_FOUND` | 404 | Resource does not exist |
| `FORBIDDEN` | 403 | Resource belongs to a different trader |
| `DUPLICATE_ENTRY` | 409 | Unique constraint violation (master data) |
| `INVALID_MASTER_DATA_TYPE` | 400 | Path `:type` is not `tokens`, `positions`, or `trade-types` |
| `INVALID_FORMULA_CONFIG` | 400 | Formula definitions are invalid or incomplete |
| `INTERNAL_ERROR` | 500 | Unexpected server-side failure |

---

## Endpoints

### Health

#### `GET /api/v1/health`
Liveness check — no auth required.

```bash
curl http://localhost:3001/api/v1/health
```
```json
{ "status": "ok" }
```

---

### Traders

#### `GET /api/v1/traders`
List all known trader usernames. No auth required.

```bash
curl http://localhost:3001/api/v1/traders
```
```json
["tamas", "alice"]
```

---

### Trades

All trade endpoints require `X-Trader-Username`.

#### `GET /api/v1/trades`
List all trades for the authenticated trader.  
Each trade is enriched with 9 calculated fields (see [Trade model](#trade-fields)).

```bash
curl http://localhost:3001/api/v1/trades \
  -H "X-Trader-Username: tamas"
```
```json
{
  "total": 1,
  "trades": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "createdAt": "2024-06-01T10:00:00.000Z",
      "holdingDays": 5,
      "position": "BTC",
      "token": "BTC",
      "type": "spot",
      "tradePosition": "long",
      "leverage": 2,
      "volume": 0.5,
      "buyPrice": 30000,
      "sellPrice": 35000,
      "brokerCost": 12.5,
      "closeDate": "2024-06-06",
      "investment": 7500,
      "investmentAll": 15000,
      "sellValue": 8750,
      "cost": 12.5,
      "nettoProfit": 1237.5,
      "profitPercent": 16.5,
      "profitRealPercent": 8.25,
      "dailyProfitPercent": 3.3,
      "result": "Win"
    }
  ]
}
```

---

#### `POST /api/v1/trades`
Create a single trade. Returns the enriched trade (201). Triggers an audit `CREATE` entry.

```bash
curl -X POST http://localhost:3001/api/v1/trades \
  -H "X-Trader-Username: tamas" \
  -H "Content-Type: application/json" \
  -d '{
    "position":      "BTC",
    "type":          "spot",
    "tradePosition": "long",
    "leverage":      2,
    "volume":        0.5,
    "buyPrice":      30000,
    "sellPrice":     35000,
    "brokerCost":    12.5,
    "closeDate":     "2024-06-06"
  }'
```

**Validation rules:**

| Field | Required | Constraint |
|-------|----------|------------|
| `position` | Yes | Non-empty string |
| `token` | No | Defaults to `position` |
| `type` | Yes | Non-empty string |
| `tradePosition` | No | Defaults to `"long"` |
| `leverage` | Yes | Number > 0 |
| `volume` | Yes | Number > 0 |
| `buyPrice` | Yes | Number > 0 |
| `sellPrice` | Yes | Number > 0 |
| `brokerCost` | No | Number ≥ 0, defaults to `0` |
| `closeDate` | Yes | Valid ISO date (YYYY-MM-DD) |

---

#### `POST /api/v1/trades/import`
Bulk import trades in one request. If any row fails validation the entire import is rejected (no partial writes).

```bash
curl -X POST http://localhost:3001/api/v1/trades/import \
  -H "X-Trader-Username: tamas" \
  -H "Content-Type: application/json" \
  -d '{
    "trades": [
      { "position": "BTC", "type": "spot", "leverage": 1,
        "volume": 1, "buyPrice": 50000, "sellPrice": 55000, "closeDate": "2024-01-15" },
      { "position": "ETH", "type": "futures", "leverage": 5,
        "volume": 2, "buyPrice": 3000, "sellPrice": 2800, "closeDate": "2024-02-10" }
    ]
  }'
```
```json
{
  "imported": 2,
  "trades": [ /* enriched trade objects */ ]
}
```

---

#### `PUT /api/v1/trades/:id`
Replace all editable fields of a trade. Calculated fields are recomputed.  
→ 403 if the trade belongs to a different trader  
→ 404 if not found  
Triggers an audit `UPDATE` entry.

```bash
curl -X PUT http://localhost:3001/api/v1/trades/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-Trader-Username: tamas" \
  -H "Content-Type: application/json" \
  -d '{ "position": "BTC", "type": "spot", "leverage": 2,
        "volume": 0.5, "buyPrice": 30000, "sellPrice": 36000,
        "brokerCost": 12.5, "closeDate": "2024-06-06" }'
```

---

#### `DELETE /api/v1/trades/:id`
Permanently deletes a trade.  
→ 403 if the trade belongs to a different trader  
→ 404 if not found  
Triggers an audit `DELETE` entry.

```bash
curl -X DELETE http://localhost:3001/api/v1/trades/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-Trader-Username: tamas"
```
```json
{ "deleted": true, "id": "550e8400-e29b-41d4-a716-446655440000" }
```

---

### Dashboard

All dashboard endpoints require `X-Trader-Username`.

#### `GET /api/v1/dashboard/overview[?year=YYYY]`
Recommended all-in-one endpoint. Returns KPIs, win/loss split, monthly breakdown,
per-token stats, and per-weekday stats in a single response.

```bash
# All-time
curl http://localhost:3001/api/v1/dashboard/overview \
  -H "X-Trader-Username: tamas"

# Filter to 2024
curl "http://localhost:3001/api/v1/dashboard/overview?year=2024" \
  -H "X-Trader-Username: tamas"
```
```json
{
  "kpis": {
    "totalTrades": 84,
    "totalNetProfit": 3250,
    "bestSingleTrade": 1237.5,
    "worstSingleTrade": -450,
    "winRate": 0.65,
    "totalProfitPercent": 43.2,
    "averageProfitPercent": 5.15,
    "averageDailyProfitPercent": 1.03,
    "maxDailyProfitPercent": 9.5,
    "minDailyProfitPercent": -3.25,
    "maxProfitByTradePercent": 16.5,
    "maxLossByTradePercent": -6.0
  },
  "split": { "winTrades": 55, "lossTrades": 29, "shortTrades": 30, "longTrades": 54 },
  "monthly": [
    { "year": 2024, "month": 6, "tradeCount": 12, "netProfit": 540, "winRate": 0.75 }
  ],
  "tokenStats": [
    { "token": "BTC", "tradeCount": 30, "netProfit": 1800, "averageProfitPercent": 6.0, "winRate": 0.70 }
  ],
  "weekdayStats": [
    { "weekday": "Monday", "tradeCount": 14, "netProfit": 600 }
  ]
}
```

The `?year` filter is applied on `closeDate`. All aggregates return zero-valued objects when no trades match — `null` fields in KPIs indicate "no data" (e.g. `bestSingleTrade: null` with zero trades).

#### `GET /api/v1/dashboard/kpis` *(legacy)*
A subset of KPI metrics only. Prefer `/overview`.

#### `GET /api/v1/dashboard/monthly` *(legacy)*
Monthly breakdown only. Prefer `/overview`.

---

### Master Data

Reference lists shared across all traders. No `X-Trader-Username` required.

Supported types:

| `:type` path value | Response key | Description |
|--------------------|-------------|-------------|
| `tokens`           | `tokens`    | Cryptocurrency tokens (id = uppercase symbol) |
| `positions`        | `positions` | Trade direction labels (e.g. long, short) |
| `trade-types`      | `tradeTypes`| Trade category labels (e.g. spot, futures) |

#### `GET /api/v1/master-data/:type`

```bash
curl http://localhost:3001/api/v1/master-data/tokens
```
```json
{
  "tokens": [
    { "id": "BTC", "symbol": "BTC", "name": "Bitcoin" },
    { "id": "ETH", "symbol": "ETH", "name": "Ethereum" }
  ]
}
```

#### `POST /api/v1/master-data/:type`

```bash
curl -X POST http://localhost:3001/api/v1/master-data/tokens \
  -H "Content-Type: application/json" \
  -d '{ "name": "Solana", "symbol": "SOL" }'
```
```json
{ "id": "SOL", "symbol": "SOL", "name": "Solana" }
```
→ 409 if same name or symbol already exists.

#### `PUT /api/v1/master-data/:type/:id`

```bash
curl -X PUT http://localhost:3001/api/v1/master-data/tokens/SOL \
  -H "Content-Type: application/json" \
  -d '{ "name": "Solana Updated", "symbol": "SOL" }'
```

#### `DELETE /api/v1/master-data/:type/:id`

```bash
curl -X DELETE http://localhost:3001/api/v1/master-data/tokens/SOL
```
```json
{ "deleted": true }
```

---

### Formulas

Configurable mathematical expressions that compute the 9 enriched trade fields.
No authentication required.

#### `GET /api/v1/formulas`

```bash
curl http://localhost:3001/api/v1/formulas
```
```json
{
  "formulas": [
    {
      "field": "investment",
      "expression": "volume * buyPrice / leverage",
      "variables": ["volume", "buyPrice", "leverage"],
      "required": true
    },
    {
      "field": "nettoProfit",
      "expression": "sellValue - investment - cost",
      "variables": ["sellValue", "investment", "cost"],
      "required": true
    }
  ]
}
```

Expressions use the [expr-eval](https://github.com/silentmatt/expr-eval) syntax.
Variables may reference raw trade fields (`volume`, `buyPrice`, `sellPrice`, `leverage`, `brokerCost`, `holdingDays`) or the output of earlier formula fields evaluated in order.

The `required: true` flag marks the 8 core profit-calculation fields that cannot be removed.

#### `POST /api/v1/formulas/preview`
Validate a new formula set without saving.

```bash
curl -X POST http://localhost:3001/api/v1/formulas/preview \
  -H "Content-Type: application/json" \
  -d '{
    "formulas": [
      { "field": "investment",    "expression": "volume * buyPrice / leverage" },
      { "field": "nettoProfit",   "expression": "sellValue - investment - brokerCost" }
    ]
  }'
```

#### `PUT /api/v1/formulas`
Replace all formula definitions atomically. Takes effect immediately for all future trade reads.

```bash
curl -X PUT http://localhost:3001/api/v1/formulas \
  -H "Content-Type: application/json" \
  -d '{ "formulas": [ /* same shape as preview */ ] }'
```

---

### Audit

Append-only log of all trade mutations. Requires `X-Trader-Username`.

#### `GET /api/v1/audit`

```bash
curl http://localhost:3001/api/v1/audit \
  -H "X-Trader-Username: tamas"
```
```json
{
  "total": 1,
  "entries": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "timestamp": "2024-06-01T10:05:00.000Z",
      "action": "CREATE",
      "traderId": "tamas",
      "entityId": "550e8400-e29b-41d4-a716-446655440000",
      "field": null,
      "previousValue": null,
      "newValue": { /* full EnrichedTrade */ }
    }
  ]
}
```

| `action` | `previousValue` | `newValue` |
|----------|-----------------|------------|
| `CREATE` | `null` | Full snapshot |
| `UPDATE` | Full snapshot before | Full snapshot after |
| `DELETE` | Full snapshot | `null` |

The `field` property names the first changed field on `UPDATE` actions, or `null` otherwise.

---

## Trade fields

### Input fields (stored as-is)

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Server-generated |
| `createdAt` | ISO 8601 | Server-generated |
| `holdingDays` | integer (≥1) | Derived from `createdAt` → `closeDate`; minimum 1 |
| `position` | string | Token symbol |
| `token` | string | Alias; defaults to `position` |
| `type` | string | Must match a `trade-types` entry |
| `tradePosition` | string | `long` or `short` (default `long`) |
| `leverage` | number | > 0 |
| `volume` | number | > 0 |
| `buyPrice` | number | > 0 |
| `sellPrice` | number | > 0 |
| `brokerCost` | number | ≥ 0 (default 0) |
| `closeDate` | YYYY-MM-DD | Trade exit date |

### Calculated fields (computed on every read)

| Field | Default formula |
|-------|----------------|
| `investment` | `volume * buyPrice / leverage` |
| `investmentAll` | `investment * leverage` |
| `sellValue` | `volume * sellPrice / leverage` |
| `cost` | `brokerCost` |
| `nettoProfit` | `sellValue - investment - cost` |
| `profitPercent` | `(nettoProfit / investment) * 100` |
| `profitRealPercent` | `(nettoProfit / investmentAll) * 100` |
| `dailyProfitPercent` | `profitPercent / holdingDays` |
| `result` | `"Win"` if `nettoProfit > 0`, else `"Loss"` |

Formulas are editable via the [Formulas](#formulas) endpoints.

---

## Viewing the spec locally

Install [Redoc CLI](https://github.com/Redocly/redoc):

```bash
npx @redocly/cli preview-docs docs/openapi.yaml
```

Or serve with Swagger UI via Docker:

```bash
docker run -p 8080:8080 \
  -e SWAGGER_JSON=/app/openapi.yaml \
  -v $(pwd)/docs:/app \
  swaggerapi/swagger-ui
```

Then open `http://localhost:8080`.
