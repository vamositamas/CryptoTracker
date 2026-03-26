import * as fs from 'fs/promises';
import * as path from 'path';
import { Request, Response, NextFunction } from 'express';

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

  const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '../../data'));
  const tradersPath = path.join(dataDir, 'shared', 'traders.json');
  const raw = await fs.readFile(tradersPath, 'utf-8');
  const traders: string[] = JSON.parse(raw);

  if (!traders.includes(username)) {
    res.status(401).json({ error: { code: 'UNKNOWN_TRADER', message: 'Unknown trader' } });
    return;
  }

  req.trader = username;
  next();
}
