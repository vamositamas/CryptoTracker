import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { roleService } from '../services/role.service';

const router = Router();
router.use(authMiddleware);
router.use(requirePermission('users:manage'));

// GET /api/v1/roles
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const roles = await roleService.listRoles();
    res.json({ roles, total: roles.length });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message } });
  }
});

// GET /api/v1/roles/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params['id']);
    const role = await roleService.getRoleById(id);
    res.json(role);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message } });
  }
});

// POST /api/v1/roles
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { name, permissions } = req.body ?? {};
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Role name is required', field: 'name' } });
    return;
  }
  try {
    const role = await roleService.createRole({ name: name.trim(), permissions: Array.isArray(permissions) ? permissions : [] });
    res.status(201).json(role);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string; field?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message, ...(e.field ? { field: e.field } : {}) } });
  }
});

// PUT /api/v1/roles/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params['id']);
    const role = await roleService.updateRole(id, req.body);
    res.json(role);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string; field?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message, ...(e.field ? { field: e.field } : {}) } });
  }
});

// DELETE /api/v1/roles/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params['id']);
    await roleService.deleteRole(id);
    res.json({ deleted: true });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message } });
  }
});

export default router;
