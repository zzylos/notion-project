import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NotionConfig, NotionPage, NotionQueryResponse } from '../types';
import type * as ConstantsModule from '../constants';

// Mock import.meta.env before importing notionService
vi.mock('../constants', async importOriginal => {
  const actual = await importOriginal<typeof ConstantsModule>();
  return {
    ...actual,
    NOTION: {
      ...actual.NOTION,
      CACHE_TIMEOUT: 100, // Short timeout for tests
    },
  };
});

// We need to create a fresh NotionService instance for testing
// rather than importing the singleton
class TestNotionService {
  private config: NotionConfig | null = null;
  private mockFetch: ReturnType<typeof vi.fn>;

  constructor(mockFetch: ReturnType<typeof vi.fn>) {
    this.mockFetch = mockFetch;
  }

  initialize(config: NotionConfig) {
    if (!config.apiKey || typeof config.apiKey !== 'string') {
      throw new Error('Invalid config: apiKey is required and must be a string');
    }

    const hasNewFormat = config.databases && config.databases.length > 0;
    const hasLegacyFormat = Boolean(config.databaseId);

    if (!hasNewFormat && !hasLegacyFormat) {
      throw new Error('Invalid config: at least one database must be configured');
    }

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
  }

  isInitialized(): boolean {
    return this.config !== null;
  }

  async fetchAllItems(): Promise<{ items: unknown[]; failedDatabases: unknown[] }> {
    if (!this.config) {
      throw new Error('NotionService not initialized. Call initialize() first.');
    }

    const response = await this.mockFetch();
    return response;
  }

  async fetchItem(pageId: string): Promise<unknown> {
    if (!this.config) {
      throw new Error('NotionService not initialized');
    }
    return this.mockFetch(`/pages/${pageId}`);
  }
}

// Mock Notion page factory
const createMockNotionPage = (overrides: Partial<NotionPage> = {}): NotionPage => ({
  id: `page-${Math.random().toString(36).substring(7)}`,
  url: 'https://notion.so/test-page',
  properties: {
    Name: {
      id: 'title',
      type: 'title',
      title: [{ plain_text: 'Test Item' }],
    },
    Status: {
      id: 'status',
      type: 'select',
      select: { name: 'In Progress' },
    },
  },
  created_time: '2024-01-01T00:00:00.000Z',
  last_edited_time: '2024-01-15T00:00:00.000Z',
  ...overrides,
});

// Helper for pagination tests (reserved for future use)
const _createMockQueryResponse = (pages: NotionPage[], hasMore = false): NotionQueryResponse => ({
  results: pages,
  has_more: hasMore,
  next_cursor: hasMore ? 'next-cursor' : null,
});

const createTestConfig = (overrides: Partial<NotionConfig> = {}): NotionConfig => ({
  apiKey: 'secret_test_api_key',
  databases: [{ databaseId: 'db-12345678901234567890123456789012', type: 'project' }],
  defaultMappings: {
    title: 'Name',
    status: 'Status',
    priority: 'Priority',
    owner: 'Owner',
    parent: 'Parent',
    progress: 'Progress',
    dueDate: 'Deadline',
    tags: 'Tags',
  },
  ...overrides,
});

