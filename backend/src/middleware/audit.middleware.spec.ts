import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { storageService } from '../services/storage.service';

vi.mock('../services/storage.service', () => ({
  storageService: { read: vi.fn(), write: vi.fn(), appendJsonArray: vi.fn() },
}));

import { auditMiddleware } from './audit.middleware';

/** Simulates an Express response that exposes triggerFinish() for test control. */
function makeRes(
  statusCode: number,
  locals: Record<string, unknown> = {},
): { statusCode: number; locals: Record<string, unknown>; on: ReturnType<typeof vi.fn>; triggerFinish: () => void } {
  let finishHandler: (() => void) | null = null;
  return {
    statusCode,
    locals,
    on: vi.fn((event: string, handler: () => void) => {
      if (event === 'finish') finishHandler = handler;
    }),
    triggerFinish: () => finishHandler?.(),
  };
}

describe('auditMiddleware', () => {
  beforeEach(() => {
    vi.mocked(storageService.read).mockResolvedValue([]);
    vi.mocked(storageService.write).mockResolvedValue(undefined);
    vi.mocked(storageService.appendJsonArray).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls next() synchronously', () => {
    const req = { method: 'POST', trader: 'tamas' } as unknown as Request;
    const res = makeRes(201, { auditRecord: { id: 'abc' } });
    const next = vi.fn();

    auditMiddleware(req, res as unknown as Response, next as NextFunction);

    expect(next).toHaveBeenCalledOnce();
  });

  it('appends a CREATE entry on successful POST', async () => {
    const req = { method: 'POST', trader: 'tamas' } as unknown as Request;
    const res = makeRes(201, { auditRecord: { id: 'trade-1' } });
    const next = vi.fn();

    auditMiddleware(req, res as unknown as Response, next as NextFunction);
    res.triggerFinish();
    await new Promise((r) => setTimeout(r, 20));

    expect(storageService.appendJsonArray).toHaveBeenCalledWith(
      'traders/tamas/audit-log.json',
      expect.objectContaining({ action: 'CREATE', entityId: 'trade-1', traderId: 'tamas' }),
    );
  });

  it('maps PUT to UPDATE action', async () => {
    const req = { method: 'PUT', trader: 'tamas' } as unknown as Request;
    const res = makeRes(200, { auditRecord: { id: 'trade-1' } });
    const next = vi.fn();

    auditMiddleware(req, res as unknown as Response, next as NextFunction);
    res.triggerFinish();
    await new Promise((r) => setTimeout(r, 20));

    expect(storageService.appendJsonArray).toHaveBeenCalledWith(
      'traders/tamas/audit-log.json',
      expect.objectContaining({ action: 'UPDATE' }),
    );
  });

  it('maps DELETE to DELETE action', async () => {
    const req = { method: 'DELETE', trader: 'tamas' } as unknown as Request;
    const res = makeRes(200, { auditRecord: { id: 'trade-1' } });
    const next = vi.fn();

    auditMiddleware(req, res as unknown as Response, next as NextFunction);
    res.triggerFinish();
    await new Promise((r) => setTimeout(r, 20));

    expect(storageService.appendJsonArray).toHaveBeenCalledWith(
      'traders/tamas/audit-log.json',
      expect.objectContaining({ action: 'DELETE' }),
    );
  });

  it('does not write when statusCode is 4xx', async () => {
    const req = { method: 'POST', trader: 'tamas' } as unknown as Request;
    const res = makeRes(400, { auditRecord: { id: 'trade-1' } });
    const next = vi.fn();

    auditMiddleware(req, res as unknown as Response, next as NextFunction);
    res.triggerFinish();
    await new Promise((r) => setTimeout(r, 20));

    expect(storageService.appendJsonArray).not.toHaveBeenCalled();
  });

  it('does not write when auditRecord is absent', async () => {
    const req = { method: 'POST', trader: 'tamas' } as unknown as Request;
    const res = makeRes(201, {});
    const next = vi.fn();

    auditMiddleware(req, res as unknown as Response, next as NextFunction);
    res.triggerFinish();
    await new Promise((r) => setTimeout(r, 20));

    expect(storageService.appendJsonArray).not.toHaveBeenCalled();
  });

  it('initialises audit log when file does not exist (ENOENT)', async () => {
    const req = { method: 'POST', trader: 'tamas' } as unknown as Request;
    const res = makeRes(201, { auditRecord: { id: 'trade-1' } });
    const next = vi.fn();

    auditMiddleware(req, res as unknown as Response, next as NextFunction);
    res.triggerFinish();
    await new Promise((r) => setTimeout(r, 20));

    expect(storageService.appendJsonArray).toHaveBeenCalledWith(
      'traders/tamas/audit-log.json',
      expect.objectContaining({ action: 'CREATE', entityId: 'trade-1' }),
    );
  });

  it('includes previousValue from res.locals on UPDATE', async () => {
    const prev = { nettoProfit: 100 };
    const req = { method: 'PUT', trader: 'tamas' } as unknown as Request;
    const res = makeRes(200, { auditRecord: { id: 'trade-1' }, auditPreviousValue: prev });
    const next = vi.fn();

    auditMiddleware(req, res as unknown as Response, next as NextFunction);
    res.triggerFinish();
    await new Promise((r) => setTimeout(r, 20));

    expect(storageService.appendJsonArray).toHaveBeenCalledWith(
      'traders/tamas/audit-log.json',
      expect.objectContaining({ previousValue: prev }),
    );
  });

  it('includes changed field name on UPDATE entries', async () => {
    const prev = { id: 'trade-1', buyPrice: 100, sellPrice: 120 };
    const nextVal = { id: 'trade-1', buyPrice: 110, sellPrice: 120 };
    const req = { method: 'PUT', trader: 'tamas' } as unknown as Request;
    const res = makeRes(200, { auditRecord: nextVal, auditPreviousValue: prev });
    const next = vi.fn();

    auditMiddleware(req, res as unknown as Response, next as NextFunction);
    res.triggerFinish();
    await new Promise((r) => setTimeout(r, 20));

    expect(storageService.appendJsonArray).toHaveBeenCalledWith(
      'traders/tamas/audit-log.json',
      expect.objectContaining({ action: 'UPDATE', field: 'buyPrice' }),
    );
  });
});
