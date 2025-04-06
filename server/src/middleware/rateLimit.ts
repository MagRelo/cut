import { Request, Response, NextFunction } from 'express';
import { RateLimitConfig } from '../services/hyperliquid/types';

const defaultConfig: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60000, // 1 minute
};

const requestTimestamps: Map<string, number[]> = new Map();

export const rateLimit = (config: RateLimitConfig = defaultConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = Date.now();
    const timestamps = requestTimestamps.get(userId) || [];
    const windowStart = now - config.windowMs;

    // Remove old timestamps
    const recentTimestamps = timestamps.filter(
      (timestamp) => timestamp > windowStart
    );

    if (recentTimestamps.length >= config.maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(
          (recentTimestamps[0] + config.windowMs - now) / 1000
        ),
      });
    }

    // Add current timestamp
    recentTimestamps.push(now);
    requestTimestamps.set(userId, recentTimestamps);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance to clean up
      for (const [key, timestamps] of requestTimestamps.entries()) {
        if (timestamps.length === 0) {
          requestTimestamps.delete(key);
        }
      }
    }

    next();
  };
};
