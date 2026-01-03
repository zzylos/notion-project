import { getNotion } from './notion.js';
import { getMongoDB } from './mongodb.js';
import { getDataStore } from './dataStore.js';
import { getSyncState } from './syncState.js';
import { logger } from '../utils/logger.js';
import { buildRelationships } from '../../../shared/index.js';

/**
 * Result of a sync operation.
 */
export interface SyncResult {
  type: 'full' | 'incremental' | 'cache-only';
  itemsProcessed: number;
  itemsAdded: number;
  itemsUpdated: number;
  duration: number; // milliseconds
  errors: string[];
}

/**
 * Sync Service - orchestrates data synchronization between Notion, MongoDB, and cache.
 *
 * Responsibilities:
 * - Perform full syncs (fetch all from Notion, replace MongoDB data)
 * - Perform incremental syncs (fetch recent changes, merge with MongoDB)
 * - Load cache from MongoDB
 * - Coordinate between all data layers
 */
class SyncService {
  /**
   * Perform a full sync from Notion to MongoDB.
   * Fetches all items and replaces the entire MongoDB collection.
   */
  async performFullSync(): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    logger.notion.info('Starting full sync from Notion...');

    try {
      const notion = getNotion();
      const mongodb = getMongoDB();
      const dataStore = getDataStore();
      const syncState = getSyncState();

      // Fetch all items from Notion
      const { items, failedDatabases, orphanedItemsCount } = await notion.fetchAllItems();

      // Log any failed databases
      for (const { type, error } of failedDatabases) {
        errors.push(`Failed to fetch ${type}: ${error}`);
      }

      if (items.length === 0 && failedDatabases.length > 0) {
        throw new Error('Full sync failed: no items fetched and databases had errors');
      }

      // Replace all items in MongoDB
      await mongodb.replaceAllItems(items);

      // Reload cache from MongoDB to ensure consistency
      const allItems = await mongodb.getAllItems();
      dataStore.initialize(allItems);

      // Mark full sync complete
      syncState.markFullSyncComplete();

      const duration = Date.now() - startTime;
      logger.notion.info(
        `Full sync completed: ${items.length} items in ${duration}ms (${orphanedItemsCount} orphaned)`
      );

      return {
        type: 'full',
        itemsProcessed: items.length,
        itemsAdded: items.length,
        itemsUpdated: 0,
        duration,
        errors,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      logger.notion.error('Full sync failed:', message);

      return {
        type: 'full',
        itemsProcessed: 0,
        itemsAdded: 0,
        itemsUpdated: 0,
        duration: Date.now() - startTime,
        errors,
      };
    }
  }

  /**
   * Perform an incremental sync from Notion to MongoDB.
   * Fetches only items modified since the given timestamp and merges them.
   */
  async performIncrementalSync(since: Date): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let itemsAdded = 0;
    let itemsUpdated = 0;

    logger.notion.info(`Starting incremental sync since ${since.toISOString()}...`);

    try {
      const notion = getNotion();
      const mongodb = getMongoDB();
      const dataStore = getDataStore();
      const syncState = getSyncState();

      // Fetch items modified since the given time
      const { items, failedDatabases } = await notion.fetchItemsSince(since);

      // Log any failed databases
      for (const { type, error } of failedDatabases) {
        errors.push(`Failed to fetch ${type}: ${error}`);
      }

      if (items.length === 0) {
        logger.notion.info('Incremental sync: no modified items found');
        syncState.markIncrementalSyncComplete();

        return {
          type: 'incremental',
          itemsProcessed: 0,
          itemsAdded: 0,
          itemsUpdated: 0,
          duration: Date.now() - startTime,
          errors,
        };
      }

      // Process each modified item
      for (const item of items) {
        const exists = await mongodb.hasItem(item.id);

        // Get old parent ID for relationship update
        let oldParentId: string | undefined;
        if (exists) {
          const existing = await mongodb.getItem(item.id);
          oldParentId = existing?.parentId;
          itemsUpdated++;
        } else {
          itemsAdded++;
        }

        // Upsert to MongoDB
        await mongodb.upsertItem(item);

        // Update relationships if parent changed
        if (oldParentId !== item.parentId) {
          await mongodb.updateRelationships(item, oldParentId);
        }

        // Update cache
        dataStore.upsert(item);
      }

      // Rebuild relationships in cache for consistency
      this.rebuildCacheRelationships();

      // Mark incremental sync complete
      syncState.markIncrementalSyncComplete();

      const duration = Date.now() - startTime;
      logger.notion.info(
        `Incremental sync completed: ${items.length} items (${itemsAdded} added, ${itemsUpdated} updated) in ${duration}ms`
      );

      return {
        type: 'incremental',
        itemsProcessed: items.length,
        itemsAdded,
        itemsUpdated,
        duration,
        errors,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      logger.notion.error('Incremental sync failed:', message);

      return {
        type: 'incremental',
        itemsProcessed: 0,
        itemsAdded: 0,
        itemsUpdated: 0,
        duration: Date.now() - startTime,
        errors,
      };
    }
  }

