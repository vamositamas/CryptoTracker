import { Router, Request, Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { authMiddleware } from '../middleware/auth.middleware';
import { storageService } from '../services/storage.service';

const router = Router();
router.use(authMiddleware);

export interface UserPreferences {
  chartColors?: {
    bar?: string;
    line?: string;
  };
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

async function ensureTraderDir(trader: string): Promise<void> {
  const dataDir = process.env['DATA_DIR'] ?? path.join(__dirname, '../../data');
  const traderDir = path.join(path.resolve(dataDir), 'traders', trader);
  await fs.mkdir(traderDir, { recursive: true });
}

async function readPreferences(trader: string): Promise<UserPreferences> {
  try {
    return await storageService.read<UserPreferences>(`traders/${trader}/preferences.json`);
  } catch {
    return {};
  }
}

// GET /api/v1/preferences
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const trader = req.user!.username;
  const prefs = await readPreferences(trader);
  res.json({ preferences: prefs });
});

// PUT /api/v1/preferences
router.put('/', async (req: Request, res: Response): Promise<void> => {
  const trader = req.user!.username;

  const body = req.body ?? {};
  const chartColors = body.chartColors as { bar?: unknown; line?: unknown } | undefined;

  if (chartColors !== undefined) {
    if (typeof chartColors !== 'object' || Array.isArray(chartColors)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'chartColors must be an object' } });
      return;
    }
    if (chartColors.bar !== undefined && (typeof chartColors.bar !== 'string' || !HEX_COLOR_RE.test(chartColors.bar))) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'chartColors.bar must be a 6-digit hex color' } });
      return;
    }
    if (chartColors.line !== undefined && (typeof chartColors.line !== 'string' || !HEX_COLOR_RE.test(chartColors.line))) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'chartColors.line must be a 6-digit hex color' } });
      return;
    }
  }

  const existing = await readPreferences(trader);
  const updated: UserPreferences = {
    ...existing,
    ...(chartColors !== undefined ? {
      chartColors: {
        ...existing.chartColors,
        ...(chartColors.bar !== undefined ? { bar: chartColors.bar as string } : {}),
        ...(chartColors.line !== undefined ? { line: chartColors.line as string } : {}),
      },
    } : {}),
  };

  await ensureTraderDir(trader);
  await storageService.write(`traders/${trader}/preferences.json`, updated);
  res.json({ preferences: updated });
});

export default router;
