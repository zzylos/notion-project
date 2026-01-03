import { describe, it, expect } from 'vitest';
import { calculateLayout } from './layoutCalculator';
import type { WorkItem } from '../types';
import { CANVAS } from '../constants';

// Type for the node data structure used by calculateLayout
interface NodeData {
  item: WorkItem;
  isSelected: boolean;
}

// Helper to get typed node data
const getNodeData = (node: { data: unknown }): NodeData => node.data as NodeData;

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

describe('calculateLayout', () => {
  it('should return empty arrays for empty input', () => {
    const result = calculateLayout([], null);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  describe('nodes', () => {
    it('should create node for single item', () => {
      const items = [createMockItem({ id: 'item1', title: 'Item 1' })];
      const result = calculateLayout(items, null);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('item1');
      expect(result.nodes[0].type).toBe('workItem');
      expect(getNodeData(result.nodes[0]).item.title).toBe('Item 1');
    });

    it('should set isSelected true for selected item', () => {
      const items = [createMockItem({ id: 'item1' }), createMockItem({ id: 'item2' })];
      const result = calculateLayout(items, 'item2');

      expect(getNodeData(result.nodes[0]).isSelected).toBe(false);
      expect(getNodeData(result.nodes[1]).isSelected).toBe(true);
    });

    it('should set node width from CANVAS constant', () => {
      const items = [createMockItem({ id: 'item1' })];
      const result = calculateLayout(items, null);

      expect(result.nodes[0].style?.width).toBe(CANVAS.NODE_WIDTH);
    });

    it('should position root items horizontally', () => {
      const items = [createMockItem({ id: 'root1' }), createMockItem({ id: 'root2' })];
      const result = calculateLayout(items, null);

      // Both are at y=0 (root level)
      expect(result.nodes[0].position.y).toBe(0);
      expect(result.nodes[1].position.y).toBe(0);

      // Second root should be to the right of first
      expect(result.nodes[1].position.x).toBeGreaterThan(result.nodes[0].position.x);
    });

    it('should position children below their parent', () => {
      const items = [
        createMockItem({ id: 'parent' }),
        createMockItem({ id: 'child', parentId: 'parent' }),
      ];
      const result = calculateLayout(items, null);

      const parentNode = result.nodes.find(n => n.id === 'parent');
      const childNode = result.nodes.find(n => n.id === 'child');

      expect(childNode!.position.y).toBe(CANVAS.VERTICAL_SPACING);
      expect(parentNode!.position.y).toBe(0);
    });

    it('should center parent above children', () => {
      const items = [
        createMockItem({ id: 'parent' }),
        createMockItem({ id: 'child1', parentId: 'parent' }),
        createMockItem({ id: 'child2', parentId: 'parent' }),
      ];
      const result = calculateLayout(items, null);

      const parentNode = result.nodes.find(n => n.id === 'parent');
      const child1Node = result.nodes.find(n => n.id === 'child1');
      const child2Node = result.nodes.find(n => n.id === 'child2');

      // Parent should be centered between children
      const childrenAvgX = (child1Node!.position.x + child2Node!.position.x) / 2;
      expect(parentNode!.position.x).toBeCloseTo(childrenAvgX, 0);
    });

    it('should handle multiple levels of nesting', () => {
      const items = [
        createMockItem({ id: 'gp' }),
        createMockItem({ id: 'p', parentId: 'gp' }),
        createMockItem({ id: 'c', parentId: 'p' }),
      ];
      const result = calculateLayout(items, null);

      const gpNode = result.nodes.find(n => n.id === 'gp');
      const pNode = result.nodes.find(n => n.id === 'p');
      const cNode = result.nodes.find(n => n.id === 'c');

      expect(gpNode!.position.y).toBe(0);
      expect(pNode!.position.y).toBe(CANVAS.VERTICAL_SPACING);
      expect(cNode!.position.y).toBe(2 * CANVAS.VERTICAL_SPACING);
    });

    it('should treat items with missing parent as roots', () => {
      const items = [createMockItem({ id: 'orphan', parentId: 'missing' })];
      const result = calculateLayout(items, null);

      expect(result.nodes[0].position.y).toBe(0); // Positioned as root
    });
  });

  describe('edges', () => {
    it('should create edge for parent-child relationship', () => {
      const items = [
        createMockItem({ id: 'parent' }),
        createMockItem({ id: 'child', parentId: 'parent' }),
      ];
      const result = calculateLayout(items, null);

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].source).toBe('parent');
      expect(result.edges[0].target).toBe('child');
    });

    it('should not create edge when parent is not in filtered items', () => {
      const items = [createMockItem({ id: 'orphan', parentId: 'missing' })];
      const result = calculateLayout(items, null);

      expect(result.edges).toHaveLength(0);
    });

    it('should set edge type to smoothstep', () => {
      const items = [
        createMockItem({ id: 'parent' }),
        createMockItem({ id: 'child', parentId: 'parent' }),
      ];
      const result = calculateLayout(items, null);

      expect(result.edges[0].type).toBe('smoothstep');
    });

    it('should animate edge for in-progress items', () => {
      const items = [
        createMockItem({ id: 'parent' }),
        createMockItem({ id: 'child', parentId: 'parent', status: 'In Progress' }),
      ];
      const result = calculateLayout(items, null);

      expect(result.edges[0].animated).toBe(true);
    });

    it('should not animate edge for completed items', () => {
      const items = [
        createMockItem({ id: 'parent' }),
        createMockItem({ id: 'child', parentId: 'parent', status: 'Done' }),
      ];
      const result = calculateLayout(items, null);

      expect(result.edges[0].animated).toBe(false);
    });

    it('should set edge color based on item type', () => {
      const items = [
        createMockItem({ id: 'parent' }),
        createMockItem({ id: 'child', parentId: 'parent', type: 'project' }),
      ];
      const result = calculateLayout(items, null);

      expect(result.edges[0].style?.stroke).toBeDefined();
      expect(result.edges[0].markerEnd).toBeDefined();
    });
  });

  describe('blocked-by edges', () => {
    it('should create edge for blocked-by relationship', () => {
      const items = [
        createMockItem({ id: 'blocker' }),
        createMockItem({ id: 'blocked', blockedBy: ['blocker'] }),
      ];
      const result = calculateLayout(items, null);

      // Should have the blocked-by edge
      const blockedEdge = result.edges.find(e => e.id === 'blocked-blocker-blocked');
      expect(blockedEdge).toBeDefined();
      expect(blockedEdge!.source).toBe('blocker');
      expect(blockedEdge!.target).toBe('blocked');
    });

    it('should style blocked-by edge with dashed line', () => {
      const items = [
        createMockItem({ id: 'blocker' }),
        createMockItem({ id: 'blocked', blockedBy: ['blocker'] }),
      ];
      const result = calculateLayout(items, null);

      const blockedEdge = result.edges.find(e => e.id === 'blocked-blocker-blocked');
      expect(blockedEdge!.style?.strokeDasharray).toBe('5,5');
      expect(blockedEdge!.animated).toBe(true);
    });

    it('should set label on blocked-by edge', () => {
      const items = [
        createMockItem({ id: 'blocker' }),
        createMockItem({ id: 'blocked', blockedBy: ['blocker'] }),
      ];
      const result = calculateLayout(items, null);

      const blockedEdge = result.edges.find(e => e.id === 'blocked-blocker-blocked');
      expect(blockedEdge!.label).toBe('blocks');
    });

    it('should not create blocked-by edge when blocker is not in filtered items', () => {
      const items = [createMockItem({ id: 'blocked', blockedBy: ['missing'] })];
      const result = calculateLayout(items, null);

      expect(result.edges).toHaveLength(0);
    });

    it('should handle multiple blockers', () => {
      const items = [
        createMockItem({ id: 'blocker1' }),
        createMockItem({ id: 'blocker2' }),
        createMockItem({ id: 'blocked', blockedBy: ['blocker1', 'blocker2'] }),
      ];
      const result = calculateLayout(items, null);

      const blockedEdges = result.edges.filter(e => e.id.startsWith('blocked-'));
      expect(blockedEdges).toHaveLength(2);
    });
  });

  describe('complex trees', () => {
    it('should handle multiple separate trees', () => {
      const items = [
        createMockItem({ id: 'tree1-root' }),
        createMockItem({ id: 'tree1-child', parentId: 'tree1-root' }),
        createMockItem({ id: 'tree2-root' }),
        createMockItem({ id: 'tree2-child', parentId: 'tree2-root' }),
      ];
      const result = calculateLayout(items, null);

      expect(result.nodes).toHaveLength(4);

      // Both roots should be at y=0
      const tree1Root = result.nodes.find(n => n.id === 'tree1-root');
      const tree2Root = result.nodes.find(n => n.id === 'tree2-root');
      expect(tree1Root!.position.y).toBe(0);
      expect(tree2Root!.position.y).toBe(0);

      // Second tree should be to the right
      expect(tree2Root!.position.x).toBeGreaterThan(tree1Root!.position.x);
    });

    it('should create correct number of edges', () => {
      const items = [
        createMockItem({ id: 'gp' }),
        createMockItem({ id: 'p1', parentId: 'gp' }),
        createMockItem({ id: 'p2', parentId: 'gp' }),
        createMockItem({ id: 'c1', parentId: 'p1' }),
        createMockItem({ id: 'c2', parentId: 'p1' }),
        createMockItem({ id: 'c3', parentId: 'p2' }),
      ];
      const result = calculateLayout(items, null);

      // Should have 5 parent-child edges: gp->p1, gp->p2, p1->c1, p1->c2, p2->c3
      expect(result.edges).toHaveLength(5);
    });
  });
});
