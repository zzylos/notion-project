/**
 * Tree building utilities for hierarchical work item visualization.
 */

import type { WorkItem, TreeNode } from '../types';
import { TREE } from '../constants';

/**
 * Collect all ancestor IDs from a starting item up to root.
 */
export function collectAncestorIds(
  startId: string | undefined,
  items: Map<string, WorkItem>,
  existingSet?: Set<string>
): Set<string> {
  const ancestors = existingSet ?? new Set<string>();
  let currentId = startId;
  let iterations = 0;

  while (currentId && iterations < TREE.MAX_ANCESTOR_ITERATIONS) {
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
  expandedIds: Set<string>;
  selectedItemId: string | null;
  focusedItemId: string | null;
}

/**
 * Recursively builds tree nodes for children of a given parent.
 */
function buildTreeRecursive(
  parentId: string | undefined,
  level: number,
  ancestors: Set<string>,
  filteredItems: WorkItem[],
  state: TreeBuildState
): TreeNode[] {
  if (level > TREE.MAX_DEPTH) {
    return [];
  }

  const children = filteredItems.filter(item => item.parentId === parentId);

  return children.map(item => {
    if (ancestors.has(item.id)) {
      return {
        item,
        children: [],
        level,
        isExpanded: state.expandedIds.has(item.id),
        isSelected: state.selectedItemId === item.id,
        isHighlighted: state.focusedItemId === item.id,
      };
    }

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
 */
export function buildTreeNodes(filteredItems: WorkItem[], state: TreeBuildState): TreeNode[] {
  const filteredIds = new Set(filteredItems.map(i => i.id));

  const rootItems = filteredItems.filter(item => !item.parentId || !filteredIds.has(item.parentId));

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
 */
export function getItemPath(id: string, items: Map<string, WorkItem>): WorkItem[] {
  const path: WorkItem[] = [];
  const visited = new Set<string>();
  let currentId: string | undefined = id;

  while (currentId) {
    if (visited.has(currentId)) {
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
