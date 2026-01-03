import { describe, it, expect } from 'vitest';
import {
  itemMatchesIncludeFilters,
  itemMatchesExcludeFilters,
  collectAncestorIds,
  isOrphanItem,
  itemMatchesSearch,
  applyOrphanFilter,
  hasActiveIncludeFilters,
  hasActiveExcludeFilters,
} from './filterUtils';
import type { WorkItem, FilterState } from '../types';

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

// Default empty filter state
const createEmptyFilters = (): FilterState => ({
  types: [],
  excludeTypes: [],
  statuses: [],
  excludeStatuses: [],
  priorities: [],
  excludePriorities: [],
  owners: [],
  excludeOwners: [],
  searchQuery: '',
  filterMode: 'show',
});

describe('itemMatchesIncludeFilters', () => {
  it('should return true when no filters are set', () => {
    const item = createMockItem();
    const filters = createEmptyFilters();
    expect(itemMatchesIncludeFilters(item, filters)).toBe(true);
  });

  describe('type filter', () => {
    it('should return true when item type matches filter', () => {
      const item = createMockItem({ type: 'project' });
      const filters = createEmptyFilters();
      filters.types = ['project', 'mission'];
      expect(itemMatchesIncludeFilters(item, filters)).toBe(true);
    });

    it('should return false when item type does not match filter', () => {
      const item = createMockItem({ type: 'project' });
      const filters = createEmptyFilters();
      filters.types = ['mission', 'problem'];
      expect(itemMatchesIncludeFilters(item, filters)).toBe(false);
    });
  });

  describe('status filter', () => {
    it('should return true when item status matches filter', () => {
      const item = createMockItem({ status: 'In Progress' });
      const filters = createEmptyFilters();
      filters.statuses = ['In Progress', 'Done'];
      expect(itemMatchesIncludeFilters(item, filters)).toBe(true);
    });

    it('should return false when item status does not match filter', () => {
      const item = createMockItem({ status: 'In Progress' });
      const filters = createEmptyFilters();
      filters.statuses = ['Done', 'Blocked'];
      expect(itemMatchesIncludeFilters(item, filters)).toBe(false);
    });
  });

  describe('priority filter', () => {
    it('should return true when item priority matches filter', () => {
      const item = createMockItem({ priority: 'P1' });
      const filters = createEmptyFilters();
      filters.priorities = ['P1', 'P2'];
      expect(itemMatchesIncludeFilters(item, filters)).toBe(true);
    });

    it('should return false when item priority does not match filter', () => {
      const item = createMockItem({ priority: 'P3' });
      const filters = createEmptyFilters();
      filters.priorities = ['P0', 'P1'];
      expect(itemMatchesIncludeFilters(item, filters)).toBe(false);
    });

    it('should return false when item has no priority but filter requires one', () => {
      const item = createMockItem({ priority: undefined });
      const filters = createEmptyFilters();
      filters.priorities = ['P0', 'P1'];
      expect(itemMatchesIncludeFilters(item, filters)).toBe(false);
    });
  });

  describe('owner filter', () => {
    it('should return true when item owner matches filter', () => {
      const item = createMockItem({
        owner: { id: 'user-1', name: 'John' },
      });
      const filters = createEmptyFilters();
      filters.owners = ['user-1', 'user-2'];
      expect(itemMatchesIncludeFilters(item, filters)).toBe(true);
    });

    it('should return false when item owner does not match filter', () => {
      const item = createMockItem({
        owner: { id: 'user-3', name: 'Jane' },
      });
      const filters = createEmptyFilters();
      filters.owners = ['user-1', 'user-2'];
      expect(itemMatchesIncludeFilters(item, filters)).toBe(false);
    });

    it('should return false when item has no owner but filter requires one', () => {
      const item = createMockItem({ owner: undefined });
      const filters = createEmptyFilters();
      filters.owners = ['user-1'];
      expect(itemMatchesIncludeFilters(item, filters)).toBe(false);
    });
  });

  describe('combined filters', () => {
    it('should return true when all filters match (AND logic)', () => {
      const item = createMockItem({
        type: 'project',
        status: 'In Progress',
        priority: 'P1',
        owner: { id: 'user-1', name: 'John' },
      });
      const filters = createEmptyFilters();
      filters.types = ['project'];
      filters.statuses = ['In Progress'];
      filters.priorities = ['P1'];
      filters.owners = ['user-1'];
      expect(itemMatchesIncludeFilters(item, filters)).toBe(true);
    });

    it('should return false when any filter does not match', () => {
      const item = createMockItem({
        type: 'project',
        status: 'In Progress',
        priority: 'P1',
      });
      const filters = createEmptyFilters();
      filters.types = ['project'];
      filters.statuses = ['Done']; // Does not match
      expect(itemMatchesIncludeFilters(item, filters)).toBe(false);
    });
  });
});

