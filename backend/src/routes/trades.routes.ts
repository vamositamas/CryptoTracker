import { Router, Request, Response } from 'express';
import { traderMiddleware } from '../middleware/trader.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';
import { storageService } from '../services/storage.service';
import { formulaService, stripCalculatedFields, RawTrade } from '../services/formula.service';
import { validateCreateTradeDto } from '../utils/validators';
import * as fs from 'fs/promises';
import * as path from 'path';

const router = Router();

// Apply traderMiddleware to all trade routes
router.use(traderMiddleware);

type TraderRequest = Request & { trader: string };

interface TradeImportBody {
  trades?: unknown;
}

/**
 * Computes holdingDays from createdAt to closeDate.
 * Clamps to a minimum of 1 to prevent division-by-zero in daily profit formula.
 */
function computeHoldingDays(createdAt: string, closeDate: string): number {
  const created = new Date(createdAt);
  const closed = new Date(closeDate);
  const diffMs = closed.getTime() - created.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, days);
}

/**
 * Ensures the trader directory exists under data/traders/{username}/
 */
async function ensureTraderDir(trader: string): Promise<void> {
  const dataDir = process.env['DATA_DIR'] ?? path.join(__dirname, '../../data');
  const traderDir = path.join(path.resolve(dataDir), 'traders', trader);
  await fs.mkdir(traderDir, { recursive: true });
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

function buildImportedCreatedAt(closeDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(closeDate)) {
    return `${closeDate}T12:00:00.000Z`;
  }

  const parsed = new Date(closeDate);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function buildRawTrade(body: Record<string, unknown>, createdAt: string, holdingDays: number): RawTrade {
  return {
    id: crypto.randomUUID(),
    createdAt,
    holdingDays,
    token: typeof body['token'] === 'string' && body['token'].trim() !== '' ? String(body['token']) : String(body['position']),
    type: String(body['type']),
    position: String(body['position']),
    tradePosition: typeof body['tradePosition'] === 'string' && body['tradePosition'].trim() !== '' ? String(body['tradePosition']) : 'long',
    brokerCost: Number(body['brokerCost'] ?? 0),
    leverage: Number(body['leverage']),
    volume: Number(body['volume']),
    buyPrice: Number(body['buyPrice']),
    sellPrice: Number(body['sellPrice']),
    closeDate: String(body['closeDate']),
  };
}

/**
 * Returns another trader id if the trade id exists outside the current trader scope.
 * Used to distinguish 403 (belongs to someone else) from 404 (missing entirely).
 */
async function findTradeOwnerInOtherTrader(tradeId: string, currentTrader: string): Promise<string | null> {
  const dataDir = process.env['DATA_DIR'] ?? path.join(__dirname, '../../data');
  const tradersDir = path.join(path.resolve(dataDir), 'traders');

  try {
    const entries = await fs.readdir(tradersDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === currentTrader) continue;

      const filePath = path.join(tradersDir, entry.name, 'trades.json');
      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const trades = JSON.parse(raw) as RawTrade[];
        if (trades.some((t) => String(t.id) === tradeId)) {
          return entry.name;
        }
      } catch {
        // Ignore missing/corrupt files for non-target traders
      }
    }
  } catch {
    // Ignore if traders dir is missing
  }

  return null;
}

// --- GET /api/v1/trades ---
router.get('/', async (req: Request, res: Response) => {
  const { trader } = req as TraderRequest;

  const rawTrades = await readTrades(trader);
  const enriched = rawTrades.map((t) => formulaService.applyAll(t));

  res.json({ trades: enriched, total: enriched.length });
});

