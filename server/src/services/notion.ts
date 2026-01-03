import type {
  WorkItem,
  ItemType,
  ItemStatus,
  NotionConfig,
  DatabaseConfig,
  NotionPage,
  NotionPropertyValue,
  NotionQueryResponse,
} from '../types/index.js';
import {
  PROPERTY_ALIASES,
  NOTION_API,
  NETWORK,
  parseNotionError,
  PropertyMapper,
  normalizeUuid,
  buildRelationships as sharedBuildRelationships,
} from '../../../shared/index.js';
import { logger } from '../utils/logger.js';

const NOTION_API_BASE = NOTION_API.BASE_URL;
const FETCH_TIMEOUT_MS = NETWORK.FETCH_TIMEOUT_MS;

/**
 * Server-side Notion API service.
 * Makes direct API calls without CORS proxy.
 * Uses shared PropertyMapper for property extraction.
 */
class NotionService {
  private config: NotionConfig;
  private debugMode: boolean;
  private propertyMapper: PropertyMapper;
  // Track property types for each database (needed for correct update format)
  private propertyTypes: Map<string, Map<string, string>> = new Map();

  constructor(config: NotionConfig) {
    this.config = config;
    this.debugMode = process.env.NODE_ENV !== 'production';

    // Create server-side logger adapter for property mapper
    const loggerAdapter = {
      info: (message: string, data?: unknown) => logger.notion.info(message, data),
      debug: (message: string, data?: unknown) => logger.notion.debug(message, data),
    };

    this.propertyMapper = new PropertyMapper(PROPERTY_ALIASES, loggerAdapter, this.debugMode);
  }

