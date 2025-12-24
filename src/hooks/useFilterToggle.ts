import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import type { FilterState, ItemType, Priority } from '../types';

/**
 * Key types that can be toggled in the filter state.
 */
type ToggleableFilterKey = 'types' | 'statuses' | 'priorities' | 'owners';

/**
 * Get the value type for a given filter key.
 */
type FilterValueType<K extends ToggleableFilterKey> = FilterState[K] extends (infer T)[]
  ? T
  : never;

/**
 * Return type for the useFilterToggle hook.
 */
export interface UseFilterToggleReturn {
  /** Toggle a single type in the types filter */
  toggleType: (type: ItemType) => void;
  /** Toggle a single status in the statuses filter */
  toggleStatus: (status: string) => void;
  /** Toggle a single priority in the priorities filter */
  togglePriority: (priority: Priority) => void;
  /** Toggle a single owner ID in the owners filter */
  toggleOwner: (ownerId: string) => void;
  /** Toggle a group of statuses (adds all if not all selected, removes all if all selected) */
  toggleStatusGroup: (groupStatuses: string[]) => void;
}

/**
 * Creates a toggle function for a specific filter key.
 * This is a generic toggle that adds/removes a value from an array in the filter state.
 */
function createToggleHandler<K extends ToggleableFilterKey>(
  key: K,
  currentValues: FilterState[K],
  setFilters: (updates: Partial<FilterState>) => void
): (value: FilterValueType<K>) => void {
  return (value: FilterValueType<K>) => {
    const current = currentValues as FilterValueType<K>[];
    if (current.includes(value)) {
      setFilters({ [key]: current.filter(v => v !== value) } as Partial<FilterState>);
    } else {
      setFilters({ [key]: [...current, value] } as Partial<FilterState>);
    }
  };
}

/**
 * Hook that provides reusable toggle handlers for all filter types.
 *
 * This reduces code duplication in FilterPanel by providing consistent
 * toggle functions for types, statuses, priorities, and owners.
 *
 * @returns Object with toggle functions for each filter type
 *
 * @example
 * const { toggleType, toggleStatus, togglePriority, toggleOwner } = useFilterToggle();
 *
 * // In event handlers:
 * <button onClick={() => toggleType('problem')}>Toggle Problem</button>
 * <button onClick={() => toggleStatus('In Progress')}>Toggle In Progress</button>
 */
export function useFilterToggle(): UseFilterToggleReturn {
  const { filters, setFilters } = useStore();

  const toggleType = useCallback(
    (type: ItemType) => {
      createToggleHandler('types', filters.types, setFilters)(type);
    },
    [filters.types, setFilters]
  );

  const toggleStatus = useCallback(
    (status: string) => {
      createToggleHandler('statuses', filters.statuses, setFilters)(status);
    },
    [filters.statuses, setFilters]
  );

  const togglePriority = useCallback(
    (priority: Priority) => {
      createToggleHandler('priorities', filters.priorities, setFilters)(priority);
    },
    [filters.priorities, setFilters]
  );

  const toggleOwner = useCallback(
    (ownerId: string) => {
      createToggleHandler('owners', filters.owners, setFilters)(ownerId);
    },
    [filters.owners, setFilters]
  );

  const toggleStatusGroup = useCallback(
    (groupStatuses: string[]) => {
      const current = filters.statuses;

      // Check if ALL statuses in the group are currently selected
      const allSelected = groupStatuses.every(s => current.includes(s));

      if (allSelected) {
        // Remove all statuses in this group
        const groupSet = new Set(groupStatuses);
        setFilters({ statuses: current.filter(s => !groupSet.has(s)) });
      } else {
        // Add all statuses in this group (avoiding duplicates)
        const newStatuses = [...current];
        for (const status of groupStatuses) {
          if (!newStatuses.includes(status)) {
            newStatuses.push(status);
          }
        }
        setFilters({ statuses: newStatuses });
      }
    },
    [filters.statuses, setFilters]
  );

  return {
    toggleType,
    toggleStatus,
    togglePriority,
    toggleOwner,
    toggleStatusGroup,
  };
}

export default useFilterToggle;
