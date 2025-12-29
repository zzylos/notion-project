import { Router, type Request, type Response } from 'express';
import { getDataStore } from '../services/dataStore.js';
import { getNotion } from '../services/notion.js';
import { mutationRateLimiter } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';
import type { ApiResponse, FetchItemsResponse } from '../types/index.js';

const router = Router();

/**
 * GET /api/items
 * Fetch all items from the in-memory store
 *
 * Data is loaded once on server startup and updated via webhooks.
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const store = getDataStore();

    if (!store.isInitialized()) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Server is still initializing. Please try again in a moment.',
      };
      res.status(503).json(response);
      return;
    }

    const items = store.getAll();
    const stats = store.getStats();

    logger.api.info(`Returning ${items.length} items from store`);

    const response: ApiResponse<FetchItemsResponse> = {
      success: true,
      data: {
        items,
        lastUpdated: stats.lastUpdated ?? undefined,
      },
    };

    res.json(response);
  } catch (error) {
    logger.api.error('Error fetching items:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/items/sync
 * Force a full re-sync from Notion (admin operation)
 *
 * This fetches all items from all databases and replaces the store.
 * Use sparingly - webhooks should handle normal updates.
 */
router.post('/sync', async (_req: Request, res: Response) => {
  try {
    const store = getDataStore();
    const notion = getNotion();

    logger.api.info('Full sync requested');

    const result = await notion.fetchAllItems();

    // Replace all items in store
    store.initialize(result.items);

    const response: ApiResponse<FetchItemsResponse> = {
      success: true,
      data: {
        items: result.items,
        failedDatabases: result.failedDatabases.length > 0 ? result.failedDatabases : undefined,
        orphanedItemsCount: result.orphanedItemsCount > 0 ? result.orphanedItemsCount : undefined,
      },
    };

    res.json(response);
  } catch (error) {
    logger.api.error('Error syncing items:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

/**
 * Validate that an ID parameter is a valid non-empty string.
 * Returns the trimmed ID or null if invalid.
 */
function validateIdParam(id: string | undefined): string | null {
  if (!id || typeof id !== 'string') {
    return null;
  }
  const trimmed = id.trim();
  // Notion IDs are UUIDs (32 hex chars with or without dashes)
  if (trimmed.length === 0 || trimmed.length > 50) {
    return null;
  }
  return trimmed;
}

/**
 * GET /api/items/:id
 * Fetch a single item by ID from the store
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const itemId = validateIdParam(req.params.id);
    if (!itemId) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid item ID: ID must be a non-empty string',
      };
      res.status(400).json(response);
      return;
    }

    const store = getDataStore();
    const item = store.get(itemId);

    if (!item) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Item not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<typeof item> = {
      success: true,
      data: item,
    };
    res.json(response);
  } catch (error) {
    logger.api.error('Error fetching item:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

/**
 * PATCH /api/items/:id/status
 * Update item status in Notion and local store
 */
router.patch('/:id/status', mutationRateLimiter, async (req: Request, res: Response) => {
  try {
    const itemId = validateIdParam(req.params.id);
    if (!itemId) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid item ID: ID must be a non-empty string',
      };
      res.status(400).json(response);
      return;
    }

    const { status } = req.body;

    if (!status || typeof status !== 'string') {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Status is required and must be a string',
      };
      res.status(400).json(response);
      return;
    }

    const trimmedStatus = status.trim();
    if (trimmedStatus.length === 0 || trimmedStatus.length > 100) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Status must be between 1 and 100 characters',
      };
      res.status(400).json(response);
      return;
    }

    const store = getDataStore();
    const notion = getNotion();

    // Get existing item
    const existingItem = store.get(itemId);
    if (!existingItem) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Item not found',
      };
      res.status(404).json(response);
      return;
    }

    // Update in Notion
    await notion.updateItemStatus(existingItem.notionPageId || itemId, trimmedStatus);

    // Update local store immediately (webhook will also update, but this is faster)
    store.upsert({
      ...existingItem,
      status: trimmedStatus,
      updatedAt: new Date().toISOString(),
    });

    const response: ApiResponse<{ updated: boolean }> = {
      success: true,
      data: { updated: true },
    };
    res.json(response);
  } catch (error) {
    logger.api.error('Error updating status:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

/**
 * PATCH /api/items/:id/progress
 * Update item progress in Notion and local store
 */
router.patch('/:id/progress', mutationRateLimiter, async (req: Request, res: Response) => {
  try {
    const itemId = validateIdParam(req.params.id);
    if (!itemId) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid item ID: ID must be a non-empty string',
      };
      res.status(400).json(response);
      return;
    }

    const { progress } = req.body;
    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Progress must be a number between 0 and 100',
      };
      res.status(400).json(response);
      return;
    }

    const store = getDataStore();
    const notion = getNotion();

    // Get existing item
    const existingItem = store.get(itemId);
    if (!existingItem) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Item not found',
      };
      res.status(404).json(response);
      return;
    }

    // Update in Notion
    await notion.updateItemProgress(existingItem.notionPageId || itemId, progress);

    // Update local store immediately
    store.upsert({
      ...existingItem,
      progress,
      updatedAt: new Date().toISOString(),
    });

    const response: ApiResponse<{ updated: boolean }> = {
      success: true,
      data: { updated: true },
    };
    res.json(response);
  } catch (error) {
    logger.api.error('Error updating progress:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

export default router;
