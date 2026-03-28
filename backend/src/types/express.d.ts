import 'express';

declare global {
  namespace Express {
    interface Request {
      trader?: string; // legacy - kept for backward compat during migration
      user?: {
        id: string;
        email: string;
        username: string;
        groupId: string;
        permissions: string[];
      };
    }
  }
}
