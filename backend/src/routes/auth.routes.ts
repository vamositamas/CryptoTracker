import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { authMiddleware } from '../middleware/auth.middleware';

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

// GET /api/v1/auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: { code: 'MISSING_TOKEN', message: 'Authorization token required' } });
      return;
    }
    const user = await authService.getUserById(userId);
    res.json({ user });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message } });
  }
});

// PUT /api/v1/auth/me
router.put('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: { code: 'MISSING_TOKEN', message: 'Authorization token required' } });
    return;
  }

  const { email, username, password } = req.body ?? {};
  if (email === undefined && username === undefined && password === undefined) {
    validationError(res, 'At least one field must be provided');
    return;
  }
  if (email !== undefined && (typeof email !== 'string' || !EMAIL_REGEX.test(email))) {
    validationError(res, 'Valid email is required', 'email');
    return;
  }
  if (username !== undefined && (typeof username !== 'string' || username.trim().length === 0)) {
    validationError(res, 'Username is required', 'username');
    return;
  }
  if (password !== undefined && (typeof password !== 'string' || password.length < 8)) {
    validationError(res, 'Password must be at least 8 characters', 'password');
    return;
  }

  try {
    const user = await authService.updateUser(userId, {
      ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
      ...(username !== undefined ? { username: username.trim() } : {}),
      ...(password !== undefined ? { password } : {}),
    });
    const token = await authService.refreshTokenForUserId(userId);
    res.json({ token, user });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string; field?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message, ...(e.field ? { field: e.field } : {}) } });
  }
});

export default router;
