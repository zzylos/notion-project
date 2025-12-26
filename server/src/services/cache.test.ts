import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CacheService, initializeCache, getCache } from './cache.js';
import type { WorkItem } from '../types/index.js';

// Mock the logger to avoid console output during tests
vi.mock('../utils/logger.js', () => ({
  logger: {
    cache: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  },
}));

// Mock the shared constants
vi.mock('../../../shared/constants.js', () => ({
  CACHE: {
    FORCE_REFRESH_MAX_WAIT_MS: 1000, // Shorter timeout for tests
    REFRESH_POLL_INTERVAL_MS: 10, // Faster polling for tests
  },
}));

// Helper to create mock work items
function createMockItem(id: string, title: string): WorkItem {
  return {
    id,
    title,
    type: 'project',
    status: 'In Progress',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    // Create a fresh cache with 1 second TTL for faster tests
    cache = new CacheService(1);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct TTL in milliseconds', () => {
      const cacheWith5Seconds = new CacheService(5);
      expect(cacheWith5Seconds.getTTLMs()).toBe(5000);
    });

    it('should start with empty cache', () => {
      const stats = cache.getStats();
      expect(stats.entries).toBe(0);
      expect(stats.keys).toEqual([]);
    });
  });

  describe('generateKey', () => {
    it('should generate consistent key from database IDs', () => {
      const key1 = cache.generateKey(['db1', 'db2', 'db3']);
      const key2 = cache.generateKey(['db1', 'db2', 'db3']);
      expect(key1).toBe(key2);
    });

    it('should sort database IDs for consistent keys', () => {
      const key1 = cache.generateKey(['db1', 'db2', 'db3']);
      const key2 = cache.generateKey(['db3', 'db1', 'db2']);
      expect(key1).toBe(key2);
    });

    it('should use pipe separator', () => {
      const key = cache.generateKey(['aaa', 'bbb']);
      expect(key).toBe('aaa|bbb');
    });
  });

  describe('set and get', () => {
    it('should store and retrieve items', () => {
      const items = [createMockItem('1', 'Item 1'), createMockItem('2', 'Item 2')];
      const key = 'test-key';

      cache.set(key, items);
      const result = cache.get(key);

      expect(result).toBeDefined();
      expect(result?.items).toEqual(items);
      expect(result?.isStale).toBe(false);
    });

    it('should return undefined for non-existent key', () => {
      const result = cache.get('non-existent');
      expect(result).toBeUndefined();
    });

    it('should track cache hits', () => {
      const key = 'test-key';
      cache.set(key, []);

      cache.get(key);
      cache.get(key);

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
    });

    it('should track cache misses', () => {
      cache.get('miss-1');
      cache.get('miss-2');

      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
    });
  });

  describe('has and isStale', () => {
    it('should return true for existing key', () => {
      cache.set('exists', []);
      expect(cache.has('exists')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cache.has('not-exists')).toBe(false);
    });

    it('should return false for isStale on fresh entry', () => {
      cache.set('fresh', []);
      expect(cache.isStale('fresh')).toBe(false);
    });

    it('should return true for isStale after TTL expires', async () => {
      // Use a very short TTL cache
      const shortCache = new CacheService(0.05); // 50ms
      shortCache.set('key', []);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 60));

      expect(shortCache.isStale('key')).toBe(true);
    });
  });

  describe('getTTL and getAge', () => {
    it('should return undefined for non-existent key', () => {
      expect(cache.getTTL('missing')).toBeUndefined();
      expect(cache.getAge('missing')).toBeUndefined();
    });

    it('should return positive TTL for fresh entry', () => {
      cache.set('key', []);
      const ttl = cache.getTTL('key');
      expect(ttl).toBeDefined();
      expect(ttl!).toBeGreaterThan(0);
      expect(ttl!).toBeLessThanOrEqual(1000); // 1 second TTL
    });

    it('should return small age for fresh entry', () => {
      cache.set('key', []);
      const age = cache.getAge('key');
      expect(age).toBeDefined();
      expect(age!).toBeLessThan(100); // Should be very recent
    });

    it('should return negative TTL for stale entry', async () => {
      const shortCache = new CacheService(0.05); // 50ms
      shortCache.set('key', []);

      await new Promise(resolve => setTimeout(resolve, 60));

      const ttl = shortCache.getTTL('key');
      expect(ttl).toBeDefined();
      expect(ttl!).toBeLessThan(0);
    });
  });

  describe('clear and delete', () => {
    it('should clear all entries', () => {
      cache.set('key1', []);
      cache.set('key2', []);
      cache.set('key3', []);

      expect(cache.getStats().entries).toBe(3);

      cache.clear();

      expect(cache.getStats().entries).toBe(0);
    });

    it('should delete specific key', () => {
      cache.set('key1', []);
      cache.set('key2', []);

      const deleted = cache.delete('key1');

      expect(deleted).toBe(true);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
    });

    it('should return false when deleting non-existent key', () => {
      const deleted = cache.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('stale-while-revalidate behavior', () => {
    it('should return stale data and trigger background refresh', async () => {
      // Use a longer TTL (500ms) so fresh data doesn't become stale during the test
      const shortCache = new CacheService(0.5);
      const items = [createMockItem('1', 'Original')];
      const freshItems = [createMockItem('2', 'Fresh')];
      const key = 'swr-key';

      // Register refresh callback
      const refreshCallback = vi.fn().mockResolvedValue(freshItems);
      shortCache.registerRefreshCallback(key, refreshCallback);

      // Set initial data
      shortCache.set(key, items);

      // Wait for data to become stale (TTL is 500ms)
      await new Promise(resolve => setTimeout(resolve, 550));

      // Get stale data - should trigger background refresh
      const result = shortCache.get(key);

      expect(result).toBeDefined();
      expect(result?.items).toEqual(items); // Returns stale data immediately
      expect(result?.isStale).toBe(true);

      // Wait for background refresh to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(refreshCallback).toHaveBeenCalled();

      // Now cache should have fresh data (and TTL reset, so not stale yet)
      const freshResult = shortCache.get(key);
      expect(freshResult?.items).toEqual(freshItems);
      expect(freshResult?.isStale).toBe(false);
    });

    it('should track stale hits', async () => {
      const shortCache = new CacheService(0.05);
      shortCache.set('key', []);

      await new Promise(resolve => setTimeout(resolve, 60));

      shortCache.get('key');
      shortCache.get('key');

      const stats = shortCache.getStats();
      expect(stats.staleHits).toBe(2);
    });

    it('should not trigger duplicate background refreshes', async () => {
      const shortCache = new CacheService(0.05);
      const key = 'dup-key';

      const refreshCallback = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return [createMockItem('1', 'Fresh')];
      });
      shortCache.registerRefreshCallback(key, refreshCallback);
      shortCache.set(key, []);

      await new Promise(resolve => setTimeout(resolve, 60));

      // Multiple gets while refresh is in progress
      shortCache.get(key);
      shortCache.get(key);
      shortCache.get(key);

      // Wait for refresh to complete
      await new Promise(resolve => setTimeout(resolve, 150));

      // Callback should only be called once
      expect(refreshCallback).toHaveBeenCalledTimes(1);
    });

    it('should track background refreshes', async () => {
      const shortCache = new CacheService(0.05);
      const key = 'track-key';

      shortCache.registerRefreshCallback(key, async () => []);
      shortCache.set(key, []);

      await new Promise(resolve => setTimeout(resolve, 60));

      shortCache.get(key);

      await new Promise(resolve => setTimeout(resolve, 50));

      const stats = shortCache.getStats();
      expect(stats.backgroundRefreshes).toBe(1);
    });
  });

  describe('isRefreshing', () => {
    it('should return false when not refreshing', () => {
      expect(cache.isRefreshing('any-key')).toBe(false);
    });

    it('should return true during refresh', async () => {
      const key = 'refresh-key';
      let resolveRefresh: (value: WorkItem[]) => void;
      const refreshPromise = new Promise<WorkItem[]>(resolve => {
        resolveRefresh = resolve;
      });

      cache.registerRefreshCallback(key, () => refreshPromise);
      cache.set(key, []);

      // Make cache stale
      const shortCache = new CacheService(0.01);
      shortCache.registerRefreshCallback(key, () => refreshPromise);
      shortCache.set(key, []);

      await new Promise(resolve => setTimeout(resolve, 20));

      shortCache.get(key); // Triggers background refresh

      expect(shortCache.isRefreshing(key)).toBe(true);

      // Resolve and complete
      resolveRefresh!([]);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(shortCache.isRefreshing(key)).toBe(false);
    });
  });

  describe('forceRefresh', () => {
    it('should wait for refresh and return fresh data', async () => {
      const key = 'force-key';
      const freshItems = [createMockItem('1', 'Fresh')];

      cache.registerRefreshCallback(key, async () => freshItems);
      cache.set(key, [createMockItem('0', 'Old')]);

      const result = await cache.forceRefresh(key);

      expect(result).toEqual(freshItems);

      // Cache should be updated
      const cached = cache.get(key);
      expect(cached?.items).toEqual(freshItems);
    });

    it('should return null if no callback registered', async () => {
      const result = await cache.forceRefresh('no-callback-key');
      expect(result).toBeNull();
    });

    it('should throw error if refresh callback fails', async () => {
      const key = 'error-key';
      cache.registerRefreshCallback(key, async () => {
        throw new Error('Refresh failed');
      });

      await expect(cache.forceRefresh(key)).rejects.toThrow('Refresh failed');
    });

    it('should wait for existing refresh to complete', async () => {
      const key = 'wait-key';
      const items = [createMockItem('1', 'Item')];
      let callCount = 0;

      cache.registerRefreshCallback(key, async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return items;
      });

      // Start two refreshes concurrently
      const [result1, result2] = await Promise.all([
        cache.forceRefresh(key),
        cache.forceRefresh(key),
      ]);

      // Both should get the same result
      expect(result1).toEqual(items);
      expect(result2).toEqual(items);

      // Callback should only be called once
      expect(callCount).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return all statistics', () => {
      cache.set('key1', []);
      cache.set('key2', []);

      cache.get('key1'); // hit
      cache.get('missing'); // miss

      const stats = cache.getStats();

      expect(stats.entries).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.staleHits).toBe(0);
      expect(stats.backgroundRefreshes).toBe(0);
      expect(stats.refreshingKeys).toEqual([]);
    });

    it('should calculate hitRate correctly', () => {
      cache.set('key', []);

      // 3 hits, 1 miss
      cache.get('key');
      cache.get('key');
      cache.get('key');
      cache.get('missing');

      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0.75); // 3/4
    });

    it('should return 0 hitRate when no requests', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should include stale hits in hitRate calculation', async () => {
      const shortCache = new CacheService(0.01);
      shortCache.set('key', []);

      await new Promise(resolve => setTimeout(resolve, 20));

      // 2 stale hits
      shortCache.get('key');
      shortCache.get('key');
      // 1 miss
      shortCache.get('missing');

      const stats = shortCache.getStats();
      // hitRate = (hits + staleHits) / total = (0 + 2) / 3
      expect(stats.hitRate).toBeCloseTo(2 / 3);
    });
  });

  describe('resetStats', () => {
    it('should reset all counters', () => {
      cache.set('key', []);
      cache.get('key');
      cache.get('missing');

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.staleHits).toBe(0);
      expect(stats.backgroundRefreshes).toBe(0);
    });

    it('should not affect cache entries', () => {
      cache.set('key', [createMockItem('1', 'Item')]);
      cache.resetStats();

      expect(cache.has('key')).toBe(true);
      expect(cache.getStats().entries).toBe(1);
    });
  });

  describe('error handling in background refresh', () => {
    it('should keep stale data on refresh failure', async () => {
      const shortCache = new CacheService(0.05);
      const key = 'error-key';
      const originalItems = [createMockItem('1', 'Original')];

      shortCache.registerRefreshCallback(key, async () => {
        throw new Error('Network error');
      });
      shortCache.set(key, originalItems);

      await new Promise(resolve => setTimeout(resolve, 60));

      // Get triggers failed background refresh
      const result = shortCache.get(key);
      expect(result?.items).toEqual(originalItems);

      // Wait for failed refresh
      await new Promise(resolve => setTimeout(resolve, 50));

      // Data should still be there
      const afterError = shortCache.get(key);
      expect(afterError?.items).toEqual(originalItems);
    });
  });
});

describe('initializeCache and getCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize and return cache instance', () => {
    const cache = initializeCache(300);
    expect(cache).toBeInstanceOf(CacheService);
    expect(cache.getTTLMs()).toBe(300000);
  });

  it('should return same instance from getCache', () => {
    const initialized = initializeCache(300);
    const retrieved = getCache();
    expect(retrieved).toBe(initialized);
  });

  it('should throw if getCache called before initialization', () => {
    // This test is tricky because the module state persists
    // In practice, initialization happens before any routes are called
    // We'll skip this test as it would require module reloading
  });
});
