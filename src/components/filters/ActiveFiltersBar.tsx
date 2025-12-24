import { memo } from 'react';
import { Filter, X } from 'lucide-react';
import type { FilterState, FilterMode } from '../../types';

interface ActiveFiltersBarProps {
  filters: FilterState;
  filterMode: FilterMode;
  onClear: () => void;
}

interface FilterCounts {
  types: number;
  statuses: number;
  priorities: number;
  owners: number;
  hasSearch: boolean;
}

function getFilterCounts(filters: FilterState): FilterCounts {
  return {
    types: filters.types.length,
    statuses: filters.statuses.length,
    priorities: filters.priorities.length,
    owners: filters.owners.length,
    hasSearch: filters.searchQuery.length > 0,
  };
}

function buildFilterSummary(counts: FilterCounts): string {
  const parts: string[] = [];
  if (counts.types > 0) parts.push(`${counts.types} types`);
  if (counts.statuses > 0) parts.push(`${counts.statuses} statuses`);
  if (counts.priorities > 0) parts.push(`${counts.priorities} priorities`);
  if (counts.owners > 0) parts.push(`${counts.owners} owners`);
  if (counts.hasSearch) parts.push('search');
  return parts.join(', ');
}

const ActiveFiltersBar: React.FC<ActiveFiltersBarProps> = memo(
  ({ filters, filterMode, onClear }) => {
    const counts = getFilterCounts(filters);
    const hasActiveFilters =
      counts.types + counts.statuses + counts.priorities + counts.owners > 0 || counts.hasSearch;
    const hasSelectionFilters =
      counts.types + counts.statuses + counts.priorities + counts.owners > 0;

    if (!hasActiveFilters) return null;

    const isHideMode = filterMode === 'hide' && hasSelectionFilters;

    return (
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Filter className="w-4 h-4" />
          <span>
            {isHideMode ? (
              <span className="text-red-600 font-medium">Hiding: </span>
            ) : (
              'Active filters: '
            )}
            {buildFilterSummary(counts)}
          </span>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
        >
          <X className="w-4 h-4" />
          Clear all
        </button>
      </div>
    );
  }
);

ActiveFiltersBar.displayName = 'ActiveFiltersBar';

export default ActiveFiltersBar;
