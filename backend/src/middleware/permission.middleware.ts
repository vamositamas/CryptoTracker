import { Request, Response, NextFunction, RequestHandler } from 'express';

export function requirePermission(permission: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'MISSING_TOKEN', message: 'Authorization token required' } });
      return;
    }
    if (!req.user.permissions.includes(permission)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: `Permission "${permission}" required` } });
      return;
    }
    next();
  };
}
