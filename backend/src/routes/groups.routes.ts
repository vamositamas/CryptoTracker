import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { groupService } from '../services/group.service';

const router = Router();
router.use(authMiddleware);
router.use(requirePermission('users:manage'));

// GET /api/v1/groups
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const groups = await groupService.listGroups();
    res.json({ groups, total: groups.length });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message } });
  }
});

// GET /api/v1/groups/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params['id']);
    const group = await groupService.getGroupWithRoles(id);
    res.json(group);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message } });
  }
});

// POST /api/v1/groups
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { name, roleIds } = req.body ?? {};
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Group name is required', field: 'name' } });
    return;
  }
  try {
    const group = await groupService.createGroup({ name: name.trim(), roleIds });
    res.status(201).json(group);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string; field?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message, ...(e.field ? { field: e.field } : {}) } });
  }
});

// PUT /api/v1/groups/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params['id']);
    const group = await groupService.updateGroup(id, req.body);
    res.json(group);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string; field?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message, ...(e.field ? { field: e.field } : {}) } });
  }
});

// DELETE /api/v1/groups/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params['id']);
    await groupService.deleteGroup(id);
    res.json({ deleted: true });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({ error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message } });
  }
});

export default router;
