import { describe, it, expect, vi } from 'vitest';
import { buildRelationships, parseNotionError, normalizeUuid } from './utils';
import type { WorkItem } from './types';

// Helper to create mock work items
const createMockItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: 'test-id',
  title: 'Test Item',
  type: 'project',
  status: 'In Progress',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('buildRelationships', () => {
  it('should return 0 for empty array', () => {
    const items: WorkItem[] = [];
    const result = buildRelationships(items);
    expect(result).toBe(0);
  });

  it('should build parent-child relationships', () => {
    const parent = createMockItem({ id: 'parent', children: [] });
    const child = createMockItem({ id: 'child', parentId: 'parent', children: [] });

    const items = [parent, child];
    buildRelationships(items);

    expect(parent.children).toContain('child');
  });

  it('should return count of orphaned items', () => {
    const orphan = createMockItem({ id: 'orphan', parentId: 'missing', children: [] });
    const items = [orphan];

    const result = buildRelationships(items);
    expect(result).toBe(1);
  });

  it('should call onOrphanedItems callback with orphan details', () => {
    const orphan = createMockItem({
      id: 'orphan-id',
      title: 'Orphan Item',
      parentId: 'missing-parent',
      children: [],
    });
    const items = [orphan];

    const onOrphanedItems = vi.fn();
    buildRelationships(items, { onOrphanedItems });

    expect(onOrphanedItems).toHaveBeenCalledWith([
      {
        id: 'orphan-id',
        title: 'Orphan Item',
        parentId: 'missing-parent',
      },
    ]);
  });

  it('should not call onOrphanedItems when no orphans', () => {
    const parent = createMockItem({ id: 'parent', children: [] });
    const child = createMockItem({ id: 'child', parentId: 'parent', children: [] });
    const items = [parent, child];

    const onOrphanedItems = vi.fn();
    buildRelationships(items, { onOrphanedItems });

    expect(onOrphanedItems).not.toHaveBeenCalled();
  });

  it('should handle multiple children for one parent', () => {
    const parent = createMockItem({ id: 'parent', children: [] });
    const child1 = createMockItem({ id: 'child1', parentId: 'parent', children: [] });
    const child2 = createMockItem({ id: 'child2', parentId: 'parent', children: [] });

    const items = [parent, child1, child2];
    buildRelationships(items);

    expect(parent.children).toContain('child1');
    expect(parent.children).toContain('child2');
    expect(parent.children).toHaveLength(2);
  });

  it('should handle items with no parentId', () => {
    const root = createMockItem({ id: 'root', parentId: undefined, children: [] });
    const items = [root];

    const result = buildRelationships(items);
    expect(result).toBe(0);
    expect(root.children).toEqual([]);
  });

  it('should initialize children array if undefined', () => {
    const parent = createMockItem({ id: 'parent' });
    delete (parent as { children?: string[] }).children; // Remove children property
    const child = createMockItem({ id: 'child', parentId: 'parent', children: [] });

    const items = [parent, child];
    buildRelationships(items);

    expect(parent.children).toBeDefined();
    expect(parent.children).toContain('child');
  });
});

