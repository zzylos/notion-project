import type { WorkItem, ItemType, ItemStatus, Priority, Owner, NotionConfig, PropertyMappings, DatabaseConfig } from '../types';

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
  formula?: { string?: string; number?: number };
  rollup?: { number?: number };
  checkbox?: boolean;
  url?: string | null;
  status?: { name: string } | null;
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
const CORS_PROXY = import.meta.env.VITE_CORS_PROXY || 'https://corsproxy.io/?';
const NOTION_API_BASE = 'https://api.notion.com/v1';

class NotionService {
  private config: NotionConfig | null = null;
  private cache: Map<string, { items: WorkItem[]; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes cache

  // Debug flag - set to true in dev to log property mappings
  private debugMode = import.meta.env.DEV;
  private loggedDatabases = new Set<string>();

  initialize(config: NotionConfig) {
    this.config = config;
    this.loggedDatabases.clear();
  }

  isInitialized(): boolean {
    return this.config !== null;
  }

  clearCache() {
    this.cache.clear();
  }

  private async notionFetch<T>(endpoint: string, options: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    if (!this.config) {
      throw new Error('NotionService not initialized');
    }

    const url = `${CORS_PROXY}${encodeURIComponent(NOTION_API_BASE + endpoint)}`;

    const response = await fetch(url, {
      ...options,
      signal,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Notion API error: ${response.status} - ${errorText}`);
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
    const aliasMap: Record<string, string[]> = {
      'Status': ['Status', 'State', 'Stage', 'Phase'],
      'Priority': ['Priority', 'Importance', 'Urgency', 'Level', 'P'],
      'Parent': ['Parent', 'Parent Item', 'Parent Task', 'Belongs To', 'Part Of', 'Epic', 'Initiative', 'Objective', 'Problem', 'Solution', 'Project'],
      'Owner': ['Owner', 'Assignee', 'Assigned To', 'Responsible', 'Lead', 'Person', 'People', 'Assigned'],
      'Progress': ['Progress', 'Completion', 'Percent Complete', '% Complete', 'Done %'],
      'Deadline': ['Deadline', 'Due Date', 'Due', 'Target Date', 'End Date', 'Finish Date', 'Due By'],
      'Tags': ['Tags', 'Labels', 'Categories', 'Keywords'],
    };
    return aliasMap[mappingName] || [];
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
      parentId: parentRelations[0],
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
        if (itemMap.has(item.parentId)) {
          const parent = itemMap.get(item.parentId)!;
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

    const allItems: WorkItem[] = [];
    const failedDatabases: Array<{ type: string; error: string }> = [];

    // Fetch from each database
    for (let i = 0; i < dbConfigs.length; i++) {
      // Check if aborted before each database
      if (signal?.aborted) {
        throw new DOMException('Fetch aborted', 'AbortError');
      }

      const dbConfig = dbConfigs[i];

      if (this.debugMode) {
        console.info(`%c[Notion] Fetching ${dbConfig.type} database...`, 'color: #10b981');
      }

      try {
        const items = await this.fetchAllFromDatabase(dbConfig, signal);
        allItems.push(...items);

        // Report progress
        onProgress?.({
          loaded: allItems.length,
          total: null,
          items: [...allItems],
          done: i === dbConfigs.length - 1,
          currentDatabase: dbConfig.type,
          failedDatabases: failedDatabases.length > 0 ? [...failedDatabases] : undefined,
        });
      } catch (error) {
        // Re-throw abort errors
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to fetch ${dbConfig.type} database:`, error);
        failedDatabases.push({ type: dbConfig.type, error: errorMessage });
        // Continue with other databases
      }
    }

    // Build relationships across all items
    this.buildRelationships(allItems);

    // Cache the results (only if we got some items)
    if (allItems.length > 0) {
      this.cache.set(cacheKey, { items: allItems, timestamp: Date.now() });
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
