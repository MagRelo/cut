import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';

// Express.Request.user is typed with AuthUser from auth.ts via express.d.ts

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;

    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (user.userType !== 'ADMIN') {
      throw new UnauthorizedError('Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};
