import type { WorkItem } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Persistent in-memory data store for WorkItems.
 *
 * Unlike the previous cache service, this store:
 * - Has no TTL/expiration (data persists until server restart)
 * - Is updated in real-time via Notion webhooks
 * - Maintains parent-child relationships
 */
class DataStore {
  private items: Map<string, WorkItem> = new Map();
  private initialized = false;
  private lastUpdated: Date | null = null;

  /**
   * Check if the store has been initialized with data
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the timestamp of the last update
   */
  getLastUpdated(): Date | null {
    return this.lastUpdated;
  }

  /**
   * Initialize the store with items (called once on startup)
   */
  initialize(items: WorkItem[]): void {
    this.items.clear();
    for (const item of items) {
      this.items.set(item.id, item);
    }
    this.initialized = true;
    this.lastUpdated = new Date();
    logger.store.info(`Initialized with ${items.length} items`);
  }

  /**
   * Get all items as an array
   */
  getAll(): WorkItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Get a single item by ID
   */
  get(id: string): WorkItem | undefined {
    return this.items.get(id);
  }

  /**
   * Check if an item exists
   */
  has(id: string): boolean {
    return this.items.has(id);
  }

  /**
   * Add or update an item
   * Also updates parent-child relationships
   */
  upsert(item: WorkItem): void {
    const existing = this.items.get(item.id);

    // If item existed with a different parent, remove from old parent's children
    if (existing?.parentId && existing.parentId !== item.parentId) {
      const oldParent = this.items.get(existing.parentId);
      if (oldParent?.children) {
        oldParent.children = oldParent.children.filter(id => id !== item.id);
      }
    }

    // Add to new parent's children if parentId exists
    if (item.parentId) {
      const parent = this.items.get(item.parentId);
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        if (!parent.children.includes(item.id)) {
          parent.children.push(item.id);
        }
      }
    }

    // Preserve existing children if not provided
    if (existing?.children && !item.children?.length) {
      item.children = existing.children;
    }

    this.items.set(item.id, item);
    this.lastUpdated = new Date();
    logger.store.debug(`Upserted item: ${item.id} (${item.title})`);
  }

  /**
   * Delete an item by ID
   * Also removes from parent's children array
   */
  delete(id: string): boolean {
    const item = this.items.get(id);
    if (!item) {
      return false;
    }

    // Remove from parent's children
    if (item.parentId) {
      const parent = this.items.get(item.parentId);
      if (parent?.children) {
        parent.children = parent.children.filter(childId => childId !== id);
      }
    }

    // Orphan any children (set their parentId to undefined)
    if (item.children) {
      for (const childId of item.children) {
        const child = this.items.get(childId);
        if (child) {
          child.parentId = undefined;
        }
      }
    }

    this.items.delete(id);
    this.lastUpdated = new Date();
    logger.store.debug(`Deleted item: ${id}`);
    return true;
  }

  /**
   * Get store statistics
   */
  getStats(): {
    totalItems: number;
    initialized: boolean;
    lastUpdated: string | null;
    itemsByType: Record<string, number>;
  } {
    const itemsByType: Record<string, number> = {};
    for (const item of this.items.values()) {
      itemsByType[item.type] = (itemsByType[item.type] || 0) + 1;
    }

    return {
      totalItems: this.items.size,
      initialized: this.initialized,
      lastUpdated: this.lastUpdated?.toISOString() ?? null,
      itemsByType,
    };
  }

  /**
   * Clear all data (useful for testing or manual reset)
   */
  clear(): void {
    this.items.clear();
    this.initialized = false;
    this.lastUpdated = null;
    logger.store.info('Store cleared');
  }
}

// Singleton instance
let storeInstance: DataStore | null = null;

export function initializeDataStore(): DataStore {
  storeInstance = new DataStore();
  return storeInstance;
}

export function getDataStore(): DataStore {
  if (!storeInstance) {
    throw new Error('DataStore not initialized. Call initializeDataStore first.');
  }
  return storeInstance;
}

export { DataStore };
