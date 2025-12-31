/**
 * Filter utilities for work item filtering logic.
 *
 * This module contains pure functions for filtering work items based on
 * various criteria (type, status, priority, owner, search query, orphan status).
 * These functions are used by the store's getFilteredItems() method.
 */

import type { WorkItem, FilterState } from '../types';

/**
 * Check if an item matches the include filters (show only these).
 * Returns true if item should be included based on include criteria.
 *
 * @param item - The work item to check
 * @param filters - The current filter state
 * @returns True if item passes all include filters
 */
export function itemMatchesIncludeFilters(item: WorkItem, filters: FilterState): boolean {
  // Type filter - if types are specified, item must match one
  if (filters.types.length > 0 && !filters.types.includes(item.type)) {
    return false;
  }

  // Status filter - if statuses are specified, item must match one
  if (filters.statuses.length > 0 && !filters.statuses.includes(item.status)) {
    return false;
  }

  // Priority filter - if priorities are specified, item must have matching priority
  if (filters.priorities.length > 0) {
    if (!item.priority || !filters.priorities.includes(item.priority)) {
      return false;
    }
  }

  // Owner filter - if owners are specified, item must have matching owner
  if (filters.owners.length > 0) {
    if (!item.owner || !filters.owners.includes(item.owner.id)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if an item matches any exclude filter (hide these).
 * Returns true if item should be EXCLUDED (hidden).
 *
 * @param item - The work item to check
 * @param filters - The current filter state
 * @returns True if item matches any exclude filter (should be hidden)
 */
export function itemMatchesExcludeFilters(item: WorkItem, filters: FilterState): boolean {
  // Exclude by type
  if (filters.excludeTypes.length > 0 && filters.excludeTypes.includes(item.type)) {
    return true;
  }

  // Exclude by status
  if (filters.excludeStatuses.length > 0 && filters.excludeStatuses.includes(item.status)) {
    return true;
  }

  // Exclude by priority
  if (filters.excludePriorities.length > 0 && item.priority) {
    if (filters.excludePriorities.includes(item.priority)) {
      return true;
    }
  }

  // Exclude by owner
  if (filters.excludeOwners.length > 0 && item.owner) {
    if (filters.excludeOwners.includes(item.owner.id)) {
      return true;
    }
  }

  return false;
}

/**
 * Collect all ancestor IDs from a starting item up to root.
 * Used to ensure focused items and their ancestors bypass filters.
 *
 * @param startId - The starting item ID
 * @param items - Map of all work items
 * @returns Set of all ancestor IDs including the starting item
 */
export function collectAncestorIds(
  startId: string | undefined,
  items: Map<string, WorkItem>
): Set<string> {
  const ancestors = new Set<string>();
  let currentId = startId;

  // Safety: limit iterations to prevent infinite loops from circular references
  let iterations = 0;
  const MAX_ITERATIONS = 100;

  while (currentId && iterations < MAX_ITERATIONS) {
    if (ancestors.has(currentId)) {
      // Circular reference detected
      break;
    }
    ancestors.add(currentId);
    currentId = items.get(currentId)?.parentId;
    iterations++;
  }

  return ancestors;
}

/**
 * Check if an item is an orphan (no parent and no children in the item set).
 * An orphan is a standalone item with no hierarchical relationships.
 *
 * @param item - The work item to check
 * @param items - Map of all work items
 * @returns True if item is an orphan
 */
export function isOrphanItem(item: WorkItem, items: Map<string, WorkItem>): boolean {
  // Has a parent that exists in our item set = not an orphan
  if (item.parentId && items.has(item.parentId)) {
    return false;
  }

  // Has children = not an orphan
  if (item.children && item.children.length > 0) {
    // Check if any children exist in our item set
    const hasValidChildren = item.children.some(childId => items.has(childId));
    if (hasValidChildren) {
      return false;
    }
  }

  // Check if this item is a parent of any other item
  for (const otherItem of items.values()) {
    if (otherItem.parentId === item.id) {
      return false;
    }
  }

  return true;
}

/**
 * Check if an item matches a search query.
 * Searches across title, description, and tags.
 *
 * @param item - The work item to search
 * @param query - The search query string
 * @returns True if item matches the search query
 */
export function itemMatchesSearch(item: WorkItem, query: string): boolean {
  if (!query) return true;
  const normalizedQuery = query.toLowerCase();
  const titleMatch = item.title.toLowerCase().includes(normalizedQuery);
  const descMatch = item.description?.toLowerCase().includes(normalizedQuery);
  const tagMatch = item.tags?.some(tag => tag.toLowerCase().includes(normalizedQuery));
  return titleMatch || !!descMatch || !!tagMatch;
}

/**
 * Apply orphan filtering logic to an item.
 * Returns true if item should be INCLUDED after orphan filtering.
 *
 * @param item - The work item to check
 * @param items - Map of all work items
 * @param showOnlyOrphans - If true, only show orphan items
 * @param hideOrphanItems - If true, hide orphan items
 * @returns True if item passes orphan filtering
 */
export function applyOrphanFilter(
  item: WorkItem,
  items: Map<string, WorkItem>,
  showOnlyOrphans: boolean,
  hideOrphanItems: boolean
): boolean {
  const orphan = isOrphanItem(item, items);
  if (showOnlyOrphans) return orphan;
  if (hideOrphanItems && orphan) return false;
  return true;
}

/**
 * Check if any include filters are active.
 *
 * @param filters - The filter state to check
 * @returns True if any include filters are set
 */
export function hasActiveIncludeFilters(filters: FilterState): boolean {
  return (
    filters.types.length > 0 ||
    filters.statuses.length > 0 ||
    filters.priorities.length > 0 ||
    filters.owners.length > 0
  );
}

/**
 * Check if any exclude filters are active.
 *
 * @param filters - The filter state to check
 * @returns True if any exclude filters are set
 */
export function hasActiveExcludeFilters(filters: FilterState): boolean {
  const excludeTypes = filters.excludeTypes ?? [];
  const excludeStatuses = filters.excludeStatuses ?? [];
  const excludePriorities = filters.excludePriorities ?? [];
  const excludeOwners = filters.excludeOwners ?? [];

  return (
    excludeTypes.length > 0 ||
    excludeStatuses.length > 0 ||
    excludePriorities.length > 0 ||
    excludeOwners.length > 0
  );
}
