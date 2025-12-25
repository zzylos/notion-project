import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import type { FilterState, ItemType, Priority } from '../types';

/**
 * Key types that can be toggled in the filter state.
 */
type ToggleableFilterKey =
  | 'types'
  | 'excludeTypes'
  | 'statuses'
  | 'excludeStatuses'
  | 'priorities'
  | 'excludePriorities'
  | 'owners'
  | 'excludeOwners';

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
  /** Toggle a single type in the types filter (show mode) */
  toggleType: (type: ItemType) => void;
  /** Toggle a single type in the excludeTypes filter (hide mode) */
  toggleExcludeType: (type: ItemType) => void;
  /** Toggle a single status in the statuses filter (show mode) */
  toggleStatus: (status: string) => void;
  /** Toggle a single status in the excludeStatuses filter (hide mode) */
  toggleExcludeStatus: (status: string) => void;
  /** Toggle a single priority in the priorities filter (show mode) */
  togglePriority: (priority: Priority) => void;
  /** Toggle a single priority in the excludePriorities filter (hide mode) */
  toggleExcludePriority: (priority: Priority) => void;
  /** Toggle a single owner ID in the owners filter (show mode) */
  toggleOwner: (ownerId: string) => void;
  /** Toggle a single owner ID in the excludeOwners filter (hide mode) */
  toggleExcludeOwner: (ownerId: string) => void;
  /** Toggle a group of statuses (adds all if not all selected, removes all if all selected) */
  toggleStatusGroup: (groupStatuses: string[]) => void;
  /** Toggle a group of statuses in exclude mode */
  toggleExcludeStatusGroup: (groupStatuses: string[]) => void;
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

  // Include (show) toggles
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

  // Exclude (hide) toggles
  const toggleExcludeType = useCallback(
    (type: ItemType) => {
      createToggleHandler('excludeTypes', filters.excludeTypes, setFilters)(type);
    },
    [filters.excludeTypes, setFilters]
  );

  const toggleExcludeStatus = useCallback(
    (status: string) => {
      createToggleHandler('excludeStatuses', filters.excludeStatuses, setFilters)(status);
    },
    [filters.excludeStatuses, setFilters]
  );

  const toggleExcludePriority = useCallback(
    (priority: Priority) => {
      createToggleHandler('excludePriorities', filters.excludePriorities, setFilters)(priority);
    },
    [filters.excludePriorities, setFilters]
  );

  const toggleExcludeOwner = useCallback(
    (ownerId: string) => {
      createToggleHandler('excludeOwners', filters.excludeOwners, setFilters)(ownerId);
    },
    [filters.excludeOwners, setFilters]
  );

  // Status group toggles
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

  const toggleExcludeStatusGroup = useCallback(
    (groupStatuses: string[]) => {
      const current = filters.excludeStatuses;

      // Check if ALL statuses in the group are currently excluded
      const allExcluded = groupStatuses.every(s => current.includes(s));

      if (allExcluded) {
        // Remove all statuses from exclude list
        const groupSet = new Set(groupStatuses);
        setFilters({ excludeStatuses: current.filter(s => !groupSet.has(s)) });
      } else {
        // Add all statuses to exclude list (avoiding duplicates)
        const newStatuses = [...current];
        for (const status of groupStatuses) {
          if (!newStatuses.includes(status)) {
            newStatuses.push(status);
          }
        }
        setFilters({ excludeStatuses: newStatuses });
      }
    },
    [filters.excludeStatuses, setFilters]
  );

  return {
    toggleType,
    toggleExcludeType,
    toggleStatus,
    toggleExcludeStatus,
    togglePriority,
    toggleExcludePriority,
    toggleOwner,
    toggleExcludeOwner,
    toggleStatusGroup,
    toggleExcludeStatusGroup,
  };
}

export default useFilterToggle;
