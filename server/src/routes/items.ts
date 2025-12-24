import { Router, type Request, type Response } from 'express';
import { getCache } from '../services/cache.js';
import { getNotion } from '../services/notion.js';
import type { ApiResponse, FetchItemsResponse } from '../types/index.js';

const router = Router();

/**
 * GET /api/items
 * Fetch all items from Notion (with caching)
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const cache = getCache();
    const notion = getNotion();

    // Generate cache key from configured database IDs
    const dbIds = notion['config'].databases.map((db: { databaseId: string }) => db.databaseId);
    const cacheKey = cache.generateKey(dbIds);

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      const cacheAge = Date.now() - cached.timestamp;
      console.info(`[API] Cache HIT for items (age: ${Math.round(cacheAge / 1000)}s)`);

      const response: ApiResponse<FetchItemsResponse> = {
        success: true,
        data: { items: cached.items },
        cached: true,
        cacheAge,
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
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status || typeof status !== 'string') {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Status is required and must be a string',
      };
      res.status(400).json(response);
      return;
    }

    const notion = getNotion();
    const cache = getCache();

    await notion.updateItemStatus(req.params.id, status);

    // Invalidate cache after update
    cache.clear();

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
router.patch('/:id/progress', async (req: Request, res: Response) => {
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

    await notion.updateItemProgress(req.params.id, progress);

    // Invalidate cache after update
    cache.clear();

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
