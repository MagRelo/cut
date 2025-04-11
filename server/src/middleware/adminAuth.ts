import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';

// AuthUser type is already defined in Express namespace by auth.ts

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

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
