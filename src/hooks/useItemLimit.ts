import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { VIEW_LIMITS } from '../constants';
import type { WorkItem } from '../types';

interface UseItemLimitResult<T> {
  /** Items after applying the limit */
  limitedItems: T[];
  /** Total count of items before limiting */
  totalCount: number;
  /** Whether items are currently being limited */
  isLimited: boolean;
  /** The limit threshold */
  limit: number;
}

/**
 * Hook to apply item limit for performance in views.
 * Returns limited items and metadata about the limiting.
 *
 * @param items - Array of items to potentially limit
 * @returns Object with limited items and limit metadata
 *
 * @example
 * const { limitedItems, totalCount, isLimited } = useItemLimit(filteredItems);
 * // Use limitedItems for rendering
 * // Show ItemLimitBanner when isLimited is true
 */
export function useItemLimit<T extends WorkItem>(items: T[]): UseItemLimitResult<T> {
  const { disableItemLimit } = useStore();

  return useMemo(() => {
    const totalCount = items.length;
    const limit = VIEW_LIMITS.ITEM_LIMIT;
    const shouldLimit = !disableItemLimit && totalCount > limit;

    return {
      limitedItems: shouldLimit ? items.slice(0, limit) : items,
      totalCount,
      isLimited: shouldLimit,
      limit,
    };
  }, [items, disableItemLimit]);
}

export default useItemLimit;
