import { Request, Response, NextFunction } from 'express';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip logging OPTIONS requests
  if (req.method === 'OPTIONS') {
    return next();
  }

  const start = Date.now();

  // Log response details when the response is finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const isError = statusCode >= 400;

    // In development, log everything
    // In production, only log errors
    if (process.env.NODE_ENV === 'development' || isError) {
      console.log(
        `${req.method} ${req.originalUrl} - ${statusCode} (${duration}ms)`
      );
    }
  });

  next();
};
