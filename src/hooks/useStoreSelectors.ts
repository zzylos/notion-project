/**
 * Memoized store selectors for optimized data access.
 *
 * These hooks provide memoized access to computed store values,
 * preventing unnecessary recalculations and re-renders.
 */

import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { WorkItem, TreeNode, DashboardStats } from '../types';
import { useShallow } from 'zustand/shallow';

/**
 * Hook to get filtered items with stable reference.
 * Only recomputes when items or filters change.
 * Note: We subscribe to items and filters to trigger re-renders when they change,
 * then call getFilteredItems() which computes the filtered result.
 */
export function useFilteredItems(): WorkItem[] {
  const getFilteredItems = useStore(state => state.getFilteredItems);
  // Subscribe to items and filters to trigger re-renders when they change
  useStore(state => state.items);
  useStore(useShallow(state => state.filters));

  return getFilteredItems();
}

/**
 * Hook to get tree nodes with stable reference.
 * Only recomputes when filtered items, expanded state, or selection changes.
 * Note: We subscribe to relevant state to trigger re-renders when they change,
 * then call getTreeNodes() which computes the tree structure.
 */
export function useTreeNodes(): TreeNode[] {
  const getTreeNodes = useStore(state => state.getTreeNodes);
  // Subscribe to state that affects tree nodes to trigger re-renders
  useStore(state => state.items);
  useStore(useShallow(state => state.filters));
  useStore(state => state.expandedIds);
  useStore(state => state.selectedItemId);
  useStore(state => state.focusedItemId);

  return getTreeNodes();
}

/**
 * Hook to get dashboard stats with stable reference.
 * Only recomputes when items change.
 * Note: We subscribe to items to trigger re-renders when they change,
 * then call getStats() which computes the statistics.
 */
export function useStats(): DashboardStats {
  const getStats = useStore(state => state.getStats);
  // Subscribe to items to trigger re-renders when they change
  useStore(state => state.items);

  return getStats();
}

/**
 * Hook to get unique values for filter options.
 * Returns memoized arrays of unique statuses, owners, and tags.
 */
export function useFilterOptions(): {
  statuses: string[];
  owners: Array<{ id: string; name: string }>;
  tags: string[];
} {
  const items = useStore(state => state.items);

  return useMemo(() => {
    const statusSet = new Set<string>();
    const ownerMap = new Map<string, { id: string; name: string }>();
    const tagSet = new Set<string>();

    for (const item of items.values()) {
      statusSet.add(item.status);
      if (item.owner) {
        ownerMap.set(item.owner.id, { id: item.owner.id, name: item.owner.name });
      }
      if (item.tags) {
        item.tags.forEach(tag => tagSet.add(tag));
      }
    }

    return {
      statuses: Array.from(statusSet).sort(),
      owners: Array.from(ownerMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      tags: Array.from(tagSet).sort(),
    };
  }, [items]);
}

/**
 * Hook to get item counts by type.
 * Useful for displaying type filter badges.
 */
export function useItemCountsByType(): Record<string, number> {
  const items = useStore(state => state.items);

  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items.values()) {
      counts[item.type] = (counts[item.type] || 0) + 1;
    }
    return counts;
  }, [items]);
}

/**
 * Hook to get an item by ID with stable reference.
 */
export function useItem(itemId: string | null): WorkItem | undefined {
  const items = useStore(state => state.items);

  return useMemo(() => {
    if (!itemId) return undefined;
    return items.get(itemId);
  }, [items, itemId]);
}

/**
 * Hook to get the path from root to a specific item.
 * Note: We subscribe to items to trigger re-renders when they change,
 * then call getItemPath() which traverses the item hierarchy.
 */
export function useItemPath(itemId: string | null): WorkItem[] {
  const getItemPath = useStore(state => state.getItemPath);
  // Subscribe to items to trigger re-renders when they change
  useStore(state => state.items);

  if (!itemId) return [];
  return getItemPath(itemId);
}
