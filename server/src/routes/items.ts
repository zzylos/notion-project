import { Router, type Request, type Response } from 'express';
import { getDataStore } from '../services/dataStore.js';
import { logger } from '../utils/logger.js';
import { normalizeUuid } from '../utils/uuid.js';
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
 * Validate that an ID parameter is a valid non-empty string.
 * Returns the normalized UUID or null if invalid.
 * Normalizes IDs to ensure consistent lookup (with dashes).
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
  // Normalize the UUID to ensure consistent format for lookups
  return normalizeUuid(trimmed);
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

export default router;
