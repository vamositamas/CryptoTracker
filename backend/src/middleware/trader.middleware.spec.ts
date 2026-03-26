import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { traderMiddleware } from './trader.middleware';
import type { Request, Response, NextFunction } from 'express';
import { storageService } from '../services/storage.service';

vi.mock('../services/storage.service', () => ({
  storageService: { read: vi.fn() },
}));

const TRADERS = ['tamas', 'mark'];

function makeReq(headers: Record<string, string> = {}): Partial<Request> {
  return { headers } as Partial<Request>;
}

function makeRes(): { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; code?: number } {
  const res: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; code?: number } = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe('traderMiddleware', () => {
  beforeEach(() => {
    vi.mocked(storageService.read).mockResolvedValue(TRADERS);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 MISSING_TRADER when x-trader-username header is absent', async () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await traderMiddleware(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'MISSING_TRADER' }) }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 UNKNOWN_TRADER when trader not in traders.json', async () => {
    const req = makeReq({ 'x-trader-username': 'unknown' });
    const res = makeRes();
    const next = vi.fn();

    await traderMiddleware(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'UNKNOWN_TRADER' }) }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets req.trader when header is valid', async () => {
    const req = makeReq({ 'x-trader-username': 'tamas' }) as Request;
    const res = makeRes();
    const next = vi.fn();

    await traderMiddleware(req, res as unknown as Response, next as NextFunction);

    expect(next).toHaveBeenCalledOnce();
    expect(req.trader).toBe('tamas');
    expect(res.status).not.toHaveBeenCalled();
  });
});
