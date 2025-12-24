import { useState, useCallback, memo } from 'react';
import { useStore } from '../../store/useStore';
import { useFilterToggle } from '../../hooks';
import type { FilterMode } from '../../types';
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
  const { toggleType, toggleStatus, togglePriority, toggleOwner, toggleStatusGroup } =
    useFilterToggle();

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

  const handleSearchChange = useCallback(
    (value: string) => {
      setFilters({ searchQuery: value });
    },
    [setFilters]
  );

  const handleToggleStatusGroup = useCallback(
    (_groupName: string, groupStatuses: string[]) => {
      toggleStatusGroup(groupStatuses);
    },
    [toggleStatusGroup]
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
          onToggleGroup={handleToggleStatusGroup}
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
      <ActiveFiltersBar filters={filters} filterMode={filters.filterMode} onClear={resetFilters} />
    </div>
  );
});

FilterPanel.displayName = 'FilterPanel';

export default FilterPanel;