  /**
   * Make a request to the Notion API with timeout
   */
  private async notionFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${NOTION_API_BASE}${endpoint}`;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(parseNotionError(response.status, errorText));
      }

      try {
        return (await response.json()) as T;
      } catch {
        throw new Error(
          'Failed to parse Notion API response: Invalid JSON. The API may be experiencing issues.'
        );
      }
    } catch (error) {
      // Handle timeout specifically
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `Notion API request timed out after ${FETCH_TIMEOUT_MS / 1000}s: ${endpoint}`
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Track property types for a database (needed for correct update format).
   * This is server-specific functionality not in the shared PropertyMapper.
   */
  private trackPropertyTypes(
    databaseType: ItemType,
    props: Record<string, NotionPropertyValue>
  ): void {
    const dbKey = databaseType;

    // Always track property types for correct update format
    if (!this.propertyTypes.has(dbKey)) {
      const typeMap = new Map<string, string>();
      for (const [name, value] of Object.entries(props)) {
        typeMap.set(name.toLowerCase(), value.type);
      }
      this.propertyTypes.set(dbKey, typeMap);
    }
  }

  /**
   * Get the detected property type for a given property name.
   * @param propertyName The property name to look up
   * @param dbType Database type to look up (required for accurate type detection)
   *
   * IMPORTANT: Property types can differ between databases (e.g., "Status" might be
   * a 'status' property in one database and 'select' in another). Always provide
   * the dbType parameter when possible to avoid incorrect property type detection.
   */
  private getPropertyType(propertyName: string, dbType?: ItemType): 'status' | 'select' | null {
    const lowerName = propertyName.toLowerCase();

    // If database type is specified, only check that database
    if (dbType) {
      const typeMap = this.propertyTypes.get(dbType);
      if (typeMap) {
        const type = typeMap.get(lowerName);
        if (type === 'status' || type === 'select') {
          return type;
        }
      }
      // Database type specified but property not found - don't fall back to other databases
      // as this could return incorrect property type
      return null;
    }

    // No database type specified - search all databases but warn about ambiguity
    // This fallback exists for backwards compatibility but should be avoided
    for (const typeMap of this.propertyTypes.values()) {
      const type = typeMap.get(lowerName);
      if (type === 'status' || type === 'select') {
        logger.notion.warn(
          `Property type lookup without database type for "${propertyName}" - ` +
            `found "${type}" but this may be incorrect if databases have different types`
        );
        return type;
      }
    }
    return null;
  }

  /**
   * Convert Notion page to WorkItem using the shared PropertyMapper
   */
  private pageToWorkItem(
    page: NotionPage,
    itemType: ItemType,
    dbConfig?: DatabaseConfig
  ): WorkItem {
    // Validate page structure
    if (!page || typeof page !== 'object') {
      throw new Error('Invalid Notion page: page object is null or undefined');
    }

    if (!page.properties || typeof page.properties !== 'object') {
      throw new Error(`Invalid Notion page: missing properties for page ${page.id || 'unknown'}`);
    }

    if (!page.id) {
      throw new Error('Invalid Notion page: missing page ID');
    }

    const mappings = this.propertyMapper.getMappings(this.config.defaultMappings, dbConfig);
    const props = page.properties;

    // Track property types for update operations (server-specific)
    this.trackPropertyTypes(itemType, props);

    // Log property names in debug mode
    this.propertyMapper.logPropertyNames(itemType, props);

    // Use shared PropertyMapper for all property extraction
    const title = this.propertyMapper.extractTitle(props, mappings.title);
    const status = this.propertyMapper.extractStatus(props, mappings.status);
    const priority = this.propertyMapper.extractSelect(props, mappings.priority);
    const progress = this.propertyMapper.extractNumber(props, mappings.progress);
    const dueDate = this.propertyMapper.extractDate(props, mappings.dueDate);
    const people = this.propertyMapper.extractPeople(props, mappings.owner);
    const parentRelations = this.propertyMapper.extractRelation(props, mappings.parent);
    const tags = this.propertyMapper.extractMultiSelect(props, mappings.tags);

    // Normalize the page ID to ensure consistent format for parent-child matching
    const normalizedId = normalizeUuid(page.id);

    return {
      id: normalizedId,
      title: title || 'Untitled',
      type: itemType,
      status: this.propertyMapper.mapToItemStatus(status),
      priority: this.propertyMapper.mapToPriority(priority),
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

  /**
   * Validate that a response looks like a valid Notion query response
   */
  private validateQueryResponse(response: unknown): response is NotionQueryResponse {
    if (!response || typeof response !== 'object') {
      return false;
    }

    const resp = response as Record<string, unknown>;

    // Check required fields
    if (!Array.isArray(resp.results)) {
      logger.notion.warn('Invalid Notion response: results is not an array');
      return false;
    }

    if (typeof resp.has_more !== 'boolean') {
      logger.notion.warn('Invalid Notion response: has_more is not a boolean');
      return false;
    }

    return true;
  }

  /**
   * Fetch a single page of results with optional filter.
   */
  private async fetchPage(
    databaseId: string,
    cursor?: string,
    filter?: Record<string, unknown>
  ): Promise<NotionQueryResponse> {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) {
      body.start_cursor = cursor;
    }
    if (filter) {
      body.filter = filter;
    }

    const response = await this.notionFetch<unknown>(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Validate response structure
    if (!this.validateQueryResponse(response)) {
      throw new Error('Invalid response structure from Notion API');
    }

    return response;
  }

  /**
   * Fetch all pages from a database
   */
  private async fetchAllFromDatabase(dbConfig: DatabaseConfig): Promise<WorkItem[]> {
    const allPages: NotionPage[] = [];
    let currentCursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await this.fetchPage(dbConfig.databaseId, currentCursor);
      allPages.push(...response.results);
      hasMore = response.has_more;
      currentCursor = response.next_cursor ?? undefined;
    }

    return allPages
      .filter(page => 'properties' in page)
      .map(page => this.pageToWorkItem(page, dbConfig.type, dbConfig));
  }

  /**
   * Build parent-child relationships
   */
  private buildRelationships(items: WorkItem[]): number {
    const debugMode = this.debugMode;

    return sharedBuildRelationships(items, {
      onOrphanedItems: orphanedItems => {
        if (debugMode) {
          logger.notion.warn(`${orphanedItems.length} orphaned items (parent not found).`);
        }
      },
    });
  }

  /**
   * Fetch all items from all configured databases
   */
  async fetchAllItems(): Promise<{
    items: WorkItem[];
    failedDatabases: Array<{ type: string; error: string }>;
    orphanedItemsCount: number;
  }> {
    const allItems: WorkItem[] = [];
    const failedDatabases: Array<{ type: string; error: string }> = [];

    logger.notion.info(`Fetching ${this.config.databases.length} databases...`);

    // Fetch all databases in parallel
    const fetchPromises = this.config.databases.map(async dbConfig => {
      try {
        const items = await this.fetchAllFromDatabase(dbConfig);
        logger.notion.info(`Fetched ${items.length} items from ${dbConfig.type}`);
        return { success: true as const, items, type: dbConfig.type };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.notion.error(`Failed to fetch ${dbConfig.type}:`, errorMessage);
        return { success: false as const, error: errorMessage, type: dbConfig.type };
      }
    });

    const results = await Promise.all(fetchPromises);

    for (const result of results) {
      if (result.success) {
        allItems.push(...result.items);
      } else {
        failedDatabases.push({ type: result.type, error: result.error });
      }
    }

    // Build relationships
    const orphanedCount = this.buildRelationships(allItems);

    logger.notion.info(`Total items: ${allItems.length}, Orphaned: ${orphanedCount}`);

    return {
      items: allItems,
      failedDatabases,
      orphanedItemsCount: orphanedCount,
    };
  }

  /**
   * Fetch items from a database that were modified since a given timestamp.
   */
  private async fetchFromDatabaseSince(dbConfig: DatabaseConfig, since: Date): Promise<WorkItem[]> {
    const allPages: NotionPage[] = [];
    let currentCursor: string | undefined;
    let hasMore = true;

    // Create filter for items edited after the given timestamp
    const filter = {
      timestamp: 'last_edited_time',
      last_edited_time: {
        on_or_after: since.toISOString(),
      },
    };

    while (hasMore) {
      const response = await this.fetchPage(dbConfig.databaseId, currentCursor, filter);
      allPages.push(...response.results);
      hasMore = response.has_more;
      currentCursor = response.next_cursor ?? undefined;
    }

    return allPages
      .filter(page => 'properties' in page)
      .map(page => this.pageToWorkItem(page, dbConfig.type, dbConfig));
  }

  /**
   * Fetch items modified since a given timestamp from all configured databases.
   * Used for incremental sync to get only changed items.
   *
   * @param since - Fetch items modified on or after this timestamp
   * @returns Items modified since the given time (without relationship building)
   */
  async fetchItemsSince(since: Date): Promise<{
    items: WorkItem[];
    failedDatabases: Array<{ type: string; error: string }>;
  }> {
    const allItems: WorkItem[] = [];
    const failedDatabases: Array<{ type: string; error: string }> = [];

    logger.notion.info(
      `Fetching items modified since ${since.toISOString()} from ${this.config.databases.length} databases...`
    );

    // Fetch all databases in parallel with the time filter
    const fetchPromises = this.config.databases.map(async dbConfig => {
      try {
        const items = await this.fetchFromDatabaseSince(dbConfig, since);
        if (items.length > 0) {
          logger.notion.info(`Fetched ${items.length} modified items from ${dbConfig.type}`);
        }
        return { success: true as const, items, type: dbConfig.type };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.notion.error(`Failed to fetch ${dbConfig.type}:`, errorMessage);
        return { success: false as const, error: errorMessage, type: dbConfig.type };
      }
    });

    const results = await Promise.all(fetchPromises);

    for (const result of results) {
      if (result.success) {
        allItems.push(...result.items);
      } else {
        failedDatabases.push({ type: result.type, error: result.error });
      }
    }

    logger.notion.info(`Total items modified since ${since.toISOString()}: ${allItems.length}`);

    return {
      items: allItems,
      failedDatabases,
    };
  }

  /**
   * Determine item type from a page's parent database ID.
   * @param parentDatabaseId The database ID from the page's parent field
   * @returns The item type if the database is configured, undefined otherwise
   */
  getItemTypeByDatabaseId(parentDatabaseId: string): ItemType | undefined {
    // Normalize the database ID for comparison
    const normalizedId = normalizeUuid(parentDatabaseId);

    for (const dbConfig of this.config.databases) {
      const configId = normalizeUuid(dbConfig.databaseId);
      if (configId === normalizedId) {
        return dbConfig.type;
      }
    }
    return undefined;
  }

  /**
   * Fetch a single item by ID.
   * If type is not provided, attempts to determine it from the page's parent database.
   * @param pageId The Notion page ID
   * @param type Optional item type. If not provided, will be inferred from parent database.
   */
  async fetchItem(pageId: string, type?: ItemType): Promise<WorkItem> {
    const page = await this.notionFetch<NotionPage>(`/pages/${pageId}`);

    // Determine item type: use provided type, or infer from parent database
    let itemType: ItemType = type || 'project';

    if (!type && page.parent) {
      // Check if parent is a database and try to match it to our config
      if (page.parent.type === 'database_id' && page.parent.database_id) {
        const inferredType = this.getItemTypeByDatabaseId(page.parent.database_id);
        if (inferredType) {
          itemType = inferredType;
          logger.notion.debug(
            `Inferred item type "${itemType}" from parent database for page ${pageId}`
          );
        } else {
          logger.notion.warn(
            `Could not determine item type for page ${pageId} - ` +
              `parent database ${page.parent.database_id} not in config. Using default 'project'.`
          );
        }
      }
    }

    return this.pageToWorkItem(page, itemType);
  }

  /**
   * Update item status
   * Automatically uses correct Notion API format (select vs status property type)
   * @param pageId The Notion page ID
   * @param status The new status value
   * @param itemType Optional item type to look up correct property type
   */
  async updateItemStatus(pageId: string, status: ItemStatus, itemType?: ItemType): Promise<void> {
    const mappings = this.propertyMapper.getMappings(this.config.defaultMappings);
    const statusPropertyName = mappings.status;

    // Detect the property type (status vs select) - prefer specific database type
    const propertyType = this.getPropertyType(statusPropertyName, itemType);

    // Build the correct update format based on property type
    let propertyValue: Record<string, unknown>;
    if (propertyType === 'status') {
      propertyValue = { status: { name: status } };
    } else {
      // Default to select format (works for most cases)
      propertyValue = { select: { name: status } };
    }

    await this.notionFetch(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        properties: {
          [statusPropertyName]: propertyValue,
        },
      }),
    });
  }

  /**
   * Update item progress
   */
  async updateItemProgress(pageId: string, progress: number): Promise<void> {
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
  }
}

// Singleton instance
let notionInstance: NotionService | null = null;

export function initializeNotion(config: NotionConfig): NotionService {
  notionInstance = new NotionService(config);
  return notionInstance;
}

export function getNotion(): NotionService {
  if (!notionInstance) {
    throw new Error('Notion service not initialized');
  }
  return notionInstance;
}

export { NotionService };
