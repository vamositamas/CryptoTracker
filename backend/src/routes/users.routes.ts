import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { userStorageService } from '../services/auth.service';

const router = Router();
router.use(authMiddleware);
router.use(requirePermission('users:manage'));

// GET /api/v1/users
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await userStorageService.listUsers();
    res.json({ users, total: users.length });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message } });
  }
});

// GET /api/v1/users/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params['id']);
    const user = await userStorageService.getUserById(id);
    res.json(user);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message } });
  }
});

// POST /api/v1/users
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { email, username, password, groupId } = req.body ?? {};
  if (!email || !username || !password) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'email, username, and password are required' } });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters', field: 'password' } });
    return;
  }
  try {
    const user = await userStorageService.createUser({ email, username, password, groupId });
    res.status(201).json(user);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string; field?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message, ...(e.field ? { field: e.field } : {}) } });
  }
});

// PUT /api/v1/users/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params['id']);
    const user = await userStorageService.updateUser(id, req.body);
    res.json(user);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string; field?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message, ...(e.field ? { field: e.field } : {}) } });
  }
});

// DELETE /api/v1/users/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params['id']);
    await userStorageService.deleteUser(id);
    res.json({ deleted: true });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message } });
  }
});

export default router;
