import { getMongoDB, type SyncState } from './mongodb.js';
import { logger } from '../utils/logger.js';

// How often to run full sync (7 days in milliseconds)
const FULL_SYNC_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Sync State Manager - handles sync timestamp tracking via MongoDB.
 * Simplified from file-based to use MongoDB for persistence.
 */
class SyncStateManager {
  private cachedState: SyncState | null = null;

  /**
   * Load sync state from MongoDB.
   */
  async load(): Promise<void> {
    try {
      const mongodb = getMongoDB();
      this.cachedState = await mongodb.getSyncState();
      logger.store.info('Loaded sync state from MongoDB');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.store.warn(`Failed to load sync state: ${message}`);
      this.cachedState = {
        initialized: false,
        lastFullSync: null,
        lastIncrementalSync: null,
        lastServerShutdown: null,
        lastServerStartup: null,
      };
    }
  }

  private getState(): SyncState {
    if (!this.cachedState) {
      throw new Error('SyncState not loaded. Call load() first.');
    }
    return this.cachedState;
  }

  private async save(update: Partial<SyncState>): Promise<void> {
    try {
      const mongodb = getMongoDB();
      await mongodb.updateSyncState(update);
      this.cachedState = { ...this.getState(), ...update };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.store.error(`Failed to save sync state: ${message}`);
    }
  }

  /**
   * Get the current sync state (read-only copy).
   */
  getSyncState(): Readonly<SyncState> {
    return { ...this.getState() };
  }

  /**
   * Check if the database has been initialized with a full sync.
   */
  isInitialized(): boolean {
    return this.getState().initialized;
  }

  /**
   * Mark that a full sync has completed successfully.
   */
  async markFullSyncComplete(): Promise<void> {
    const now = new Date().toISOString();
    await this.save({
      initialized: true,
      lastFullSync: now,
      lastIncrementalSync: now,
    });
    logger.store.info(`Full sync completed at ${now}`);
  }

  /**
   * Mark that an incremental sync has completed successfully.
   */
  async markIncrementalSyncComplete(): Promise<void> {
    const now = new Date().toISOString();
    await this.save({ lastIncrementalSync: now });
    logger.store.info(`Incremental sync completed at ${now}`);
  }

  /**
   * Record server shutdown time.
   */
  async markServerShutdown(): Promise<void> {
    const now = new Date().toISOString();
    await this.save({ lastServerShutdown: now });
    logger.store.info(`Server shutdown recorded at ${now}`);
  }

  /**
   * Record server startup time.
   */
  async markServerStartup(): Promise<void> {
    const now = new Date().toISOString();
    await this.save({ lastServerStartup: now });
    logger.store.info(`Server startup recorded at ${now}`);
  }

  /**
   * Calculate downtime duration since last shutdown.
   */
  getDowntimeDuration(): number | null {
    const state = this.getState();
    if (!state.lastServerShutdown) {
      return null;
    }
    return Date.now() - new Date(state.lastServerShutdown).getTime();
  }

  /**
   * Get the timestamp to use for incremental sync.
   */
  getLastSyncTimestamp(): Date | null {
    const state = this.getState();
    if (state.lastServerShutdown) {
      return new Date(state.lastServerShutdown);
    }
    if (state.lastIncrementalSync) {
      return new Date(state.lastIncrementalSync);
    }
    return null;
  }

  /**
   * Check if a full sync is needed.
   */
  needsFullSync(): boolean {
    const state = this.getState();
    if (!state.initialized || !state.lastFullSync) {
      return true;
    }
    const lastFullSync = new Date(state.lastFullSync).getTime();
    return Date.now() - lastFullSync > FULL_SYNC_INTERVAL_MS;
  }
}

// Singleton instance
let syncStateInstance: SyncStateManager | null = null;

/**
 * Initialize the sync state manager.
 */
export async function initializeSyncState(): Promise<SyncStateManager> {
  syncStateInstance = new SyncStateManager();
  await syncStateInstance.load();
  return syncStateInstance;
}

/**
 * Get the sync state manager instance.
 */
export function getSyncState(): SyncStateManager {
  if (!syncStateInstance) {
    throw new Error('SyncState not initialized. Call initializeSyncState first.');
  }
  return syncStateInstance;
}

export { SyncStateManager };
export type { SyncState };