describe('itemMatchesExcludeFilters', () => {
  it('should return false when no exclude filters are set', () => {
    const item = createMockItem();
    const filters = createEmptyFilters();
    expect(itemMatchesExcludeFilters(item, filters)).toBe(false);
  });

  describe('exclude type filter', () => {
    it('should return true (exclude) when item type is in exclude list', () => {
      const item = createMockItem({ type: 'project' });
      const filters = createEmptyFilters();
      filters.excludeTypes = ['project'];
      expect(itemMatchesExcludeFilters(item, filters)).toBe(true);
    });

    it('should return false when item type is not in exclude list', () => {
      const item = createMockItem({ type: 'mission' });
      const filters = createEmptyFilters();
      filters.excludeTypes = ['project'];
      expect(itemMatchesExcludeFilters(item, filters)).toBe(false);
    });
  });

  describe('exclude status filter', () => {
    it('should return true (exclude) when item status is in exclude list', () => {
      const item = createMockItem({ status: 'Done' });
      const filters = createEmptyFilters();
      filters.excludeStatuses = ['Done', 'Cancelled'];
      expect(itemMatchesExcludeFilters(item, filters)).toBe(true);
    });

    it('should return false when item status is not in exclude list', () => {
      const item = createMockItem({ status: 'In Progress' });
      const filters = createEmptyFilters();
      filters.excludeStatuses = ['Done'];
      expect(itemMatchesExcludeFilters(item, filters)).toBe(false);
    });
  });

  describe('exclude priority filter', () => {
    it('should return true (exclude) when item priority is in exclude list', () => {
      const item = createMockItem({ priority: 'P3' });
      const filters = createEmptyFilters();
      filters.excludePriorities = ['P3'];
      expect(itemMatchesExcludeFilters(item, filters)).toBe(true);
    });

    it('should return false when item has no priority', () => {
      const item = createMockItem({ priority: undefined });
      const filters = createEmptyFilters();
      filters.excludePriorities = ['P3'];
      expect(itemMatchesExcludeFilters(item, filters)).toBe(false);
    });
  });

  describe('exclude owner filter', () => {
    it('should return true (exclude) when item owner is in exclude list', () => {
      const item = createMockItem({
        owner: { id: 'user-1', name: 'John' },
      });
      const filters = createEmptyFilters();
      filters.excludeOwners = ['user-1'];
      expect(itemMatchesExcludeFilters(item, filters)).toBe(true);
    });

    it('should return false when item has no owner', () => {
      const item = createMockItem({ owner: undefined });
      const filters = createEmptyFilters();
      filters.excludeOwners = ['user-1'];
      expect(itemMatchesExcludeFilters(item, filters)).toBe(false);
    });
  });
});

