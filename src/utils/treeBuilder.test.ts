import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTreeNodes, getItemPath, type TreeBuildState } from './treeBuilder';
import type { WorkItem } from '../types';

// Mock the logger to avoid console output in tests
vi.mock('./logger', () => ({
  logger: {
    warn: vi.fn(),
    tree: {
      warn: vi.fn(),
    },
  },
}));

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

// Default tree build state
const defaultState: TreeBuildState = {
  expandedIds: new Set(),
  selectedItemId: null,
  focusedItemId: null,
};

describe('buildTreeNodes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array for empty input', () => {
    const result = buildTreeNodes([], defaultState);
    expect(result).toEqual([]);
  });

  it('should build tree with single root item', () => {
    const items = [createMockItem({ id: 'root', title: 'Root' })];
    const result = buildTreeNodes(items, defaultState);

    expect(result).toHaveLength(1);
    expect(result[0].item.id).toBe('root');
    expect(result[0].level).toBe(0);
    expect(result[0].children).toEqual([]);
  });

  it('should build tree with parent-child relationship', () => {
    const items = [
      createMockItem({ id: 'parent', title: 'Parent' }),
      createMockItem({ id: 'child', title: 'Child', parentId: 'parent' }),
    ];
    const result = buildTreeNodes(items, defaultState);

    expect(result).toHaveLength(1);
    expect(result[0].item.id).toBe('parent');
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].item.id).toBe('child');
    expect(result[0].children[0].level).toBe(1);
  });

  it('should build tree with multiple levels of nesting', () => {
    const items = [
      createMockItem({ id: 'grandparent', title: 'Grandparent' }),
      createMockItem({ id: 'parent', title: 'Parent', parentId: 'grandparent' }),
      createMockItem({ id: 'child', title: 'Child', parentId: 'parent' }),
    ];
    const result = buildTreeNodes(items, defaultState);

    expect(result).toHaveLength(1);
    expect(result[0].item.id).toBe('grandparent');
    expect(result[0].children[0].item.id).toBe('parent');
    expect(result[0].children[0].children[0].item.id).toBe('child');
    expect(result[0].children[0].children[0].level).toBe(2);
  });

  it('should handle multiple root items', () => {
    const items = [
      createMockItem({ id: 'root1', title: 'Root 1' }),
      createMockItem({ id: 'root2', title: 'Root 2' }),
      createMockItem({ id: 'child1', title: 'Child 1', parentId: 'root1' }),
    ];
    const result = buildTreeNodes(items, defaultState);

    expect(result).toHaveLength(2);
    expect(result[0].item.id).toBe('root1');
    expect(result[1].item.id).toBe('root2');
    expect(result[0].children).toHaveLength(1);
    expect(result[1].children).toHaveLength(0);
  });

  it('should treat items with missing parent as roots (orphaned by filter)', () => {
    const items = [
      createMockItem({ id: 'orphan', title: 'Orphan', parentId: 'missing-parent' }),
      createMockItem({ id: 'child', title: 'Child', parentId: 'orphan' }),
    ];
    const result = buildTreeNodes(items, defaultState);

    // 'orphan' becomes a root because its parent is not in the filtered set
    expect(result).toHaveLength(1);
    expect(result[0].item.id).toBe('orphan');
    expect(result[0].level).toBe(0);
    expect(result[0].children).toHaveLength(1);
  });

  it('should mark expanded nodes correctly', () => {
    const items = [
      createMockItem({ id: 'parent', title: 'Parent' }),
      createMockItem({ id: 'child', title: 'Child', parentId: 'parent' }),
    ];
    const state: TreeBuildState = {
      expandedIds: new Set(['parent']),
      selectedItemId: null,
      focusedItemId: null,
    };
    const result = buildTreeNodes(items, state);

    expect(result[0].isExpanded).toBe(true);
    expect(result[0].children[0].isExpanded).toBe(false);
  });

  it('should mark selected node correctly', () => {
    const items = [
      createMockItem({ id: 'item1', title: 'Item 1' }),
      createMockItem({ id: 'item2', title: 'Item 2' }),
    ];
    const state: TreeBuildState = {
      expandedIds: new Set(),
      selectedItemId: 'item2',
      focusedItemId: null,
    };
    const result = buildTreeNodes(items, state);

    expect(result[0].isSelected).toBe(false);
    expect(result[1].isSelected).toBe(true);
  });

  it('should mark highlighted (focused) node correctly', () => {
    const items = [
      createMockItem({ id: 'item1', title: 'Item 1' }),
      createMockItem({ id: 'item2', title: 'Item 2' }),
    ];
    const state: TreeBuildState = {
      expandedIds: new Set(),
      selectedItemId: null,
      focusedItemId: 'item1',
    };
    const result = buildTreeNodes(items, state);

    expect(result[0].isHighlighted).toBe(true);
    expect(result[1].isHighlighted).toBe(false);
  });

  it('should handle circular references gracefully', () => {
    // Create circular reference: A -> B -> A
    // Both items have their parent in the filtered set, so neither is a "root"
    const items = [
      createMockItem({ id: 'A', title: 'A', parentId: 'B' }),
      createMockItem({ id: 'B', title: 'B', parentId: 'A' }),
    ];

    // This should not throw - the function handles this edge case
    const result = buildTreeNodes(items, defaultState);

    // Neither item is a root because both have parents that exist in the filtered set
    // This is correct behavior - circular references create no valid tree roots
    expect(result.length).toBe(0);
  });

  it('should handle multiple children for single parent', () => {
    const items = [
      createMockItem({ id: 'parent', title: 'Parent' }),
      createMockItem({ id: 'child1', title: 'Child 1', parentId: 'parent' }),
      createMockItem({ id: 'child2', title: 'Child 2', parentId: 'parent' }),
      createMockItem({ id: 'child3', title: 'Child 3', parentId: 'parent' }),
    ];
    const result = buildTreeNodes(items, defaultState);

    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(3);
  });
});