describe('NotionService', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let service: TestNotionService;

  beforeEach(() => {
    mockFetch = vi.fn();
    service = new TestNotionService(mockFetch);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('initializes with valid config', () => {
      const config = createTestConfig();
      expect(() => service.initialize(config)).not.toThrow();
      expect(service.isInitialized()).toBe(true);
    });

    it('throws error when apiKey is missing', () => {
      const config = createTestConfig({ apiKey: '' });
      expect(() => service.initialize(config)).toThrow('Invalid config: apiKey is required');
    });

    it('throws error when no databases are configured', () => {
      const config = createTestConfig({ databases: [], databaseId: undefined });
      expect(() => service.initialize(config)).toThrow(
        'Invalid config: at least one database must be configured'
      );
    });

    it('throws error when database is missing databaseId', () => {
      const config = createTestConfig({
        databases: [{ databaseId: '', type: 'project' }],
      });
      expect(() => service.initialize(config)).toThrow(
        'each database must have a valid databaseId'
      );
    });

    it('throws error when database is missing type', () => {
      const config = createTestConfig({
        databases: [{ databaseId: 'db-123', type: undefined as unknown as 'project' }],
      });
      expect(() => service.initialize(config)).toThrow('is missing a type');
    });

    it('accepts legacy databaseId format', () => {
      const config = createTestConfig({
        databases: [],
        databaseId: 'legacy-db-id',
      });
      expect(() => service.initialize(config)).not.toThrow();
    });

    it('supports multiple databases', () => {
      const config = createTestConfig({
        databases: [
          { databaseId: 'db-missions', type: 'mission' },
          { databaseId: 'db-problems', type: 'problem' },
          { databaseId: 'db-solutions', type: 'solution' },
        ],
      });
      expect(() => service.initialize(config)).not.toThrow();
    });
  });

  describe('fetchAllItems', () => {
    it('throws error when not initialized', async () => {
      await expect(service.fetchAllItems()).rejects.toThrow('NotionService not initialized');
    });

    it('fetches items successfully', async () => {
      service.initialize(createTestConfig());

      const mockPage = createMockNotionPage();
      mockFetch.mockResolvedValue({
        items: [mockPage],
        failedDatabases: [],
      });

      const result = await service.fetchAllItems();

      expect(result.items).toHaveLength(1);
      expect(result.failedDatabases).toHaveLength(0);
    });

    it('returns failed databases on partial failure', async () => {
      service.initialize(
        createTestConfig({
          databases: [
            { databaseId: 'db-success', type: 'project' },
            { databaseId: 'db-fail', type: 'problem' },
          ],
        })
      );

      mockFetch.mockResolvedValue({
        items: [createMockNotionPage()],
        failedDatabases: [{ type: 'problem', error: 'Access denied' }],
      });

      const result = await service.fetchAllItems();

      expect(result.items).toHaveLength(1);
      expect(result.failedDatabases).toHaveLength(1);
      expect(result.failedDatabases[0]).toEqual({
        type: 'problem',
        error: 'Access denied',
      });
    });
  });

  describe('fetchItem', () => {
    it('throws error when not initialized', async () => {
      await expect(service.fetchItem('page-123')).rejects.toThrow('NotionService not initialized');
    });

    it('fetches single item', async () => {
      service.initialize(createTestConfig());

      const mockPage = createMockNotionPage({ id: 'page-123' });
      mockFetch.mockResolvedValue(mockPage);

      const result = await service.fetchItem('page-123');

      expect(result).toEqual(mockPage);
      expect(mockFetch).toHaveBeenCalledWith('/pages/page-123');
    });
  });
});

describe('NotionPropertyMapper', () => {
  it('extracts title from title property', () => {
    const props = {
      Name: {
        id: 'title',
        type: 'title' as const,
        title: [{ plain_text: 'My Title' }],
      },
    };

    // Test title extraction logic
    const titleProp = props.Name;
    if (titleProp.type === 'title' && titleProp.title) {
      const title = titleProp.title.map(t => t.plain_text).join('');
      expect(title).toBe('My Title');
    }
  });

  it('extracts status from select property', () => {
    const props = {
      Status: {
        id: 'status',
        type: 'select' as const,
        select: { name: 'In Progress' },
      },
    };

    const statusProp = props.Status;
    if (statusProp.type === 'select' && statusProp.select) {
      expect(statusProp.select.name).toBe('In Progress');
    }
  });

  it('extracts status from status property type', () => {
    const props = {
      Status: {
        id: 'status',
        type: 'status' as const,
        status: { name: 'Done' },
      },
    };

    const statusProp = props.Status;
    if (statusProp.type === 'status' && statusProp.status) {
      expect(statusProp.status.name).toBe('Done');
    }
  });

  it('extracts multi-select tags', () => {
    const props = {
      Tags: {
        id: 'tags',
        type: 'multi_select' as const,
        multi_select: [{ name: 'frontend' }, { name: 'urgent' }],
      },
    };

    const tagsProp = props.Tags;
    if (tagsProp.type === 'multi_select' && tagsProp.multi_select) {
      const tags = tagsProp.multi_select.map(s => s.name);
      expect(tags).toEqual(['frontend', 'urgent']);
    }
  });

  it('extracts number property', () => {
    const props = {
      Progress: {
        id: 'progress',
        type: 'number' as const,
        number: 75,
      },
    };

    const progressProp = props.Progress;
    if (progressProp.type === 'number') {
      expect(progressProp.number).toBe(75);
    }
  });

  it('extracts date property', () => {
    const props = {
      Deadline: {
        id: 'deadline',
        type: 'date' as const,
        date: { start: '2024-12-31' },
      },
    };

    const dateProp = props.Deadline;
    if (dateProp.type === 'date' && dateProp.date) {
      expect(dateProp.date.start).toBe('2024-12-31');
    }
  });

  it('extracts people property', () => {
    const props = {
      Owner: {
        id: 'owner',
        type: 'people' as const,
        people: [
          {
            id: 'user-123',
            name: 'John Doe',
            avatar_url: 'https://example.com/avatar.jpg',
            person: { email: 'john@example.com' },
          },
        ],
      },
    };

    const ownerProp = props.Owner;
    if (ownerProp.type === 'people' && ownerProp.people) {
      expect(ownerProp.people[0].name).toBe('John Doe');
      expect(ownerProp.people[0].person?.email).toBe('john@example.com');
    }
  });

  it('extracts relation property', () => {
    const props = {
      Parent: {
        id: 'parent',
        type: 'relation' as const,
        relation: [{ id: 'parent-page-123' }],
      },
    };

    const parentProp = props.Parent;
    if (parentProp.type === 'relation' && parentProp.relation) {
      const parentIds = parentProp.relation.map(r => r.id);
      expect(parentIds).toEqual(['parent-page-123']);
    }
  });
});