describe('collectAncestorIds', () => {
  it('should return empty set for undefined start ID', () => {
    const items = new Map<string, WorkItem>();
    const result = collectAncestorIds(undefined, items);
    expect(result.size).toBe(0);
  });

  it('should return set with single ID for root item', () => {
    const root = createMockItem({ id: 'root' });
    const items = new Map<string, WorkItem>([['root', root]]);
    const result = collectAncestorIds('root', items);

    expect(result.size).toBe(1);
    expect(result.has('root')).toBe(true);
  });

  it('should collect all ancestors up to root', () => {
    const grandparent = createMockItem({ id: 'gp' });
    const parent = createMockItem({ id: 'p', parentId: 'gp' });
    const child = createMockItem({ id: 'c', parentId: 'p' });

    const items = new Map<string, WorkItem>([
      ['gp', grandparent],
      ['p', parent],
      ['c', child],
    ]);

    const result = collectAncestorIds('c', items);

    expect(result.size).toBe(3);
    expect(result.has('c')).toBe(true);
    expect(result.has('p')).toBe(true);
    expect(result.has('gp')).toBe(true);
  });

  it('should stop at missing parent', () => {
    const child = createMockItem({ id: 'child', parentId: 'missing' });
    const items = new Map<string, WorkItem>([['child', child]]);

    const result = collectAncestorIds('child', items);

    // The function adds the parentId to the set before checking if the parent exists
    // So it includes 'child' and 'missing' (but stops there since 'missing' has no parentId)
    expect(result.size).toBe(2);
    expect(result.has('child')).toBe(true);
    expect(result.has('missing')).toBe(true);
  });

  it('should handle circular references without infinite loop', () => {
    const a = createMockItem({ id: 'a', parentId: 'b' });
    const b = createMockItem({ id: 'b', parentId: 'a' });

    const items = new Map<string, WorkItem>([
      ['a', a],
      ['b', b],
    ]);

    const result = collectAncestorIds('a', items);

    // Should detect circular reference and stop
    expect(result.has('a')).toBe(true);
    expect(result.has('b')).toBe(true);
    expect(result.size).toBe(2);
  });
});

describe('isOrphanItem', () => {
  it('should return true for item with no parent and no children', () => {
    const item = createMockItem({ id: 'orphan' });
    const items = new Map<string, WorkItem>([['orphan', item]]);

    expect(isOrphanItem(item, items)).toBe(true);
  });

  it('should return false for item with existing parent', () => {
    const parent = createMockItem({ id: 'parent' });
    const child = createMockItem({ id: 'child', parentId: 'parent' });

    const items = new Map<string, WorkItem>([
      ['parent', parent],
      ['child', child],
    ]);

    expect(isOrphanItem(child, items)).toBe(false);
  });

  it('should return true for item with non-existent parent', () => {
    const orphan = createMockItem({ id: 'orphan', parentId: 'missing' });
    const items = new Map<string, WorkItem>([['orphan', orphan]]);

    expect(isOrphanItem(orphan, items)).toBe(true);
  });

  it('should return false for item with children in children array', () => {
    const parent = createMockItem({ id: 'parent', children: ['child'] });
    const child = createMockItem({ id: 'child', parentId: 'parent' });

    const items = new Map<string, WorkItem>([
      ['parent', parent],
      ['child', child],
    ]);

    expect(isOrphanItem(parent, items)).toBe(false);
  });

  it('should return false for item that is parent of another item', () => {
    const parent = createMockItem({ id: 'parent' });
    const child = createMockItem({ id: 'child', parentId: 'parent' });

    const items = new Map<string, WorkItem>([
      ['parent', parent],
      ['child', child],
    ]);

    expect(isOrphanItem(parent, items)).toBe(false);
  });

  it('should return true when children array has non-existent IDs', () => {
    const item = createMockItem({ id: 'item', children: ['missing1', 'missing2'] });
    const items = new Map<string, WorkItem>([['item', item]]);

    expect(isOrphanItem(item, items)).toBe(true);
  });
});

describe('itemMatchesSearch', () => {
  it('should return true for empty query', () => {
    const item = createMockItem({ title: 'Test' });
    expect(itemMatchesSearch(item, '')).toBe(true);
  });

  it('should match title (case insensitive)', () => {
    const item = createMockItem({ title: 'My Project Title' });
    expect(itemMatchesSearch(item, 'project')).toBe(true);
    expect(itemMatchesSearch(item, 'PROJECT')).toBe(true);
    expect(itemMatchesSearch(item, 'xyz')).toBe(false);
  });

  it('should match description', () => {
    const item = createMockItem({
      title: 'Title',
      description: 'This is a detailed description',
    });
    expect(itemMatchesSearch(item, 'detailed')).toBe(true);
  });

  it('should match tags', () => {
    const item = createMockItem({
      title: 'Title',
      tags: ['frontend', 'backend', 'api'],
    });
    expect(itemMatchesSearch(item, 'frontend')).toBe(true);
    expect(itemMatchesSearch(item, 'API')).toBe(true);
  });

  it('should return false when no field matches', () => {
    const item = createMockItem({
      title: 'Project',
      description: 'Description',
      tags: ['tag1'],
    });
    expect(itemMatchesSearch(item, 'nonexistent')).toBe(false);
  });
});

