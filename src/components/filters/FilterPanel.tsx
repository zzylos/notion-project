import { useState, useCallback, memo } from 'react';
import { useStore } from '../../store/useStore';
import type { ItemType, Priority, FilterMode } from '../../types';
import SearchBar from './SearchBar';
import FilterModeToggle from './FilterModeToggle';
import TypeFilterSection from './TypeFilterSection';
import StatusFilterSection from './StatusFilterSection';
import PriorityFilterSection from './PriorityFilterSection';
import OwnerFilterSection from './OwnerFilterSection';
import ActiveFiltersBar from './ActiveFiltersBar';

/**
 * FilterPanel component provides filtering capabilities for work items.
 *
 * Features:
 * - Search by title, description, or tags
 * - Filter by type, status, priority, and owner
 * - Toggle between "show" and "hide" filter modes
 * - Collapsible sections for better organization
 *
 * This component has been split into focused subcomponents for better maintainability:
 * - SearchBar: Text search input
 * - FilterModeToggle: Show/hide mode toggle
 * - TypeFilterSection: Item type filters
 * - StatusFilterSection: Status filters with grouping
 * - PriorityFilterSection: Priority filters
 * - OwnerFilterSection: Owner filters
 * - ActiveFiltersBar: Summary of active filters with clear option
 */
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

  // Toggle handlers
  const handleSearchChange = useCallback(
    (value: string) => {
      setFilters({ searchQuery: value });
    },
    [setFilters]
  );

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

  const toggleStatusGroup = useCallback(
    (_groupName: string, groupStatuses: string[]) => {
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

  const toggleFilterMode = useCallback(() => {
    const newMode: FilterMode = filters.filterMode === 'show' ? 'hide' : 'show';
    setFilters({ filterMode: newMode });
  }, [filters.filterMode, setFilters]);

  const hasSelectionFilters =
    filters.types.length > 0 ||
    filters.statuses.length > 0 ||
    filters.priorities.length > 0 ||
    filters.owners.length > 0;

  return (
    <div className="bg-white border-b border-gray-200 p-4 space-y-4">
      {/* Search bar and filter mode toggle */}
      <div className="flex gap-3 items-center">
        <SearchBar value={filters.searchQuery} onChange={handleSearchChange} />
        <FilterModeToggle
          mode={filters.filterMode}
          onToggle={toggleFilterMode}
          visible={hasSelectionFilters}
        />
      </div>

      {/* Filter sections */}
      <div className="flex flex-wrap gap-6">
        <TypeFilterSection
          selectedTypes={filters.types}
          onToggle={toggleType}
          isOpen={openSections.type}
          onToggleSection={() => toggleSection('type')}
        />

        <StatusFilterSection
          items={items}
          selectedStatuses={filters.statuses}
          onToggleStatus={toggleStatus}
          onToggleGroup={toggleStatusGroup}
          isOpen={openSections.status}
          onToggleSection={() => toggleSection('status')}
        />

        <PriorityFilterSection
          selectedPriorities={filters.priorities}
          onToggle={togglePriority}
          isOpen={openSections.priority}
          onToggleSection={() => toggleSection('priority')}
        />

        <OwnerFilterSection
          items={items}
          selectedOwners={filters.owners}
          onToggle={toggleOwner}
          isOpen={openSections.owner}
          onToggleSection={() => toggleSection('owner')}
        />
      </div>

      {/* Active filters summary */}
      <ActiveFiltersBar
        filters={filters}
        filterMode={filters.filterMode}
        onClear={resetFilters}
      />
    </div>
  );
});

FilterPanel.displayName = 'FilterPanel';

export default FilterPanel;
