import { useMemo } from 'react';
import {
  Search,
  X,
  Filter,
  Target,
  AlertCircle,
  Lightbulb,
  Palette,
  FolderKanban,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { ItemType, Priority } from '../../types';
import { typeColors, priorityColors, typeLabels, priorityLabels, getStatusColors } from '../../utils/colors';

const typeIcons: Record<ItemType, React.ComponentType<{ className?: string }>> = {
  mission: Target,
  problem: AlertCircle,
  solution: Lightbulb,
  design: Palette,
  project: FolderKanban,
};

const FilterPanel: React.FC = () => {
  const { filters, setFilters, resetFilters, items } = useStore();

  const itemTypes: ItemType[] = ['mission', 'problem', 'solution', 'design', 'project'];
  const priorities: Priority[] = ['P0', 'P1', 'P2', 'P3'];

  // Get unique statuses from items dynamically
  const itemStatuses = useMemo(() => {
    const statusSet = new Set<string>();
    items.forEach((item) => {
      statusSet.add(item.status);
    });
    return Array.from(statusSet);
  }, [items]);

  // Get unique owners from items
  const owners = useMemo(() => {
    const ownerMap = new Map<string, { id: string; name: string }>();
    items.forEach((item) => {
      if (item.owner) {
        ownerMap.set(item.owner.id, { id: item.owner.id, name: item.owner.name });
      }
    });
    return Array.from(ownerMap.values());
  }, [items]);

  const toggleType = (type: ItemType) => {
    const current = filters.types;
    if (current.includes(type)) {
      setFilters({ types: current.filter((t) => t !== type) });
    } else {
      setFilters({ types: [...current, type] });
    }
  };

  const toggleStatus = (status: string) => {
    const current = filters.statuses;
    if (current.includes(status)) {
      setFilters({ statuses: current.filter((s) => s !== status) });
    } else {
      setFilters({ statuses: [...current, status] });
    }
  };

  const togglePriority = (priority: Priority) => {
    const current = filters.priorities;
    if (current.includes(priority)) {
      setFilters({ priorities: current.filter((p) => p !== priority) });
    } else {
      setFilters({ priorities: [...current, priority] });
    }
  };

  const toggleOwner = (ownerId: string) => {
    const current = filters.owners;
    if (current.includes(ownerId)) {
      setFilters({ owners: current.filter((o) => o !== ownerId) });
    } else {
      setFilters({ owners: [...current, ownerId] });
    }
  };

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.statuses.length > 0 ||
    filters.priorities.length > 0 ||
    filters.owners.length > 0 ||
    filters.searchQuery.length > 0;

  return (
    <div className="bg-white border-b border-gray-200 p-4 space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search items by title, description, or tags..."
          value={filters.searchQuery}
          onChange={(e) => setFilters({ searchQuery: e.target.value })}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
        {filters.searchQuery && (
          <button
            onClick={() => setFilters({ searchQuery: '' })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter sections */}
      <div className="flex flex-wrap gap-6">
        {/* Type filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Type
          </label>
          <div className="flex flex-wrap gap-1.5">
            {itemTypes.map((type) => {
              const Icon = typeIcons[type];
              const isActive = filters.types.includes(type);
              const style = typeColors[type];
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                    transition-all duration-150
                    ${isActive
                      ? `${style.bg} ${style.text} ${style.border} border`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'}
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {typeLabels[type]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Status
          </label>
          <div className="flex flex-wrap gap-1.5">
            {itemStatuses.map((status) => {
              const isActive = filters.statuses.includes(status);
              const style = getStatusColors(status);
              return (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                    transition-all duration-150
                    ${isActive
                      ? `${style.bg} ${style.text} ${style.border} border`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'}
                  `}
                >
                  <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                  {status}
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Priority
          </label>
          <div className="flex flex-wrap gap-1.5">
            {priorities.map((priority) => {
              const isActive = filters.priorities.includes(priority);
              const style = priorityColors[priority];
              return (
                <button
                  key={priority}
                  onClick={() => togglePriority(priority)}
                  className={`
                    px-2.5 py-1 rounded-full text-xs font-semibold
                    transition-all duration-150
                    ${isActive
                      ? `${style.bg} ${style.text} ${style.border} border`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'}
                  `}
                >
                  {priority} - {priorityLabels[priority]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Owner filter */}
        {owners.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Owner
            </label>
            <div className="flex flex-wrap gap-1.5">
              {owners.map((owner) => {
                const isActive = filters.owners.includes(owner.id);
                return (
                  <button
                    key={owner.id}
                    onClick={() => toggleOwner(owner.id)}
                    className={`
                      flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                      transition-all duration-150
                      ${isActive
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'}
                    `}
                  >
                    <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-medium">
                      {owner.name.charAt(0)}
                    </div>
                    {owner.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Clear filters button */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter className="w-4 h-4" />
            <span>
              Active filters:{' '}
              {[
                filters.types.length > 0 && `${filters.types.length} types`,
                filters.statuses.length > 0 && `${filters.statuses.length} statuses`,
                filters.priorities.length > 0 && `${filters.priorities.length} priorities`,
                filters.owners.length > 0 && `${filters.owners.length} owners`,
                filters.searchQuery && 'search',
              ]
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
          >
            <X className="w-4 h-4" />
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
