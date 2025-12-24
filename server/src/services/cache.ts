import NodeCache from 'node-cache';
import type { CacheStats, WorkItem } from '../types/index.js';

/**
 * Server-side cache service using node-cache.
 * Provides in-memory caching with TTL support.
 */
class CacheService {
  private cache: NodeCache;
  private hits = 0;
  private misses = 0;

  constructor(ttlSeconds: number, checkPeriodSeconds: number) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: checkPeriodSeconds,
      useClones: false, // Performance optimization - we return readonly data
    });

    // Log cache events in development
    if (process.env.NODE_ENV !== 'production') {
      this.cache.on('set', key => {
        console.info(`[Cache] SET: ${key}`);
      });

      this.cache.on('del', key => {
        console.info(`[Cache] DEL: ${key}`);
      });

      this.cache.on('expired', key => {
        console.info(`[Cache] EXPIRED: ${key}`);
      });
    }
  }

  /**
   * Generate cache key from database IDs
   */
  generateKey(databaseIds: string[]): string {
    return databaseIds.sort().join('|');
  }

  /**
   * Get cached items
   */
  get(key: string): { items: WorkItem[]; timestamp: number } | undefined {
    const cached = this.cache.get<{ items: WorkItem[]; timestamp: number }>(key);
    if (cached) {
      this.hits++;
      return cached;
    }
    this.misses++;
    return undefined;
  }

  /**
   * Set cached items
   */
  set(key: string, items: WorkItem[]): void {
    this.cache.set(key, {
      items,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get TTL for a key (remaining time in ms)
   */
  getTTL(key: string): number | undefined {
    const ttl = this.cache.getTtl(key);
    if (ttl === undefined) return undefined;
    return ttl - Date.now();
  }

  /**
   * Get cache age for a key (time since cached in ms)
   */
  getAge(key: string): number | undefined {
    const cached = this.cache.get<{ items: WorkItem[]; timestamp: number }>(key);
    if (!cached) return undefined;
    return Date.now() - cached.timestamp;
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.flushAll();
    console.info('[Cache] Cleared all entries');
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    return this.cache.del(key) > 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const keys = this.cache.keys();
    const total = this.hits + this.misses;
    return {
      entries: keys.length,
      keys,
      hitRate: total > 0 ? this.hits / total : 0,
      hits: this.hits,
      misses: this.misses,
    };
  }

  /**
   * Reset hit/miss counters
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

// Singleton instance - will be initialized with config in index.ts
let cacheInstance: CacheService | null = null;

export function initializeCache(ttlSeconds: number, checkPeriodSeconds: number): CacheService {
  cacheInstance = new CacheService(ttlSeconds, checkPeriodSeconds);
  return cacheInstance;
}

export function getCache(): CacheService {
  if (!cacheInstance) {
    throw new Error('Cache not initialized. Call initializeCache first.');
  }
  return cacheInstance;
}

export { CacheService };
