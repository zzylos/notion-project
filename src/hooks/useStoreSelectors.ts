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
 *
 * Uses a single subscription with useShallow to bundle all dependencies,
 * preventing multiple subscriptions and unnecessary re-renders.
 */
export function useFilteredItems(): WorkItem[] {
  const { getFilteredItems, items, filters } = useStore(
    useShallow(state => ({
      getFilteredItems: state.getFilteredItems,
      items: state.items,
      filters: state.filters,
    }))
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps -- items and filters trigger re-computation when store state changes
  return useMemo(() => getFilteredItems(), [getFilteredItems, items, filters]);
}

/**
 * Hook to get tree nodes with stable reference.
 * Only recomputes when filtered items, expanded state, or selection changes.
 *
 * Uses a single subscription with useShallow to bundle all dependencies,
 * preventing multiple subscriptions and unnecessary re-renders.
 */
export function useTreeNodes(): TreeNode[] {
  const { getTreeNodes, items, filters, expandedIds, selectedItemId, focusedItemId } = useStore(
    useShallow(state => ({
      getTreeNodes: state.getTreeNodes,
      items: state.items,
      filters: state.filters,
      expandedIds: state.expandedIds,
      selectedItemId: state.selectedItemId,
      focusedItemId: state.focusedItemId,
    }))
  );

  return useMemo(
    () => getTreeNodes(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- These deps trigger re-computation when store state changes
    [getTreeNodes, items, filters, expandedIds, selectedItemId, focusedItemId]
  );
}

/**
 * Hook to get dashboard stats with stable reference.
 * Only recomputes when items change.
 *
 * Uses a single subscription with useShallow to bundle all dependencies,
 * preventing multiple subscriptions and unnecessary re-renders.
 */
export function useStats(): DashboardStats {
  const { getStats, items } = useStore(
    useShallow(state => ({
      getStats: state.getStats,
      items: state.items,
    }))
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps -- items triggers re-computation when store state changes
  return useMemo(() => getStats(), [getStats, items]);
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
 *
 * Uses a single subscription with useShallow to bundle all dependencies,
 * preventing multiple subscriptions and unnecessary re-renders.
 */
export function useItemPath(itemId: string | null): WorkItem[] {
  const { getItemPath, items } = useStore(
    useShallow(state => ({
      getItemPath: state.getItemPath,
      items: state.items,
    }))
  );

  return useMemo(() => {
    if (!itemId) return [];
    return getItemPath(itemId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- items triggers re-computation when store state changes
  }, [getItemPath, items, itemId]);
}
