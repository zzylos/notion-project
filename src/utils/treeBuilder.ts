/**
 * Tree building utilities for hierarchical work item visualization.
 *
 * This module provides functions for building and manipulating tree structures
 * from flat work item arrays. It includes safety features like cycle detection
 * and depth limiting.
 */

import type { WorkItem, TreeNode } from '../types';
import { TREE } from '../constants';
import { logger } from './logger';

/**
 * Collect all ancestor IDs from a starting item up to root.
 * Used to ensure focused items and their ancestors bypass filters,
 * and for building connected item sets in canvas view.
 *
 * Features:
 * - Circular reference detection (stops if item already visited)
 * - Iteration limiting (prevents infinite loops from pathological data)
 * - Can either return a new Set or mutate an existing one
 *
 * @param startId - The starting item ID (can be undefined)
 * @param items - Map of all work items
 * @param existingSet - Optional existing Set to add ancestors to (mutates in place)
 * @returns Set of all ancestor IDs including the starting item
 *
 * @example
 * // Get ancestors as new Set
 * const ancestors = collectAncestorIds('item-123', itemsMap);
 *
 * // Add ancestors to existing Set (for building connected items)
 * const connected = new Set<string>();
 * collectAncestorIds('item-123', itemsMap, connected);
 */
export function collectAncestorIds(
  startId: string | undefined,
  items: Map<string, WorkItem>,
  existingSet?: Set<string>
): Set<string> {
  const ancestors = existingSet ?? new Set<string>();
  let currentId = startId;

  // Safety: limit iterations to prevent infinite loops from circular references
  let iterations = 0;

  while (currentId && iterations < TREE.MAX_ANCESTOR_ITERATIONS) {
    // Circular reference detection
    if (ancestors.has(currentId)) {
      break;
    }
    ancestors.add(currentId);
    currentId = items.get(currentId)?.parentId;
    iterations++;
  }

  return ancestors;
}

/**
 * State needed for building tree nodes.
 */
export interface TreeBuildState {
  /** Set of expanded node IDs */
  expandedIds: Set<string>;
  /** Currently selected item ID */
  selectedItemId: string | null;
  /** Currently focused/highlighted item ID */
  focusedItemId: string | null;
}

/**
 * Recursively builds tree nodes for children of a given parent.
 *
 * @param parentId - ID of the parent item (undefined for finding root children)
 * @param level - Current depth in the tree (0 = root level)
 * @param ancestors - Set of ancestor IDs for cycle detection
 * @param filteredItems - All items that passed filtering
 * @param state - Tree build state (expanded IDs, selection, etc.)
 * @returns Array of TreeNode objects for this level
 */
function buildTreeRecursive(
  parentId: string | undefined,
  level: number,
  ancestors: Set<string>,
  filteredItems: WorkItem[],
  state: TreeBuildState
): TreeNode[] {
  // Safety: Prevent stack overflow with very deep nesting
  if (level > TREE.MAX_DEPTH) {
    logger.warn(
      'TreeBuilder',
      `Maximum tree depth (${TREE.MAX_DEPTH}) exceeded, stopping recursion`
    );
    return [];
  }

  // Find all children of this parent
  const children = filteredItems.filter(item => item.parentId === parentId);

  return children.map(item => {
    // Safety: Check for circular reference
    if (ancestors.has(item.id)) {
      logger.tree.warn(`Circular reference detected in tree at item: ${item.id}`);
      return {
        item,
        children: [], // Stop recursion to prevent infinite loop
        level,
        isExpanded: state.expandedIds.has(item.id),
        isSelected: state.selectedItemId === item.id,
        isHighlighted: state.focusedItemId === item.id,
      };
    }

    // Track this item as an ancestor for deeper levels
    const newAncestors = new Set(ancestors);
    newAncestors.add(item.id);

    return {
      item,
      children: buildTreeRecursive(item.id, level + 1, newAncestors, filteredItems, state),
      level,
      isExpanded: state.expandedIds.has(item.id),
      isSelected: state.selectedItemId === item.id,
      isHighlighted: state.focusedItemId === item.id,
    };
  });
}

/**
 * Builds a hierarchical tree structure from filtered work items.
 *
 * ## Algorithm Overview
 *
 * 1. **Filter items**: Start with items that pass current filter criteria
 * 2. **Identify roots**: Items with no parent OR whose parent isn't in the filtered set
 * 3. **Build recursively**: For each root, recursively attach children
 * 4. **Track state**: Mark each node with expansion, selection, and highlight status
 *
 * ## Safety Features
 *
 * - **Circular reference detection**: Tracks ancestors during traversal to prevent
 *   infinite loops if data has circular parent references
 * - **Depth limiting**: Stops recursion at TREE.MAX_DEPTH to prevent stack overflow
 *   from extremely deep hierarchies
 *
 * ## Root Item Identification
 *
 * An item becomes a "root" in the tree if:
 * - It has no parentId (true root), OR
 * - Its parent was filtered out (orphaned by filter)
 *
 * This ensures the tree always shows something useful even when filters hide parents.
 *
 * ## Performance Notes
 *
 * - O(n²) in worst case due to repeated filtering, but acceptable for typical data sizes
 * - Callers should use useMemo with appropriate dependencies
 *
 * @param filteredItems - Array of items that passed filtering
 * @param state - Tree build state (expanded IDs, selection, etc.)
 * @returns Array of TreeNode objects representing the tree structure
 *
 * @example
 * const treeNodes = buildTreeNodes(filteredItems, {
 *   expandedIds: new Set(['id1', 'id2']),
 *   selectedItemId: 'id1',
 *   focusedItemId: null
 * });
 */
export function buildTreeNodes(filteredItems: WorkItem[], state: TreeBuildState): TreeNode[] {
  const filteredIds = new Set(filteredItems.map(i => i.id));

  // Identify root items: no parent OR parent not in filtered set
  const rootItems = filteredItems.filter(item => !item.parentId || !filteredIds.has(item.parentId));

  // Build tree starting from each root
  return rootItems.map(item => {
    const ancestors = new Set<string>([item.id]);
    return {
      item,
      children: buildTreeRecursive(item.id, 1, ancestors, filteredItems, state),
      level: 0,
      isExpanded: state.expandedIds.has(item.id),
      isSelected: state.selectedItemId === item.id,
      isHighlighted: state.focusedItemId === item.id,
    };
  });
}

/**
 * Get the path from root to a specific item.
 *
 * @param id - The item ID to find the path to
 * @param items - Map of all items
 * @returns Array of WorkItems from root to the target item
 */
export function getItemPath(id: string, items: Map<string, WorkItem>): WorkItem[] {
  const path: WorkItem[] = [];
  const visited = new Set<string>(); // Track visited IDs to detect cycles
  let currentId: string | undefined = id;

  while (currentId) {
    // Check for circular reference
    if (visited.has(currentId)) {
      logger.tree.warn(`Circular parent reference detected at item: ${currentId}`);
      break;
    }
    visited.add(currentId);

    const item = items.get(currentId);
    if (item) {
      path.unshift(item);
      currentId = item.parentId;
    } else {
      break;
    }
  }

  return path;
}