  /**
   * Load the in-memory cache from MongoDB.
   * Called on startup after incremental sync.
   */
  async loadCacheFromMongoDB(): Promise<void> {
    logger.store.info('Loading cache from MongoDB...');

    const mongodb = getMongoDB();
    const dataStore = getDataStore();

    const items = await mongodb.getAllItems();
    dataStore.initialize(items);

    // Rebuild relationships in cache
    this.rebuildCacheRelationships();

    logger.store.info(`Cache loaded with ${items.length} items from MongoDB`);
  }

  /**
   * Rebuild parent-child relationships in the cache.
   * Called after cache is populated to ensure children arrays are correct.
   */
  private rebuildCacheRelationships(): void {
    const dataStore = getDataStore();
    const items = dataStore.getAll();

    // Use the shared buildRelationships function
    const orphanedCount = buildRelationships(items, {
      onOrphanedItems: orphanedItems => {
        if (orphanedItems.length > 0) {
          logger.store.warn(`${orphanedItems.length} orphaned items in cache`);
        }
      },
    });

    // Re-initialize with rebuilt relationships
    dataStore.initialize(items);

    logger.store.debug(`Rebuilt relationships in cache (${orphanedCount} orphaned)`);
  }

  /**
   * Perform the appropriate sync based on current state.
   * Called on server startup.
   *
   * Logic:
   * 1. If not initialized: perform full sync
   * 2. If full sync overdue (>7 days): perform full sync
   * 3. If server was down: perform incremental sync for downtime
   * 4. Otherwise: just load cache from MongoDB
   */
  async performStartupSync(): Promise<SyncResult> {
    const syncState = getSyncState();

    // Check if we need a full sync
    if (!syncState.isInitialized()) {
      logger.notion.info('First run detected, performing full sync...');
      return await this.performFullSync();
    }

    // Check if full sync is overdue
    if (syncState.needsFullSync()) {
      logger.notion.info('Full sync overdue (>7 days), performing full sync...');
      return await this.performFullSync();
    }

    // Check for downtime
    const lastSyncTime = syncState.getLastSyncTimestamp();
    if (lastSyncTime) {
      const downtimeMs = syncState.getDowntimeDuration();
      if (downtimeMs && downtimeMs > 0) {
        const downtimeHours = (downtimeMs / (1000 * 60 * 60)).toFixed(1);
        logger.notion.info(`Server was down for ${downtimeHours}h, performing incremental sync...`);

        // Perform incremental sync
        const result = await this.performIncrementalSync(lastSyncTime);

        // If incremental sync had errors, we still load from MongoDB
        if (result.errors.length > 0) {
          logger.store.warn('Incremental sync had errors, loading existing MongoDB data');
        }

        // Load cache from MongoDB (incremental sync already updated MongoDB)
        await this.loadCacheFromMongoDB();
        return result;
      }
    }

    // No sync needed, just load from MongoDB
    logger.store.info('Cache refresh from MongoDB (no sync needed)...');
    const startTime = Date.now();
    await this.loadCacheFromMongoDB();

    return {
      type: 'cache-only',
      itemsProcessed: getDataStore().getAll().length,
      itemsAdded: 0,
      itemsUpdated: 0,
      duration: Date.now() - startTime,
      errors: [],
    };
  }

  /**
   * Perform a scheduled incremental sync.
   * Fetches items from the last 26 hours (2-hour overlap for safety).
   */
  async performScheduledIncrementalSync(): Promise<SyncResult> {
    // Use 26-hour window for 2-hour overlap
    const twentySixHoursAgo = new Date(Date.now() - 26 * 60 * 60 * 1000);
    return await this.performIncrementalSync(twentySixHoursAgo);
  }
}

// Singleton instance
let syncServiceInstance: SyncService | null = null;

/**
 * Initialize the sync service.
 */
export function initializeSyncService(): SyncService {
  syncServiceInstance = new SyncService();
  return syncServiceInstance;
}

/**
 * Get the sync service instance.
 */
export function getSyncService(): SyncService {
  if (!syncServiceInstance) {
    throw new Error('SyncService not initialized. Call initializeSyncService first.');
  }
  return syncServiceInstance;
}

export { SyncService };
