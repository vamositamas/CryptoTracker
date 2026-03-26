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

  const newRawTrade: RawTrade = {
    id: crypto.randomUUID(),
    createdAt,
    holdingDays,
    type: String(body['type']),
    position: String(body['position']),
    leverage: Number(body['leverage']),
    volume: Number(body['volume']),
    buyPrice: Number(body['buyPrice']),
    sellPrice: Number(body['sellPrice']),
    closeDate: String(body['closeDate']),
  };

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

export default router;
