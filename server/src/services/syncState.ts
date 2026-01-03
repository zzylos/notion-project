import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sync state file location (in server directory, should be gitignored)
const SYNC_STATE_FILE = path.resolve(__dirname, '../../sync-state.json');

// How often to run full sync (7 days in milliseconds)
const FULL_SYNC_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Sync state structure stored in JSON file.
 * Tracks synchronization timestamps for incremental sync logic.
 */
export interface SyncState {
  /** Has the first full sync ever completed? */
  initialized: boolean;
  /** ISO timestamp of last full re-pull from Notion */
  lastFullSync: string | null;
  /** ISO timestamp of last incremental sync */
  lastIncrementalSync: string | null;
  /** ISO timestamp when server last shut down gracefully */
  lastServerShutdown: string | null;
  /** ISO timestamp when server last started */
  lastServerStartup: string | null;
}

/**
 * Default sync state for first run.
 */
const DEFAULT_SYNC_STATE: SyncState = {
  initialized: false,
  lastFullSync: null,
  lastIncrementalSync: null,
  lastServerShutdown: null,
  lastServerStartup: null,
};

/**
 * Sync State Manager - handles persistent sync timestamp tracking.
 * Uses a simple JSON file to track when syncs occurred,
 * enabling smart incremental syncs on server restart.
 */
class SyncStateManager {
  private state: SyncState;
  private filePath: string;

  constructor(filePath: string = SYNC_STATE_FILE) {
    this.filePath = filePath;
    this.state = this.load();
  }

  /**
   * Load sync state from file.
   * Returns default state if file doesn't exist or is invalid.
   */
  private load(): SyncState {
    try {
      if (!fs.existsSync(this.filePath)) {
        logger.store.info('No sync state file found, using defaults');
        return { ...DEFAULT_SYNC_STATE };
      }

      const content = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(content);

      // Validate structure
      if (typeof parsed !== 'object' || parsed === null) {
        logger.store.warn('Invalid sync state file format, using defaults');
        return { ...DEFAULT_SYNC_STATE };
      }

      // Merge with defaults to handle missing fields from older versions
      const state: SyncState = {
        ...DEFAULT_SYNC_STATE,
        ...parsed,
      };

      logger.store.info('Loaded sync state from file');
      return state;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.store.warn(`Failed to load sync state: ${message}, using defaults`);
      return { ...DEFAULT_SYNC_STATE };
    }
  }

  /**
   * Save current state to file.
   */
  private save(): void {
    try {
      const content = JSON.stringify(this.state, null, 2);
      fs.writeFileSync(this.filePath, content, 'utf-8');
      logger.store.debug('Sync state saved to file');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.store.error(`Failed to save sync state: ${message}`);
    }
  }

  /**
   * Get the current sync state (read-only copy).
   */
  getState(): Readonly<SyncState> {
    return { ...this.state };
  }

  /**
   * Check if the database has been initialized with a full sync.
   */
  isInitialized(): boolean {
    return this.state.initialized;
  }

  /**
   * Mark that a full sync has completed successfully.
   */
  markFullSyncComplete(): void {
    const now = new Date().toISOString();
    this.state.initialized = true;
    this.state.lastFullSync = now;
    this.state.lastIncrementalSync = now; // Full sync counts as incremental too
    this.save();
    logger.store.info(`Full sync completed at ${now}`);
  }

  /**
   * Mark that an incremental sync has completed successfully.
   */
  markIncrementalSyncComplete(): void {
    const now = new Date().toISOString();
    this.state.lastIncrementalSync = now;
    this.save();
    logger.store.info(`Incremental sync completed at ${now}`);
  }

  /**
   * Record server shutdown time.
   * Called during graceful shutdown to track downtime.
   */
  markServerShutdown(): void {
    const now = new Date().toISOString();
    this.state.lastServerShutdown = now;
    this.save();
    logger.store.info(`Server shutdown recorded at ${now}`);
  }

  /**
   * Record server startup time.
   */
  markServerStartup(): void {
    const now = new Date().toISOString();
    this.state.lastServerStartup = now;
    this.save();
    logger.store.info(`Server startup recorded at ${now}`);
  }

  /**
   * Calculate downtime duration since last shutdown.
   * Returns null if no previous shutdown recorded.
   */
  getDowntimeDuration(): number | null {
    if (!this.state.lastServerShutdown) {
      return null;
    }

    const shutdownTime = new Date(this.state.lastServerShutdown).getTime();
    const now = Date.now();
    return now - shutdownTime;
  }

  /**
   * Get the timestamp to use for incremental sync.
   * Returns the most recent of: lastServerShutdown, lastIncrementalSync.
   * If neither exists, returns null (need full sync).
   */
  getLastSyncTimestamp(): Date | null {
    // Prefer lastServerShutdown for catching updates during downtime
    if (this.state.lastServerShutdown) {
      return new Date(this.state.lastServerShutdown);
    }

    // Fall back to last incremental sync
    if (this.state.lastIncrementalSync) {
      return new Date(this.state.lastIncrementalSync);
    }

    return null;
  }

  /**
   * Check if a full sync is needed.
   * True if never initialized OR if last full sync was more than 7 days ago.
   */
  needsFullSync(): boolean {
    if (!this.state.initialized) {
      return true;
    }

    if (!this.state.lastFullSync) {
      return true;
    }

    const lastFullSync = new Date(this.state.lastFullSync).getTime();
    const now = Date.now();
    return now - lastFullSync > FULL_SYNC_INTERVAL_MS;
  }

  /**
   * Get time since last full sync in milliseconds.
   * Returns null if no full sync has ever been performed.
   */
  getTimeSinceLastFullSync(): number | null {
    if (!this.state.lastFullSync) {
      return null;
    }
    return Date.now() - new Date(this.state.lastFullSync).getTime();
  }

  /**
   * Get time until next scheduled full sync in milliseconds.
   * Returns 0 if full sync is overdue.
   */
  getTimeUntilNextFullSync(): number {
    const timeSince = this.getTimeSinceLastFullSync();
    if (timeSince === null) {
      return 0; // Need full sync now
    }
    return Math.max(0, FULL_SYNC_INTERVAL_MS - timeSince);
  }

  /**
   * Reset sync state (for testing or manual reset).
   */
  reset(): void {
    this.state = { ...DEFAULT_SYNC_STATE };
    this.save();
    logger.store.info('Sync state reset to defaults');
  }

  /**
   * Delete the sync state file (for testing cleanup).
   */
  deleteFile(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
        logger.store.info('Sync state file deleted');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.store.error(`Failed to delete sync state file: ${message}`);
    }
  }
}

// Singleton instance
let syncStateInstance: SyncStateManager | null = null;

/**
 * Initialize the sync state manager.
 * Must be called before using getSyncState().
 */
export function initializeSyncState(filePath?: string): SyncStateManager {
  syncStateInstance = new SyncStateManager(filePath);
  return syncStateInstance;
}

/**
 * Get the sync state manager instance.
 * Throws if not initialized.
 */
export function getSyncState(): SyncStateManager {
  if (!syncStateInstance) {
    throw new Error('SyncState not initialized. Call initializeSyncState first.');
  }
  return syncStateInstance;
}

export { SyncStateManager };
