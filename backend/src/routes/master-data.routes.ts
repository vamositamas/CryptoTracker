import { Router, Request, Response } from 'express';
import { storageService } from '../services/storage.service';

const router = Router();

interface MasterDataEntry {
  id: string;
  name?: string;
  symbol?: string;
}

interface MasterDataBody {
  name?: unknown;
  symbol?: unknown;
  id?: unknown;
}

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

function getParamValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function invalidTypeResponse(res: Response, type: string): void {
  res.status(400).json({
    error: {
      code: 'INVALID_MASTER_DATA_TYPE',
      message: `Unknown master data type: ${type}. Supported: ${SUPPORTED_TYPES.join(', ')}`,
    },
  });
}

async function readEntries(type: SupportedType): Promise<MasterDataEntry[]> {
  try {
    return await storageService.read<MasterDataEntry[]>(FILE_MAP[type]);
  } catch {
    return [];
  }
}

function normalizeTokenIdentifier(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeListIdentifier(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function findEntryIndex(entries: MasterDataEntry[], entryId: string): number {
  const normalizedId = entryId.trim().toLowerCase();
  return entries.findIndex((entry) => entry.id.trim().toLowerCase() === normalizedId);
}

function parseBody(body: MasterDataBody):
  | { valid: true; name: string; symbol?: string; customId?: string }
  | { valid: false; error: { code: string; message: string; field: string } } {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return {
      valid: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Name is required',
        field: 'name',
      },
    };
  }

  const symbol = typeof body.symbol === 'string' && body.symbol.trim() !== ''
    ? body.symbol.trim()
    : undefined;
  const customId = typeof body.id === 'string' && body.id.trim() !== ''
    ? body.id.trim()
    : undefined;

  return { valid: true, name, symbol, customId };
}

function buildNewEntry(type: SupportedType, payload: { name: string; symbol?: string; customId?: string }): MasterDataEntry {
  if (type === 'tokens') {
    const id = normalizeTokenIdentifier(payload.customId ?? payload.symbol ?? payload.name);
    const symbol = normalizeTokenIdentifier(payload.symbol ?? id);
    return { id, symbol, name: payload.name };
  }

  return {
    id: normalizeListIdentifier(payload.customId ?? payload.name),
    name: payload.name,
  };
}

function buildUpdatedEntry(
  type: SupportedType,
  existing: MasterDataEntry,
  payload: { name: string; symbol?: string; customId?: string },
): MasterDataEntry {
  if (type === 'tokens') {
    const id = payload.customId
      ? normalizeTokenIdentifier(payload.customId)
      : existing.id;
    const symbol = payload.symbol
      ? normalizeTokenIdentifier(payload.symbol)
      : (existing.symbol ?? existing.id);
    return { id, symbol, name: payload.name };
  }

  return {
    id: payload.customId ? normalizeListIdentifier(payload.customId) : existing.id,
    name: payload.name,
  };
}

function hasDuplicateName(type: SupportedType, entries: MasterDataEntry[], name: string, excludeId?: string): boolean {
  const normalizedName = name.trim().toLowerCase();
  const excluded = excludeId?.trim().toLowerCase();
  return entries.some((entry) => {
    if (excluded && entry.id.trim().toLowerCase() === excluded) {
      return false;
    }
    const candidates = type === 'tokens'
      ? [entry.id, entry.symbol, entry.name]
      : [entry.name, entry.id];
    return candidates
      .filter((candidate): candidate is string => typeof candidate === 'string' && candidate.trim() !== '')
      .some((candidate) => candidate.trim().toLowerCase() === normalizedName);
  });
}

router.get('/:type', async (req: Request, res: Response) => {
  const type = getParamValue(req.params['type']);

  if (!isSupportedType(type)) {
    invalidTypeResponse(res, type);
    return;
  }

  const data = await readEntries(type);
  res.json({ [RESPONSE_KEY_MAP[type]]: data });
});

router.post('/:type', async (req: Request, res: Response) => {
  const type = getParamValue(req.params['type']);

  if (!isSupportedType(type)) {
    invalidTypeResponse(res, type);
    return;
  }

  const parsed = parseBody(req.body as MasterDataBody);
  if (!parsed.valid) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const entries = await readEntries(type);
  if (hasDuplicateName(type, entries, parsed.name)) {
    res.status(409).json({
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `${parsed.name} already exists in ${type}`,
        field: 'name',
      },
    });
    return;
  }

  const entry = buildNewEntry(type, parsed);
  await storageService.appendJsonArray(FILE_MAP[type], entry);
  res.status(201).json(entry);
});

router.put('/:type/:id', async (req: Request, res: Response) => {
  const type = getParamValue(req.params['type']);
  const id = getParamValue(req.params['id']);

  if (!isSupportedType(type)) {
    invalidTypeResponse(res, type);
    return;
  }

  const parsed = parseBody(req.body as MasterDataBody);
  if (!parsed.valid) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const entries = await readEntries(type);
  const index = findEntryIndex(entries, id);
  if (index === -1) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `${type} entry not found: ${id}`,
      },
    });
    return;
  }

  if (hasDuplicateName(type, entries, parsed.name, entries[index].id)) {
    res.status(409).json({
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `${parsed.name} already exists in ${type}`,
        field: 'name',
      },
    });
    return;
  }

  const updated = buildUpdatedEntry(type, entries[index], parsed);
  const nextEntries = [...entries];
  nextEntries[index] = updated;
  await storageService.write(FILE_MAP[type], nextEntries);
  res.json(updated);
});

router.delete('/:type/:id', async (req: Request, res: Response) => {
  const type = getParamValue(req.params['type']);
  const id = getParamValue(req.params['id']);

  if (!isSupportedType(type)) {
    invalidTypeResponse(res, type);
    return;
  }

  const entries = await readEntries(type);
  const index = findEntryIndex(entries, id);
  if (index === -1) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `${type} entry not found: ${id}`,
      },
    });
    return;
  }

  const nextEntries = entries.filter((_, entryIndex) => entryIndex !== index);
  await storageService.write(FILE_MAP[type], nextEntries);
  res.json({ deleted: true });
});

export default router;
