import type {
  WorkItem,
  ItemType,
  ItemStatus,
  Priority,
  Owner,
  NotionConfig,
  PropertyMappings,
  DatabaseConfig,
  NotionPage,
  NotionPropertyValue,
  NotionQueryResponse,
} from '../types/index.js';
import { PROPERTY_ALIASES, NOTION_API } from '../../../shared/index.js';
import { logger } from '../utils/logger.js';
import { normalizeUuid } from '../utils/uuid.js';

const NOTION_API_BASE = NOTION_API.BASE_URL;

/**
 * Server-side Notion API service.
 * Makes direct API calls without CORS proxy.
 */
class NotionService {
  private config: NotionConfig;
  private debugMode: boolean;
  private loggedDatabases = new Set<string>();
  // Track property types for each database (needed for correct update format)
  private propertyTypes: Map<string, Map<string, string>> = new Map();

  constructor(config: NotionConfig) {
    this.config = config;
    this.debugMode = process.env.NODE_ENV !== 'production';
  }

  /**
   * Get database IDs for cache key generation
   */
  getDatabaseIds(): string[] {
    return this.config.databases.map(db => db.databaseId);
  }

  /**
   * Make a request to the Notion API
   */
  private async notionFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${NOTION_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(this.parseNotionError(response.status, errorText));
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new Error(
        'Failed to parse Notion API response: Invalid JSON. The API may be experiencing issues.'
      );
    }
  }

  /**
   * Parse Notion API error response
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

  /**
   * Get effective mappings for a database
   */
  private getMappings(dbConfig?: DatabaseConfig): PropertyMappings {
    const defaults = this.config.defaultMappings;
    if (!dbConfig?.mappings) {
      return defaults;
    }
    return { ...defaults, ...dbConfig.mappings };
  }

  /**
   * Find property by name with fuzzy matching
   */
  private findProperty(
    props: Record<string, NotionPropertyValue>,
    mappingName: string,
    fallbackType?: string
  ): NotionPropertyValue | null {
    // Exact match
    if (props[mappingName]) {
      return props[mappingName];
    }

    // Case-insensitive match
    const lowerMapping = mappingName.toLowerCase();
    for (const [key, value] of Object.entries(props)) {
      if (key.toLowerCase() === lowerMapping) {
        return value;
      }
    }

    // Try aliases
    const aliases = PROPERTY_ALIASES[mappingName] || [];
    for (const alias of aliases) {
      const lowerAlias = alias.toLowerCase();
      for (const [key, value] of Object.entries(props)) {
        if (key.toLowerCase() === lowerAlias) {
          return value;
        }
      }
    }

    // Fallback by type
    if (fallbackType) {
      for (const value of Object.values(props)) {
        if (value.type === fallbackType) {
          return value;
        }
      }
    }

    // Special case: find ANY relation for parent
    if (fallbackType === 'relation' || mappingName.toLowerCase() === 'parent') {
      for (const value of Object.values(props)) {
        if (value.type === 'relation') {
          return value;
        }
      }
    }

    return null;
  }

  /**
   * Log property names for debugging and track property types
   */
  private logPropertyNames(
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

    if (!this.debugMode) return;
    if (this.loggedDatabases.has(dbKey)) return;
    this.loggedDatabases.add(dbKey);

    const propertyInfo = Object.entries(props).map(([name, value]) => ({
      name,
      type: value.type,
    }));

    logger.notion.info(`${databaseType.toUpperCase()} database properties:`, propertyInfo);
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

  // Property extraction methods
  private extractTitle(props: Record<string, NotionPropertyValue>, mappingName: string): string {
    const mapped = this.findProperty(props, mappingName);
    if (mapped) {
      if (mapped.type === 'title' && mapped.title) {
        return mapped.title
          .filter(t => t && typeof t.plain_text === 'string')
          .map(t => t.plain_text)
          .join('');
      }
      if (mapped.type === 'rich_text' && mapped.rich_text) {
        return mapped.rich_text
          .filter(t => t && typeof t.plain_text === 'string')
          .map(t => t.plain_text)
          .join('');
      }
    }

    // Fallback: find ANY title property
    for (const value of Object.values(props)) {
      if (value.type === 'title' && value.title && value.title.length > 0) {
        return value.title
          .filter(t => t && typeof t.plain_text === 'string')
          .map(t => t.plain_text)
          .join('');
      }
    }

    return '';
  }

  private extractStatus(
    props: Record<string, NotionPropertyValue>,
    mappingName: string
  ): string | null {
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

  private extractSelect(
    props: Record<string, NotionPropertyValue>,
    mappingName: string
  ): string | null {
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

  private extractMultiSelect(
    props: Record<string, NotionPropertyValue>,
    mappingName: string
  ): string[] {
    const prop = this.findProperty(props, mappingName);
    if (!prop || prop.type !== 'multi_select' || !prop.multi_select) return [];
    return prop.multi_select.map(s => s.name);
  }

  private extractNumber(
    props: Record<string, NotionPropertyValue>,
    mappingName: string
  ): number | null {
    const prop = this.findProperty(props, mappingName);
    if (!prop || prop.type !== 'number') return null;
    return prop.number ?? null;
  }

  private extractDate(
    props: Record<string, NotionPropertyValue>,
    mappingName: string
  ): string | null {
    const prop = this.findProperty(props, mappingName);
    if (!prop || prop.type !== 'date' || !prop.date) return null;
    return prop.date.start;
  }

  private extractPeople(props: Record<string, NotionPropertyValue>, mappingName: string): Owner[] {
    const prop = this.findProperty(props, mappingName);
    if (!prop || prop.type !== 'people' || !prop.people) return [];
    return prop.people
      .filter(p => p && p.id)
      .map(p => ({
        id: p.id,
        name: typeof p.name === 'string' && p.name.length > 0 ? p.name : 'Unknown',
        email: p.person?.email,
        avatar: p.avatar_url,
      }));
  }

  private extractRelation(
    props: Record<string, NotionPropertyValue>,
    mappingName: string
  ): string[] {
    const prop = this.findProperty(props, mappingName, 'relation');
    if (!prop || prop.type !== 'relation' || !prop.relation) return [];
    return prop.relation
      .filter(r => r && r.id && typeof r.id === 'string')
      .map(r => normalizeUuid(r.id))
      .filter(id => id.length > 0);
  }

  private mapToItemStatus(notionStatus: string | null): ItemStatus {
    return notionStatus?.trim() || 'Not Started';
  }

  private mapToPriority(notionPriority: string | null): Priority | undefined {
    if (!notionPriority) return undefined;

    const normalized = notionPriority.toLowerCase().trim();

    const priorityMap: Record<string, Priority> = {
      p0: 'P0',
      p1: 'P1',
      p2: 'P2',
      p3: 'P3',
      p4: 'P3',
      critical: 'P0',
      highest: 'P0',
      urgent: 'P0',
      blocker: 'P0',
      high: 'P1',
      important: 'P1',
      medium: 'P2',
      normal: 'P2',
      moderate: 'P2',
      low: 'P3',
      minor: 'P3',
      trivial: 'P3',
      lowest: 'P3',
    };

    if (priorityMap[normalized]) {
      return priorityMap[normalized];
    }

    if (normalized.includes('critical') || normalized.includes('urgent')) return 'P0';
    if (normalized.includes('high')) return 'P1';
    if (normalized.includes('medium') || normalized.includes('normal')) return 'P2';
    if (normalized.includes('low')) return 'P3';

    return undefined;
  }

  /**
   * Convert Notion page to WorkItem
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

    const mappings = this.getMappings(dbConfig);
    const props = page.properties;

    this.logPropertyNames(itemType, props);

    const title = this.extractTitle(props, mappings.title);
    const status = this.extractStatus(props, mappings.status);
    const priority = this.extractSelect(props, mappings.priority);
    const progress = this.extractNumber(props, mappings.progress);
    const dueDate = this.extractDate(props, mappings.dueDate);
    const people = this.extractPeople(props, mappings.owner);
    const parentRelations = this.extractRelation(props, mappings.parent);
    const tags = this.extractMultiSelect(props, mappings.tags);

    // Normalize the page ID to ensure consistent format for parent-child matching
    const normalizedId = normalizeUuid(page.id);

    return {
      id: normalizedId,
      title: title || 'Untitled',
      type: itemType,
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
   * Fetch a single page of results
   */
  private async fetchPage(databaseId: string, cursor?: string): Promise<NotionQueryResponse> {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) {
      body.start_cursor = cursor;
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
    const itemMap = new Map(items.map(item => [item.id, item]));
    const orphanedItems: Array<{ id: string; title: string; parentId: string }> = [];

    for (const item of items) {
      if (item.parentId) {
        const parent = itemMap.get(item.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(item.id);
        } else {
          orphanedItems.push({ id: item.id, title: item.title, parentId: item.parentId });
        }
      }
    }

    if (orphanedItems.length > 0 && this.debugMode) {
      logger.notion.warn(`${orphanedItems.length} orphaned items (parent not found).`);
    }

    return orphanedItems.length;
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
    const mappings = this.getMappings();
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
