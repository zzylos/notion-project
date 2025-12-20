import type { WorkItem, ItemType, ItemStatus, Priority, Owner, NotionConfig } from '../types';

// Type for Notion API responses
type NotionPage = {
  id: string;
  url: string;
  properties: Record<string, unknown>;
  created_time: string;
  last_edited_time: string;
};

type NotionPropertyValue = {
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
};

type NotionQueryResponse = {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
};

// CORS proxy for browser requests (you can self-host one or use a service)
// For production, you should use your own backend proxy
const CORS_PROXY = 'https://corsproxy.io/?';
const NOTION_API_BASE = 'https://api.notion.com/v1';

class NotionService {
  private config: NotionConfig | null = null;

  initialize(config: NotionConfig) {
    this.config = config;
  }

  isInitialized(): boolean {
    return this.config !== null;
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

  private extractPlainText(property: NotionPropertyValue): string {
    if (property.title && property.title.length > 0) {
      return property.title.map(t => t.plain_text).join('');
    }
    if (property.rich_text && property.rich_text.length > 0) {
      return property.rich_text.map(t => t.plain_text).join('');
    }
    return '';
  }

  private extractSelect(property: NotionPropertyValue): string | null {
    return property.select?.name ?? null;
  }

  private extractMultiSelect(property: NotionPropertyValue): string[] {
    return property.multi_select?.map(s => s.name) ?? [];
  }

  private extractNumber(property: NotionPropertyValue): number | null {
    return property.number ?? null;
  }

  private extractDate(property: NotionPropertyValue): string | null {
    return property.date?.start ?? null;
  }

  private extractPeople(property: NotionPropertyValue): Owner[] {
    return property.people?.map(p => ({
      id: p.id,
      name: p.name || 'Unknown',
      email: p.person?.email || '',
      avatar: p.avatar_url,
    })) ?? [];
  }

  private extractRelation(property: NotionPropertyValue): string[] {
    return property.relation?.map(r => r.id) ?? [];
  }

  private mapToItemType(notionType: string): ItemType {
    const typeMap: Record<string, ItemType> = {
      'Mission': 'mission',
      'Problem': 'problem',
      'Solution': 'solution',
      'Design': 'design',
      'Project': 'project',
      // Lowercase variants
      'mission': 'mission',
      'problem': 'problem',
      'solution': 'solution',
      'design': 'design',
      'project': 'project',
    };
    return typeMap[notionType] || 'problem';
  }

  private mapToItemStatus(notionStatus: string): ItemStatus {
    const statusMap: Record<string, ItemStatus> = {
      'Not Started': 'not-started',
      'Not started': 'not-started',
      'To Do': 'not-started',
      'In Progress': 'in-progress',
      'In progress': 'in-progress',
      'Doing': 'in-progress',
      'Blocked': 'blocked',
      'On Hold': 'blocked',
      'In Review': 'in-review',
      'Review': 'in-review',
      'Done': 'completed',
      'Completed': 'completed',
      'Complete': 'completed',
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

  private mapToPriority(notionPriority: string): Priority | undefined {
    const priorityMap: Record<string, Priority> = {
      'P0': 'P0',
      'P1': 'P1',
      'P2': 'P2',
      'P3': 'P3',
      'Critical': 'P0',
      'High': 'P1',
      'Medium': 'P2',
      'Low': 'P3',
    };
    return priorityMap[notionPriority];
  }

  private pageToWorkItem(page: NotionPage): WorkItem {
    if (!this.config) throw new Error('NotionService not initialized');

    const { mappings } = this.config;
    const props = page.properties as Record<string, NotionPropertyValue>;

    const title = this.extractPlainText(props[mappings.title] || {});
    const type = this.extractSelect(props[mappings.type] || {});
    const status = this.extractSelect(props[mappings.status] || {});
    const priority = this.extractSelect(props[mappings.priority] || {});
    const progress = this.extractNumber(props[mappings.progress] || {});
    const dueDate = this.extractDate(props[mappings.dueDate] || {});
    const people = this.extractPeople(props[mappings.owner] || {});
    const parentRelations = this.extractRelation(props[mappings.parent] || {});
    const tags = this.extractMultiSelect(props[mappings.tags] || {});

    return {
      id: page.id,
      title: title || 'Untitled',
      type: this.mapToItemType(type || 'problem'),
      status: this.mapToItemStatus(status || 'not-started'),
      priority: priority ? this.mapToPriority(priority) : undefined,
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

  async fetchAllItems(): Promise<WorkItem[]> {
    if (!this.config) {
      throw new Error('NotionService not initialized. Call initialize() first.');
    }

    const items: WorkItem[] = [];
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      const body: Record<string, unknown> = {
        page_size: 100,
      };
      if (startCursor) {
        body.start_cursor = startCursor;
      }

      const response = await this.notionFetch<NotionQueryResponse>(
        `/databases/${this.config.databaseId}/query`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );

      for (const page of response.results) {
        if ('properties' in page) {
          items.push(this.pageToWorkItem(page));
        }
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor ?? undefined;
    }

    // Build parent-child relationships
    const itemMap = new Map(items.map(item => [item.id, item]));
    for (const item of items) {
      if (item.parentId && itemMap.has(item.parentId)) {
        const parent = itemMap.get(item.parentId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(item.id);
      }
    }

    return items;
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
  }
}

export const notionService = new NotionService();
export default notionService;
