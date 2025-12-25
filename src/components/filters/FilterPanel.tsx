import { useState, useCallback, memo } from 'react';
import { useStore } from '../../store/useStore';
import { useFilterToggle } from '../../hooks';
import SearchBar from './SearchBar';
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
 * - Click to cycle through show → hide → clear states
 * - Collapsible sections for better organization
 *
 * This component has been split into focused subcomponents for better maintainability:
 * - SearchBar: Text search input
 * - TypeFilterSection: Item type filters
 * - StatusFilterSection: Status filters with grouping
 * - PriorityFilterSection: Priority filters
 * - OwnerFilterSection: Owner filters
 * - ActiveFiltersBar: Summary of active filters with clear option
 */
const FilterPanel: React.FC = memo(() => {
  const { filters, setFilters, resetFilters, items } = useStore();
  const {
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
  } = useFilterToggle();

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

  const handleToggleExcludeStatusGroup = useCallback(
    (_groupName: string, groupStatuses: string[]) => {
      toggleExcludeStatusGroup(groupStatuses);
    },
    [toggleExcludeStatusGroup]
  );

  return (
    <div className="bg-white border-b border-gray-200 p-4 space-y-4">
      {/* Search bar */}
      <div className="flex gap-3 items-center">
        <SearchBar value={filters.searchQuery} onChange={handleSearchChange} />
      </div>

      {/* Filter sections */}
      <div className="flex flex-wrap gap-6">
        <TypeFilterSection
          selectedTypes={filters.types}
          excludedTypes={filters.excludeTypes}
          onToggle={toggleType}
          onToggleExclude={toggleExcludeType}
          isOpen={openSections.type}
          onToggleSection={() => toggleSection('type')}
        />

        <StatusFilterSection
          items={items}
          selectedStatuses={filters.statuses}
          excludedStatuses={filters.excludeStatuses}
          onToggleStatus={toggleStatus}
          onToggleExcludeStatus={toggleExcludeStatus}
          onToggleGroup={handleToggleStatusGroup}
          onToggleExcludeGroup={handleToggleExcludeStatusGroup}
          isOpen={openSections.status}
          onToggleSection={() => toggleSection('status')}
        />

        <PriorityFilterSection
          selectedPriorities={filters.priorities}
          excludedPriorities={filters.excludePriorities}
          onToggle={togglePriority}
          onToggleExclude={toggleExcludePriority}
          isOpen={openSections.priority}
          onToggleSection={() => toggleSection('priority')}
        />

        <OwnerFilterSection
          items={items}
          selectedOwners={filters.owners}
          excludedOwners={filters.excludeOwners}
          onToggle={toggleOwner}
          onToggleExclude={toggleExcludeOwner}
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
