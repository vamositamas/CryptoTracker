import { Router, Request, Response } from 'express';
import { storageService } from '../services/storage.service';

const router = Router();

const SUPPORTED_TYPES = ['tokens', 'trade-types', 'positions'] as const;
type SupportedType = (typeof SUPPORTED_TYPES)[number];

const FILE_MAP: Record<SupportedType, string> = {
  'tokens': 'shared/tokens.json',
  'trade-types': 'shared/trade-types.json',
  'positions': 'shared/positions.json',
};

const RESPONSE_KEY_MAP: Record<SupportedType, string> = {
  'tokens': 'tokens',
  'trade-types': 'tradeTypes',
  'positions': 'positions',
};

function isSupportedType(type: string): type is SupportedType {
  return (SUPPORTED_TYPES as readonly string[]).includes(type);
}

router.get('/:type', async (req: Request, res: Response) => {
  const { type } = req.params;

  if (!isSupportedType(type)) {
    res.status(400).json({
      error: {
        code: 'INVALID_MASTER_DATA_TYPE',
        message: `Unknown master data type: ${type}. Supported: ${SUPPORTED_TYPES.join(', ')}`,
      },
    });
    return;
  }

  const data = await storageService.read<Array<{ id: string; name?: string; symbol?: string }>>(FILE_MAP[type]);
  const names = data.map((item) => item.id);
  res.json({ [RESPONSE_KEY_MAP[type]]: names });
});

export default router;
