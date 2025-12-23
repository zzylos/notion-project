import { useMemo, useState, useCallback, memo } from 'react';
import { Search, X, Filter, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { ItemType, Priority, FilterMode } from '../../types';
import {
  typeColors,
  priorityColors,
  typeLabels,
  priorityLabels,
  getStatusColors,
  getStatusCategory,
} from '../../utils/colors';
import { typeIcons } from '../../utils/icons';
import { STATUS_GROUPS } from '../../constants';

// Reverse lookup: status string -> group name
const STATUS_TO_GROUP = new Map<string, string>();
for (const [group, statuses] of Object.entries(STATUS_GROUPS)) {
  for (const status of statuses) {
    STATUS_TO_GROUP.set(status.toLowerCase(), group);
  }
}

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  count?: number;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = memo(
  ({ title, isOpen, onToggle, children, count }) => (
    <fieldset className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <span>{title}</span>
        {count !== undefined && count > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full font-medium">
            {count}
          </span>
        )}
      </button>
      {isOpen && children}
    </fieldset>
  )
);

CollapsibleSection.displayName = 'CollapsibleSection';

const FilterPanel: React.FC = memo(() => {
  const { filters, setFilters, resetFilters, items } = useStore();

  // Collapsible section states - default to open
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    type: true,
    status: true,
    priority: true,
    owner: true,
  });

  const toggleSection = useCallback((section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const itemTypes: ItemType[] = ['mission', 'problem', 'solution', 'design', 'project'];
  const priorities: Priority[] = ['P0', 'P1', 'P2', 'P3'];

  // Get unique statuses from items and group them
  const { statusGroups, ungroupedStatuses } = useMemo(() => {
    const itemsArray = Array.from(items.values());
    const uniqueStatuses = [...new Set(itemsArray.map(item => item.status))];

    // Track which statuses belong to which group
    const groupedStatuses = new Map<string, Set<string>>();
    const ungrouped: string[] = [];

    for (const status of uniqueStatuses) {
      const groupName = STATUS_TO_GROUP.get(status.toLowerCase());
      if (groupName) {
        if (!groupedStatuses.has(groupName)) {
          groupedStatuses.set(groupName, new Set());
        }
        groupedStatuses.get(groupName)!.add(status);
      } else {
        ungrouped.push(status);
      }
    }

    return {
      statusGroups: groupedStatuses,
      ungroupedStatuses: ungrouped,
    };
  }, [items]);

  // Get unique owners from items
  const owners = useMemo(() => {
    const itemsArray = Array.from(items.values());
    const ownerMap = itemsArray.reduce((acc, item) => {
      if (item.owner && !acc.has(item.owner.id)) {
        acc.set(item.owner.id, { id: item.owner.id, name: item.owner.name });
      }
      return acc;
    }, new Map<string, { id: string; name: string }>());
    return Array.from(ownerMap.values());
  }, [items]);

  const toggleType = useCallback(
    (type: ItemType) => {
      const current = filters.types;
      if (current.includes(type)) {
        setFilters({ types: current.filter(t => t !== type) });
      } else {
        setFilters({ types: [...current, type] });
      }
    },
    [filters.types, setFilters]
  );

  // Toggle a status group - adds/removes all statuses in the group
  const toggleStatusGroup = useCallback(
    (groupName: string) => {
      const groupStatuses = statusGroups.get(groupName);
      if (!groupStatuses) return;

      const statusArray = Array.from(groupStatuses);
      const current = filters.statuses;

      // Check if ALL statuses in the group are currently selected
      const allSelected = statusArray.every(s => current.includes(s));

      if (allSelected) {
        // Remove all statuses in this group
        setFilters({ statuses: current.filter(s => !groupStatuses.has(s)) });
      } else {
        // Add all statuses in this group (avoiding duplicates)
        const newStatuses = [...current];
        for (const status of statusArray) {
          if (!newStatuses.includes(status)) {
            newStatuses.push(status);
          }
        }
        setFilters({ statuses: newStatuses });
      }
    },
    [filters.statuses, setFilters, statusGroups]
  );

  // Toggle a single ungrouped status
  const toggleStatus = useCallback(
    (status: string) => {
      const current = filters.statuses;
      if (current.includes(status)) {
        setFilters({ statuses: current.filter(s => s !== status) });
      } else {
        setFilters({ statuses: [...current, status] });
      }
    },
    [filters.statuses, setFilters]
  );

  const togglePriority = useCallback(
    (priority: Priority) => {
      const current = filters.priorities;
      if (current.includes(priority)) {
        setFilters({ priorities: current.filter(p => p !== priority) });
      } else {
        setFilters({ priorities: [...current, priority] });
      }
    },
    [filters.priorities, setFilters]
  );

  const toggleOwner = useCallback(
    (ownerId: string) => {
      const current = filters.owners;
      if (current.includes(ownerId)) {
        setFilters({ owners: current.filter(o => o !== ownerId) });
      } else {
        setFilters({ owners: [...current, ownerId] });
      }
    },
    [filters.owners, setFilters]
  );

  // Check if a status group is selected (all statuses in group are selected)
  const isGroupSelected = useCallback(
    (groupName: string) => {
      const groupStatuses = statusGroups.get(groupName);
      if (!groupStatuses || groupStatuses.size === 0) return false;
      return Array.from(groupStatuses).every(s => filters.statuses.includes(s));
    },
    [filters.statuses, statusGroups]
  );

  // Check if a status group is partially selected
  const isGroupPartiallySelected = useCallback(
    (groupName: string) => {
      const groupStatuses = statusGroups.get(groupName);
      if (!groupStatuses || groupStatuses.size === 0) return false;
      const selectedCount = Array.from(groupStatuses).filter(s =>
        filters.statuses.includes(s)
      ).length;
      return selectedCount > 0 && selectedCount < groupStatuses.size;
    },
    [filters.statuses, statusGroups]
  );

  const toggleFilterMode = useCallback(() => {
    const newMode: FilterMode = filters.filterMode === 'show' ? 'hide' : 'show';
    setFilters({ filterMode: newMode });
  }, [filters.filterMode, setFilters]);

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

  // Get representative status for color
  const getGroupColor = useCallback((groupName: string) => {
    // Use the first status in the original definition to determine color
    const originalStatuses = STATUS_GROUPS[groupName];
    if (originalStatuses && originalStatuses.length > 0) {
      return getStatusColors(originalStatuses[0]);
    }
    return getStatusColors('Not Started');
  }, []);

  // Get status category for group (for the dot color)
  const getGroupCategory = useCallback((groupName: string) => {
    const originalStatuses = STATUS_GROUPS[groupName];
    if (originalStatuses && originalStatuses.length > 0) {
      return getStatusCategory(originalStatuses[0]);
    }
    return 'not-started';
  }, []);

  return (
    <div className="bg-white border-b border-gray-200 p-4 space-y-4">
      {/* Search bar and filter mode toggle */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <label htmlFor="filter-search" className="sr-only">
            Search items
          </label>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            aria-hidden="true"
          />
          <input
            id="filter-search"
            type="search"
            placeholder="Search items by title, description, or tags..."
            value={filters.searchQuery}
            onChange={e => setFilters({ searchQuery: e.target.value })}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            aria-label="Search items by title, description, or tags"
          />
          {filters.searchQuery && (
            <button
              onClick={() => setFilters({ searchQuery: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter mode toggle - only show when there are selection filters */}
        {hasSelectionFilters && (
          <button
            onClick={toggleFilterMode}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
              focus:outline-none focus:ring-2 focus:ring-offset-1
              ${
                filters.filterMode === 'hide'
                  ? 'bg-red-100 text-red-700 border border-red-300 focus:ring-red-500'
                  : 'bg-green-100 text-green-700 border border-green-300 focus:ring-green-500'
              }
            `}
            title={
              filters.filterMode === 'hide'
                ? 'Hide mode: Selected filters hide matching items'
                : 'Show mode: Selected filters show only matching items'
            }
            aria-pressed={filters.filterMode === 'hide'}
          >
            {filters.filterMode === 'hide' ? (
              <>
                <EyeOff className="w-4 h-4" />
                Hide
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Show
              </>
            )}
          </button>
        )}
      </div>

      {/* Filter sections */}
      <div className="flex flex-wrap gap-6">
        {/* Type filter */}
        <CollapsibleSection
          title="Type"
          isOpen={openSections.type}
          onToggle={() => toggleSection('type')}
          count={filters.types.length}
        >
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
            {itemTypes.map(type => {
              const Icon = typeIcons[type];
              const isActive = filters.types.includes(type);
              const style = typeColors[type];
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  aria-pressed={isActive}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                    transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                    ${
                      isActive
                        ? `${style.bg} ${style.text} ${style.border} border`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {typeLabels[type]}
                </button>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* Status filter - Grouped */}
        <CollapsibleSection
          title="Status"
          isOpen={openSections.status}
          onToggle={() => toggleSection('status')}
          count={filters.statuses.length}
        >
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
            {/* Grouped statuses */}
            {Array.from(statusGroups.keys()).map(groupName => {
              const isActive = isGroupSelected(groupName);
              const isPartial = isGroupPartiallySelected(groupName);
              const style = getGroupColor(groupName);
              const category = getGroupCategory(groupName);
              const groupStatuses = statusGroups.get(groupName);
              const count = groupStatuses?.size || 0;

              return (
                <button
                  key={groupName}
                  onClick={() => toggleStatusGroup(groupName)}
                  aria-pressed={isActive}
                  title={`Includes: ${Array.from(groupStatuses || []).join(', ')}`}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                    transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                    ${
                      isActive
                        ? `${style.bg} ${style.text} ${style.border} border`
                        : isPartial
                          ? `${style.bg} ${style.text} ${style.border} border opacity-70`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                    }
                  `}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${style.dot} ${category === 'in-progress' ? 'animate-pulse' : ''}`}
                    aria-hidden="true"
                  />
                  {groupName}
                  {count > 1 && <span className="ml-0.5 text-[10px] opacity-60">({count})</span>}
                </button>
              );
            })}

            {/* Ungrouped statuses */}
            {ungroupedStatuses.map(status => {
              const isActive = filters.statuses.includes(status);
              const style = getStatusColors(status);
              const category = getStatusCategory(status);
              return (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  aria-pressed={isActive}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                    transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                    ${
                      isActive
                        ? `${style.bg} ${style.text} ${style.border} border`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                    }
                  `}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${style.dot} ${category === 'in-progress' ? 'animate-pulse' : ''}`}
                    aria-hidden="true"
                  />
                  {status}
                </button>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* Priority filter */}
        <CollapsibleSection
          title="Priority"
          isOpen={openSections.priority}
          onToggle={() => toggleSection('priority')}
          count={filters.priorities.length}
        >
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by priority">
            {priorities.map(priority => {
              const isActive = filters.priorities.includes(priority);
              const style = priorityColors[priority];
              return (
                <button
                  key={priority}
                  onClick={() => togglePriority(priority)}
                  aria-pressed={isActive}
                  className={`
                    px-2.5 py-1 rounded-full text-xs font-semibold
                    transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                    ${
                      isActive
                        ? `${style.bg} ${style.text} ${style.border} border`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                    }
                  `}
                >
                  {priority} - {priorityLabels[priority]}
                </button>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* Owner filter */}
        {owners.length > 0 && (
          <CollapsibleSection
            title="Owner"
            isOpen={openSections.owner}
            onToggle={() => toggleSection('owner')}
            count={filters.owners.length}
          >
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by owner">
              {owners.map(owner => {
                const isActive = filters.owners.includes(owner.id);
                return (
                  <button
                    key={owner.id}
                    onClick={() => toggleOwner(owner.id)}
                    aria-pressed={isActive}
                    className={`
                      flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                      transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                      ${
                        isActive
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                      }
                    `}
                  >
                    <div
                      className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-medium"
                      aria-hidden="true"
                    >
                      {owner.name.charAt(0)}
                    </div>
                    {owner.name}
                  </button>
                );
              })}
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* Clear filters button */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter className="w-4 h-4" />
            <span>
              {filters.filterMode === 'hide' && hasSelectionFilters ? (
                <span className="text-red-600 font-medium">Hiding: </span>
              ) : (
                'Active filters: '
              )}
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
});

FilterPanel.displayName = 'FilterPanel';

export default FilterPanel;
