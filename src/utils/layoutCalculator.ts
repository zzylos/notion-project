import type { Node, Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import type { WorkItem } from '../types';
import { typeHexColors, getStatusCategory } from './colors';
import { CANVAS } from '../constants';

const { HORIZONTAL_SPACING, VERTICAL_SPACING, NODE_WIDTH, TREE_GAP } = CANVAS;

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Calculate hierarchical layout for work items in a canvas view.
 * Uses a tree layout algorithm to position nodes based on parent-child relationships.
 *
 * @param filteredItems - Array of work items to layout
 * @param selectedItemId - Currently selected item ID (for highlighting)
 * @returns Object containing positioned nodes and edges for React Flow
 */
export function calculateLayout(
  filteredItems: WorkItem[],
  selectedItemId: string | null
): LayoutResult {
  const nodeList: Node[] = [];
  const edgeList: Edge[] = [];

  // Find root items (no parent or parent not in filtered set)
  const filteredIds = new Set(filteredItems.map(i => i.id));
  const rootItems = filteredItems.filter(item => !item.parentId || !filteredIds.has(item.parentId));

  // Calculate positions using a tree layout algorithm
  const positionMap = new Map<string, { x: number; y: number }>();
  let currentX = 0;

  /**
   * Recursively calculate positions for an item and its children.
   * Leaf nodes are placed at currentX, parents are centered above children.
   */
  const calculatePositions = (item: WorkItem, level: number): number => {
    const children = filteredItems.filter(i => i.parentId === item.id);

    if (children.length === 0) {
      // Leaf node - place at current X position
      const x = currentX;
      positionMap.set(item.id, { x, y: level * VERTICAL_SPACING });
      currentX = x + HORIZONTAL_SPACING;
      return x;
    }

    // Calculate children positions first
    let childXSum = 0;
    let childCount = 0;

    for (const child of children) {
      const childX = calculatePositions(child, level + 1);
      childXSum += childX;
      childCount++;
    }

    // Parent is centered above children (guard against division by zero)
    const avgChildX = childCount > 0 ? childXSum / childCount : currentX;
    positionMap.set(item.id, { x: avgChildX, y: level * VERTICAL_SPACING });

    return avgChildX;
  };

  // Position each root tree with gap between them
  for (const root of rootItems) {
    calculatePositions(root, 0);
    currentX += TREE_GAP;
  }

  // Create nodes from positioned items
  for (const item of filteredItems) {
    const position = positionMap.get(item.id) || { x: 0, y: 0 };

    nodeList.push({
      id: item.id,
      type: 'workItem',
      position,
      data: {
        item,
        isSelected: item.id === selectedItemId,
      },
      style: {
        width: NODE_WIDTH,
      },
    });

    // Create edges for parent-child relationships
    if (item.parentId && filteredIds.has(item.parentId)) {
      edgeList.push({
        id: `${item.parentId}-${item.id}`,
        source: item.parentId,
        target: item.id,
        type: 'smoothstep',
        animated: getStatusCategory(item.status) === 'in-progress',
        style: {
          stroke: typeHexColors[item.type],
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: typeHexColors[item.type],
        },
      });
    }

    // Create edges for blocked-by relationships
    if (item.blockedBy) {
      for (const blockerId of item.blockedBy) {
        if (filteredIds.has(blockerId)) {
          edgeList.push({
            id: `blocked-${blockerId}-${item.id}`,
            source: blockerId,
            target: item.id,
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: '#ef4444',
              strokeWidth: 2,
              strokeDasharray: '5,5',
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#ef4444',
            },
            label: 'blocks',
            labelStyle: { fill: '#ef4444', fontSize: 10 },
          });
        }
      }
    }
  }

  return { nodes: nodeList, edges: edgeList };
}
