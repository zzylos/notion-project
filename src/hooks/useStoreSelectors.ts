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
 */
export function useFilteredItems(): WorkItem[] {
  const getFilteredItems = useStore(state => state.getFilteredItems);
  const items = useStore(state => state.items);
  const filters = useStore(useShallow(state => state.filters));

  return useMemo(() => {
    return getFilteredItems();
  }, [getFilteredItems, items, filters]);
}

/**
 * Hook to get tree nodes with stable reference.
 * Only recomputes when filtered items, expanded state, or selection changes.
 */
export function useTreeNodes(): TreeNode[] {
  const getTreeNodes = useStore(state => state.getTreeNodes);
  const items = useStore(state => state.items);
  const filters = useStore(useShallow(state => state.filters));
  const expandedIds = useStore(state => state.expandedIds);
  const selectedItemId = useStore(state => state.selectedItemId);
  const focusedItemId = useStore(state => state.focusedItemId);

  return useMemo(() => {
    return getTreeNodes();
  }, [getTreeNodes, items, filters, expandedIds, selectedItemId, focusedItemId]);
}

/**
 * Hook to get dashboard stats with stable reference.
 * Only recomputes when items change.
 */
export function useStats(): DashboardStats {
  const getStats = useStore(state => state.getStats);
  const items = useStore(state => state.items);

  return useMemo(() => {
    return getStats();
  }, [getStats, items]);
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
 */
export function useItemPath(itemId: string | null): WorkItem[] {
  const getItemPath = useStore(state => state.getItemPath);
  const items = useStore(state => state.items);

  return useMemo(() => {
    if (!itemId) return [];
    return getItemPath(itemId);
  }, [getItemPath, items, itemId]);
}
