import { Request, Response, NextFunction } from 'express';
import { storageService } from '../services/storage.service';

// Augment Express Request type to carry the validated trader identity
declare global {
  namespace Express {
    interface Request {
      trader?: string;
    }
  }
}

export async function traderMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const username = req.headers['x-trader-username'];

  if (!username || typeof username !== 'string') {
    res.status(401).json({ error: { code: 'MISSING_TRADER', message: 'Trader identity required' } });
    return;
  }

  const traders = await storageService.read<string[]>('shared/traders.json');

  if (!traders.includes(username)) {
    res.status(401).json({ error: { code: 'UNKNOWN_TRADER', message: 'Unknown trader' } });
    return;
  }

  req.trader = username;
  next();
}