describe('parseNotionError', () => {
  it('should return invalid API key message for 401', () => {
    const result = parseNotionError(401, '{"code":"unauthorized"}');
    expect(result).toBe('Invalid API key. Please check your Notion integration token.');
  });

  it('should return access denied message for 403', () => {
    const result = parseNotionError(403, '{}');
    expect(result).toBe(
      'Access denied. Make sure you have shared the database with your integration.'
    );
  });

  it('should return database not found message for 404', () => {
    const result = parseNotionError(404, '{}');
    expect(result).toBe(
      'Database not found. Please verify the database ID and ensure it is shared with your integration.'
    );
  });

  it('should return rate limit message for 429', () => {
    const result = parseNotionError(429, '{}');
    expect(result).toBe('Rate limited by Notion API. Please wait a moment and try again.');
  });

  it('should return validation error details for 400 with validation_error code', () => {
    const result = parseNotionError(
      400,
      '{"code":"validation_error","message":"Invalid property"}'
    );
    expect(result).toBe('Invalid request: Invalid property');
  });

  it('should return bad request message for 400 without validation_error', () => {
    const result = parseNotionError(400, '{"message":"Something wrong"}');
    expect(result).toBe('Bad request: Something wrong');
  });

  it('should return default bad request for 400 with no message', () => {
    const result = parseNotionError(400, '{}');
    expect(result).toBe('Bad request: Please check your configuration.');
  });

  it('should return server error message for 500', () => {
    const result = parseNotionError(500, '{}');
    expect(result).toBe('Notion API is temporarily unavailable. Please try again later.');
  });

  it('should return server error message for 502', () => {
    const result = parseNotionError(502, '{}');
    expect(result).toBe('Notion API is temporarily unavailable. Please try again later.');
  });

  it('should return server error message for 503', () => {
    const result = parseNotionError(503, '{}');
    expect(result).toBe('Notion API is temporarily unavailable. Please try again later.');
  });

  it('should return generic error for unknown status codes', () => {
    const result = parseNotionError(418, '{"message":"I am a teapot"}');
    expect(result).toBe('Notion API error (418): I am a teapot');
  });

  it('should handle invalid JSON in error text', () => {
    const result = parseNotionError(401, 'not json');
    expect(result).toBe('Invalid API key. Please check your Notion integration token.');
  });

  it('should use error text as message when JSON parsing fails for unknown status', () => {
    const result = parseNotionError(418, 'raw error text');
    expect(result).toBe('Notion API error (418): raw error text');
  });
});

describe('normalizeUuid', () => {
  it('should return empty string for null/undefined input', () => {
    expect(normalizeUuid(null as unknown as string)).toBe('');
    expect(normalizeUuid(undefined as unknown as string)).toBe('');
  });

  it('should return empty string for non-string input', () => {
    expect(normalizeUuid(123 as unknown as string)).toBe('');
  });

  it('should add dashes to UUID without dashes', () => {
    const result = normalizeUuid('12345678123412341234123456789abc');
    expect(result).toBe('12345678-1234-1234-1234-123456789abc');
  });

  it('should keep UUID with dashes as-is (normalized)', () => {
    const result = normalizeUuid('12345678-1234-1234-1234-123456789abc');
    expect(result).toBe('12345678-1234-1234-1234-123456789abc');
  });

  it('should convert uppercase to lowercase', () => {
    const result = normalizeUuid('ABCDEF12345678901234567890ABCDEF');
    expect(result).toBe('abcdef12-3456-7890-1234-567890abcdef');
  });

  it('should handle mixed case UUID', () => {
    const result = normalizeUuid('AbCdEf12-3456-7890-1234-567890aBcDeF');
    expect(result).toBe('abcdef12-3456-7890-1234-567890abcdef');
  });

  it('should return input as-is for invalid length', () => {
    expect(normalizeUuid('short')).toBe('short');
    expect(normalizeUuid('12345')).toBe('12345');
    expect(normalizeUuid('123456781234123412341234567890abcdef')).toBe(
      '123456781234123412341234567890abcdef'
    ); // Too long
  });

  it('should return input as-is for invalid characters', () => {
    // Contains 'g' which is not a valid hex character
    expect(normalizeUuid('1234567g123412341234123456789abc')).toBe(
      '1234567g123412341234123456789abc'
    );
  });

  it('should handle empty string', () => {
    expect(normalizeUuid('')).toBe('');
  });

  it('should handle real Notion UUID examples', () => {
    // With dashes (already normalized)
    expect(normalizeUuid('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    );

    // Without dashes (needs normalization)
    expect(normalizeUuid('a1b2c3d4e5f67890abcdef1234567890')).toBe(
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    );
  });
});
