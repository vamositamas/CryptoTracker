import * as fs from 'fs/promises';
import * as path from 'path';
import { Router, Request, Response } from 'express';

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '../../data'));

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const tradersPath = path.join(DATA_DIR, 'shared', 'traders.json');
  const raw = await fs.readFile(tradersPath, 'utf-8');
  const traders: string[] = JSON.parse(raw);
  res.json(traders);
});

export default router;
