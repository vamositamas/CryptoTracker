import { Router, Request, Response } from 'express';
import { storageService } from '../services/storage.service';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const traders = await storageService.read<string[]>('shared/traders.json');
  res.json(traders);
});

export default router;
