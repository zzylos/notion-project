import type { WorkItem, ItemType, ItemStatus, Priority, Owner, NotionConfig } from '../types';

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
}) => void;

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

// Note: Notion's cursor-based pagination requires sequential requests
// (each cursor depends on the previous response), so true parallelization
// is not possible. We fetch one page at a time.

class NotionService {
  private config: NotionConfig | null = null;
  private cache: Map<string, { items: WorkItem[]; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes cache

  initialize(config: NotionConfig) {
    this.config = config;
  }

  isInitialized(): boolean {
    return this.config !== null;
  }

  clearCache() {
    this.cache.clear();
  }

  private async notionFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.config) {
      throw new Error('NotionService not initialized');
    }

    const url = `${CORS_PROXY}${encodeURIComponent(NOTION_API_BASE + endpoint)}`;

    const response = await fetch(url, {
      ...options,
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

  // Debug flag - set to true in dev to log property mappings
  private debugMode = import.meta.env.DEV;
  private hasLoggedProperties = false;

  // Log property names once for debugging
  private logPropertyNames(props: Record<string, NotionPropertyValue>): void {
    if (!this.debugMode || this.hasLoggedProperties) return;
    this.hasLoggedProperties = true;

    const propertyInfo = Object.entries(props).map(([name, value]) => ({
      name,
      type: value.type,
      hasValue: this.hasPropertyValue(value),
    }));

    console.info(
      '%c[Notion Debug] Database properties detected:',
      'color: #0ea5e9; font-weight: bold'
    );
    console.table(propertyInfo);
    console.info(
      '%cConfigure these in Settings > Property Mappings if data is not showing correctly.',
      'color: #64748b'
    );
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

  // Find property by name (case-insensitive) or by type, with auto-detection fallbacks
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

    // Try common aliases based on the mapping name
    const aliases = this.getPropertyAliases(mappingName);
    for (const alias of aliases) {
      const lowerAlias = alias.toLowerCase();
      for (const [key, value] of Object.entries(props)) {
        if (key.toLowerCase() === lowerAlias) {
          return value;
        }
      }
    }

    // Try to find by type (useful for title which is unique)
    if (fallbackType) {
      for (const value of Object.values(props)) {
        if (value.type === fallbackType) {
          return value;
        }
      }
    }

    return null;
  }

  // Common property name aliases to try as fallbacks
  private getPropertyAliases(mappingName: string): string[] {
    const aliasMap: Record<string, string[]> = {
      'Status': ['Status', 'State', 'Stage', 'Phase', 'Progress Status', 'Task Status', 'Item Status'],
      'Type': ['Type', 'Category', 'Kind', 'Item Type', 'Work Type', 'Task Type'],
      'Priority': ['Priority', 'Importance', 'Urgency', 'Level', 'P'],
      'Parent': ['Parent', 'Parent Item', 'Parent Task', 'Belongs To', 'Part Of', 'Epic', 'Initiative'],
      'Owner': ['Owner', 'Assignee', 'Assigned To', 'Responsible', 'Lead', 'Person', 'People', 'Assigned'],
      'Progress': ['Progress', 'Completion', 'Percent Complete', '% Complete', 'Done %'],
      'Deadline': ['Deadline', 'Due Date', 'Due', 'Target Date', 'End Date', 'Finish Date', 'Due By'],
      'Tags': ['Tags', 'Labels', 'Categories', 'Keywords'],
    };
    return aliasMap[mappingName] || [];
  }

  private extractTitle(props: Record<string, NotionPropertyValue>, mappingName: string): string {
    // First try the mapped property name
    const mapped = this.findProperty(props, mappingName);
    if (mapped) {
      if (mapped.type === 'title' && mapped.title) {
        return mapped.title.map(t => t.plain_text).join('');
      }
      if (mapped.type === 'rich_text' && mapped.rich_text) {
        return mapped.rich_text.map(t => t.plain_text).join('');
      }
    }

    // Fallback: find ANY title property (every Notion DB has exactly one)
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

    // Handle both 'select' and 'status' types (Notion has a special status type)
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
    const prop = this.findProperty(props, mappingName);
    if (!prop || prop.type !== 'relation' || !prop.relation) return [];
    return prop.relation.map(r => r.id);
  }

  private mapToItemType(notionType: string | null): ItemType {
    if (!notionType) return 'project'; // Default to project if no type

    const normalized = notionType.toLowerCase().trim();

    // Check for exact matches first
    const exactMap: Record<string, ItemType> = {
      'mission': 'mission',
      'problem': 'problem',
      'solution': 'solution',
      'design': 'design',
      'project': 'project',
      'task': 'project',
      'feature': 'project',
      'epic': 'mission',
      'story': 'project',
      'bug': 'problem',
      'issue': 'problem',
      'idea': 'solution',
      'proposal': 'solution',
      'spec': 'design',
      'specification': 'design',
      'mockup': 'design',
      'prototype': 'design',
    };

    if (exactMap[normalized]) {
      return exactMap[normalized];
    }

    // Check for partial matches (contains)
    if (normalized.includes('mission') || normalized.includes('goal') || normalized.includes('objective')) {
      return 'mission';
    }
    if (normalized.includes('problem') || normalized.includes('bug') || normalized.includes('issue') || normalized.includes('defect')) {
      return 'problem';
    }
    if (normalized.includes('solution') || normalized.includes('fix') || normalized.includes('idea')) {
      return 'solution';
    }
    if (normalized.includes('design') || normalized.includes('mockup') || normalized.includes('spec') || normalized.includes('ui') || normalized.includes('ux')) {
      return 'design';
    }

    return 'project';
  }

  // Preserve original status from Notion - no longer map to fixed categories
  private mapToItemStatus(notionStatus: string | null): ItemStatus {
    // Return the original status value, or a default if none
    return notionStatus?.trim() || 'Not Started';
  }

  private mapToPriority(notionPriority: string | null): Priority | undefined {
    if (!notionPriority) return undefined;

    const normalized = notionPriority.toLowerCase().trim();

    const priorityMap: Record<string, Priority> = {
      'p0': 'P0',
      'p1': 'P1',
      'p2': 'P2',
      'p3': 'P3',
      'p4': 'P3',
      'critical': 'P0',
      'highest': 'P0',
      'urgent': 'P0',
      'blocker': 'P0',
      'high': 'P1',
      'important': 'P1',
      'medium': 'P2',
      'normal': 'P2',
      'moderate': 'P2',
      'low': 'P3',
      'minor': 'P3',
      'trivial': 'P3',
      'lowest': 'P3',
    };

    // Check exact match
    if (priorityMap[normalized]) {
      return priorityMap[normalized];
    }

    // Check for partial matches
    if (normalized.includes('critical') || normalized.includes('urgent') || normalized.includes('blocker') || normalized.includes('highest')) {
      return 'P0';
    }
    if (normalized.includes('high') || normalized.includes('important')) {
      return 'P1';
    }
    if (normalized.includes('medium') || normalized.includes('normal') || normalized.includes('moderate')) {
      return 'P2';
    }
    if (normalized.includes('low') || normalized.includes('minor') || normalized.includes('trivial')) {
      return 'P3';
    }

    return undefined;
  }

  private pageToWorkItem(page: NotionPage): WorkItem {
    if (!this.config) throw new Error('NotionService not initialized');

    const { mappings } = this.config;
    const props = page.properties;

    // Log property names once in dev mode to help with debugging
    this.logPropertyNames(props);

    const title = this.extractTitle(props, mappings.title);
    const type = this.extractSelect(props, mappings.type);
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
      type: this.mapToItemType(type),
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

  // Process pages in batches to convert to WorkItems without blocking
  private processPagesInBatches(pages: NotionPage[], batchSize = 50): WorkItem[] {
    const items: WorkItem[] = [];
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      for (const page of batch) {
        if ('properties' in page) {
          items.push(this.pageToWorkItem(page));
        }
      }
    }
    return items;
  }

  // Build parent-child relationships efficiently
  private buildRelationships(items: WorkItem[]): void {
    const itemMap = new Map(items.map(item => [item.id, item]));
    for (const item of items) {
      if (item.parentId && itemMap.has(item.parentId)) {
        const parent = itemMap.get(item.parentId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(item.id);
      }
    }
  }

  // Fetch a single page of results
  private async fetchPage(cursor?: string): Promise<NotionQueryResponse> {
    if (!this.config) {
      throw new Error('NotionService not initialized');
    }

    const body: Record<string, unknown> = {
      page_size: 100,
    };
    if (cursor) {
      body.start_cursor = cursor;
    }

    return this.notionFetch<NotionQueryResponse>(
      `/databases/${this.config.databaseId}/query`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  }

  // Fetch all items with progressive loading support
  async fetchAllItems(onProgress?: FetchProgressCallback): Promise<WorkItem[]> {
    if (!this.config) {
      throw new Error('NotionService not initialized. Call initialize() first.');
    }

    // Check cache first
    const cacheKey = this.config.databaseId;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      onProgress?.({ loaded: cached.items.length, total: cached.items.length, items: cached.items, done: true });
      return cached.items;
    }

    const allPages: NotionPage[] = [];

    // First request to get initial data and check if there's more
    const firstResponse = await this.fetchPage();
    allPages.push(...firstResponse.results);

    // Report initial progress
    const initialItems = this.processPagesInBatches(allPages);
    onProgress?.({ loaded: initialItems.length, total: null, items: initialItems, done: false });

    if (firstResponse.has_more && firstResponse.next_cursor) {
      // Fetch remaining pages sequentially (cursor-based pagination requires this)
      let currentCursor: string | null = firstResponse.next_cursor;

      while (currentCursor) {
        const response = await this.fetchPage(currentCursor);
        allPages.push(...response.results);
        currentCursor = response.has_more ? response.next_cursor : null;

        // Report progress
        const currentItems = this.processPagesInBatches(allPages);
        onProgress?.({
          loaded: currentItems.length,
          total: null,
          items: currentItems,
          done: false
        });
      }
    }

    // Final processing
    const items = this.processPagesInBatches(allPages);
    this.buildRelationships(items);

    // Cache the results
    this.cache.set(cacheKey, { items, timestamp: Date.now() });

    // Final progress callback
    onProgress?.({ loaded: items.length, total: items.length, items, done: true });

    return items;
  }

  // Fetch with streaming updates to the store
  async fetchAllItemsStreaming(
    onBatch: (items: WorkItem[], isComplete: boolean) => void
  ): Promise<void> {
    if (!this.config) {
      throw new Error('NotionService not initialized. Call initialize() first.');
    }

    const allPages: NotionPage[] = [];
    let hasMore = true;
    let startCursor: string | undefined;
    let batchCount = 0;

    while (hasMore) {
      const response = await this.fetchPage(startCursor);
      allPages.push(...response.results);
      batchCount++;

      // Process and send batch update every few requests
      if (batchCount % 2 === 0 || !response.has_more) {
        const items = this.processPagesInBatches(allPages);
        this.buildRelationships(items);
        onBatch(items, !response.has_more);
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor ?? undefined;
    }
  }

  async fetchItem(pageId: string): Promise<WorkItem> {
    if (!this.config) {
      throw new Error('NotionService not initialized');
    }

    const page = await this.notionFetch<NotionPage>(`/pages/${pageId}`);
    return this.pageToWorkItem(page);
  }

  async updateItemStatus(pageId: string, status: ItemStatus): Promise<void> {
    if (!this.config) {
      throw new Error('NotionService not initialized');
    }

    const statusName = this.statusToNotionName(status);

    await this.notionFetch(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        properties: {
          [this.config.mappings.status]: {
            select: { name: statusName },
          },
        },
      }),
    });

    // Invalidate cache after update
    this.clearCache();
  }

  private statusToNotionName(status: ItemStatus): string {
    const reverseMap: Record<ItemStatus, string> = {
      'not-started': 'Not Started',
      'in-progress': 'In Progress',
      'blocked': 'Blocked',
      'in-review': 'In Review',
      'completed': 'Completed',
    };
    return reverseMap[status];
  }

  async updateItemProgress(pageId: string, progress: number): Promise<void> {
    if (!this.config) {
      throw new Error('NotionService not initialized');
    }

    await this.notionFetch(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        properties: {
          [this.config.mappings.progress]: {
            number: Math.min(100, Math.max(0, progress)),
          },
        },
      }),
    });

    // Invalidate cache after update
    this.clearCache();
  }
}

export const notionService = new NotionService();
export default notionService;
