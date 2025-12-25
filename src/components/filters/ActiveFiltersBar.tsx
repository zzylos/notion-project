import { memo } from 'react';
import { Filter, Eye, EyeOff, X } from 'lucide-react';
import type { FilterState, FilterMode } from '../../types';

interface ActiveFiltersBarProps {
  filters: FilterState;
  filterMode: FilterMode;
  onClear: () => void;
}

interface FilterCounts {
  showTypes: number;
  hideTypes: number;
  showStatuses: number;
  hideStatuses: number;
  showPriorities: number;
  hidePriorities: number;
  showOwners: number;
  hideOwners: number;
  hasSearch: boolean;
}

function getFilterCounts(filters: FilterState): FilterCounts {
  return {
    showTypes: filters.types.length,
    hideTypes: filters.excludeTypes.length,
    showStatuses: filters.statuses.length,
    hideStatuses: filters.excludeStatuses.length,
    showPriorities: filters.priorities.length,
    hidePriorities: filters.excludePriorities.length,
    showOwners: filters.owners.length,
    hideOwners: filters.excludeOwners.length,
    hasSearch: filters.searchQuery.length > 0,
  };
}

function buildShowSummary(counts: FilterCounts): string {
  const parts: string[] = [];
  if (counts.showTypes > 0) parts.push(`${counts.showTypes} types`);
  if (counts.showStatuses > 0) parts.push(`${counts.showStatuses} statuses`);
  if (counts.showPriorities > 0) parts.push(`${counts.showPriorities} priorities`);
  if (counts.showOwners > 0) parts.push(`${counts.showOwners} owners`);
  return parts.join(', ');
}

function buildHideSummary(counts: FilterCounts): string {
  const parts: string[] = [];
  if (counts.hideTypes > 0) parts.push(`${counts.hideTypes} types`);
  if (counts.hideStatuses > 0) parts.push(`${counts.hideStatuses} statuses`);
  if (counts.hidePriorities > 0) parts.push(`${counts.hidePriorities} priorities`);
  if (counts.hideOwners > 0) parts.push(`${counts.hideOwners} owners`);
  return parts.join(', ');
}

const ActiveFiltersBar: React.FC<ActiveFiltersBarProps> = memo(({ filters, onClear }) => {
  const counts = getFilterCounts(filters);

  const totalShowFilters =
    counts.showTypes + counts.showStatuses + counts.showPriorities + counts.showOwners;
  const totalHideFilters =
    counts.hideTypes + counts.hideStatuses + counts.hidePriorities + counts.hideOwners;
  const hasActiveFilters = totalShowFilters > 0 || totalHideFilters > 0 || counts.hasSearch;

  if (!hasActiveFilters) return null;

  const showSummary = buildShowSummary(counts);
  const hideSummary = buildHideSummary(counts);

  return (
    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
      <div className="flex items-center gap-4 text-sm">
        <Filter className="w-4 h-4 text-gray-500" />

        {/* Show filters */}
        {totalShowFilters > 0 && (
          <div className="flex items-center gap-1.5 text-blue-600">
            <Eye className="w-3.5 h-3.5" />
            <span>
              <span className="font-medium">Showing: </span>
              {showSummary}
            </span>
          </div>
        )}

        {/* Hide filters */}
        {totalHideFilters > 0 && (
          <div className="flex items-center gap-1.5 text-red-600">
            <EyeOff className="w-3.5 h-3.5" />
            <span>
              <span className="font-medium">Hiding: </span>
              {hideSummary}
            </span>
          </div>
        )}

        {/* Search */}
        {counts.hasSearch && <span className="text-gray-600">+ search query</span>}
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
});

ActiveFiltersBar.displayName = 'ActiveFiltersBar';

export default ActiveFiltersBar;
