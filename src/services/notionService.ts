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

// CORS proxy for browser requests (you can self-host one or use a service)
// For production, you should use your own backend proxy
const CORS_PROXY = 'https://corsproxy.io/?';
const NOTION_API_BASE = 'https://api.notion.com/v1';

// Number of concurrent requests for parallel fetching
const PARALLEL_REQUESTS = 3;

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
      console.error('Notion API error:', response.status, errorText);
      throw new Error(`Notion API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Find property by name (case-insensitive) or by type
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

    const typeMap: Record<string, ItemType> = {
      'Mission': 'mission',
      'Problem': 'problem',
      'Solution': 'solution',
      'Design': 'design',
      'Project': 'project',
      'Task': 'project',
      // Lowercase variants
      'mission': 'mission',
      'problem': 'problem',
      'solution': 'solution',
      'design': 'design',
      'project': 'project',
      'task': 'project',
    };
    return typeMap[notionType] || 'project';
  }

  private mapToItemStatus(notionStatus: string | null): ItemStatus {
    if (!notionStatus) return 'not-started';

    const statusMap: Record<string, ItemStatus> = {
      'Not Started': 'not-started',
      'Not started': 'not-started',
      'To Do': 'not-started',
      'Todo': 'not-started',
      'Backlog': 'not-started',
      'In Progress': 'in-progress',
      'In progress': 'in-progress',
      'Doing': 'in-progress',
      'Active': 'in-progress',
      'Blocked': 'blocked',
      'On Hold': 'blocked',
      'On hold': 'blocked',
      'Waiting': 'blocked',
      'In Review': 'in-review',
      'In review': 'in-review',
      'Review': 'in-review',
      'Done': 'completed',
      'Completed': 'completed',
      'Complete': 'completed',
      'Finished': 'completed',
      // Lowercase variants
      'not started': 'not-started',
      'in progress': 'in-progress',
      'blocked': 'blocked',
      'in review': 'in-review',
      'done': 'completed',
      'completed': 'completed',
    };
    return statusMap[notionStatus] || 'not-started';
  }

  private mapToPriority(notionPriority: string | null): Priority | undefined {
    if (!notionPriority) return undefined;

    const priorityMap: Record<string, Priority> = {
      'P0': 'P0',
      'P1': 'P1',
      'P2': 'P2',
      'P3': 'P3',
      'Critical': 'P0',
      'High': 'P1',
      'Medium': 'P2',
      'Low': 'P3',
      'Urgent': 'P0',
    };
    return priorityMap[notionPriority];
  }

  private pageToWorkItem(page: NotionPage): WorkItem {
    if (!this.config) throw new Error('NotionService not initialized');

    const { mappings } = this.config;
    const props = page.properties;

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
      console.log('Using cached data:', cached.items.length, 'items');
      onProgress?.({ loaded: cached.items.length, total: cached.items.length, items: cached.items, done: true });
      return cached.items;
    }

    const allPages: NotionPage[] = [];

    console.log('Starting optimized Notion fetch...');
    const startTime = performance.now();

    // First request to get initial data and check if there's more
    const firstResponse = await this.fetchPage();
    allPages.push(...firstResponse.results);

    // Report initial progress
    const initialItems = this.processPagesInBatches(allPages);
    onProgress?.({ loaded: initialItems.length, total: null, items: initialItems, done: false });

    if (firstResponse.has_more && firstResponse.next_cursor) {
      // Collect all cursors by making sequential requests first to get cursors
      // Then we can parallelize future fetches
      let currentCursor: string | null = firstResponse.next_cursor;

      while (currentCursor) {
        // Fetch in parallel batches
        const batchPromises: Promise<NotionQueryResponse>[] = [];
        const batchCursors: string[] = [];

        // Queue up parallel requests
        for (let i = 0; i < PARALLEL_REQUESTS && currentCursor; i++) {
          batchCursors.push(currentCursor);
          batchPromises.push(this.fetchPage(currentCursor));
          // We'll get the next cursor from the response, so break for now
          if (i === 0) break; // For first iteration, we need to get next cursor
        }

        // Execute batch
        const responses = await Promise.all(batchPromises);

        for (const response of responses) {
          allPages.push(...response.results);
          currentCursor = response.has_more ? response.next_cursor : null;
        }

        // Report progress
        const currentItems = this.processPagesInBatches(allPages);
        onProgress?.({
          loaded: currentItems.length,
          total: null,
          items: currentItems,
          done: false
        });

        console.log(`Fetched ${allPages.length} pages so far...`);
      }
    }

    // Final processing
    const items = this.processPagesInBatches(allPages);
    this.buildRelationships(items);

    const endTime = performance.now();
    console.log(`Fetched ${items.length} items in ${((endTime - startTime) / 1000).toFixed(2)}s`);

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

    console.log('Starting streaming Notion fetch...');
    const startTime = performance.now();

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

    const endTime = performance.now();
    console.log(`Streaming fetch complete: ${allPages.length} items in ${((endTime - startTime) / 1000).toFixed(2)}s`);
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
