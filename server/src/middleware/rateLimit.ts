import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string; // Custom error message
}

/**
 * Simple in-memory rate limiter middleware.
 * For production, consider using Redis-backed rate limiting.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests, message = 'Too many requests, please try again later' } = options;
  const clients = new Map<string, RateLimitEntry>();

  // Cleanup old entries periodically (every minute)
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of clients) {
      if (entry.resetTime <= now) {
        clients.delete(key);
      }
    }
  }, 60000);

  return (req: Request, res: Response, next: NextFunction) => {
    // Use IP address as client identifier
    const clientId = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let entry = clients.get(clientId);

    // If no entry or window expired, create new entry
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      clients.set(clientId, entry);
      next();
      return;
    }

    // Increment count
    entry.count++;

    // Check if over limit
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        success: false,
        error: message,
        retryAfter,
      });
      return;
    }

    next();
  };
}

// Pre-configured rate limiters for different use cases
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: 'Too many API requests, please slow down',
});

export const mutationRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 mutations per minute
  message: 'Too many update requests, please slow down',
});
