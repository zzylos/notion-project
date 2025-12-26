/**
 * NotionService - Orchestrates Notion API operations.
 *
 * This service coordinates between:
 * - NotionPropertyMapper: Property extraction
 * - NotionDataTransformer: Page to WorkItem conversion
 * - NotionCacheManager: Caching strategy
 *
 * Handles:
 * - API communication with Notion
 * - Multi-database fetching
 * - Progress reporting
 */

import type { WorkItem, ItemType, NotionConfig, DatabaseConfig } from '../types';
import type {
  NotionPage,
  NotionQueryResponse,
  FetchOptions,
  FetchProgressCallback,
} from '../types/notion';
import { NOTION, DEFAULT_CORS_PROXY } from '../constants';
import { apiClient } from './apiClient';
import { logger } from '../utils/logger';
import { NotionPropertyMapper, NotionDataTransformer, NotionCacheManager } from './notion';

// Re-export types for backward compatibility
export type { FetchProgressCallback, FetchOptions } from '../types/notion';

/**
 * SECURITY WARNING:
 * This service makes browser-based API calls through a CORS proxy.
 * The API key is stored in localStorage and transmitted through the proxy.
 *
 * For production deployments, you should:
 * 1. Implement a server-side proxy to keep API keys secure
 * 2. Never expose Notion API keys in client-side code
 * 3. Use environment variables for sensitive configuration
 *
 * Configure CORS proxy via VITE_CORS_PROXY environment variable.
 * Or use VITE_USE_BACKEND_API=true to use the backend API server.
 */
const CORS_PROXY = import.meta.env.VITE_CORS_PROXY || DEFAULT_CORS_PROXY;
const NOTION_API_BASE = NOTION.API_BASE;

/**
 * Check if the backend API should be used instead of direct Notion calls.
 * This is more secure as the API key stays on the server.
 */
const USE_BACKEND_API = import.meta.env.VITE_USE_BACKEND_API === 'true';

class NotionService {
  private config: NotionConfig | null = null;
  private propertyMapper: NotionPropertyMapper;
  private dataTransformer: NotionDataTransformer;
  private cacheManager: NotionCacheManager;
  private debugMode = import.meta.env.DEV;

  // Track pending requests to prevent race conditions
  private pendingRequests: Map<string, Promise<WorkItem[]>> = new Map();

  // Callback for page-level progress during database fetching
  private onPageProgress?: (itemsLoaded: number, databaseType: string) => void;

  constructor() {
    this.propertyMapper = new NotionPropertyMapper(this.debugMode);
    this.dataTransformer = new NotionDataTransformer(this.propertyMapper, this.debugMode);
    this.cacheManager = new NotionCacheManager(NOTION.CACHE_TIMEOUT, this.debugMode);
  }

  initialize(config: NotionConfig) {
    // Validate API key
    if (!config.apiKey || typeof config.apiKey !== 'string') {
      throw new Error('Invalid config: apiKey is required and must be a string');
    }

    // Validate that we have at least one database configured
    const hasNewFormat = config.databases && config.databases.length > 0;
    const hasLegacyFormat = Boolean(config.databaseId);

    if (!hasNewFormat && !hasLegacyFormat) {
      throw new Error('Invalid config: at least one database must be configured');
    }

    // Validate database configs have required fields
    if (hasNewFormat) {
      for (const db of config.databases) {
        if (!db.databaseId || typeof db.databaseId !== 'string') {
          throw new Error('Invalid config: each database must have a valid databaseId');
        }
        if (!db.type) {
          throw new Error(`Invalid config: database ${db.databaseId} is missing a type`);
        }
      }
    }

    this.config = config;
    this.propertyMapper.clearLoggedDatabases();
  }

  isInitialized(): boolean {
    return this.config !== null;
  }

  clearCache() {
    this.cacheManager.clear();
    this.pendingRequests.clear();
  }

  /**
   * Parse Notion API error response and return a user-friendly message.
   */
  private parseNotionError(status: number, errorText: string): string {
    let errorCode = '';
    let errorMessage = '';
    try {
      const parsed = JSON.parse(errorText);
      errorCode = parsed.code || '';
      errorMessage = parsed.message || '';
    } catch {
      errorMessage = errorText;
    }

    switch (status) {
      case 401:
        return 'Invalid API key. Please check your Notion integration token.';
      case 403:
        return 'Access denied. Make sure you have shared the database with your integration.';
      case 404:
        return 'Database not found. Please verify the database ID and ensure it is shared with your integration.';
      case 429:
        return 'Rate limited by Notion API. Please wait a moment and try again.';
      case 400:
        if (errorCode === 'validation_error') {
          return `Invalid request: ${errorMessage}`;
        }
        return `Bad request: ${errorMessage || 'Please check your configuration.'}`;
      case 500:
      case 502:
      case 503:
        return 'Notion API is temporarily unavailable. Please try again later.';
      default:
        return `Notion API error (${status}): ${errorMessage || 'Unknown error'}`;
    }
  }

