import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'MISSING_TOKEN', message: 'Authorization token required' } });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = authService.verifyToken(token);
    req.user = payload;
    // backward compat: also set req.trader so any remaining usage doesn't crash
    req.trader = payload.username;
    next();
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' } });
  }
}
