import { Router, type Request, type Response } from 'express';
import { getCache } from '../services/cache.js';
import type { ApiResponse, CacheStats } from '../types/index.js';

const router = Router();

/**
 * GET /api/cache/stats
 * Get cache statistics
 */
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const cache = getCache();
    const stats = cache.getStats();

    const response: ApiResponse<CacheStats> = {
      success: true,
      data: stats,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/cache/invalidate
 * Clear the cache
 */
router.post('/invalidate', (_req: Request, res: Response) => {
  try {
    const cache = getCache();
    cache.clear();

    const response: ApiResponse<{ cleared: boolean }> = {
      success: true,
      data: { cleared: true },
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/cache/reset-stats
 * Reset cache hit/miss counters
 */
router.post('/reset-stats', (_req: Request, res: Response) => {
  try {
    const cache = getCache();
    cache.resetStats();

    const response: ApiResponse<{ reset: boolean }> = {
      success: true,
      data: { reset: true },
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

export default router;
