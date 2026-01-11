import { useMemo, useCallback, memo } from 'react';
import { Search, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { TYPE_ORDER, PRIORITY_ORDER } from '../../constants';
import { getUniqueStatuses, typeColors, priorityColors, getStatusColors } from '../../utils/colors';
import type { ItemType, Priority } from '../../types';

const FilterPanel: React.FC = memo(() => {
  const { filters, setFilters, resetFilters, items } = useStore();

  // Get unique statuses from items
  const statuses = useMemo(() => getUniqueStatuses(items.values()), [items]);

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

  const toggleStatus = useCallback(
    (status: string) => {
      const current = filters.statuses;
      const newStatuses = current.includes(status) ? current.filter(s => s !== status) : [...current, status];
      setFilters({ statuses: newStatuses });
    },
    [filters.statuses, setFilters]
  );

  const togglePriority = useCallback(
    (priority: Priority) => {
      const current = filters.priorities;
      const newPriorities = current.includes(priority) ? current.filter(p => p !== priority) : [...current, priority];
      setFilters({ priorities: newPriorities });
    },
    [filters.priorities, setFilters]
  );

  const toggleOwner = useCallback(
    (ownerId: string) => {
      const current = filters.owners;
      const newOwners = current.includes(ownerId) ? current.filter(o => o !== ownerId) : [...current, ownerId];
      setFilters({ owners: newOwners });
    },
    [filters.owners, setFilters]
  );

  const hasActiveFilters =
    filters.searchQuery ||
    filters.types.length > 0 ||
    filters.statuses.length > 0 ||
    filters.priorities.length > 0 ||
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
            Clear filters
          </button>
        )}
      </div>

      {/* Filter sections */}
      <div className="flex flex-wrap gap-6">
        {/* Type filters */}
        <div>
          <div className="text-xs font-semibold text-gray-500 mb-2">Type</div>
          <div className="flex flex-wrap gap-1">
            {TYPE_ORDER.map(type => {
              const isSelected = filters.types.includes(type);
              const style = typeColors[type];
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-2 py-1 text-xs rounded-md capitalize transition-colors ${
                    isSelected ? `${style.bg} ${style.text} font-medium` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status filters */}
        {statuses.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-2">Status</div>
            <div className="flex flex-wrap gap-1">
              {statuses.map(status => {
                const isSelected = filters.statuses.includes(status);
                const style = getStatusColors(status);
                return (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      isSelected ? `${style.bg} ${style.text} font-medium` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Priority filters */}
        <div>
          <div className="text-xs font-semibold text-gray-500 mb-2">Priority</div>
          <div className="flex flex-wrap gap-1">
            {PRIORITY_ORDER.map(priority => {
              const isSelected = filters.priorities.includes(priority);
              const style = priorityColors[priority];
              return (
                <button
                  key={priority}
                  onClick={() => togglePriority(priority)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    isSelected ? `${style.bg} ${style.text} font-medium` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {priority}
                </button>
              );
            })}
          </div>
        </div>

        {/* Owner filters */}
        {owners.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-2">Owner</div>
            <div className="flex flex-wrap gap-1">
              {owners.map(([id, name]) => {
                const isSelected = filters.owners.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleOwner(id)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      isSelected ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
