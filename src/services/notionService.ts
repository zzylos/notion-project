import type { WorkItem, ItemType, ItemStatus, Priority, Owner, NotionConfig, PropertyMappings, DatabaseConfig } from '../types';
import { NOTION, DEFAULT_CORS_PROXY, PROPERTY_ALIASES } from '../constants';

// Type for Notion API responses
type NotionPage = {
  id: string;
  url: string;
  properties: Record<string, NotionPropertyValue>;
  created_time: string;
  last_edited_time: string;
};

type NotionPropertyValue = {
  id: string;
  type: string;
  title?: Array<{ plain_text: string }>;
  rich_text?: Array<{ plain_text: string }>;
  select?: { name: string } | null;
  multi_select?: Array<{ name: string }>;
  number?: number | null;
  date?: { start: string; end?: string } | null;
  people?: Array<{ id: string; name?: string; avatar_url?: string; person?: { email?: string } }>;
  relation?: Array<{ id: string }>;
  formula?: { string?: string; number?: number; boolean?: boolean; date?: { start: string; end?: string } };
  rollup?: { number?: number; array?: NotionPropertyValue[]; type?: string };
  checkbox?: boolean;
  url?: string | null;
  status?: { name: string } | null;
  email?: string | null;
  phone_number?: string | null;
  created_time?: string;
  created_by?: { id: string; object: string };
  last_edited_time?: string;
  last_edited_by?: { id: string; object: string };
  files?: Array<{ name: string; type: string; file?: { url: string }; external?: { url: string } }>;
  unique_id?: { prefix?: string; number: number };
};

type NotionQueryResponse = {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
};

// Progress callback for streaming updates
export type FetchProgressCallback = (progress: {
  loaded: number;
  total: number | null;
  items: WorkItem[];
  done: boolean;
  currentDatabase?: string;
  failedDatabases?: Array<{ type: string; error: string }>;
}) => void;

// Options for fetch operations
export interface FetchOptions {
  signal?: AbortSignal;
  onProgress?: FetchProgressCallback;
}

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
 */
const CORS_PROXY = import.meta.env.VITE_CORS_PROXY || DEFAULT_CORS_PROXY;
const NOTION_API_BASE = NOTION.API_BASE;

// LocalStorage cache key prefix
const CACHE_KEY_PREFIX = 'notion-cache-';
const CACHE_METADATA_KEY = 'notion-cache-metadata';

// Persistent cache timeout (24 hours for localStorage, shorter for memory)
const PERSISTENT_CACHE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

interface CacheMetadata {
  keys: string[];
  lastCleanup: number;
}

class NotionService {
  private config: NotionConfig | null = null;
  private cache: Map<string, { items: WorkItem[]; timestamp: number }> = new Map();
  private cacheTimeout = NOTION.CACHE_TIMEOUT;
  // Track pending requests to prevent race conditions
  private pendingRequests: Map<string, Promise<WorkItem[]>> = new Map();

  // Debug flag - set to true in dev to log property mappings
  private debugMode = import.meta.env.DEV;
  private loggedDatabases = new Set<string>();

  constructor() {
    // Load persistent cache into memory on initialization
    this.loadPersistentCache();
  }

  initialize(config: NotionConfig) {
    this.config = config;
    this.loggedDatabases.clear();
  }

  /**
   * Load cached data from localStorage into memory cache
   */
  private loadPersistentCache(): void {
    try {
      const metadataStr = localStorage.getItem(CACHE_METADATA_KEY);
      if (!metadataStr) return;

      const metadata: CacheMetadata = JSON.parse(metadataStr);
      const now = Date.now();

      for (const key of metadata.keys) {
        const cachedStr = localStorage.getItem(CACHE_KEY_PREFIX + key);
        if (!cachedStr) continue;

        const cached = JSON.parse(cachedStr);
        // Check if persistent cache is still valid
        if (now - cached.timestamp < PERSISTENT_CACHE_TIMEOUT) {
          this.cache.set(key, cached);
          if (this.debugMode) {
            console.info(`%c[Notion] Loaded ${cached.items.length} items from persistent cache`, 'color: #10b981');
          }
        } else {
          // Clean up expired cache
          localStorage.removeItem(CACHE_KEY_PREFIX + key);
        }
      }
    } catch (error) {
      console.warn('[Notion] Failed to load persistent cache:', error);
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
      const metadata: CacheMetadata = metadataStr
        ? JSON.parse(metadataStr)
        : { keys: [], lastCleanup: Date.now() };

      if (!metadata.keys.includes(cacheKey)) {
        metadata.keys.push(cacheKey);
      }
      localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));