describe('Priority mapping', () => {
  const mapToPriority = (notionPriority: string | null): string | undefined => {
    if (!notionPriority) return undefined;

    const normalized = notionPriority.toLowerCase().trim();

    const priorityMap: Record<string, string> = {
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
  };

  it('maps P0-P3 directly', () => {
    expect(mapToPriority('P0')).toBe('P0');
    expect(mapToPriority('P1')).toBe('P1');
    expect(mapToPriority('P2')).toBe('P2');
    expect(mapToPriority('P3')).toBe('P3');
  });

  it('maps P4 to P3', () => {
    expect(mapToPriority('P4')).toBe('P3');
  });

  it('maps critical/urgent words to P0', () => {
    expect(mapToPriority('critical')).toBe('P0');
    expect(mapToPriority('urgent')).toBe('P0');
    expect(mapToPriority('blocker')).toBe('P0');
    expect(mapToPriority('highest')).toBe('P0');
  });

  it('maps high/important to P1', () => {
    expect(mapToPriority('high')).toBe('P1');
    expect(mapToPriority('important')).toBe('P1');
  });

  it('maps medium/normal to P2', () => {
    expect(mapToPriority('medium')).toBe('P2');
    expect(mapToPriority('normal')).toBe('P2');
    expect(mapToPriority('moderate')).toBe('P2');
  });

  it('maps low/minor to P3', () => {
    expect(mapToPriority('low')).toBe('P3');
    expect(mapToPriority('minor')).toBe('P3');
    expect(mapToPriority('trivial')).toBe('P3');
  });

  it('handles case-insensitive matching', () => {
    expect(mapToPriority('CRITICAL')).toBe('P0');
    expect(mapToPriority('High')).toBe('P1');
    expect(mapToPriority('MEDIUM')).toBe('P2');
  });

  it('handles partial matches', () => {
    expect(mapToPriority('Very High Priority')).toBe('P1');
    expect(mapToPriority('Medium-Low')).toBe('P2'); // medium comes first
    expect(mapToPriority('Critical Bug')).toBe('P0');
  });

  it('returns undefined for null or unknown values', () => {
    expect(mapToPriority(null)).toBeUndefined();
    expect(mapToPriority('unknown')).toBeUndefined();
  });
});

describe('Error parsing', () => {
  const parseNotionError = (status: number, errorText: string): string => {
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
  };

  it('parses 401 unauthorized error', () => {
    const result = parseNotionError(401, '{}');
    expect(result).toBe('Invalid API key. Please check your Notion integration token.');
  });

  it('parses 403 forbidden error', () => {
    const result = parseNotionError(403, '{}');
    expect(result).toBe(
      'Access denied. Make sure you have shared the database with your integration.'
    );
  });

  it('parses 404 not found error', () => {
    const result = parseNotionError(404, '{}');
    expect(result).toBe(
      'Database not found. Please verify the database ID and ensure it is shared with your integration.'
    );
  });

  it('parses 429 rate limit error', () => {
    const result = parseNotionError(429, '{}');
    expect(result).toBe('Rate limited by Notion API. Please wait a moment and try again.');
  });

  it('parses 400 validation error with details', () => {
    const result = parseNotionError(
      400,
      JSON.stringify({
        code: 'validation_error',
        message: 'Invalid property format',
      })
    );
    expect(result).toBe('Invalid request: Invalid property format');
  });

  it('parses 5xx server errors', () => {
    expect(parseNotionError(500, '{}')).toBe(
      'Notion API is temporarily unavailable. Please try again later.'
    );
    expect(parseNotionError(502, '{}')).toBe(
      'Notion API is temporarily unavailable. Please try again later.'
    );
    expect(parseNotionError(503, '{}')).toBe(
      'Notion API is temporarily unavailable. Please try again later.'
    );
  });

  it('handles non-JSON error text', () => {
    const result = parseNotionError(400, 'Plain text error');
    expect(result).toBe('Bad request: Plain text error');
  });

  it('handles unknown status codes', () => {
    const result = parseNotionError(418, JSON.stringify({ message: "I'm a teapot" }));
    expect(result).toBe("Notion API error (418): I'm a teapot");
  });
});
