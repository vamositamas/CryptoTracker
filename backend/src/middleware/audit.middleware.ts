import { Request, Response, NextFunction } from 'express';
import { storageService } from '../services/storage.service';

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  traderId: string;
  entityId: string;
  previousValue: unknown;
  newValue: unknown;
}

type TraderRequest = Request & { trader?: string };

/**
 * Middleware that appends an audit log entry after every successful mutating request.
 *
 * Route handlers must set res.locals['auditRecord'] to the saved entity before
 * sending the response. For UPDATE, they should also set res.locals['auditPreviousValue'].
 *
 * Apply BEFORE route handlers on all POST, PUT, DELETE routes (architecture mandate).
 */
export function auditMiddleware(req: TraderRequest, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    const record = res.locals['auditRecord'] as Record<string, unknown> | undefined;
    if (!record) return;

    const trader = req.trader;
    if (!trader) return;

    const action: AuditEntry['action'] =
      req.method === 'POST' ? 'CREATE' : req.method === 'DELETE' ? 'DELETE' : 'UPDATE';

    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      traderId: trader,
      entityId: String(record['id'] ?? ''),
      previousValue: res.locals['auditPreviousValue'] ?? null,
      newValue: action === 'DELETE' ? null : record,
    };

    const logPath = `traders/${trader}/audit-log.json`;

    // Fire-and-forget: append entry asynchronously; don't block the response
    storageService
      .read<AuditEntry[]>(logPath)
      .then((existing) => storageService.write(logPath, [...existing, entry]))
      .catch(() =>
        // If log doesn't exist yet, initialise with this entry
        storageService.write(logPath, [entry]),
      );
  });

  next();
}