describe('applyOrphanFilter', () => {
  it('should return true for all items when both filters are off', () => {
    const orphan = createMockItem({ id: 'orphan' });
    const items = new Map<string, WorkItem>([['orphan', orphan]]);

    expect(applyOrphanFilter(orphan, items, false, false)).toBe(true);
  });

  it('should return true only for orphans when showOnlyOrphans is true', () => {
    const orphan = createMockItem({ id: 'orphan' });
    const parent = createMockItem({ id: 'parent' });
    const child = createMockItem({ id: 'child', parentId: 'parent' });

    const items = new Map<string, WorkItem>([
      ['orphan', orphan],
      ['parent', parent],
      ['child', child],
    ]);

    expect(applyOrphanFilter(orphan, items, true, false)).toBe(true);
    expect(applyOrphanFilter(child, items, true, false)).toBe(false);
  });

  it('should hide orphans when hideOrphanItems is true', () => {
    const orphan = createMockItem({ id: 'orphan' });
    const parent = createMockItem({ id: 'parent' });
    const child = createMockItem({ id: 'child', parentId: 'parent' });

    const items = new Map<string, WorkItem>([
      ['orphan', orphan],
      ['parent', parent],
      ['child', child],
    ]);

    expect(applyOrphanFilter(orphan, items, false, true)).toBe(false);
    expect(applyOrphanFilter(child, items, false, true)).toBe(true);
  });
});

describe('hasActiveIncludeFilters', () => {
  it('should return false when no filters are set', () => {
    const filters = createEmptyFilters();
    expect(hasActiveIncludeFilters(filters)).toBe(false);
  });

  it('should return true when types filter is set', () => {
    const filters = createEmptyFilters();
    filters.types = ['project'];
    expect(hasActiveIncludeFilters(filters)).toBe(true);
  });

  it('should return true when statuses filter is set', () => {
    const filters = createEmptyFilters();
    filters.statuses = ['In Progress'];
    expect(hasActiveIncludeFilters(filters)).toBe(true);
  });

  it('should return true when priorities filter is set', () => {
    const filters = createEmptyFilters();
    filters.priorities = ['P1'];
    expect(hasActiveIncludeFilters(filters)).toBe(true);
  });

  it('should return true when owners filter is set', () => {
    const filters = createEmptyFilters();
    filters.owners = ['user-1'];
    expect(hasActiveIncludeFilters(filters)).toBe(true);
  });
});

describe('hasActiveExcludeFilters', () => {
  it('should return false when no exclude filters are set', () => {
    const filters = createEmptyFilters();
    expect(hasActiveExcludeFilters(filters)).toBe(false);
  });

  it('should return true when excludeTypes is set', () => {
    const filters = createEmptyFilters();
    filters.excludeTypes = ['project'];
    expect(hasActiveExcludeFilters(filters)).toBe(true);
  });

  it('should return true when excludeStatuses is set', () => {
    const filters = createEmptyFilters();
    filters.excludeStatuses = ['Done'];
    expect(hasActiveExcludeFilters(filters)).toBe(true);
  });

  it('should return true when excludePriorities is set', () => {
    const filters = createEmptyFilters();
    filters.excludePriorities = ['P3'];
    expect(hasActiveExcludeFilters(filters)).toBe(true);
  });

  it('should return true when excludeOwners is set', () => {
    const filters = createEmptyFilters();
    filters.excludeOwners = ['user-1'];
    expect(hasActiveExcludeFilters(filters)).toBe(true);
  });

  it('should handle undefined exclude arrays gracefully', () => {
    // Test with a filter state that might have undefined exclude arrays
    const filters = {
      types: [],
      statuses: [],
      priorities: [],
      owners: [],
      searchQuery: '',
      filterMode: 'show' as const,
      // Explicitly not setting exclude arrays to test defensive coding
    } as unknown as FilterState;

    expect(hasActiveExcludeFilters(filters)).toBe(false);
  });
});
