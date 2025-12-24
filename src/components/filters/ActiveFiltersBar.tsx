import { memo } from 'react';
import { Filter, X } from 'lucide-react';
import type { FilterState, FilterMode } from '../../types';

interface ActiveFiltersBarProps {
  filters: FilterState;
  filterMode: FilterMode;
  onClear: () => void;
}

const ActiveFiltersBar: React.FC<ActiveFiltersBarProps> = memo(
  ({ filters, filterMode, onClear }) => {
    const hasActiveFilters =
      filters.types.length > 0 ||
      filters.statuses.length > 0 ||
      filters.priorities.length > 0 ||
      filters.owners.length > 0 ||
      filters.searchQuery.length > 0;

    const hasSelectionFilters =
      filters.types.length > 0 ||
      filters.statuses.length > 0 ||
      filters.priorities.length > 0 ||
      filters.owners.length > 0;

    if (!hasActiveFilters) {
      return null;
    }

    const filterSummary = [
      filters.types.length > 0 && `${filters.types.length} types`,
      filters.statuses.length > 0 && `${filters.statuses.length} statuses`,
      filters.priorities.length > 0 && `${filters.priorities.length} priorities`,
      filters.owners.length > 0 && `${filters.owners.length} owners`,
      filters.searchQuery && 'search',
    ]
      .filter(Boolean)
      .join(', ');

    return (
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Filter className="w-4 h-4" />
          <span>
            {filterMode === 'hide' && hasSelectionFilters ? (
              <span className="text-red-600 font-medium">Hiding: </span>
            ) : (
              'Active filters: '
            )}
            {filterSummary}
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
