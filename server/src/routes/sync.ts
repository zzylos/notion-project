import { Router, type Request, type Response } from 'express';
import { getDataStore } from '../services/dataStore.js';
import { getNotion } from '../services/notion.js';
import { getSyncService } from '../services/syncService.js';
import { logger } from '../utils/logger.js';
import { normalizeUuid } from '../utils/uuid.js';
import type { ApiResponse, FetchItemsResponse } from '../types/index.js';

const router = Router();

/**
 * POST /api/sync
 * Force a sync from Notion (admin operation)
 *
 * Query params:
 * - type: 'full' | 'incremental' (default: 'full')
 *
 * Full sync fetches all items and replaces MongoDB + cache.
 * Incremental sync fetches last 26 hours and merges.
 * Use sparingly - webhooks should handle normal updates.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const syncType = req.query.type === 'incremental' ? 'incremental' : 'full';
    const syncService = getSyncService();
    const store = getDataStore();

    logger.api.info(`${syncType} sync requested`);

    // Set a longer timeout for sync operations (5 minutes)
    req.setTimeout(300000);

    let result;
    if (syncType === 'full') {
      result = await syncService.performFullSync();
    } else {
      result = await syncService.performScheduledIncrementalSync();
    }

    const items = store.getAll();

    const response: ApiResponse<{
      items: typeof items;
      syncResult: {
        type: string;
        itemsProcessed: number;
        itemsAdded: number;
        itemsUpdated: number;
        duration: number;
        errors: string[];
      };
    }> = {
      success: true,
      data: {
        items,
        syncResult: {
          type: result.type,
          itemsProcessed: result.itemsProcessed,
          itemsAdded: result.itemsAdded,
          itemsUpdated: result.itemsUpdated,
          duration: result.duration,
          errors: result.errors,
        },
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
 * Returns the normalized UUID or null if invalid.
 */
function validateIdParam(id: string | undefined): string | null {
  if (!id || typeof id !== 'string') {
    return null;
  }
  const trimmed = id.trim();
  if (trimmed.length === 0 || trimmed.length > 50) {
    return null;
  }
  return normalizeUuid(trimmed);
}

/**
 * POST /api/sync/:id
 * Sync a single item from Notion by ID
 * Fetches the latest data from Notion and updates the store
 */
router.post('/:id', async (req: Request, res: Response) => {
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
    const notion = getNotion();

    logger.api.info(`Syncing single item: ${itemId}`);

    // Get existing item to preserve type if inference fails
    const existingItem = store.get(itemId);

    // Fetch the item from Notion (will try to infer type from parent database)
    const item = await notion.fetchItem(itemId);

    // If the fetched item has default type 'project' but we had a more specific type,
    // preserve the existing type (this handles cases where parent database lookup fails)
    if (item.type === 'project' && existingItem && existingItem.type !== 'project') {
      item.type = existingItem.type;
      logger.api.debug(`Preserved existing type '${existingItem.type}' for item ${itemId}`);
    }

    // Update the store and MongoDB
    await store.upsertWithPersistence(item);

    logger.api.info(`Item ${itemId} synced successfully`);

    const response: ApiResponse<typeof item> = {
      success: true,
      data: item,
    };
    res.json(response);
  } catch (error) {
    logger.api.error(`Error syncing item ${req.params.id}:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

export default router;
