import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { storageService } from '../services/storage.service';
import { AuditEntry } from '../middleware/audit.middleware';

const router = Router();

router.use(authMiddleware);

// Read-only audit endpoint (append-only storage model).
router.get('/', requirePermission('audit:read'), async (req: Request, res: Response) => {
  const trader = req.user!.username;
  const logPath = `traders/${trader}/audit-log.json`;

  try {
    const entries = (await storageService.read<AuditEntry[]>(logPath)) ?? [];
    res.json({ entries, total: entries.length });
  } catch {
    res.json({ entries: [], total: 0 });
  }
});

export default router;
