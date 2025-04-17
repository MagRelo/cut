import { Request, Response, NextFunction } from 'express';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  // Add listener for when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${res.statusCode} - ${duration}ms: ${req.path}`);
  });

  next();
};
