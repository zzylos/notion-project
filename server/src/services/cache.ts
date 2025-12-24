import type { CacheStats, WorkItem } from '../types/index.js';

interface CacheEntry {
  items: WorkItem[];
  timestamp: number;
}

type RefreshCallback = () => Promise<WorkItem[]>;

/**
 * Server-side cache service with stale-while-revalidate pattern.
 *
 * When TTL expires:
 * 1. Returns stale data immediately to the client
 * 2. Triggers background refresh from Notion
 * 3. Updates cache when fresh data arrives
 *
 * This ensures fast responses while keeping data fresh.
 */
class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private ttlMs: number;
  private refreshInProgress: Set<string> = new Set();
  private refreshCallbacks: Map<string, RefreshCallback> = new Map();
  private hits = 0;
  private misses = 0;
  private staleHits = 0;
  private backgroundRefreshes = 0;

  constructor(ttlSeconds: number) {
    this.ttlMs = ttlSeconds * 1000;
  }

  /**
   * Register a refresh callback for a cache key.
   * This will be called when the cache needs to be refreshed in the background.
   */
  registerRefreshCallback(key: string, callback: RefreshCallback): void {
    this.refreshCallbacks.set(key, callback);
  }

  /**
   * Generate cache key from database IDs
   */
  generateKey(databaseIds: string[]): string {
    return databaseIds.sort().join('|');
  }

  /**
   * Check if cache entry is stale (past TTL but still usable)
   */
  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return Date.now() - entry.timestamp > this.ttlMs;
  }

  /**
   * Check if cache entry exists (regardless of staleness)
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get cached items with stale-while-revalidate behavior.
   *
   * Returns cached data even if stale, and triggers background refresh.
   * Returns undefined only if no cache exists at all.
   */
  get(key: string): { items: WorkItem[]; timestamp: number; isStale: boolean } | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    const isStale = Date.now() - entry.timestamp > this.ttlMs;

    if (isStale) {
      this.staleHits++;
      // Trigger background refresh if not already in progress
      this.triggerBackgroundRefresh(key);
    } else {
      this.hits++;
    }

    return {
      items: entry.items,
      timestamp: entry.timestamp,
      isStale,
    };
  }

  /**
   * Trigger a background refresh for a cache key.
   * Only one refresh per key at a time.
   */
  private async triggerBackgroundRefresh(key: string): Promise<void> {
    // Skip if already refreshing
    if (this.refreshInProgress.has(key)) {
      return;
    }

    const callback = this.refreshCallbacks.get(key);
    if (!callback) {
      console.warn(`[Cache] No refresh callback registered for key: ${key}`);
      return;
    }

    this.refreshInProgress.add(key);
    this.backgroundRefreshes++;
    console.info(`[Cache] Background refresh started for: ${key}`);

    try {
      const freshItems = await callback();
      this.set(key, freshItems);
      console.info(`[Cache] Background refresh completed: ${freshItems.length} items`);
    } catch (error) {
      console.error('[Cache] Background refresh failed:', error);
      // Keep stale data on failure - don't clear the cache
    } finally {
      this.refreshInProgress.delete(key);
    }
  }

  /**
   * Set cached items
   */
  set(key: string, items: WorkItem[]): void {
    this.cache.set(key, {
      items,
      timestamp: Date.now(),
    });

    if (process.env.NODE_ENV !== 'production') {
      console.info(`[Cache] SET: ${key} (${items.length} items)`);
    }
  }

  /**
   * Get TTL for a key (remaining time in ms, negative if stale)
   */
  getTTL(key: string): number | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    return this.ttlMs - (Date.now() - entry.timestamp);
  }

  /**
   * Get cache age for a key (time since cached in ms)
   */
  getAge(key: string): number | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    return Date.now() - entry.timestamp;
  }

  /**
   * Check if a background refresh is in progress for a key
   */
  isRefreshing(key: string): boolean {
    return this.refreshInProgress.has(key);
  }

  /**
   * Clear all cached data and stop background refreshes
   */
  clear(): void {
    this.cache.clear();
    this.refreshInProgress.clear();
    console.info('[Cache] Cleared all entries');
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    this.refreshInProgress.delete(key);
    if (existed && process.env.NODE_ENV !== 'production') {
      console.info(`[Cache] DEL: ${key}`);
    }
    return existed;
  }

  /**
   * Force refresh a cache key (waits for completion)
   */
  async forceRefresh(key: string): Promise<WorkItem[] | null> {
    const callback = this.refreshCallbacks.get(key);
    if (!callback) {
      console.warn(`[Cache] No refresh callback registered for key: ${key}`);
      return null;
    }

    // Wait if already refreshing
    if (this.refreshInProgress.has(key)) {
      console.info(`[Cache] Waiting for existing refresh: ${key}`);
      // Wait for refresh to complete (poll every 100ms)
      while (this.refreshInProgress.has(key)) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      const entry = this.cache.get(key);
      return entry?.items ?? null;
    }

    this.refreshInProgress.add(key);
    console.info(`[Cache] Force refresh started for: ${key}`);

    try {
      const freshItems = await callback();
      this.set(key, freshItems);
      console.info(`[Cache] Force refresh completed: ${freshItems.length} items`);
      return freshItems;
    } catch (error) {
      console.error('[Cache] Force refresh failed:', error);
      throw error;
    } finally {
      this.refreshInProgress.delete(key);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & {
    staleHits: number;
    backgroundRefreshes: number;
    refreshingKeys: string[];
  } {
    const keys = Array.from(this.cache.keys());
    const total = this.hits + this.misses + this.staleHits;
    return {
      entries: keys.length,
      keys,
      hitRate: total > 0 ? (this.hits + this.staleHits) / total : 0,
      hits: this.hits,
      misses: this.misses,
      staleHits: this.staleHits,
      backgroundRefreshes: this.backgroundRefreshes,
      refreshingKeys: Array.from(this.refreshInProgress),
    };
  }

  /**
   * Reset hit/miss counters
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.staleHits = 0;
    this.backgroundRefreshes = 0;
  }

  /**
   * Get the configured TTL in milliseconds
   */
  getTTLMs(): number {
    return this.ttlMs;
  }
}

// Singleton instance - will be initialized with config in index.ts
let cacheInstance: CacheService | null = null;

export function initializeCache(ttlSeconds: number, _checkPeriodSeconds: number): CacheService {
  cacheInstance = new CacheService(ttlSeconds);
  return cacheInstance;
}

export function getCache(): CacheService {
  if (!cacheInstance) {
    throw new Error('Cache not initialized. Call initializeCache first.');
  }
  return cacheInstance;
}

export { CacheService };
