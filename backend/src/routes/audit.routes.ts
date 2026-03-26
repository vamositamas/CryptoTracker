import { Router, Request, Response } from 'express';
import { traderMiddleware } from '../middleware/trader.middleware';
import { storageService } from '../services/storage.service';
import { AuditEntry } from '../middleware/audit.middleware';

const router = Router();

// All audit access is trader-scoped.
router.use(traderMiddleware);

type TraderRequest = Request & { trader: string };

// Read-only audit endpoint (append-only storage model).
router.get('/', async (req: Request, res: Response) => {
  const { trader } = req as TraderRequest;
  const logPath = `traders/${trader}/audit-log.json`;

  try {
    const entries = (await storageService.read<AuditEntry[]>(logPath)) ?? [];
    res.json({ entries, total: entries.length });
  } catch {
    res.json({ entries: [], total: 0 });
  }
});

export default router;
