import { useMemo, useCallback, memo } from 'react';
import { Search, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { TYPE_ORDER, STATUS_FILTER_CATEGORIES, STATUS_FILTER_LABELS } from '../../constants';
import { typeColors } from '../../utils/colors';
import type { ItemType, StatusFilterCategory } from '../../types';

/**
 * Status category colors for the filter buttons
 */
const statusCategoryColors: Record<StatusFilterCategory, { bg: string; text: string }> = {
  'not-started': { bg: 'bg-slate-100', text: 'text-slate-700' },
  'in-progress': { bg: 'bg-blue-100', text: 'text-blue-700' },
  finished: { bg: 'bg-green-100', text: 'text-green-700' },
};

const FilterPanel: React.FC = memo(() => {
  const { filters, setFilters, resetFilters, items } = useStore();

  // Get unique owners from items
  const owners = useMemo(() => {
    const ownerMap = new Map<string, string>();
    items.forEach(item => {
      if (item.owner) {
        ownerMap.set(item.owner.id, item.owner.name);
      }
    });
    return Array.from(ownerMap.entries());
  }, [items]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters({ searchQuery: e.target.value });
    },
    [setFilters]
  );

  const toggleType = useCallback(
    (type: ItemType) => {
      const current = filters.types;
      const newTypes = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
      setFilters({ types: newTypes });
    },
    [filters.types, setFilters]
  );

  const toggleStatusCategory = useCallback(
    (category: StatusFilterCategory) => {
      const current = filters.statusCategories;
      const newCategories = current.includes(category)
        ? current.filter(c => c !== category)
        : [...current, category];
      setFilters({ statusCategories: newCategories });
    },
    [filters.statusCategories, setFilters]
  );

  const toggleOwner = useCallback(
    (ownerId: string) => {
      const current = filters.owners;
      const newOwners = current.includes(ownerId)
        ? current.filter(o => o !== ownerId)
        : [...current, ownerId];
      setFilters({ owners: newOwners });
    },
    [filters.owners, setFilters]
  );

  // Select/deselect all types
  const toggleAllTypes = useCallback(() => {
    const allSelected = filters.types.length === TYPE_ORDER.length;
    setFilters({ types: allSelected ? [] : [...TYPE_ORDER] });
  }, [filters.types.length, setFilters]);

  // Select/deselect all status categories
  const toggleAllStatuses = useCallback(() => {
    const allSelected = filters.statusCategories.length === STATUS_FILTER_CATEGORIES.length;
    setFilters({ statusCategories: allSelected ? [] : [...STATUS_FILTER_CATEGORIES] });
  }, [filters.statusCategories.length, setFilters]);

  // Check if any filters are active (not at default state)
  const hasActiveFilters =
    filters.searchQuery ||
    filters.types.length !== TYPE_ORDER.length ||
    filters.statusCategories.length !== STATUS_FILTER_CATEGORIES.length ||
    filters.owners.length > 0;

  return (
    <div className="bg-white border-b border-gray-200 p-4 space-y-4">
      {/* Search bar */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={handleSearchChange}
            placeholder="Search items..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4" />
            Reset
          </button>
        )}
      </div>

      {/* Filter sections */}
      <div className="flex flex-wrap gap-6">
        {/* Type filters */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-500">Show Types</span>
            <button
              onClick={toggleAllTypes}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {filters.types.length === TYPE_ORDER.length ? 'None' : 'All'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {TYPE_ORDER.map(type => {
              const isSelected = filters.types.includes(type);
              const style = typeColors[type];
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-2 py-1 text-xs rounded-md capitalize transition-colors ${
                    isSelected
                      ? `${style.bg} ${style.text} font-medium`
                      : 'bg-gray-100 text-gray-400 line-through'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status category filters */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-500">Show Status</span>
            <button
              onClick={toggleAllStatuses}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {filters.statusCategories.length === STATUS_FILTER_CATEGORIES.length ? 'None' : 'All'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTER_CATEGORIES.map(category => {
              const isSelected = filters.statusCategories.includes(category);
              const style = statusCategoryColors[category];
              return (
                <button
                  key={category}
                  onClick={() => toggleStatusCategory(category)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    isSelected
                      ? `${style.bg} ${style.text} font-medium`
                      : 'bg-gray-100 text-gray-400 line-through'
                  }`}
                >
                  {STATUS_FILTER_LABELS[category]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Owner filters */}
        {owners.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-2">Filter by Owner</div>
            <div className="flex flex-wrap gap-1">
              {owners.map(([id, name]) => {
                const isSelected = filters.owners.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleOwner(id)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      isSelected
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

FilterPanel.displayName = 'FilterPanel';

export default FilterPanel;