// --- POST /api/v1/trades ---
router.post('/', auditMiddleware, async (req: Request, res: Response) => {
  const { trader } = req as TraderRequest;

  // Strip any calculated fields the client may have sent
  const body = stripCalculatedFields(req.body as Record<string, unknown>);

  // Validate the 7 input fields
  const validation = validateCreateTradeDto(body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  // Generate server-side metadata
  const createdAt = new Date().toISOString();
  const holdingDays = computeHoldingDays(createdAt, String(body['closeDate']));

  const newRawTrade = buildRawTrade(body, createdAt, holdingDays);

  // Persist to storage (raw fields only — no calculated fields)
  await ensureTraderDir(trader);
  const existing = await readTrades(trader);
  await storageService.write(`traders/${trader}/trades.json`, [...existing, newRawTrade]);

  // Expose the raw record for auditMiddleware to append the CREATE entry
  res.locals['auditRecord'] = newRawTrade;

  // Return enriched record with all 9 calculated fields
  const enriched = formulaService.applyAll(newRawTrade);
  res.status(201).json(enriched);
});

// --- POST /api/v1/trades/import ---
router.post('/import', async (req: Request, res: Response) => {
  const { trader } = req as TraderRequest;
  const trades = (req.body as TradeImportBody | undefined)?.trades;

  if (!Array.isArray(trades) || trades.length === 0) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Trades array is required', field: 'trades' },
    });
    return;
  }

  const imported: RawTrade[] = [];

  for (const [index, row] of trades.entries()) {
    const body = stripCalculatedFields((row ?? {}) as Record<string, unknown>);
    const validation = validateCreateTradeDto(body);
    if (!validation.valid) {
      res.status(400).json({
        error: {
          ...validation.error,
          message: `Row ${index + 2}: ${validation.error?.message ?? 'Invalid trade row'}`,
          row: index + 2,
        },
      });
      return;
    }

    const closeDate = String(body['closeDate']);
    imported.push(buildRawTrade(body, buildImportedCreatedAt(closeDate), 1));
  }

  await ensureTraderDir(trader);
  const existing = await readTrades(trader);
  await storageService.write(`traders/${trader}/trades.json`, [...existing, ...imported]);

  const enriched = imported.map((trade) => formulaService.applyAll(trade));
  res.status(201).json({ imported: enriched.length, trades: enriched });
});

// --- PUT /api/v1/trades/:id ---
router.put('/:id', auditMiddleware, async (req: Request, res: Response) => {
  const { trader } = req as TraderRequest;
  const tradeId = Array.isArray(req.params['id']) ? req.params['id'][0] : req.params['id'];

  if (!tradeId) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Trade id is required', field: 'id' },
    });
    return;
  }

  const body = stripCalculatedFields(req.body as Record<string, unknown>);
  const validation = validateCreateTradeDto(body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  await ensureTraderDir(trader);
  const existing = await readTrades(trader);
  const idx = existing.findIndex((t) => String(t.id) === tradeId);
  if (idx === -1) {
    const owner = await findTradeOwnerInOtherTrader(tradeId, trader);
    if (owner) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You cannot modify another trader\'s trade' },
      });
      return;
    }
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Trade not found', field: 'id' },
    });
    return;
  }

  const previous = existing[idx];
  const createdAt = String(previous.createdAt);
  const nextCloseDate = String(body['closeDate']);

  const updatedRaw: RawTrade = {
    ...previous,
    token: typeof body['token'] === 'string' && body['token'].trim() !== '' ? String(body['token']) : String(body['position']),
    type: String(body['type']),
    position: String(body['position']),
    tradePosition: typeof body['tradePosition'] === 'string' && body['tradePosition'].trim() !== '' ? String(body['tradePosition']) : (previous.tradePosition ?? 'long'),
    brokerCost: body['brokerCost'] !== undefined ? Number(body['brokerCost']) : Number(previous.brokerCost ?? 0),
    leverage: Number(body['leverage']),
    volume: Number(body['volume']),
    buyPrice: Number(body['buyPrice']),
    sellPrice: Number(body['sellPrice']),
    closeDate: nextCloseDate,
    holdingDays: computeHoldingDays(createdAt, nextCloseDate),
  };

  const nextTrades = [...existing];
  nextTrades[idx] = updatedRaw;
  await storageService.write(`traders/${trader}/trades.json`, nextTrades);

  res.locals['auditPreviousValue'] = previous;
  res.locals['auditRecord'] = updatedRaw;

  const enriched = formulaService.applyAll(updatedRaw);
  res.status(200).json(enriched);
});

// --- DELETE /api/v1/trades/:id ---
router.delete('/:id', auditMiddleware, async (req: Request, res: Response) => {
  const { trader } = req as TraderRequest;
  const tradeId = Array.isArray(req.params['id']) ? req.params['id'][0] : req.params['id'];

  if (!tradeId) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Trade id is required', field: 'id' },
    });
    return;
  }

  await ensureTraderDir(trader);
  const existing = await readTrades(trader);
  const idx = existing.findIndex((t) => String(t.id) === tradeId);

  if (idx === -1) {
    const owner = await findTradeOwnerInOtherTrader(tradeId, trader);
    if (owner) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You cannot delete another trader\'s trade' },
      });
      return;
    }

    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Trade not found', field: 'id' },
    });
    return;
  }

  const previous = existing[idx];
  const nextTrades = existing.filter((t) => String(t.id) !== tradeId);
  await storageService.write(`traders/${trader}/trades.json`, nextTrades);

  // DELETE audit must include full snapshot as previousValue and null newValue.
  res.locals['auditPreviousValue'] = previous;
  res.locals['auditRecord'] = previous;

  res.status(200).json({ deleted: true, id: tradeId });
});

export default router;
