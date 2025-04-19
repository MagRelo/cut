import { Request, Response, NextFunction } from 'express';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  // Add listener for when response finishes
  res.on('finish', () => {
    const statusCode = res.statusCode;
    // Only log 4xx and 5xx status codes
    if (statusCode >= 400) {
      const duration = Date.now() - start;
      console.log(`${statusCode} - ${duration}ms: ${req.path}`);
    }
  });

  next();
};