  private async notionFetch<T>(
    endpoint: string,
    options: RequestInit = {},
    signal?: AbortSignal
  ): Promise<T> {
    if (!this.config) {
      throw new Error('NotionService not initialized');
    }

    const url = `${CORS_PROXY}${encodeURIComponent(NOTION_API_BASE + endpoint)}`;

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(
          'Network error: Unable to reach Notion API. Check your internet connection or CORS proxy.'
        );
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(this.parseNotionError(response.status, errorText));
    }

    try {
      return await response.json();
    } catch (parseError) {
      throw new Error(
        'Failed to parse Notion API response: Invalid JSON. The API may be experiencing issues.'
      );
    }
  }

  private async fetchPage(
    databaseId: string,
    cursor?: string,
    signal?: AbortSignal
  ): Promise<NotionQueryResponse> {
    if (!this.config) {
      throw new Error('NotionService not initialized');
    }

    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) {
      body.start_cursor = cursor;
    }

    return this.notionFetch<NotionQueryResponse>(
      `/databases/${databaseId}/query`,
      { method: 'POST', body: JSON.stringify(body) },
      signal
    );
  }

  private async fetchAllFromDatabase(
    dbConfig: DatabaseConfig,
    signal?: AbortSignal
  ): Promise<WorkItem[]> {
    const allPages: NotionPage[] = [];

    let currentCursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      if (signal?.aborted) {
        throw new DOMException('Fetch aborted', 'AbortError');
      }
      const response = await this.fetchPage(dbConfig.databaseId, currentCursor, signal);
      allPages.push(...response.results);
      hasMore = response.has_more;
      currentCursor = response.next_cursor ?? undefined;

      if (this.onPageProgress) {
        this.onPageProgress(allPages.length, dbConfig.type);
      }
    }

    return this.dataTransformer.transformPages(
      allPages,
      dbConfig.type,
      this.config?.defaultMappings,
      dbConfig
    );
  }

  private getDatabaseConfigs(): DatabaseConfig[] {
    if (!this.config) return [];

    if (this.config.databases && this.config.databases.length > 0) {
      return this.config.databases;
    }

    if (this.config.databaseId) {
      return [
        {
          databaseId: this.config.databaseId,
          type: 'project' as ItemType,
        },
      ];
    }

    return [];
  }

  async fetchAllItems(options?: FetchOptions): Promise<WorkItem[]> {
    if (USE_BACKEND_API) {
      return this.fetchAllItemsFromBackend(options);
    }

    if (!this.config) {
      throw new Error('NotionService not initialized. Call initialize() first.');
    }

    const { signal, onProgress } = options || {};

    const dbConfigs = this.getDatabaseConfigs();
    if (dbConfigs.length === 0) {
      throw new Error('No databases configured');
    }

    const cacheKey = dbConfigs
      .map(db => db.databaseId)
      .sort()
      .join('|');

    const cached = this.cacheManager.get(cacheKey);
    if (cached) {
      onProgress?.({
        loaded: cached.items.length,
        total: cached.items.length,
        items: cached.items,
        done: true,
      });
      return cached.items;
    }

    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      const result = await pendingRequest;
      onProgress?.({ loaded: result.length, total: result.length, items: result, done: true });
      return result;
    }

    const fetchPromise = this.doFetchAllItems(dbConfigs, signal, onProgress);
    this.pendingRequests.set(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async fetchAllItemsFromBackend(options?: FetchOptions): Promise<WorkItem[]> {
    const { signal, onProgress } = options || {};

    const cacheKey = 'backend-api';
    const cached = this.cacheManager.get(cacheKey);
    if (cached) {
      onProgress?.({
        loaded: cached.items.length,
        total: cached.items.length,
        items: cached.items,
        done: true,
      });
      return cached.items;
    }

    // Report that loading has started (for progress bar feedback)
    onProgress?.({
      loaded: 0,
      total: null,
      items: [],
      done: false,
      currentDatabase: 'backend',
    });

    try {
      if (this.debugMode) {
        logger.info('Notion', 'Fetching from backend API...');
      }

      const result = await apiClient.fetchItems(signal);

      if (this.debugMode) {
        logger.info(
          'Notion',
          `Backend returned ${result.items.length} items (cached: ${result.cached})`
        );
      }

      this.cacheManager.set(cacheKey, result.items);

      onProgress?.({
        loaded: result.items.length,
        total: result.items.length,
        items: result.items,
        done: true,
        failedDatabases: result.failedDatabases,
        orphanedItemsCount: result.orphanedItemsCount,
      });

      return result.items;
    } catch (error) {
      // Don't log or handle AbortError - it's expected during component unmount
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      const persistentCached = this.cacheManager.getStale(cacheKey);
      if (persistentCached) {
        logger.warn('Notion', 'Backend fetch failed, using cached data:', error);
        onProgress?.({
          loaded: persistentCached.items.length,
          total: persistentCached.items.length,
          items: persistentCached.items,
          done: true,
        });
        return persistentCached.items;
      }
      throw error;
    }
  }

  private async doFetchAllItems(
    dbConfigs: DatabaseConfig[],
    signal?: AbortSignal,
    onProgress?: FetchProgressCallback
  ): Promise<WorkItem[]> {
    const cacheKey = dbConfigs
      .map(db => db.databaseId)
      .sort()
      .join('|');
    const allItems: WorkItem[] = [];
    const failedDatabases: Array<{ type: string; error: string }> = [];

    const itemsPerDatabase = new Map<string, number>();
    let lastProgressUpdate = 0;
    const PROGRESS_THROTTLE_MS = 100;

    this.onPageProgress = (itemsLoaded: number, databaseType: string) => {
      if (signal?.aborted) return;

      itemsPerDatabase.set(databaseType, itemsLoaded);

      let totalLoaded = 0;
      for (const count of itemsPerDatabase.values()) {
        totalLoaded += count;
      }

      const now = Date.now();
      if (now - lastProgressUpdate >= PROGRESS_THROTTLE_MS) {
        lastProgressUpdate = now;
        onProgress?.({
          loaded: totalLoaded,
          total: null,
          items: [],
          done: false,
          currentDatabase: databaseType,
        });
      }
    };

    if (signal?.aborted) {
      this.onPageProgress = undefined;
      throw new DOMException('Fetch aborted', 'AbortError');
    }

    if (this.debugMode) {
      logger.info('Notion', `Fetching ${dbConfigs.length} databases in parallel...`);
    }

    const fetchPromises = dbConfigs.map(async dbConfig => {
      if (this.debugMode) {
        logger.info('Notion', `Starting fetch for ${dbConfig.type} database...`);
      }

      try {
        const items = await this.fetchAllFromDatabase(dbConfig, signal);
        return { success: true as const, items, type: dbConfig.type };
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Notion', `Failed to fetch ${dbConfig.type} database:`, error);
        return { success: false as const, error: errorMessage, type: dbConfig.type };
      }
    });

    let completedCount = 0;
    for (const promise of fetchPromises) {
      const result = await promise;
      completedCount++;

      if (result.success) {
        allItems.push(...result.items);
        if (this.debugMode) {
          logger.info('Notion', `Fetched ${result.items.length} items from ${result.type}`);
        }
      } else {
        failedDatabases.push({ type: result.type, error: result.error });
      }

      onProgress?.({
        loaded: allItems.length,
        total: null,
        items: [...allItems],
        done: completedCount === dbConfigs.length,
        currentDatabase: result.type,
        failedDatabases: failedDatabases.length > 0 ? [...failedDatabases] : undefined,
      });
    }

    this.onPageProgress = undefined;

    const orphanedCount = this.dataTransformer.buildRelationships(allItems);

    if (allItems.length > 0) {
      this.cacheManager.set(cacheKey, allItems);
    }

    onProgress?.({
      loaded: allItems.length,
      total: allItems.length,
      items: allItems,
      done: true,
      failedDatabases: failedDatabases.length > 0 ? failedDatabases : undefined,
      orphanedItemsCount: orphanedCount > 0 ? orphanedCount : undefined,
    });

    return allItems;
  }

  async fetchItem(pageId: string): Promise<WorkItem> {
    if (USE_BACKEND_API) {
      return apiClient.fetchItem(pageId);
    }

    if (!this.config) {
      throw new Error('NotionService not initialized');
    }

    const page = await this.notionFetch<NotionPage>(`/pages/${pageId}`);
    return this.dataTransformer.pageToWorkItem(page, 'project', this.config.defaultMappings);
  }

  async updateItemStatus(pageId: string, status: string): Promise<void> {
    if (USE_BACKEND_API) {
      await apiClient.updateItemStatus(pageId, status);
      this.clearCache();
      return;
    }

    if (!this.config) {
      throw new Error('NotionService not initialized');
    }

    const mappings = this.propertyMapper.getMappings(this.config.defaultMappings);

    await this.notionFetch(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        properties: {
          [mappings.status]: {
            select: { name: status },
          },
        },
      }),
    });

    this.clearCache();
  }

  async updateItemProgress(pageId: string, progress: number): Promise<void> {
    if (USE_BACKEND_API) {
      await apiClient.updateItemProgress(pageId, progress);
      this.clearCache();
      return;
    }

    if (!this.config) {
      throw new Error('NotionService not initialized');
    }

    const mappings = this.propertyMapper.getMappings(this.config.defaultMappings);

    await this.notionFetch(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        properties: {
          [mappings.progress]: {
            number: Math.min(100, Math.max(0, progress)),
          },
        },
      }),
    });

    this.clearCache();
  }

  async invalidateServerCache(): Promise<void> {
    if (USE_BACKEND_API) {
      await apiClient.invalidateCache();
    }
    this.clearCache();
  }

  isUsingBackendApi(): boolean {
    return USE_BACKEND_API;
  }
}

export const notionService = new NotionService();
export default notionService;
