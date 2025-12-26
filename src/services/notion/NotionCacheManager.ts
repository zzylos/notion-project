/**
 * NotionCacheManager - Handles caching for Notion data.
 *
 * Implements a dual-layer caching strategy:
 * - Memory cache for quick access
 * - LocalStorage cache for persistence across page reloads
 */

import type { WorkItem } from '../../types';
import { NOTION } from '../../constants';
import { logger } from '../../utils/logger';

// LocalStorage cache key prefix
const CACHE_KEY_PREFIX = 'notion-cache-';
const CACHE_METADATA_KEY = 'notion-cache-metadata';

// Persistent cache timeout (24 hours for localStorage)
const PERSISTENT_CACHE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  items: WorkItem[];
  timestamp: number;
}

interface CacheMetadata {
  keys: string[];
  lastCleanup: number;
}

export class NotionCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTimeout: number;
  private debugMode: boolean;

  constructor(cacheTimeout = NOTION.CACHE_TIMEOUT, debugMode = false) {
    this.cacheTimeout = cacheTimeout;
    this.debugMode = debugMode;
    // Load persistent cache into memory on initialization
    this.loadPersistentCache();
  }

  /**
   * Get cached items if still valid
   */
  get(cacheKey: string): CacheEntry | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached;
    }
    return null;
  }

  /**
   * Set items in cache (both memory and persistent)
   */
  set(cacheKey: string, items: WorkItem[]): void {
    const timestamp = Date.now();
    this.cache.set(cacheKey, { items, timestamp });
    this.savePersistentCache(cacheKey, items, timestamp);
  }

  /**
   * Check if cache has valid entry
   */
  has(cacheKey: string): boolean {
    return this.get(cacheKey) !== null;
  }

  /**
   * Clear all caches (memory and persistent)
   */
  clear(): void {
    this.cache.clear();
    this.clearPersistentCache();
  }

  /**
   * Get cache entry without checking timeout (for fallback scenarios)
   */
  getStale(cacheKey: string): CacheEntry | null {
    return this.cache.get(cacheKey) || null;
  }

  /**
   * Load cached data from localStorage into memory cache
   */
  private loadPersistentCache(): void {
    try {
      const metadataStr = localStorage.getItem(CACHE_METADATA_KEY);
      if (!metadataStr) return;

      let metadata: CacheMetadata;
      try {
        const parsed = JSON.parse(metadataStr);
        // Validate parsed metadata structure
        if (!parsed || !Array.isArray(parsed.keys)) {
          logger.warn('Notion', 'Invalid cache metadata structure, skipping load');
          return;
        }
        metadata = parsed;
      } catch (parseError) {
        logger.warn('Notion', 'Failed to parse cache metadata, clearing:', parseError);
        localStorage.removeItem(CACHE_METADATA_KEY);
        return;
      }

      const now = Date.now();

      for (const key of metadata.keys) {
        const cachedStr = localStorage.getItem(CACHE_KEY_PREFIX + key);
        if (!cachedStr) continue;

        try {
          const cached = JSON.parse(cachedStr);
          // Validate cached data structure
          if (!cached || !Array.isArray(cached.items) || typeof cached.timestamp !== 'number') {
            logger.warn('Notion', `Invalid cache entry for key ${key}, removing`);
            localStorage.removeItem(CACHE_KEY_PREFIX + key);
            continue;
          }

          // Check if persistent cache is still valid
          if (now - cached.timestamp < PERSISTENT_CACHE_TIMEOUT) {
            this.cache.set(key, cached);
            if (this.debugMode) {
              logger.info('Notion', `Loaded ${cached.items.length} items from persistent cache`);
            }
          } else {
            // Clean up expired cache
            localStorage.removeItem(CACHE_KEY_PREFIX + key);
          }
        } catch (parseError) {
          logger.warn('Notion', `Failed to parse cache entry for key ${key}, removing:`, parseError);
          localStorage.removeItem(CACHE_KEY_PREFIX + key);
        }
      }
    } catch (error) {
      logger.warn('Notion', 'Failed to load persistent cache:', error);
    }
  }

  /**
   * Save cache to localStorage for persistence across page refreshes
   */
  private savePersistentCache(cacheKey: string, items: WorkItem[], timestamp: number): void {
    try {
      const cacheData = { items, timestamp };
      localStorage.setItem(CACHE_KEY_PREFIX + cacheKey, JSON.stringify(cacheData));

      // Update metadata
      const metadataStr = localStorage.getItem(CACHE_METADATA_KEY);
      let metadata: CacheMetadata = { keys: [], lastCleanup: Date.now() };

      if (metadataStr) {
        try {
          const parsed = JSON.parse(metadataStr);
          // Validate parsed metadata structure
          if (parsed && Array.isArray(parsed.keys)) {
            metadata = parsed;
          }
        } catch (parseError) {
          // If metadata is corrupted, reset it
          logger.warn('Notion', 'Corrupted cache metadata, resetting:', parseError);
        }
      }

      if (!metadata.keys.includes(cacheKey)) {
        metadata.keys.push(cacheKey);
      }
      localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));

      if (this.debugMode) {
        logger.info('Notion', `Saved ${items.length} items to persistent cache`);
      }
    } catch (error) {
      // localStorage might be full or unavailable
      logger.warn('Notion', 'Failed to save persistent cache:', error);
    }
  }

  /**
   * Clear persistent cache from localStorage
   */
  private clearPersistentCache(): void {
    try {
      const metadataStr = localStorage.getItem(CACHE_METADATA_KEY);
      if (metadataStr) {
        try {
          const metadata = JSON.parse(metadataStr);
          if (metadata && Array.isArray(metadata.keys)) {
            for (const key of metadata.keys) {
              localStorage.removeItem(CACHE_KEY_PREFIX + key);
            }
          }
        } catch (parseError) {
          // If we can't parse metadata, just try to remove common keys
          logger.warn('Notion', 'Failed to parse cache metadata during clear:', parseError);
        }
      }
      localStorage.removeItem(CACHE_METADATA_KEY);
    } catch (error) {
      logger.warn('Notion', 'Failed to clear persistent cache:', error);
    }
  }
}

export const notionCacheManager = new NotionCacheManager(NOTION.CACHE_TIMEOUT, import.meta.env.DEV);
