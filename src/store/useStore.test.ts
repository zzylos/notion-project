import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';
import type { WorkItem } from '../types';

// Sample work items for testing
const createMockItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: 'test-id',
  title: 'Test Item',
  type: 'project',
  status: 'In Progress',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('useStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { setItems, resetFilters, setSelectedItem, setFocusedItem, collapseAll } =
      useStore.getState();
    setItems([]);
    resetFilters();
    setSelectedItem(null);
    setFocusedItem(null);
    collapseAll();
  });

  describe('setItems', () => {
    it('should set items as a Map', () => {
      const items = [createMockItem({ id: '1', title: 'Item 1' })];

      useStore.getState().setItems(items);

      const state = useStore.getState();
      expect(state.items.size).toBe(1);
      expect(state.items.get('1')?.title).toBe('Item 1');
    });

    it('should handle multiple items', () => {
      const items = [
        createMockItem({ id: '1', title: 'Item 1' }),
        createMockItem({ id: '2', title: 'Item 2' }),
        createMockItem({ id: '3', title: 'Item 3' }),
      ];

      useStore.getState().setItems(items);

      expect(useStore.getState().items.size).toBe(3);
    });
  });

  describe('getFilteredItems', () => {
    const setupItems = () => {
      const items = [
        createMockItem({ id: '1', type: 'mission', status: 'In Progress', priority: 'P0' }),
        createMockItem({ id: '2', type: 'problem', status: 'Completed', priority: 'P1' }),
        createMockItem({ id: '3', type: 'solution', status: 'In Progress', priority: 'P2' }),
        createMockItem({ id: '4', type: 'project', status: 'Blocked', priority: 'P3' }),
      ];
      useStore.getState().setItems(items);
    };

    it('should return all items when no filters are applied', () => {
      setupItems();

      const filtered = useStore.getState().getFilteredItems();
      expect(filtered.length).toBe(4);
    });

    it('should filter by type', () => {
      setupItems();

      useStore.getState().setFilters({ types: ['mission', 'problem'] });

      const filtered = useStore.getState().getFilteredItems();
      expect(filtered.length).toBe(2);
      expect(filtered.every(item => ['mission', 'problem'].includes(item.type))).toBe(true);
    });

    it('should filter by status', () => {
      setupItems();

      useStore.getState().setFilters({ statuses: ['In Progress'] });

      const filtered = useStore.getState().getFilteredItems();
      expect(filtered.length).toBe(2);
      expect(filtered.every(item => item.status === 'In Progress')).toBe(true);
    });

    it('should filter by priority', () => {
      setupItems();

      useStore.getState().setFilters({ priorities: ['P0', 'P1'] });

      const filtered = useStore.getState().getFilteredItems();
      expect(filtered.length).toBe(2);
      expect(filtered.every(item => ['P0', 'P1'].includes(item.priority!))).toBe(true);
    });

    it('should filter by search query', () => {
      const items = [
        createMockItem({ id: '1', title: 'Authentication Feature' }),
        createMockItem({ id: '2', title: 'Database Migration' }),
        createMockItem({ id: '3', title: 'User Auth Flow' }),
      ];
      useStore.getState().setItems(items);

      useStore.getState().setFilters({ searchQuery: 'auth' });

      const filtered = useStore.getState().getFilteredItems();
      expect(filtered.length).toBe(2);
    });

    it('should combine multiple filters with AND logic', () => {
      setupItems();

      useStore.getState().setFilters({
        types: ['mission', 'solution'],
        statuses: ['In Progress'],
      });

      const filtered = useStore.getState().getFilteredItems();
      expect(filtered.length).toBe(2);
    });

    it('should support hide mode (inverse filtering)', () => {
      setupItems();

      useStore.getState().setFilters({
        types: ['mission'],
        filterMode: 'hide',
      });

      const filtered = useStore.getState().getFilteredItems();
      expect(filtered.length).toBe(3);
      expect(filtered.every(item => item.type !== 'mission')).toBe(true);
    });
  });

  describe('getTreeNodes', () => {
    it('should build tree from hierarchical items', () => {
      const items = [
        createMockItem({ id: 'parent', title: 'Parent', parentId: undefined }),
        createMockItem({ id: 'child1', title: 'Child 1', parentId: 'parent' }),
        createMockItem({ id: 'child2', title: 'Child 2', parentId: 'parent' }),
      ];
      useStore.getState().setItems(items);

      const treeNodes = useStore.getState().getTreeNodes();

      expect(treeNodes.length).toBe(1); // Only root node at top level
      expect(treeNodes[0].item.id).toBe('parent');
      expect(treeNodes[0].children.length).toBe(2);
    });

    it('should handle orphaned items (parent not in filtered set)', () => {
      const items = [
        createMockItem({ id: '1', parentId: 'non-existent' }),
        createMockItem({ id: '2', parentId: undefined }),
      ];
      useStore.getState().setItems(items);

      const treeNodes = useStore.getState().getTreeNodes();

      // Both items should appear as roots since the parent doesn't exist
      expect(treeNodes.length).toBe(2);
    });

    it('should mark expanded nodes correctly', () => {
      const items = [
        createMockItem({ id: 'parent', parentId: undefined }),
        createMockItem({ id: 'child', parentId: 'parent' }),
      ];
      useStore.getState().setItems(items);
      useStore.getState().toggleExpanded('parent');

      const treeNodes = useStore.getState().getTreeNodes();

      expect(treeNodes[0].isExpanded).toBe(true);
    });

    it('should mark selected nodes correctly', () => {
      const items = [createMockItem({ id: 'item1' })];
      useStore.getState().setItems(items);
      useStore.getState().setSelectedItem('item1');

      const treeNodes = useStore.getState().getTreeNodes();

      expect(treeNodes[0].isSelected).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should calculate correct statistics', () => {
      const items = [
        createMockItem({ id: '1', type: 'mission', status: 'In Progress', priority: 'P0' }),
        createMockItem({ id: '2', type: 'mission', status: 'Completed', priority: 'P1' }),
        createMockItem({ id: '3', type: 'problem', status: 'Completed', priority: 'P0' }),
        createMockItem({ id: '4', type: 'project', status: 'Blocked', priority: 'P2' }),
      ];
      useStore.getState().setItems(items);

      const stats = useStore.getState().getStats();

      expect(stats.totalItems).toBe(4);
      expect(stats.byType.mission).toBe(2);
      expect(stats.byType.problem).toBe(1);
      expect(stats.byType.project).toBe(1);
      expect(stats.byPriority.P0).toBe(2);
      expect(stats.byPriority.P1).toBe(1);
      expect(stats.completionRate).toBe(50); // 2 completed out of 4
      expect(stats.blockedItems).toBe(1);
    });

    it('should count overdue items', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow

      const items = [
        createMockItem({ id: '1', status: 'In Progress', dueDate: pastDate }),
        createMockItem({ id: '2', status: 'In Progress', dueDate: futureDate }),
        createMockItem({ id: '3', status: 'Completed', dueDate: pastDate }), // Completed, not overdue
      ];
      useStore.getState().setItems(items);

      const stats = useStore.getState().getStats();

      expect(stats.overdueItems).toBe(1);
    });
  });

  describe('getItemPath', () => {
    it('should return path from root to item', () => {
      const items = [
        createMockItem({ id: 'grandparent', parentId: undefined }),
        createMockItem({ id: 'parent', parentId: 'grandparent' }),
        createMockItem({ id: 'child', parentId: 'parent' }),
      ];
      useStore.getState().setItems(items);

      const path = useStore.getState().getItemPath('child');

      expect(path.length).toBe(3);
      expect(path[0].id).toBe('grandparent');
      expect(path[1].id).toBe('parent');
      expect(path[2].id).toBe('child');
    });

    it('should handle circular references gracefully', () => {
      // Create a circular reference (should not happen in practice but we handle it)
      const items = [
        createMockItem({ id: 'a', parentId: 'b' }),
        createMockItem({ id: 'b', parentId: 'a' }),
      ];
      useStore.getState().setItems(items);

      // Should not throw or hang
      const path = useStore.getState().getItemPath('a');

      // Path should be limited due to cycle detection
      expect(path.length).toBeLessThanOrEqual(2);
    });
  });

  describe('selection and expansion', () => {
    it('should toggle expansion state', () => {
      useStore.getState().toggleExpanded('item1');
      expect(useStore.getState().expandedIds.has('item1')).toBe(true);

      useStore.getState().toggleExpanded('item1');
      expect(useStore.getState().expandedIds.has('item1')).toBe(false);
    });

    it('should expand all items', () => {
      const items = [
        createMockItem({ id: '1' }),
        createMockItem({ id: '2' }),
        createMockItem({ id: '3' }),
      ];
      useStore.getState().setItems(items);

      useStore.getState().expandAll();

      expect(useStore.getState().expandedIds.size).toBe(3);
    });

    it('should collapse all items', () => {
      useStore.getState().toggleExpanded('item1');
      useStore.getState().toggleExpanded('item2');

      useStore.getState().collapseAll();

      expect(useStore.getState().expandedIds.size).toBe(0);
    });

    it('should expand to a specific item', () => {
      const items = [
        createMockItem({ id: 'root', parentId: undefined }),
        createMockItem({ id: 'middle', parentId: 'root' }),
        createMockItem({ id: 'target', parentId: 'middle' }),
      ];
      useStore.getState().setItems(items);

      useStore.getState().expandToItem('target');

      expect(useStore.getState().expandedIds.has('root')).toBe(true);
      expect(useStore.getState().expandedIds.has('middle')).toBe(true);
      expect(useStore.getState().expandedIds.has('target')).toBe(true);
      expect(useStore.getState().focusedItemId).toBe('target');
    });
  });

  describe('item CRUD operations', () => {
    it('should add a single item', () => {
      const item = createMockItem({ id: 'new-item' });

      useStore.getState().addItem(item);

      expect(useStore.getState().items.get('new-item')).toBeDefined();
    });

    it('should update an existing item', () => {
      useStore.getState().setItems([createMockItem({ id: '1', title: 'Original' })]);

      useStore.getState().updateItem('1', { title: 'Updated' });

      expect(useStore.getState().items.get('1')?.title).toBe('Updated');
    });

    it('should remove an item', () => {
      useStore.getState().setItems([createMockItem({ id: '1' }), createMockItem({ id: '2' })]);

      useStore.getState().removeItem('1');

      expect(useStore.getState().items.size).toBe(1);
      expect(useStore.getState().items.has('1')).toBe(false);
    });
  });
});