      if (this.debugMode) {
        console.info(`%c[Notion] Saved ${items.length} items to persistent cache`, 'color: #10b981');
      }
    } catch (error) {
      // localStorage might be full or unavailable
      console.warn('[Notion] Failed to save persistent cache:', error);
    }
  }

  /**
   * Clear persistent cache from localStorage
   */
  private clearPersistentCache(): void {
    try {
      const metadataStr = localStorage.getItem(CACHE_METADATA_KEY);
      if (metadataStr) {
        const metadata: CacheMetadata = JSON.parse(metadataStr);
        for (const key of metadata.keys) {
          localStorage.removeItem(CACHE_KEY_PREFIX + key);
        }
      }
      localStorage.removeItem(CACHE_METADATA_KEY);
    } catch (error) {
      console.warn('[Notion] Failed to clear persistent cache:', error);
    }
  }

  isInitialized(): boolean {
    return this.config !== null;
  }

  clearCache() {
    this.cache.clear();
    this.pendingRequests.clear();
    this.clearPersistentCache();
  }

  /**
   * Parse Notion API error response and return a user-friendly message.
   */
  private parseNotionError(status: number, errorText: string): string {
    // Try to parse JSON error response from Notion
    let errorCode = '';
    let errorMessage = '';
    try {
      const parsed = JSON.parse(errorText);
      errorCode = parsed.code || '';
      errorMessage = parsed.message || '';
    } catch {
      // Not JSON, use raw text
      errorMessage = errorText;
    }

    // Map common status codes to actionable messages
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

  private async notionFetch<T>(endpoint: string, options: RequestInit = {}, signal?: AbortSignal): Promise<T> {
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
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    } catch (error) {
      // Handle network errors (connection refused, DNS failure, CORS issues, etc.)
      if (error instanceof TypeError) {
        throw new Error('Network error: Unable to reach Notion API. Check your internet connection or CORS proxy.');
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(this.parseNotionError(response.status, errorText));
    }

    return response.json();
  }

  // Log property names once per database for debugging
  private logPropertyNames(databaseType: ItemType, props: Record<string, NotionPropertyValue>): void {
    if (!this.debugMode) return;

    const dbKey = databaseType;
    if (this.loggedDatabases.has(dbKey)) return;
    this.loggedDatabases.add(dbKey);

    const propertyInfo = Object.entries(props).map(([name, value]) => ({
      name,
      type: value.type,
      hasValue: this.hasPropertyValue(value),
    }));

    console.info(
      `%c[Notion Debug] ${databaseType.toUpperCase()} database properties:`,
      'color: #0ea5e9; font-weight: bold'
    );
    console.table(propertyInfo);
  }

  private hasPropertyValue(prop: NotionPropertyValue): boolean {
    switch (prop.type) {
      case 'select':
        return prop.select !== null;
      case 'status':
        return prop.status !== null;
      case 'relation':
        return (prop.relation?.length ?? 0) > 0;
      case 'people':
        return (prop.people?.length ?? 0) > 0;
      case 'number':
        return prop.number !== null;
      case 'date':
        return prop.date !== null;
      default:
        return true;
    }
  }

  // Get the effective mappings for a database (default + overrides)
  private getMappings(dbConfig?: DatabaseConfig): PropertyMappings {
    const defaults = this.config?.defaultMappings || {
      title: 'Name',
      status: 'Status',
      priority: 'Priority',
      owner: 'Owner',
      parent: 'Parent',
      progress: 'Progress',
      dueDate: 'Deadline',
      tags: 'Tags',
    };

    if (!dbConfig?.mappings) {
      return defaults;
    }

    return { ...defaults, ...dbConfig.mappings };
  }

  // Find property by name (case-insensitive)
  private findProperty(
    props: Record<string, NotionPropertyValue>,
    mappingName: string,
    fallbackType?: string
  ): NotionPropertyValue | null {
    // First try exact match
    if (props[mappingName]) {
      return props[mappingName];
    }

    // Try case-insensitive match
    const lowerMapping = mappingName.toLowerCase();
    for (const [key, value] of Object.entries(props)) {
      if (key.toLowerCase() === lowerMapping) {
        return value;
      }
    }

    // Try common aliases
    const aliases = this.getPropertyAliases(mappingName);
    for (const alias of aliases) {
      const lowerAlias = alias.toLowerCase();
      for (const [key, value] of Object.entries(props)) {
        if (key.toLowerCase() === lowerAlias) {
          return value;
        }
      }
    }

    // Try to find by type
    if (fallbackType) {
      for (const value of Object.values(props)) {
        if (value.type === fallbackType) {
          return value;
        }
      }
    }

    // Special case: for relation properties, find ANY relation
    if (fallbackType === 'relation' || mappingName.toLowerCase() === 'parent') {
      for (const value of Object.values(props)) {
        if (value.type === 'relation') {
          return value;
        }
      }
    }

    return null;
  }

  private getPropertyAliases(mappingName: string): string[] {
    // Use centralized property aliases from constants
    return PROPERTY_ALIASES[mappingName] || [];
  }

  private extractTitle(props: Record<string, NotionPropertyValue>, mappingName: string): string {
    const mapped = this.findProperty(props, mappingName);
    if (mapped) {
      if (mapped.type === 'title' && mapped.title) {
        return mapped.title.map(t => t.plain_text).join('');
      }
      if (mapped.type === 'rich_text' && mapped.rich_text) {
        return mapped.rich_text.map(t => t.plain_text).join('');
      }
    }

    // Fallback: find ANY title property
    for (const value of Object.values(props)) {
      if (value.type === 'title' && value.title && value.title.length > 0) {
        return value.title.map(t => t.plain_text).join('');
      }
    }

    return '';
  }

  private extractStatus(props: Record<string, NotionPropertyValue>, mappingName: string): string | null {
    const prop = this.findProperty(props, mappingName);
    if (!prop) return null;

    if (prop.type === 'select' && prop.select) {
      return prop.select.name;
    }
    if (prop.type === 'status' && prop.status) {
      return prop.status.name;
    }

    return null;
  }

  private extractSelect(props: Record<string, NotionPropertyValue>, mappingName: string): string | null {
    const prop = this.findProperty(props, mappingName);
    if (!prop) return null;

    if (prop.type === 'select' && prop.select) {
      return prop.select.name;
    }
    if (prop.type === 'status' && prop.status) {
      return prop.status.name;
    }

    return null;
  }

  private extractMultiSelect(props: Record<string, NotionPropertyValue>, mappingName: string): string[] {
    const prop = this.findProperty(props, mappingName);
    if (!prop || prop.type !== 'multi_select' || !prop.multi_select) return [];
    return prop.multi_select.map(s => s.name);
  }

  private extractNumber(props: Record<string, NotionPropertyValue>, mappingName: string): number | null {
    const prop = this.findProperty(props, mappingName);
    if (!prop || prop.type !== 'number') return null;
    return prop.number ?? null;
  }

  private extractDate(props: Record<string, NotionPropertyValue>, mappingName: string): string | null {
    const prop = this.findProperty(props, mappingName);
    if (!prop || prop.type !== 'date' || !prop.date) return null;
    return prop.date.start;
  }

  private extractPeople(props: Record<string, NotionPropertyValue>, mappingName: string): Owner[] {
    const prop = this.findProperty(props, mappingName);
    if (!prop || prop.type !== 'people' || !prop.people) return [];
    return prop.people.map(p => ({
      id: p.id,
      name: p.name || 'Unknown',
      email: p.person?.email || '',
      avatar: p.avatar_url,
    }));
  }

  private extractRelation(props: Record<string, NotionPropertyValue>, mappingName: string): string[] {
    const prop = this.findProperty(props, mappingName, 'relation');
    if (!prop || prop.type !== 'relation' || !prop.relation) return [];
    return prop.relation.map(r => r.id);
  }

  // Preserve original status from Notion
  private mapToItemStatus(notionStatus: string | null): ItemStatus {
    return notionStatus?.trim() || 'Not Started';
  }

  private mapToPriority(notionPriority: string | null): Priority | undefined {
    if (!notionPriority) return undefined;

    const normalized = notionPriority.toLowerCase().trim();

    const priorityMap: Record<string, Priority> = {
      'p0': 'P0', 'p1': 'P1', 'p2': 'P2', 'p3': 'P3', 'p4': 'P3',
      'critical': 'P0', 'highest': 'P0', 'urgent': 'P0', 'blocker': 'P0',
      'high': 'P1', 'important': 'P1',
      'medium': 'P2', 'normal': 'P2', 'moderate': 'P2',
      'low': 'P3', 'minor': 'P3', 'trivial': 'P3', 'lowest': 'P3',
    };

    if (priorityMap[normalized]) {
      return priorityMap[normalized];
    }

    // Partial matches
    if (normalized.includes('critical') || normalized.includes('urgent')) return 'P0';
    if (normalized.includes('high')) return 'P1';
    if (normalized.includes('medium') || normalized.includes('normal')) return 'P2';
    if (normalized.includes('low')) return 'P3';

    return undefined;
  }

  // Convert a Notion page to a WorkItem with a specified type
  private pageToWorkItem(page: NotionPage, itemType: ItemType, dbConfig?: DatabaseConfig): WorkItem {
    const mappings = this.getMappings(dbConfig);
    const props = page.properties;

    // Log property names once per database type
    this.logPropertyNames(itemType, props);

    const title = this.extractTitle(props, mappings.title);
    const status = this.extractStatus(props, mappings.status);
    const priority = this.extractSelect(props, mappings.priority);
    const progress = this.extractNumber(props, mappings.progress);
    const dueDate = this.extractDate(props, mappings.dueDate);
    const people = this.extractPeople(props, mappings.owner);
    const parentRelations = this.extractRelation(props, mappings.parent);
    const tags = this.extractMultiSelect(props, mappings.tags);

    return {
      id: page.id,
      title: title || 'Untitled',
      type: itemType, // Type comes from which database we're fetching
      status: this.mapToItemStatus(status),
      priority: this.mapToPriority(priority),
      progress: progress ?? undefined,
      owner: people[0],
      assignees: people,
      parentId: parentRelations.length > 0 ? parentRelations[0] : undefined,
      children: [],
      description: '',
      dueDate: dueDate ?? undefined,
      createdAt: page.created_time,
      updatedAt: page.last_edited_time,
      notionPageId: page.id,
      notionUrl: page.url,
      tags,
    };
  }

  // Fetch a single page of results from a database
  private async fetchPage(databaseId: string, cursor?: string, signal?: AbortSignal): Promise<NotionQueryResponse> {
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

  // Fetch all pages from a single database
  private async fetchAllFromDatabase(dbConfig: DatabaseConfig, signal?: AbortSignal): Promise<WorkItem[]> {
    const allPages: NotionPage[] = [];

    let currentCursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      // Check if aborted before each request
      if (signal?.aborted) {
        throw new DOMException('Fetch aborted', 'AbortError');
      }
      const response = await this.fetchPage(dbConfig.databaseId, currentCursor, signal);
      allPages.push(...response.results);
      hasMore = response.has_more;
      currentCursor = response.next_cursor ?? undefined;
    }

    return allPages
      .filter(page => 'properties' in page)
      .map(page => this.pageToWorkItem(page, dbConfig.type, dbConfig));
  }

  // Build parent-child relationships across all items
  private buildRelationships(items: WorkItem[]): void {
    const itemMap = new Map(items.map(item => [item.id, item]));
    const orphanedItems: Array<{ id: string; title: string; parentId: string }> = [];

    for (const item of items) {
      if (item.parentId) {
        const parent = itemMap.get(item.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(item.id);
        } else {
          // Track orphaned items (have parentId but parent not found)
          orphanedItems.push({ id: item.id, title: item.title, parentId: item.parentId });
        }
      }
    }

    // Log orphaned items in debug mode
    if (this.debugMode && orphanedItems.length > 0) {
      console.warn(
        `%c[Notion] ${orphanedItems.length} orphaned items (parent not found):`,
        'color: #f59e0b; font-weight: bold'
      );
      console.table(orphanedItems);
    }
  }

  // Get database configs, handling both new and legacy formats
  private getDatabaseConfigs(): DatabaseConfig[] {
    if (!this.config) return [];

    // New format: multiple databases
    if (this.config.databases && this.config.databases.length > 0) {
      return this.config.databases;
    }

    // Legacy format: single database
    if (this.config.databaseId) {
      return [{
        databaseId: this.config.databaseId,
        type: 'project', // Default type for legacy single-database
      }];
    }

    return [];
  }

  // Fetch all items from all configured databases
  async fetchAllItems(options?: FetchOptions): Promise<WorkItem[]> {
    if (!this.config) {
      throw new Error('NotionService not initialized. Call initialize() first.');
    }

    const { signal, onProgress } = options || {};

    const dbConfigs = this.getDatabaseConfigs();
    if (dbConfigs.length === 0) {
      throw new Error('No databases configured');
    }

    // Check cache
    const cacheKey = dbConfigs.map(db => db.databaseId).sort().join('|');
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      onProgress?.({ loaded: cached.items.length, total: cached.items.length, items: cached.items, done: true });
      return cached.items;
    }

    // Check for pending request to prevent race conditions
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      // Wait for the pending request and return its result
      const result = await pendingRequest;
      onProgress?.({ loaded: result.length, total: result.length, items: result, done: true });
      return result;
    }

    // Create and store the pending request promise
    const fetchPromise = this.doFetchAllItems(dbConfigs, signal, onProgress);
    this.pendingRequests.set(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      // Clean up pending request when done
      this.pendingRequests.delete(cacheKey);
    }
  }

  // Internal method that actually fetches all items
  private async doFetchAllItems(
    dbConfigs: DatabaseConfig[],
    signal?: AbortSignal,
    onProgress?: FetchProgressCallback
  ): Promise<WorkItem[]> {
    const cacheKey = dbConfigs.map(db => db.databaseId).sort().join('|');
    const allItems: WorkItem[] = [];
    const failedDatabases: Array<{ type: string; error: string }> = [];

    // Check if aborted before starting
    if (signal?.aborted) {
      throw new DOMException('Fetch aborted', 'AbortError');
    }

    if (this.debugMode) {
      console.info(`%c[Notion] Fetching ${dbConfigs.length} databases in parallel...`, 'color: #10b981');
    }

    // Fetch all databases in parallel for faster loading
    const fetchPromises = dbConfigs.map(async (dbConfig) => {
      if (this.debugMode) {
        console.info(`%c[Notion] Starting fetch for ${dbConfig.type} database...`, 'color: #10b981');
      }

      try {
        const items = await this.fetchAllFromDatabase(dbConfig, signal);
        return { success: true as const, items, type: dbConfig.type };
      } catch (error) {
        // Re-throw abort errors
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to fetch ${dbConfig.type} database:`, error);
        return { success: false as const, error: errorMessage, type: dbConfig.type };
      }
    });

    // Process results as they come in for progressive updates
    let completedCount = 0;
    for (const promise of fetchPromises) {
      const result = await promise;
      completedCount++;

      if (result.success) {
        allItems.push(...result.items);
        if (this.debugMode) {
          console.info(`%c[Notion] Fetched ${result.items.length} items from ${result.type}`, 'color: #10b981');
        }
      } else {
        failedDatabases.push({ type: result.type, error: result.error });
      }

      // Report progress after each database completes
      onProgress?.({
        loaded: allItems.length,
        total: null,
        items: [...allItems],
        done: completedCount === dbConfigs.length,
        currentDatabase: result.type,
        failedDatabases: failedDatabases.length > 0 ? [...failedDatabases] : undefined,
      });
    }

    // Build relationships across all items
    this.buildRelationships(allItems);

    // Cache the results (only if we got some items)
    if (allItems.length > 0) {
      const timestamp = Date.now();
      this.cache.set(cacheKey, { items: allItems, timestamp });
      // Also persist to localStorage for faster startup next time
      this.savePersistentCache(cacheKey, allItems, timestamp);
    }

    // Final progress callback with failed databases info
    onProgress?.({
      loaded: allItems.length,
      total: allItems.length,
      items: allItems,
      done: true,
      failedDatabases: failedDatabases.length > 0 ? failedDatabases : undefined,
    });

    return allItems;
  }

  async fetchItem(pageId: string): Promise<WorkItem> {
    if (!this.config) {
      throw new Error('NotionService not initialized');
    }

    const page = await this.notionFetch<NotionPage>(`/pages/${pageId}`);
    // Default to project type for single item fetch
    return this.pageToWorkItem(page, 'project');
  }

  async updateItemStatus(pageId: string, status: ItemStatus): Promise<void> {
    if (!this.config) {
      throw new Error('NotionService not initialized');
    }

    const mappings = this.getMappings();

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
    if (!this.config) {
      throw new Error('NotionService not initialized');
    }

    const mappings = this.getMappings();

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
}

export const notionService = new NotionService();
export default notionService;
