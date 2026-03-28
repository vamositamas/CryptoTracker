import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validationError(res: Response, message: string, field?: string): void {
  res.status(400).json({ error: { code: 'VALIDATION_ERROR', message, ...(field ? { field } : {}) } });
}

// POST /api/v1/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, username, password } = req.body ?? {};

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    validationError(res, 'Valid email is required', 'email');
    return;
  }
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    validationError(res, 'Username is required', 'username');
    return;
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    validationError(res, 'Password must be at least 8 characters', 'password');
    return;
  }

  try {
    const result = await authService.register(email.trim().toLowerCase(), username.trim(), password);
    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string; field?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message, ...(e.field ? { field: e.field } : {}) } });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body ?? {};

  if (!email || typeof email !== 'string') {
    validationError(res, 'Email is required', 'email');
    return;
  }
  if (!password || typeof password !== 'string') {
    validationError(res, 'Password is required', 'password');
    return;
  }

  try {
    const result = await authService.login(email.trim().toLowerCase(), password);
    res.json(result);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message } });
  }
});

export default router;