describe('getItemPath', () => {
  it('should return empty array for non-existent item', () => {
    const items = new Map<string, WorkItem>();
    const result = getItemPath('non-existent', items);
    expect(result).toEqual([]);
  });

  it('should return single item for root item', () => {
    const root = createMockItem({ id: 'root', title: 'Root' });
    const items = new Map<string, WorkItem>([['root', root]]);
    const result = getItemPath('root', items);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('root');
  });

  it('should return path from root to target', () => {
    const grandparent = createMockItem({ id: 'gp', title: 'Grandparent' });
    const parent = createMockItem({ id: 'p', title: 'Parent', parentId: 'gp' });
    const child = createMockItem({ id: 'c', title: 'Child', parentId: 'p' });

    const items = new Map<string, WorkItem>([
      ['gp', grandparent],
      ['p', parent],
      ['c', child],
    ]);

    const result = getItemPath('c', items);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('gp');
    expect(result[1].id).toBe('p');
    expect(result[2].id).toBe('c');
  });

  it('should stop at missing parent', () => {
    const child = createMockItem({ id: 'child', title: 'Child', parentId: 'missing' });
    const items = new Map<string, WorkItem>([['child', child]]);

    const result = getItemPath('child', items);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('child');
  });

  it('should handle circular references', () => {
    const a = createMockItem({ id: 'a', title: 'A', parentId: 'b' });
    const b = createMockItem({ id: 'b', title: 'B', parentId: 'a' });

    const items = new Map<string, WorkItem>([
      ['a', a],
      ['b', b],
    ]);

    // Should not throw or loop forever
    const result = getItemPath('a', items);

    // Should return a valid path without infinite loop
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.length).toBeLessThanOrEqual(3); // At most a -> b -> a (detected)
  });
});
