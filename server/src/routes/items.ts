import { Router, type Request, type Response } from 'express';
import { getCache } from '../services/cache.js';
import { getNotion } from '../services/notion.js';
import { mutationRateLimiter } from '../middleware/rateLimit.js';
import type { ApiResponse, FetchItemsResponse } from '../types/index.js';

// Extended response type for cached responses
interface CachedApiResponse<T> extends ApiResponse<T> {
  isStale?: boolean;
  refreshing?: boolean;
}

const router = Router();

// Flag to track if refresh callback is registered
let refreshCallbackRegistered = false;

/**
 * Register the refresh callback for the cache.
 * This enables stale-while-revalidate behavior.
 */
function ensureRefreshCallbackRegistered(): string {
  const cache = getCache();
  const notion = getNotion();

  // Generate cache key from configured database IDs
  const dbIds = notion.getDatabaseIds();
  const cacheKey = cache.generateKey(dbIds);

  if (!refreshCallbackRegistered) {
    // Register the refresh callback for background updates
    cache.registerRefreshCallback(cacheKey, async () => {
      console.info('[API] Executing refresh callback...');
      const result = await notion.fetchAllItems();
      return result.items;
    });
    refreshCallbackRegistered = true;
    console.info('[API] Refresh callback registered for stale-while-revalidate');
  }

  return cacheKey;
}

/**
 * GET /api/items
 * Fetch all items from Notion (with stale-while-revalidate caching)
 *
 * Caching behavior:
 * - Fresh cache: Returns cached data immediately
 * - Stale cache: Returns cached data immediately, triggers background refresh
 * - No cache: Fetches from Notion and caches the result
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const cache = getCache();
    const notion = getNotion();
    const cacheKey = ensureRefreshCallbackRegistered();

    // Check cache first (includes stale-while-revalidate logic)
    const cached = cache.get(cacheKey);

    if (cached) {
      const cacheAge = Date.now() - cached.timestamp;
      const status = cached.isStale ? 'STALE' : 'HIT';
      const refreshing = cache.isRefreshing(cacheKey);

      console.info(
        `[API] Cache ${status} for items (age: ${Math.round(cacheAge / 1000)}s)` +
          (refreshing ? ' [refreshing in background]' : '')
      );

      const response: CachedApiResponse<FetchItemsResponse> = {
        success: true,
        data: { items: cached.items },
        cached: true,
        cacheAge,
        isStale: cached.isStale,
        refreshing,
      };
      res.json(response);
      return;
    }

    console.info('[API] Cache MISS - fetching from Notion...');

    // Fetch from Notion
    const result = await notion.fetchAllItems();

    // Store in cache
    cache.set(cacheKey, result.items);

    const response: ApiResponse<FetchItemsResponse> = {
      success: true,
      data: {
        items: result.items,
        failedDatabases: result.failedDatabases.length > 0 ? result.failedDatabases : undefined,
        orphanedItemsCount: result.orphanedItemsCount > 0 ? result.orphanedItemsCount : undefined,
      },
      cached: false,
    };

    res.json(response);
  } catch (error) {
    console.error('[API] Error fetching items:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/items/refresh
 * Force refresh the cache (waits for completion)
 */
router.post('/refresh', async (_req: Request, res: Response) => {
  try {
    const cache = getCache();
    const cacheKey = ensureRefreshCallbackRegistered();

    console.info('[API] Force refresh requested');

    const items = await cache.forceRefresh(cacheKey);

    if (!items) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Failed to refresh cache',
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<FetchItemsResponse> = {
      success: true,
      data: { items },
      cached: false,
    };
    res.json(response);
  } catch (error) {
    console.error('[API] Error refreshing items:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/items/:id
 * Fetch a single item by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const notion = getNotion();
    const item = await notion.fetchItem(req.params.id);

    const response: ApiResponse<typeof item> = {
      success: true,
      data: item,
    };
    res.json(response);
  } catch (error) {
    console.error('[API] Error fetching item:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

/**
 * PATCH /api/items/:id/status
 * Update item status
 */
router.patch('/:id/status', mutationRateLimiter, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    // Validate status input
    if (!status || typeof status !== 'string') {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Status is required and must be a string',
      };
      res.status(400).json(response);
      return;
    }

    // Validate max length to prevent abuse
    const trimmedStatus = status.trim();
    if (trimmedStatus.length === 0 || trimmedStatus.length > 100) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Status must be between 1 and 100 characters',
      };
      res.status(400).json(response);
      return;
    }

    const notion = getNotion();
    const cache = getCache();
    const cacheKey = ensureRefreshCallbackRegistered();

    await notion.updateItemStatus(req.params.id, trimmedStatus);

    // Invalidate only the items cache (not all cache entries)
    cache.delete(cacheKey);

    const response: ApiResponse<{ updated: boolean }> = {
      success: true,
      data: { updated: true },
    };
    res.json(response);
  } catch (error) {
    console.error('[API] Error updating status:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

/**
 * PATCH /api/items/:id/progress
 * Update item progress
 */
router.patch('/:id/progress', mutationRateLimiter, async (req: Request, res: Response) => {
  try {
    const { progress } = req.body;
    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Progress must be a number between 0 and 100',
      };
      res.status(400).json(response);
      return;
    }

    const notion = getNotion();
    const cache = getCache();
    const cacheKey = ensureRefreshCallbackRegistered();

    await notion.updateItemProgress(req.params.id, progress);

    // Invalidate only the items cache (not all cache entries)
    cache.delete(cacheKey);

    const response: ApiResponse<{ updated: boolean }> = {
      success: true,
      data: { updated: true },
    };
    res.json(response);
  } catch (error) {
    console.error('[API] Error updating progress:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

export default router;
